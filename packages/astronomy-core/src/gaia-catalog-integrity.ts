/**
 * Runtime loader and byte-level integrity owner for the Gaia DR3 asset.
 *
 * The loader composes the manifest validator with the package-local generated
 * pack.  It intentionally exposes one frozen catalog instance so BFF callers
 * cannot substitute rows or accidentally create a second source of truth.
 */

import { createHash } from "node:crypto";
import {
  GAIA_DR3_BRIGHT_STAR_MANIFEST,
  GAIA_DR3_BRIGHT_STAR_PACK,
  GAIA_DR3_MAX_ASSET_BYTES,
  canonicalJson,
  validateGaiaDr3Pack,
  type GaiaDr3BrightStarPack,
  type GaiaDr3Row,
} from "./gaia-catalog-data.ts";
import {
  validateGaiaDr3CatalogManifest,
  type GaiaDr3CatalogManifest,
} from "./gaia-catalog-manifest.ts";

export type { GaiaDr3CatalogManifest } from "./gaia-catalog-manifest.ts";
export { validateGaiaDr3CatalogManifest } from "./gaia-catalog-manifest.ts";

export interface GaiaCatalogEntry {
  readonly sourceId: string;
  readonly gMagnitude: number;
  readonly bpRp: number | null;
  readonly raHours: number;
  readonly decDeg: number;
}

/** Structural equivalent of the shared SourceSummary, kept package-local. */
export interface GaiaCatalogSource {
  readonly id: string;
  readonly kind: "OPEN_DATA";
  readonly provider: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly license: string;
  readonly licenseUrl: string;
  readonly publishedAt: string | null;
  readonly retrievedAt: string;
  readonly validFrom: string | null;
  readonly validTo: string | null;
  readonly state: "FRESH";
  readonly confidence: number;
  readonly precision: string;
  readonly limitations: readonly string[];
}

export interface GaiaDr3ValidatedCatalog {
  readonly pack: GaiaDr3BrightStarPack;
  readonly manifest: GaiaDr3CatalogManifest;
  readonly rows: readonly GaiaDr3Row[];
  /** Stable BFF-facing projection of the same rows; never a second dataset. */
  readonly entries: readonly GaiaCatalogEntry[];
  readonly source: GaiaCatalogSource;
  readonly catalogVersion: typeof import("./gaia-catalog-data.ts").GAIA_DR3_CATALOG_VERSION;
  readonly catalogHash: string;
  readonly magnitudeLimit: number;
  readonly assetSha256: string;
  readonly assetBytes: number;
}

function fail(code: string): never {
  throw new Error(`gaia_catalog_invalid:${code}`);
}

function sha256(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalPackBytes(pack: GaiaDr3BrightStarPack): Uint8Array {
  return new TextEncoder().encode(canonicalJson(pack));
}

function createEntries(rows: readonly GaiaDr3Row[]): readonly GaiaCatalogEntry[] {
  return Object.freeze(
    rows.map((row) =>
      Object.freeze({
        sourceId: row.sourceId,
        gMagnitude: row.gMag,
        bpRp: row.bpRp,
        raHours: row.raDeg / 15,
        decDeg: row.decDeg,
      }),
    ),
  );
}

function createSource(manifest: GaiaDr3CatalogManifest, assetSha256: string): GaiaCatalogSource {
  return Object.freeze({
    id: `gaia-dr3:${assetSha256}`,
    kind: "OPEN_DATA",
    provider: "European Space Agency Gaia mission / Gaia DPAC",
    title: "Gaia DR3 bright-star offline catalog",
    sourceUrl: manifest.attribution.sourceUrl,
    license: manifest.attribution.license,
    licenseUrl: manifest.attribution.dataTermsUrl,
    publishedAt: null,
    retrievedAt: manifest.retrievedAt,
    validFrom: null,
    validTo: null,
    state: "FRESH",
    confidence: 1,
    precision:
      "Gaia DR3 ICRS astrometry and G/BP-RP photometry; local horizon projected with Astronomy Engine 2.1.19",
    limitations: [
      "Linear proper-motion propagation from Gaia DR3 ref_epoch=2016.0; parallax and radial velocity are not applied.",
      "Catalog brightness is a measured G-band magnitude, not a prediction of naked-eye visibility at a site.",
    ],
  });
}

/**
 * Validate the generated pack, its manifest, canonical byte length and digest.
 * Every failure is explicit; no fallback image, random star set or network
 * fetch is permitted when the offline source is missing or corrupt.
 */
export function validateGaiaDr3CatalogAsset(
  packValue: unknown,
  manifestValue: unknown,
): GaiaDr3ValidatedCatalog {
  const manifest = validateGaiaDr3CatalogManifest(manifestValue);
  const pack = validateGaiaDr3Pack(packValue);
  const bytes = canonicalPackBytes(pack);
  if (bytes.byteLength > GAIA_DR3_MAX_ASSET_BYTES)
    fail("derived_asset_exceeds_capacity");
  if (bytes.byteLength !== manifest.derivedAssetBytes)
    fail("manifest_asset_size_mismatch");
  const assetSha256 = sha256(bytes);
  if (assetSha256 !== manifest.derivedAssetSha256)
    fail("manifest_asset_hash_mismatch");
  if (manifest.rowCount !== pack.rows.length)
    fail("manifest_row_count_mismatch");
  const rows = Object.freeze(pack.rows);
  return Object.freeze({
    pack,
    manifest,
    rows,
    entries: createEntries(rows),
    source: createSource(manifest, assetSha256),
    catalogVersion: pack.catalogVersion,
    catalogHash: assetSha256,
    magnitudeLimit: pack.magnitudeLimit,
    assetSha256,
    assetBytes: bytes.byteLength,
  });
}

function ensureAssetIntegrity(): GaiaDr3ValidatedCatalog {
  return validateGaiaDr3CatalogAsset(
    GAIA_DR3_BRIGHT_STAR_PACK,
    GAIA_DR3_BRIGHT_STAR_MANIFEST,
  );
}

const VALIDATED_CATALOG = ensureAssetIntegrity();

/** Returns the one immutable, manifest-verified Gaia catalog used by BFF code. */
export function loadGaiaDr3BrightStarCatalog(): GaiaDr3ValidatedCatalog {
  return VALIDATED_CATALOG;
}

export const GAIA_DR3_BRIGHT_STAR_CATALOG_VERSION =
  VALIDATED_CATALOG.catalogVersion;
