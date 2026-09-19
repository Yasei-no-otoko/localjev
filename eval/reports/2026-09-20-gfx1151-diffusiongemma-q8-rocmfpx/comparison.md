On the same 240 benchmark inputs, Windows ROCmFPX Q8 matched the original DiffusionGemma short-input macro accuracy (74.2%) and scored 70.8% versus 65.0% with added background. Its end-to-end decision latency was higher in both conditions.

The comparison uses only `diffusiongemma-26B-A4B-it-4bit` from the September 18 bake-off and the completed `diffusiongemma-26B-A4B-it-Q8_0_ROCMFPX_AGENT` run. Each condition contains 40 examples per task, 120 requests total. Background means words added to the input, not the context-window setting.

| Backend | Added words | AG News accuracy | BoolQ accuracy | SST-5 accuracy | SST-5 MAE | Macro accuracy |
|---|---:|---:|---:|---:|---:|---:|
| Mac / MLX 4-bit | 0 | 87.5% | 87.5% | 47.5% | 0.603 | 74.2% |
| Mac / MLX 4-bit | 2048 | 82.5% | 87.5% | 25.0% | 0.937 | 65.0% |
| Windows / ROCmFPX Q8 | 0 | 87.5% | 80.0% | 55.0% | 0.451 | 74.2% |
| Windows / ROCmFPX Q8 | 2048 | 87.5% | 87.5% | 37.5% | 0.781 | 70.8% |

Accuracy counts terminal failures as incorrect; macro accuracy weights the three tasks equally. SST-5 accuracy uses the highest-probability class, while MAE uses the expected score and includes valid responses only.

| Backend | Added words | p50 seconds | p95 seconds | Terminal failures | Retried requests | Additional attempts |
|---|---:|---:|---:|---:|---:|---:|
| Mac / MLX 4-bit | 0 | 1.207 | 1.897 | 0/120 | 1/120 | 1 |
| Mac / MLX 4-bit | 2048 | 2.050 | 3.139 | 0/120 | 5/120 | 5 |
| Windows / ROCmFPX Q8 | 0 | 5.482 | 11.149 | 0/120 | 0/120 | 0 |
| Windows / ROCmFPX Q8 | 2048 | 12.673 | 29.557 | 2/120 | 13/120 | 16 |

The two Q8 terminal failures were long-background SST-5 cases `sst5:test:763` and `sst5:test:1831`. Both still contained an incomplete JSON object after three attempts. They remain in accuracy and latency totals; long-background Q8 SST-5 MAE covers 38 valid responses. The original DiffusionGemma subset had no terminal failures.

Timings cover the LocalJev Engine, upstream tokenization/inference, JSON parsing and retries, with one request in flight. Model loading and two warm-ups are excluded; failed requests are included. These are non-streaming decision latencies, not TTFT.

All 120 selected example records, dataset revisions/checksums, and 240 state hashes match. Both runs used seed 20260918, 0/2048 background words, a 256-token output limit, and up to two corrective retries. Cache-busting nonces differ, and backend chat-template/schema rendering differs. The evaluation and Engine source files match after normalizing line endings, as recorded in [runtime.json](runtime.json).

The original environment was Apple M5 Max, 64 GiB RAM, macOS 26.6.2, oMLX 0.6.4 and MLX 4-bit. The Q8 environment was Ryzen AI MAX+ 395 / Radeon 8060S (gfx1151), Windows 11, HIP 7.16.26362 and ROCmFPX with an 8192-token context. ROCmFPX used its default entropy-bound diffusion schedule; the requested temperature of zero does not override that schedule. Its HTTP patch supplies JSON schemas as prompt instructions, without grammar enforcement; the original oMLX run also reported that schema enforcement was unavailable.

This compares complete model/runtime configurations with different hardware, operating systems, quantization and decoding implementations. It does not isolate GPU speed or establish statistical significance. No FP16 partial-run results are included.

Numbers come from the [original summary](../2026-09-18-bakeoff/summary.json) and [Q8 summary](summary.json). The [original manifest](../2026-09-18-bakeoff/manifest.json) and [Q8 manifest](manifest.json) record datasets, selected inputs and evaluation settings. [runtime.json](runtime.json) records launch arguments, GPU offload evidence, binary/patch/model hashes and the pinned [ROCmFPX source revision c49ebdb](https://github.com/charlie12345/ROCmFPX/tree/c49ebdbd5c9f01ec242369f9e7f7967855f80cba) and [Q8 model revision 2eeff146](https://huggingface.co/kingjones777/DiffusionGemma-26B-A4B-it-ROCmFP4-GGUF/tree/2eeff1460e24a0cf45fb98f0def57099c57823fc).
