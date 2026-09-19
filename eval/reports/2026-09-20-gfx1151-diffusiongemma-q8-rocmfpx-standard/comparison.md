Standard Q8 and AGENT Q8 both completed all 240 measured requests on the same Radeon 8060S (gfx1151) Windows machine. Standard Q8 recorded macro accuracy of 72.5% / 70.0% for short / added-background inputs, versus 74.2% / 70.8% for AGENT. Standard Q8 had lower mean and p95 decision latency in these runs, while median latency was close.

Each condition contains 40 examples per task, 120 requests total. Added background is measured in words, not context-window tokens. Both variants use the same 8192-token server context.

| Variant | Added words | AG News accuracy | BoolQ accuracy | SST-5 accuracy | SST-5 MAE | Macro accuracy |
|---|---:|---:|---:|---:|---:|---:|
| Standard Q8 | 0 | 82.5% | 85.0% | 50.0% | 0.514 | 72.5% |
| Standard Q8 | 2048 | 90.0% | 87.5% | 32.5% | 0.869 | 70.0% |
| AGENT Q8 | 0 | 87.5% | 80.0% | 55.0% | 0.451 | 74.2% |
| AGENT Q8 | 2048 | 87.5% | 87.5% | 37.5% | 0.781 | 70.8% |

Accuracy includes terminal failures as incorrect; macro accuracy weights tasks equally. SST-5 accuracy selects the highest-probability class, while MAE uses the expected score and valid responses only: 40 short responses per variant, 37 long responses for standard and 38 for AGENT. The generated, normalized class probabilities are model-reported scores, not validated as calibrated probabilities or derived from decoder token likelihoods.

| Variant | Added words | p50 seconds | p95 seconds | Mean seconds | Terminal failures | Retried requests | Extra attempts |
|---|---:|---:|---:|---:|---:|---:|---:|
| Standard Q8 | 0 | 5.552 | 8.082 | 5.315 | 0/120 (0.0%) | 1/120 (0.8%) | 1 |
| Standard Q8 | 2048 | 12.673 | 27.667 | 14.276 | 3/120 (2.5%) | 8/120 (6.7%) | 13 |
| AGENT Q8 | 0 | 5.482 | 11.149 | 5.972 | 0/120 (0.0%) | 0/120 (0.0%) | 0 |
| AGENT Q8 | 2048 | 12.673 | 29.557 | 14.705 | 2/120 (1.7%) | 13/120 (10.8%) | 16 |

Timing includes the LocalJev Engine, upstream tokenization/inference, parsing and retries, including failed requests. Loading and two warm-ups are excluded. These are non-streaming decision latencies, not TTFT.

All terminal failures occurred on long SST-5 inputs after three attempts. Standard failed on `sst5:test:89` and `sst5:test:1831` with incomplete JSON, and on `sst5:test:173` because the root structure failed the required `answers`-only validation. AGENT failed on `sst5:test:763` and `sst5:test:1831` with incomplete JSON. Neither run had a length-limited attempt. JSON schemas are supplied as prompt instructions; decoding does not enforce them.

| Variant | GGUF bytes | F32 tensors | Q8_0_ROCMFPX tensors | Q8_0 tensors |
|---|---:|---:|---:|---:|
| Standard Q8 | 26,113,166,432 | 423 | 268 | 1 |
| AGENT Q8 | 26,504,415,840 | 423 | 109 | 160 |

Standard is 391,249,408 bytes (1.48%) smaller on disk. AGENT uses ordinary Q8_0 for 159 tensors that use Q8_0_ROCMFPX in standard. The custom format stores 32 int8 values plus a one-byte UE4M3 scale; ordinary Q8_0 stores 32 int8 values plus an FP16 scale. Both files contain 692 tensors and have identical tokenizer and chat-template hashes. Non-tokenizer metadata differs only in `general.file_type` (111 versus 115); neither file overrides the default entropy-bound diffusion schedule.

The manifests match on all 120 selected examples, dataset revisions/checksums, suite hash, non-model settings and evaluator code hashes. All 240 state hashes match. Runtime records confirm the same six recorded artifact hashes and seven Engine/evaluation file hashes. Both runs use seed 20260918, one request in flight, a 256-token output limit, two corrective retries and the same native diffusion schedule. The requested temperature of zero does not override that schedule.

AGENT ran first and standard ran later; each variant was measured once. Cache-busting nonces differ, so rendered requests are not byte-identical even with matching state hashes. Run order, thermal/power conditions and other system activity can affect latency. These observations do not establish statistical significance, a general winner, or isolated GPU hardware performance.

Exact metrics and outputs: [standard summary](summary.json), [standard results](results.jsonl), [AGENT summary](../2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx/summary.json), [AGENT results](../2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx/results.jsonl). Reproduction and source/model/runtime pins: [standard manifest](manifest.json), [standard runtime](runtime.json), [AGENT manifest](../2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx/manifest.json), [AGENT runtime](../2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx/runtime.json). Only these two completed Q8 runs are included.
