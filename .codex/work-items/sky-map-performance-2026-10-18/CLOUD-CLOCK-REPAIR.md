# Forecast clock alignment — 2026-10-18

This is a current frontend repair within R13/H4, not complete cloud/provider or whole-product acceptance.

## Observed cause and regression

Generation6's ordinary phone frontend displayed no cloud forecast after moving from the old date to October19 at03:30. The current API recorded nine successful geographic samples at the actual phone requests. An isolated public-fixture request for that same observing night returned nine polygons and26 usable frames; it did not read or replace the phone account/context. The backend weather remains SAMPLE_DATA, not real-provider evidence.

The official structured runtime channel then reported `Remote debug connection lost`; the still-visible green HUD was not used to override that result. The identity-bound ADB lane continued to capture and operate the Mini Program. A read-only clock request through the same device/session owner bounded the phone clock at999.97–1090.97ms behind the host, with91ms transport round trip. No clock, global setting, permission or account was changed. Screenshot and host time also agreed at the minute level; that was insufficient to exclude this subsecond-scale mismatch.

The new cloud validity rule rejected `retrievedAt > Date.now()` and memoized the resulting empty frame until a later validity boundary. Thus a legitimate source returned by a slightly faster BFF could disappear immediately. Two focused mounted-owner regressions reproduced the effect before the repair: both expected a real zero-valued cell but received an empty array. Existing12 cases still passed, identifying this as an additional clock-boundary defect rather than evidence that all cloud behavior was correct.

## Repair and limits

`use-resource-query` exposes the receipt time corresponding to its rendered data. `use-forecast-query` anchors the BFF envelope's generatedAt to that receipt when the device clock is slower, then uses the same advancing offset for projection, expiry timers and revalidation. It never moves a later device clock backwards. Original source/hour timestamps, source-age deadlines, selected astronomy time and query retry/cancellation remain unchanged. An absent/invalid anchor retains the existing clock path.

Map's retained public cloud view carries that exact offset while a new viewport query is pending, so the second presentation pass cannot erase the repaired result or extend its offline lifetime. The new regressions cover initial visibility, retained viewport coverage, real zero, offline expiry and no immediate revalidation loop. The existing resource test also verifies that a newer imperative query read cannot replace the timestamp paired with the still-rendered older data.

The focused forecast/resource/AQ/coverage batch passed35/35. The first type check found one test-only union access; it was narrowed to MapSceneData and the subsequent Mini Program type check passed. The final receipt-pairing assertion and narrowed test passed the affected9-case rerun. Context validation and diff whitespace checks passed. No whole-suite result from before this repair is claimed for these changes. Current shared independent review remains outstanding.

## Ordinary generation7 and physical countercheck

The coherent ordinary build produced SHA e8ac4c0f96e9aabee85d05371ca717dc6ddcad80ad3d0d8a908580f7455f726f,338files,total4,948,902B,main2,012,305B,headroom84,847B. This adds492B to main relative to generation6. All11 static bundle checks and110 source pins passed. The backend remains the existing preserved MEMORY_TEST service; no server restart or state migration occurred.

Official close_project_window acknowledged generation6's exact window and a subsequent scoped process read found no old-generation process. Feedback refresh through the authorized same-account auto-preview completed, invalidated the old session and removed generation6. A separate guarded pre-bind phone capture showed the newly opened ordinary preview, with cloud polygons visible and the remote-debug HUD gone. Generation7 was then bound to the new device session; this is development_feedback and still not cryptographic phone-byte attestation. No QR or user action was needed.

Actual phone observations:

- The same public map area and October19,03:30 observation now have visible geographic cells and a usable time ruler. The prior generation's no-forecast/empty-ruler state is gone.
- A real tap on04:30 committed that selected time; the settled frame retains cloud cells. The short recording does not contain the complete time-change sequence, so only the before/after frames establish this result, not continuous-motion performance.
- A real horizontal map swipe retained geographically anchored cells through the reviewed2fps sequence. The settled result has two columns of three cells, matching the API's six actual deduplicated samples for this viewport; unqueried spaces remain unfilled. No full-layer clearing was visible in the sampled frames. This is bounded continuity evidence, not an FPS or sub-frame smoothness claim.

Private images and reviewed media are in the existing review directory's generation7/: cloud-visible-after-update.png, cloud-time-0330.png, cloud-time-0430.png, cloud-time-1792289970467.mp4 and cloud-pan-1792290049164.mp4, plus their contact sheets. Current camera/time changes belong to this ordinary Map journey; no draft editor, account/storage reset, permission change, share recipient or reminder was used. Real QWeather source/age behavior, r6 nightlight, current-server terrain speed and whole-product/iOS acceptance remain open.

Task-local probe scripts live in the existing ignored tmp directory. The read-only API probe's first official call failed after the remote connection was lost; it was not retried. A subsequent API-only run initially encountered an imported helper's CLI entry side effect, which returned an unknown-tool error before any product action; the helper import was corrected. Only the successful public API aggregate and bound OS-clock read above are evidence.
