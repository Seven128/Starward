/**
 * Manifest authority for the checked Gaia DR3 bright-star asset.
 *
 * Keeping these checks separate from asset hashing and horizon projection is
 * intentional: the manifest is build provenance and policy, while the other
 * modules own bytes and astronomical coordinates respectively.
 */

import {
  GAIA_DR3_ADQL,
  GAIA_DR3_CATALOG_VERSION,
  GAIA_DR3_MAGNITUDE_LIMIT,
  GAIA_DR3_MAX_ROWS,
  GAIA_DR3_RELEASE,
  GAIA_DR3_SELECTED_FIELDS,
  GAIA_DR3_TABLE,
  GAIA_DR3_TAP_URL,
  type GaiaDr3Manifest,
} from "./gaia-catalog-data.ts";

export type GaiaDr3CatalogManifest = GaiaDr3Manifest;

function fail(code: string): never {
  throw new Error(`gaia_catalog_invalid:${code}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null)
    fail("manifest_not_object");
  return value as Record<string, unknown>;
}

function validateIdentity(manifest: Record<string, unknown>): void {
  if (manifest.schemaVersion !== "gaia-dr3-bright-stars-manifest-v1")
    fail("manifest_schema_version_invalid");
  if (manifest.catalogVersion !== GAIA_DR3_CATALOG_VERSION)
    fail("manifest_catalog_version_invalid");
  if (manifest.release !== GAIA_DR3_RELEASE)
    fail("manifest_release_invalid");
  if (manifest.officialTapUrl !== GAIA_DR3_TAP_URL)
    fail("manifest_tap_url_invalid");
  if (manifest.table !== GAIA_DR3_TABLE)
    fail("manifest_table_invalid");
}

function validateQuery(manifest: Record<string, unknown>): void {
  if (manifest.query !== GAIA_DR3_ADQL)
    fail("manifest_query_invalid");
  if (
    !Array.isArray(manifest.selectedFields) ||
    manifest.selectedFields.join(",") !== GAIA_DR3_SELECTED_FIELDS.join(",")
  )
    fail("manifest_selected_fields_invalid");
}

function validateFilter(manifest: Record<string, unknown>): void {
  const filter = manifest.filter as Record<string, unknown> | undefined;
  if (
    !filter ||
    filter.magnitudeBand !== "G" ||
    filter.magnitudeLimit !== GAIA_DR3_MAGNITUDE_LIMIT ||
    filter.maxRows !== GAIA_DR3_MAX_ROWS ||
    !Array.isArray(filter.orderBy) ||
    filter.orderBy.join(",") !== "phot_g_mean_mag ASC,source_id ASC"
  )
    fail("manifest_filter_invalid");
  if (manifest.rowOrder !== "phot_g_mean_mag ASC, source_id ASC")
    fail("manifest_row_order_invalid");
}

function validateCountsAndDigests(manifest: Record<string, unknown>): void {
  for (const key of [
    "rowCount",
    "sourceResponseBytes",
    "derivedAssetBytes",
  ]) {
    const value = manifest[key];
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value <= 0
    )
      fail(`manifest_${key}_invalid`);
  }
  for (const key of ["sourceResponseSha256", "derivedAssetSha256"]) {
    const value = manifest[key];
    if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value))
      fail(`manifest_${key}_invalid`);
  }
}

function validateAttribution(manifest: Record<string, unknown>): void {
  if (
    typeof manifest.retrievedAt !== "string" ||
    !Number.isFinite(Date.parse(manifest.retrievedAt))
  )
    fail("manifest_retrieved_at_invalid");
  const attribution = manifest.attribution as Record<string, unknown> | undefined;
  if (
    !attribution ||
    attribution.credit !== "ESA/Gaia/DPAC" ||
    attribution.license !== "Open and free to use with ESA/Gaia/DPAC credit" ||
    typeof attribution.acknowledgement !== "string" ||
    typeof attribution.sourceUrl !== "string" ||
    typeof attribution.dataTermsUrl !== "string" ||
    typeof attribution.terms !== "string"
  )
    fail("manifest_attribution_invalid");
}

function validateDerivation(manifest: Record<string, unknown>): void {
  const derivation = manifest.derivation as Record<string, unknown> | undefined;
  if (
    !derivation ||
    derivation.properMotion !==
      "linear_tangent_plane_from_ref_epoch_julian_year" ||
    derivation.runtimeNetwork !== "forbidden" ||
    derivation.rawResponseRetained !== false
  )
    fail("manifest_derivation_invalid");
}

/** Validate immutable provenance and policy before any asset bytes are trusted. */
export function validateGaiaDr3CatalogManifest(
  value: unknown,
): GaiaDr3CatalogManifest {
  const manifest = asRecord(value);
  validateIdentity(manifest);
  validateQuery(manifest);
  validateFilter(manifest);
  validateCountsAndDigests(manifest);
  validateAttribution(manifest);
  validateDerivation(manifest);
  return value as GaiaDr3CatalogManifest;
}
