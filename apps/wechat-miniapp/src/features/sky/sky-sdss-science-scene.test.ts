import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { lonLat2PixNest } from "healpix-ts";
import { assertSdssScienceOpticalManifest, OBSERVATION_FRAME_FORMAT, type SdssOpticalLevel,
  type SdssScienceOpticalManifest, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { createSyntheticSdssSciencePublication } from "../../../../../workers/miniapp-api/src/test-fixtures/sdss-science-publication.ts";
import type { SkyArtworkLevels, SkyArtworkLevelsContribution, SkyArtworkLevelsDraw,
  SkyArtworkLevelsQualification, SkyArtworkLocalObservation } from "./sky-artwork-level-composition";
import { unknownSkyArtworkLocalObservation } from "./sky-artwork-level-composition";
import { registerSkyNativeImageLifetime } from "./sky-artwork-loader";
import { drawSkyScene, type SkyScenePaintedSources, type SkySceneScienceOpticalPort } from "./sky-scene-render";
import { skyTargetOpticalFrame, skySdssOpticalFrame, skyPreparedOpticalFrame } from "./sky-sdss-optical-frame";
import { registerSkyScienceOpticalField } from "./sky-sdss-science-registration";
import { submitSkySceneScienceOptical, skyScienceOpticalDisplayFacts } from "./sky-sdss-science-scene";
import { createSkyViewBasis } from "./sky-view-projection";
import { registerSkyDeepSkyRegion } from "./sky-deep-sky-region";
import { registerSkyTanOpticalField } from "./sky-tan-optical-registration";
import { skyExactTargetOpticalIdentity, type SkyExactTargetOpticalImage } from "./sky-target-optical-identity";
import { submitSkySceneTargetOptical } from "./sky-target-optical-scene";
import { preparedOpticalTestPublication } from "./sky-prepared-optical-test-support";
const preparedFixture = preparedOpticalTestPublication("scene"), prepared = preparedFixture.publication;
const preparedRetirements: Array<() => void> = [];

// Portable admitted transport fixture by default; the bounded development run
// points to the existing actual writer. This test supplies no GPU/native claim.
const supplied = process.env.CLOUD_SKY_SCIENCE_PUBLICATION_PATH;
const generated = supplied ? undefined : mkdtempSync(join(tmpdir(), "starward-science-scene-"));
const structural = generated ? createSyntheticSdssSciencePublication(generated) : undefined;
const raw = JSON.parse(readFileSync(join(supplied ?? generated!, "manifest.json"), "utf8"));
const publication: SdssScienceOpticalManifest = supplied ? raw : { ...raw, publicationHash: structural!.expectedHash,
  levels: Object.fromEntries(Object.entries(raw.levels).map(([level, asset]) => [level, { ...(asset as object),
    downloadUrl: `/v2/sky/sdss-optical/${structural!.expectedHash}/${(asset as any).file}` }])) };
assertSdssScienceOpticalManifest(publication, "M:51", publication.publicationHash);
const freeze = <T>(value: T): T => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
freeze(publication);
const at = "2026-10-02T00:00:00.000Z";
const observation: SkyObservationFrame = { format: OBSERVATION_FRAME_FORMAT, at,
  observer: { latitude: 22.54, longitude: 113.95, elevationM: 50 }, equatorialToEnu: [1,0,0,0,1,0,0,0,1] };
const az = (90 - publication.center.raDeg + 360) % 360, alt = publication.center.decDeg;
const basis = createSkyViewBasis(az, 90 + alt, 0)!;
const report = { hourly: [{ at, sunAzimuthDeg: 270, sunAltitudeDeg: -24 }], observationFrames: [observation],
  skyScene: { state: "UNAVAILABLE", catalog: null, publication: null, frames: [], deepSky: { state: "AVAILABLE",
    catalog: { frame: "ICRS J2000", catalogVersion: "controlled-deep", catalogHash: "controlled-hash", imageRegistration: "ICRS_TAN_NORTH_0_1_V1",
      entries: [{ objectRef: "M:51", displayName: "M51", kind: "GALAXY", magnitude: 8.4,
        majorAxisArcmin: 13.71, minorAxisArcmin: 11.67, positionAngleDeg: 163,
        icrsCenter: { raDeg: publication.center.raDeg, decDeg: publication.center.decDeg } }] },
    frames: [{ at, state: "AVAILABLE", points: [[0, az, alt, az, alt + .1, az - .1, alt]] }] } }, targetFrames: [] };
const infrared = { image: { kind: "W3" }, reference: "M:51", level: "DETAIL" as const, fieldDegrees: .25,
  tempFilePath: "/controlled-w3.png" };
const has: SkyArtworkLevelsQualification = { fine: "has", coarse: "has", any: "has" };
const empty: SkyArtworkLevelsQualification = { fine: "empty", coarse: "empty", any: "empty" };
const unknown: SkyArtworkLevelsQualification = { fine: "unknown", coarse: "unknown", any: "unknown" };
const submitted: SkyArtworkLevelsDraw = Object.freeze({ submitted: true, finePrepared: true, coarsePrepared: true });
const receipt = (qualification: SkyArtworkLevelsQualification = has,
  finePhoto: "positive" | "unknown" = "positive", coarsePhoto: "positive" | "unknown" = "positive"): SkyArtworkLevelsContribution =>
  ({ completed: true, qualification, finePhoto, coarsePhoto });

function world(level: SdssOpticalLevel = "DETAIL", parent: SdssOpticalLevel | null = "MEDIUM") {
  const image = { width: 512, height: 512 }, coarse = { width: 512, height: 512 };
  const retireFine = registerSkyNativeImageLifetime(image, () => true), retireCoarse = registerSkyNativeImageLifetime(coarse, () => true);
  const frame = skySdssOpticalFrame({ publication, image, renderedLevel: level, renderedAsset: publication.levels[level],
    coarser: parent ? { image: coarse, level: parent, asset: publication.levels[parent] } : null });
  assert(frame && "sciencePublication" in frame);
  return { frame, image, coarse, retireFine, retireCoarse };
}
function surface(options: { draw?: SkyArtworkLevelsDraw; qualification?: SkyArtworkLevelsQualification;
  receipt?: SkyArtworkLevelsContribution; local?: SkyArtworkLocalObservation; duringLocal?: () => void;
  w3Painted?: boolean; throwAt?: "group" | "finish" | "disc"; late?: () => void } = {}) {
  const events: string[] = [], groups: SkyArtworkLevels[] = [], images: object[] = [], getters: SkyArtworkLevelsDraw[] = [];
  const discs: number[] = [], meshOpacities: number[] = []; let finished = false, localCalls = 0;
  const draw = options.draw ?? submitted;
  const actual: SkySceneScienceOpticalPort["surface"] = {
    begin() { events.push("begin"); finished = false; }, solarLight: () => true, galacticBand: () => true,
    sun: () => true, moon: () => true, planet: () => true, saturnRings: () => true, image: () => true,
    landscape() { events.push("landscape"); options.late?.(); return true; },
    skyImageMesh(_image, _triangles, _view, opacity) { events.push("opticalHiPS"); meshOpacities.push(opacity); return true; },
    artwork(image) { events.push("W3"); images.push(image); return options.w3Painted !== false; }, segments() { events.push("segments"); },
    disc(_x, _y, _r, _color, opacity) {
      events.push("disc"); if (options.throwAt === "disc") throw new Error("ordinary-disc-failed"); discs.push(opacity);
    },
    artworkLevels(levels) { events.push("group"); groups.push(levels);
      if (options.throwAt === "group") throw new Error("ordinary-group-failed"); return draw; },
    artworkLevelsQualification(exact) { events.push("qualification"); assert.strictEqual(exact, draw);
      assert.equal(finished, false); getters.push(exact); return options.qualification ?? has; },
    artworkLevelsContribution(exact) { events.push("contribution"); assert.strictEqual(exact, draw);
      assert.equal(finished, true); getters.push(exact); return options.receipt ?? receipt(options.qualification ?? has); },
    artworkLevelsObserveRegion(exact, region) { assert.strictEqual(exact, draw); assert.equal(region?.reference, publication.objectRef);
      assert.equal(finished, false); localCalls++; options.duringLocal?.(); return options.local ?? unknownSkyArtworkLocalObservation; },
    resetArtworkContributions() {},
    finish() { events.push("finish"); if (options.throwAt === "finish") throw new Error("ordinary-finish-failed"); finished = true; },
  };
  return { actual, events, groups, images, getters, discs, meshOpacities, getLocalCalls: () => localCalls };
}
const port = (surface: SkySceneScienceOpticalPort["surface"]): SkySceneScienceOpticalPort =>
  ({ surface, reference: publication.objectRef, publicationHash: publication.publicationHash });
type SceneArgs = Parameters<typeof drawSkyScene>;
type SceneOverrides = { [K in keyof SceneArgs as K extends `${number}` ? K : never]?: SceneArgs[K] };
function paint(s: ReturnType<typeof surface>, frame: SkyExactTargetOpticalImage,
  overrides: SceneOverrides = {}) {
  let sources: SkyScenePaintedSources | null = null, snapshot: Parameters<NonNullable<SceneArgs[8]>>[0] = null, completed = 0;
  const failures: object[] = [];
  const args: Parameters<typeof drawSkyScene> = [s.actual, report as unknown as Parameters<typeof drawSkyScene>[1], at,
    null, null, 390, 844, "NIGHT"];
  args[8] = (actual, value) => { s.events.push("painted"); snapshot = actual; sources = value; };
  args[9] = () => { completed++; }; args[10] = .05; args[11] = infrared; args[12] = basis;
  args[30] = frame; args[31] = image => { failures.push(image); };
  if ("preparedPublication" in frame) args[37] = { surface: s.actual, reference: frame.reference, publicationHash: frame.publicationHash };
  else args[36] = port(s.actual);
  Object.assign(args, overrides); drawSkyScene(...args);
  return { sources: sources as SkyScenePaintedSources | null, snapshot: snapshot as Parameters<NonNullable<SceneArgs[8]>>[0], failures, completed };
}

test("only matching same-surface intent admits exact publication/primary/parent descriptors", () => {
  const w = world();
  for (const patch of [{ 36: undefined }, { 36: port(surface().actual) },
    { 36: { ...port(surface().actual), reference: "M:63" } },
    { 36: { ...port(surface().actual), publicationHash: "foreign" } },
    { 30: { ...w.frame, publicationHash: "foreign" } },
    { 30: { ...w.frame, sciencePublication: { ...publication, objectRef: "M:63" } } },
    { 30: { ...w.frame, asset: { ...w.frame.asset } } },
    { 30: { ...w.frame, coarser: { ...w.frame.coarser!, asset: { ...w.frame.coarser!.asset } } } },
    { 30: { ...w.frame, fieldDegrees: w.frame.fieldDegrees + .01 } },
    { 7: "OBSERVATION" }]) {
    const s = surface();
    // Correct the intended surface for the identity-only port mismatch cases.
    let overrides = patch as SceneOverrides;
    const requested = overrides[36];
    if (requested && (requested.reference === "M:63" || requested.publicationHash === "foreign"))
      overrides = { ...overrides, 36: { ...requested, surface: s.actual } };
    const result = paint(s, w.frame, overrides);
    assert.equal(s.groups.length, 0); assert.equal(result.sources?.sdssOptical, null);
    assert.equal(s.images.includes(w.image), false, "science never falls through independent JPEG drawing");
    assert.equal(s.images.includes(infrared.image), patch[7] !== "OBSERVATION");
  }
});

test("one actual group uses actual MEDIUM/OVERVIEW and exact observation without catalog registration gates", () => {
  const w = world("MEDIUM", "OVERVIEW"), s = surface();
  const data = { ...report, skyScene: { ...report.skyScene, deepSky: { state: "UNAVAILABLE", frames: [] } } };
  const result = paint(s, w.frame, { 1: data as unknown as Parameters<typeof drawSkyScene>[1] });
  assert.equal(s.groups.length, 1); const levels = s.groups[0]!;
  assert.strictEqual(levels.fine!.image, w.image); assert.strictEqual(levels.coarse!.image, w.coarse);
  assert.deepEqual(levels.fine!.registration, registerSkyScienceOpticalField(publication, publication.levels.MEDIUM, observation));
  assert.deepEqual(levels.coarse!.registration, registerSkyScienceOpticalField(publication, publication.levels.OVERVIEW, observation));
  assert.equal(s.events[s.events.indexOf("group") + 1], "qualification");
  assert(s.events.indexOf("finish") < s.events.indexOf("contribution"));
  assert.equal(result.sources?.sdssOptical?.kind, "science");
  const completed = result.sources!.sdssOptical!; assert(completed.kind === "science");
  assert.deepEqual(completed.participatingFields.map(field => [field.slot, field.level, field.asset]),
    [["fine", "MEDIUM", publication.levels.MEDIUM], ["coarse", "OVERVIEW", publication.levels.OVERVIEW]]);
});

test("HAS including valid black and submitted UNKNOWN block whole W3, while complete qualified EMPTY permits it", () => {
  for (const q of [has, { fine: "has", coarse: "empty", any: "has" } as const, unknown, empty]) {
    const w = world(), s = surface({ qualification: q, receipt: receipt(q, "unknown", "unknown") });
    const result = paint(s, w.frame);
    assert.equal(result.snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, q === empty ? 0 : 1,
      "HAS/UNKNOWN and valid black do not certify local readability; qualified empty W3 uses its retained legacy curve");
    assert.equal(s.images.includes(infrared.image), q === empty);
    assert.equal(s.getLocalCalls(), q === empty ? 0 : 1, "whole alternative skips local science observation");
    assert.equal(result.sources?.sdssOptical?.kind, "science");
    assert.equal((result.sources?.sdssOptical as any).participatingFields.length, 0, "zero/unknown photo never creates credit");
    assert.equal(result.failures.length, 0, "auxiliary uncertainty/black is not a source failure");
  }
  const w = world("DETAIL", null), s = surface({ draw: { ...submitted, coarsePrepared: false }, qualification: empty,
    receipt: receipt(empty, "unknown", "unknown") });
  assert.equal(paint(s, w.frame).sources?.deepSkyImage, infrared.image, "absent parent adds no expected obligation");
  assert.equal(s.getLocalCalls(), 0);
  const rejected = surface({ qualification: empty, receipt: receipt(empty, "unknown", "unknown"), w3Painted: false });
  const noPaint = paint(rejected, world().frame);
  assert.equal(noPaint.sources?.deepSkyImage, null, "an attempted W3 is not an actual painted source");
  assert.equal(noPaint.snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, 1);
  assert.equal(rejected.getLocalCalls(), 0);
});

const modelPositive: SkyArtworkLocalObservation = Object.freeze({ scope: "frozen-highp-shader-pixel-centers",
  precision: "unknown", signalRevision: 4,
  fine: Object.freeze({ selection: "has", photo: "positive" }),
  coarse: Object.freeze({ selection: "has", photo: "positive" }) });

test("actual Scene captures one guarded model scalar for ring and snapshot through zoom out and return", () => {
  const expected = [1, .3190884173395092, 0, .3190884173395092, 1];
  for (const [index, fov] of [10, 2.8, 1.8, 2.8, 10].entries()) {
    const s = surface({ local: modelPositive }), result = paint(s, world().frame, { 10: fov });
    const decisions = result.snapshot?.deepSkyAuxiliaryDecisions;
    assert.equal(decisions?.[0]?.reference, "M:51"); assert.equal(decisions?.[0]?.opacity, expected[index]);
    assert(Object.isFrozen(decisions)); assert(Object.isFrozen(decisions[0]));
    assert.deepEqual(s.discs, expected[index] === 0 ? [] : [.9 * expected[index]!]);
    assert.equal(s.getLocalCalls(), 1); assert.equal(s.images.length, 0);
    assert(result.snapshot?.objects.some(point => point.reference === "M:51"), "aid fade preserves the independent picking identity");
  }
});

test("local black, missing domain, unprepared expected source and retirement restore the actual Scene aid", () => {
  const black = surface({ local: { ...modelPositive, fine: { selection: "has", photo: "unknown" } } });
  assert.equal(paint(black, world().frame, { 10: 1.8 }).snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, 1);
  const missingRegion = { ...report, skyScene: { ...report.skyScene, deepSky: { ...report.skyScene.deepSky,
    catalog: { ...report.skyScene.deepSky.catalog, entries: [{ ...report.skyScene.deepSky.catalog.entries[0]!, positionAngleDeg: null }] } } } };
  const absent = surface({ local: modelPositive });
  assert.equal(paint(absent, world().frame, { 1: missingRegion as unknown as SceneArgs[1], 10: 1.8 })
    .snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, 1);
  assert.equal(absent.getLocalCalls(), 0);
  const failed = surface({ local: modelPositive, draw: { ...submitted, coarsePrepared: false } });
  assert.equal(paint(failed, world().frame, { 10: 1.8 }).snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, 1);
  assert.equal(failed.getLocalCalls(), 0);
  const retired = world(), during = surface({ local: modelPositive, duringLocal: retired.retireFine });
  assert.equal(paint(during, retired.frame, { 10: 1.8 }).snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, 1);
  assert.equal(during.getLocalCalls(), 1, "currentness must be checked again after the real observer boundary");
});

test("an absent or wholly unselected prepared slot is neutral; failed expected preparation never is", () => {
  for (const parent of [null, "MEDIUM"] as const) {
    const w = world("DETAIL", parent), s = surface({ local: modelPositive,
      qualification: { fine: "has", coarse: "empty", any: "has" } });
    const submission = submitSkySceneScienceOptical(s.actual, port(s.actual), w.frame, observation,
      { basis, verticalFovDeg: 2.8 }, undefined, report.skyScene.deepSky.catalog.entries[0] as any)!;
    assert(submission); const actual = skyScienceOpticalDisplayFacts(submission);
    assert.equal(actual.local.fine.selection, "has"); assert.equal(actual.local.coarse.selection, "not-selected");
    assert.equal(actual.coarseExpected, parent !== null);
  }
  const w = world(), failed = surface({ local: modelPositive, draw: { ...submitted, coarsePrepared: false }, qualification: empty });
  const submission = submitSkySceneScienceOptical(failed.actual, port(failed.actual), w.frame, observation,
    { basis, verticalFovDeg: 2.8 }, undefined, report.skyScene.deepSky.catalog.entries[0] as any)!;
  const actual = skyScienceOpticalDisplayFacts(submission);
  assert.equal(actual.local.coarse.selection, "unknown"); assert.equal(actual.local.signalRevision, null);
  assert.equal(failed.getLocalCalls(), 0);
});

test("failed original ready fine or coarse stays expected and cannot be replaced by prepared-only EMPTY", () => {
  for (const slot of ["fine", "coarse"] as const) {
    const w = world(); const draw = { ...submitted, [slot === "fine" ? "finePrepared" : "coarsePrepared"]: false };
    const s = surface({ draw, qualification: empty, receipt: receipt(empty, "unknown", "unknown") });
    const result = paint(s, w.frame); assert.equal(s.groups.length, 1);
    assert.equal(s.images.length, 0); assert.deepEqual(result.failures, [slot === "fine" ? w.image : w.coarse]);
  }
  const w = world(); w.retireFine();
  const s = surface({ draw: { ...submitted, finePrepared: false }, qualification: empty, receipt: receipt(empty, "unknown", "unknown") });
  const result = paint(s, w.frame); assert.equal(s.groups[0]!.fine, null); assert(s.groups[0]!.coarse);
  assert.deepEqual(result.failures, [w.image]); assert.equal(s.images.length, 0);
  // Controlled invalid registration input, without changing/adopting the
  // admitted manifest: parent remains exact and registrable; fine is too small
  // for the shared inverse's existing finite determinant boundary.
  const asset = { ...w.frame.asset, fieldDegrees: 1e-12 }, controlled = world();
  const invalidGeometry = { ...controlled.frame, asset, fieldDegrees: asset.fieldDegrees,
    sciencePublication: { ...publication, levels: { ...publication.levels, DETAIL: asset } } as SdssScienceOpticalManifest };
  const partial = surface({ draw: { ...submitted, finePrepared: false }, qualification: empty,
    receipt: receipt(empty, "unknown", "unknown") });
  const registered = paint(partial, invalidGeometry); assert.equal(partial.groups[0]!.fine, null); assert(partial.groups[0]!.coarse);
  assert.deepEqual(registered.failures, [controlled.image]); assert.equal(partial.images.length, 0);
  const invalidFine = { ...w.frame, asset: { ...w.frame.asset, fieldDegrees: Number.NaN }, fieldDegrees: Number.NaN };
  const unavailable = surface(); const noGroup = paint(unavailable, invalidFine);
  assert.equal(unavailable.groups.length, 0); assert.equal(noGroup.sources?.deepSkyImage, infrared.image);
});

test("no successful submission is independent unavailable fallback, not an EMPTY probe", () => {
  const w = world(), s = surface({ draw: { submitted: false, finePrepared: false, coarsePrepared: false } });
  const result = paint(s, w.frame); assert.equal(s.groups.length, 1); assert.equal(s.getters.length, 0);
  assert.equal(result.sources?.sdssOptical, null); assert.strictEqual(result.sources?.deepSkyImage, infrared.image);
  assert.deepEqual(result.failures, [w.image, w.coarse]);
  for (const observationFrames of [undefined, [{ ...observation, at: "2026-10-02T01:00:00.000Z" }],
    [{ ...observation, equatorialToEnu: [-1,0,0,0,1,0,0,0,1] }]]) {
    const s = surface(); const result = paint(s, world().frame,
      { 1: { ...report, observationFrames } as unknown as Parameters<typeof drawSkyScene>[1] });
    assert.equal(s.groups.length, 0); assert.equal(s.getters.length, 0); assert.equal(result.failures.length, 2);
    assert.strictEqual(result.sources?.deepSkyImage, infrared.image);
  }
});

test("later alpha/retirement only changes completion, never backfills W3 or turns global science photo into aid suppression", () => {
  const w = world(), s = surface({ late: w.retireFine, receipt: receipt(has, "positive", "positive") });
  const result = paint(s, w.frame, { 34: { enabled: true } });
  assert.equal(s.images.length, 0); const completed = result.sources!.sdssOptical!; assert(completed.kind === "science");
  assert.deepEqual(completed.participatingFields.map(field => field.slot), ["coarse"]);
  assert.equal(s.discs.length, 1); assert.equal(s.discs[0], .9, "unknown local facts preserve the aid despite global science participation");
  const erased = surface({ receipt: receipt(has, "unknown", "unknown") });
  const emptyPhoto = paint(erased, world().frame, { 34: { enabled: true } });
  assert.equal(erased.images.length, 0); assert.equal((emptyPhoto.sources?.sdssOptical as any).participatingFields.length, 0);
});

test("ordinary group/later draw/finish errors propagate and never publish a completed frame", () => {
  for (const throwAt of ["group", "disc", "finish"] as const) {
    const s = surface({ throwAt }); assert.throws(() => paint(s, world().frame), /ordinary-/);
    assert.equal(s.events.includes("painted"), false); assert.equal(s.events.includes("contribution"), false);
  }
  const s = surface(), result = paint(s, world().frame, { 21: [{ layer: "OPTICAL", order: 8,
    pixel: lonLat2PixNest(256, publication.center.raDeg, publication.center.decDeg), image: {} }] });
  assert(s.events.includes("opticalHiPS")); assert(s.events.indexOf("opticalHiPS") > s.events.indexOf("qualification"));
  assert.deepEqual(s.meshOpacities, [.8]);
  assert.equal(result.completed, 1);
});

test("bounded helper mutations expose expected-ready and exact-context regressions", () => {
  const source = readFileSync(new URL("./sky-target-optical-scene.ts", import.meta.url), "utf8");
  const load = (text: string): typeof submitSkySceneScienceOptical => {
    const output = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports: Record<string, unknown> = {};
    vm.runInNewContext(output, { exports, require(name: string) {
      if (name === "./sky-artwork-loader") return { skyNativeImageIsCurrent: () => true };
      if (name === "./sky-tan-optical-registration") return { registerSkyTanOpticalField };
      if (name === "./sky-target-optical-identity") return { skyExactTargetOpticalIdentity };
      if (name === "./sky-sdss-optical-frame") return { skyTargetOpticalFrame };
      if (name === "./sky-deep-sky-region") return { registerSkyDeepSkyRegion };
      if (name === "./sky-artwork-level-composition") return { unknownSkyArtworkLocalObservation };
      throw new Error(`unexpected import ${name}`);
    } });
    const submit = exports.submitSkySceneTargetOptical as typeof submitSkySceneTargetOptical;
    return (context, port, frame, observation, view, failed, catalogEntry) =>
      submit(context, "science", port, frame, observation, view, failed, catalogEntry);
  };
  const missingPrepare = { ...submitted, finePrepared: false }, s = surface({ draw: missingPrepare, qualification: empty });
  const w = world(), view = { basis, verticalFovDeg: .05 };
  const expectedMutant = source.replace("!!fine && draw.finePrepared && (!expected.coarse || (!!coarse && draw.coarsePrepared)) &&", "true &&");
  assert.notEqual(expectedMutant, source); assert.equal(load(source)(s.actual, port(s.actual), w.frame, observation, view)!.allowInfrared, false);
  assert.equal(load(expectedMutant)(s.actual, port(s.actual), w.frame, observation, view)!.allowInfrared, true);
  const contextMutant = source.replace("port.surface !== context || ", ""); assert.notEqual(contextMutant, source);
  const other = surface(); assert.equal(load(source)(s.actual, port(other.actual), w.frame, observation, view), null);
  assert(load(contextMutant)(s.actual, port(other.actual), w.frame, observation, view));
  const preparedFrame = preparedWorld().frame;
  const matchedPort = { surface: s.actual, reference: preparedFrame.reference, publicationHash: preparedFrame.publicationHash };
  assert.equal(load(source)(s.actual, matchedPort, preparedFrame, observation, view), null);
  const kindMutant = source.replace("identity.kind !== sourceKind ||", ""); assert.notEqual(kindMutant, source);
  assert(load(kindMutant)(s.actual, matchedPort, preparedFrame, observation, view),
    "removing the kind fence would admit geometric Prepared through science intent");
});

function preparedWorld(level: SdssOpticalLevel = "DETAIL", parent: SdssOpticalLevel | null = "MEDIUM") {
  const image = { width: 512, height: 512 }, coarse = { width: 512, height: 512 };
  const retireFine = registerSkyNativeImageLifetime(image, () => true), retireCoarse = registerSkyNativeImageLifetime(coarse, () => true);
  preparedRetirements.push(retireFine, retireCoarse);
  const frame = skyPreparedOpticalFrame({ publication: prepared, image, renderedLevel: level, renderedAsset: prepared.levels[level],
    coarser: parent ? { image: coarse, level: parent, asset: prepared.levels[parent] } : null });
  assert(frame); return { frame, image, coarse, retireFine, retireCoarse };
}

test("Prepared Scene needs its own same-surface/hash intent and never enters independent JPEG draws", () => {
  const w = preparedWorld();
  for (const patch of [{ 37: undefined }, { 37: { surface: surface().actual, reference: w.frame.reference, publicationHash: w.frame.publicationHash } },
    { 37: { reference: "M:63" } }, { 37: { publicationHash: publication.publicationHash } },
    { 30: { ...w.frame, asset: { ...w.frame.asset } } }, { 30: { ...w.frame, sciencePublication: publication } },
    { 30: { ...w.frame, preparedPublication: { ...prepared, imageVersion: "science-optical-v2" } } }, { 7: "OBSERVATION" }]) {
    const s = surface(); const overrides = patch as SceneOverrides;
    if (patch[37] && !("surface" in patch[37])) overrides[37] = { surface: s.actual,
      reference: w.frame.reference, publicationHash: w.frame.publicationHash, ...patch[37] };
    const result = paint(s, w.frame, { 36: { surface: s.actual, reference: w.frame.reference,
      publicationHash: w.frame.publicationHash }, ...overrides });
    assert.equal(s.groups.length, 0); assert.equal(result.sources?.sdssOptical, null);
    assert.equal(s.images.some(image => image === w.image || image === w.coarse), false);
    assert.equal(s.images.includes(infrared.image), patch[7] !== "OBSERVATION");
  }
  const medium = preparedWorld("MEDIUM", "OVERVIEW"), s = surface();
  const unavailableCatalog = { ...report, skyScene: { ...report.skyScene, deepSky: { state: "UNAVAILABLE", frames: [] } } };
  const result = paint(s, medium.frame, { 1: unavailableCatalog as unknown as SceneArgs[1] });
  assert.equal(s.groups.length, 1); const levels = s.groups[0]!;
  assert.strictEqual(levels.fine!.image, medium.image); assert.strictEqual(levels.coarse!.image, medium.coarse);
  assert.equal(levels.fine!.geometricCoverage, "geometric-source-area"); assert.equal(levels.fine!.scientificAvailability, "UNKNOWN");
  assert(!("sampleAvailability" in levels.fine!), "geometric support cannot be relabeled scientific availability");
  assert.deepEqual(levels.fine!.registration, registerSkyTanOpticalField(prepared, prepared.levels.MEDIUM, observation));
  assert.deepEqual(levels.coarse!.registration, registerSkyTanOpticalField(prepared, prepared.levels.OVERVIEW, observation));
  const completed = result.sources?.sdssOptical; assert(completed?.kind === "prepared");
  assert.strictEqual(completed.preparedPublication, prepared);
  assert.deepEqual(completed.participatingFields.map(field => [field.slot, field.level, field.asset]),
    [["fine", "MEDIUM", prepared.levels.MEDIUM], ["coarse", "OVERVIEW", prepared.levels.OVERVIEW]]);
  assert(s.events.indexOf("finish") < s.events.indexOf("contribution")); assert.equal(s.images.length, 0);
});

test("Prepared original expected sources, black and UNKNOWN cannot authorize a spectral fallback or source credit", () => {
  for (const slot of ["fine", "coarse"] as const) {
    const w = preparedWorld(), s = surface({ draw: { ...submitted, [slot === "fine" ? "finePrepared" : "coarsePrepared"]: false },
      qualification: empty, receipt: receipt(empty, "unknown", "unknown"), local: modelPositive });
    const result = paint(s, w.frame, { 10: 1.8 }); assert.equal(s.groups.length, 1); assert.equal(s.images.length, 0);
    assert.deepEqual(result.failures, [slot === "fine" ? w.image : w.coarse]); assert.equal(s.getLocalCalls(), 0);
    assert.equal(result.snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, 1);
  }
  for (const q of [has, unknown, empty]) {
    const s = surface({ qualification: q, receipt: receipt(q, "unknown", "unknown") });
    const result = paint(s, preparedWorld().frame);
    assert.equal(s.images.includes(infrared.image), q === empty);
    assert.equal(s.getLocalCalls(), q === empty ? 0 : 1);
    const completed = result.sources?.sdssOptical; assert(completed?.kind === "prepared");
    assert.equal(completed.participatingFields.length, 0, "geometry, black or uncertainty is not a positive paint");
  }
  const retired = preparedWorld(); retired.retireFine();
  const retained = surface({ draw: { ...submitted, finePrepared: false }, qualification: empty, receipt: receipt(empty, "unknown", "unknown") });
  const result = paint(retained, retired.frame); assert.equal(retained.groups[0]!.fine, null); assert(retained.groups[0]!.coarse);
  assert.deepEqual(result.failures, [retired.image]); assert.equal(retained.images.length, 0);
});

test("Prepared same-frame aid decisions survive late receipt changes while retired fine leaves actual coarse credit", () => {
  const expected = [1, .3190884173395092, 0, .3190884173395092, 1];
  for (const [index, fov] of [10, 2.8, 1.8, 2.8, 10].entries()) {
    const s = surface({ local: modelPositive }), result = paint(s, preparedWorld().frame, { 10: fov });
    assert.equal(result.snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, expected[index]);
    assert.deepEqual(s.discs, expected[index] === 0 ? [] : [.9 * expected[index]!]); assert.equal(s.getLocalCalls(), 1);
    assert(result.snapshot?.objects.some(point => point.reference === prepared.objectRef));
  }
  const w = preparedWorld(), s = surface({ local: modelPositive, late: w.retireFine });
  const result = paint(s, w.frame, { 10: 1.8, 34: { enabled: true } });
  const completed = result.sources?.sdssOptical; assert(completed?.kind === "prepared");
  assert.deepEqual(completed.participatingFields.map(field => [field.slot, field.image]), [["coarse", w.coarse]]);
  assert.strictEqual(completed.preparedPublication, prepared); assert.equal(s.images.length, 0);
  assert.equal(result.snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, 0, "late source filtering cannot rewrite the frozen pre-aid scalar");
  const zero = surface({ local: modelPositive, receipt: receipt(has, "unknown", "unknown") });
  const changed = paint(zero, preparedWorld().frame, { 10: 1.8 });
  assert.equal(changed.snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, 0);
  assert.equal(changed.sources?.sdssOptical?.kind === "prepared" && changed.sources.sdssOptical.participatingFields.length, 0);
  const black = surface({ local: { ...modelPositive, fine: { selection: "has", photo: "unknown" } } });
  assert.equal(paint(black, preparedWorld().frame, { 10: 1.8 }).snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, 1);
  const during = preparedWorld(), retiring = surface({ local: modelPositive, duringLocal: during.retireCoarse });
  assert.equal(paint(retiring, during.frame, { 10: 1.8 }).snapshot?.deepSkyAuxiliaryDecisions?.[0]?.opacity, 1);
});

test("Prepared ordinary draw/finish failures never publish an accepted painted source", () => {
  for (const throwAt of ["group", "disc", "finish"] as const) {
    const s = surface({ throwAt }); assert.throws(() => paint(s, preparedWorld().frame), /ordinary-/);
    assert.equal(s.events.includes("painted"), false); assert.equal(s.events.includes("contribution"), false);
  }
});

test("a failed wider upload submits its ready finer alternative in the same frame with exact source credit", () => {
  for (const selected of [publication, prepared]) {
    const overview = { width: 512, height: 512 }, medium = { width: 1024, height: 1024 };
    const retireOverview = registerSkyNativeImageLifetime(overview, () => true);
    const retireMedium = registerSkyNativeImageLifetime(medium, () => true);
    try {
      const loaded = skyTargetOpticalFrame({publication: selected, image: overview, renderedLevel: "OVERVIEW",
        renderedAsset: selected.levels.OVERVIEW, coarser: null,
        fallback: {image: medium, level: "MEDIUM", asset: selected.levels.MEDIUM}});
      const identity = skyExactTargetOpticalIdentity(loaded);assert(identity);const frame = identity.frame;
      const s = surface({draw: {...submitted,coarsePrepared:false}, receipt: receipt(has,"positive","unknown")});
      const base = s.actual.artworkLevels;
      s.actual.artworkLevels = (levels,view,opacity) => {
        if (levels.fine?.image === overview) {
          s.events.push("failed-wider-upload");s.groups.push(levels);
          return {submitted:false,finePrepared:false,coarsePrepared:false};
        }
        return base(levels,view,opacity);
      };
      const result = paint(s, frame, {34:{enabled:true}});
      assert.equal(result.completed,1);assert.equal(s.groups.length,2);
      assert.strictEqual(s.groups[1]!.fine!.image,medium);assert.equal(s.groups[1]!.coarse,null);
      assert.deepEqual(result.failures,[overview]);assert.equal(s.images.length,0,'a same-source fallback cannot reveal W3');
      const completed = result.sources?.sdssOptical;assert(completed && completed.kind !== 'legacy');
      assert.deepEqual(completed.participatingFields.map(field=>[field.level,field.image,field.asset]),
        [['MEDIUM',medium,selected.levels.MEDIUM]]);
      assert(s.events.indexOf('group')<s.events.indexOf('landscape'),'fallback is drawn before later scene layers');
      for (const invalid of [{...frame.fallback!,asset:{...frame.fallback!.asset}},
        {...frame.fallback!,level:'OVERVIEW' as const,asset:selected.levels.OVERVIEW},
        {...frame.fallback!,image:overview}]) {
        assert.equal(skyExactTargetOpticalIdentity({...frame,fallback:invalid} as SkyExactTargetOpticalImage),null);
      }
      for (const qualification of [has,empty,unknown]) {
        const valid = surface({draw:{...submitted,coarsePrepared:false},qualification,
          receipt:receipt(qualification,'unknown','unknown')});
        paint(valid,frame);
        assert.equal(valid.groups.length,1,'black, empty or unknown successful coverage is not an upload failure');
      }
      retireMedium();const unavailable=surface({draw:{submitted:false,finePrepared:false,coarsePrepared:false}});
      paint(unavailable,frame);
      assert.equal(unavailable.groups.length,1,'a retired alternative cannot enter the current frame');
    } finally {retireOverview();retireMedium();}
  }
});

test.after(() => {
  preparedRetirements.forEach(retire => retire()); preparedFixture.cleanup();
  if (!generated) return;
  const resolved = realpathSync(generated);
  assert.equal(dirname(resolved), realpathSync(tmpdir())); assert(basename(resolved).startsWith("starward-science-scene-"));
  rmSync(resolved, { recursive: true });
});
