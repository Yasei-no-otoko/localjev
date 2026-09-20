# DiffusionGemma: final valid-output comparison

The current standard-Q8 run completed **240/240 Engine-valid decisions**, matching the original DiffusionGemma bake-off's final coverage. It produced 238 valid first attempts; two short-context requests succeeded after one corrective retry each. Valid output means the Engine accepted the response and probability schema, not that the classification was correct.

The references are the DiffusionGemma subset of the [original macOS/oMLX MLX 4-bit run](../2026-09-18-bakeoff/report.md) and the previous Windows/gfx1151 [Q8 run with JSON output fixes and Flash Attention enabled](../2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx-json-fixed/report.md). The current run disables Flash Attention (FA), enables the prompt KV cache, and adds the entropy precision correction. Both Q8 runs use the same standard GGUF weights; model, source, binary and patch hashes are recorded in [runtime.json](runtime.json).

| Run | Final valid / 240 | First-pass valid / 240 | Terminal failures | Retried requests | Additional attempts |
|---|---:|---:|---:|---:|---:|
| Original MLX 4-bit | 240 (100%) | 234 (97.50%) | 0 | 6 (2.50%) | 6 |
| Previous Q8, FA on | 237 (98.75%) | 237 (98.75%) | 3 | 3 (1.25%) | 6 |
| Current Q8, FA off | 240 (100%) | 238 (99.17%) | 0 | 2 (0.83%) | 2 |

The same 120 selected examples, each evaluated with 0 and 2048 added background words, form all 240 decisions. The Engine and evaluation code match the original after newline normalization. Request settings remain seed 20260918, temperature 0, maximum output 256, up to two corrective retries, and one request in flight. The native entropy-bound decoder retains its original temperature schedule; API temperature 0 does not make that decoder greedy. See the [manifest](manifest.json) and [summary](summary.json).

Accuracy counts terminal failures as incorrect; macro accuracy weights the three tasks equally. Each task has 40 examples per condition. SST-5 MAE uses the expected score from valid responses only, so the previous short-context MAE covers 39 responses while the other rows cover 40.

| Run | Background words | Macro accuracy | AG News | BoolQ | SST-5 | SST-5 MAE ↓ |
|---|---:|---:|---:|---:|---:|---:|
| Original MLX 4-bit | 0 | 74.2% | 87.5% | 87.5% | 47.5% | 0.603 |
| Original MLX 4-bit | 2048 | 65.0% | 82.5% | 87.5% | 25.0% | 0.937 |
| Previous Q8, FA on | 0 | 73.3% | 87.5% | 82.5% | 50.0% | 0.479 |
| Previous Q8, FA on | 2048 | 72.5% | 90.0% | 85.0% | 42.5% | 0.657 |
| Current Q8, FA off | 0 | 72.5% | 87.5% | 82.5% | 47.5% | 0.550 |
| Current Q8, FA off | 2048 | 70.0% | 87.5% | 85.0% | 37.5% | 0.868 |

Observed decision latency includes Engine processing, inference, parsing, failures and corrective retries; model loading and warm-ups are excluded.

| Run | Background words | p50 (s) | p95 (s) | Mean (s) |
|---|---:|---:|---:|---:|
| Original MLX 4-bit | 0 | 1.207 | 1.897 | 1.167 |
| Original MLX 4-bit | 2048 | 2.050 | 3.139 | 2.131 |
| Previous Q8, FA on | 0 | 5.167 | 8.278 | 5.427 |
| Previous Q8, FA on | 2048 | 11.505 | 16.831 | 11.642 |
| Current Q8, FA off | 0 | 4.844 | 8.204 | 5.147 |
| Current Q8, FA off | 2048 | 12.011 | 16.572 | 12.061 |

The [controlled origin study](../2026-09-20-rocmfpx-json-origin/report.md) held the three failing prompts, token IDs and seeds fixed: FA off with the prompt cache on yielded 3/3 valid outputs, versus 0/3 with FA on. FP64 entropy arithmetic alone left the matched malformed outputs unchanged. These results demonstrate inference-path sensitivity, without identifying a faulty kernel or proving faulty model weights. The full-run comparison also changes the cache-busting nonce and entropy arithmetic, so it does not isolate FA alone.

The independent numerical correction is proposed in [ROCmFPX PR #114](https://github.com/charlie12345/ROCmFPX/pull/114); removal of false repetition truncation is proposed in [PR #115](https://github.com/charlie12345/ROCmFPX/pull/115). Structured output remains `prompt_only`: no grammar enforcement, JSON repair, or fabricated probabilities were added. Generated probability values are model-reported scores, not established calibrated probabilities. This 240-case success provides no guarantee for unseen inputs and does not establish a general accuracy winner or statistical significance.

The macOS and Windows results differ in hardware, runtime and quantization. Small CPU regression builds and source review also occurred during the current run, although no other GPU inference ran. These are observed application latencies, not an isolated GPU or kernel performance comparison.
