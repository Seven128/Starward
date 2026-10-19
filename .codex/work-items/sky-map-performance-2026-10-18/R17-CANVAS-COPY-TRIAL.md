# R17 isolated Canvas copy trial

Status: **TARGET_TRIAL_FAILED; COPY_REPAIR_REJECTED**. The build evidence below records the admitted isolated artifact. Its later generation17 target result is [R17-CANVAS-COPY-RESULT.json](R17-CANVAS-COPY-RESULT.json): one Appbrand slot rose from 1,021,898 to 2,233,229 KiB PSS in about46 seconds, then the Mini Program left the foreground by the66.5-second sample. The first memory helper did not bind the foreground Activity to that process slot or identify its allocator. The planned120-second observation ended at this actual failure; no improvement or production adoption is established.

The complete project is `tmp/r17-canvas-copy-trial/project` with `miniprogramRoot=weapp/`. Its WEAPP SHA-256 is `1d63353782af185908cf6e5ddaf86f98ca7747528e29ad78f2ba8e0d3e82d056`: 338 files, 4,973,219 B total, 2,016,773 B main package and 80,379 B main headroom. The source is `tmp/r17-canvas-copy-trial/source`. [Machine evidence](R17-CANVAS-COPY-TRIAL.json) pins the complete source manifest, builder, original pair and resulting bundle.

The input is the admitted 45-second candidate `a95a2a7389e9023d49e3ca4932adb0322126892bf8d958dc988b5c909c36c8bf`; its original baseline `61b5ce1bc7f5ab1954a992c69fb2224468488ee750a3488a54832bb0dd54bef5` remains intact. The builder copied 1,563 declared source/config/resource inputs, reusing only the original dependency junction targets. The provenance manifest was written before copying. Original pair sources, both compiled bundles and their complete project copies, plus the 1,561 normal repository inputs, were read back unchanged before and after construction. No original staging, production source, paired BUILD record, measurement runtime/protocol, phone wrapper, feedback session, DevTools, service or database was changed.

There are exactly two source differences against the original candidate:

1. The isolated `sky-canvas-surface.ts` port adds `globalCompositeOperation: string`; the single full-frame `drawImage` is surrounded by `save()`, assignment to `copy`, and `finally { restore(); }`.
2. The diagnostic popover identifies this build as `R17 candidate/canvas-copy`. Its runtime and exported protocol variant remain `candidate`.

There is no preceding clear, backing resize, new Canvas/image allocation, reduced catalogue/image quality, FPS limit, playback change, periodic export or new render loop. Captions and reticles follow after the copy state has been restored. The existing one-second arm delay, 45,000 ms measurement stop and 2,048-entry bounds are unchanged. Automatic measurement stop does not stop product playback: the parent must keep it playing for the intended 120-second observation and bind any receipt to this trial hash and actual device generation.

The current main GPU frame starts from a full opaque clear and the parent reviewed its alpha-preserving composition. Standard `copy` replacement is therefore a reasonable single-variable experiment for this completed-frame boundary. The [official WeChat typings](https://github.com/wechat-miniprogram/api-typings/blob/master/types/wx/lib.wx.canvas.d.ts) include `copy` in `CanvasCompositing.globalCompositeOperation`; [Canvas 2D compositing semantics](https://www.w3.org/2015/06/2dcontext.html) define replacement. These establish API/mechanism support, not current WeChat native implementation correctness, pixel equivalence or retained-memory behavior.

The complete Taro WEAPP build passed once, with no generated output patch. `assertPhysicalDeviceBundleSafe`, package budgeting, `fingerprintBundle` and all 11 `inspectCandidate` checks passed. Source and compiled project readback passed. The existing isolated `sky-canvas-surface.test.ts` passed 11/11, including copy failure, context loss, selection fallback, captions and retirement. A bounded owner fixture also verified the `copy` assignment only during `drawImage`, restored `source-over` for captions/reticles, balanced restoration after native-copy failure and no per-present Canvas allocation/resize. These are JS/control-flow checks; no target-native pixel or memory assertion was substituted.

The reproducible entry is [the trial builder](scripts/build-r17-canvas-copy-trial.mjs):

```powershell
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-canvas-copy-trial.mjs prepare
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-canvas-copy-trial.mjs build
node tools/run-node.cjs .codex/work-items/sky-map-performance-2026-10-18/scripts/build-r17-canvas-copy-trial.mjs inspect
```

`prepare` refuses an existing trial root or evidence file; `build` refuses existing output/project and performs one complete build from the isolated source. It derives the authorized physical-LAN listener on 8791 in memory and compiles the existing bridge on 8795; it does not print or record the concrete address in text evidence/logs. `inspect` is readback and rewrites only this trial's machine evidence. Original pair cleanup and original stellar cache remain untouched.

For the parent-owned wrapper selection, reuse the existing whole-bundle `rename → copy → fingerprint` method with the following inputs; do not invoke the existing selector with an unsupported variant or treat this bundle as the original candidate:

```javascript
const proof = JSON.parse(await fs.readFile(path.join(work, 'R17-CANVAS-COPY-TRIAL.json'), 'utf8'));
const from = path.join(repositoryRoot, proof.result.projectDirectory, 'weapp');
await assertPhysicalDeviceBundleSafe(from);
const actual = await fingerprintBundle(from);
if (actual.sha256 !== proof.result.bundleSha256) throw Error('trial_bundle_drift');
// The parent alone now uses its existing wrapper owner: rename the current
// dist/weapp into an owned backup, copy this complete `from`, then require
// fingerprintBundle(current).sha256 === proof.result.bundleSha256 before refresh.
```

No wrapper selection or phone refresh was performed by the isolated builder. Root subsequently selected this whole bundle, completed official auto-preview and bound generation17 after observing the current Mini Program; its actual `candidate/canvas-copy` menu was seen. Product1x playback showed elapsed56 seconds before the next memory observation lost Mini Program foreground. The attempted pause was rejected by the existing guard without sending input; no45-second metrics receipt survived the exit. All retained screenshots and sanitized memory/exit observations are indexed by the target result. Original paired bundles and production source remain unchanged. The next diagnostic removes only subsequent fullframe native copies, retains complete GL work and explicitly synthetic state publication, and exports early; it is not a product or performance acceptance candidate.
