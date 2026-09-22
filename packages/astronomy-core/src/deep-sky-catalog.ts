import { createHash } from "node:crypto";
import {
  EquatorFromVector, Horizon, Observer, RotateVector, Rotation_EQJ_EQD,
  Spherical, VectorFromSphere,
} from "./astronomy-engine-runtime.ts";
import {
  DEEP_SKY_CATALOG_MANIFEST,
  DEEP_SKY_CATALOG_PACK,
  type DeepSkyCatalogRow,
} from "./deep-sky-catalog-data.ts";

export * from "./deep-sky-catalog-data.ts";
export const DEEP_SKY_PROJECTION_ALGORITHM = "starward-fixed-icrs-projection@1.0.1+astronomy-engine@2.1.19";

function packHash() {
  return createHash("sha256").update(JSON.stringify(DEEP_SKY_CATALOG_PACK)).digest("hex");
}

export function loadDeepSkyCatalog() {
  if (DEEP_SKY_CATALOG_MANIFEST.catalogVersion !== DEEP_SKY_CATALOG_PACK.catalogVersion ||
    DEEP_SKY_CATALOG_MANIFEST.rowCount !== DEEP_SKY_CATALOG_PACK.rows.length ||
    DEEP_SKY_CATALOG_MANIFEST.derivedAssetSha256 !== packHash())
    throw new Error("deep_sky_catalog_invalid:manifest_asset_mismatch");
  return Object.freeze({
    catalogVersion: DEEP_SKY_CATALOG_PACK.catalogVersion,
    catalogHash: DEEP_SKY_CATALOG_MANIFEST.derivedAssetSha256,
    rows: DEEP_SKY_CATALOG_PACK.rows,
    manifest: DEEP_SKY_CATALOG_MANIFEST,
  });
}

export function deepSkyRowByReference(reference: string): DeepSkyCatalogRow | null {
  return DEEP_SKY_CATALOG_PACK.rows.find((row) => row.objectRef === reference) ?? null;
}

export function positionDeepSkyCatalog(input: {
  at: Date | string;
  latitude: number;
  longitude: number;
  elevationM: number;
  catalog?: ReturnType<typeof loadDeepSkyCatalog>;
}) {
  const at = input.at instanceof Date ? new Date(input.at) : new Date(input.at);
  if (!Number.isFinite(at.getTime())) throw new Error("deep_sky_observation_instant_invalid");
  const catalog = input.catalog ?? loadDeepSkyCatalog();
  const observer = new Observer(input.latitude, input.longitude, input.elevationM);
  const rotation = Rotation_EQJ_EQD(at);
  const horizontal = (raDeg: number, decDeg: number) => {
    const eqd = EquatorFromVector(RotateVector(
      rotation,
      VectorFromSphere(new Spherical(decDeg, ((raDeg % 360) + 360) % 360, 1), at),
    ));
    return Horizon(at, observer, eqd.ra, eqd.dec, "");
  };
  return catalog.rows.map((row) => {
    const center = horizontal(row.raDeg, row.decDeg);
    const north = horizontal(row.raDeg, Math.min(89.999, row.decDeg + 0.1));
    const east = horizontal(row.raDeg + 0.1 / Math.max(0.01, Math.cos(row.decDeg * Math.PI / 180)), row.decDeg);
    return {
      objectRef: row.objectRef,
      azimuthDeg: center.azimuth,
      altitudeDeg: center.altitude,
      northAzimuthDeg: north.azimuth,
      northAltitudeDeg: north.altitude,
      eastAzimuthDeg: east.azimuth,
      eastAltitudeDeg: east.altitude,
      visible: center.altitude > 0,
    };
  });
}
