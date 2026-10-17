import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as contracts from "@starward/miniapp-contracts";
import { createSkyObjectTracking } from "./sky-object-tracking";
import { matchingCelestialSearchResponse } from "../../services/celestial-search-response";
import { resolveSkyDeepSkyScene } from "./sky-stellar-scene";
import { createSkyStarAppearance } from "./sky-star-appearance";
import { createSkyDirectionProjector, createSkyViewBasis } from "./sky-view-projection";

const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function expression(name: string) {
  let result: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) result = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(result, `actual page owner ${name}`);
  return ts.transpileModule(`(${result.getText(source)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
const positionCode = expression("positionCatalog"), listCode = expression("catalogFrameObjects");
const row = { at: "2026-09-28T04:00:00.000Z", sunAzimuthDeg: 90, sunAltitudeDeg: 20,
  moonAzimuthDeg: 270, moonAltitudeDeg: 30, planets: null };
const context = { ...contracts, row, orientationObjectListOpen: true, reportData: undefined,
  rawReportData: undefined, currentViewBasis: null, stellarSupplement: {},
  createSkyStarAppearance, presentedFov:45, mode:"NIGHT", presentedCenter: { x: 195, y: 422 },
  canvasSize: { width: 390, height: 844 }, useMemo: (compute: () => unknown) => compute(),
  resolveSkySceneFrame: () => null, resolveSkyDeepSkyScene, exactSkyTimeFrame: () => null };

test("actual page binds and lists Sun/Moon independently of unavailable star/planet publications", () => {
  const positionCatalog = vm.runInNewContext(positionCode, context);
  const list = vm.runInNewContext(listCode, context) as { reference: string; kind: string }[];
  assert.deepEqual(Array.from(list, value => value.reference), ["SOLAR:MOON", "SOLAR:SUN"]);
  for (const object of list) {
    const catalog = positionCatalog(object.reference);
    assert.equal(catalog.catalogVersion, contracts.SKY_LUMINARY_CATALOG_VERSION);
    const tracking = createSkyObjectTracking();
    tracking.start({ ...object, displayName: object.reference, kind: object.kind as "MOON" | "STAR" }, "spot:test");
    const binding = { spotId: "spot:test", contextId: "test", contextRevision: 1, contextFingerprint: "test",
      dataRevision: "test", algorithmVersion: "test" } as contracts.SpotSkyContext;
    const data = { ...binding, reference: object.reference, at: row.at, unavailableReason: null,
      position: { ...catalog, azimuthDeg: 90, altitudeDeg: 20 } };
    assert.equal(tracking.accept(data, binding, row.at, catalog), true);
    assert.equal(tracking.accept({ ...data, at: "other" }, binding, row.at, catalog), false);
    assert.equal(tracking.accept({ ...data, reference: "HR:7001" }, binding, row.at, catalog), false);
    tracking.stop(); assert.equal(tracking.accept(data, binding, row.at, catalog), false);
  }
  const invalid = { ...context, row: { ...row, sunAzimuthDeg: null, moonAltitudeDeg: -10 } };
  const positions = vm.runInNewContext(positionCode, invalid);
  assert.equal(positions("SOLAR:SUN"), null);
  assert.equal(positions("SOLAR:MOON").catalogHash, contracts.SKY_LUMINARY_CATALOG_HASH);
  assert.deepEqual(Array.from(vm.runInNewContext(listCode, invalid)), [], "below-horizon Moon remains locatable but not in the above-horizon list");
});

test("the current horizon list reuses unchanged inputs and refreshes every data/view dependency", () => {
  let previous: { dependencies: unknown[]; value: unknown } | undefined, scans = 0;
  const bindings = { ...context,
    resolveSkySceneFrame: () => { scans++; return null; }, createSkyDirectionProjector,
    useMemo(compute: () => unknown, dependencies: unknown[]) {
      if (previous && dependencies.length === previous.dependencies.length &&
        dependencies.every((value, index) => Object.is(value, previous!.dependencies[index]))) return previous.value;
      const value = compute(); previous = { dependencies: [...dependencies], value }; return value;
    },
  };
  const scope = vm.createContext(bindings);
  const read = () => vm.runInContext(listCode, scope) as { reference: string }[];
  const first = read(); assert.equal(first.length, 2); assert.equal(scans, 1);
  Object.assign(scope, { catalogSearchQuery: "月球", catalogListLimit: 48, compassNow: 2000 });
  assert.strictEqual(read(), first, "unrelated search/scroll/telemetry updates must not rescan the catalogue");
  assert.equal(scans, 1);
  // These inputs belong to distinct data, display and visibility owners. The
  // Page's actual dependency list, rather than a copied list algorithm, is run.
  const changes = [
    { row: { ...row, moonAltitudeDeg: -10 } },
    { reportData: { skyScene: {} } },
    { stellarSupplement: { frame: { points: [] } } },
    { currentViewBasis: createSkyViewBasis(90, 120, 0) },
    { presentedFov: 60 },
    { canvasSize: { width: 500, height: 844 } },
    { canvasSize: { width: 500, height: 900 } },
    { presentedCenter: { x: 250, y: 422 } },
    { presentedCenter: { x: 250, y: 450 } },
    { mode: "OBSERVATION" },
  ];
  let current = first;
  for (const change of changes) {
    Object.assign(scope, change);
    const next = read(); assert.notStrictEqual(next, current, JSON.stringify(change)); current = next;
    assert.deepEqual(Array.from(next, object => object.reference), ["SOLAR:SUN"]);
  }
  assert.equal(scans, 1 + changes.length);
  Object.assign(scope, { orientationObjectListOpen: false });
  assert.equal(read().length, 0); assert.equal(scans, 1 + changes.length, "closed search skips catalogue work");
  Object.assign(scope, { orientationObjectListOpen: true });
  assert.deepEqual(Array.from(read(), object => object.reference), ["SOLAR:SUN"]);
  assert.equal(scans, 2 + changes.length);
});

test("actual Mini request opts into luminaries and never reuses the old discovery cache namespace", async () => {
  const api = ts.createSourceFile("sky-celestial-client.ts", readFileSync(new URL("../../services/sky-celestial-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const fn = api.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "searchCelestialObjects")!;
  assert.ok(fn);
  const code = ts.transpileModule(`${fn.getText(api).replace(/^export\s+/, "")}\nsearchCelestialObjects;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const response = { dataState: "FRESH", data: { query: "Moon", results: [{ reference: "SOLAR:MOON", kind: "MOON",
    displayName: "月球", aliases: ["Moon"], matchedAlias: "Moon" }], truncated: false, unavailableCatalogs: [] } };
  let request: [string, string, { query: string; signal: AbortSignal }] | undefined, invalidated = "";
  const search = vm.runInNewContext(code, { ...contracts, ADOPTED_SKY_REPORT_CATALOG_VERSION: "bsc5p-bright-stars.v3",
    requestOperation: (...args: typeof request & {}) => { request = args; return Promise.resolve(response); },
    matchingCelestialSearchResponse, invalidateApiCache: (key: string) => { invalidated = key; } });
  const abort = new AbortController();
  await search(" Moon ", abort.signal);
  assert.ok(request);
  assert.equal(request[0], "celestial-search:v5:extended:Moon");
  const query = new URLSearchParams(request[2].query);
  assert.equal(query.get("q"), "Moon");
  assert.equal(query.get("luminaryCatalogVersion"), contracts.SKY_LUMINARY_CATALOG_VERSION);
  assert.equal(query.get("deepSkyCatalogVersion"), contracts.CURRENT_DEEP_SKY_CATALOG_VERSION);
  assert.equal(request[2].signal, abort.signal);
  response.data.results[0]!.kind = "STAR";
  await assert.rejects(() => search("Moon"), /celestial_search_response_invalid/);
  assert.equal(invalidated, "celestial-search:v5:extended:Moon:");
});
