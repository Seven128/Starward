/**
 * Public Gaia DR3 catalog boundary.
 *
 * Manifest/asset integrity and WGS84 projection live in separate owners so
 * callers retain the original import path without coupling those concerns.
 */

export * from "./gaia-catalog-data.ts";
export * from "./gaia-catalog-integrity.ts";
export * from "./gaia-catalog-projection.ts";
