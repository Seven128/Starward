/** Deterministic Gaia pack derivation and manifest construction. */

import { createHash } from "node:crypto";

import {
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
  type GaiaDr3BrightStarPack,
  type GaiaDr3Manifest,
} from "../../packages/astronomy-core/src/gaia-catalog-data.ts";
import { parseGaiaDr3Csv } from "./gaia-star-catalog-csv.ts";
import { fail } from "./gaia-star-catalog-errors.ts";

export interface BuiltGaiaDr3Asset {
  pack: GaiaDr3BrightStarPack;
  packBytes: Uint8Array;
  manifest: GaiaDr3Manifest;
  sourceResponseSha256: string;
  sourceResponseBytes: number;
}

const DATA_TERMS_URL =
  "https://gea.esac.esa.int/archive/documentation/GDR3/Miscellaneous/sec_credit_and_citation_instructions/";

export function canonicalPackBytes(pack: GaiaDr3BrightStarPack): Uint8Array {
  return new TextEncoder().encode(canonicalJson(pack));
}

export function sha256(value: Uint8Array | string): string {
  return createHash("sha256")
    .update(typeof value === "string" ? Buffer.from(value, "utf8") : value)
    .digest("hex");
}

function createManifest(
  rows: GaiaDr3BrightStarPack["rows"],
  csvBytes: Uint8Array,
  packBytes: Uint8Array,
  retrievedAt: string,
): GaiaDr3Manifest {
  const sourceUrl = `${GAIA_DR3_TAP_URL}?REQUEST=doQuery&LANG=ADQL&FORMAT=csv&QUERY=${encodeURIComponent(GAIA_DR3_ADQL)}`;
  return {
    schemaVersion: "gaia-dr3-bright-stars-manifest-v1",
    catalogVersion: GAIA_DR3_CATALOG_VERSION,
    release: GAIA_DR3_RELEASE,
    officialTapUrl: GAIA_DR3_TAP_URL,
    table: GAIA_DR3_TABLE,
    query: GAIA_DR3_ADQL,
    selectedFields: [...GAIA_DR3_SELECTED_FIELDS],
    filter: {
      magnitudeBand: "G",
      magnitudeLimit: GAIA_DR3_MAGNITUDE_LIMIT,
      maxRows: GAIA_DR3_MAX_ROWS,
      orderBy: ["phot_g_mean_mag ASC", "source_id ASC"],
    },
    rowCount: rows.length,
    rowOrder: "phot_g_mean_mag ASC, source_id ASC",
    sourceResponseSha256: sha256(csvBytes),
    sourceResponseBytes: csvBytes.byteLength,
    derivedAssetSha256: sha256(packBytes),
    derivedAssetBytes: packBytes.byteLength,
    retrievedAt: new Date(retrievedAt).toISOString(),
    attribution: {
      credit: "ESA/Gaia/DPAC",
      acknowledgement:
        "This work has made use of data from the European Space Agency (ESA) mission Gaia (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing and Analysis Consortium (DPAC, https://www.cosmos.esa.int/web/gaia/dpac/consortium). Funding for the DPAC has been provided by national institutions, in particular the institutions participating in the Gaia Multilateral Agreement.",
      sourceUrl,
      dataTermsUrl: DATA_TERMS_URL,
      license: "Open and free to use with ESA/Gaia/DPAC credit",
      terms:
        "Gaia DR3 data are open and free to use provided credit is given to ESA/Gaia/DPAC; access to and use of the Gaia archive website constitutes acceptance of its general terms and conditions.",
    },
    derivation: {
      description:
        "The fixed Gaia DR3 gaiadr3.gaia_source TAP query is reduced to the listed source fields, preserves the official magnitude/source_id ordering, derives BP-RP colour, and is validated without sampling or truncation.",
      properMotion: "linear_tangent_plane_from_ref_epoch_julian_year",
      runtimeNetwork: "forbidden",
      rawResponseRetained: false,
    },
  };
}

export function buildGaiaDr3Asset(
  csvBytes: Uint8Array,
  retrievedAt: string,
): BuiltGaiaDr3Asset {
  if (!/^\d{4}-\d{2}-\d{2}T/u.test(retrievedAt))
    fail("retrieved_at_invalid");
  const csv = new TextDecoder("utf-8", { fatal: true }).decode(csvBytes);
  const rows = parseGaiaDr3Csv(csv);
  if (rows.length !== GAIA_DR3_MAX_ROWS) fail("response_row_count_not_top_cap");
  const pack: GaiaDr3BrightStarPack = {
    schemaVersion: "gaia-dr3-bright-stars-v1",
    catalogVersion: GAIA_DR3_CATALOG_VERSION,
    release: GAIA_DR3_RELEASE,
    frame: "ICRS",
    referenceEpoch: GAIA_DR3_REFERENCE_EPOCH,
    magnitudeBand: "G",
    magnitudeLimit: GAIA_DR3_MAGNITUDE_LIMIT,
    rows,
  };
  const packBytes = canonicalPackBytes(pack);
  if (packBytes.byteLength > GAIA_DR3_MAX_ASSET_BYTES)
    fail("derived_asset_exceeds_capacity");
  const manifest = createManifest(rows, csvBytes, packBytes, retrievedAt);
  return {
    pack,
    packBytes,
    manifest,
    sourceResponseSha256: manifest.sourceResponseSha256,
    sourceResponseBytes: csvBytes.byteLength,
  };
}
