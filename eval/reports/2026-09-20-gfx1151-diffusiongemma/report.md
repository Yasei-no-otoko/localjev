# LocalJev bake-off: 2026-09-20-gfx1151-diffusiongemma

Status: **PARTIAL** (41/240 measured requests).

Run stopped at the user's request to switch to Q8 because FP16 placed too much load on the PC. These 41 retained results are an incomplete, potentially unbalanced subset, not a completed comparison with the 240-request baseline. Four warm-ups across two execution segments are excluded. Recovery and original runtime-probe metadata are recorded in [manifest.json](manifest.json) and [runtime.json](runtime.json).

Runtime: Bun 1.4.2; AMD RYZEN AI MAX+ 395 w/ Radeon 8060S; 119.647 GiB RAM; ROCm Transformers 5.11.0.
Seed 20260918; configured 40 balanced examples/task; selected 120 total examples; temperature 0; max output 256; up to 2 corrective retries; one request in flight.
Cache policy: **bust-prefix**. Background sizes are **words added**, not context-window settings or exact token budgets. Token counts below are backend-reported.

## Quality × model × input length

Accuracy counts failed requests as wrong. SST-5 accuracy uses the highest-probability level; MAE uses the expected score. Macro accuracy weights the three tasks equally.

| Model | Background words | AG News accuracy | BoolQ accuracy | SST-5 accuracy | SST-5 MAE ↓ | Macro accuracy | Failures |
|---|---:|---:|---:|---:|---:|---:|---:|
| .runtime/models/diffusiongemma-26B-A4B-it | 0 | 100.0% | 100.0% | 14.3% | 0.850 | 71.4% | 0/21 |
| .runtime/models/diffusiongemma-26B-A4B-it | 2048 | 100.0% | 100.0% | 33.3% | 0.742 | 77.8% | 0/20 |

## Decision latency × model × input length

Wall time covers the real LocalJev Engine, tokenization/inference upstream, JSON parsing and corrective retries. Warm-ups/model loading are excluded. Latency includes failed requests. This non-streaming benchmark does **not measure TTFT**. No localhost Bun HTTP hop is included.

| Model | Background words | p50 (s) ↓ | p95 (s) ↓ | Mean (s) ↓ | Input tokens, first attempt | Output tokens incl. retries | Retried | Cached input |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| .runtime/models/diffusiongemma-26B-A4B-it | 0 | 22.575 | 31.525 | 22.744 | 448 | 38.8 | 0/21 | 0.0% |
| .runtime/models/diffusiongemma-26B-A4B-it | 2048 | 26.364 | 41.822 | 30.645 | 3208 | 31.4 | 0/20 | 0.0% |

## Per-task uncertainty and calibration

Wilson 95% intervals are indicative, unadjusted for multiple comparisons and class-stratified sampling. Calibration/F1/MAE are conditional on valid responses: always inspect coverage above. ECE uses 10 equal-width bins and **max class probability**, not LocalJev's entropy-based confidence. Tiny samples make ECE noisy. Brier is `(p_yes-y)²` for BoolQ and the sum over class errors for multiclass tasks; do not compare its magnitude across tasks. NLL clips probabilities at 1e-12; all probability metrics concern self-reported, normalized model outputs.

| Model | Background | Task | Correct / total | Accuracy 95% interval | Macro F1 | Brier ↓ | NLL ↓ | ECE ↓ |
|---|---:|---|---:|---|---:|---:|---:|---:|
| .runtime/models/diffusiongemma-26B-A4B-it | 0 | ag_news | 7/7 | 64.6%–100.0% | 0.750 | 0.007 | 0.064 | 0.061 |
| .runtime/models/diffusiongemma-26B-A4B-it | 0 | boolq | 7/7 | 64.6%–100.0% | 1.000 | 0.000 | 0.000 | 0.000 |
| .runtime/models/diffusiongemma-26B-A4B-it | 0 | sst5 | 1/7 | 2.6%–51.3% | 0.067 | 1.208 | 1.948 | 0.636 |
| .runtime/models/diffusiongemma-26B-A4B-it | 2048 | ag_news | 7/7 | 64.6%–100.0% | 0.750 | 0.003 | 0.035 | 0.034 |
| .runtime/models/diffusiongemma-26B-A4B-it | 2048 | boolq | 7/7 | 64.6%–100.0% | 1.000 | 0.000 | 0.000 | 0.000 |
| .runtime/models/diffusiongemma-26B-A4B-it | 2048 | sst5 | 2/6 | 9.7%–70.0% | 0.133 | 1.194 | 6.149 | 0.633 |

## Paired background effect

Only pairs with valid responses in both conditions are counted.

| Model | Added words | Valid pairs | Prediction changed | Correct → wrong | Wrong → correct |
|---|---:|---:|---:|---:|---:|
| .runtime/models/diffusiongemma-26B-A4B-it | 2048 | 20 | 1 | 0 | 1 |

## Output diagnostics

Grammar-valid JSON can still contain semantically invalid probabilities (such as all zeros). Retries recover some of these; length-limited attempts and reasoning are shown separately. No warnings returned is not proof of schema enforcement.

| Model | Background | First-pass valid / requests | Additional attempts | Length-limited attempts | Reasoning attempts |
|---|---:|---:|---:|---:|---:|
| .runtime/models/diffusiongemma-26B-A4B-it | 0 | 21/21 | 0 | 0 | 0 |
| .runtime/models/diffusiongemma-26B-A4B-it | 2048 | 20/20 | 0 | 0 | 0 |

## Excluded warm-ups / first-call overhead

The first call may include model loading/eviction/compilation; these are **not isolated cold-load measurements**. Two short warm-ups do not guarantee every prompt shape is compiled. New model load behavior and runtime settings can affect the first calls.

| Model | Warm-up | Seconds | Valid |
|---|---:|---:|---|
| .runtime/models/diffusiongemma-26B-A4B-it | 1 | 22.421 | true |
| .runtime/models/diffusiongemma-26B-A4B-it | 2 | 28.206 | true |
| .runtime/models/diffusiongemma-26B-A4B-it | 1 | 23.747 | true |
| .runtime/models/diffusiongemma-26B-A4B-it | 2 | 23.074 | true |

## Caveats and provenance

- Public benchmark contamination is possible. These are held-out dataset splits, not guaranteed unseen pretraining data; this is not a Jev-vs-model benchmark.
- Balanced sampling changes class priors. The background condition is an artificial distraction/prefill stress test, not a new natural long-document dataset. The complete target stays in the middle; no evidence is truncated.
- Model order is fixed to minimize reload overhead; conditions are interleaved per example. Thermal/runtime drift and one-machine measurements limit generalization. No concurrency/throughput saturation or repeated-run variance study.
- Same LocalJev prompts/settings are requested; tokenizers, schema enforcement, forced model settings, quantization recipes and backend implementations can differ. The manifest records what could be inspected; unseen server overrides remain a limitation.
- Maximum context limits were NOT changed. This measures real input lengths. Retrying adds extra input/output tokens and latency.
- See manifest.json for pinned source revisions/checksums, selected row IDs, code hashes, settings and machine metadata. results.jsonl contains per-example outputs/timing without source passages, credentials, or prompts. See docs/evaluation.md for reproduction and dataset licensing.
