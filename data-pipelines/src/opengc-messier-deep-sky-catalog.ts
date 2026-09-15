/**
 * Reproducible build-time acquisition of the galaxy/nebula subset of the
 * Messier cross-identifications in OpenNGC. Runtime code never downloads the
 * catalog. The derived data remains CC BY-SA 4.0.
 */

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OPENNGC_COMMIT = "36cb178a0f69dba8bfc03a99c10512831edf1c6b";
const SOURCE_URL = `https://raw.githubusercontent.com/mattiaverga/OpenNGC/${OPENNGC_COMMIT}/database_files/NGC.csv`;
const OUTPUT_DIRECTORY = fileURLToPath(new URL("../../packages/astronomy-core/data/", import.meta.url));
const INCLUDED_TYPES = new Map([
  ["G", "GALAXY"],
  ["Neb", "NEBULA"],
  ["EmN", "NEBULA"],
  ["RfN", "NEBULA"],
  ["HII", "NEBULA"],
  ["PN", "NEBULA"],
  ["SNR", "NEBULA"],
  ["Cl+N", "NEBULA"],
] as const);

function hash(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseRa(value: string) {
  const match = /^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)$/u.exec(value);
  if (!match) throw new Error("opengc_ra_invalid");
  return (Number(match[1]) + Number(match[2]) / 60 + Number(match[3]) / 3600) * 15;
}

function parseDec(value: string) {
  const match = /^([+-])(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)$/u.exec(value);
  if (!match) throw new Error("opengc_dec_invalid");
  const absolute = Number(match[2]) + Number(match[3]) / 60 + Number(match[4]) / 3600;
  return match[1] === "-" ? -absolute : absolute;
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error("opengc_number_invalid");
  return number;
}

function csvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/u, "");
  for (let index = 0; index < source.length; index++) {
    const character = source[index]!;
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') { value += '"'; index++; }
      else if (character === '"') quoted = false;
      else value += character;
      continue;
    }
    if (character === '"') { quoted = true; continue; }
    if (character === ";") { row.push(value); value = ""; continue; }
    if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index++;
      row.push(value); value = "";
      if (row.some((field) => field.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    value += character;
  }
  if (quoted) throw new Error("opengc_unclosed_quote");
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function parseCsv(text: string) {
  const records = csvRows(text);
  const headings = records.shift();
  if (!headings || headings[0] !== "Name" || !headings.includes("M"))
    throw new Error("opengc_header_invalid");
  const column = new Map(headings.map((heading, index) => [heading, index]));
  const get = (fields: readonly string[], name: string) => fields[column.get(name)!] ?? "";
  const rows = records.flatMap((fields) => {
    if (fields.length !== headings.length) throw new Error("opengc_row_shape_invalid");
    const messierRaw = get(fields, "M").trim();
    const kind = INCLUDED_TYPES.get(get(fields, "Type") as keyof typeof INCLUDED_TYPES);
    if (!messierRaw || !kind) return [];
    const messier = Number(messierRaw);
    if (!Number.isInteger(messier) || messier < 1 || messier > 110)
      throw new Error("opengc_messier_invalid");
    const ngcName = get(fields, "Name").replace(/^NGC0*/u, "NGC ");
    const commonNames = get(fields, "Common names").split(",").map((value) => value.trim()).filter(Boolean);
    const majorAxisArcmin = optionalNumber(get(fields, "MajAx"));
    const minorAxisArcmin = optionalNumber(get(fields, "MinAx"));
    return [{
      objectRef: `M:${messier}`,
      messier,
      ngcName,
      kind,
      raDeg: parseRa(get(fields, "RA")),
      decDeg: parseDec(get(fields, "Dec")),
      constellation: get(fields, "Const"),
      majorAxisArcmin,
      minorAxisArcmin,
      positionAngleDeg: optionalNumber(get(fields, "PosAng")),
      vMag: optionalNumber(get(fields, "V-Mag")),
      commonNames,
      openNgcType: get(fields, "Type"),
    }];
  }).sort((left, right) => left.messier - right.messier);
  if (rows.length !== 51) throw new Error(`opengc_expected_51_rows:${rows.length}`);
  if (new Set(rows.map((row) => row.objectRef)).size !== rows.length)
    throw new Error("opengc_duplicate_identity");
  for (const required of ["M:31", "M:42"])
    if (!rows.some((row) => row.objectRef === required))
      throw new Error(`opengc_required_identity_missing:${required}`);
  return rows;
}

export async function buildOpenNgcMessierDeepSkyCatalog() {
  const retrievedAt = new Date().toISOString();
  const response = await fetch(SOURCE_URL, { redirect: "error" });
  if (!response.ok) throw new Error(`opengc_source_http_${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const rows = parseCsv(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  const pack = {
    schemaVersion: "opengc-messier-deep-sky-v1",
    catalogVersion: "opengc-messier-deep-sky.v20260501",
    frame: "ICRS J2000",
    license: "CC-BY-SA-4.0",
    rows,
  } as const;
  const packText = JSON.stringify(pack);
  const manifest = {
    schemaVersion: "opengc-messier-deep-sky-manifest-v1",
    catalogVersion: pack.catalogVersion,
    source: {
      provider: "OpenNGC contributors",
      release: "v20260501",
      commit: OPENNGC_COMMIT,
      sourceUrl: SOURCE_URL,
      landingUrl: "https://github.com/mattiaverga/OpenNGC/tree/36cb178a0f69dba8bfc03a99c10512831edf1c6b",
      license: "CC-BY-SA-4.0",
      licenseUrl: "https://github.com/mattiaverga/OpenNGC/blob/36cb178a0f69dba8bfc03a99c10512831edf1c6b/LICENSES/CC-BY-SA-4.0.txt",
      responseSha256: hash(bytes),
      responseBytes: bytes.byteLength,
    },
    selection: {
      messierCrossIdentificationRequired: true,
      includedOpenNgcTypes: [...INCLUDED_TYPES.keys()],
      kinds: ["GALAXY", "NEBULA"],
    },
    rowCount: rows.length,
    rowOrder: "Messier number ascending",
    derivedAssetSha256: hash(packText),
    derivedAssetBytes: new TextEncoder().encode(packText).byteLength,
    retrievedAt,
    runtimeNetwork: "forbidden",
  } as const;
  await writeFile(resolve(OUTPUT_DIRECTORY, "opengc-messier-deep-sky.v1.json"), packText);
  await writeFile(resolve(OUTPUT_DIRECTORY, "opengc-messier-deep-sky.v1.manifest.json"), JSON.stringify(manifest));
  return manifest;
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/gu, "/")}`).href) {
  buildOpenNgcMessierDeepSkyCatalog().then((manifest) => process.stdout.write(`${JSON.stringify(manifest)}\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
