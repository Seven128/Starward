/**
 * Reproducible build-time acquisition for the bounded Hipparcos bright-star
 * pack used by the Mini Program sky scene. Runtime product code never calls
 * either remote source.
 */

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const VIZIER_URL = "https://vizier.cds.unistra.fr/viz-bin/asu-tsv";
const VIZIER_CATALOG = "I/239/hip_main";
const VIZIER_QUERY = new URLSearchParams({
  "-source": VIZIER_CATALOG,
  Vmag: "-2..5.0",
  "-out": "HIP,RAICRS,DEICRS,pmRA,pmDE,Vmag,B-V,HD,SpType",
  "-sort": "Vmag",
  "-out.max": "unlimited",
}).toString();
const WGSN_URL = "https://exopla.net/star-names/modern-iau-star-names/";
const OUTPUT_DIRECTORY = resolve("packages/astronomy-core/data");

type HipparcosRow = {
  sourceId: string;
  hip: string;
  raDeg: number;
  decDeg: number;
  pmRaMasYr: number;
  pmDecMasYr: number;
  refEpoch: 1991.25;
  vMag: number;
  bV: number | null;
  hd: string | null;
  spectralType: string | null;
  properName: string | null;
};

function hash(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/gu, "")
    .replace(/&amp;/gu, "&")
    .replace(/&#0*39;|&apos;/gu, "'")
    .replace(/&quot;/gu, '"')
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&nbsp;|&#160;/gu, " ")
    .trim();
}

function parseWgsnNames(html: string) {
  const names = new Map<string, string>();
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const cells = [...row[1]!.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/giu)]
      .map((cell) => decodeHtml(cell[1]!));
    const name = cells[0];
    const hip = cells[3];
    if (name && hip && /^\d{1,6}$/u.test(hip)) names.set(hip, name);
  }
  return names;
}

function requiredNumber(value: string, field: string) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) throw new Error(`hipparcos_${field}_invalid`);
  return parsed;
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) throw new Error("hipparcos_optional_number_invalid");
  return parsed;
}

function parseVizier(tsv: string, names: ReadonlyMap<string, string>) {
  const lines = tsv.split(/\r?\n/u);
  const headerIndex = lines.findIndex((line) => line === "HIP\tRAICRS\tDEICRS\tpmRA\tpmDE\tVmag\tB-V\tHD\tSpType");
  if (headerIndex < 0) throw new Error("hipparcos_header_missing");
  const rows: HipparcosRow[] = [];
  for (const line of lines.slice(headerIndex + 3)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const fields = line.split("\t");
    if (fields.length !== 9) throw new Error("hipparcos_row_shape_invalid");
    const hip = fields[0]!.trim();
    if (!/^\d{1,6}$/u.test(hip)) throw new Error("hipparcos_id_invalid");
    rows.push({
      sourceId: `HIP:${hip}`,
      hip,
      raDeg: requiredNumber(fields[1]!, "ra"),
      decDeg: requiredNumber(fields[2]!, "dec"),
      pmRaMasYr: requiredNumber(fields[3]!, "pmra"),
      pmDecMasYr: requiredNumber(fields[4]!, "pmde"),
      refEpoch: 1991.25,
      vMag: requiredNumber(fields[5]!, "vmag"),
      bV: optionalNumber(fields[6]!),
      hd: fields[7]!.trim() || null,
      spectralType: fields[8]!.trim() || null,
      properName: names.get(hip) ?? null,
    });
  }
  if (rows.length === 0 || rows.length > 2048)
    throw new Error("hipparcos_row_count_invalid");
  const ids = new Set<string>();
  for (const [index, row] of rows.entries()) {
    if (ids.has(row.sourceId)) throw new Error("hipparcos_duplicate_id");
    ids.add(row.sourceId);
    if (row.vMag < -2 || row.vMag > 5) throw new Error("hipparcos_magnitude_invalid");
    const previous = rows[index - 1];
    if (previous && (previous.vMag > row.vMag ||
      (previous.vMag === row.vMag && Number(previous.hip) > Number(row.hip))))
      throw new Error("hipparcos_order_invalid");
  }
  for (const [hip, name] of [["32349", "Sirius"], ["91262", "Vega"], ["11767", "Polaris"]] as const) {
    const row = rows.find((candidate) => candidate.hip === hip);
    if (!row || row.properName !== name)
      throw new Error(`hipparcos_required_identity_missing:${name}`);
  }
  return rows;
}

async function fetchBytes(url: string) {
  const response = await fetch(url, { redirect: "error" });
  if (!response.ok) throw new Error(`hipparcos_source_http_${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function buildHipparcosBrightStarCatalog() {
  const vizierSourceUrl = `${VIZIER_URL}?${VIZIER_QUERY}`;
  const retrievedAt = new Date().toISOString();
  const [vizierBytes, wgsnBytes] = await Promise.all([
    fetchBytes(vizierSourceUrl),
    fetchBytes(WGSN_URL),
  ]);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const rows = parseVizier(decoder.decode(vizierBytes), parseWgsnNames(decoder.decode(wgsnBytes)));
  const pack = {
    schemaVersion: "hipparcos-bright-stars-v1",
    catalogVersion: "hipparcos-bright-stars.v1",
    release: "Hipparcos Main Catalogue (ESA 1997)",
    frame: "ICRS",
    referenceEpoch: 1991.25,
    magnitudeBand: "V",
    magnitudeLimit: 5,
    rows,
  } as const;
  const packText = JSON.stringify(pack);
  const manifest = {
    schemaVersion: "hipparcos-bright-stars-manifest-v1",
    catalogVersion: pack.catalogVersion,
    sources: {
      hipparcos: {
        catalog: VIZIER_CATALOG,
        queryUrl: vizierSourceUrl,
        responseSha256: hash(vizierBytes),
        responseBytes: vizierBytes.byteLength,
        credit: "ESA (1997), The Hipparcos and Tycho Catalogues; VizieR catalogue I/239",
        landingUrl: "https://cdsarc.cds.unistra.fr/viz-bin/cat/I/239",
        serviceCredit: "VizieR catalogue access tool, CDS, Strasbourg, France (DOI 10.26093/cds/vizier)",
        rightsUrl: "https://cds.unistra.fr/vizier-org/licences_vizier.html",
      },
      names: {
        provider: "IAU Working Group on Star Names",
        sourceUrl: WGSN_URL,
        responseSha256: hash(wgsnBytes),
        responseBytes: wgsnBytes.byteLength,
        usage: "IAU proper names and HIP cross-identifiers only",
      },
    },
    query: { vMagnitudeRange: [-2, 5], requiredFields: ["HIP", "RAICRS", "DEICRS", "pmRA", "pmDE", "Vmag"] },
    rowCount: rows.length,
    namedRowCount: rows.filter((row) => row.properName).length,
    rowOrder: "Vmag ASC, HIP numeric ASC",
    derivedAssetSha256: hash(packText),
    derivedAssetBytes: new TextEncoder().encode(packText).byteLength,
    retrievedAt,
    derivation: {
      description: "Complete Hipparcos main-catalogue rows in the bounded V=-2..5 interval, joined to IAU WGSN proper names only by the published HIP identifier.",
      properMotion: "linear_tangent_plane_from_ref_epoch_julian_year",
      runtimeNetwork: "forbidden",
      rawResponseRetained: false,
    },
  } as const;
  await writeFile(resolve(OUTPUT_DIRECTORY, "hipparcos-bright-stars.v1.json"), packText);
  await writeFile(resolve(OUTPUT_DIRECTORY, "hipparcos-bright-stars.v1.manifest.json"), JSON.stringify(manifest));
  return manifest;
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/gu, "/")}`).href) {
  buildHipparcosBrightStarCatalog().then((manifest) => {
    process.stdout.write(`${JSON.stringify(manifest)}\n`);
  }).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
