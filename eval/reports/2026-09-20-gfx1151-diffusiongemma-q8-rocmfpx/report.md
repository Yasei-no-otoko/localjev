# LocalJev bake-off: 2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx

Status: **complete** (240/240 measured requests).

This run evaluates **DiffusionGemma Q8_0_ROCMFPX_AGENT only**, on Windows with a gfx1151 Radeon 8060S. All 31 model layers were offloaded to ROCm0. Exact model, binary, build and HTTP-patch hashes are recorded in [runtime.json](runtime.json).

The 120 examples and all 240 short/long inputs match [2026-09-18-bakeoff](../2026-09-18-bakeoff/report.md). The original DiffusionGemma result used macOS / oMLX / MLX 4-bit. This comparison includes runtime, quantization and prompt-handling differences; it does not isolate GPU hardware speed. See [comparison.md](comparison.md).

The native decoder uses the original entropy-bound schedule (temperature 0.4–0.8, at most 48 denoising steps) rather than the ordinary temperature=0 requested by the evaluator. JSON schemas are prompted, not grammar-enforced. The 8192-token context and microbatch capacities remained fixed across both input conditions; no evidence was truncated.

Two long-context SST-5 requests remained invalid JSON after all three attempts and count as failures. The separate interrupted FP16 run contributes no rows to this report. The Q8 server was stopped after evaluation.

Runtime: Bun 1.4.2; AMD RYZEN AI MAX+ 395 w/ Radeon 8060S; 119.647 GiB RAM; ROCmFPX c49ebdb + local HTTP patch.
Seed 20260918; configured 40 balanced examples/task; selected 120 total examples; temperature 0; max output 256; up to 2 corrective retries; one request in flight.
Cache policy: **bust-prefix**. Background sizes are **words added**, not context-window settings or exact token budgets. Token counts below are backend-reported.

## Quality × model × input length

Accuracy counts failed requests as wrong. SST-5 accuracy uses the highest-probability level; MAE uses the expected score. Macro accuracy weights the three tasks equally.

| Model | Background words | AG News accuracy | BoolQ accuracy | SST-5 accuracy | SST-5 MAE ↓ | Macro accuracy | Failures |
|---|---:|---:|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 0 | 87.5% | 80.0% | 55.0% | 0.451 | 74.2% | 0/120 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 2048 | 87.5% | 87.5% | 37.5% | 0.781 | 70.8% | 2/120 |

## Decision latency × model × input length

Wall time covers the real LocalJev Engine, tokenization/inference upstream, JSON parsing and corrective retries. Warm-ups/model loading are excluded. Latency includes failed requests. This non-streaming benchmark does **not measure TTFT**. No localhost Bun HTTP hop is included.

| Model | Background words | p50 (s) ↓ | p95 (s) ↓ | Mean (s) ↓ | Input tokens, first attempt | Output tokens incl. retries | Retried | Cached input |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 0 | 5.482 | 11.149 | 5.972 | 423 | 26.5 | 0/120 | 0.0% |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 2048 | 12.673 | 29.557 | 14.705 | 3179 | 29.8 | 13/120 | 0.0% |

## Per-task uncertainty and calibration

Wilson 95% intervals are indicative, unadjusted for multiple comparisons and class-stratified sampling. Calibration/F1/MAE are conditional on valid responses: always inspect coverage above. ECE uses 10 equal-width bins and **max class probability**, not LocalJev's entropy-based confidence. Tiny samples make ECE noisy. Brier is `(p_yes-y)²` for BoolQ and the sum over class errors for multiclass tasks; do not compare its magnitude across tasks. NLL clips probabilities at 1e-12; all probability metrics concern self-reported, normalized model outputs.

| Model | Background | Task | Correct / total | Accuracy 95% interval | Macro F1 | Brier ↓ | NLL ↓ | ECE ↓ |
|---|---:|---|---:|---|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 0 | ag_news | 35/40 | 73.9%–94.5% | 0.869 | 0.215 | 0.470 | 0.040 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 0 | boolq | 32/40 | 65.2%–89.5% | 0.798 | 0.163 | 4.179 | 0.175 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 0 | sst5 | 22/40 | 39.8%–69.3% | 0.502 | 0.583 | 1.013 | 0.155 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 2048 | ag_news | 35/40 | 73.9%–94.5% | 0.875 | 0.231 | 0.523 | 0.074 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 2048 | boolq | 35/40 | 73.9%–94.5% | 0.875 | 0.125 | 3.454 | 0.125 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 2048 | sst5 | 15/40 | 24.2%–53.0% | 0.361 | 0.932 | 3.581 | 0.453 |

## Paired background effect

Only pairs with valid responses in both conditions are counted.

| Model | Added words | Valid pairs | Prediction changed | Correct → wrong | Wrong → correct |
|---|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 2048 | 118 | 22 | 10 | 7 |

## Output diagnostics

Grammar-valid JSON can still contain semantically invalid probabilities (such as all zeros). Retries recover some of these; length-limited attempts and reasoning are shown separately. No warnings returned is not proof of schema enforcement.

| Model | Background | First-pass valid / requests | Additional attempts | Length-limited attempts | Reasoning attempts |
|---|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 0 | 120/120 | 0 | 0 | 0 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 2048 | 107/120 | 16 | 0 | 0 |

Terminal errors:
- 2 × model output remained invalid after 3 attempt(s): response contains an incomplete JSON object

## Excluded warm-ups / first-call overhead

The first call may include model loading/eviction/compilation; these are **not isolated cold-load measurements**. Two short warm-ups do not guarantee every prompt shape is compiled. New model load behavior and runtime settings can affect the first calls.

| Model | Warm-up | Seconds | Valid |
|---|---:|---:|---|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 1 | 6.060 | true |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT | 2 | 2.254 | true |

## Caveats and provenance

- Public benchmark contamination is possible. These are held-out dataset splits, not guaranteed unseen pretraining data; this is not a Jev-vs-model benchmark.
- Balanced sampling changes class priors. The background condition is an artificial distraction/prefill stress test, not a new natural long-document dataset. The complete target stays in the middle; no evidence is truncated.
- Model order is fixed to minimize reload overhead; conditions are interleaved per example. Thermal/runtime drift and one-machine measurements limit generalization. No concurrency/throughput saturation or repeated-run variance study.
- Same LocalJev prompts/settings are requested; tokenizers, schema enforcement, forced model settings, quantization recipes and backend implementations can differ. The manifest records what could be inspected; unseen server overrides remain a limitation.
- Maximum context limits were NOT changed. This measures real input lengths. Retrying adds extra input/output tokens and latency.
- See manifest.json for pinned source revisions/checksums, selected row IDs, code hashes, settings and machine metadata. results.jsonl contains per-example outputs/timing without source passages, credentials, or prompts. See docs/evaluation.md for reproduction and dataset licensing.
