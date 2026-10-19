# R17 generation 20 target observation

Status: **TARGET_GROWTH_PERSISTS_WITH_DEBUG_OFF_PAGE_ACK_BACKLOG_NOT_REPRODUCED**. No repair is adopted; continuous playback and R17 acceptance remain failed/unverified. The [result JSON](R17-PAGE-BRIDGE-RESULT.json) binds both receipts, all four memory files, scoped exit history and six media files by exact byte length and SHA-256. The [build owner](R17-PAGE-BRIDGE-OBSERVATION.json) binds generation 20's selected complete WEAPP bundle **`6cd3bdd1e5bc791ac11941a0ba40eae87f80301d694484b8297a7e06080f815a`** to the original paired candidate and the task-only observer. The sole phone operator supplied actual delivery and interaction evidence; installed phone bytes and runtime AppID were not independently read back.

Normal `flush`, full-frame native copies, real `attempt.publish`/accepted publication, Scene population and cadence remained. There was no finish, frozen frame, clear, star reduction or production-source change. This evidence covers actual normal 1× Play at 10.8°, from the operator-restored 04:30 start.

## Nonempty actual workload windows

Both external files passed the existing strict `starward-r17-phone-probe-v1` collector validator. `paintAttempts = nativeCallbacks = acceptedCopies = sceneFinishes`, with zero failed frames/invalidations **inside each receipt window**. Each contains 8,404 BSC rows, 6,519 SAO rows, 19 selected tiles, DAY mode and publication `97d581f282df7c627304980d14ac4a7a0f53754f5945b1d6ef6658b4712f2b10`.

| Observation | Debug enabled | Debug disabled before Play |
| --- | ---: | ---: |
| Run | `r17-1-zfayq1keye` | `r17-1-ble5msdhok` |
| Actual receipt elapsed | 14,015 ms | 13,988 ms |
| Actual accepted copies / Scene finishes | 490 | 489 |
| GL draw submissions | 2,450 | 2,445 |
| Accepted BSC / SAO objects | 4,900 / 143,868 | 4,890 / 143,571 |
| Accepted distinct times | 461 | 456 |
| Last intent minus accepted | 57 ms | 33 ms |
| Draw CPU p50 / p95 | 11 / 14 ms | 11 / 14 ms |

The receipt starts one second after actual accepted Play. The diagnostic scalar window starts at actual Play, then pins at the export timer about 15 wall seconds later. These are **different windows**: the enabled run's 500 Page submissions and 516 `bufferData` calls must not be equated with its 490 accepted copies or 2,450 GL draw submissions. Export stops measurement, never playback. Neither is a complete 45,000-ms receipt or a clean performance A/B comparison.

Receipts are in `E:/Dev/Starward-data/verification/sky-map-20261018/probe-metrics/`:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `candidate-r17-1-zfayq1keye.json` | 4,582 | `1002e6b3073c8a5f9a46e771c44f9d1c5b02c95eeac9a4f499f665fea41e5e87` |
| `candidate-r17-1-ble5msdhok.json` | 4,579 | `babe9851586cc3655cb46c4968e87b67f9b1906122e91c0146b57097b28ae4e4` |

## Page acknowledgements and typed uploads

The enabled run's viewed `page-bridge-after-counters.png` shows `A1 Dtrue I0`. Its pinned early-export and later header values are:

| Scalar | Pinned early export | After normal Pause and preview close |
| --- | ---: | ---: |
| Submitted / first acknowledgements | 500 / 500 | 1,403 / 1,403 |
| Current / maximum pending | 0 / 2 | 0 / 3 |
| Invocation throws / before-callback throws / duplicates / missing callbacks | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| Callback latency total / maximum | 13,362 / 75 ms | 40,915 / 493 ms |
| Enumerable own keys total / maximum / failures | 4,381 / 10 / 0 | 12,384 / 96 / 0 |
| First 16 sampled UTF-8 bytes total / maximum / serialization failures | 18,700 / 1,256 / 0 | 18,700 / 1,256 / 0 |
| Returned actual `submit` `bufferData` calls | 516 | 1,374 |
| Typed upload bytes total / maximum | 5,656,896 / 11,016 | 15,079,644 / 11,052 |

This did not reproduce an expanding callback-bearing **raw Page** backlog in the enabled run: every tracked request had acknowledged, with maximum pending 3. It does not measure custom-wrapper/native queues or prove native rendering/presentation completion. The 493-ms maximum also precludes a claim that every callback stayed fast. First-16 JSON sizes are bounded samples, not total traffic or retained heap. Returned upload bytes are traffic through the instrumented owner, not retained JS/native/GPU memory or all texture/TWGL allocation.

The disabled run has a viewed **before-Play** `A1 Dfalse` screenshot and no visible vConsole badge. Its post-Play scalar screenshot was not obtained. Do not copy the enabled run's acknowledgement/upload figures into the disabled run.

## Foreground memory and actual stopping outcome

All retained memory samples bind the actual foreground Activity owner. Values below are **KiB**, and elapsed time is relative to each memory helper, not a calibrated Play start. Sources and all projected samples are in the JSON; originals remain under `E:/Dev/Starward-data/verification/sky-map-20261018/native-play-copy-trial/`.

| Run / sample | Elapsed ms | TOTAL PSS | RSS | Swap PSS | Unknown PSS | GL / EGL mtrack PSS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Debug enabled, first | 3,078 | 3,136,003 | 2,234,780 | 1,249,408 | 1,232,740 | 26,240 / 119,520 |
| Debug enabled, peak sampled PSS | 15,759 | 4,795,256 | 3,760,392 | 1,331,416 | 2,885,504 | 25,120 / 119,520 |
| Debug enabled, final retained sample | 35,354 | 4,137,210 | 2,341,708 | 2,089,952 | 1,457,044 | 25,120 / 119,520 |
| Debug disabled, first | 2,340 | 840,538 | 1,125,460 | 40 | 287,536 | 9,356 / 89,132 |
| Debug disabled, final retained sample | 39,510 | 2,034,905 | 2,319,408 | 40 | 1,427,640 | 8,256 / 89,132 |

The enabled process was already warm and substantially swapping before Play (idle PSS 3,196,841 KiB, swap 1,249,408 KiB). Its TOTAL PSS cannot be treated as physical DRAM. The sole operator successfully used normal Pause, viewed **04:30:45 预览**, then cancelled/closed preview without Apply.

Next, the sole operator used the normal WeChat capsule **开发调试 → 关闭调试**. The app exited, and unchanged official auto-preview was reopened. `page-bridge-debug-off-before.png` confirms `Dfalse`; no further debug-setting change was reported during Play. Despite the lower restart state, all seven subsequent foreground samples show growing PSS/RSS/Unknown while swap stays 40 KiB and GL/EGL mtrack remains nearly flat. Debugging disabled is therefore insufficient as the repair. Android Unknown/Private Other does **not** identify JS, V8 or a specific native allocator, and the different warm/restart states do not support a measured debug-mode improvement claim.

The last viewed disabled-run screenshot shows **04:30:31 播放中**. The next Pause was rejected by the foreground guard, with **no input sent**; a subsequent capture was also rejected. A successful Pause or exact exit instant is not established. There was no Apply. The early nonempty receipt is preserved even though continuous playback was not accepted.

`page-bridge-debug-off-exit-summary.json` was read **after a later performance-panel/settings action also exited the app**. Its newest `reason=1,status=0` belongs to that later settings restart and is not evidence of a Play crash. The second entry (`reason=5,status=6`, age 662 seconds) classifies a temporally nearby native crash; its exact foreground process, trial and instant were not independently bound. No causal OOM claim follows. The older third entry is retained without assigning it to this run.

Five screenshots are retained and were viewed by the sole operator; the evidence writer independently viewed the paused, final scalar, debug-off-before and debug-off-last screenshots. The 15-second `page-bridge-debug-off-play.mp4` is retained and hashed, **not fully reviewed**. No full-video verification is claimed.

The next unresolved boundary is target JS heap ownership through an available native snapshot mechanism. That work remains with the sole phone operator. These observations supply neither a reason to adopt debug-off/finish/copy as a repair nor completion of normal-candidate playback, landscape motion or the remaining reverse-order wide-camera countercheck.
