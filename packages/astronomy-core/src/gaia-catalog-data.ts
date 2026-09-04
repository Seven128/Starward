/**
 * Platform-neutral Gaia asset boundary.
 *
 * This file contains no network or filesystem access.  Importing it embeds
 * the immutable, generated JSON asset into a server bundle or a test runner;
 * the server-only integrity owner adds byte/hash verification in
 * gaia-catalog-integrity.ts.
 */

import rawManifest from "../data/gaia-dr3-bright-stars.v1.manifest.json" with {
  type: "json",
};
import rawPack from "../data/gaia-dr3-bright-stars.v1.json" with {
  type: "json",
};

export const GAIA_DR3_RELEASE = "Gaia DR3" as const;
export const GAIA_DR3_CATALOG_VERSION = "gaia-dr3-bright-stars.v1" as const;
export const GAIA_DR3_TAP_URL =
  "https://gea.esac.esa.int/tap-server/tap/sync" as const;
export const GAIA_DR3_TABLE = "gaiadr3.gaia_source" as const;
export const GAIA_DR3_REFERENCE_EPOCH = 2016 as const;
export const GAIA_DR3_MAGNITUDE_LIMIT = 5.5 as const;
export const GAIA_DR3_MAX_ROWS = 2048 as const;
export const GAIA_DR3_MAX_ASSET_BYTES = 524288 as const;

export const GAIA_DR3_ADQL =
  "SELECT TOP 2048 source_id, ra, dec, pmra, pmdec, ref_epoch, phot_g_mean_mag, phot_bp_mean_mag, phot_rp_mean_mag FROM gaiadr3.gaia_source WHERE phot_g_mean_mag <= 5.5 AND ra IS NOT NULL AND dec IS NOT NULL AND pmra IS NOT NULL AND pmdec IS NOT NULL AND ref_epoch IS NOT NULL ORDER BY phot_g_mean_mag ASC, source_id ASC" as const;

export const GAIA_DR3_SELECTED_FIELDS = [
  "source_id",
  "ra",
  "dec",
  "pmra",
  "pmdec",
  "ref_epoch",
  "phot_g_mean_mag",
  "phot_bp_mean_mag",
  "phot_rp_mean_mag",
] as const;

export type GaiaDr3SelectedField = (typeof GAIA_DR3_SELECTED_FIELDS)[number];

export interface GaiaDr3Row {
  sourceId: string;
  raDeg: number;
  decDeg: number;
  pmRaMasYr: number;
  pmDecMasYr: number;
  refEpoch: number;
  gMag: number;
  bpRp: number | null;
}

export interface GaiaDr3BrightStarPack {
  schemaVersion: "gaia-dr3-bright-stars-v1";
  catalogVersion: typeof GAIA_DR3_CATALOG_VERSION;
  release: typeof GAIA_DR3_RELEASE;
  frame: "ICRS";
  referenceEpoch: typeof GAIA_DR3_REFERENCE_EPOCH;
  magnitudeBand: "G";
  magnitudeLimit: typeof GAIA_DR3_MAGNITUDE_LIMIT;
  readonly rows: readonly GaiaDr3Row[];
}

export interface GaiaDr3Manifest {
  schemaVersion: "gaia-dr3-bright-stars-manifest-v1";
  catalogVersion: typeof GAIA_DR3_CATALOG_VERSION;
  release: typeof GAIA_DR3_RELEASE;
  officialTapUrl: typeof GAIA_DR3_TAP_URL;
  table: typeof GAIA_DR3_TABLE;
  query: typeof GAIA_DR3_ADQL;
  selectedFields: readonly GaiaDr3SelectedField[];
  filter: {
    magnitudeBand: "G";
    magnitudeLimit: typeof GAIA_DR3_MAGNITUDE_LIMIT;
    maxRows: typeof GAIA_DR3_MAX_ROWS;
    orderBy: readonly ["phot_g_mean_mag ASC", "source_id ASC"];
  };
  rowCount: number;
  rowOrder: "phot_g_mean_mag ASC, source_id ASC";
  sourceResponseSha256: string;
  sourceResponseBytes: number;
  derivedAssetSha256: string;
  derivedAssetBytes: number;
  retrievedAt: string;
  attribution: {
    credit: "ESA/Gaia/DPAC";
    acknowledgement: string;
    sourceUrl: string;
    dataTermsUrl: string;
    license: "Open and free to use with ESA/Gaia/DPAC credit";
    terms: string;
  };
  derivation: {
    description: string;
    properMotion: "linear_tangent_plane_from_ref_epoch_julian_year";
    runtimeNetwork: "forbidden";
    rawResponseRetained: false;
  };
}

const MAX_SIGNED_SOURCE_ID = 9_223_372_036_854_775_807n;
const MAX_ABSOLUTE_PROPER_MOTION = 1_000_000;

function fail(code: string): never {
  throw new Error(`gaia_catalog_invalid:${code}`);
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    fail(`${field}_not_finite`);
  return value;
}

function sourceId(value: unknown): string {
  if (typeof value !== "string" || !/^\d{1,19}$/u.test(value))
    fail("source_id_invalid");
  let numeric: bigint;
  try {
    numeric = BigInt(value);
  } catch {
    fail("source_id_invalid");
  }
  if (numeric <= 0n || numeric > MAX_SIGNED_SOURCE_ID)
    fail("source_id_out_of_range");
  return value;
}

function assertRow(row: unknown, index: number): GaiaDr3Row {
  if (typeof row !== "object" || row === null)
    fail(`row_${index}_not_object`);
  const candidate = row as Record<string, unknown>;
  const normalized: GaiaDr3Row = {
    sourceId: sourceId(candidate.sourceId),
    raDeg: finiteNumber(candidate.raDeg, "ra_deg"),
    decDeg: finiteNumber(candidate.decDeg, "dec_deg"),
    pmRaMasYr: finiteNumber(candidate.pmRaMasYr, "pm_ra"),
    pmDecMasYr: finiteNumber(candidate.pmDecMasYr, "pm_dec"),
    refEpoch: finiteNumber(candidate.refEpoch, "ref_epoch"),
    gMag: finiteNumber(candidate.gMag, "g_mag"),
    bpRp:
      candidate.bpRp === null
        ? null
        : finiteNumber(candidate.bpRp, "bp_rp"),
  };
  if (normalized.raDeg < 0 || normalized.raDeg >= 360)
    fail(`row_${index}_ra_out_of_range`);
  if (normalized.decDeg < -90 || normalized.decDeg > 90)
    fail(`row_${index}_dec_out_of_range`);
  if (
    Math.abs(normalized.pmRaMasYr) > MAX_ABSOLUTE_PROPER_MOTION ||
    Math.abs(normalized.pmDecMasYr) > MAX_ABSOLUTE_PROPER_MOTION
  )
    fail(`row_${index}_proper_motion_out_of_range`);
  if (normalized.refEpoch !== GAIA_DR3_REFERENCE_EPOCH)
    fail(`row_${index}_reference_epoch_not_${GAIA_DR3_REFERENCE_EPOCH}`);
  if (normalized.gMag > GAIA_DR3_MAGNITUDE_LIMIT || normalized.gMag < -10)
    fail(`row_${index}_g_magnitude_out_of_range`);
  if (
    normalized.bpRp !== null &&
    (normalized.bpRp < -10 || normalized.bpRp > 20)
  )
    fail(`row_${index}_colour_out_of_range`);
  return normalized;
}

function compareRows(left: GaiaDr3Row, right: GaiaDr3Row): number {
  if (left.gMag !== right.gMag) return left.gMag - right.gMag;
  const leftId = BigInt(left.sourceId);
  const rightId = BigInt(right.sourceId);
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

/**
 * Validates rows without truncating or sampling.  This is shared by the
 * build-time pipeline and the runtime loader so there is one schema owner.
 */
export function validateGaiaDr3Rows(rows: unknown): GaiaDr3Row[] {
  if (!Array.isArray(rows)) fail("rows_not_array");
  if (rows.length === 0) fail("rows_empty");
  if (rows.length > GAIA_DR3_MAX_ROWS) fail("rows_exceed_capacity");
  const normalized = rows.map((row, index) => assertRow(row, index));
  const seen = new Set<string>();
  for (let index = 0; index < normalized.length; index += 1) {
    const row = normalized[index]!;
    if (seen.has(row.sourceId)) fail(`row_${index}_duplicate_source_id`);
    seen.add(row.sourceId);
    const previous = normalized[index - 1];
    if (previous && compareRows(previous, row) > 0)
      fail(`row_${index}_order_invalid`);
  }
  return normalized;
}

export function validateGaiaDr3Pack(value: unknown): GaiaDr3BrightStarPack {
  if (typeof value !== "object" || value === null)
    fail("pack_not_object");
  const candidate = value as Record<string, unknown>;
  if (candidate.schemaVersion !== "gaia-dr3-bright-stars-v1")
    fail("pack_schema_version_invalid");
  if (candidate.catalogVersion !== GAIA_DR3_CATALOG_VERSION)
    fail("pack_catalog_version_invalid");
  if (candidate.release !== GAIA_DR3_RELEASE) fail("pack_release_invalid");
  if (candidate.frame !== "ICRS") fail("pack_frame_invalid");
  if (candidate.referenceEpoch !== GAIA_DR3_REFERENCE_EPOCH)
    fail("pack_reference_epoch_invalid");
  if (candidate.magnitudeBand !== "G") fail("pack_magnitude_band_invalid");
  if (candidate.magnitudeLimit !== GAIA_DR3_MAGNITUDE_LIMIT)
    fail("pack_magnitude_limit_invalid");
  const rows = validateGaiaDr3Rows(candidate.rows);
  return Object.freeze({
    schemaVersion: "gaia-dr3-bright-stars-v1",
    catalogVersion: GAIA_DR3_CATALOG_VERSION,
    release: GAIA_DR3_RELEASE,
    frame: "ICRS",
    referenceEpoch: GAIA_DR3_REFERENCE_EPOCH,
    magnitudeBand: "G",
    magnitudeLimit: GAIA_DR3_MAGNITUDE_LIMIT,
    rows: Object.freeze(rows.map((row) => Object.freeze(row))),
  });
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

export const GAIA_DR3_BRIGHT_STAR_PACK = validateGaiaDr3Pack(
  rawPack as unknown,
);
export const GAIA_DR3_BRIGHT_STAR_MANIFEST =
  rawManifest as unknown as GaiaDr3Manifest;
export const GAIA_DR3_BRIGHT_STAR_CATALOG =
  GAIA_DR3_BRIGHT_STAR_PACK.rows as readonly GaiaDr3Row[];
