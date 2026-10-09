import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as geometry from "./terrain-geometry";
import { terrainLayerAvailability } from "./terrain-layer-availability";
import { formalSpotMarkerIconPath } from "./map-markers";

function harness() {
  const ast = ts.createSourceFile("terrain.tsx", readFileSync(new URL("./spot-terrain-overview.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotTerrainOverview")!;
  const states: any[] = [], deps: any[][] = [], notices: any[] = [], queries: any[] = [];
  let si = 0, ei = 0, pending: (() => void)[] = [], query: any, retries = 0, imageFailures = 0;
  const notify = (value: any) => notices.push(value);
  let mode = "DAY";
  const component = vm.runInNewContext(ts.transpileModule(declaration.getText(ast).replace(/^export /, "") + ";SpotTerrainOverview;", { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, {
    ...geometry, terrainLayerAvailability, formalSpotMarkerIconPath, useMemo: (fn: () => unknown) => fn(), useAppStore: (selector: (state: any) => unknown) => selector({ mode, notify }),
    useState(initial: any) { const i = si++; if (!(i in states)) states[i] = initial; return [states[i], (next: any) => states[i] = typeof next === "function" ? next(states[i]) : next]; },
    useEffect(fn: () => void, values: any[]) { const i = ei++; if (!deps[i] || values.some((value, n) => value !== deps[i]![n])) pending.push(fn); deps[i] = values; },
    useTerrainOverlay: (input: any, enabled: boolean, imageEnabled: boolean) => { queries.push({ input, enabled, imageEnabled }); return query; },
    View: "View", Text: "Text", Button: "Button", Slider: "Slider", Image: "Image", SemanticIcon: "SemanticIcon", StatusPanel: "StatusPanel", SoftButton: "SoftButton", Provenance: "Provenance", SourceAttribution: "SourceAttribution",
    React: { createElement: (type: string, props: any, ...children: any[]) => ({ type, props, children }) },
  });
  return { notices, queries, get retries() { return retries; }, get imageFailures() { return imageFailures; },
    setMode(value: string) { mode = value; },
    set(value: any) { query = { isPending: false, isError: false, imagePending: false, imagePath: null, ...value,
      reportImageFailure: () => { imageFailures++; }, refetch: async () => { retries++; } }; },
    render(visible = true) { si = ei = 0; const result = component({ spot: { spotId: "spot:terrain-test", name: "测试点", gcj02: { latitude: 22.55, longitude: 114.25 } }, visible }); pending.splice(0).forEach(fn => fn()); return result; },
  };
}
function nodes(value: any): any[] { return Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === "object" ? [value, ...nodes(value.children)] : []; }
const text = (value: any): string => value == null || typeof value === "boolean" ? "" : Array.isArray(value) ? value.map(text).join("") : typeof value === "object" ? text(value.children) : String(value);
const base = { state: "AVAILABLE", datasetVersion: "测试高程", imageBoundsGcj02: { west: 113, south: 21, east: 115, north: 24 }, sourceResolution: "30 m", derivedResolutionM: 100, coverageLabel: "已发布范围",
  source: { id: "terrain-source", provider: "Copernicus", limitations: ["produced using Copernicus WorldDEM-30"], licenseUrl: "https://example.org/license" },
  lightPollution: { state: "PARTIAL", cells: [{ id: "test-light", radiance: 0, unit: "nW/cm²/sr", label: "测试夜光", color: "#888", boundsGcj02: { west: 114.24, south: 22.54, east: 114.26, north: 22.56 } }], legend: [] } };

test("published terrain colour meaning has its own key and follows only the visible terrain", () => {
  const h = harness();
  const encoding = { format: "starward-terrain-elevation-color-v1", minimumM: -20, maximumM: 880,
    lowRgb: [215, 224, 207], highRgb: [112, 139, 104], alpha: 224, clipping: "CLAMP", shading: "SYNTHETIC_HILLSHADE" };
  const data = { ...base, state: "PARTIAL", elevationColorEncoding: encoding };
  h.set({ data: { data }, imagePath: "/local/terrain.png" });
  let all = nodes(h.render());
  const key = all.find(node => node.props?.className === "spot-terrain__elevation-key");
  assert.ok(key, "the source paragraph cannot replace the adopted terrain low-to-high key");
  assert.match(text(key), /地形.*低.*高/);
  const swatch = nodes(key).find(node => node.props?.style?.background);
  assert.match(swatch.props.style.background, /215,224,207/);
  assert.match(swatch.props.style.background, /112,139,104/);
  assert.equal(swatch.props.style.opacity, 224 / 255);
  all.find(node => node.type === "Button" && node.props.ariaLabel === "光污染，已开启").props.onClick();
  all = nodes(h.render());
  assert.ok(all.some(node => node.props?.className === "spot-terrain__elevation-key"));
  all.find(node => node.type === "Button" && node.props.ariaLabel === "地形，已开启").props.onClick();
  assert.equal(nodes(h.render()).some(node => node.props?.className === "spot-terrain__elevation-key"), false);
  const unavailable = harness();
  for (const query of [{ data: { data: base }, imagePath: "/local/terrain.png" },
    { data: { data }, imagePending: true }, { data: { data }, imageError: new Error("decode") },
    { data: { data: { ...data, state: "UNAVAILABLE" } }, imagePath: "/local/terrain.png" }]) {
    unavailable.set(query);
    assert.equal(nodes(unavailable.render()).some(node => node.props?.className === "spot-terrain__elevation-key"), false);
  }
});

test("terrain center follows display mode and preserves independent layer data on return", () => {
  const h = harness(); h.set({ data: { data: base }, imagePath: "/local/terrain.png" });
  for (const [mode, asset] of [
    ["DAY", "/assets/b-icons/spot-marker--day--selected.png"],
    ["OBSERVATION", "/assets/icons/formal-spot-marker-selected-observation.png"],
    ["NIGHT", "/assets/icons/formal-spot-marker-selected-night.png"],
    ["DAY", "/assets/b-icons/spot-marker--day--selected.png"],
  ]) {
    h.setMode(mode!);
    const all = nodes(h.render());
    assert.equal(all.find(node => node.props?.className === "spot-terrain__center").props.src, asset);
    assert.equal(all.find(node => node.props?.className === "spot-terrain__image").props.src, "/local/terrain.png");
    assert.equal(all.find(node => node.props?.className === "spot-terrain__light-cell").props.ariaLabel, "测试夜光，0 nW/cm²/sr");
    assert.deepEqual(Array.from(all.filter(node => node.props?.className?.startsWith("spot-terrain__direction ")), node => text(node)), ["北", "东", "南", "西"]);
  }
  assert.equal(h.retries, 0); assert.equal(h.notices.length, 0);
});

test("uncovered terrain disables only terrain and cannot obscure valid light", () => {
  const h = harness(); h.set({ data: { data: { ...base, state: "UNAVAILABLE", datasetVersion: null, sourceResolution: null, derivedResolutionM: null } } });
  const tree = h.render(), all = nodes(tree);
  assert.ok(all.some(node => node.props?.className === "spot-terrain__light-cell" && node.props.ariaLabel.includes("0 nW/cm²/sr")));
  assert.ok(all.some(node => node.type === "Button" && node.props.ariaLabel === "地形，当前地区暂无数据" && node.props.disabled));
  assert.equal(all.some(node => node.type === "StatusPanel"), false);
  assert.equal(h.notices.length, 0); assert.doesNotMatch(text(tree), /源分辨率 null|约 null/);
});

test("night-light image carries its own credit only while that layer is shown", () => {
  const source = { id: "night-light", attribution: { name: "Source: EOG, Colorado School of Mines.", url: "https://eogdata.mines.edu/products/vnl/", statements: [] } };
  const h = harness(); h.set({ data: { data: { ...base, lightPollution: { ...base.lightPollution, source } } } });
  let all = nodes(h.render());
  assert.equal(all.find(node => node.type === "SourceAttribution").props.sources[0], source);
  all.find(node => node.type === "Button" && node.props.ariaLabel === "光污染，已开启").props.onClick();
  all = nodes(h.render());
  assert.equal(all.some(node => node.type === "SourceAttribution"), false);
});

test("image failure preserves light, emits one notice and retains a working retry", async () => {
  const h = harness(); h.set({ data: { data: base }, imageError: new Error("image failed") });
  const tree = h.render(); assert.equal(h.notices.length, 1);
  assert.equal(nodes(tree).some(node => node.type === "StatusPanel"), false);
  await nodes(tree).find(node => node.type === "SoftButton" && node.props.label === "重新读取图层").props.onClick();
  assert.equal(h.retries, 1); h.render(); assert.equal(h.notices.length, 1);
  h.set({ data: { data: base }, imagePath: "/local/recovered.png" });
  const recovered = h.render(); assert.ok(nodes(recovered).some(node => node.type === "Image" && node.props.src === "/local/recovered.png"));
  assert.equal(nodes(recovered).some(node => node.type === "SoftButton"), false);
});

test("light failure preserves terrain, offers retry and never reports missing coverage", async () => {
  const h = harness(); h.set({ imagePath: "/local/terrain.png", data: { data: { ...base, lightPollution: { state: "UNAVAILABLE", cells: [], legend: [], coverageLabel: "当前地区暂无数据", failureCode: "LIGHT_READ_FAILED" } } } });
  const tree = h.render(false); assert.equal(h.notices.length, 0);
  assert.ok(nodes(tree).some(node => node.type === "Image" && node.props.src === "/local/terrain.png"));
  assert.equal(nodes(tree).some(node => node.type === "StatusPanel"), false);
  assert.match(text(tree), /光污染：暂时无法读取/);
  assert.doesNotMatch(text(tree), /光污染：当前地区暂无数据/);
  await nodes(tree).find(node => node.type === "SoftButton" && node.props.label === "重新读取图层").props.onClick();
  assert.equal(h.retries, 1);
  h.render(true); assert.equal(h.notices.length, 1);
});

test("both uncovered layers share one empty placeholder without test-only explanations or retry", () => {
  const h = harness(); h.set({ data: { dataState: "SAMPLE_DATA", data: { ...base, state: "UNAVAILABLE", datasetVersion: null, sourceResolution: null, derivedResolutionM: null,
    lightPollution: { state: "UNAVAILABLE", cells: [], legend: [], coverageLabel: "当前地区暂无数据" } } } });
  const tree = h.render(); assert.equal(nodes(tree).filter(node => node.type === "StatusPanel" && node.props.state === "EMPTY").length, 1);
  assert.equal(nodes(tree).some(node => node.type === "SoftButton"), false); assert.equal(h.notices.length, 0);
  assert.match(text(tree), /光污染：当前地区暂无数据/);
  assert.doesNotMatch(text(tree), /测试数据说明|示例说明|仅供测试|地形加载失败|源分辨率 null/);
});

test("a failed refresh of old uncovered layers shows error without asserting current missing coverage", async () => {
  const h = harness(); h.set({ refreshError: new Error("network timeout"), data: { data: { ...base, state: "UNAVAILABLE", datasetVersion: null, sourceResolution: null, derivedResolutionM: null,
    lightPollution: { state: "UNAVAILABLE", cells: [], legend: [], coverageLabel: "当前地区暂无数据" } } } });
  const tree = h.render(), all = nodes(tree);
  assert.equal(all.filter(node => node.type === "StatusPanel" && node.props.state === "ERROR").length, 1);
  assert.doesNotMatch(text(tree), /地形：当前地区暂无数据|光污染：当前地区暂无数据/);
  assert.ok(all.some(node => node.type === "Button" && node.props.ariaLabel === "地形，已开启" && !node.props.disabled));
  assert.ok(all.some(node => node.type === "Button" && node.props.ariaLabel === "光污染，已开启" && !node.props.disabled));
  await all.find(node => node.type === "StatusPanel").props.onRecover();
  assert.equal(h.retries, 1);
});

test("terrain recovery states use the reading flow without covering geographic references", () => {
  const h = harness();
  for (const [state, query, coverage] of [
    ["LOADING", { isPending: true }, "地形加载中"],
    ["EMPTY", { data: { data: { ...base, state: "UNAVAILABLE", lightPollution: { state: "UNAVAILABLE", cells: [], legend: [] } } } }, "地形不可用"],
    ["ERROR", { isError: true }, "地形读取失败"],
  ] as const) {
    h.set(query);
    const tree = h.render(), all = nodes(tree);
    const map = all.find(node => node.props?.className === "spot-terrain__map");
    assert.equal(nodes(map).some(node => node.type === "StatusPanel"), false,
      `${state}: the recovery content must not compete with the centered spot marker`);
    assert.equal(all.filter(node => node.type === "StatusPanel" && node.props.state === state).length, 1);
    assert.match(text(all.find(node => node.props?.className === "spot-terrain__coverage")), new RegExp(coverage));
    assert.ok(nodes(map).some(node => node.props?.className === "spot-terrain__center"));
    assert.equal(nodes(map).filter(node => node.props?.className?.startsWith("spot-terrain__direction ")).length, 4);
  }
});

test("closed terrain stays closed when a new radius has no active layer request", () => {
  const h = harness(); h.set({ data: { data: base }, imagePath: "/local/terrain.png" });
  let all = nodes(h.render());
  all.find(node => node.type === "Button" && node.props.ariaLabel === "地形，已开启").props.onClick();
  all = nodes(h.render());
  const lightOnlyCoverage = text(all.find(node => node.props?.className === "spot-terrain__coverage"));
  assert.equal(h.queries.at(-1).enabled, true, "light remains an independently requested layer");
  assert.equal(h.queries.at(-1).imageEnabled, false);
  all.find(node => node.type === "Button" && node.props.ariaLabel === "光污染，已开启").props.onClick();
  all = nodes(h.render());
  all.find(node => node.type === "Slider").props.onChange({ detail: { value: geometry.terrainSliderForRadius(10) } });
  h.set({ isPending: true });
  const tree = h.render(); all = nodes(tree);
  assert.equal(h.queries.at(-1).input.radiusKm, 10);
  assert.equal(h.queries.at(-1).enabled, false);
  assert.equal(h.queries.at(-1).imageEnabled, false);
  assert.match(text(all.find(node => node.props?.className === "spot-terrain__coverage")), /地形已关闭/);
  assert.match(lightOnlyCoverage, /地形已关闭/);
  assert.match(text(tree), /地形与光污染均已关闭/);
  assert.equal(all.some(node => node.type === "StatusPanel"), false);
  assert.doesNotMatch(text(tree), /加载中|正在加载/);
  assert.equal(h.notices.length, 0); assert.equal(h.retries, 0);
});

test("native image decode failure is returned to the terrain owner", () => {
  const h = harness(); h.set({ data: { data: base }, imagePath: "/local/terrain.png" });
  const image = nodes(h.render()).find(node => node.type === "Image" && node.props.src === "/local/terrain.png");
  assert.ok(image); image.props.onError(); assert.equal(h.imageFailures, 1);
});

test("terrain scale follows the selected geographic radius and the redistribution source is visible", () => {
  const h = harness(); h.set({ data: { data: base }, imagePath: "/local/terrain.png" });
  let tree = h.render(), all = nodes(tree);
  const scale = all.find(node => node.props?.className === "spot-terrain__scale");
  assert.equal(scale.children[0].props.style.width, "10%");
  all.find(node => node.type === "Slider").props.onChange({ detail: { value: geometry.terrainSliderForRadius(50) } });
  tree = h.render(); all = nodes(tree);
  assert.equal(all.find(node => node.props?.className === "spot-terrain__scale").children[0].props.style.width, "10%",
    "1 km at radius 5 and 10 km at radius 50 occupy the same fraction of the same geographic viewport");
  const provenance = all.find(node => node.type === "Provenance");
  assert.equal(provenance.props.source, base.source);
  assert.match(JSON.stringify(provenance.props.source.limitations), /produced using Copernicus WorldDEM-30/u);
});
