import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as geometry from "./terrain-geometry";
import { terrainLayerAvailability } from "./terrain-layer-availability";

function harness() {
  const ast = ts.createSourceFile("terrain.tsx", readFileSync(new URL("./spot-terrain-overview.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotTerrainOverview")!;
  const states: any[] = [], deps: any[][] = [], notices: any[] = [];
  let si = 0, ei = 0, pending: (() => void)[] = [], query: any, retries = 0, imageFailures = 0;
  const notify = (value: any) => notices.push(value);
  const component = vm.runInNewContext(ts.transpileModule(declaration.getText(ast).replace(/^export /, "") + ";SpotTerrainOverview;", { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, {
    ...geometry, terrainLayerAvailability, useMemo: (fn: () => unknown) => fn(), useAppStore: () => notify,
    useState(initial: any) { const i = si++; if (!(i in states)) states[i] = initial; return [states[i], (next: any) => states[i] = typeof next === "function" ? next(states[i]) : next]; },
    useEffect(fn: () => void, values: any[]) { const i = ei++; if (!deps[i] || values.some((value, n) => value !== deps[i]![n])) pending.push(fn); deps[i] = values; },
    useTerrainOverlay: () => query,
    View: "View", Text: "Text", Button: "Button", Slider: "Slider", Image: "Image", SemanticIcon: "SemanticIcon", StatusPanel: "StatusPanel", SoftButton: "SoftButton", Provenance: "Provenance", SourceAttribution: "SourceAttribution",
    React: { createElement: (type: string, props: any, ...children: any[]) => ({ type, props, children }) },
  });
  return { notices, get retries() { return retries; }, get imageFailures() { return imageFailures; },
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
