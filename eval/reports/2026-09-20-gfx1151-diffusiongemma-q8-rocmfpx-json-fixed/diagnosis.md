# Diagnosis of the three standard-Q8 JSON failures

Replaying all three failures from the [standard-Q8 evaluation](../2026-09-20-gfx1151-diffusiongemma-q8-rocmfpx-standard/report.md) reproduced two distinct problems: valid generated JSON was truncated by native HTTP postprocessing, and one request produced a schema-like extra root property. All cases use SST-5 with 2,048 background words. Request hashes, raw responses and isolated probes are preserved in [diagnostics.json](diagnostics.json); HTTP checks and binary, patch, model and configuration provenance are recorded in [runtime.json](runtime.json).

| Case | Original behavior, including corrective retries | Isolated intervention | Result |
|---|---|---|---|
| `sst5:test:89` | Three incomplete responses, each reporting 10 output tokens | EOS-only trimming; original compact schema prompt restored | Valid first response, 33 output tokens; unchanged 3,114 input tokens |
| `sst5:test:1831` | Three incomplete responses, each reporting 10 output tokens | EOS-only trimming; original compact schema prompt restored | Valid first response, 33 output tokens; unchanged 3,190 input tokens |
| `sst5:test:173` | Three parseable responses with forbidden root property `"type":"object"` | Schema whitespace only, using the original binary | Valid first response; input increased from 3,088 to 3,114 tokens |

The original native `trim_canvas` heuristic checked strides of one and two. At stride two, it compared only alternate tokens, without checking the intervening tokens, and treated six equal comparisons as a loop. In compact decimal arrays, repeated `0` tokens satisfy that test while intervening periods and commas differ. For example, the valid generated response for case 89 was:

```json
{"answers":{"q1":[0.0,0.0,0.0,0.95,0.05]}}
```

The heuristic reduced its 33 native output tokens, including four channel-control tokens, to 10; the assistant content became `{"answers":{"q1":[`. It still reported `finish_reason: "stop"`. Native-token regression fixtures reproduce this false positive. The isolated EOS-only probes preserved the original compact prompt and source request settings, recovering complete responses for both affected cases. Their client request bodies necessarily differ because the schema was injected explicitly to restore the original rendered prompt; source-comparable hashes and original input-token counts are recorded separately.

Case 173 was different: the original binary returned `{"type":"object","answers":...}` on every attempt. An isolated probe changed only schema serialization, inserting 30 ASCII spaces after separators outside strings. The rendered prompt otherwise matched exactly. This added 26 tokens and produced a valid response on the first attempt with the same original binary. This establishes formatting sensitivity for this request; it does not establish a universal whitespace remedy or explain the model's internal decision.

The [native output patch](../../../scripts/rocmfpx-json-output.patch) therefore removes repetition-based truncation, retaining the first end-of-generation boundary and existing output limit, and formats prompted schemas with readable comma/colon separators matching the Python adapter. It preserves string contents and escaping. Model weights, the core diffusion decoder, seed handling and generation parameters are unchanged. There is no output repair, inserted answer or fabricated probability. Structured output remains explicitly `prompt_only`, without grammar enforcement.

The rebuild used 32 jobs. All 20 native regression checks passed; HTTP checks verified three serialization fixtures and rejection of eight invalid schema inputs and five invalid seeds. With both changes, the three replayed first API requests matched their pre-fix hashes and all passed Engine validation on their first attempt. Classification correctness was nevertheless **0/3**, versus **1/3** in the [FP16 replay](../2026-09-20-gfx1151-fp16-sst5-retest/report.md). Format validity is separate from sentiment accuracy. These selected failures support the scoped diagnosis, not an accuracy improvement or guaranteed JSON validity.

The [complete 240-request rerun](report.md) had 237 first-pass valid responses and three terminal failures after two corrective retries each. All 120 requests with 2,048 background words passed on the first attempt, including the original three SST-5 failures. The short-input condition passed 117/120. The evaluator, samples and scoring were unchanged; the full rerun used a fresh cache-busting nonce, so its quality and latency changes cannot be attributed solely to the patch. Independent recomputation verified coverage, all 240 input-state hashes and every reported metric.

The remaining failures were `ag_news:test:7375`, `sst5:test:104` and `ag_news:test:6369`, all with no added background. Exact replay matched all nine original request hashes. The parser-bypassing `/completion` endpoint returned the same 46/49/46 generated tokens, with matching prompt-token counts, and `/detokenize` exposed the complete channel markers. After removing only the complete empty thought-channel prefix, native text matched the chat response exactly. All three contained an extra double quote immediately after the opening brace:

```text
{"
  "answers": {
```

Closing brackets and braces were present. The unmatched quote made the JSON invalid before chat parsing; the Engine's error wording, "incomplete JSON object", did not mean the server truncated it. This is a remaining model-formatting failure in prompt-only generation, separate from the corrected output heuristic. No repair was applied, and these three failures remain counted as wrong. Full raw responses, native token IDs and hash checks are retained under `remainingFailures` in [diagnostics.json](diagnostics.json).

The same patched binary also replayed both historical AGENT-Q8 failures, `sst5:test:763` and `sst5:test:1831`, preserving that run's nonce, seeds and first-request bytes after replacing only the served model alias. Both passed on their first attempt; one classification was correct. These two selected results are recorded under `agentAfterFix` in the diagnostics, separately from the full standard-Q8 benchmark. Both model servers were stopped after testing.
