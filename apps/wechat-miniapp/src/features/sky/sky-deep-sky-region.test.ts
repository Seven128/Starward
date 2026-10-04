import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { assertStellarRotation, OBSERVATION_FRAME_FORMAT, type DeepSkySceneCatalogEntry, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { registerSkyDeepSkyRegion, skyDeepSkyRegionContainsDirection, skyDeepSkyRegionCoordinates } from "./sky-deep-sky-region";
import { skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import { registerSkyArtworkPlane, skyArtworkUvAtDirection } from "./sky-artwork-registration";
import { submitSkySceneScienceOptical } from "./sky-sdss-science-scene";
import type { SkyVector } from "./sky-view-projection";

const identity: SkyObservationFrame = { format: OBSERVATION_FRAME_FORMAT, at: "2026-10-02T00:00:00.000Z",
  observer: { latitude: 0, longitude: 0, elevationM: 0 }, equatorialToEnu: [1,0,0,0,1,0,0,0,1] };
const entry: DeepSkySceneCatalogEntry = { objectRef: "M:51", displayName: "M51", kind: "GALAXY", aliases: [], magnitude: 8.4,
  magnitudeBand: "V", majorAxisArcmin: 60, minorAxisArcmin: 30, positionAngleDeg: 0, icrsCenter: { raDeg: 0, decDeg: 0 } };
const ray = (ra: number, dec: number): SkyVector => { const r = ra * Math.PI / 180, d = dec * Math.PI / 180;
  return [Math.cos(d) * Math.cos(r), Math.cos(d) * Math.sin(r), Math.sin(d)]; };
test("full axes and north-east PA define catalog rays independently of image UV or screen roll", () => {
  const region = registerSkyDeepSkyRegion(entry, identity); assert(region); assert(Object.isFrozen(region));
  const center = skyDeepSkyRegionCoordinates(region, ray(0,0))!; assert(Math.hypot(...center) < 1e-10);
  const north = skyDeepSkyRegionCoordinates(region, ray(0,.5))!, east = skyDeepSkyRegionCoordinates(region, ray(.25,0))!;
  assert(Math.abs(north[0] - 1) < 1e-10); assert(Math.abs(north[1]) < 1e-10);
  assert(Math.abs(east[0]) < 1e-10); assert(Math.abs(east[1] - 1) < 1e-10);
  assert.equal(skyDeepSkyRegionContainsDirection(region, ray(0,.4)), true);
  assert.equal(skyDeepSkyRegionContainsDirection(region, ray(0,.6)), false);
  const rotated = registerSkyDeepSkyRegion({ ...entry, positionAngleDeg: 90 }, identity)!;
  assert.equal(skyDeepSkyRegionContainsDirection(rotated, ray(.4,0)), true);
  assert.equal(skyDeepSkyRegionContainsDirection(rotated, ray(0,.4)), false);
  const periodic = registerSkyDeepSkyRegion({ ...entry, positionAngleDeg: 180 }, identity)!;
  for (const direction of [ray(.1,.1), ray(.4,0), ray(0,.6)])
    assert.equal(skyDeepSkyRegionContainsDirection(periodic, direction), skyDeepSkyRegionContainsDirection(region, direction));
  const diagonal = registerSkyDeepSkyRegion({ ...entry, positionAngleDeg: 30 }, identity)!;
  assert.equal(skyDeepSkyRegionContainsDirection(diagonal, ray(.2,.35)), true);
  assert.equal(skyDeepSkyRegionContainsDirection(diagonal, ray(-.2,.35)), false,
    "an oblique asymmetric witness must detect east-west reflection, which PA0/90 cannot");
});

test("bounded actual-owner mutations expose diameter and PA errors without a brightness oracle", () => {
  const text = readFileSync(new URL("./sky-deep-sky-region.ts", import.meta.url), "utf8");
  const load = (source: string) => { const exports: any = {};
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, require(name: string) {
        if (name === "@starward/miniapp-contracts") return { assertStellarRotation };
        if (name === "./sky-artwork-registration") return { registerSkyArtworkPlane, skyArtworkUvAtDirection };
        if (name === "./sky-observation-frame") return { skyEquatorialDirectionToEnu };
        throw Error(`unexpected actual owner import ${name}`);
      } }); return exports; };
  const current = load(text);
  const fullAxis = text.replaceAll("* rad / 120", "* rad / 60"); assert.notEqual(fullAxis, text);
  const wrongDiameter = load(fullAxis).registerSkyDeepSkyRegion(entry, identity);
  assert.equal(current.skyDeepSkyRegionContainsDirection(current.registerSkyDeepSkyRegion(entry, identity), ray(0,.6)), false);
  assert.equal(current.skyDeepSkyRegionContainsDirection(wrongDiameter, ray(0,.6)), true);
  const mirrored = text.replace("Math.cos(pa) * value + Math.sin(pa) * e[i]!", "Math.cos(pa) * value - Math.sin(pa) * e[i]!");
  assert.notEqual(mirrored, text);
  const oblique = { ...entry, positionAngleDeg: 30 };
  const wrongAngle = load(mirrored).registerSkyDeepSkyRegion(oblique, identity);
  assert.equal(current.skyDeepSkyRegionContainsDirection(current.registerSkyDeepSkyRegion(oblique, identity), ray(.2,.35)), true);
  assert.equal(current.skyDeepSkyRegionContainsDirection(wrongAngle, ray(.2,.35)), false);
});
test("missing or invalid source dimensions center PA and rotation remain unknown", () => {
  const { icrsCenter: _center, ...missingCenter } = entry;
  assert.equal(registerSkyDeepSkyRegion(missingCenter, identity), null);
  for (const patch of [{ icrsCenter: null }, { minorAxisArcmin: null }, { positionAngleDeg: null },
    { majorAxisArcmin: NaN }, { minorAxisArcmin: 0 }, { minorAxisArcmin: 61 }, { positionAngleDeg: Infinity },
    { icrsCenter: { raDeg: 360, decDeg: 0 } }, { icrsCenter: { raDeg: 0, decDeg: 91 } }])
    assert.equal(registerSkyDeepSkyRegion({ ...entry, ...patch }, identity), null);
  assert.equal(registerSkyDeepSkyRegion(entry, null), null);
  for (const matrix of [[-1,0,0,0,1,0,0,0,1],[1,0,0,0,2,0,0,0,1],[1,0,0,0,1,0,0,0,NaN]])
    assert.equal(registerSkyDeepSkyRegion(entry, { ...identity, equatorialToEnu: matrix as any }), null);
  assert.equal(skyDeepSkyRegionContainsDirection(null, ray(0,0)), null);
  const region = registerSkyDeepSkyRegion(entry, identity)!;
  assert.equal(skyDeepSkyRegionContainsDirection(region, [0,0,0]), null);
  assert.equal(skyDeepSkyRegionContainsDirection(region, ray(180,0)), null);
});
test("raw actual report rotation preserves region inverse without separately normalizing plane anchors", () => {
  const matrix = [1,4e-7,0,0,1,0,0,0,1] as const;
  const transformed = registerSkyDeepSkyRegion(entry, { ...identity, equatorialToEnu: matrix })!;
  const original = registerSkyDeepSkyRegion(entry, identity)!;
  for (const direction of [ray(.12,.18), ray(.24,.4), ray(-.3,.1)]) {
    const a = skyDeepSkyRegionCoordinates(original, direction)!, b = skyDeepSkyRegionCoordinates(transformed,
      skyEquatorialDirectionToEnu(matrix, direction))!;
    assert(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9);
  }
});
test("existing source catalog supplies 39 oriented shapes and keeps the 12 missing PA objects unknown", () => {
  const pack = JSON.parse(readFileSync(new URL("../../../../../packages/astronomy-core/data/opengc-messier-deep-sky.v1.json", import.meta.url), "utf8"));
  const ready = pack.rows.filter((row: any) => registerSkyDeepSkyRegion({ ...entry, ...row,
    icrsCenter: { raDeg: row.raDeg, decDeg: row.decDeg } }, identity));
  assert.equal(pack.rows.length, 51); assert.equal(ready.length, 39);
  const m42 = pack.rows.find((row: any) => row.objectRef === "M:42"); assert.equal(m42.positionAngleDeg, null);
  assert.equal(registerSkyDeepSkyRegion({ ...entry, ...m42, icrsCenter: { raDeg: m42.raDeg, decDeg: m42.decDeg } }, identity), null);
});
test("actual Scene call binds only its selected ICRS catalog domain to the exact science submission", () => {
  const science = JSON.parse(readFileSync(new URL("./sky-sdss-science-registration.fixture.json", import.meta.url), "utf8"));
  const publication: any = { objectRef: "M:51", publicationHash: science.publicationHash, center: science.center,
    orientation: "north-up/east-left", levels: science.levels };
  const image = { width: 512, height: 512 }, parent = { width: 512, height: 512 };
  const frame: any = { image, reference: "M:51", publicationHash: publication.publicationHash, sciencePublication: publication,
    level: "DETAIL", asset: publication.levels.DETAIL, fieldDegrees: publication.levels.DETAIL.fieldDegrees,
    coarser: { image: parent, level: "OVERVIEW", asset: publication.levels.OVERVIEW, fieldDegrees: publication.levels.OVERVIEW.fieldDegrees } };
  let groups = 0, qualified = 0;
  const surface: any = { artworkLevels() { groups++; return { submitted: true, finePrepared: true, coarsePrepared: true }; },
    artworkLevelsQualification() { qualified++; return { fine: "has", coarse: "has", any: "has" }; } };
  const page = ts.createSourceFile("actual-scene.ts", readFileSync(new URL("./sky-scene-render.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  let call: ts.CallExpression | undefined;
  const find = (node: ts.Node) => { if (ts.isCallExpression(node) && node.expression.getText(page) === "submitSkySceneScienceOptical") call = node; ts.forEachChild(node, find); }; find(page); assert(call);
  const code = ts.transpileModule(call.getText(page), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const run = (catalog: any, candidate: any = entry, enabled = true) => vm.runInNewContext(code, { submitSkySceneScienceOptical, context: surface,
    scienceOptical: enabled ? { surface, reference: "M:51", publicationHash: publication.publicationHash } : undefined, sdssOpticalImage: frame,
    observation: identity, artworkView: { basis: { forward: [1,0,0], right: [0,1,0], up: [0,0,1] }, verticalFovDeg: 1 },
    sdssOpticalFailed() {}, deepCatalog: catalog === null ? null : { frame: catalog, entries: [candidate] } });
  const actual = run("ICRS J2000"); assert(actual.region); assert(Object.isFrozen(actual)); assert(Object.isFrozen(actual.region));
  assert.equal(actual.region.reference, "M:51"); assert.equal(actual.region.frameAt, identity.at);
  const coordinates = skyDeepSkyRegionCoordinates(actual.region, ray(0,0))!;
  assert(Math.hypot(...coordinates) < 1e-10, "catalog center must not become the remote science image center");
  assert.equal(actual.allowInfrared, false); assert.equal(groups, 1); assert.equal(qualified, 1);
  for (const catalog of [null, "GALACTIC"]) { const unknown = run(catalog); assert.equal(unknown.region, null); assert.equal(unknown.allowInfrared, false); }
  for (const candidate of [{ ...entry, objectRef: "M:63" }, { ...entry, icrsCenter: undefined }, { ...entry, positionAngleDeg: null }]) {
    const unknown = run("ICRS J2000", candidate); assert.equal(unknown.region, null); assert.equal(unknown.allowInfrared, false);
  }
  assert.equal(groups, 6); assert.equal(qualified, 6, "region availability never replaces the original group qualification");
  const unneeded = new Proxy(entry, { get(target, key, receiver) {
    if (key === "objectRef") throw Error("unneeded_default_catalog_scan");
    return Reflect.get(target, key, receiver);
  } });
  assert.equal(run("ICRS J2000", unneeded, false), null,
    "ordinary Scene without an explicit science port must not scan catalog entries for this domain");
  const current = registerSkyDeepSkyRegion(entry, identity)!;
  const mutable = { ...entry, icrsCenter: { raDeg: 0, decDeg: 0 } };
  const captured = registerSkyDeepSkyRegion(mutable, identity)!; mutable.icrsCenter.raDeg = 30;
  assert.deepEqual(skyDeepSkyRegionCoordinates(captured, ray(0,0)), skyDeepSkyRegionCoordinates(current, ray(0,0)));
});
