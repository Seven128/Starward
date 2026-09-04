/**
 * Public compatibility facade for the Gaia DR3 build-time pipeline.
 *
 * The implementation is split by owner: CSV parsing/validation, deterministic
 * asset derivation, network acquisition, filesystem publication and CLI
 * orchestration each live in their own module. Keep this facade stable for
 * package scripts and existing pipeline callers.
 */

export {
  GAIA_DR3_ADQL,
  GAIA_DR3_CATALOG_VERSION,
  GAIA_DR3_MAX_ASSET_BYTES,
  GAIA_DR3_MAX_ROWS,
  GAIA_DR3_MAGNITUDE_LIMIT,
  GAIA_DR3_REFERENCE_EPOCH,
  GAIA_DR3_RELEASE,
  GAIA_DR3_SELECTED_FIELDS,
  GAIA_DR3_TABLE,
  GAIA_DR3_TAP_URL,
  canonicalJson,
  validateGaiaDr3Pack,
  validateGaiaDr3Rows,
} from "../../packages/astronomy-core/src/gaia-catalog-data.ts";

export type {
  GaiaDr3BrightStarPack,
  GaiaDr3Manifest,
  GaiaDr3Row,
} from "../../packages/astronomy-core/src/gaia-catalog-data.ts";

export {
  buildGaiaDr3Asset,
  canonicalPackBytes,
  sha256,
} from "./gaia-star-catalog-asset.ts";
export type { BuiltGaiaDr3Asset } from "./gaia-star-catalog-asset.ts";
export { parseGaiaDr3Csv } from "./gaia-star-catalog-csv.ts";
export { fetchGaiaDr3Csv } from "./gaia-star-catalog-fetch.ts";
export { writeGaiaDr3Asset } from "./gaia-star-catalog-write.ts";

import {
  isGaiaStarCatalogEntry,
  runGaiaStarCatalogCli,
} from "./gaia-star-catalog-cli.ts";

if (isGaiaStarCatalogEntry(process.argv[1], import.meta.url)) {
  void runGaiaStarCatalogCli();
}
