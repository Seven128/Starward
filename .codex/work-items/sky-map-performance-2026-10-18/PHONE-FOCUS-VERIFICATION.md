# Native selected-place focus — development feedback

2026-10-18, NIO Android14 / WeChat base library3.17.4, generation5 SHA `ee474aaedde8bec535c1fbbe89864c2f7a91a3344c6dcdbbf588dcf93e83a964`. This private candidate contains the labelled read-only focus probe and first client terrain-coverage reuse; it does not contain later cloud/shared-source repairs. The probe was compiled temporarily, then the exact original Map source was restored and its temporary source removed (OVERLAY-PROBE-INSTRUMENTATION.json). No production focus code was modified.

The new desktop project initially remained at DevTools welcome; explicit compilation/refresh established a complete Map frame and page readiness. One automatic remote invocation timed out, then actual phone observation and official currentPage/evaluate established the Android runtime. The phone's LAN-debug attempt fell back to WAN; its notification was acknowledged through a fresh guarded capture/input. No VPN, account, phone storage or global permission was changed. Runtime reads now worked for this generation, unlike the prior disconnected generation4.

## Observed result

An actual tap on the public example marker opened the existing medium panel and enlarged the visibly coarser map. The diagnostic used the actual native getScale/getRegion/toScreenLocation and actual Map/panel rectangles, with an unchanged region before/after projection. At settlement:

- Native/requested zoom:14/14.
- Remaining visible ground range:3,394m wide ×3,148m high; longer dimension3.394km.
- Geographic marker-anchor residual from actual remaining-map centre:0.0px horizontal,0.7px vertical (logical pixels).
- Computed versus actual medium-panel boundary:0.0px.

This establishes the approximately4km calibration and centring for this Android sample; integer zoom may produce a2–4km result, as already specified by the existing focus owner. It does not establish exact4,000m equality. The pre-selection numeric zoom was not captured, so no exact initial scale is asserted. The old desktop centring failure was not reproduced or diagnosed by this phone result.

A guarded600ms horizontal drag moved the native camera, left the marker near the map edge and closed the selected panel through the normal viewport-context path. The10s requested recording contains about5s of encoded updates; review shows movement, preserved overlapping terrain and panel exit, with no camera pullback. The later capture still retained the user's new camera. Loading appeared for the changed terrain view; the sequence does not measure completed cold coverage or prove the performance target. No physical FPS is inferred from encoded timestamps.

Private evidence is retained in the existing review directory under `overlay-baseline-1018`: `focus-3394m-centred.png`, `selected-pan.mp4`, `selected-pan-end.png` and the two reviewed contact sheets. Original recording id1792272034877. No phone coordinates, account data or debug endpoint are copied here.

## Remaining scope

Continuous physical pinch/reversal and finer-view reselection, fast reselection, private/submitted entrypoints with the preserved account/N05 input, desktop discrepancy and final ordinary-candidate review remain distinct obligations. Reuse the current valid focus tests and this actual sample; do not repeat it solely for reassurance. The present result is development_feedback, not settled-candidate acceptance or proof for iOS.
