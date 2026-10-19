# R17 CPU/text-metrics cache diagnostic

This task-only successor asks whether repeated native layout text measurement is necessary for the growth that remained in the completed CPU/page-only phone run. It reuses the exact completed parent source and bundle `cc40d6e5a80563bcb52d20c3cacef4b8781e5e09410b48c04e375d26467a78b5`, whose original paired candidate is `a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf`. This is **CPU/text-metrics cache · frozen · synthetic**, not an adopted repair or target acceptance. Exact identities and current build state are in [R17-CPU-TEXT-METRICS-TRIAL.json](R17-CPU-TEXT-METRICS-TRIAL.json).

The bounded question and text owner analysis are [R17-TEXT-METRICS-BOUNDARY.md](R17-TEXT-METRICS-BOUNDARY.md). A cache hit removes repeated native `save`, font/alignment/baseline assignment, `measureText` and `restore` together. It also removes the corresponding short-lived JavaScript result/glyph work. A changed memory result would not independently identify which of these operations or allocation/GC cadence mattered.

## Exact boundary

The completed parent facade, Page observer, page, GPU renderer and probe runtime are copied byte for byte. The full original CPU Scene, BSC/actual SAO inputs, astronomy, projection, name selection/layout, image/readiness callers, transitions and real React/Taro publication remain. The first ready frame continues through the original native renderer, full copy/caption/reticle path and real publication before freezing. There is no cache use on that unfrozen path.

After freezing, the existing surface `measureText` first checks disposal and native measurement capability. It then looks for a per-surface cache entry before any native context operation. Misses execute the original measurement body, including code-point glyph handling for nonzero letter spacing, unchanged numeric fallback and exception/`finally restore` behavior. Only a successful result's five finite nonnegative numbers may be stored. Invalid input/result and native throws never enter the cache. Actual native calls are counted immediately before invoking native `measureText`, including a call that throws.

The exact key is `font, text, lineHeight, letterSpacing`; no text normalization, approximation, glyph reduction, name limit or clock policy is added. Only the existing valid font declarations `12px sans-serif` and `600 14px sans-serif` are cacheable. Every other font goes through the original native path each time and is never stored. This avoids pretending that arbitrary invalid Canvas font assignments have semantics determined by the requested font string: native Canvas may ignore them and inherit earlier state.

Each native surface owns one 256-entry LRU Map. **256 is a temporary experiment bound, not an adopted production budget.** Reaching capacity evicts the least recently used numeric entry; the new input still receives its full native measurement. Entries contain a frozen private copy of exactly five numbers, with no native `TextMetrics` instance or glyph array. A hit returns a fresh five-number copy. Mutating either the original miss result or a hit cannot contaminate later consumers.

Dispose clears the Map and rejects future use. The original size/node validation invalidates a resized surface, whose replacement creates an independent cache. Actual Play resets observation counters only; existing entries and lifetime counters survive. There is no cache across surfaces and no new global font state. Future `loadFontFace`, font replacement, language/direction/kerning/stretch changes or another shaping-state owner would require invalidation or an expanded key before adopting this as a general product cache.

Only layout `surface.measureText` is cached. The initial native `present` caption measurement remains original. After freeze, the same CPU facade still suppresses recurring GL, full copy, caption paint and reticle paint; renderer staging remains suppressed too. The native Canvas RAF and asynchronous image-loader lifetimes remain. Synthetic publication never calls `r17Probe.accepted`; zero accepted copies/times is intentional.

## Controls and scalar readback

Use the normal product Play button after arming a case. The completed parent's one-second probe delay, 15-second export and separate 20-second latest-ref guarded original Pause are unchanged. Hide, unmount and another case cancel timers. Export retains an exact payload for retry. This termination is a bounded experiment, not a proposed product cadence change. **Do not Apply, pick or inspect Sources in this frozen build.**

The header reads once when opened, and export pins the same scalar string. No per-frame React update, text/key export or extra JSON history is introduced. Existing Z/N/V/T/J, Page bridge and GL fields retain their parent meanings. New fields are:

| Field | Meaning |
| --- | --- |
| `TM H observation/lifetime` | Cache hits since actual Play / this surface's lifetime |
| `U observation/lifetime` | Cache misses, including uncacheable input bypasses |
| `E current/256` | Current entries and temporary capacity |
| `O observation/lifetime` | LRU evictions |
| `Y observation/lifetime` | Actual native `measureText` invocation attempts, including throwing calls |
| `R` | Observation-counter resets during this surface's lifetime |

Native initial unfrozen calls appear in lifetime `Y`. Cache hits/misses only count frozen layout calls. Resetting a measurement does not force cold misses. Many misses/evictions/native calls mean the measurement boundary remains active; that result cannot be interpreted as having removed repeated native work. Native calls and Android Unknown memory are not interchangeable with retained V8 heap bytes.

## Preparation verification

The builder rehashes all original paired sources and both copies of each original bundle, normal sources, all five preceding trial source snapshots and both copies of each trial bundle. It copies all 1,565 parent source files, adds one helper, and changes only the new surface and controls source copies. The final build uses 1,566 bound source files. It never patches generated JavaScript.

The original 15 CPU fixtures are imported and rerun directly against the exact completed parent. The new builder verifies that their common source, including the facade/observer/page/GPU/runtime/Scene/clock, remains byte identical. A separate focused fixture executes the current real surface/cache integration and current controls reset. It covers hit-before-native state operations; full key separation; the two-font admission boundary; mutation isolation; invalid/native-error recovery; bounded LRU eviction; native call accounting; counter-only reset; disposal/capability checks; and independent replacement surfaces. Two in-memory counterchecks confirm that the same hit assertion fails if the cache is removed or if a hit continues into native measurement. Historical trial suites are not duplicated.

The isolated full strict typecheck exits 2 with the same 19 original snapshot dependency/config/lifecycle errors and **zero errors in the changed helper, surface or controls**. This is not a full typecheck pass. Full output and bounded summary are in `tmp/r17-cpu-text-metrics-trial/typecheck.log` and `typecheck-summary.json`.

The completed build and `inspect` must pass all 11 existing static checks, package budget/device safety, source readback and both full bundle fingerprints before the root agent selects it. These are preparation checks only. Actual phone memory, workload, pixels and the diagnostic causal result remain unverified until root delivery and observation. No phone, feedback entry, DevTools session, service, DB, remote resource, production source, prior trial, PLAN, HANDOFF, INDEX or Git commit is changed by this subtask.
