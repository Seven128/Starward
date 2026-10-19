# Performance skill forward review

Date: 2026-10-19. Reviewer: independent `performance_skill_forward_review` agent.

**Result: PASS for the supplied WEAPP continuous-Play growth and drag-latency scenario.** The skill leads to a useful next experiment and correctly limits what the existing measurements can establish. No blocking misleading instruction or new approval gate was found. This is a forward application of the instructions to recorded evidence and producer code, not new phone evidence, a full implementation audit, or product acceptance.

## Review boundary

Read the current development skill and its performance reference, then only these assigned task materials: `R17-CPU-PAGE-ONLY-RESULT.json`, `R17-CPU-TEXT-METRICS-TRIAL.md/.json`, `PERFORMANCE-TOOL-CAPABILITIES.json`, `R17-PHONE-COMPARISON.json`, and `scripts/r17-phone-probe-runtime.ts`, `scripts/r17-page-bridge-observer.ts`, `scripts/r17-sky-memory.mjs`. The comparison JSON was parsed across all four pairs and its failure/limitation records. No other agent's new synthesis or root audit was read. No phone, ADB, DevTools, service, production source, skill, Context or plan was changed.

Reviewed instruction identities:

- `SKILL.md`: SHA-256 `29cc466906995a5d177fe5c9d50a029ca71c1a8646f3267063cb435c3ee1b877`, 40 lines, approximately 913 whitespace-delimited words.
- `references/performance-investigation.md`: SHA-256 `7208907b782af5f5d6c12260dc312f15f22d049eb28f80c620bcf6dcbff6d53f`, 56 lines, approximately 1,087 words.

## The next lowest-useful action produced by the skill

Use the already completed **CPU/text-metrics cache · frozen · synthetic** build (`da4eedbb6cf06bd895c53bd06b6f414c021e1ab4f8df4840533927cebc48b842`) for one bounded phone observation through the existing device owner. There is a build-ready artifact but no target RESULT. Rebuilding the same experiment, preparing a general profiler framework, or retrying an unestablished native profiler first would delay the available discriminating observation.

The question is whether repeatedly executing the remaining native layout measurement boundary is necessary for the rapid process growth observed in the CPU/page-only run. Retain the existing 10.8-degree data/workload, real CPU Scene and React/Taro publication, the initial real ready copy, and existing guarded normal Play/Pause controls. Read actual native invocation attempts `Y`, hits/misses/evictions/entry count, actual nonempty Scene/publication work, and the verified foreground-process memory record. Use ready-paused, Play and paused-drain phases; do not let host screenshot latency determine termination. Archive the required evidence before any generation refresh. Frozen pixels prohibit using this run for visual, picking, Sources or accepted-time correctness.

The branch decision is concrete:

| Actual result | Consequence |
| --- | --- |
| Native invocation attempts remain near zero after warming, CPU/publication work continues, and rapid growth persists | Repeated layout measurement is not necessary for that observed growth. Move to a remaining consumer/lifetime boundary; do not keep tuning this cache as the explanation. |
| Native calls are removed and growth materially changes under the bounded comparable observation | The removed boundary is implicated. The experiment removes native state/measurement operations **and** related temporary JS work and changes allocation/collection cadence; it does not independently identify a native `TextMetrics` leak. Evaluate a small exact cache repair on the complete product path before adopting it. |
| Misses, evictions or native invocation attempts remain substantial | The intended work was not effectively removed. The result does not exclude the measurement boundary. Determine the actual bypass/capacity mechanism before drawing a causal conclusion. |
| Workload, target association, timer termination or evidence is invalid/empty | Repair that first failed observation boundary. Do not score it as a performance pass or build unrelated instrumentation. |

The 256-entry cache and 15-second export/20-second Pause are existing experiment parameters, not newly selected product budgets or acceptance durations. Additional adjacent variants are not automatically required if this experiment identifies an effective, reviewable small repair.

## Producer semantics that the skill makes the executor inspect

| Raw evidence | Defensible reading and limit |
| --- | --- |
| CPU/page-only result: one real copy; zero recurring uploads; 490 nonempty synthetic Scene finishes in a 13,998 ms receipt; real publication continues | Rapid growth still occurs when the experiment removes recurring GPU work, present/caption painting and renderer staging. Those removed responsibilities are not necessary for the observed growth. This does not eliminate every graphics/native allocation from the host or identify the remaining allocator. |
| Foreground-process PSS rises by 915,266 KiB and Unknown by 871,792 KiB between the recorded first and last samples | Substantial process growth is recorded. The watch includes pre-Play and post-Pause time and has a different clock/start boundary from the receipt. Dividing these deltas by the receipt's 490 frames would be invalid. Unknown does not identify V8; high retained process memory after Pause alone does not prove a leak. |
| Synthetic counters are cumulative from freezing; Page counters reset at actual Play; the probe starts one second later | These are different windows. The skill's explicit-window rule prevents conflating the counts or claiming an allocation-per-frame rate from them. An export deadline is not observed termination. |
| `prepared(frame)` increments `preparedRequests` at every call | 675 requests versus 490 paint attempts does not establish 185 wasted computations. The producer does not distinguish preparation cache hits, actual expensive computation, reuse or consumption. A scheduling repair needs that association and cost evidence. |
| `intent()` overwrites one latest `{at, wall}`; `accepted()` records latency only when the accepted instant equals it | Existing latency distributions are conditional, can include repeated acceptance of the final instant, and cannot uniquely associate A → B → A. For a scheduling/drag-latency decision, add an intent sequence and first accepted-result association at the existing owner; preserve superseded, failed and duplicate classifications. Existing p50/p95 values do not prove unbiased end-to-end input latency. |
| Page observer wraps one supplied `page.setData`, tracks callbacks only when supplied, counts own keys, and serializes at most the first 16 samples | `pending=0`, maximum 2 supports absence of an expanding backlog in that observed callback route. It does not clear React retention, component routes or all bridge allocations. Key counts are not bytes; sampled JSON bytes are not total bridge traffic. `r17StopPageBridgeSampling()` stops byte sampling, not all counters. |
| `r17RecordTypedGpuUpload()` accumulates bytes after the original upload returns | This is submitted typed-array traffic, not retained GPU allocation, texture inventory or physical presentation. The skill explicitly separates these measures. |
| Four paired cases are nonempty but their schedules/work differ; clock is `Date.now` with recorded 1 ms resolution | Report their observed mixed timings. Wide-camera draw is worse in this sample; narrow-camera is better. Neither gives a general causal speedup. Zero/sub-millisecond stage samples are not proof of zero cost; nested stage totals cannot be added. Play exits remain failures independently of drag samples. |
| Delivery labels are confirmed, but phone-bundle bytes and runtime AppID are explicitly unverified | Preserve the reported delivery-identity limit. Do not promote recorded bundle hashes into a stronger runtime attestation. |

These are actual weaknesses or coverage limits of the present instruments, not reasons to reject all their evidence. The reference's window, producer-semantics and first-accepted-intent instructions lead directly to these distinctions without requiring knowledge of the new combined audit.

## Tool, permission and workflow assessment

The capability JSON records Perfetto service data-source registration, while the installed host package is not observed as debuggable or profileable and no target profile was attempted. It establishes neither usable native allocation sampling nor zero native allocation. The existing ready experiment can decide the immediate branch without a new profiler. A later logic-layer CPU/allocation profile or narrow system trace should be justified by a remaining question and tested for actual target/nonempty coverage. Windows host monitoring cannot identify the phone allocator.

No new human approval follows from the skill for this already authorized local diagnostic. Device input remains with its existing authorized owner. A future genuinely unavailable system permission would be handled at that boundary; the mere presence of a new tool name does not create an approval step.

At the next necessary diagnostic edit, export named bounded numeric summaries, run/phase identity and actual native-call counts through the existing collector; preserve its versioning, exact retry and privacy rules. This would reduce manual header transcription. It is not necessary to retrofit every old result or block the already-ready experiment on a new recorder. Likewise, a finite run-locked mode is a conditional reduction in repeated build cost, not a requirement to create a general performance platform.

## Skill quality and scope of pass

The main skill routes performance work to a focused reference rather than copying a tool catalog into every development action. The reference is moderately dense but its length is justified here: it covers causal controls, clock/window alignment, producer semantics, target-layer eligibility and stopping. The repeated session/reuse/verification language is brief, points to existing owners and adds performance-specific failure conditions. It does not impose a new approval stage, full-product rerun, fixed sample count, mandatory trace/heap snapshot, or broad instrumentation prerequisite.

No instruction amendment is required by this forward review. The pass covers whether an executor can choose and interpret the next action from these materials. It does **not** certify runtime package loading, every supported scenario, the text cache's eventual product suitability, or a repair to R17.
