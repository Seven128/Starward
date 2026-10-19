# R17 Android comparison — four mechanisms recorded, playback failed

## Candidate identity

This is **instrumented `development_feedback`**, not settled-candidate acceptance. One authorized Android phone ran generation 15 baseline `61b5ce1bc7f5ab1954a992c69fb2224468488ee750a3488a54832bb0dd54bef5` and generation 16 candidate `a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf`. Both contain the current time/geometry/ruler UI. Only the five preserved stellar owners and probe variant labels differ, as bound by [build evidence](R17-PHONE-PROBE-BUILD.json).

The same public formal spot, committed starting instant, normal rendering mode, 384 × 796.800048828125 logical viewport, layers and intended gestures were reused. No Apply action occurred during a measurement. The 10.8° button prepares the real camera owner; it is not a physical pinch result. Phone byte identity and runtime AppID remain unverified; official delivery plus the visibly distinct probe label establishes the declared feedback binding.

## Invocation result

Both complete bundles used the existing same-account official automatic preview route. Every physical input used the existing wireless device selector and a reviewed capture less than 60 seconds old. Guarded ADB remained separate from DevTools and never supplied a network tunnel. The collector acknowledged eight strict-allowlisted payloads after durable storage. Each admitted sample stopped at its existing 45-second limit; CPU uses the phone's `Date.now` fallback.

After the first baseline playback exit, the unchanged generation 15 was reopened through official auto preview. The candidate was likewise reopened unchanged before narrow measurements to reproduce the same visible initial direction. These were not rebuilds or new source generations. Each side's narrow camera starting and ending star patterns match in the saved screenshots. The same 1,500 ms horizontal gesture was used; time cases used the same 1,500 ms forward ruler gesture and visible snapped endpoint.

## Observed product behavior

Four mechanisms produced actual prepared requests, GL submissions and page-accepted Canvas copies on both variants, with no recorded failed frame. All four time/camera paths visibly changed the sky, and closing the time disclosure restored the original committed night view. Counts are workload observations, not display FPS.

| Mechanism | Baseline prepared / accepted | Candidate prepared / accepted | Baseline draw p50 / p95, ms | Candidate draw p50 / p95, ms |
| --- | ---: | ---: | ---: | ---: |
| 45° camera | 271 / 84 | 263 / 79 | 6 / 10 | 7 / 11 |
| 45° ruler | 99 / 68 | 98 / 67 | 3 / 10 | 4 / 14 |
| 10.8° camera | 265 / 93 | 266 / 98 | 7 / 11 | 6 / 8 |
| 10.8° ruler | 84 / 62 | 91 / 68 | 2 / 14 | 2 / 13 |

Both narrow camera samples have **6,519 real loaded SAO rows and 19 selected tiles**, with positive submitted and accepted SAO objects. Every admitted sample keeps all 8,404 BSC rows. Wide camera transient SAO maxima differ (806 versus 761), and physical event scheduling produces different intermediate frames. Therefore these are matched intended paths, not identical per-frame workloads or a causal whole-frame speedup experiment.

The exact stellar-resolution owner shows a clear reduction in the ruler samples: its recorded aggregate work is 232 ms across 430 calls versus 3 ms across 411 calls at 45°, and 214 ms across 406 calls versus 9 ms across 446 calls at 10.8°. Its p95 changes from 5/4 ms to below the 1 ms timer resolution. Several calls reuse existing caches. **Nested stages must not be added, and a zero recorded duration does not mean zero work.** Full draw results are mixed: the narrow camera sample improves; the wide samples do not establish a rendering improvement. No overall FPS improvement is established.

**Playback fails on both variants.** Existing 1× Play visibly advanced the clock, then the Mini Program returned to WeChat Launcher before export. The next guarded input was refused and was not sent. Baseline wide playback was last observed at 21 seconds; baseline narrow at 46 seconds; candidate narrow at 59 seconds. These are last observations, not exact crash deadlines. The in-memory metrics could not be exported and supply no successful playback comparison.

Only `com.tencent.mm` Appbrand process exit-info was read, reduced in memory, and discarded. The three recent records align with those exits: baseline wide reason 2/status 11, baseline narrow reason 2/status 6, candidate reason 5/status 6 (`APP CRASH(NATIVE)`). Their approximate PSS/RSS are 1,843/2,355 MiB, 1,126/1,331 MiB and 942/1,229 MiB respectively, converted from Android's human-readable units. These figures suggest a resource investigation is warranted; they do not locate the cause. The exit reason is not low-memory, and the bounded records do not contain the allowlisted OOM, heap-corruption or graphics terms. That absence cannot exclude those causes. No whole-device logcat, user message, raw exception or tombstone was read.

The candidate's final active screenshot also contains partial missing date/time glyphs. Initial recorded frames and the final screenshots are retained for investigation. Their native composition/capture boundary is unresolved; this is not declared conformance. Four frames from each of the four short private clips were reviewed. The clips mostly show the initial or settled presentation; encoded frame timing was not used to infer input latency or FPS.

## Verified

- Eight original collector payloads validate against the strict protocol; [safe JSON evidence](R17-PHONE-COMPARISON.json) includes their unchanged metrics and SHA-256 bindings.
- Four intended mechanisms per variant contain real drawing and accepted publication. Time samples contain positive intent events and multiple accepted instants; narrow samples contain actual SAO work.
- Same visible camera paths, viewport, FOV, BSC catalogue and SAO publication are retained. No catalogue cap, mock clock, artificial camera trajectory or measurement-time Context application was introduced.
- Original screenshots and all four raw clips were copied outside the disposable feedback sessions before handback. No account storage, N05 draft, system permission, pairing, VPN or service was changed.

## Unverified

R17 cannot complete while the common playback exit remains failed. The exact native/resource cause, final ordinary candidate behavior, landscape target acceptance, continuous physical pinch, physical scanout FPS and iOS remain separate obligations. This instrumented run uses the existing formal-only development bridge and is not full current-backend, real-weather or private-proposal acceptance. One sample per side does not establish production latency percentiles.

## Invalidated

The older 12-second empty run `r17-1-ouio2em8d4` is retained unchanged as `INVALID_EMPTY_WINDOW` and excluded. The three interrupted playback attempts are failed, not empty passing samples. Generation 15's former nested device session and capture authority were invalidated by the candidate refresh. The current generation 16 binding remains declared, but after native exit the phone is at WeChat Launcher and no Mini Program input is authorized without a fresh guarded observation.

## Cleanup

Private raw evidence lives under the external owner `Starward-data/verification/sky-map-20261018/android-r17-comparison`, including baseline/candidate session media, contact sheets and allowlisted exit summaries. Session identity files were not copied. No diagnostic staging, project window, normal candidate, phone account or original API was removed. The feedback owner is unchanged; generation 16 still points to the diagnostic candidate and stale-generation cleanup remains pending. The parent receives operation ownership to investigate playback and later restore one final ordinary candidate.
