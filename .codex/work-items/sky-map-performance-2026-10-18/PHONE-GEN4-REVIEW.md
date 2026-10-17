# Generation 4 physical transition review

Candidate: `18ba5366d67df6b62db44fa5899ceff65b8e6cdea04e66bc0e8cc2afacaa7bc6` (generation 4). Independent, read-only review of the root-supplied physical-device recording; full timeline, selected original frames and original-frame timing were inspected. Private recordings and derived images remain outside the repository.

## Observed system Back return

- The two generation 3 visual defects are repaired in this recording: no bright disabled native Tab rectangles, and the app notification stays covered during blackout and fades in with the Map body, panel and Tab.
- No white page flash or native Map appearing before the coordinated reveal was observed.
- The incoming Map reveal lasts approximately 200 ms. The recorded wait between outgoing fade completion and incoming reveal is approximately 1.11 s. These are one development-debug sample, not exact touch latency or a production percentile.
- The selected spot's medium panel and map view return visibly. Exact camera identity, page unload/reconstruction and scroll restoration require their separate evidence; the video does not establish those facts.
- OS navigation/status surfaces, WeChat capsule and official debugging overlays are excluded from product blackout assertions.

## Observed DAY entry

- Independently reviewed the complete supplied DAY entry timeline, selected original frames and original-frame regional luminance. The Map, medium panel and native Tab fade to black together. No white native-page flash, bright disabled Tab rectangles or Map content leaking into the Sky reveal was observed.
- The first visible dimming response is at 3.074444 s; the whole product content is black by 3.276644 s, approximately 202 ms later. Sky background reveal is visible at 3.517722 s and reaches its stable tone around 3.656967 s. The wait between outgoing black and incoming reveal is about 241 ms in this sample.
- The first captured stars and constellation lines appear at 4.223489 s, about 1.15 s after the first visible response. The preceding original frame at 4.148589 s still has no stars. Header and menu are visible earlier; constellation artwork continues to arrive later. First stars therefore do not mean every resource has finished loading or that all controls have been functionally verified.
- Native Tab brightness decreases continuously with the outgoing Map, with no generation 3 disabled-style spike. OS navigation/status surfaces, WeChat capsule and official debugging overlays remain outside the product blackout assertion.

## Scope and remaining obligations

Both supplied generation 4 clips pass the observed two-direction visual regression checks. These are development-debug video samples, not exact touch latency, a cold/warm benchmark or production percentiles. The existing independently reviewed exit is reused without repeating it. Numeric page lifecycle, exact restored state, broader business acceptance and later candidate changes remain governed by their separate evidence; this review does not close the broader Goal.
