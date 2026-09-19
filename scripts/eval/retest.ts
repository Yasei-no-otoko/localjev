import { appendFile, mkdir, open, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { apiBaseUrl, loadSettings } from "../../src/config";
import { Engine } from "../../src/engine";
import type { Question } from "../../src/types";
import { hashSeed, sha256, type Attempt, type EvalConfig, type EvaluationRow } from "./common";
import { makeState, prepareSuite } from "./data";
import { answerValues } from "./run";

const CODE_FILES = ["src/engine.ts", "src/types.ts", "src/config.ts", "bun.lock", "scripts/eval/common.ts", "scripts/eval/data.ts", "scripts/eval/run.ts"];
const SCOPE = "Retest of ALL failed requests from one completed source run. Selected failures only; this is not an overall accuracy estimate or a replacement for the source benchmark.";
type SourceManifest = {
  runId: string; config: EvalConfig; nonce: string; suiteHash: string; examples: unknown[];
  expectedResults: number; completedResults: number; finishedAt: string; codeHashes: Record<string, string>;
};
type RetestAttempt = Attempt & { assistantContent: string | null; jsonValid: boolean | null; sourceComparableRequestHash: string | null };
type RetestRow = Omit<EvaluationRow, "attempts"> & { attempts: RetestAttempt[]; sourceKey: string; firstRequestMatchesSource: boolean; goldCorrect: boolean | null };
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const numeric = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
function requireThat(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

function options() {
  const args = process.argv.slice(2), values: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.slice(2), value = args[i + 1];
    requireThat(args[i]?.startsWith("--") && key && ["source", "model", "out", "check-only"].includes(key) && value && !value.startsWith("--") && !(key in values), "Use --source DIR --model ID --out DIR [--check-only true]");
    values[key] = value;
  }
  requireThat(values.source && values.model && values.out, "--source, --model and --out are required");
  requireThat(values["check-only"] === undefined || values["check-only"] === "true", "--check-only accepts true only");
  return { source: resolve(values.source), model: values.model, out: resolve(values.out), checkOnly: values["check-only"] === "true" };
}

export async function retest(): Promise<void> {
  const args = options();
  requireThat(args.source.toLowerCase() !== args.out.toLowerCase(), "Source and output must differ");
  requireThat(!await Bun.file(join(args.source, ".lock")).exists(), "Source run is locked");
  const sourceBytes = await Promise.all(["manifest.json", "results.jsonl", "summary.json"].map(async (name) => [name, await Bun.file(join(args.source, name)).bytes()] as const));
  const sourceHashes = Object.fromEntries(sourceBytes.map(([name, bytes]) => [name, sha256(bytes)]));
  const manifest = JSON.parse(new TextDecoder().decode(sourceBytes[0]![1])) as SourceManifest;
  const sourceRows = new TextDecoder().decode(sourceBytes[1]![1]).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as EvaluationRow);
  const summary = JSON.parse(new TextDecoder().decode(sourceBytes[2]![1]));
  const config = manifest.config;
  requireThat(config.models.length === 1 && config.models[0] && args.model !== config.models[0], "Require exactly one source model and a different target model");
  const sourceModel = config.models[0];
  requireThat(manifest.nonce && manifest.finishedAt && summary.complete && manifest.completedResults === manifest.expectedResults && sourceRows.length === manifest.expectedResults && sourceRows.length > 0, "Source run must be complete and nonempty");
  requireThat(config.timeoutSeconds === 90 && config.maxOutputTokens === 256 && config.malformedRetries === 2 && config.warmupRequests === 2, "Source must use 90s, 256 tokens, two retries and two warm-ups");
  requireThat(JSON.stringify(Object.keys(manifest.codeHashes).sort()) === JSON.stringify([...CODE_FILES].sort()), "Source code hash inventory differs");
  for (const path of CODE_FILES) requireThat(sha256(await Bun.file(path).bytes()) === manifest.codeHashes[path], `Raw source code changed: ${path}`);
  const suite = await prepareSuite(config);
  requireThat(sha256(JSON.stringify(suite)) === manifest.suiteHash, "Source suite hash differs");
  const examples = suite.examples.map(({ id, gold, labels, row, question, text, task }) => ({ id, row, task, gold, labels, inputHash: sha256(JSON.stringify([text, question])) }));
  requireThat(JSON.stringify(examples) === JSON.stringify(manifest.examples), "Source example selection or input hashes differ");
  const byId = new Map(suite.examples.map((example) => [example.id, example]));
  const expectedKeys = new Set(suite.examples.flatMap((example) => config.backgroundWords.map((words) => `${sourceModel}|${words}|${example.id}`)));
  requireThat(sourceRows.length === expectedKeys.size, "Source coverage is incomplete");
  for (const row of sourceRows) {
    const example = byId.get(row.exampleId);
    requireThat(example && expectedKeys.delete(row.key) && row.key === `${sourceModel}|${row.backgroundWords}|${row.exampleId}` && row.model === sourceModel && row.task === example.task && row.gold === example.gold && JSON.stringify(row.labels) === JSON.stringify(example.labels) && typeof row.ok === "boolean", `Invalid or duplicate source row: ${row.key}`);
    const state = makeState(example, row.backgroundWords, suite);
    requireThat(sha256(state) === row.stateHash && state.split(/\s+/).length === row.stateWords, `Source state differs: ${row.key}`);
  }
  const failures = sourceRows.filter((row) => !row.ok);
  requireThat(failures.length > 0, "Source contains no failed requests to retest");
  for (const row of failures) requireThat(/^[a-f0-9]{64}$/.test(row.attempts[0]?.requestHash ?? ""), `Missing first-request hash: ${row.key}`);
  const settings = loadSettings({ upstreamModel: args.model, temperature: config.temperature, maxOutputTokens: config.maxOutputTokens, malformedRetries: config.malformedRetries, timeoutMs: config.timeoutSeconds * 1000, maxInflight: 1 });

  async function execute(question: Question, state: string, seed: number, reference: string, sourceRow?: EvaluationRow, fake = false) {
    const attempts: RetestAttempt[] = [];
    let matches = sourceRow === undefined, answer = null, error: string | null = null;
    const engine = new Engine(settings, async (url, init) => {
      const body = JSON.parse(String(init?.body));
      if (config.cacheMode === "bust-prefix") body.messages[0].content = `Request reference (not evidence): ${sha256(`${manifest.nonce}:${reference}:${attempts.length}`).slice(0, 24)}.\n` + body.messages[0].content;
      const requestBody = JSON.stringify(body);
      const sourceHash = sourceRow ? sha256(JSON.stringify({ ...body, model: sourceModel })) : null;
      const attempt: RetestAttempt = { ms: 0, status: null, inputTokens: 0, outputTokens: 0, cachedTokens: 0, backendSeconds: null, finishReason: null, reasoningCharacters: 0, warning: null, requestHash: sha256(requestBody), responseHash: null, assistantContent: null, jsonValid: null, sourceComparableRequestHash: sourceHash };
      const started = performance.now();
      try {
        if (sourceRow && attempts.length === 0) {
          matches = sourceHash === sourceRow.attempts[0]!.requestHash;
          requireThat(matches, `First-request parity failed: ${sourceRow.key}`);
        }
        if (fake) {
          const value = question.type === "noul" ? .5 : Array(question.type === "score" ? question.criteria.length : Object.keys(question.criteria).length).fill(1 / (question.type === "score" ? question.criteria.length : Object.keys(question.criteria).length));
          return Response.json({ choices: [{ message: { content: JSON.stringify({ answers: { q1: value } }) } }] });
        }
        const response = await fetch(url, { ...init, body: requestBody });
        attempt.status = response.status; attempt.warning = response.headers.get("warning");
        const bytes = await response.arrayBuffer(); attempt.responseHash = sha256(new Uint8Array(bytes));
        try {
          const payload = JSON.parse(new TextDecoder().decode(bytes)), usage = payload.usage ?? {};
          attempt.assistantContent = typeof payload.choices?.[0]?.message?.content === "string" ? payload.choices[0].message.content : null;
          if (attempt.assistantContent !== null) { try { JSON.parse(attempt.assistantContent); attempt.jsonValid = true; } catch { attempt.jsonValid = false; } }
          attempt.inputTokens = numeric(usage.prompt_tokens ?? usage.input_tokens); attempt.outputTokens = numeric(usage.completion_tokens ?? usage.output_tokens);
          attempt.cachedTokens = numeric(usage.prompt_tokens_details?.cached_tokens); attempt.backendSeconds = typeof usage.total_time === "number" ? usage.total_time : null;
          attempt.finishReason = payload.choices?.[0]?.finish_reason ?? null; attempt.reasoningCharacters = String(payload.choices?.[0]?.message?.reasoning_content ?? "").length;
        } catch { /* Engine classifies malformed HTTP payloads. */ }
        return new Response(bytes, { status: response.status, headers: response.headers });
      } finally { attempt.ms = performance.now() - started; attempts.push(attempt); }
    });
    const started = performance.now();
    try { answer = (await engine.decide({ answer: question }, state, seed)).answers.answer ?? null; }
    catch (e) { error = e instanceof Error ? e.message : String(e); }
    return { answer, error, attempts, firstRequestMatchesSource: matches, elapsedMs: performance.now() - started };
  }

  for (const row of failures) {
    const example = byId.get(row.exampleId)!;
    const probe = await execute(example.question, makeState(example, row.backgroundWords, suite), hashSeed(`${config.seed}:${example.id}`), `${example.id}:${row.backgroundWords}`, row, true);
    requireThat(probe.firstRequestMatchesSource && probe.answer && probe.attempts.length === 1, `Offline first-request parity failed: ${row.key}`);
    console.log(`Verified source request: ${row.key}`);
  }
  if (args.checkOnly) { console.log(`CHECK ONLY: ${failures.length} failed cases verified; no model requests or output artifacts.`); return; }
  const headers = settings.upstreamApiKey ? { authorization: `Bearer ${settings.upstreamApiKey}` } : {};
  const modelResponse = await fetch(`${apiBaseUrl(settings)}/models`, { headers, signal: AbortSignal.timeout(10_000) });
  requireThat(modelResponse.ok && ((await modelResponse.json()) as { data: { id: string }[] }).data.some((model) => model.id === args.model), `Target model unavailable: ${args.model}`);
  await mkdir(dirname(args.out), { recursive: true });
  await mkdir(args.out); // Atomic: any pre-existing directory is refused, even if empty.
  const lockPath = join(args.out, ".lock"), lock = await open(lockPath, "wx");
  await lock.writeFile(String(process.pid));
  const results: RetestRow[] = [], warmups: unknown[] = [];
  const outputManifest = { runId: args.out.split(/[\\/]/).at(-1), scope: SCOPE, startedAt: new Date().toISOString(), sourceRunId: manifest.runId, sourceHashes, sourceModel, targetModel: args.model, nonce: manifest.nonce, sourceConfig: config, config: { ...config, models: [args.model] }, suiteHash: manifest.suiteHash, codeHashes: manifest.codeHashes, retestCodeHash: sha256(await Bun.file(import.meta.path).bytes()), selectedSourceKeys: failures.map((row) => row.key), expectedResults: failures.length, completedResults: 0, finishedAt: null as string | null };
  let stopping = false;
  const stop = () => { stopping = true; console.log("Stopping after the current request; partial retest results will be preserved."); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  try {
    await Bun.write(join(args.out, "manifest.json"), json(outputManifest));
    await Bun.write(join(args.out, "results.jsonl"), ""); await Bun.write(join(args.out, "warmups.jsonl"), "");
    for (let index = 0; index < config.warmupRequests && !stopping; index++) {
      const response = await execute({ type: "noul", instructions: "Does the message mention a payment problem?", criteria: null }, "I was charged twice for my order.", config.seed + index, `${args.model}:warmup:${index}:${Date.now()}`);
      const row = { index, excludedFromMeasured: true, ...response, ok: response.answer !== null };
      warmups.push(row); await appendFile(join(args.out, "warmups.jsonl"), JSON.stringify(row) + "\n");
    }
    for (const original of failures) {
      if (stopping) break;
      const example = byId.get(original.exampleId)!, state = makeState(example, original.backgroundWords, suite);
      const response = await execute(example.question, state, hashSeed(`${config.seed}:${example.id}`), `${example.id}:${original.backgroundWords}`, original);
      const row: RetestRow = { ...original, key: `${args.model}|${original.backgroundWords}|${example.id}`, model: args.model, sourceKey: original.key, ...response, ok: false, probabilities: null, prediction: null, score: null, goldCorrect: null };
      if (row.answer) { Object.assign(row, answerValues(row.answer, example), { ok: true }); row.goldCorrect = row.prediction === row.gold; }
      results.push(row); await appendFile(join(args.out, "results.jsonl"), JSON.stringify(row) + "\n");
      console.log(`${results.length}/${failures.length} ${example.id}: probability-valid=${row.ok}; gold-correct=${row.goldCorrect}; ${(row.elapsedMs / 1000).toFixed(2)}s`);
      requireThat(row.firstRequestMatchesSource, `Live request parity failed: ${original.key}`);
    }
  } finally {
    process.off("SIGINT", stop); process.off("SIGTERM", stop);
    outputManifest.completedResults = results.length; outputManifest.finishedAt = new Date().toISOString();
    const resultSummary = { scope: SCOPE, complete: results.length === failures.length, measured: results.length, selected: failures.length, validDistributions: results.filter((row) => row.ok).length, goldCorrectAmongValid: results.filter((row) => row.goldCorrect).length, excludedWarmups: warmups.length };
    try {
      await Bun.write(join(args.out, "manifest.json"), json(outputManifest)); await Bun.write(join(args.out, "summary.json"), json(resultSummary));
      const lines = ["# Selected-failure retest", "", SCOPE, "", `Source: ${manifest.runId}; target: ${args.model}. Status: ${resultSummary.complete ? "complete" : "PARTIAL"} (${results.length}/${failures.length}).`, "", `Settings unchanged: ${config.timeoutSeconds}s/attempt, ${config.maxOutputTokens} output tokens, ${config.malformedRetries} corrective retries; ${warmups.length} excluded warm-ups. First-request hashes match after replacing only the model identifier. Corrective requests use the new model's own responses.`, "", "Raw JSON means JSON.parse accepts the entire assistant text; Engine validity additionally checks probability output and can accept fenced JSON. Gold correctness is separate from both.", "", "| Example | Added words | Last raw JSON valid | Engine valid | Gold correct | Prediction / gold | Attempts | Seconds |", "|---|---:|---|---|---|---|---:|---:|", ...results.map((row) => `| ${row.exampleId} | ${row.backgroundWords} | ${row.attempts.at(-1)?.jsonValid ?? "unknown"} | ${row.ok} | ${row.goldCorrect ?? "unavailable"} | ${row.prediction ?? "—"} / ${row.gold} | ${row.attempts.length} | ${(row.elapsedMs / 1000).toFixed(2)} |`), "", "Per-attempt raw assistant outputs, hashes and errors are retained in results.jsonl. This selected subset cannot establish comparative overall accuracy or hardware performance.", ""];
      await Bun.write(join(args.out, "report.md"), lines.join("\n"));
    } finally { await lock.close(); await unlink(lockPath); }
  }
}

if (import.meta.main) await retest();
