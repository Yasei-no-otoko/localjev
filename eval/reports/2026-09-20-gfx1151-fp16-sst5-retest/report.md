# Selected-failure retest

**FP16 returned valid probability JSON on the first attempt for all three cases.** No output-format failure recurred and no corrective retry was needed. One classification matched the SST-5 gold label; two did not.

Retest of ALL failed requests from one completed source run. Selected failures only; this is not an overall accuracy estimate or a replacement for the source benchmark.

Source: 2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx-standard; target: .runtime/models/diffusiongemma-26B-A4B-it. Status: complete (3/3).

Settings unchanged: 90s/attempt, 256 output tokens, 2 corrective retries; 2 excluded warm-ups. First-request hashes match after replacing only the model identifier. Corrective requests use the new model's own responses.

Raw JSON means JSON.parse accepts the entire assistant text; Engine validity additionally checks probability output and can accept fenced JSON. Gold correctness is separate from both.

| Example | Added words | Last raw JSON valid | Engine valid | Gold correct | Prediction / gold | Attempts | Seconds |
|---|---:|---|---|---|---|---:|---:|
| sst5:test:89 | 2048 | true | true | true | 3 / 3 | 1 | 25.56 |
| sst5:test:173 | 2048 | true | true | false | 0 / 1 | 1 | 30.85 |
| sst5:test:1831 | 2048 | true | true | false | 4 / 3 | 1 | 32.66 |

Per-attempt raw assistant outputs, hashes and errors are retained in results.jsonl. This selected subset cannot establish comparative overall accuracy or hardware performance.

Class indices: 0 = very negative, 1 = negative, 2 = neutral, 3 = positive, 4 = very positive. Thus case 173 predicted very negative instead of negative, and case 1831 predicted very positive instead of positive.

The original Google checkpoint was loaded as FP16, entirely on Radeon 8060S / gfx1151, using the same PyTorch/Transformers backend as the earlier interrupted FP16 run. The checkpoint entropy-bound schedule, SDPA, eager experts and dynamic cache were retained. Exact source revision, cached asset metadata, versions and launch arguments are recorded in [runtime.json](runtime.json).

Matching API request bytes does not make the underlying implementations identical: the FP16 and Q8 backends differ in the weights package, tokenizer/chat-template rendering and schema serialization. These three selected failures do not isolate quantization as a cause or establish overall accuracy. The FP16 server was stopped immediately after evaluation.
