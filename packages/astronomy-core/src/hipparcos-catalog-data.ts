import rawPack from "../data/hipparcos-bright-stars.v1.json" with { type: "json" };
import rawManifest from "../data/hipparcos-bright-stars.v1.manifest.json" with { type: "json" };

export const HIPPARCOS_CATALOG_VERSION = "hipparcos-bright-stars.v1" as const;
export const HIPPARCOS_MAGNITUDE_LIMIT = 5 as const;
export const HIPPARCOS_REFERENCE_EPOCH = 1991.25 as const;
export const HIPPARCOS_MAX_ROWS = 2_048 as const;

export interface HipparcosBrightStarRow {
  sourceId: string;
  hip: string;
  raDeg: number;
  decDeg: number;
  pmRaMasYr: number;
  pmDecMasYr: number;
  refEpoch: typeof HIPPARCOS_REFERENCE_EPOCH;
  vMag: number;
  bV: number | null;
  hd: string | null;
  spectralType: string | null;
  properName: string | null;
}

export interface HipparcosBrightStarPack {
  schemaVersion: "hipparcos-bright-stars-v1";
  catalogVersion: typeof HIPPARCOS_CATALOG_VERSION;
  release: "Hipparcos Main Catalogue (ESA 1997)";
  frame: "ICRS";
  referenceEpoch: typeof HIPPARCOS_REFERENCE_EPOCH;
  magnitudeBand: "V";
  magnitudeLimit: typeof HIPPARCOS_MAGNITUDE_LIMIT;
  rows: readonly HipparcosBrightStarRow[];
}

export interface HipparcosBrightStarManifest {
  schemaVersion: "hipparcos-bright-stars-manifest-v1";
  catalogVersion: typeof HIPPARCOS_CATALOG_VERSION;
  sources: {
    hipparcos: {
      catalog: string;
      queryUrl: string;
      responseSha256: string;
      responseBytes: number;
      credit: string;
      landingUrl: string;
      serviceCredit: string;
      rightsUrl: string;
    };
    names: {
      provider: string;
      sourceUrl: string;
      responseSha256: string;
      responseBytes: number;
      usage: string;
    };
  };
  query: { vMagnitudeRange: readonly [-2, 5]; requiredFields: readonly string[] };
  rowCount: number;
  namedRowCount: number;
  rowOrder: "Vmag ASC, HIP numeric ASC";
  derivedAssetSha256: string;
  derivedAssetBytes: number;
  retrievedAt: string;
  derivation: {
    description: string;
    properMotion: "linear_tangent_plane_from_ref_epoch_julian_year";
    runtimeNetwork: "forbidden";
    rawResponseRetained: false;
  };
}

function fail(reason: string): never {
  throw new Error(`hipparcos_catalog_invalid:${reason}`);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateHipparcosRows(value: unknown): HipparcosBrightStarRow[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > HIPPARCOS_MAX_ROWS)
    fail("row_count");
  const ids = new Set<string>();
  const rows = value.map((candidate, index) => {
    if (!candidate || typeof candidate !== "object") fail(`row_${index}`);
    const row = candidate as HipparcosBrightStarRow;
    if (!/^HIP:\d{1,6}$/u.test(row.sourceId) || !/^\d{1,6}$/u.test(row.hip) || row.sourceId !== `HIP:${row.hip}`)
      fail(`row_${index}_identity`);
    if (ids.has(row.sourceId)) fail(`row_${index}_duplicate`);
    ids.add(row.sourceId);
    if (!finite(row.raDeg) || row.raDeg < 0 || row.raDeg >= 360 ||
      !finite(row.decDeg) || row.decDeg < -90 || row.decDeg > 90)
      fail(`row_${index}_coordinates`);
    if (!finite(row.pmRaMasYr) || !finite(row.pmDecMasYr) || row.refEpoch !== HIPPARCOS_REFERENCE_EPOCH)
      fail(`row_${index}_motion`);
    if (!finite(row.vMag) || row.vMag < -2 || row.vMag > HIPPARCOS_MAGNITUDE_LIMIT)
      fail(`row_${index}_magnitude`);
    if (row.bV !== null && !finite(row.bV)) fail(`row_${index}_colour`);
    for (const field of [row.hd, row.spectralType, row.properName])
      if (field !== null && (typeof field !== "string" || !field.trim())) fail(`row_${index}_optional_text`);
    return Object.freeze({ ...row });
  });
  for (let index = 1; index < rows.length; index += 1) {
    const left = rows[index - 1]!;
    const right = rows[index]!;
    if (left.vMag > right.vMag || (left.vMag === right.vMag && Number(left.hip) > Number(right.hip)))
      fail(`row_${index}_order`);
  }
  return rows;
}

export function validateHipparcosPack(value: unknown): HipparcosBrightStarPack {
  if (!value || typeof value !== "object") fail("pack");
  const pack = value as HipparcosBrightStarPack;
  if (pack.schemaVersion !== "hipparcos-bright-stars-v1" ||
    pack.catalogVersion !== HIPPARCOS_CATALOG_VERSION || pack.frame !== "ICRS" ||
    pack.referenceEpoch !== HIPPARCOS_REFERENCE_EPOCH || pack.magnitudeBand !== "V" ||
    pack.magnitudeLimit !== HIPPARCOS_MAGNITUDE_LIMIT)
    fail("pack_identity");
  return Object.freeze({ ...pack, rows: Object.freeze(validateHipparcosRows(pack.rows)) });
}

export const HIPPARCOS_BRIGHT_STAR_PACK = validateHipparcosPack(rawPack);
export const HIPPARCOS_BRIGHT_STAR_MANIFEST = rawManifest as unknown as HipparcosBrightStarManifest;
