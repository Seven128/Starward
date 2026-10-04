import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertStellarRotation, OBSERVATION_FRAME_FORMAT, type SdssScienceOpticalManifest,
  type SdssOpticalLevel, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { Observer, Rotation_EQJ_HOR } from "../../../../../packages/astronomy-core/src/astronomy-engine-runtime.ts";
import { registerSkyArtwork, registerSkyArtworkPlane, skyArtworkUvAtDirection } from "./sky-artwork-registration";
import { skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import { registerSkyScienceOpticalField } from "./sky-sdss-science-registration";
import { registerSkyTanOpticalField } from "./sky-tan-optical-registration";
import type { SkyVector } from "./sky-view-projection";

// Astropy WCS generated from the frozen actual M51 publisher fields, not the
// registration implementation. This fixture qualifies the admitted linear TAN
// approximation only; it does not certify original SDSS astrometric accuracy.
const fixture = JSON.parse(readFileSync(new URL("./sky-sdss-science-registration.fixture.json", import.meta.url), "utf8")) as {
  manifestSha256: string; publicationHash: string; center: SdssScienceOpticalManifest["center"];
  levels: SdssScienceOpticalManifest["levels"];
  rows: Array<{ level: SdssOpticalLevel; uv: [number, number]; raDeg: number; decDeg: number }>;
};
// Projection-only structural caller. Transport/admission is tested at its own
// owner; all geometry below retains real published center/level descriptors.
const publication = { center: fixture.center, levels: fixture.levels,
  orientation: "north-up/east-left" } as SdssScienceOpticalManifest;
const unit = (v: SkyVector) => v.map(n => n / Math.hypot(...v)) as unknown as SkyVector;
const eqRay = (raDeg: number, decDeg: number): SkyVector => {
  const ra = raDeg * Math.PI / 180, dec = decDeg * Math.PI / 180;
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
};
function frame(latitude: number, longitude: number, at: string): SkyObservationFrame {
  const instant = new Date(at), m = Rotation_EQJ_HOR(instant, new Observer(latitude, longitude, 30)).rot;
  // Astronomy Engine HOR is column-major north/west/up; the report contract
  // is row-major east/north/up. Do not import the server TS producer into the
  // client compilation merely to construct this independent test frame.
  return { at: instant.toISOString(), format: OBSERVATION_FRAME_FORMAT,
    observer: { latitude, longitude, elevationM: 30 }, equatorialToEnu: [
      -m[0]![1]!, -m[1]![1]!, -m[2]![1]!,
      m[0]![0]!, m[1]![0]!, m[2]![0]!,
      m[0]![2]!, m[1]![2]!, m[2]![2]!,
    ] };
}

test("the shared TAN owner preserves actual prepared geometry under independent WCS/observer frames", () => {
  const prepared = JSON.parse(readFileSync(new URL("./sky-prepared-optical-registration.fixture.json", import.meta.url), "utf8"));
  assert.equal(prepared.manifestSha256, "23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1");
  assert.equal(prepared.publicationHash, "8eb8336aa5a75d104807327acab5990f38e0e22000713ab639a4c95cd443a802");
  assert.equal(prepared.rows.length, 27);
  const publication = { center: prepared.center, levels: prepared.levels, orientation: "north-up/east-left" as const };
  for (const observer of [frame(22.6, 114.5, "2026-09-20T13:00:00Z"),
    frame(-35, 149, "2026-12-21T05:00:00Z"), frame(65, -20, "2027-03-21T00:00:00Z")]) {
    for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"] as const) {
      const asset = prepared.levels[level], registration = registerSkyTanOpticalField(publication, asset, observer);
      assert(registration);
      for (const row of prepared.rows.filter((entry: any) => entry.level === level)) {
        const direction = unit(skyEquatorialDirectionToEnu(observer.equatorialToEnu, eqRay(row.raDeg, row.decDeg)));
        const uv = skyArtworkUvAtDirection(registration, direction); assert(uv);
        assert(Math.hypot(uv[0] - row.uv[0], uv[1] - row.uv[1]) * asset.pixels < 1e-6);
      }
      assert.equal(registerSkyTanOpticalField(publication, { ...asset }, observer), null);
      assert.equal(registerSkyTanOpticalField(publication, asset, null), null);
    }
  }
});

test("all actual published TAN levels preserve independent WCS pixels under different observer/time frames", () => {
  assert.equal(fixture.manifestSha256, "3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5");
  assert.equal(fixture.publicationHash, "34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0");
  assert.equal(fixture.rows.length, 27);
  for (const observer of [frame(22.6, 114.5, "2026-09-20T13:00:00Z"),
    frame(-35, 149, "2026-12-21T05:00:00Z"), frame(65, -20, "2027-03-21T00:00:00Z")]) {
    for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"] as const) {
      const asset = publication.levels[level], registration = registerSkyScienceOpticalField(publication, asset, observer);
      assert(registration, level);
      for (const row of fixture.rows.filter(row => row.level === level)) {
        const ray = unit(skyEquatorialDirectionToEnu(observer.equatorialToEnu, eqRay(row.raDeg, row.decDeg)));
        const uv = skyArtworkUvAtDirection(registration, ray); assert(uv);
        const pixelError = Math.hypot(uv[0] - row.uv[0], uv[1] - row.uv[1]) * asset.pixels;
        assert(pixelError < 1e-6, `${level} independent WCS pixel error ${pixelError}`);
      }
    }
  }
});

test("an admitted finite transform preserves raw fourth-corner and off-anchor mapping", () => {
  const observer = frame(22.6, 114.5, "2026-09-20T13:00:00Z");
  // A bounded accepted Float32-scale numerical deviation, not a new rotation.
  const matrix = [1, 4e-7, 0, 0, 1, 0, 0, 0, 1] as const;
  assertStellarRotation(matrix);
  const actual = { ...observer, equatorialToEnu: matrix };
  for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"] as const) {
    const asset = publication.levels[level], registration = registerSkyScienceOpticalField(publication, asset, actual);
    assert(registration);
    for (const row of fixture.rows.filter(row => row.level === level)) {
      const ray = unit(skyEquatorialDirectionToEnu(matrix, eqRay(row.raDeg, row.decDeg)));
      const uv = skyArtworkUvAtDirection(registration, ray); assert(uv);
      assert(Math.hypot(uv[0] - row.uv[0], uv[1] - row.uv[1]) * 512 < 1e-6);
    }
  }
  // Explicit asymmetric raw-plane witness: independently normalizing three
  // anchors reproduces those three yet alters the fourth/interior plane.
  const anchors = [
    { uv: [0, 0] as const, point: [-.8, .4, 1] as SkyVector },
    { uv: [1, 0] as const, point: [.6, .4, 1] as SkyVector },
    { uv: [0, 1] as const, point: [-.8, -.3, 1] as SkyVector },
  ];
  const raw = registerSkyArtworkPlane(anchors); assert(raw);
  const normalized = registerSkyArtwork(anchors.map(a => ({ uv: a.uv, direction: unit(a.point) }))); assert(normalized);
  for (const [expected, point] of [[[1, 1], [.6, -.3, 1]], [[.75, .6], [.25, -.02, 1]]] as const) {
    const ray = unit(point), uv = skyArtworkUvAtDirection(raw, ray); assert(uv);
    assert(Math.hypot(uv[0] - expected[0], uv[1] - expected[1]) < 1e-12);
    const wrong = skyArtworkUvAtDirection(normalized, ray); assert(wrong);
    assert(Math.hypot(wrong[0] - expected[0], wrong[1] - expected[1]) > .01,
      "the oracle must reject the old independently normalized plane");
  }
});

test("foreign descriptors and missing/invalid same-frame geometry remain unavailable", () => {
  const observer = frame(22.6, 114.5, "2026-09-20T13:00:00Z"), asset = publication.levels.DETAIL;
  assert.equal(registerSkyScienceOpticalField(publication, { ...asset }, observer), null);
  assert.equal(registerSkyScienceOpticalField(publication, asset, null), null);
  for (const matrix of [[0, 0, 0, 0, 0, 0, 0, 0, 0], [-1, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, Number.NaN, 0, 0, 0, 1]])
    assert.equal(registerSkyScienceOpticalField(publication, asset,
      { ...observer, equatorialToEnu: matrix as any }), null);
  assert.equal(registerSkyArtworkPlane([{ uv: [0, 0], point: [0, 0, 0] },
    { uv: [1, 0], point: [1, 0, 0] }, { uv: [0, 1], point: [0, 1, 0] }]), null);
  assert.equal(registerSkyArtworkPlane([{ uv: [0, 0], point: [1, 0, 0] },
    { uv: [1, 0], point: [0, 1, 0] }, { uv: [0, 1], point: [-1, 0, 0] }]), null);
});
