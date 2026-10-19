# R17 CPU/page-only diagnostic

This is one isolated **CPU/page-only · frozen · synthetic** diagnostic derived from the exact original paired candidate `a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf`. It is not an adopted repair or product acceptance evidence. The completed artifact identity and source bindings are in [R17-CPU-PAGE-ONLY-TRIAL.json](R17-CPU-PAGE-ONLY-TRIAL.json).

The question is whether the rapid phone memory growth remains when the full original CPU Scene traversal and real React/Taro publication continue, while recurring native rendering is removed. This does not independently isolate native allocations from the original GPU renderer's JavaScript staging allocations.

## Boundary

The first ready Scene uses the unchanged original GPU renderer and full native copy/caption/reticle path. Only after that copy and its real `attempt.publish` both succeed does the owner freeze. Placeholder copies before that ready frame are counted separately by the native-copy total; exactly one ready native copy arms freezing.

Later frames execute the original `drawSkyScene` source, astronomy, BSC and actual SAO inputs, constellations, image preparation/readiness callers, name projection/layout, transitions and current publication callbacks. The Scene and its three optical/prepared ports all receive one task-only `SkyGpuRenderer` facade. Its methods return explicitly synthetic success/readiness/contribution values and invoke supplied image callbacks. They do not call the native renderer. Original GPU staging arrays and texture bookkeeping are therefore also removed. No star filter, input reduction, quality change, clock/FPS policy, forced GC, finish, clear, compositing change or global GL patch is introduced.

Every completed synthetic frame still invokes the existing `attempt.publish`, including its normal React state transitions. It skips the native surface `present` entirely, including recurring captions and reticle paint, and skips `r17Probe.accepted`. Synthetic receipt accepted copies and accepted times must remain zero after measurement begins on an already frozen owner. The existing `publishAccepted` timing name is inherited from the original protocol and means synthetic publication in this build; it does not establish presentation.

Real `SkyCanvasSurface.measureText` remains for name layout, including its Canvas2D save/font/measurement/restore work. The native Canvas2D RAF clock and original asynchronous image-loader lifecycle also remain. Frozen validation preserves page, display, selection and resize fences while skipping `gl.isContextLost`; context-health detection is intentionally absent while frozen. Original GPU/Canvas cleanup still runs on retirement.

## Controls and bounded execution

Select a case to arm it, then press the normal product Play button. This uses the original Play guards. Measurement starts from that accepted Play, with the unchanged one-second probe delay and 45-second upper limit. An early export occurs after 15 wall seconds, nominally 14 active seconds, and caches the exact receipt for retry.

A separate 20-second diagnostic timer invokes the latest callback ref for the original `pauseSkyTime`. The callback requires the current interaction owner, no date picker, `PLAYING` state and the same `runStartAt`. Hide, unmount and selecting another case cancel both timers. This is bounded test termination; it is not a product cadence or FPS change. Export itself does not pause.

The menu clearly labels the build. **Do not Apply, pick objects, open Sources or treat frozen pixels as the current Scene.** The root agent owns phone delivery, the feedback generation and all device actions.

Scalar header/export fields:

| Field | Meaning |
| --- | --- |
| `Z`, `R` | Frozen and retired booleans |
| `N total/ready` | Actual native copy returns before freezing / successful ready native copies |
| `V begin/finish/publish` | Synthetic full Scene entry, completion and real page publication totals |
| `T discs/segments` | Synthetic primitive traversal totals |
| `J images/readiness` | Synthetic image/readiness calls |
| `A`, `D`, `I`, `S/C/F/P/M/X/L/K/B/Q` | Existing bounded raw Page bridge observer and enableDebug fields |
| `G calls:bytes/max` | Actual successful typed buffer uploads; reset at actual Play, expected zero for a frozen measurement |

Header fields are sampled on menu open and pinned at export. They do not add per-frame React updates or JSON serialization. The reused Page observer still samples only the first 16 setData payload sizes, retains no raw payloads and preserves in-flight pending acknowledgements at reset.

## Verification and limitations

The builder binds every original paired source and both original bundles, current production source, all four preceding trial sources/bundles, the diagnostic templates and its own source. It creates a complete source build and a whole project copy, with no generated-JS patch. The final `inspect` rechecks sources, both final bundle copies, device safety and all 11 existing static candidate checks.

Focused fixtures cover optional facade methods/readiness/image callbacks, initial native readiness, native-copy and publication failure before freezing, continued real publication with zero synthetic acceptance, resize/retirement, unchanged Scene source/full inputs, all three ports, real measurement/RAF paths, guarded normal Play, early export and current-ref/same-run bounded Pause. Fixture success cannot establish actual phone work, pixels, memory behavior or R17 acceptance.

An additional full strict typecheck found a diagnostic-only optional-property declaration error; it was corrected before delivery. The first unselected build is retained only under the exact `tmp/r17-cpu-page-only-pretypecheck-repair` directory with a `NOT-DELIVERABLE.txt` marker. The final full typecheck exits2 with19 errors in unchanged original config/lifecycle/backend-test dependencies, and zero errors in the changed diagnostic helper, observer, controls, GPU renderer or page. Its complete output is `tmp/r17-cpu-page-only-trial/typecheck.log`. This incomplete isolated-snapshot check is not a pass.

Build and inspect results are preparation evidence only. No phone, feedback selection, DevTools session, service, DB, remote resource, production source, previous trial, PLAN, HANDOFF, INDEX or Git commit is changed by this subtask.
