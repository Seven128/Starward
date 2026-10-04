import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import * as contracts from "@starward/miniapp-contracts";
import { createSyntheticSdssDisplayPublication } from "../../../../../workers/miniapp-api/src/test-fixtures/sdss-display-publication.ts";
import { registerSkyNativeImageLifetime } from "./sky-artwork-loader";
import { skySdssOpticalFrame } from "./sky-sdss-optical-frame";
import { skyExactTargetOpticalIdentity, isSkyLegacyOpticalFrame } from "./sky-target-optical-identity";
import { completeScienceSkyOptical, completeTargetSkyOptical, liveSkyOpticalCompletion,
  sameSkyOpticalCompletion, sameSkyOpticalInput } from "./sky-sdss-optical-completion";
import { skyOpticalSourceCredit } from "./sky-optical-source-credit";
import { createSkyViewBasis } from "./sky-view-projection";
import { drawSkyScene, type SkyScenePaintedSources, type SkySceneCalibratedOpticalPort } from "./sky-scene-render";

// Portable transport fixture; an explicitly supplied actual publication is a
// bounded development check. Controlled handles/receipts are not GPU/native proof.
const supplied = process.env.CLOUD_SKY_DISPLAY_PUBLICATION_PATH;
const directory = supplied ? undefined : mkdtempSync(join(tmpdir(), "starward-display-consumer-"));
const fixture = directory ? createSyntheticSdssDisplayPublication(directory) : undefined;
const raw = JSON.parse(readFileSync(join(supplied ?? directory!, "manifest.json"), "utf8"));
const publication: contracts.SdssDisplayOpticalManifest = supplied ? raw : { ...raw, publicationHash: fixture!.expectedHash,
  levels: Object.fromEntries(contracts.SDSS_OPTICAL_LEVELS.map(level => [level, { ...raw.levels[level],
    downloadUrl: `/v2/sky/sdss-optical/${fixture!.expectedHash}/${raw.levels[level].file}` }])) };
contracts.assertSdssDisplayOpticalManifest(publication, publication.objectRef, publication.publicationHash);
test.after(() => {
  if (!directory) return;
  assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir()));
  assert.match(basename(directory), /^starward-display-consumer-/u);
  rmSync(directory, { recursive: true }); // Verified regenerated test scope only.
});
function world() {
  const fine = {}, coarse = {}, retireFine = registerSkyNativeImageLifetime(fine, () => true), retireCoarse = registerSkyNativeImageLifetime(coarse, () => true);
  const frame = skySdssOpticalFrame({ publication, image: fine, renderedLevel: "DETAIL", renderedAsset: publication.levels.DETAIL,
    coarser: { image: coarse, level: "MEDIUM", asset: publication.levels.MEDIUM } });
  assert(frame && "displayPublication" in frame);
  return { fine, coarse, frame, retireFine, retireCoarse, close() { retireFine();retireCoarse(); } };
}
const draw = { submitted: true, finePrepared: true, coarsePrepared: true } as const;
const has = { fine: "has", coarse: "has", any: "has" } as const;
const receipt = { completed: true, finePhoto: "positive", coarsePhoto: "positive", qualification: has } as const;

test("display frame/completion/source keep estimates and actual parent identity distinct from science and JPEG", () => {
  const w = world();
  try {
    assert.equal(isSkyLegacyOpticalFrame(w.frame), false);assert.equal(skyExactTargetOpticalIdentity(w.frame)?.kind, "display");
    assert.equal("sciencePublication" in w.frame, false);
    assert.equal(completeScienceSkyOptical(w.frame, draw, receipt), null);
    const completed = completeTargetSkyOptical(w.frame, draw, receipt);assert(completed?.kind === "display");
    assert.strictEqual(completed.displayPublication, publication);assert.equal(completed.participatingFields.length, 2);
    assert(completed.participatingFields[1]);assert.strictEqual(completed.participatingFields[1].asset, publication.levels.MEDIUM);
    const credit = skyOpticalSourceCredit(completed);assert(credit?.kind === "display");
    assert.match(credit.description, /显示估计.*非新科学测量/u);assert(credit.sourceRoute.includes(publication.publicationHash));
    assert(sameSkyOpticalInput(w.frame, { ...w.frame }));
    assert.equal(sameSkyOpticalInput(w.frame, { ...w.frame, displayPublication: { ...publication } }), false);
    assert.equal(sameSkyOpticalCompletion(completed, { ...completed, displayPublication: { ...publication } }), false);
    for (const forged of [{ ...w.frame, sciencePublication: publication }, { ...w.frame, preparedPublication: publication },
      { ...w.frame, asset: { ...w.frame.asset } }, { ...w.frame, displayPublication: { ...publication, imageVersion: "science-optical-v3" } }]) {
      assert.equal(skyExactTargetOpticalIdentity(forged as any), null);assert.equal(completeTargetSkyOptical(forged as any, draw, receipt), null);
    }
    w.retireFine();const surviving = liveSkyOpticalCompletion(completed);assert(surviving?.kind === "display");
    assert.equal(surviving.participatingFields.length, 1);assert(surviving.participatingFields[0]);assert.strictEqual(surviving.participatingFields[0].image, w.coarse);
    assert.equal(skyOpticalSourceCredit(surviving)?.publicationHash, publication.publicationHash);
    w.retireCoarse();assert.equal(skyOpticalSourceCredit(completed), null);
  } finally { w.close(); }
});

test("actual calibrated client pins display bytes, family/reference and URLs while strict science remains separate", async () => {
  const file = "../../services/sdss-optical-client.ts", source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const names = ["requestSdssPinnedOpticalManifest", "getSdssCalibratedOpticalManifest", "getSdssScienceOpticalManifest"];
  const declarations = source.statements.filter(s => ts.isFunctionDeclaration(s) && names.includes(s.name?.text ?? ""));
  const code = declarations.map(s => s.getText(source).replace(/^export\s+/u, "")).join("\n") + "\n({getSdssCalibratedOpticalManifest,getSdssScienceOpticalManifest});";
  const calls: any[] = [];let body: unknown = publication;
  const client = vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    ...contracts, requestBareSkyResource: async (...args: unknown[]) => { calls.push(args);return { status: 200, body }; }
  });
  const signal = new AbortController().signal;
  assert.strictEqual(await client.getSdssCalibratedOpticalManifest(publication.objectRef, publication.publicationHash, signal), publication);
  assert.deepEqual(calls[0], [`/v2/sky/sdss-optical/${publication.publicationHash}/manifest`, "sdss-optical", signal]);
  await assert.rejects(client.getSdssScienceOpticalManifest(publication.objectRef, publication.publicationHash, signal), /publication_invalid/u);
  const before = calls.length;await assert.rejects(client.getSdssCalibratedOpticalManifest("M:82/../M:51", publication.publicationHash), /manifest_unavailable/u);
  assert.equal(calls.length, before);
  const changed = structuredClone(publication);changed.levels.DETAIL.downloadUrl = "/foreign";body = changed;
  await assert.rejects(client.getSdssCalibratedOpticalManifest(publication.objectRef, publication.publicationHash), /manifest_invalid/u);
});

test("real Scene needs calibrated intent, keeps joint alpha and admits only actual completed display participation", () => {
  const w = world();let finished = false, groups = 0;
  const surface: SkySceneCalibratedOpticalPort["surface"] = {
    begin() { finished = false; },solarLight: () => true,galacticBand: () => true,sun: () => true,moon: () => true,
    planet: () => true,saturnRings: () => true,image: () => true,landscape: () => true,skyImageMesh: () => true,
    artwork: () => true,segments() {},disc() {},resetArtworkContributions() {},
    artworkLevels(levels) { groups++;assert.equal(levels.fine?.sampleAvailability, "joint-area-alpha");return draw; },
    artworkLevelsQualification(actual) { assert.strictEqual(actual, draw);return has; },
    artworkLevelsContribution(actual) { assert(finished);assert.strictEqual(actual, draw);return receipt; },finish() { finished = true; }
  };
  const at = "2026-10-04T00:00:00.000Z", az = (90 - publication.center.raDeg + 360) % 360, alt = publication.center.decDeg;
  const report: any = { hourly: [{ at, sunAzimuthDeg: 270, sunAltitudeDeg: -24 }], targetFrames: [],
    observationFrames: [{ format: contracts.OBSERVATION_FRAME_FORMAT, at, observer: { latitude: 22.54, longitude: 113.95, elevationM: 50 }, equatorialToEnu: [1,0,0,0,1,0,0,0,1] }],
    skyScene: { state: "UNAVAILABLE", catalog: null, publication: null, frames: [], deepSky: { state: "AVAILABLE",
      catalog: { frame: "ICRS J2000", catalogVersion: "controlled", catalogHash: "controlled", imageRegistration: "ICRS_TAN_NORTH_0_1_V1", entries: [{ objectRef: publication.objectRef, displayName: "controlled", kind: "GALAXY", magnitude: 8.4, majorAxisArcmin: 13, minorAxisArcmin: 8, positionAngleDeg: 160, icrsCenter: publication.center }] },
      frames: [{ at, state: "AVAILABLE", points: [[0,az,alt,az,alt+.1,az-.1,alt]] }] } } };
  const intent = { surface, reference: publication.objectRef, publicationHash: publication.publicationHash };
  function paint(calibrated: boolean, scienceOnly = false) {
    let sources: SkyScenePaintedSources | null = null;
    const args: Parameters<typeof drawSkyScene> = [surface,report,at,null,null,390,844,"NIGHT"];
    args[8] = (_snapshot, value) => { assert(finished);sources = value; };args[10] = .05;
    args[12] = createSkyViewBasis(az, 90 + alt, 0);args[30] = w.frame;
    if (scienceOnly) args[36] = intent;if (calibrated) args[38] = intent;
    drawSkyScene(...args);return sources as SkyScenePaintedSources | null;
  }
  try {
    assert.equal(paint(false)?.sdssOptical, null);assert.equal(groups, 0);
    assert.equal(paint(false, true)?.sdssOptical, null);assert.equal(groups, 0, "strict science intent cannot relabel display");
    const source = paint(true)?.sdssOptical;assert(source?.kind === "display");assert.equal(groups, 1);
    assert.strictEqual(source.displayPublication, publication);assert.equal(skyOpticalSourceCredit(source)?.kind, "display");
  } finally { w.close(); }
});
