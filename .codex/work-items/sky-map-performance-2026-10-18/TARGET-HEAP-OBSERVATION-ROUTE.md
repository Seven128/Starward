# Sky heap and CPU observation routes

2026-10-23 adopted selection: **真机调试开发者工具（主用）** is the phone-attached developer window's Performance/Memory route. **普通预览与 Android 系统观测（备用）** retains targeted application ownership/timing and Android evidence for actual gaps. Reusable instructions belong to the [development skill](../../skills/starward-miniapp-development/SKILL.md#performance-investigations); task readiness and execution authorization remain with the active handoff/Goal. Historical captures below retain their original scope and are not new setup requirements.

## Adopted routing

The [VPN/TUN LAN run](LAN-DEBUG-RESUME-20261023.md) established a usable high-memory Sky connection and a complete, parseable Heap export. Those strong boundaries are sufficient for adopting the primary route; do not run a per-feature qualification matrix for Performance or allocation tools. Directly use the needed profile for the pending cause, preserving exact target/build and source-map semantics. The ordinary-preview combination is a backup, with its prior [r25/gen29 evidence](R25-CHECKPOINT-PHONE-RESULT-20261022.md) and [review](R25-CHECKPOINT-PHONE-REVIEW-20261022.md) still reusable within their scopes. The obsolete-frame/aggregate retention question and prior [V8 OOM failure](R25-MEMORY-PHONE-RESULT-20261022.md) remain unresolved; successful transport/capture does not itself locate the root or repair the product.

## Historical qualification routes (2026-10-19)

1. **JS allocation attribution:** reuse official ordinary true-debug → Memory → Allocation sampling → Start/Stop → Save. The actual phone Map qualification completed capture, export and parsing. It produced 254 call-tree nodes and 21 samples with valid references and compiled script locations. Keep this route ahead of another adjacent disable/implementation-shape comparison when it can distinguish the current causes.
2. **CPU and sampled GC activity:** reuse the same target's official Performance panel. The successful short recording contains 459 CPU nodes, 114 samples and 10 garbage-collector sample hits. A sampled GC hit is not an exact GC event or pause duration. No heap-counter events were exported despite requesting Memory; the UI's 0 B is unavailable coverage, not a zero heap.
3. **Process footprint:** retain the existing foreground-owner-bound r17-sky-memory.mjs route for PSS/RSS/Swap accounting over aligned windows. It cannot identify a VM or allocator. Script/window duration is not necessarily the interval represented by every process sample.
4. **Ordinary-preview CPU fallback:** the phone capsule's Start/Stop CPU Profile followed by exact-file pull is validated for capture/export/parse. The existing sample was mostly idle/framework on a data-error page; it is not a Sky workload baseline. Use this fallback only when its ordinary-preview execution condition or lack of remote attachment answers a concrete gap.

Qualification facts, current versions, hashes and scope are owned by [PERFORMANCE-TOOL-QUALIFICATION.json](PERFORMANCE-TOOL-QUALIFICATION.json). [PERFORMANCE-TOOL-CAPABILITIES.json](PERFORMANCE-TOOL-CAPABILITIES.json) remains the historical read-only Android/package/Perfetto preflight, not the current full profiling decision. Raw profiles and before-edit records are in the existing private evidence owner at E:/Dev/Starward-data/verification/sky-map-20261018/performance-method-20261019.

## What the allocation profile means

The installed frontend starts sampling at 16,384-byte intervals without include-collected options. Its default surviving-allocation profile can attribute statistical allocation weights to call stacks. It does not measure total short-lived churn, an exact complete live heap, retained-size ownership or native/GPU allocation. Twenty-one samples establish qualification, not a stable hotspot ranking or a repair percentage. The GUI resolves compiled modules; mapping a real Sky hotspot to current source responsibility remains subsequent execution work.

The historical R17 attempt produced one initial snapshot and no valid second export. The later LAN baseline is a separate capture, not a comparable pair with that older session. For the current retaining-path question, use compatible snapshots or the needed allocation recording through the adopted primary route. Preserve GC/pause/retention disturbance in interpretation; requesting Force GC is not a product repair.

## Recorded coverage limits to retain

- This Android user-build WeChat host has no observed debuggable/profileable eligibility. Exact-target proc maps and smaps_rollup reads returned permission denied. Registered heapprofd does not change this. Do not start another empty native allocation profile; reopen only when the relevant host/system eligibility changes.
- The successful Performance export did not contain UpdateCounters or separate GC trace events. CPU samples remain useful, including sampled GC activity, but no complete heap curve or exact GC-event coverage is claimed.
- The recorded public CLI/automator package has no general HeapProfiler control. Use the official GUI's native capture/save control when the installed tool cannot perform it; missing automation is not unsupported capture. Do not add private IPC or a raw CDP bridge competing with the official channel.
- wx.getPerformance().now is callable on this target but consecutive reads showed small backward deltas. Function existence is not a monotonic-clock guarantee. The new probe contract must preserve invalid/unknown timing and cost coverage; source-level availability is not device deployment.

## Session and retrieval boundaries

Keep the successful connection and source identity. Earlier LAN failure/WAN fallback was a historical transport outcome, superseded for route selection by the later usable LAN run. Follow the [portable LAN procedure](../../skills/starward-miniapp-development/references/true-debug-lan.md), not old machine addresses or ports. CLI/SDK remote timeout does not establish cancellation, so check actual state before any retry. The official private bigPackageSizeSupport setting remains a development aid, not a package-budget or production-policy change.

The historical debugging window used tool-side Storage and had approximately 4.3 seconds of round-trip latency. That condition is not a current setting or a measure of product interaction latency. New generation, scene, target or restart invalidates affected binding only; do not blindly reissue preview or reuse an old input-authorized screenshot.

Keep raw profiles outside Git and print only bounded structural/numeric summaries. The native Android importer in this installed version pulls files and deletes phone originals. For the ordinary-preview fallback, use the observed exact file path and exact-file pull instead; do not enumerate account storage or import unrelated traces. Existing phone originals were preserved. No reset/reseed, pairing/VPN change or reminder replay is authorized by profiling.

## Sky execution under the resumed Goal

The same PLAN owns nonempty Sky sampling. Confirm the current source/bundle/mode and real workload, preserve product-owned bounded Play/Pause, align ready/play/drain, and interpret the sampled stacks before choosing a specific owner-level comparison. Confirm that remote-debug conditions reproduce the relevant symptom. The Map qualification is not Sky diagnosis, normal-path A/B acceptance or a new product performance budget. A current GUI/SDK startup failure stays at that boundary; do not repeat the completed qualification or substitute an unrelated sample.

Primary semantics: [HeapProfiler protocol](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json), [allocation timeline](https://developer.chrome.com/docs/devtools/memory-problems/allocation-profiler), [Android profileable](https://developer.android.com/guide/topics/manifest/profileable-element), [Perfetto native profiling](https://perfetto.dev/docs/data-sources/native-heap-profiler). Current-target applicability is established by the actual captures above, not by those tool names alone.
