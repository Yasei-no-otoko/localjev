# LocalJev bake-off: 2026-09-18-bakeoff

Status: **complete** (1200/1200 measured requests).

Runtime: Bun 1.4.0; Apple M5 Max; 64 GiB RAM; oMLX 0.6.4.
Seed 20260918; configured 40 balanced examples/task; selected 120 total examples; temperature 0; max output 256; up to 2 corrective retries; one request in flight.
Cache policy: **bust-prefix**. Background sizes are **words added**, not context-window settings or exact token budgets. Token counts below are backend-reported.

## Quality × model × input length

Accuracy counts failed requests as wrong. SST-5 accuracy uses the highest-probability level; MAE uses the expected score. Macro accuracy weights the three tasks equally.

| Model | Background words | AG News accuracy | BoolQ accuracy | SST-5 accuracy | SST-5 MAE ↓ | Macro accuracy | Failures |
|---|---:|---:|---:|---:|---:|---:|---:|
| gemma-4-E2B-it-UD-MLX-4bit | 0 | 32.5% | 70.0% | 35.0% | 0.926 | 45.8% | 0/120 |
| gemma-4-E2B-it-UD-MLX-4bit | 2048 | 27.5% | 80.0% | 15.0% | 1.625 | 40.8% | 3/120 |
| gemma-4-E4B-it-UD-MLX-4bit | 0 | 65.0% | 75.0% | 50.0% | 0.611 | 63.3% | 0/120 |
| gemma-4-E4B-it-UD-MLX-4bit | 2048 | 75.0% | 62.5% | 12.5% | 1.748 | 50.0% | 0/120 |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 0 | 87.5% | 85.0% | 52.5% | 0.533 | 75.0% | 0/120 |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 2048 | 85.0% | 85.0% | 37.5% | 0.648 | 69.2% | 0/120 |
| qwen3.6-35b-a3b-ud-mlx-4bit | 0 | 90.0% | 85.0% | 55.0% | 0.599 | 76.7% | 0/120 |
| qwen3.6-35b-a3b-ud-mlx-4bit | 2048 | 87.5% | 80.0% | 40.0% | 0.764 | 69.2% | 0/120 |
| diffusiongemma-26B-A4B-it-4bit | 0 | 87.5% | 87.5% | 47.5% | 0.603 | 74.2% | 0/120 |
| diffusiongemma-26B-A4B-it-4bit | 2048 | 82.5% | 87.5% | 25.0% | 0.937 | 65.0% | 0/120 |

## Decision latency × model × input length

Wall time covers the real LocalJev Engine, tokenization/inference upstream, JSON parsing and corrective retries. Warm-ups/model loading are excluded. Latency includes failed requests. This non-streaming benchmark does **not measure TTFT**. No localhost Bun HTTP hop is included.

| Model | Background words | p50 (s) ↓ | p95 (s) ↓ | Mean (s) ↓ | Input tokens, first attempt | Output tokens incl. retries | Retried | Cached input |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gemma-4-E2B-it-UD-MLX-4bit | 0 | 0.522 | 0.642 | 0.502 | 332 | 40.4 | 0/120 | 0.0% |
| gemma-4-E2B-it-UD-MLX-4bit | 2048 | 0.698 | 2.076 | 0.909 | 3087 | 57.0 | 21/120 | 0.0% |
| gemma-4-E4B-it-UD-MLX-4bit | 0 | 0.543 | 0.714 | 0.564 | 332 | 28.3 | 3/120 | 0.0% |
| gemma-4-E4B-it-UD-MLX-4bit | 2048 | 1.079 | 1.299 | 1.103 | 3087 | 26.0 | 1/120 | 0.0% |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 0 | 0.675 | 0.874 | 0.681 | 336 | 27.9 | 0/120 | 0.0% |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 2048 | 1.750 | 2.108 | 1.773 | 3091 | 27.7 | 0/120 | 0.0% |
| qwen3.6-35b-a3b-ud-mlx-4bit | 0 | 0.889 | 1.007 | 0.813 | 337 | 44.9 | 0/120 | 0.0% |
| qwen3.6-35b-a3b-ud-mlx-4bit | 2048 | 1.499 | 1.772 | 1.502 | 3132 | 43.1 | 0/120 | 0.0% |
| diffusiongemma-26B-A4B-it-4bit | 0 | 1.207 | 1.897 | 1.167 | 537 | 41.3 | 1/120 | 0.0% |
| diffusiongemma-26B-A4B-it-4bit | 2048 | 2.050 | 3.139 | 2.131 | 3292 | 49.3 | 5/120 | 0.0% |

## Per-task uncertainty and calibration

Wilson 95% intervals are indicative, unadjusted for multiple comparisons and class-stratified sampling. Calibration/F1/MAE are conditional on valid responses: always inspect coverage above. ECE uses 10 equal-width bins and **max class probability**, not LocalJev's entropy-based confidence. Tiny samples make ECE noisy. Brier is `(p_yes-y)²` for BoolQ and the sum over class errors for multiclass tasks; do not compare its magnitude across tasks. NLL clips probabilities at 1e-12; all probability metrics concern self-reported, normalized model outputs.

| Model | Background | Task | Correct / total | Accuracy 95% interval | Macro F1 | Brier ↓ | NLL ↓ | ECE ↓ |
|---|---:|---|---:|---|---:|---:|---:|---:|
| gemma-4-E2B-it-UD-MLX-4bit | 0 | ag_news | 13/40 | 20.1%–48.0% | 0.223 | 1.132 | 6.906 | 0.544 |
| gemma-4-E2B-it-UD-MLX-4bit | 0 | boolq | 28/40 | 54.6%–81.9% | 0.693 | 0.262 | 5.711 | 0.230 |
| gemma-4-E2B-it-UD-MLX-4bit | 0 | sst5 | 14/40 | 22.1%–50.5% | 0.288 | 0.823 | 7.056 | 0.292 |
| gemma-4-E2B-it-UD-MLX-4bit | 2048 | ag_news | 11/40 | 16.1%–42.8% | 0.227 | 1.362 | 15.408 | 0.702 |
| gemma-4-E2B-it-UD-MLX-4bit | 2048 | boolq | 32/40 | 65.2%–89.5% | 0.792 | 0.200 | 5.526 | 0.200 |
| gemma-4-E2B-it-UD-MLX-4bit | 2048 | sst5 | 6/40 | 7.1%–29.1% | 0.088 | 1.323 | 14.548 | 0.595 |
| gemma-4-E4B-it-UD-MLX-4bit | 0 | ag_news | 26/40 | 49.5%–77.9% | 0.634 | 0.637 | 6.599 | 0.293 |
| gemma-4-E4B-it-UD-MLX-4bit | 0 | boolq | 30/40 | 59.8%–85.8% | 0.747 | 0.243 | 5.052 | 0.262 |
| gemma-4-E4B-it-UD-MLX-4bit | 0 | sst5 | 20/40 | 35.2%–64.8% | 0.439 | 0.765 | 6.889 | 0.264 |
| gemma-4-E4B-it-UD-MLX-4bit | 2048 | ag_news | 30/40 | 59.8%–85.8% | 0.739 | 0.453 | 3.836 | 0.178 |
| gemma-4-E4B-it-UD-MLX-4bit | 2048 | boolq | 25/40 | 47.0%–75.8% | 0.619 | 0.353 | 7.918 | 0.367 |
| gemma-4-E4B-it-UD-MLX-4bit | 2048 | sst5 | 5/40 | 5.5%–26.1% | 0.087 | 1.393 | 15.895 | 0.661 |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 0 | ag_news | 35/40 | 73.9%–94.5% | 0.869 | 0.227 | 0.451 | 0.091 |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 0 | boolq | 34/40 | 70.9%–92.9% | 0.850 | 0.150 | 3.526 | 0.147 |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 0 | sst5 | 21/40 | 37.5%–67.1% | 0.504 | 0.674 | 2.929 | 0.265 |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 2048 | ag_news | 34/40 | 70.9%–92.9% | 0.845 | 0.284 | 2.314 | 0.142 |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 2048 | boolq | 34/40 | 70.9%–92.9% | 0.850 | 0.153 | 4.155 | 0.159 |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 2048 | sst5 | 15/40 | 24.2%–53.0% | 0.355 | 0.966 | 4.020 | 0.487 |
| qwen3.6-35b-a3b-ud-mlx-4bit | 0 | ag_news | 36/40 | 76.9%–96.0% | 0.902 | 0.183 | 0.391 | 0.032 |
| qwen3.6-35b-a3b-ud-mlx-4bit | 0 | boolq | 34/40 | 70.9%–92.9% | 0.850 | 0.156 | 4.165 | 0.160 |
| qwen3.6-35b-a3b-ud-mlx-4bit | 0 | sst5 | 22/40 | 39.8%–69.3% | 0.537 | 0.637 | 1.184 | 0.263 |
| qwen3.6-35b-a3b-ud-mlx-4bit | 2048 | ag_news | 35/40 | 73.9%–94.5% | 0.877 | 0.231 | 1.717 | 0.045 |
| qwen3.6-35b-a3b-ud-mlx-4bit | 2048 | boolq | 32/40 | 65.2%–89.5% | 0.799 | 0.213 | 5.562 | 0.224 |
| qwen3.6-35b-a3b-ud-mlx-4bit | 2048 | sst5 | 16/40 | 26.3%–55.4% | 0.307 | 0.759 | 2.023 | 0.267 |
| diffusiongemma-26B-A4B-it-4bit | 0 | ag_news | 35/40 | 73.9%–94.5% | 0.874 | 0.219 | 0.446 | 0.071 |
| diffusiongemma-26B-A4B-it-4bit | 0 | boolq | 35/40 | 73.9%–94.5% | 0.874 | 0.125 | 3.454 | 0.125 |
| diffusiongemma-26B-A4B-it-4bit | 0 | sst5 | 19/40 | 32.9%–62.5% | 0.460 | 0.708 | 1.175 | 0.269 |
| diffusiongemma-26B-A4B-it-4bit | 2048 | ag_news | 33/40 | 68.1%–91.3% | 0.816 | 0.288 | 0.577 | 0.101 |
| diffusiongemma-26B-A4B-it-4bit | 2048 | boolq | 35/40 | 73.9%–94.5% | 0.875 | 0.125 | 3.457 | 0.122 |
| diffusiongemma-26B-A4B-it-4bit | 2048 | sst5 | 10/40 | 14.2%–40.2% | 0.232 | 1.129 | 4.403 | 0.590 |

## Paired background effect

Only pairs with valid responses in both conditions are counted.

| Model | Added words | Valid pairs | Prediction changed | Correct → wrong | Wrong → correct |
|---|---:|---:|---:|---:|---:|
| gemma-4-E2B-it-UD-MLX-4bit | 2048 | 117 | 48 | 21 | 17 |
| gemma-4-E4B-it-UD-MLX-4bit | 2048 | 120 | 47 | 25 | 9 |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 2048 | 120 | 17 | 12 | 5 |
| qwen3.6-35b-a3b-ud-mlx-4bit | 2048 | 120 | 20 | 13 | 4 |
| diffusiongemma-26B-A4B-it-4bit | 2048 | 120 | 23 | 16 | 5 |

## Output diagnostics

Grammar-valid JSON can still contain semantically invalid probabilities (such as all zeros). Retries recover some of these; length-limited attempts and reasoning are shown separately. No warnings returned is not proof of schema enforcement.

| Model | Background | First-pass valid / requests | Additional attempts | Length-limited attempts | Reasoning attempts |
|---|---:|---:|---:|---:|---:|
| gemma-4-E2B-it-UD-MLX-4bit | 0 | 120/120 | 0 | 0 | 0 |
| gemma-4-E2B-it-UD-MLX-4bit | 2048 | 99/120 | 28 | 5 | 0 |
| gemma-4-E4B-it-UD-MLX-4bit | 0 | 117/120 | 3 | 0 | 0 |
| gemma-4-E4B-it-UD-MLX-4bit | 2048 | 119/120 | 1 | 0 | 0 |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 0 | 120/120 | 0 | 0 | 0 |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 2048 | 120/120 | 0 | 0 | 0 |
| qwen3.6-35b-a3b-ud-mlx-4bit | 0 | 120/120 | 0 | 0 | 0 |
| qwen3.6-35b-a3b-ud-mlx-4bit | 2048 | 120/120 | 0 | 0 | 0 |
| diffusiongemma-26B-A4B-it-4bit | 0 | 119/120 | 1 | 0 | 0 |
| diffusiongemma-26B-A4B-it-4bit | 2048 | 115/120 | 5 | 0 | 0 |

Terminal errors:
- 3 × model output remained invalid after 3 attempt(s): q1 probabilities must have a positive sum

## Excluded warm-ups / first-call overhead

The first call may include model loading/eviction/compilation; these are **not isolated cold-load measurements**. Two short warm-ups do not guarantee every prompt shape is compiled. New model load behavior and runtime settings can affect the first calls.

| Model | Warm-up | Seconds | Valid |
|---|---:|---:|---|
| gemma-4-E2B-it-UD-MLX-4bit | 1 | 4.782 | true |
| gemma-4-E2B-it-UD-MLX-4bit | 2 | 0.287 | true |
| gemma-4-E4B-it-UD-MLX-4bit | 1 | 12.359 | true |
| gemma-4-E4B-it-UD-MLX-4bit | 2 | 0.390 | true |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 1 | 16.394 | true |
| gemma-4-26b-a4b-it-UD-MLX-4bit | 2 | 0.429 | true |
| qwen3.6-35b-a3b-ud-mlx-4bit | 1 | 27.696 | true |
| qwen3.6-35b-a3b-ud-mlx-4bit | 2 | 0.523 | true |
| diffusiongemma-26B-A4B-it-4bit | 1 | 7.053 | true |
| diffusiongemma-26B-A4B-it-4bit | 2 | 0.527 | true |

## Caveats and provenance

- Public benchmark contamination is possible. These are held-out dataset splits, not guaranteed unseen pretraining data; this is not a Jev-vs-model benchmark.
- Balanced sampling changes class priors. The background condition is an artificial distraction/prefill stress test, not a new natural long-document dataset. The complete target stays in the middle; no evidence is truncated.
- Model order is fixed to minimize reload overhead; conditions are interleaved per example. Thermal/runtime drift and one-machine measurements limit generalization. No concurrency/throughput saturation or repeated-run variance study.
- Same LocalJev prompts/settings are requested; tokenizers, schema enforcement, forced model settings, quantization recipes and backend implementations can differ. The manifest records what could be inspected; unseen server overrides remain a limitation.
- Maximum context limits were NOT changed. This measures real input lengths. Retrying adds extra input/output tokens and latency.
- See manifest.json for pinned source revisions/checksums, selected row IDs, code hashes, settings and machine metadata. results.jsonl contains per-example outputs/timing without source passages, credentials, or prompts. See docs/evaluation.md for reproduction and dataset licensing.
