import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertPreparedOpticalManifest, OBSERVATION_FRAME_FORMAT, type PreparedOpticalManifest,
  type SkyObservationFrame, type SdssOpticalLevel } from "@starward/miniapp-contracts";
import { Observer, Rotation_EQJ_HOR } from "../../../../../packages/astronomy-core/src/astronomy-engine-runtime.ts";
import { skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import { registerSkyPreparedOpticalFootprints, type SkyOpticalFootprintRows } from "./sky-prepared-optical-footprint";
import { skyPreparedOpticalFrame } from "./sky-sdss-optical-frame";
import type { SkyVector } from "./sky-view-projection";

const raw = readFileSync(new URL("./sky-prepared-optical-footprint.fixture.json", import.meta.url));
assert.equal(createHash("sha256").update(raw).digest("hex"), "b79dad2fc1642ee4a1443b479d2ad38524d3e4f09c1ef33a57aa74a705811a92");
const fixture = JSON.parse(raw.toString("utf8")) as {
  manifestSha256: string; publicationHash: string; nominalReferenceRowsResultSha256: string;
  publication: PreparedOpticalManifest; nominalSourceBottomFirstRows: SkyOpticalFootprintRows;
  masterRows: SkyOpticalFootprintRows;
  wcsRows: Array<{ level: SdssOpticalLevel; uv: [number, number]; raDeg: number; decDeg: number }>;
};
assert.equal(fixture.manifestSha256, "23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1");
assert.equal(fixture.nominalReferenceRowsResultSha256, "95f72b83ace5de05346f09a7e0414b3e8157f55f5593653d859f6468c6d77d83");
assertPreparedOpticalManifest(fixture.publication, "M:51", fixture.publicationHash);
const dot = (a: SkyVector, b: SkyVector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const eqRay = (raDeg: number, decDeg: number): SkyVector => {
  const ra = raDeg * Math.PI / 180, dec = decDeg * Math.PI / 180;
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
};
function uv(rows: SkyOpticalFootprintRows, ray: SkyVector): readonly [number, number] | null {
  const denominator = dot(rows[2], ray);
  return denominator > 0 ? [dot(rows[0], ray) / denominator, dot(rows[1], ray) / denominator] : null;
}
function observation(latitude: number, longitude: number, at: string): SkyObservationFrame {
  const observer = { latitude, longitude, elevationM: 30 };
  const instant = new Date(at), matrix = Rotation_EQJ_HOR(instant, new Observer(latitude, longitude, 30)).rot;
  return { format: OBSERVATION_FRAME_FORMAT, observer, at: instant.toISOString(), equatorialToEnu: [
    -matrix[0]![1]!, -matrix[1]![1]!, -matrix[2]![1]!,
    matrix[0]![0]!, matrix[1]![0]!, matrix[2]![0]!,
    matrix[0]![2]!, matrix[1]![2]!, matrix[2]![2]!,
  ] };
}
const identityObservation: SkyObservationFrame = { at: "2026-10-03T00:00:00.000Z", format: OBSERVATION_FRAME_FORMAT,
  observer: { latitude: 22.54, longitude: 113.95, elevationM: 50 }, equatorialToEnu: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
function ready(publication = fixture.publication, level: SdssOpticalLevel = "DETAIL") {
  const result = skyPreparedOpticalFrame({ image: { width: 512, height: 512 }, renderedLevel: level,
    renderedAsset: publication.levels[level], publication, coarser: null });
  assert(result); return result;
}

test("full source and common mother preserve prior independent WCS under actual report rotations", () => {
  const frames = [identityObservation, observation(22.6, 114.5, "2026-09-20T13:00:00Z"),
    observation(-35, 149, "2026-12-21T05:00:00Z"), observation(65, -20, "2027-03-21T00:00:00Z"),
    { ...identityObservation, equatorialToEnu: [1, 4e-7, 0, 0, 1, 0, 0, 0, 1] as const }];
  const frame = ready(), [width, height] = fixture.publication.source.nominalAvm.decodedShapeWidthHeight;
  let fixedIcrsRowsCounterexample = 0;
  for (const observation of frames) {
    const footprints = registerSkyPreparedOpticalFootprints(frame, observation); assert(footprints);
    assert.equal(footprints.reference, frame.reference); assert.equal(footprints.publicationHash, frame.publicationHash);
    assert.equal(footprints.at, observation.at); assert.deepEqual(footprints.equatorialToEnu, observation.equatorialToEnu);
    assert.equal(footprints.accuracy, "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM");
    for (const landmark of fixture.wcsRows) {
      const eq = eqRay(landmark.raDeg, landmark.decDeg), ray = skyEquatorialDirectionToEnu(observation.equatorialToEnu, eq);
      const source = uv(footprints.source, ray), master = uv(footprints.master, ray);
      const expectedSource = uv(fixture.nominalSourceBottomFirstRows, eq), expectedMaster = uv(fixture.masterRows, eq);
      assert(source && master && expectedSource && expectedMaster);
      assert(Math.abs(source[0] - expectedSource[0]) * (width - 1) < 2e-5);
      assert(Math.abs(source[1] - (1 - expectedSource[1])) * (height - 1) < 2e-5);
      assert(Math.max(Math.abs(master[0] - expectedMaster[0]), Math.abs(master[1] - expectedMaster[1])) * 2048 < 2e-5);
      // Effective escaped-defect control: the previous fixed ICRS rows are
      // not a valid replacement when the actual ENU ray is report-rotated.
      const fixed = uv(fixture.masterRows, ray);
      if (fixed) fixedIcrsRowsCounterexample = Math.max(fixedIcrsRowsCounterexample,
        Math.hypot(fixed[0] - expectedMaster[0], fixed[1] - expectedMaster[1]) * 2048);
    }
  }
  assert(fixedIcrsRowsCounterexample > 100);
});

test("footprints use one full publication across ready LODs and retain immutable report facts", () => {
  const observation = structuredClone(identityObservation), before = JSON.stringify(fixture.publication);
  const footprints = (["OVERVIEW", "MEDIUM", "DETAIL"] as const).map(level =>
    registerSkyPreparedOpticalFootprints(ready(fixture.publication, level), observation));
  assert(footprints.every(Boolean)); assert.deepEqual(footprints[0], footprints[1]); assert.deepEqual(footprints[1], footprints[2]);
  const first = footprints[0]!;
  assert(Object.isFrozen(first) && Object.isFrozen(first.equatorialToEnu));
  assert([first.source, first.master].every(rows => Object.isFrozen(rows) && rows.every(Object.isFrozen)));
  observation.equatorialToEnu = [0, -1, 0, 1, 0, 0, 0, 0, 1];
  assert.deepEqual(first.equatorialToEnu, identityObservation.equatorialToEnu);
  assert.equal(JSON.stringify(fixture.publication), before);
  const opposite = eqRay((fixture.publication.center.raDeg + 180) % 360, -fixture.publication.center.decDeg);
  assert.equal(uv(first.source, opposite), null); assert.equal(uv(first.master, opposite), null);
});

test("wrong identity, report or incomplete source/mother geometry cannot supply display coordinates", () => {
  const frame = ready();
  assert.equal(registerSkyPreparedOpticalFootprints(null, identityObservation), null);
  assert.equal(registerSkyPreparedOpticalFootprints(frame, null), null);
  assert.equal(registerSkyPreparedOpticalFootprints({ ...frame, reference: "M:82" }, identityObservation), null);
  assert.equal(registerSkyPreparedOpticalFootprints({ ...frame, publicationHash: "0".repeat(64) }, identityObservation), null);
  assert.equal(registerSkyPreparedOpticalFootprints({ ...frame, asset: { ...frame.asset } }, identityObservation), null);
  assert.equal(registerSkyPreparedOpticalFootprints({ image: {}, reference: "M:51", publicationHash: frame.publicationHash,
    fieldDegrees: frame.fieldDegrees, level: frame.level }, identityObservation), null);
  assert.equal(registerSkyPreparedOpticalFootprints(frame,
    { ...identityObservation, equatorialToEnu: [-1, 0, 0, 0, 1, 0, 0, 0, 1] }), null);
  for (const mutate of [
    (publication: PreparedOpticalManifest) => { publication.source.nominalAvm.cdeltDegrees[0] = 0; },
    (publication: PreparedOpticalManifest) => { publication.source.nominalAvm.referenceValue[0] = NaN; },
    (publication: PreparedOpticalManifest) => { publication.source.nominalAvm.decodedShapeWidthHeight[1] = 1; },
    (publication: PreparedOpticalManifest) => { publication.master.fieldDegrees *= 2; },
    (publication: PreparedOpticalManifest) => { publication.master.fieldDegrees = NaN; },
  ]) {
    const publication = structuredClone(fixture.publication); mutate(publication);
    const input = { ...frame, preparedPublication: publication, asset: publication.levels[frame.level] };
    assert.equal(registerSkyPreparedOpticalFootprints(input, identityObservation), null);
  }
});
