# LocalJev bake-off: 2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx-fa-off

Status: **complete** (240/240 measured requests).

The standard Q8 ROCmFPX model completed 240/240 Engine-valid decisions: 238 on the first attempt and two after one corrective retry each. This matches the original DiffusionGemma bake-off final valid-output count; classification accuracy is a separate metric.

This run disables Flash Attention and enables the prompt KV cache, with the HTTP, JSON output and entropy patches. See [runtime provenance](runtime.json), [comparison](comparison.md), and [the controlled origin study](../2026-09-20-rocmfpx-json-origin/report.md). Historical runs remain unchanged.

The original 2026-09-18 data, selected examples, LocalJev Engine, generation request settings and scoring are unchanged. This is Windows/gfx1151/ROCmFPX Q8 versus macOS/oMLX MLX 4-bit; timings do not isolate hardware performance.

This full evaluation uses a fresh cache-busting nonce. Its comparison with earlier full runs therefore does not isolate Flash Attention alone. The separate three-case controlled study preserves original prompts and seeds. The entropy correction alone did not change the matched malformed outputs.

Structured output remains prompt_only, without grammar enforcement or output repair. A successful 240-case run is not a guarantee for unseen inputs. No concurrent GPU inference ran; small CPU-only regression builds and repository review took place during the evaluation.

Runtime: Bun 1.4.2; AMD RYZEN AI MAX+ 395 w/ Radeon 8060S; 119.647 GiB RAM; ROCmFPX c49ebdb + HTTP, JSON output and entropy patches; FA off, prefix KV cache on.
Seed 20260918; configured 40 balanced examples/task; selected 120 total examples; temperature 0; max output 256; up to 2 corrective retries; one request in flight.
Cache policy: **bust-prefix**. Background sizes are **words added**, not context-window settings or exact token budgets. Token counts below are backend-reported.

## Quality × model × input length

Accuracy counts failed requests as wrong. SST-5 accuracy uses the highest-probability level; MAE uses the expected score. Macro accuracy weights the three tasks equally.

| Model | Background words | AG News accuracy | BoolQ accuracy | SST-5 accuracy | SST-5 MAE ↓ | Macro accuracy | Failures |
|---|---:|---:|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | 87.5% | 82.5% | 47.5% | 0.550 | 72.5% | 0/120 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 87.5% | 85.0% | 37.5% | 0.868 | 70.0% | 0/120 |

## Decision latency × model × input length

Wall time covers the real LocalJev Engine, tokenization/inference upstream, JSON parsing and corrective retries. Warm-ups/model loading are excluded. Latency includes failed requests. This non-streaming benchmark does **not measure TTFT**. No localhost Bun HTTP hop is included.

| Model | Background words | p50 (s) ↓ | p95 (s) ↓ | Mean (s) ↓ | Input tokens, first attempt | Output tokens incl. retries | Retried | Cached input |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | 4.844 | 8.204 | 5.147 | 447 | 31.4 | 2/120 | 0.0% |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 12.011 | 16.572 | 12.061 | 3202 | 30.4 | 0/120 | 0.0% |

## Per-task uncertainty and calibration

Wilson 95% intervals are indicative, unadjusted for multiple comparisons and class-stratified sampling. Calibration/F1/MAE are conditional on valid responses: always inspect coverage above. ECE uses 10 equal-width bins and **max class probability**, not LocalJev's entropy-based confidence. Tiny samples make ECE noisy. Brier is `(p_yes-y)²` for BoolQ and the sum over class errors for multiclass tasks; do not compare its magnitude across tasks. NLL clips probabilities at 1e-12; all probability metrics concern self-reported, normalized model outputs.

| Model | Background | Task | Correct / total | Accuracy 95% interval | Macro F1 | Brier ↓ | NLL ↓ | ECE ↓ |
|---|---:|---|---:|---|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | ag_news | 35/40 | 73.9%–94.5% | 0.869 | 0.220 | 0.469 | 0.052 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | boolq | 33/40 | 68.1%–91.3% | 0.824 | 0.188 | 4.870 | 0.200 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | sst5 | 19/40 | 32.9%–62.5% | 0.440 | 0.722 | 1.810 | 0.283 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | ag_news | 35/40 | 73.9%–94.5% | 0.869 | 0.224 | 1.056 | 0.073 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | boolq | 34/40 | 70.9%–92.9% | 0.850 | 0.150 | 4.147 | 0.147 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | sst5 | 15/40 | 24.2%–53.0% | 0.355 | 0.965 | 3.511 | 0.498 |

## Paired background effect

Only pairs with valid responses in both conditions are counted.

| Model | Added words | Valid pairs | Prediction changed | Correct → wrong | Wrong → correct |
|---|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 120 | 22 | 10 | 7 |

## Output diagnostics

Grammar-valid JSON can still contain semantically invalid probabilities (such as all zeros). Retries recover some of these; length-limited attempts and reasoning are shown separately. No warnings returned is not proof of schema enforcement.

| Model | Background | First-pass valid / requests | Additional attempts | Length-limited attempts | Reasoning attempts |
|---|---:|---:|---:|---:|---:|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 0 | 118/120 | 2 | 0 | 0 |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2048 | 120/120 | 0 | 0 | 0 |

## Excluded warm-ups / first-call overhead

The first call may include model loading/eviction/compilation; these are **not isolated cold-load measurements**. Two short warm-ups do not guarantee every prompt shape is compiled. New model load behavior and runtime settings can affect the first calls.

| Model | Warm-up | Seconds | Valid |
|---|---:|---:|---|
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 1 | 6.766 | true |
| diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX | 2 | 2.738 | true |

## Caveats and provenance

- Public benchmark contamination is possible. These are held-out dataset splits, not guaranteed unseen pretraining data; this is not a Jev-vs-model benchmark.
- Balanced sampling changes class priors. The background condition is an artificial distraction/prefill stress test, not a new natural long-document dataset. The complete target stays in the middle; no evidence is truncated.
- Model order is fixed to minimize reload overhead; conditions are interleaved per example. Thermal/runtime drift and one-machine measurements limit generalization. No concurrency/throughput saturation or repeated-run variance study.
- Same LocalJev prompts/settings are requested; tokenizers, schema enforcement, forced model settings, quantization recipes and backend implementations can differ. The manifest records what could be inspected; unseen server overrides remain a limitation.
- Maximum context limits were NOT changed. This measures real input lengths. Retrying adds extra input/output tokens and latency.
- See manifest.json for pinned source revisions/checksums, selected row IDs, code hashes, settings and machine metadata. results.jsonl contains per-example outputs/timing without source passages, credentials, or prompts. See docs/evaluation.md for reproduction and dataset licensing.
