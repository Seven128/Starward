# Full-sphere composition: software-GPU development evidence

Generation status: the 41-scene and 48-scene outputs below are prior repaired generations. Subsequent model→photo retry/transition owner changes changed live source hashes; these older matrices are not a fresh whole-suite verification of the current source. Their reported source matches were true at their recorded run/readback time. Current affected recovery evidence is `experience-landscape-retry-composition-2026-10-02.md` and `output/playwright/cloud-sky-landscape-retry-1002/result.json`.

## Inputs and reproducibility

This task reuses the frozen BFF JSON from `output/playwright/cloud-sky-wide-resource-composition-1002`, the saved report `tmp/current-native-report-2026-10-01.json`, and existing published image/alpha bytes under `workers/miniapp-api/assets`. No request/download, service deployment, old output overwrite or phone operation occurred. Each JSON, publication byte, compiled source and RGBA is checked against its bound SHA. The report SHA is `c5f0dc230a53e6e296978604aa11bc7b3d7d4e38b1bd329e6b5097f3fb829b99`.

The standalone scripts are `scripts/experience-full-sphere-composition-2026-10-02.mts` and `scripts/experience-full-sphere-solar-continuity-2026-10-02.mts`. Run with the repository's `node_modules/.bin/tsx.cmd` in the authorized worktree. Each chooses a fresh output suffix. The historical `experience-full-sphere-build-harness-2026-10-02.mjs` only generated an initial skeleton; it is not the final reproducible harness.

- Original complete matrix: `output/playwright/cloud-sky-full-sphere-1002-2/result.json`, 41 scenes, 85 compiled-source hashes, 64 raster inputs plus two alpha files and 12 frozen JSON inputs. Bundle `b9bebba3ec958dec7be8bb536832c05f2b405a334a7e216876237ef162a8ffa5`, result `25c98a6c0a3e63d6f0c8764d74d81e28a04fac0f302ac68dfa990a64ddf20413`.
- Current solar/readiness affected matrix: `output/playwright/cloud-sky-full-sphere-solar-1002/result.json`, 48 scenes, 85 compiled-source hashes, 78 raster inputs plus two alpha files. Bundle `a2888594ccb078f860fbab7d436cf3d4e32439a585c188c68a318522bd294195`, corrected result `aa5395c2eb4f5544aa77bbf24305c9c890180267c128d85311f5b380e8d4608e`. All compiled-source hashes matched after the run and during final readback.
- `experience-full-sphere-artifact-bindings-2026-10-02.json` binds the actual current scripts and every result/bundle/PNG/RGBA in both outputs. `experience-full-sphere-solar-continuity-2026-10-02.log` records the successful current run.

The original first run preserved under `cloud-sky-full-sphere-1002-1` rendered 41 scenes but a late star assertion chose HR:472 below the actual picker opacity threshold. This was a harness eligibility error. The corrected star is selected using the production star-appearance rule: HR:6134, real azimuth 243.2015782860865°, altitude −4.624759956217329°, magnitude 0.96. The corrected 41-scene output reused 36 captures only after exact bundle SHA, full condition and RGBA checks; five star cases were rerendered. The later solar run independently rerendered every one of its 48 scenes. The composition script subsequently gained a facing-HiPS nonzero pixel assertion, also verified by the solar script; the bindings identify that current script version honestly.

## Actual whole-scene results

All captures are 390×844 full PNG and full RGBA dumps (329,160 pixels), obtained from actual Chromium/ANGLE SwiftShader WebGL production renderer and scene owners. They contain real stars, published constellation artwork, images or physical discs; blank-image success is excluded with explicit layer-suppression comparisons. Every scene returned GL error 0, no image/draw failure, and zero logical texture bytes/textures/framebuffers after dispose.

The original full path is altitude 30→0→−5→−15→−45→0→30, ordinary and red mode. At both repeated 30° and 0° conditions the entire RGBA is exact. The current ordinary path remains exact after the solar/readiness repairs. Time and observer coordinates remain the saved report's inputs; below-horizon positions are chart directions, not current on-site visibility claims. Offset/rolled 85°, wide 139°, dome 274.9°, optical .08° and resolved-body .05°/2.4° conditions are separately recorded.

Current real underground source effects versus the same current renderer with that layer suppressed:

| Target/layer | Real report time UTC / altitude | Changed pixels / maximum channel delta |
| --- | --- | --- |
| Moon | 2026-09-30 04:00 / −27.80456794354671° | 27,576 / 174 |
| Sun | 2026-09-30 11:30 / −19.169863422305394° | 27,440 / 247 |
| Saturn and ring | 2026-09-30 04:00 / −64.11502204256101° | 8,159 / 227 |
| Registered M51 DETAIL + OVERVIEW | 2026-09-30 15:30 / −16.522794068° | 329,160 / 247 |
| HR:6134 star points | 2026-09-30 13:50:33 / −4.624759956217329° | 351 / 39 |
| Wide W3 mesh | 2026-09-30 13:50:33 | 329,142 / 110 |
| Lower constellation artwork | 2026-09-30 13:50:33 | 245,266 / 37 |

Moon, Sun, Saturn and M51 each appear in the current painted snapshot and actual identity picker. Saturn's ring submits successfully. HR:6134 is picked through transparent/partial source ground, and absent from the pick under the forced opaque ground. Forced opaque/partial/zero are marked counterfactual controls, not new product states.

The antipode regression camera `createSkyViewBasis(22,45,0)` is rotated through the actual report EQ→ENU frame. All 12 real W3 faces versus the entire valid front set {5,8,9} produces exact full RGBA; front meshes contain 33/492/12 submitted vertices. Opposite face 2 submits no geometry. All faces versus opposite-only changes 329,151 pixels/max50, so the valid front imagery also demonstrably contributes real pixels. The FOV45 probe intentionally forces the W3 layer to exercise mesh geometry; it does not change the ordinary FOV≥60 activation contract.

## Solar seam and resource-readiness repair verification

Human review of the original ordinary altitude 0/−5/−15 and rolled screenshots found a hard background edge at the mathematical horizon, even when source ground opacity was effectively zero. This was the old solar fragment's `ray.z <= 0` base return, not a coordinate-grid line. Root repaired the solar display transition and the affected current GPU matrix verifies it.

Saved actual day (04:00 UTC, Sun +64.56450849146711°), twilight (10:30, −5.314801330216839°) and night (11:30, −19.169863422305394°) each use sunward and opposite horizontal cameras. The actual solar pass is separately dumped before later scene layers. At x=60/195/329 and y=420/421/422/423, the samples record original RGBA and actual ray altitude. The adjacent above/below centers straddle zero, with maximum channel delta 1 for day/sunward and 0 for the other five conditions. The entire 164,580-pixel upper half is exact against the old renderer. The lower transition changes 93,090–106,296 real pixels (max9 night; max242–247 day/twilight). Red mode submits zero solar calls; ordinary probes submit three successful passes. PNG review confirms removal of the original straight/diagonal hard edge.

With one real source panorama and identical 15° camera, manually supplied readiness 0/.5/1 produces actual panorama mask opacity 0/.5/1 and 55,195 then 55,454 changed pixels/max78; return to readiness0 is full-RGBA exact. Known mask with bitmap withheld and pending=true produces availability null, actual pick mask null, zero landscape calls and zero procedural landscape calls; its sky remains intact rather than receiving a different terrain. These inputs verify actual scene/GPU consumption and alpha agreement, not the native hook's 240ms elapsed timer or reduced-motion behavior.

Independent review found the pending/no-bitmap row's `effectiveGroundOpacity=1` was merely its camera-demand default and incorrectly described a pass that never existed. The metadata now reads actual snapshot mask opacity, or null when no mask exists. Only that one field in the recorded result/rows was corrected to null; original JSON bytes are preserved as `*-before-metadata-repair.json`, and `metadata-repair.json` binds the before/after hashes. PNG/RGBA, actual draw traces, sources, input identities and timings are unchanged. A bounded readback demonstrates the old default fails the null expectation and verifies all other recorded fields and every image hash stayed unchanged. This correction required no rerender.

## Resource model and remaining scope

Images are predecoded in the harness. `sourceRgbaBytes` models only the production wanted image set at width×height×4; the harness holds additional decoded images. GPU numbers count actual observed texImage2D/copyTexImage2D allocations and texture deletion, including transient allocations. They exclude CPU masks, buffers, image decoder surfaces, driver/OS/native memory, service/network cost and device memory. Three render passes per case are samples, not a FPS or percentile benchmark. Solar diagnostic captures add readback overhead and are not performance samples.

Representative current warm third-pass CPU / gl.finish completion:

| Ordinary condition | Wanted source bytes | Maximum logical texture bytes across all passes | Warm retained / warm reupload | Warm CPU / completion ms |
| --- | --- | --- | --- | --- |
| Alt30 | 15,990,784 | 10,485,760 | 5,836,800 / 0 | 7.6 / 7.6 |
| Alt0 | 14,745,600 | 9,248,768 | 4,612,096 / 0 | 6.7 / 6.7 |
| Offset/rolled85 | 18,415,616 | 14,876,672 | 14,876,672 / 0 | 5.6 / 5.6 |
| Wide139 W3 | 24,379,392 | 24,379,392 | 15,990,784 / 8,388,608 | 26.1 / 26.1 |
| Dome274.9 | 14,680,064 | 14,680,064 | 14,680,064 / 0 | 12.2 / 12.2 |

Wide139 still reuploads 8MiB each warm pass, with a 23.25MiB transient logical peak despite a 15.25MiB retained set. This performance pressure remains open; a 16MiB first-pass peak is not the complete observed peak. Manual readiness0 is visually zero and causes no ground GPU upload, while decoded/coarse fallback may still be retained for future readiness.

Human-reviewed original captures: ordinary alt30/0/−5/−15/−45, red alt0/−15/−45, offset/rolled, wide-W3, dome ordinary/red, actual Moon/Sun/Saturn/M51, lower constellation, lower-star auto/opaque/zero, HiPS all/opposite. Reviewed current captures: alt0/−15, offset/rolled, day/twilight/night solar-only, readiness0/.5/1, known-mask pending, wide-W3, M51. The current M51 source still looks soft/color-heavy and W3 has visible low-resolution block/stitch structure; shared imagery quality remains open. Successful source projection is not final image quality acceptance.

This verifies actual current software-GPU composition, source identity, measured layer effects, continuity and logical release. It does not establish WEAPP/native final composition, physical gestures, real device timing/memory, full interaction journey, new lunar phone acceptance, server200DAU capacity or complete Stellarium parity. Existing native/watch sessions and final target acceptance remain owned by the main task.
