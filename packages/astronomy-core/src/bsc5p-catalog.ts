import { createHash } from "node:crypto";
import rawPack from "../data/bsc5p-bright-stars.v1.json" with { type: "json" };
import rawManifest from "../data/bsc5p-bright-stars.v1.manifest.json" with { type: "json" };
import { EquatorFromVector, Horizon, Observer, RotateVector, Rotation_EQJ_EQD, Spherical, VectorFromSphere } from "./astronomy-engine-runtime.ts";

export const BSC5P_CATALOG_VERSION = "bsc5p-bright-stars.v1";
export const BSC5P_PROJECTION_ALGORITHM = "starward-bsc5p-fk5-j2000@1+astronomy-engine@2.1.19";
export interface Bsc5pStarRow {
  sourceId: string; hr: string; hip: string | null; hd: string | null;
  raDeg: number; decDeg: number; pmRaCosDecArcsecYr: number; pmDecArcsecYr: number;
  refEpoch: 2000; vMag: number; vMagCode: string | null; vMagUncertainty: string | null;
  bV: number | null; bVUncertainty: string | null; spectralType: string | null;
  alternateName: string | null; properName: string | null;
}
const NON_STELLAR = new Set([92, 95, 182, 1057, 1841, 2472, 2496, 3515, 3671, 6309, 6515, 7189, 7539, 8296]);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const fail = (reason: string): never => { throw new Error(`bsc5p_catalog_invalid:${reason}`); };

export function validateBsc5pPack(value: unknown) {
  const pack = value as typeof rawPack;
  if (!pack || pack.schemaVersion !== "bsc5p-bright-stars-v1" || pack.catalogVersion !== BSC5P_CATALOG_VERSION ||
    pack.frame !== "FK5" || pack.referenceEpoch !== 2000 || pack.magnitudeBand !== "V" || pack.magnitudeLimit !== 5 ||
    !Array.isArray(pack.rows) || pack.rows.length === 0 || pack.rows.length > 2048) fail("identity");
  const ids = new Set<string>();
  const rows = pack.rows.map(candidate => {
    const row = candidate as Bsc5pStarRow;
    if (!row || typeof row.hr !== "string" || !/^[1-9]\d{0,3}$/u.test(row.hr) || Number(row.hr) > 9110 || row.sourceId !== `HR:${row.hr}` ||
      NON_STELLAR.has(Number(row.hr)) || ids.has(row.sourceId)) fail("star_identity");
    ids.add(row.sourceId);
    if (!finite(row.raDeg) || row.raDeg < 0 || row.raDeg >= 360 || !finite(row.decDeg) || Math.abs(row.decDeg) > 90 ||
      !finite(row.pmRaCosDecArcsecYr) || !finite(row.pmDecArcsecYr) || row.refEpoch !== 2000) fail("astrometry");
    if (!finite(row.vMag) || row.vMag < -2 || row.vMag > 5 || row.bV !== null && !finite(row.bV)) fail("photometry");
    if (row.vMagCode !== null && !["H", "R"].includes(row.vMagCode)) fail("photometry_code");
    for (const id of [row.hip, row.hd]) if (id !== null && !/^[1-9]\d{0,5}$/u.test(id)) fail("alias");
    for (const item of [row.spectralType, row.alternateName, row.properName, row.vMagUncertainty, row.bVUncertainty])
      if (item !== null && (typeof item !== "string" || !item.trim())) fail("optional_text");
    return Object.freeze({ ...row });
  });
  for (let i = 1; i < rows.length; i++) {
    const left = rows[i - 1]!, right = rows[i]!;
    if (left.vMag > right.vMag || left.vMag === right.vMag && Number(left.hr) >= Number(right.hr)) fail("order");
  }
  return Object.freeze({ ...pack, rows: Object.freeze(rows) });
}

const pack = validateBsc5pPack(rawPack);
export function loadBsc5pBrightStarCatalog() {
  const hash = createHash("sha256").update(JSON.stringify(pack)).digest("hex");
  if (rawManifest.catalogVersion !== BSC5P_CATALOG_VERSION || rawManifest.rowCount !== pack.rows.length ||
    rawManifest.derivedAssetSha256 !== hash) fail("manifest_asset_mismatch");
  return Object.freeze({ catalogVersion: BSC5P_CATALOG_VERSION, catalogHash: hash, magnitudeLimit: 5,
    rows: pack.rows, manifest: rawManifest });
}

/** Tangent-plane proper motion on a unit vector, well-defined at the poles. No radial velocity is inferred. */
export function propagateBsc5p(row: Bsc5pStarRow, at: Date) {
  if (!Number.isFinite(at.getTime())) throw new Error("bsc5p_observation_instant_invalid");
  const years = (at.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86_400_000);
  const rad = Math.PI / 180, ra = row.raDeg * rad, dec = row.decDeg * rad;
  const east = row.pmRaCosDecArcsecYr * years * rad / 3600;
  const north = row.pmDecArcsecYr * years * rad / 3600;
  const x = Math.cos(dec) * Math.cos(ra) - east * Math.sin(ra) - north * Math.sin(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra) + east * Math.cos(ra) - north * Math.sin(dec) * Math.sin(ra);
  const z = Math.sin(dec) + north * Math.cos(dec);
  return { raDeg: ((Math.atan2(y, x) / rad) % 360 + 360) % 360, decDeg: Math.atan2(z, Math.hypot(x, y)) / rad };
}

export function positionBsc5pCatalog(input: { at: Date | string; latitude: number; longitude: number; elevationM: number;
  catalog?: ReturnType<typeof loadBsc5pBrightStarCatalog> }) {
  const at = new Date(input.at);
  if (!Number.isFinite(at.getTime())) throw new Error("bsc5p_observation_instant_invalid");
  if (!finite(input.latitude) || Math.abs(input.latitude) > 90 || !finite(input.longitude) || Math.abs(input.longitude) > 180 ||
    !finite(input.elevationM)) throw new Error("bsc5p_observer_invalid");
  const observer = new Observer(input.latitude, input.longitude, input.elevationM), rotation = Rotation_EQJ_EQD(at);
  return (input.catalog ?? loadBsc5pBrightStarCatalog()).rows.map(row => {
    const position = propagateBsc5p(row, at);
    const eqd = EquatorFromVector(RotateVector(rotation, VectorFromSphere(new Spherical(position.decDeg, position.raDeg, 1), at)));
    const horizontal = Horizon(at, observer, eqd.ra, eqd.dec, "");
    return { sourceId: row.sourceId, vMag: row.vMag, bV: row.bV, azimuthDeg: horizontal.azimuth,
      altitudeDeg: horizontal.altitude, visible: horizontal.altitude > 0, obstructed: null };
  });
}

export function bsc5pRowByReference(reference: string) {
  return pack.rows.find(row => row.sourceId === reference) ?? null;
}
