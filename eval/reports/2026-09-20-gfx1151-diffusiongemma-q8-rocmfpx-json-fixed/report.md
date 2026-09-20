# LocalJev bake-off: 2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx-json-fixed

Status: **complete** (240/240 measured requests).

This is the complete standard-Q8 rerun with the HTTP and JSON output patches. See [the diagnosis](diagnosis.md), [controlled replay evidence](diagnostics.json), and [runtime provenance](runtime.json). Historical reports are preserved unchanged.

The original 2026-09-18 bake-off data, sample selection, LocalJev Engine, generation request settings and scoring are unchanged. This Windows gfx1151 run uses ROCmFPX Q8, unlike the original macOS/oMLX MLX 4-bit backend; it does not isolate hardware performance.

The full rerun uses a fresh cache-busting nonce, so its rendered prompts differ from the previous full run. Controlled replay comparisons preserve the original nonce and first-request hashes. JSON validity is separate from classification accuracy.

Structured output remains prompt_only. The diffusion decoder does not enforce a JSON grammar. The three remaining terminal failures are retained and counted as wrong; diagnostic replays are excluded from all benchmark metrics.

Runtime: Bun 1.4.2; AMD RYZEN AI MAX+ 395 w/ Radeon 8060S; 119.647 GiB RAM; ROCmFPX c49ebdb + HTTP and JSON output patches.
Seed 20260918; configured 40 balanced examples/task; selected 120 total examples; temperature 0; max output 256; up to 2 corrective retries; one request in flight.
Cache policy: **bust-prefix**. Background sizes are **words added**, not context-window settings or exact token budgets. Token counts below are backend-reported.

## Quality × model × input length

Accuracy counts failed requests as wrong. SST-5 accuracy uses the highest-probability level; MAE uses the expected score. Macro accuracy weights the three tasks equally.

| Model | Background words | AG News accuracy | BoolQ accuracy | SST-5 accuracy | SST-5 MAE ↓ | Macro accuracy | Failures |
|---|---:|---:|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | 87.5% | 82.5% | 50.0% | 0.479 | 73.3% | 3/120 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 90.0% | 85.0% | 42.5% | 0.657 | 72.5% | 0/120 |

## Decision latency × model × input length

Wall time covers the real LocalJev Engine, tokenization/inference upstream, JSON parsing and corrective retries. Warm-ups/model loading are excluded. Latency includes failed requests. This non-streaming benchmark does **not measure TTFT**. No localhost Bun HTTP hop is included.

| Model | Background words | p50 (s) ↓ | p95 (s) ↓ | Mean (s) ↓ | Input tokens, first attempt | Output tokens incl. retries | Retried | Cached input |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | 5.167 | 8.278 | 5.427 | 446 | 33.3 | 3/120 | 0.0% |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 11.505 | 16.831 | 11.642 | 3202 | 30.4 | 0/120 | 0.0% |

## Per-task uncertainty and calibration

Wilson 95% intervals are indicative, unadjusted for multiple comparisons and class-stratified sampling. Calibration/F1/MAE are conditional on valid responses: always inspect coverage above. ECE uses 10 equal-width bins and **max class probability**, not LocalJev's entropy-based confidence. Tiny samples make ECE noisy. Brier is `(p_yes-y)²` for BoolQ and the sum over class errors for multiclass tasks; do not compare its magnitude across tasks. NLL clips probabilities at 1e-12; all probability metrics concern self-reported, normalized model outputs.

| Model | Background | Task | Correct / total | Accuracy 95% interval | Macro F1 | Brier ↓ | NLL ↓ | ECE ↓ |
|---|---:|---|---:|---|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | ag_news | 35/40 | 73.9%–94.5% | 0.920 | 0.138 | 0.316 | 0.050 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | boolq | 33/40 | 68.1%–91.3% | 0.824 | 0.163 | 4.179 | 0.150 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | sst5 | 20/40 | 35.2%–64.8% | 0.481 | 0.668 | 1.121 | 0.234 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | ag_news | 36/40 | 76.9%–96.0% | 0.897 | 0.183 | 0.419 | 0.055 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | boolq | 34/40 | 70.9%–92.9% | 0.850 | 0.150 | 4.147 | 0.147 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | sst5 | 17/40 | 28.5%–57.8% | 0.396 | 0.870 | 2.076 | 0.417 |

## Paired background effect

Only pairs with valid responses in both conditions are counted.

| Model | Added words | Valid pairs | Prediction changed | Correct → wrong | Wrong → correct |
|---|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 117 | 18 | 8 | 6 |

## Output diagnostics

Grammar-valid JSON can still contain semantically invalid probabilities (such as all zeros). Retries recover some of these; length-limited attempts and reasoning are shown separately. No warnings returned is not proof of schema enforcement.

| Model | Background | First-pass valid / requests | Additional attempts | Length-limited attempts | Reasoning attempts |
|---|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | 117/120 | 6 | 0 | 0 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 120/120 | 0 | 0 | 0 |

Terminal errors:
- 3 × model output remained invalid after 3 attempt(s): response contains an incomplete JSON object

## Excluded warm-ups / first-call overhead

The first call may include model loading/eviction/compilation; these are **not isolated cold-load measurements**. Two short warm-ups do not guarantee every prompt shape is compiled. New model load behavior and runtime settings can affect the first calls.

| Model | Warm-up | Seconds | Valid |
|---|---:|---:|---|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 1 | 7.524 | true |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2 | 3.143 | true |

## Caveats and provenance

- Public benchmark contamination is possible. These are held-out dataset splits, not guaranteed unseen pretraining data; this is not a Jev-vs-model benchmark.
- Balanced sampling changes class priors. The background condition is an artificial distraction/prefill stress test, not a new natural long-document dataset. The complete target stays in the middle; no evidence is truncated.
- Model order is fixed to minimize reload overhead; conditions are interleaved per example. Thermal/runtime drift and one-machine measurements limit generalization. No concurrency/throughput saturation or repeated-run variance study.
- Same LocalJev prompts/settings are requested; tokenizers, schema enforcement, forced model settings, quantization recipes and backend implementations can differ. The manifest records what could be inspected; unseen server overrides remain a limitation.
- Maximum context limits were NOT changed. This measures real input lengths. Retrying adds extra input/output tokens and latency.
- See manifest.json for pinned source revisions/checksums, selected row IDs, code hashes, settings and machine metadata. results.jsonl contains per-example outputs/timing without source passages, credentials, or prompts. See docs/evaluation.md for reproduction and dataset licensing.
