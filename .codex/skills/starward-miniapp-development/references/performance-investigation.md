# Performance investigations in WEAPP

Use this reference for latency, rendering, allocation and memory investigations. Product requirements and evidence boundaries remain with [development feedback](../../../../project_context/development-workflow/development-feedback.md#performance-measurement-boundaries); the [device skill](../../starward-wechat-device-verification/SKILL.md) owns phone operations, target binding and privacy.

## Choose the method and operator

- Choose from the [four observation methods](../../../../project_context/development-workflow/development-feedback.md#feedback-and-capture-choice) by the unresolved question and total cost. Reuse feedback and existing data before requesting a new profile; there is no mandatory sequence.
- Prepare the candidate and a minimal checklist first. Preserve the workload and lifecycle needed for the claim without imposing a fixed duration or capture bundle. User-led capture is the default; agent capture requires delegation and tool support, with interruption and recovery costs considered.

## Primary profiler

**真机调试开发者工具（主用）** is the adopted route when physical-device profiling is needed. This means the separate developer window attached to the physical phone, with **Performance** and **Memory** panels. It is distinct from the desktop simulator, ordinary preview and the phone's CPU-profile menu.

The decision is settled: usable debugging in the required high-memory scene plus a complete, parseable Heap export are sufficient to establish this route. Reuse the successful session and evidence. Do not commission every profiler mode, repeat a tool-selection comparison, or require a new validation matrix before investigating the next problem. Use the needed feature directly and check the resulting data. A feature not yet exercised is not thereby verified, unsupported, or a new prerequisite.

For another computer or a real connection failure, use [VPN/TUN LAN setup and recovery](true-debug-lan.md). Restore the necessary environment and phone connection, then collect the result needed for the current question. Historical disconnections do not override the adopted route or justify restarting version/build/reconnection loops.

| Pending question | Primary observation | What it establishes |
| --- | --- | --- |
| Slow interaction, time-field updates or expensive JS work | Performance recording and exact-build source maps | Executed stacks, hotspots and available event timing. Associate the relevant input with preparation and the first accepted result. |
| Which functions allocate memory | Memory allocation sampling | Statistical allocation attribution within the actual sampling settings and window; not every allocation or a complete retention graph. |
| Which objects remain and who holds them | Heap snapshot, with a comparable before/after snapshot when needed | Recorded objects and reference paths in the selected VM. Separate intentional current state/cache from obsolete retained data. |
| When objects are allocated and which survive | Allocation instrumentation on timeline, with stacks only when useful | Allocation/lifetime detail over the recorded window. Tracking and its final snapshot can be expensive; choose it for a concrete question. |
| Request or lifecycle delay | Relevant Network/Console and Performance events | The observed request, error or transition. Request completion, JS work and physical presentation are separate events. |

Choose only the observation that can change the next repair decision. A sufficient existing profile needs analysis, not another capture. Do not record several expensive profilers together merely because their controls are available. A screenshot of a heap-size counter or an ordinary screen recording is not a memory profile.

## Collect and qualify a target profile

1. **Bind the real work.** Reuse the exact compiled candidate, phone, current scene and relevant VM. Preserve the matching source maps. For Sky, keep the required view, landscape, actual BSC/loaded-SAO work, time, data and cache conditions; an empty/daylight scene is not the night-star workload. Use existing bindings and observations rather than rebuilding solely for metadata.
2. **State the decision.** Separate interaction delay from memory growth and unexpected exit. Identify the competing explanations and the result that would change the next action. For an operation, associate its input with admitted preparation and the first accepted result; repeated final timestamps alone cannot identify A → B → A or superseded input.
3. **Capture the needed window.** Use the official window and supported tools. Keep workload termination with the actual product/lifecycle owner; host latency or model response time must not decide when Play stops. For growth, distinguish ready-idle, active work and idle drain/retirement as required by the question. Reuse prior captures and stop conditions instead of adding arbitrary durations or repeat counts.
4. **Save and inspect.** Export to an existing user-visible local directory, preferably the user's selected disk, outside tracked source. Keep raw originals local unless upload is explicitly requested. Verify the actual file parses, contains useful target data and covers the intended operation; retain missing fields and unmapped stacks honestly. These are integrity checks on the requested result, not separate feature-admission experiments. If the official tool cannot operate a native capture/save control, prepare everything else and give the user only that minimal action.
5. **Use the evidence.** Locate the responsible owner, repair a coherent change and verify the affected normal product path. Tool connectivity, successful export, root-cause identification and product acceptance are different outcomes. A single snapshot is a baseline, not proof of leakage or leak freedom.

### Interpretation that changes decisions

- Compare compatible source, target, data, cache and lifecycle conditions. Keep ordinary preview, remote debugging, instrumented builds and release execution distinct; debugging and snapshot GC/pause can perturb timing and memory. Verify a repair under the required normal execution condition.
- Bind separate recordings through a shared event or bounded clock relationship. Wall time is not automatically thread CPU time; stage maxima cannot be summed into frame time. Retain unknown/invalid clock intervals and actual recording coverage rather than inventing zero or precision.
- Request count minus paint count is not wasted work. Distinguish preparation actually consumed, supersession, cancellation, accepted publication and the cost of unused work before changing scheduling. Preserve the authoritative state and resource owners.
- `setData`, `nextTick`, copy completion, GPU completion and visible presentation have different meanings. Use the event actually needed for the claim. Allocation samples, total churn, retained bytes, PSS/RSS/Swap, native decodes and GPU residents are not interchangeable or generally additive.
- A control must preserve required data, feedback and lifecycle behavior while removing the work being tested. A negative result narrows that hypothesis; it does not justify a chain of adjacent disable variants. Return to the full product path for repair verification.

## Fallback observations

**普通预览与 Android 系统观测（备用）** combines bounded application observations with target-bound Android analysis. Use only the part needed when the primary profiler has an actual unresolved failure, cannot expose the relevant native/system domain, or ordinary execution is specifically required for comparison. Do not build or activate the whole combination as a parallel default.

### Ordinary-preview observations when remote debugging drops

| Concrete gap | Backup observation | Core limit |
| --- | --- | --- |
| Input → preparation → accepted-result association or an unexposed business stage | Existing bounded recorder at the actual owners | Match identities and windows; elapsed time/counters are not arbitrary CPU stacks or physical FPS. |
| Thread scheduling, process pressure or an unexpected exit | Foreground-bound Perfetto/Trace Processor, `dumpsys meminfo`, scoped exit/error records | Bind the actual Appbrand process and start identity. Process totals do not identify a JS object, VM or allocation owner. |
| An object/resource lifetime gap | Bounded create/use/retire observations at the allocation and ownership boundaries | Follow replacement and drain/retirement; surviving samples alone do not establish a strong root or native/GPU retention. |

For Perfetto, select only the needed supported sources and inspect the resulting coverage/data loss. The public `perfetto --txt -c - -o <owned-trace>` route can resolve a trace-service config-file access problem. MemoryInfra/GC registration alone does not supply useful allocator or isolate data; distinguish appservice and renderer coverage. Missing host profileability, allocator stacks or GPU timing remains unavailable, not zero.

### Memory attribution without the remote-debug channel

Locate the domain with process accounting and scoped exit evidence before attributing it to JS/native/GPU. A V8 fatal allocation record and an OS native-crash category describe different levels of the same failure; neither alone locates the business owner.

Reuse existing bounded weak witnesses and ownership observations only for a specific remaining question. Keep scalars/limited weak references, distinguish sampling coverage from the population, and avoid probes that retain the objects they observe. Restrict framework reads to version-verified owned objects/fields; no arbitrary closure scans, getters or per-frame graph serialization. A captured snapshot's explicit retaining graph is different from such a live probe.

If the process may exit before export, preserve independent checkpoints before that boundary using the existing bounded, single-flight, immutable-retry collector. Read back saved evidence; unacknowledged points remain missing. Stop tracking at the real lifecycle boundary and release owned diagnostic resources.

Reuse task-owned entrypoints when this backup is needed: [stage/identity recorder](../../../work-items/sky-map-performance-2026-10-18/scripts/R17-PROBE-V3.md), [checkpoint/lifetime adapter](../../../work-items/sky-map-performance-2026-10-18/scripts/r25-memory-lifetime-adapter.ts), and [bounded owner association](../../../work-items/sky-map-performance-2026-10-18/scripts/r26-memory-owner-links.ts). Exact configurations and raw evidence belong to the task; these links do not authorize rebuilding frozen variants or trusting old ports/PIDs.

## Capability ceiling and escalation

The selected VM's heap and JS execution are detailed evidence within their captured scope, not the complete phone process, all VMs or all native/GPU allocations. Source instrumentation and process counters cannot silently fill an absent retaining graph or stack. Use a targeted backup only when that missing domain matters to the pending decision.

For a real failure, preserve the current attempt and inspect its first failed boundary. A CLI timeout may leave a live QR/window or capture; inspect before retrying. Keep the required VPN/TUN and storage intact. Do not add private WeChat IPC, a raw CDP bridge, forced-GC fixes or a new profiler framework as recovery. Reuse a working route; reopen a failed operation only when its relevant condition changes.

## Keep the loop economical

Stop collection when the evidence can decide the next action. Report what was located or fixed, the remaining uncertainty and its practical consequence. Tool setup and successful captures do not close product defects; unrelated independent work does not erase a blocked requirement. Keep progress, samples and failures in task evidence, with reusable choices here and in their Context owner.

References: [WeChat true-debug Performance](https://developers.weixin.qq.com/miniprogram/dev/devtools/remote-debug-profiler.html), [heap snapshots](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots), [allocation profiling](https://developer.chrome.com/docs/devtools/memory-problems/allocation-profiler), [Android process memory](https://developer.android.com/tools/dumpsys#meminfo), [local Perfetto](https://perfetto.dev/docs/getting-started/local-android-trace-recording), [Trace Processor](https://perfetto.dev/docs/getting-started/command-line-analysis), [native profiling eligibility](https://perfetto.dev/docs/data-sources/native-heap-profiler).
