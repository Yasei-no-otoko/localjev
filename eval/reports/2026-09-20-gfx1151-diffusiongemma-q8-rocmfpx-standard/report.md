# LocalJev bake-off: 2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx-standard

Status: **complete** (240/240 measured requests).

This run evaluates **DiffusionGemma Q8_0_ROCMFPX only** (the standard variant without the AGENT suffix) on Windows / Radeon 8060S (gfx1151). All 31 model layers were offloaded to ROCm0. Exact model, binary, build and HTTP-patch hashes are recorded in [runtime.json](runtime.json).

The same 120 examples and 240 short/long input states as [2026-09-18-bakeoff](../2026-09-18-bakeoff/report.md) are evaluated. The host, server binary, decoder settings, tokenizer, chat template and non-model evaluation configuration match the [AGENT run](../2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx/report.md). Quantization tensor allocation differs; each run also has its own cache-busting nonce. See the [variant comparison](comparison.md).

The native entropy-bound decoder uses its original temperature schedule (0.4–0.8, at most 48 denoising steps); the evaluator requests ordinary temperature=0. JSON schemas are supplied through prompting. Context, batch and microbatch capacities were fixed at 8192 tokens, with one request in flight.

Three long-context SST-5 requests failed output validation after all three attempts: two incomplete JSON objects and one incorrect root structure. All three count as failures. The separate AGENT and interrupted FP16 runs contribute no rows here. The model server was stopped after evaluation.

Runtime: Bun 1.4.2; AMD RYZEN AI MAX+ 395 w/ Radeon 8060S; 119.647 GiB RAM; ROCmFPX c49ebdb + local HTTP patch.
Seed 20260918; configured 40 balanced examples/task; selected 120 total examples; temperature 0; max output 256; up to 2 corrective retries; one request in flight.
Cache policy: **bust-prefix**. Background sizes are **words added**, not context-window settings or exact token budgets. Token counts below are backend-reported.

## Quality × model × input length

Accuracy counts failed requests as wrong. SST-5 accuracy uses the highest-probability level; MAE uses the expected score. Macro accuracy weights the three tasks equally.

| Model | Background words | AG News accuracy | BoolQ accuracy | SST-5 accuracy | SST-5 MAE ↓ | Macro accuracy | Failures |
|---|---:|---:|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | 82.5% | 85.0% | 50.0% | 0.514 | 72.5% | 0/120 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 90.0% | 87.5% | 32.5% | 0.869 | 70.0% | 3/120 |

## Decision latency × model × input length

Wall time covers the real LocalJev Engine, tokenization/inference upstream, JSON parsing and corrective retries. Warm-ups/model loading are excluded. Latency includes failed requests. This non-streaming benchmark does **not measure TTFT**. No localhost Bun HTTP hop is included.

| Model | Background words | p50 (s) ↓ | p95 (s) ↓ | Mean (s) ↓ | Input tokens, first attempt | Output tokens incl. retries | Retried | Cached input |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | 5.552 | 8.082 | 5.315 | 422 | 25.6 | 1/120 | 0.0% |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 12.673 | 27.667 | 14.276 | 3178 | 28.1 | 8/120 | 0.0% |

## Per-task uncertainty and calibration

Wilson 95% intervals are indicative, unadjusted for multiple comparisons and class-stratified sampling. Calibration/F1/MAE are conditional on valid responses: always inspect coverage above. ECE uses 10 equal-width bins and **max class probability**, not LocalJev's entropy-based confidence. Tiny samples make ECE noisy. Brier is `(p_yes-y)²` for BoolQ and the sum over class errors for multiclass tasks; do not compare its magnitude across tasks. NLL clips probabilities at 1e-12; all probability metrics concern self-reported, normalized model outputs.

| Model | Background | Task | Correct / total | Accuracy 95% interval | Macro F1 | Brier ↓ | NLL ↓ | ECE ↓ |
|---|---:|---|---:|---|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | ag_news | 33/40 | 68.1%–91.3% | 0.817 | 0.284 | 0.542 | 0.085 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | boolq | 34/40 | 70.9%–92.9% | 0.850 | 0.156 | 4.162 | 0.163 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | sst5 | 20/40 | 35.2%–64.8% | 0.443 | 0.672 | 1.153 | 0.257 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | ag_news | 36/40 | 76.9%–96.0% | 0.897 | 0.186 | 0.404 | 0.056 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | boolq | 35/40 | 73.9%–94.5% | 0.875 | 0.113 | 2.798 | 0.100 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | sst5 | 13/40 | 20.1%–48.0% | 0.294 | 1.028 | 5.195 | 0.487 |

## Paired background effect

Only pairs with valid responses in both conditions are counted.

| Model | Added words | Valid pairs | Prediction changed | Correct → wrong | Wrong → correct |
|---|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 117 | 21 | 10 | 7 |

## Output diagnostics

Grammar-valid JSON can still contain semantically invalid probabilities (such as all zeros). Retries recover some of these; length-limited attempts and reasoning are shown separately. No warnings returned is not proof of schema enforcement.

| Model | Background | First-pass valid / requests | Additional attempts | Length-limited attempts | Reasoning attempts |
|---|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | 119/120 | 1 | 0 | 0 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 112/120 | 13 | 0 | 0 |

Terminal errors:
- 2 × model output remained invalid after 3 attempt(s): response contains an incomplete JSON object
- 1 × model output remained invalid after 3 attempt(s): root object must contain only 'answers'

## Excluded warm-ups / first-call overhead

The first call may include model loading/eviction/compilation; these are **not isolated cold-load measurements**. Two short warm-ups do not guarantee every prompt shape is compiled. New model load behavior and runtime settings can affect the first calls.

| Model | Warm-up | Seconds | Valid |
|---|---:|---:|---|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 1 | 5.643 | true |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2 | 2.581 | true |

## Caveats and provenance

- Public benchmark contamination is possible. These are held-out dataset splits, not guaranteed unseen pretraining data; this is not a Jev-vs-model benchmark.
- Balanced sampling changes class priors. The background condition is an artificial distraction/prefill stress test, not a new natural long-document dataset. The complete target stays in the middle; no evidence is truncated.
- Model order is fixed to minimize reload overhead; conditions are interleaved per example. Thermal/runtime drift and one-machine measurements limit generalization. No concurrency/throughput saturation or repeated-run variance study.
- Same LocalJev prompts/settings are requested; tokenizers, schema enforcement, forced model settings, quantization recipes and backend implementations can differ. The manifest records what could be inspected; unseen server overrides remain a limitation.
- Maximum context limits were NOT changed. This measures real input lengths. Retrying adds extra input/output tokens and latency.
- See manifest.json for pinned source revisions/checksums, selected row IDs, code hashes, settings and machine metadata. results.jsonl contains per-example outputs/timing without source passages, credentials, or prompts. See docs/evaluation.md for reproduction and dataset licensing.
