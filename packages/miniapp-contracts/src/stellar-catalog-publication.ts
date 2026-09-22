import type { SourceSummary } from "./types.ts";
import { assertStellarGeometryCatalog, type StellarGeometryIdentity, type StellarGeometryRow } from "./stellar-geometry.ts";

/** HR, name, original V, nullable B-V, then unit EQJ position and tangent motion/year. */
export type StellarCatalogRow = readonly [
  string, string | null, number, number | null, number, number, number, number, number, number,
];
export interface StellarCatalogPublication extends StellarGeometryIdentity {
  magnitudeLimit: number;
  magnitudeBand: "V";
  colorIndexBand: "B-V";
  sources: readonly SourceSummary[];
  rows: readonly StellarCatalogRow[];
}
export interface StellarCatalogReference {
  catalogVersion: string;
  catalogHash: string;
}

export function assertStellarCatalogReference(value: unknown): asserts value is StellarCatalogReference {
  const reference = value as StellarCatalogReference;
  if (!reference || !["bsc5p-bright-stars.v1", "bsc5p-bright-stars.v2"].includes(reference.catalogVersion) ||
    typeof reference.catalogHash !== "string" || !/^[a-f0-9]{64}$/u.test(reference.catalogHash))
    throw new TypeError("stellar_publication_invalid:reference");
}

/** Validate data after network, conditional-cache and offline-cache reads alike. */
export function assertStellarCatalogPublication(value: unknown, expected: StellarCatalogReference): asserts value is StellarCatalogPublication {
  assertStellarCatalogReference(expected);
  const catalog = value as StellarCatalogPublication;
  const limit = expected.catalogVersion === "bsc5p-bright-stars.v1" ? 5 : 6.5;
  const count = expected.catalogVersion === "bsc5p-bright-stars.v1" ? 1630 : 8404;
  if (!catalog || catalog.magnitudeLimit !== limit || catalog.magnitudeBand !== "V" || catalog.colorIndexBand !== "B-V" ||
    !Array.isArray(catalog.rows) || catalog.rows.length !== count || !Array.isArray(catalog.sources) || !catalog.sources.length)
    throw new TypeError("stellar_publication_invalid:shape");
  const geometry: StellarGeometryRow[] = [];
  for (const row of catalog.rows) {
    if (!Array.isArray(row) || row.length !== 10 ||
      row[1] !== null && (typeof row[1] !== "string" || !row[1].trim() || row[1].length > 100) ||
      typeof row[2] !== "number" || !Number.isFinite(row[2]) || row[2] < -2 || row[2] > limit ||
      row[3] !== null && (typeof row[3] !== "number" || !Number.isFinite(row[3])))
      throw new TypeError("stellar_publication_invalid:photometry");
    geometry.push([row[0], row[4], row[5], row[6], row[7], row[8], row[9]]);
  }
  assertStellarGeometryCatalog({ ...catalog, rows: geometry }, expected);
  const seen = new Set<string>();
  for (const source of catalog.sources) {
    if (!source || typeof source.id !== "string" || !source.id || seen.has(source.id) ||
      typeof source.title !== "string" || !source.title.trim() || typeof source.provider !== "string" || !source.provider.trim() ||
      typeof source.sourceUrl !== "string" || !source.sourceUrl.startsWith("https://") ||
      typeof source.license !== "string" || !source.license.trim() ||
      typeof source.licenseUrl !== "string" || !source.licenseUrl.startsWith("https://") ||
      typeof source.precision !== "string" || !source.precision.trim() || source.state !== "FRESH" ||
      source.confidence !== null && (typeof source.confidence !== "number" || !Number.isFinite(source.confidence) || source.confidence < 0 || source.confidence > 1) ||
      [source.publishedAt, source.validFrom, source.validTo].some(date => date !== null &&
        (typeof date !== "string" || !Number.isFinite(Date.parse(date)))) ||
      typeof source.retrievedAt !== "string" || !Number.isFinite(Date.parse(source.retrievedAt)) ||
      !["OPEN_DATA", "OFFICIAL_REFERENCE"].includes(source.kind) ||
      !Array.isArray(source.limitations) || source.limitations.some((text: unknown) => typeof text !== "string"))
      throw new TypeError("stellar_publication_invalid:source");
    seen.add(source.id);
  }
}
