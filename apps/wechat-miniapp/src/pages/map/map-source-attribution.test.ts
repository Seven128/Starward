import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { uniqueSourceRecords, type SourceSummary } from "@starward/miniapp-contracts";
import { isProductSource, sourceAttributions } from "../../utils/source-presentation";

type Element = { type: unknown; props: Record<string, any>; children: unknown[] };
const React = { createElement(type: unknown, props: Record<string, any> | null, ...children: unknown[]) {
  return typeof type === "function" ? type({ ...props, children }) : { type, props: props ?? {}, children };
} };
const page = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function allNodes(root: ts.Node, match: (node: ts.Node) => boolean) {
  const found: ts.Node[] = [];
  const visit = (node: ts.Node) => { if (match(node)) found.push(node); ts.forEachChild(node, visit); };
  visit(root);
  return found;
}
function run(code: string, scope: Record<string, unknown>) {
  return vm.runInNewContext(ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, { React, Text: "Text", View: "View", ...scope });
}
function sharedComponent(path: string, name: string, scope: Record<string, unknown>) {
  const source = ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const code = source.statements.filter(node => !ts.isImportDeclaration(node))
    .map(node => node.getText(source).replace(/^export /u, "")).join("\n");
  return run(`${code}; ${name};`, scope);
}
const SourceAttribution = sharedComponent("../../components/source-attribution.tsx", "SourceAttribution", {
  isProductSource, sourceAttributions, useState: () => ["", () => {}], SoftButton: "SoftButton",
});
const SourceEntry = sharedComponent("../../components/source-entry.tsx", "SourceEntry", {
  isProductSource, SourceButton: "SourceButton",
});
function text(value: any): string {
  if (value == null || typeof value === "boolean") return "";
  if (typeof value !== "object") return String(value);
  return Array.isArray(value) ? value.map(text).join("") : text(value.children);
}
function elementNamed(node: ts.Node, name: string) {
  return ts.isJsxSelfClosingElement(node) && node.tagName.getText(page) === name;
}
function render(node: ts.Node, scope: Record<string, unknown>): any {
  return run(`(${node.getText(page)});`, { SourceAttribution, SourceEntry, sourceAttributions, ...scope });
}
function record(id: string, name: string, statements: string[]): SourceSummary {
  return { id, kind: "OPEN_DATA", provider: name, title: `${name}资料`, sourceUrl: `https://example.com/${id}`,
    license: `${id} license`, licenseUrl: `https://example.com/${id}/license`, publishedAt: null, retrievedAt: null,
    validFrom: null, validTo: null, state: "FRESH", confidence: null, precision: "原始精度",
    limitations: [`${id} 原始限制`], attribution: { name, url: `https://example.com/${id}`, statements } };
}
const timezone = record("timezone", "Timezone Boundary Builder / OpenStreetMap contributors", [
  "包含Timezone Boundary Builder基于OpenStreetMap的数据，依据ODbL 1.0开放数据库许可使用；geo-tz进行了索引与编码。",
]);
const terrain = record("terrain", "Mapzen / Linux Foundation · USGS / NOAA", [
  "Terrain Tiles by Mapzen / Linux Foundation. SRTM data courtesy of the U.S. Geological Survey.",
  "Starward对Terrain Tiles进行GCJ-02重投影、双线性取样和合成坡度阴影；这些修改未经USGS或NOAA批准或背书。",
  "数据按原样提供；ETOPO1不能用于导航。",
]);
const cloud = record("cloud", "云量供应方", ["云量必须同屏的原始短声明。"]);
const light = record("light", "EOG", ["Earth Observation Group, Payne Institute for Public Policy, Colorado School of Mines."]);
function state() {
  const presentedTerrainData = { source: terrain, preview: true, datasetVersion: "terrain:installed", coverageLabel: "当前临时覆盖" };
  const scope: Record<string, any> = {
    activeContext: { timezoneSource: timezone }, bottomPresentation: "none", cloudLayerEnabled: true,
    presentedCloudRaster: {}, displayedCloudSources: [cloud], layerPolygons: [], lightEnabled: true,
    lightInstallation: { presentedData: { raster: {} } }, displayedLightLayer: { source: light },
    terrainEnabled: true, presentedTerrainData, terrainDisclosure: presentedTerrainData, uniqueSourceRecords,
  };
  for (const name of ["layerDataSources", "layerSources"]) {
    const declaration = allNodes(page, node => ts.isVariableDeclaration(node) && node.name.getText(page) === name)[0] as ts.VariableDeclaration;
    assert.ok(declaration.initializer);
    scope[name] = run(`(${declaration.initializer.getText(page)});`, scope);
  }
  return scope;
}
const corner = allNodes(page, node => ts.isJsxElement(node) && node.openingElement.attributes.properties.some(property =>
  ts.isJsxAttribute(property) && property.name.getText(page) === "className" &&
  property.initializer?.getText(page) === '"map-source-attributions"'))[0]!;
const sheet = allNodes(page, node => ts.isJsxElement(node) && node.openingElement.tagName.getText(page) === "MapLayerSheet")[0]!;
const sheetCredits = (allNodes(sheet, node => ts.isJsxExpression(node) &&
  node.getText(page).includes('className="source-attribution source-attribution--credit"'))[0] as ts.JsxExpression).expression!;

test("Map corner keeps declared names and data-side short credits without timezone's full license paragraph", () => {
  const result = text(render(corner, state()));
  for (const source of [timezone, terrain, cloud, light]) assert.ok(result.includes(source.attribution!.name));
  assert.ok(result.includes("临时地形"), "the installed preview remains visibly provisional");
  for (const source of [cloud, light]) for (const statement of source.attribution!.statements)
    assert.ok(result.includes(statement), "provider-required data-side notices remain verbatim");
  assert.ok(!result.includes(timezone.attribution!.statements[0]!), "the full timezone statement belongs in map source reading");
});

test("layer sheet preserves cloud/light notices while terrain's full statements stay in the source reader", () => {
  const scope = state();
  const result = text(render(sheetCredits, scope));
  for (const source of [terrain, cloud, light]) assert.ok(result.includes(source.attribution!.name));
  for (const source of [cloud, light]) for (const statement of source.attribution!.statements)
    assert.ok(result.includes(statement));
  for (const statement of terrain.attribution!.statements) assert.ok(!result.includes(statement), "full terrain notices do not expand the layer controls");
  scope.layerDataSources = [terrain];
  scope.terrainEnabled = false;
  assert.equal(text(render(sheetCredits, scope)), terrain.attribution!.name, "logical off retains the still-displayed native terrain's credit");
  scope.presentedTerrainData = null;
  scope.layerDataSources = [];
  assert.equal(render(sheetCredits, scope), null, "native retirement leaves no empty credit block");
});

test("the actual map source entry keeps complete original records and installed terrain's provisional facts", () => {
  const scope = state();
  const entry = allNodes(sheet, node => elementNamed(node, "SourceEntry"))[0]!;
  const result = render(entry, scope) as Element;
  assert.equal(result.type, "SourceButton");
  assert.equal(result.props.document.title, "地图来源与许可");
  assert.deepEqual(Array.from(result.props.document.sources), [timezone, light, cloud, terrain]);
  assert.deepEqual(Array.from(result.props.document.sections[0].paragraphs), [
    "当前临时显示的地形 · 数据版本：terrain:installed", "当前临时覆盖",
  ]);
  for (const source of [timezone, terrain, cloud, light]) {
    const reading = text(SourceAttribution({ sources: [source], presentation: "disclosure" }));
    for (const statement of source.attribution!.statements) assert.ok(reading.includes(statement));
  }
});
