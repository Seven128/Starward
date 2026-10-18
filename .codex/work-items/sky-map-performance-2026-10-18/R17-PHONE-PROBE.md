# R17 bounded Android comparison probe

The two complete diagnostic WEAPP bundles are ready. This record establishes source isolation, compilation and diagnostic behavior; it contains no valid phone performance result. The normal source, config, watch output, current feedback entry and phone were not changed by this work.

## Pair and build binding

Both trees copy the same 1,561 current source/config/resource files, including the new time UI, geometry window client and the ruler's preview-only settlement repair. The baseline restores only the five preserved stellar owners from `a36aebf8b29da9e6054dc5ecda8c564c7d921291`. Each recovered original must match its preserved full SHA-256 and byte count; CRLF reconstruction is accepted only when that exact recorded hash matches. Existing node_modules are linked, not copied or installed. No Git branch or worktree is created.

The pair has exactly seven source differences after instrumentation: the five original stellar owners and the two probe files' `baseline`/`candidate` labels. All other copied files and inserted measurement boundaries match. Complete staged source and bundle readback passed after both builds, as did normal source readback. [Build evidence](R17-PHONE-PROBE-BUILD.json) retains fingerprints, exact baseline owners, insertion hashes, the 45,000 ms window and existing static checks. The full disposable source manifest is `tmp/r17-phone-probe/manifest.json`. The rebuilt pair includes the two current repaired test fixtures; readback reports `normalSourceUnchanged=true`, `normalProductSourceUnchanged=true` with no post-build source drift. The preceding 12-second pair's full manifest and build evidence were preserved under `tmp/r17-probe-window-repair/previous-12-second-{manifest,build}.json` before owner cleanup.

| Variant | Complete project under this task | Bundle SHA-256 |
| --- | --- | --- |
| Baseline | `tmp/r17-phone-probe/baseline-project` | `61b5ce1bc7f5ab1954a992c69fb2224468488ee750a3488a54832bb0dd54bef5` |
| Candidate | `tmp/r17-phone-probe/candidate-project` | `a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf` |

Each project uses `miniprogramRoot=weapp/`, the existing public project identity, no copied private config, 338 bundle files, a 2,016,773 B main package and 80,379 B main headroom. Both pass `assertPhysicalDeviceBundleSafe`, `fingerprintBundle`, `inspectReleaseBundleBudget` and all `inspectCandidate` checks. The complete output is compiled from staging source; no generated JavaScript was patched. Existing fixture, acceptance-storage, request-diagnostic, operator-token and release modes are disabled. The compiled API origin uses the task's physical-LAN development bridge on 8795; no concrete address or credential is stored in this evidence.

## Measurement and controls

Only these diagnostic builds append **计量** to the existing Sky menu. Its popover does not resize the Sky canvas or ruler. Choose `wide-camera`, `wide-time`, `wide-play`, `narrow-camera`, `narrow-time` or `narrow-play`. Start clears the previous in-memory sample, opens the existing time disclosure for time/play cases (or closes the menu for camera cases), waits one second, then records for 45 seconds and stops automatically. The longer window allows guarded screenshot review before the next physical input; the delay remains one second. No new draw loop, artificial camera, mock clock, catalogue cap or time/Context mutation is added. The probe popover does not stay over the gesture area during recording.

After the window has ended, reopen **计量** and press **停止并导出**. Manual export can also end an active run, but use the same stop method for a comparable pair. Export is one explicit POST; retries reuse the same run ID and settled payload. A **已导出** message is only the collector's receipt, not a performance verdict. Each start resets only the probe's private module memory. It never clears account storage, caches, draft state, permissions or Context.

The counters distinguish observation-time intent publications, prepared frame requests, paint attempts, valid lifecycle callbacks, successful Scene finishes, actual TWGL/direct GL draw-call submissions, and successful page-accepted Canvas copies. The accepted counter increments only after `surface.present(...)` and the matching `attempt.publish(...)` both return successfully. Drawn BSC/SAO submissions and accepted BSC/SAO object counts remain separate. Catalogue sizes use the optional cheap count when present and the original full-array compatibility fallback on the baseline; the probe does not force the candidate's lazy full array.

CPU samples cover presentation, exact BSC resolution, SAO selection/resolution, constellations, full Scene draw, the native paint owner, display copy and accepted publication. They measure elapsed synchronous owner work, including any blocking native call; they are not OS thread-CPU accounting or GPU execution timers. Several are nested: **do not add their totals**. Both sides have the same probe overhead. The result records its clock (`performance.now` or the native `Date.now` fallback), bounded sample overflow, valid callback delay, accepted-copy gaps and current intent-to-accepted delay. GL calls and accepted copies are native submission/composition observations; neither establishes physical display scanout FPS. Screen-recording encoded FPS is unrelated to these counters.

The probe retains only bounded aggregate numbers, relative observation-time differences, the logical viewport/FOV range, mode and public catalogue/publication/model identifiers. It does not export absolute observation instants, observer coordinates, Context/account identifiers, object lists, tokens, cookies, credentials, native exception details or device identifiers. There are no per-frame storage writes or network calls. Nine CPU sample arrays, three timing arrays and four distinct-time sets are capped at 2,048 entries each; further calls retain aggregate counts and set an overflow flag. On sample overflow, p50/p95 describe the first 2,048 retained samples; call counts, total, minimum and maximum still include all recorded calls.

The diagnostic popover also has explicit45°/10.8° **preparation** buttons. They stop measurement and send only the chosen FOV through the page's existing `setVerticalFovDeg` camera owner, then close the popover. Direction, observer, time, catalogues and renderer are unchanged. Wait for actual selected SAO tiles before starting a narrow sample. This prepares reproducible real renderer conditions without inventing a pinch; it does not establish physical two-finger or handheld gesture acceptance. Ordinary candidates contain neither these buttons nor the probe.

## Phone comparison still required

Use the existing guarded feedback/phone workflow to identify each actual bundle. Start with the same public formal spot and committed instant, then match the same camera, logical viewport, theme, layers and settled image/SAO readiness. Restore the same view and time path before each side; do not apply a different Context inside the measured sequence. Exercise the actual product controls. The first useful cases are ordinary 45° camera/time work and a real SAO narrow field; the narrow result must contain positive loaded SAO rows and submitted/accepted SAO objects. Compare CPU per matching workload and meaningful accepted/prepared counts, not only a rate averaged across idle time. Reject a purported pair when input/readiness differences could explain it. A 45-second sample is a bounded development observation, not a production percentile or full R17 acceptance.

The earlier 12-second `wide-camera` run `r17-1-ouio2em8d4` is retained as **INVALID_EMPTY_WINDOW**. Every workload counter was zero because guarded screenshot review consumed the window before the first camera input. That receipt establishes collector delivery only and supplies no product performance evidence. Its original payload is preserved unchanged. Both rebuilt variants now use the same 45,000 ms limit, which the collector validates strictly; restart the parent-owned bridge to load the updated protocol before exporting these runs.

Collector integration is owned by the parent bridge process. The exact route is `POST /__development_r17_phone_probe_metrics`; maximum UTF-8 body size is 32,768 B. Import `R17_PHONE_PROBE_ROUTE`, `R17_PHONE_PROBE_MAX_BYTES` and `validateR17PhoneProbeMetrics` from [the allowlisted protocol](scripts/r17-phone-probe-protocol.mjs). Reject malformed/extra fields; return `{ "stored": true }` only after the bounded payload was retained. A same-ID, same-byte retry can acknowledge the original receipt without duplication. No service was started or restarted by this probe task.

## Checks and cleanup

`node tools/run-node.cjs --test .codex/work-items/sky-map-performance-2026-10-18/scripts/r17-phone-probe.test.mjs` passes 4/4, covering explicit start/delay, real accepted-copy separation, CPU/count summaries, baseline array-count compatibility, the 45-second automatic stop, reset, strict collector duration rejection and the 2,048-entry cap with accurate aggregate/overflow facts. These checks test diagnostic mechanics, not the phone renderer.

The builder's `prepare`, `build` and `inspect` modes reproduce and verify the pair, refusing pre-existing outputs, changed inputs, baseline fingerprint mismatch or unapproved source differences. `build` requires `MINIAPP_API_BASE` to point at the authorized physical-LAN bridge on 8795. It does not discover credentials or change any official project entry.

After parent-owned phone evidence and receipts are retained and the final normal candidate is restored, close/retire only these diagnostic project entries. Remove the reproducible staging with:

```powershell
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-phone-probe.mjs cleanup
```

Cleanup validates the exact task tmp root and manifest, unlinks only its four dependency junctions, then removes that generated staging tree. It does not remove shared node_modules, the external original-stellar cache, normal dist, current phone wrapper, account state or these task scripts/evidence. Retain the ignored full manifest before cleanup if it is needed for a later source audit.
