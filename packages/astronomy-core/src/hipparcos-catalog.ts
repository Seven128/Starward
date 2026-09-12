import { createHash } from "node:crypto";
import {
  EquatorFromVector, Horizon, Observer, RotateVector, Rotation_EQJ_EQD,
  Spherical, VectorFromSphere,
} from "./astronomy-engine-runtime.ts";
import {
  HIPPARCOS_BRIGHT_STAR_MANIFEST,
  HIPPARCOS_BRIGHT_STAR_PACK,
  HIPPARCOS_CATALOG_VERSION,
  HIPPARCOS_MAGNITUDE_LIMIT,
  type HipparcosBrightStarRow,
} from "./hipparcos-catalog-data.ts";

export * from "./hipparcos-catalog-data.ts";
export const HIPPARCOS_PROJECTION_ALGORITHM = "starward-hipparcos-projection@1.0.0+astronomy-engine@2.1.19";

export interface HipparcosStarProjection {
  sourceId: string;
  vMag: number;
  bV: number | null;
  azimuthDeg: number;
  altitudeDeg: number;
  visible: boolean;
  obstructed: boolean | null;
}

function packHash() {
  return createHash("sha256").update(JSON.stringify(HIPPARCOS_BRIGHT_STAR_PACK)).digest("hex");
}

export function loadHipparcosBrightStarCatalog() {
  const manifest = HIPPARCOS_BRIGHT_STAR_MANIFEST;
  if (manifest.catalogVersion !== HIPPARCOS_CATALOG_VERSION ||
    manifest.rowCount !== HIPPARCOS_BRIGHT_STAR_PACK.rows.length ||
    manifest.derivedAssetSha256 !== packHash())
    throw new Error("hipparcos_catalog_invalid:manifest_asset_mismatch");
  return Object.freeze({
    catalogVersion: HIPPARCOS_CATALOG_VERSION,
    catalogHash: manifest.derivedAssetSha256,
    magnitudeLimit: HIPPARCOS_MAGNITUDE_LIMIT,
    rows: HIPPARCOS_BRIGHT_STAR_PACK.rows,
    manifest,
  });
}

function propagated(row: HipparcosBrightStarRow, at: Date) {
  const julianYearMs = 365.25 * 86_400_000;
  const reference = Date.UTC(1991, 3, 2, 13, 30);
  const years = (at.getTime() - reference) / julianYearMs;
  const cosDec = Math.cos(row.decDeg * Math.PI / 180);
  return {
    raDeg: ((row.raDeg + (Math.abs(cosDec) < 1e-12 ? 0 : row.pmRaMasYr * years / (3_600_000 * cosDec))) % 360 + 360) % 360,
    decDeg: Math.max(-90, Math.min(90, row.decDeg + row.pmDecMasYr * years / 3_600_000)),
  };
}

export function positionHipparcosCatalog(input: {
  at: Date | string;
  latitude: number;
  longitude: number;
  elevationM: number;
  catalog?: ReturnType<typeof loadHipparcosBrightStarCatalog>;
}) {
  const at = input.at instanceof Date ? new Date(input.at) : new Date(input.at);
  if (!Number.isFinite(at.getTime())) throw new Error("hipparcos_observation_instant_invalid");
  const catalog = input.catalog ?? loadHipparcosBrightStarCatalog();
  return catalog.rows.map<HipparcosStarProjection>((row) => {
    const equatorial = propagated(row, at);
    const eqd = EquatorFromVector(RotateVector(
      Rotation_EQJ_EQD(at),
      VectorFromSphere(new Spherical(equatorial.decDeg, equatorial.raDeg, 1), at),
    ));
    const horizontal = Horizon(at, new Observer(input.latitude, input.longitude, input.elevationM), eqd.ra, eqd.dec, "");
    return {
      sourceId: row.sourceId,
      vMag: row.vMag,
      bV: row.bV,
      azimuthDeg: horizontal.azimuth,
      altitudeDeg: horizontal.altitude,
      visible: horizontal.altitude > 0,
      obstructed: null,
    };
  });
}

export function hipparcosRowByReference(reference: string) {
  return HIPPARCOS_BRIGHT_STAR_PACK.rows.find((row) => row.sourceId === reference) ?? null;
}

