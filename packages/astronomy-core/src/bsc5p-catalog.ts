import { createHash } from "node:crypto";
import rawPack from "../data/bsc5p-bright-stars.v1.json" with { type: "json" };
import rawManifest from "../data/bsc5p-bright-stars.v1.manifest.json" with { type: "json" };
import extendedPack from "../data/bsc5p-bright-stars.v2.json" with { type: "json" };
import extendedManifest from "../data/bsc5p-bright-stars.v2.manifest.json" with { type: "json" };
import { Observer, Rotation_EQJ_HOR } from "./astronomy-engine-runtime.ts";
import { createStellarMotion, stellarDirectionAt, projectStellarMotion, type EquatorialToEnu } from "./stellar-vectors.ts";

export const BSC5P_CATALOG_VERSION = "bsc5p-bright-stars.v2";
export type Bsc5pCatalogVersion = "bsc5p-bright-stars.v1" | typeof BSC5P_CATALOG_VERSION;
export const BSC5P_PROJECTION_ALGORITHM = "starward-bsc5p-fk5-j2000@2+astronomy-engine@2.1.19";
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

export function validateBsc5pPack(value: unknown, version: Bsc5pCatalogVersion = BSC5P_CATALOG_VERSION) {
  const pack = value as typeof rawPack;
  const limit = version === "bsc5p-bright-stars.v1" ? 5 : 6.5;
  const count = version === "bsc5p-bright-stars.v1" ? 1630 : 8404;
  if (!["bsc5p-bright-stars.v1", BSC5P_CATALOG_VERSION].includes(version) ||
    !pack || pack.schemaVersion !== "bsc5p-bright-stars-v1" || pack.catalogVersion !== version ||
    pack.frame !== "FK5" || pack.referenceEpoch !== 2000 || pack.magnitudeBand !== "V" || pack.magnitudeLimit !== limit ||
    !Array.isArray(pack.rows) || pack.rows.length !== count) fail("identity");
  const ids = new Set<string>();
  const rows = pack.rows.map(candidate => {
    const row = candidate as Bsc5pStarRow;
    if (!row || typeof row.hr !== "string" || !/^[1-9]\d{0,3}$/u.test(row.hr) || Number(row.hr) > 9110 || row.sourceId !== `HR:${row.hr}` ||
      NON_STELLAR.has(Number(row.hr)) || ids.has(row.sourceId)) fail("star_identity");
    ids.add(row.sourceId);
    if (!finite(row.raDeg) || row.raDeg < 0 || row.raDeg >= 360 || !finite(row.decDeg) || Math.abs(row.decDeg) > 90 ||
      !finite(row.pmRaCosDecArcsecYr) || !finite(row.pmDecArcsecYr) || row.refEpoch !== 2000) fail("astrometry");
    if (!finite(row.vMag) || row.vMag < -2 || row.vMag > limit || row.bV !== null && !finite(row.bV)) fail("photometry");
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

export interface Bsc5pCatalog {
  catalogVersion: Bsc5pCatalogVersion;
  catalogHash: string;
  magnitudeLimit: number;
  rows: readonly Readonly<Bsc5pStarRow>[];
  manifest: typeof rawManifest & { sources: typeof rawManifest.sources & { nameIdentities?: typeof extendedManifest.sources.nameIdentities } };
}
const loadedCatalogs = new Map<Bsc5pCatalogVersion, Readonly<Bsc5pCatalog>>();

/** Manifests are bounded acyclic JSON; protect nested provenance across consumers. */
function freezeManifest<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freezeManifest);
    Object.freeze(value);
  }
  return value;
}

/** Only the two checked-in, integrity-bound publications; no path or remote lookup. */
export function loadBsc5pStarCatalog(version: Bsc5pCatalogVersion): Readonly<Bsc5pCatalog> {
  if (version !== "bsc5p-bright-stars.v1" && version !== BSC5P_CATALOG_VERSION) fail("version");
  const cached = loadedCatalogs.get(version);
  if (cached) return cached;
  const input = version === "bsc5p-bright-stars.v1" ? rawPack : extendedPack;
  const manifest = version === "bsc5p-bright-stars.v1" ? rawManifest : extendedManifest;
  const pack = validateBsc5pPack(input, version);
  const hash = createHash("sha256").update(JSON.stringify(pack)).digest("hex");
  if (manifest.catalogVersion !== version || manifest.rowCount !== pack.rows.length ||
    manifest.derivedAssetSha256 !== hash) fail("manifest_asset_mismatch");
  const result = Object.freeze({ catalogVersion: version, catalogHash: hash, magnitudeLimit: pack.magnitudeLimit,
    rows: pack.rows, manifest: freezeManifest(structuredClone(manifest)) });
  loadedCatalogs.set(version, result);
  return result;
}

/** Single current sky/detail publication; historical versions require explicit selection. */
export function loadBsc5pBrightStarCatalog() {
  return loadBsc5pStarCatalog(BSC5P_CATALOG_VERSION);
}

/** Tangent-plane proper motion on a unit vector, well-defined at the poles. No radial velocity is inferred. */
export function propagateBsc5p(row: Bsc5pStarRow, at: Date) {
  if (!Number.isFinite(at.getTime())) throw new Error("bsc5p_observation_instant_invalid");
  const years = (at.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86_400_000);
  const [x, y, z] = stellarDirectionAt(createStellarMotion(row), years);
  const rad = Math.PI / 180;
  return { raDeg: ((Math.atan2(y, x) / rad) % 360 + 360) % 360, decDeg: Math.atan2(z, Math.hypot(x, y)) / rad };
}

export function bsc5pHorizontalFrame(input: { at: Date | string; latitude: number; longitude: number; elevationM: number }) {
  const at = new Date(input.at);
  if (!Number.isFinite(at.getTime())) throw new Error("bsc5p_observation_instant_invalid");
  if (!finite(input.latitude) || Math.abs(input.latitude) > 90 || !finite(input.longitude) || Math.abs(input.longitude) > 180 ||
    !finite(input.elevationM)) throw new Error("bsc5p_observer_invalid");
  const observer = new Observer(input.latitude, input.longitude, input.elevationM);
  // Astronomy Engine's rot is indexed [input axis][output axis], with HOR
  // axes north/west/up. Transpose and negate west to publish row-major ENU.
  const m = Rotation_EQJ_HOR(at, observer).rot;
  const equatorialToEnu: EquatorialToEnu = [-m[0][1], -m[1][1], -m[2][1],
    m[0][0], m[1][0], m[2][0], m[0][2], m[1][2], m[2][2]];
  return { at: at.toISOString(), julianYears: (at.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86_400_000),
    equatorialToEnu };
}

export function positionBsc5pCatalog(input: { at: Date | string; latitude: number; longitude: number; elevationM: number;
  catalog?: ReturnType<typeof loadBsc5pBrightStarCatalog> }) {
  const frame = bsc5pHorizontalFrame(input);
  return (input.catalog ?? loadBsc5pBrightStarCatalog()).rows.map(row => {
    const position = projectStellarMotion(createStellarMotion(row), frame.julianYears, frame.equatorialToEnu);
    return { sourceId: row.sourceId, vMag: row.vMag, bV: row.bV, ...position,
      visible: position.altitudeDeg > 0, obstructed: null };
  });
}

export function bsc5pRowByReference(reference: string) {
  return loadBsc5pBrightStarCatalog().rows.find(row => row.sourceId === reference) ?? null;
}
