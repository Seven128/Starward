import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { skySceneFrameFacts, skyPresentedViewFacts } from "./sky-scene-frame-facts";
import { skyPresentedTimeCurrent } from "./sky-observation-time";
import { resolveSkySceneFrame, type ResolvedStellarScene } from "./sky-stellar-scene";
import { INITIAL_MANUAL_SKY_VIEW } from "./sky-manual-view";
import { skyProjectionScale } from "./sky-view-projection";
import type { SkyPickSnapshot } from "./sky-object-picking";

const paintedAt = "2026-10-01T00:00:00.000Z";
const requestedAt = "2026-10-01T00:00:01.000Z";
const completedSnapshot = (): SkyPickSnapshot => ({ catalogVersion: "painted-edition", catalogHash: "a".repeat(64),
  frameAt: paintedAt, width: 390.3999938964844, height: 844, objects: [],
  view: { basis: INITIAL_MANUAL_SKY_VIEW, verticalFovDeg: 45.000007123456,
    center: { x: 195.1999969482422, y: 422 } } });

test("completed view facts preserve full precision and expose only the submitted camera", () => {
  const snapshot = completedSnapshot();
  const value = skyPresentedViewFacts(snapshot, paintedAt)!;
  assert.equal(value.verticalFovDeg, 45.000007123456, "a one-decimal label cannot prove camera equality");
  assert.equal(value.width, snapshot.width);
  assert.deepEqual(value.basis, snapshot.view!.basis);
  assert.deepEqual(value.center, snapshot.view!.center);
  assert.equal(value.scale, skyProjectionScale(844, snapshot.view!.verticalFovDeg));
  assert.deepEqual(Object.keys(value).sort(), ["frameAt", "width", "height", "basis", "verticalFovDeg", "center", "scale"].sort());
  const extra = { ...snapshot, view: { ...snapshot.view!, basis: { ...snapshot.view!.basis, privateContext: "omit" },
    center: { ...snapshot.view!.center!, privateContext: "omit" } } };
  assert(!JSON.stringify(skyPresentedViewFacts(extra, paintedAt)).includes("privateContext"));
  assert.deepEqual(skyPresentedViewFacts({ ...snapshot, view: { basis: snapshot.view!.basis,
    verticalFovDeg: snapshot.view!.verticalFovDeg } }, paintedAt)?.center,
    { x: snapshot.width / 2, y: snapshot.height / 2 });
});

test("missing, stale or invalid completed cameras remain unavailable", () => {
  const snapshot = completedSnapshot();
  const { view: omittedView, ...withoutView } = snapshot;
  for (const candidate of [null, { ...snapshot, width: 0 }, { ...snapshot, height: Number.NaN },
    withoutView, { ...snapshot, view: { ...snapshot.view!, verticalFovDeg: Number.NaN } },
    { ...snapshot, view: { ...snapshot.view!, center: { x: Number.NaN, y: 0 } } },
    { ...snapshot, view: { ...snapshot.view!, basis: { ...INITIAL_MANUAL_SKY_VIEW, forward: [0, 0, 0] as const } } }])
    assert.equal(skyPresentedViewFacts(candidate, paintedAt), null);
  assert.equal(skyPresentedViewFacts(snapshot, requestedAt), null);
  assert.equal(skyPresentedViewFacts(snapshot, undefined), null);
});
// Small resolved-model fixture; use the real geometry validator and projection.
// It does not stand in for publication admission, ephemeris or native pixels.
function scene(version: string, angle: number, at: string, empty = false): ResolvedStellarScene {
  const identity = { format: "bsc5p-stellar-geometry-v1", referenceAt: "2000-01-01T12:00:00.000Z",
    catalogVersion: version, catalogHash: "a".repeat(64) };
  const observer = { latitude: 0, longitude: 0, elevationM: 0 };
  const c = Math.cos(angle), s = Math.sin(angle);
  return { format: "stellar-scene-v2", state: "AVAILABLE", observer,
    catalog: { ...identity, magnitudeLimit: 5, entries: empty ? [] : [
      { sourceId: "HR:1", objectRef: "HR:1", displayName: "Alpha", magnitude: 1, colorIndex: null },
      { sourceId: "HR:2", objectRef: "HR:2", displayName: "Beta", magnitude: 2, colorIndex: null },
    ] },
    publication: { ...identity, rows: empty ? [] : [
      ["HR:1", "Alpha", 1, null, 0, 0, empty ? -1 : 1, 0, 0, 0],
      ["HR:2", "Beta", 2, null, 0, empty ? Math.SQRT1_2 : 1, empty ? -Math.SQRT1_2 : 0, 0, 0, 0],
    ] },
    frames: [{ at, state: "AVAILABLE", geometry: { ...identity, at, observer,
      julianYears: (Date.parse(at) - Date.parse(identity.referenceAt)) / (365.25 * 86400000),
      equatorialToEnu: [1, 0, 0, 0, c, -s, 0, s, c],
    } }],
  } as unknown as ResolvedStellarScene;
}

test("exact frame facts distinguish a usable empty catalog frame from missing geometry", () => {
  const early = scene("painted-edition", 0, paintedAt);
  assert.equal(skySceneFrameFacts(early, paintedAt).starCount, 2, "the complete positioned catalog includes a horizon star");
  const empty = scene("empty-edition", 0, paintedAt, true);
  const emptyFacts = skySceneFrameFacts(empty, paintedAt);
  assert.equal(emptyFacts.starState, "AVAILABLE");
  assert.equal(emptyFacts.starCount, 0);
  const absent = skySceneFrameFacts(early, requestedAt);
  assert.equal(absent.frameAt, requestedAt);
  assert.equal(absent.starState, "UNAVAILABLE");
  assert.equal(absent.starCount, null);
  assert.equal(skySceneFrameFacts(undefined, undefined).starCount, null);
});

const page = ts.createSourceFile("spot-sky-page.tsx",
  readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map<string, ts.Expression>();
const fields = new Map<string, ts.Expression>();
function find(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.initializer) declarations.set(node.name.getText(page), node.initializer);
  if (ts.isJsxAttribute(node) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression)
    fields.set(node.name.getText(page), node.initializer.expression);
  ts.forEachChild(node, find);
}
find(page);

// Evaluate the actual page's consumers rather than a duplicate projection.
// The original names remain only for the before-fix regression comparison.
function publicScene(playing: boolean, nextAt = requestedAt,
  options: { sameReport?: boolean; mounted?: boolean; stars?: "AVAILABLE" | "EMPTY" | "UNAVAILABLE";
    snapshot?: SkyPickSnapshot | null } = {}) {
  const context = { dataRevision: "same-source" };
  const paintedData = { context, skyScene: options.stars === "UNAVAILABLE" ? undefined
    : scene("painted-edition", 0, paintedAt, options.stars === "EMPTY") };
  const requestedData = options.sameReport ? paintedData
    : { context, skyScene: scene("requested-edition", Math.PI / 4, nextAt) };
  const names = ["presentedSceneCurrent", "paintedData", "paintedAt", "paintedSceneFacts", "activeSkySceneFrame",
    "skySceneStarCount", "presentedSceneReady", "skySceneAccessibleProvenance", "skyScenePresentationState", "skySceneAccessibleCount", "skyTargetAccessibleCount"];
  const body = names.filter(name => declarations.has(name)).map(name =>
    `const ${name} = ${declarations.get(name)!.getText(page)};`).join("\n");
  const output = ["data-sky-scene-frame-at", "data-sky-catalog-version", "data-sky-star-count", "data-sky-star-state", "data-sky-presented-view"]
    .filter(name => fields.has(name)).map(name => `${JSON.stringify(name)}:(${fields.get(name)!.getText(page)})`).join(",");
  const code = ts.transpileModule(`${body}\n({${output},provenance:skySceneAccessibleProvenance,countText:skySceneAccessibleCount,targetCountText:skyTargetAccessibleCount,current:presentedSceneCurrent,state:skyScenePresentationState})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(code, { reportData: requestedData, rawReportData: requestedData,
    orientationData: requestedData, presentedSkyFrame: { data: paintedData, frameAt: paintedAt, mode: "NIGHT" },
    row: { at: nextAt }, mode: "NIGHT", timePlaying: playing, timeIntent: { runStartAt: paintedAt },
    canvasError: null, nativeCanvasMounted: options.mounted ?? true, skySceneReady: true,
    orientationTargetFrame: {}, orientationTargets: [{}, {}],
    paintedSkyObjectsRef: { current: options.snapshot === undefined ? completedSnapshot() : options.snapshot },
    skyPresentedTimeCurrent, skySceneFrameFacts, skyPresentedViewFacts, resolveSkySceneFrame,
  }) as Record<string, unknown>;
}

test("playing scene publication keeps the completed instant, catalog and count while the next native frame is queued", () => {
  const value = publicScene(true);
  assert.equal(value.current, true, "this must exercise a real retained painted frame during play");
  assert.equal(value["data-sky-scene-frame-at"], paintedAt);
  assert.equal(value["data-sky-catalog-version"], "painted-edition");
  assert.equal(value["data-sky-star-count"], 2);
  assert.ok(String(value.provenance).includes(paintedAt));
  assert.equal(value.countText, "2 颗真实亮星目录对象");
});

test("the actual public view attribute uses the completed snapshot and clears invalidated frames", () => {
  const value = publicScene(true);
  assert.deepEqual(JSON.parse(value["data-sky-presented-view"] as string), skyPresentedViewFacts(completedSnapshot(), paintedAt));
  assert.equal(publicScene(false)["data-sky-presented-view"], "", "the paused pending intent cannot label retained pixels current");
  assert.equal(publicScene(true, requestedAt, { mounted: false })["data-sky-presented-view"], "",
    "an unmounted Canvas must not expose a retained completed camera as live");
  assert.equal(publicScene(true, requestedAt, { snapshot: null })["data-sky-presented-view"], "null");
  assert.equal(publicScene(true, requestedAt, { snapshot: { ...completedSnapshot(), frameAt: requestedAt } })["data-sky-presented-view"], "null",
    "even during playback this attribute must not borrow the pending intent's camera");
});

test("pausing or cancelling to a different instant cannot publish the retained playing frame as current", () => {
  const value = publicScene(false);
  assert.equal(value.current, false);
  assert.equal(value["data-sky-scene-frame-at"], "");
  assert.equal(value.provenance, "");
  assert.equal(value.countText, "天空图尚未完成绘制");
  assert.equal(value.targetCountText, "目标待绘制");
  assert.equal(publicScene(false, requestedAt, { mounted: false }).state, "UNAVAILABLE");
  assert.equal(publicScene(true, "2026-09-30T23:59:59.000Z").current, false,
    "a future painted frame cannot belong to a reversed/cancelled time intent");
});

test("fixed completed scenes retain independent target meaning and explicit bright-star availability", () => {
  const ready = publicScene(false, paintedAt, { sameReport: true });
  assert.equal(ready.state, "READY");
  assert.equal(ready.targetCountText, "2 个真实目标");
  const missing = publicScene(false, paintedAt, { sameReport: true, stars: "UNAVAILABLE" });
  assert.equal(missing.state, "READY", "an independent target scene does not require a bright-star catalog");
  assert.equal(missing["data-sky-star-state"], "UNAVAILABLE");
  assert.equal(missing["data-sky-star-count"], null);
  assert.equal(missing.countText, "亮星目录当前不可用");
  assert.equal(missing.targetCountText, "2 个真实目标");
  const empty = publicScene(false, paintedAt, { sameReport: true, stars: "EMPTY" });
  assert.equal(empty["data-sky-star-state"], "AVAILABLE");
  assert.equal(empty["data-sky-star-count"], 0);
  assert.equal(empty.countText, "0 颗真实亮星目录对象");
});
