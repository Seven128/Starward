# Actual software-GPU landscape retry composition

This is bounded verification of the current model→photo retry/transition changes. It does not upgrade the previous 41/48-scene matrices to current whole-suite evidence. The input report and frozen BFF/publication bytes are reused; no request, download, publication, service deployment or device operation occurred.

## Bound current run

- Script: `scripts/experience-landscape-retry-composition-2026-10-02.mts`, SHA `e28f7e12852becf6239eed9f720641b4c063e76985098f30850f9162363c2189`. Execute using the repository `node_modules/.bin/tsx.cmd`; output uses a fresh unique suffix.
- Complete record: `output/playwright/cloud-sky-landscape-retry-1002/result.json`, SHA `caccb93750a132d7eadb2e6613ae964e183dc083139722f83d95a77e29b603a6`.
- Production bundle: `111d30db03dcede46e3d996f373732a72f67b6676671dca5907d4e239814b69a`, 85 compiled-source hashes. Every one matched live source at end of run and later readback.
- Input report: `tmp/current-native-report-2026-10-01.json`, SHA `c5f0dc230a53e6e296978604aa11bc7b3d7d4e38b1bd329e6b5097f3fb829b99`, actual scene time 2026-09-30T13:50:33Z. Mode `DAY` and group prefix `day` mean ordinary palette; they do not claim this saved Sun geometry is physical daytime. Sun/stars/observer come from the bound real report.
- Three frozen BFF JSON inputs plus 18 local raster files and two exact alpha publications are separately hashed. The photo is the existing `stara-lesna-meadows-derivative-v1` publication, not a new source: detail image SHA `fd6afeebba748eb84a15c0aea2a8ce0e363571685c6b181c8511f2bb5459bb32`. Credit resolves from that bound publication: Stara Lesna Meadows, Lubomir Hambalek, Starward derivative under the recorded CC BY-SA 4.0 scope.
- The record binds every full-scene PNG/RGBA and transparent-ground alpha RGBA. The log is `evidence/experience-landscape-retry-composition-2026-10-02.log`.

## Actual live-Canvas timelines

Each ordinary/red × center-altitude15°/0° group uses one live Canvas and renderer. The latter centers have camera ground opacity 1/.5. `previous` comes only from that same renderer's preceding actual completed snapshot; it is not a synthesized requested mask. The full scene has the actual star catalog, registered constellation artwork and actual report celestial geometry, while coordinate grids remain explicitly off.

The chronological path is resource-failed/program fallback → retry-pending/no bitmap → photo readiness0 → readiness.5 → readiness1 → pure-photo reference → photo-pass failure/program fallback → retry-pending → readiness.5 → readiness1. Every step saves all 329,160 pixels, completed mask, preceding actual mask, exact ground pass order/alpha/source/success, photo source identity, real lower-object alpha and actual pick result.

Across all four groups, these are complete-RGBA exact: fallback versus pending; fallback versus readiness0; readiness1 versus pure photo; fallback versus returned retry-pending; readiness1 versus returned readiness1. The actual transition is visibly nonempty: readiness0→.5 changes 71,591–184,769 pixels, maximum channel change18–91 depending mode/camera.

At camera opacity1, readiness.5 successfully paints program .5 then photo .5, publishing both actual masks. At camera opacity.5, readiness.5 paints .25 then .25. The effective source-over alpha is the composited result (for example .4375 where both source masks are opaque), rather than the requested sum. Photo source credit is null for fallback/pending/readiness0, resolves to the bound detail image at readiness.5/1, and becomes null again after photo failure/program restoration. Readiness1 retires the program layer and exactly matches a pure photo pass.

## Failure and alpha proof

Failures are explicit bounded controls returning false before the relevant GPU pass, not observed driver crashes, decode errors, OOM or native-runtime failures. All successful passes are real production GPU submissions. A dedicated transparent-background replay uses the exact successful ground passes, same camera and same published photo. It saves the full GPU alpha RGBA and compares 15 recorded pixel centers per scene with the production CPU completed-mask alpha. The largest ordinary observed difference is .002941176470588225 (0.75 of a byte), within 1.1/255 quantization tolerance. 4,180 real lower-object checks confirm completed-mask occlusion threshold agrees with actual picker eligibility; this is not a claim that test count establishes complete experience.

The photo-failure restore fix is exercised with camera opacity .5/readiness .5: program .25 succeeds, photo .25 is controlled-failed, then only missing program alpha 1/3 is painted. Published program opacity is .5. Compared with one full .5 program pass, the entire picture differs at 100,040 pixels but by at most one quantization byte. An explicit old-restore counterfactual paints .5 again: it over-composites to .625, changes 180,463 pixels/max32 versus the corrected frame, and produces maximum CPU/GPU alpha mismatch .12745098039215685. Thus the old failure remains observably wrong under this actual pixel check.

Other recorded boundaries:

- First partial program succeeds, photo and restoration both fail: the actual partial program mask .25 remains, with no photo credit.
- First program fails, photo succeeds: only the actual photo .25 mask/credit is published.
- Both contributions fail: mask null; no invented successful opacity/source.
- Known photo mask pending without any prior actual program: availability null, mask null, no ground submission.
- Known source alpha is genuinely zero throughout the high camera: opacity0 mask preserves its exact source publication, availability remains valid, no ground submission and no photo credit. All sampled CPU/GPU alpha is0. A zero camera-opacity view has the same no-contribution credit semantics.

All 49 scenes returned GL error 0. Per-group dispose and final release verified logical texture bytes 0/textures 0/framebuffers 0. The maximum observed logical texture allocation in this bounded composition is 11,800,576 bytes; this excludes CPU masks, decoder surfaces, buffers, GPU driver/OS/native memory, and is not a revised global budget or hardware capacity claim. Images were predecoded. Transparent alpha replay affects cache/timing, so these timings are diagnostic and are not native frame/FPS performance evidence.

## Actual image review and remaining acceptance

Viewed full original PNGs: ordinary15° program fallback, readiness.5 and readiness1; ordinary0° corrected and old-counterfactual failure restoration; true source-zero view; red0° fallback/readiness.5/readiness1; partial program retained after two failures; first-program failure/photo success; known-mask pending without previous. The retained program has its own illustrative meadow silhouette, and the photo progressively contributes its different published forest silhouette. The red path remains warm red. No additional circles/coordinate grids appear. These are real full-scene outputs, not empty image or screenshot-count acceptance.

Independent review reads the actual artifacts separately. This establishes current software-GPU source-over/retry/credit/pick behavior at the scene and mask owners. It does not verify the native hook's 240ms elapsed timer, reduced-motion scheduling, actual native lifecycle/gestures, decoder/driver failure, total native memory or physical-device final experience. Shared M51/W3 image quality and prior wide-view warm reupload pressure remain open under their existing owners; this bounded retry matrix does not certify those unchanged responsibilities.
