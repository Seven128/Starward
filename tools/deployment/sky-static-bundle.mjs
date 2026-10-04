import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const skyStaticHash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const HASH = "[a-f0-9]{64}";
const SAO_ROUTE = new RegExp(`^/v2/sky/supplements/sao/v2/${HASH}/assets/\\d{2}-\\d{2}-(?:7|8|9|10)-\\d{1,3}$`);
const ROUTE = new RegExp(`^/v2/sky/(?:(?:moon(?:/coverage)?|mars|mercury|jupiter|saturn|uranus|neptune|galactic|landscape|sdss-optical)/${HASH}/[A-Za-z0-9_.-]+\\.(?:jpg|png|json|zip)|prepared-optical/${HASH}/M-(?:[1-9]|[1-9][0-9]|10[0-9]|110)-(?:overview|medium|detail)\\.png|deep-sky/${HASH}/M-(?:[1-9]|[1-9][0-9]|10[0-9]|110)/M-(?:[1-9]|[1-9][0-9]|10[0-9]|110)-(?:overview|medium|detail)(?:\\.${HASH}\\.png|\\.jpg)|constellations/${HASH}/assets/[A-Za-z0-9_.-]+|wide-field/${HASH}/(?:properties|Norder0/Dir0/Npix(?:[0-9]|1[01])\\.jpg))$`);
export const validSkyStaticRoute = (route) => typeof route === "string" && (ROUTE.test(route) || SAO_ROUTE.test(route)) &&
  !route.includes("//") && route.split("/").every((part) => part !== "." && part !== "..") &&
  (!route.startsWith("/v2/sky/deep-sky/") || route.split("/").at(-1).startsWith(route.split("/").at(-2) + "-"));
const fail = (code) => { throw new Error(`sky_static_${code}`); };
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
const headerNames = new Set(["content-type", "cache-control", "x-content-type-options", "x-starward-image-source", "x-starward-image-field-degrees",
  "x-starward-image-publication-hash", "x-starward-image-source-id", "x-starward-image-pixels", "x-starward-image-missing-pixels", "x-starward-image-display-support", "x-starward-data-source"]);

export function assertSkyStaticRecord(record) {
  if (!exactKeys(record, ["route", "bytes", "sha256", "headers"]) || !validSkyStaticRoute(record.route) ||
    !Number.isSafeInteger(record.bytes) || record.bytes <= 0 || !/^[a-f0-9]{64}$/.test(record.sha256)) fail("record_invalid");
  if (!record.headers || typeof record.headers !== "object" || Array.isArray(record.headers)) fail("header_invalid");
  for (const [key, value] of Object.entries(record.headers)) {
    if (!headerNames.has(key) || typeof value !== "string" || !value || /[^\x20-\x7e]/.test(value)) fail("header_invalid");
    // Only byte-bound JSON display metadata needs quoted/braced values. Never
    // admit Caddyfile environment interpolation, or executable header names.
    if (key === "x-starward-image-display-support") {
      if (/[$`]/.test(value) || !value.startsWith("{") || !value.endsWith("}")) fail("header_invalid");
      try { if (JSON.stringify(JSON.parse(value)) !== value) fail("header_invalid"); }
      catch { fail("header_invalid"); }
    } else if (/["\\{}]/.test(value)) fail("header_invalid");
  }
  if (record.headers["cache-control"] !== "public, max-age=31536000, immutable" ||
    record.headers["x-content-type-options"] !== "nosniff" || !record.headers["content-type"]) fail("header_invalid");
  return record;
}

/** The caller supplies approved publication records, never an arbitrary file root.
 * Real-file matches leave absent files to the site's API fallback. */
export function skyStaticDeliveryFragment(records) {
  const groups = new Map();
  for (const record of records) {
    assertSkyStaticRecord(record);
    const key = JSON.stringify(record.headers);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  const lines = ["# Generated from validated Starward public publication bytes. API fallback is owned by the importing site."];
  let id = 0;
  for (const grouped of groups.values()) {
    const name = `sky_published_${id++}`;
    lines.push(`@${name} {`, "\tmethod GET HEAD", `\tpath ${grouped.map((r) => r.route).join(" ")}`,
      "\tfile {", "\t\troot /srv/sky-public/files", "\t\ttry_files {path}", "\t}", "}",
      `handle @${name} {`, "\tlog_append sky_delivery static", "\theader {", "\t\tx-starward-sky-delivery static");
    // Raw Caddyfile tokens preserve JSON's own backslashes and quotes. Escape
    // runtime placeholder braces separately; admission excludes raw-token end
    // delimiters and environment substitutions. Simple legacy tokens retain
    // their exact previous serialized bytes.
    for (const [key, value] of Object.entries(grouped[0].headers)) lines.push(`\t\t${key} ${
      key === "x-starward-image-display-support" ? "`" + value.replaceAll("{", "\\\\{") + "`" : JSON.stringify(value)}`);
    lines.push("\t}", "\tfile_server {", "\t\troot /srv/sky-public/files", "\t\tdisable_canonical_uris", "\t}", "}");
  }
  return lines.join("\n") + "\n";
}

export async function readPlainSkyFile(directory, relative) {
  const root = path.resolve(directory);
  const physical = await realpath(root);
  const comparable = (value) => process.platform === "win32" ? value.toLowerCase() : value;
  if (comparable(physical) !== comparable(root)) fail("file_type_invalid");
  if (typeof relative !== "string" || path.isAbsolute(relative) || relative.includes("\\") ||
    relative.split("/").some((part) => !part || part === "." || part === "..")) fail("file_path_invalid");
  const parts = [root, ...relative.split("/")];
  let selected = parts[0];
  for (let i = 0; i < parts.length; i += 1) {
    if (i) selected = path.join(selected, parts[i]);
    const info = await lstat(selected);
    if (info.isSymbolicLink() || (i === parts.length - 1 ? !info.isFile() : !info.isDirectory())) fail("file_type_invalid");
  }
  return readFile(selected);
}

/** Integrity/layout validation is not a license/admission decision. Deployment
 * admits a new bundle only by extracting it from its exact trusted OCI image. */
export async function validateSkyStaticBundle(directory) {
  if (!path.isAbsolute(directory)) fail("bundle_path_not_absolute");
  const index = JSON.parse((await readPlainSkyFile(directory, "index.json")).toString("utf8"));
  if (!exactKeys(index, ["schemaVersion", "publicationHash", "records"]) ||
    index.schemaVersion !== "starward-sky-static-export-v1" || !Array.isArray(index.records) || !index.records.length ||
    skyStaticHash(JSON.stringify(index.records)) !== index.publicationHash) fail("index_invalid");
  const seen = new Set();
  for (const record of index.records) {
    assertSkyStaticRecord(record);
    if (seen.has(record.route)) fail("route_duplicate");
    seen.add(record.route);
    const bytes = await readPlainSkyFile(directory, `files${record.route}`);
    if (bytes.length !== record.bytes || skyStaticHash(bytes) !== record.sha256) fail("file_identity_mismatch");
  }
  const fragment = await readPlainSkyFile(directory, "delivery.caddy");
  if (!fragment.equals(Buffer.from(skyStaticDeliveryFragment(index.records)))) fail("fragment_mismatch");
  return Object.freeze({ directory: path.resolve(directory), ...index,
    files: index.records.length, bytes: index.records.reduce((n, record) => n + record.bytes, 0) });
}

/** Reserve a fresh container, retain failures, promote only the completed child.
 * No existing bundle, file or published version is rewritten or deleted. */
export async function writeSkyStaticBundle(outputDirectory, inputs) {
  if (!path.isAbsolute(outputDirectory)) fail("output_not_absolute");
  const container = path.resolve(outputDirectory), output = path.join(container, "publication");
  await mkdir(path.dirname(container), { recursive: true });
  await mkdir(container, { mode: 0o700 });
  const stage = path.join(container, `.building-${randomUUID()}`);
  await mkdir(stage);
  const records = [], seen = new Set();
  for await (const input of inputs) {
    const record = { route: input.route, bytes: input.bytes.length, sha256: skyStaticHash(input.bytes), headers: input.headers };
    assertSkyStaticRecord(record);
    if (seen.has(record.route)) fail("route_duplicate");
    seen.add(record.route);
    const target = path.join(stage, "files", record.route.slice(1));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.bytes, { flag: "wx" });
    if (!(await readFile(target)).equals(input.bytes)) fail("write_readback_failed");
    records.push(record);
  }
  if (!records.length) fail("empty_bundle");
  records.sort((a, b) => a.route.localeCompare(b.route, "en"));
  const publicationHash = skyStaticHash(JSON.stringify(records));
  await writeFile(path.join(stage, "index.json"), JSON.stringify({ schemaVersion: "starward-sky-static-export-v1", publicationHash, records }, null, 2) + "\n", { flag: "wx" });
  await writeFile(path.join(stage, "delivery.caddy"), skyStaticDeliveryFragment(records), { flag: "wx" });
  await validateSkyStaticBundle(stage);
  await rename(stage, output);
  return Object.freeze({ output, publicationHash, files: records.length, bytes: records.reduce((n, r) => n + r.bytes, 0) });
}

const sameHeaders = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
export function assertSkyStaticContains(container, included) {
  const entries = new Map(container.records.map((record) => [record.route, record]));
  for (const record of included.records) {
    const prior = entries.get(record.route);
    if (!prior || prior.bytes !== record.bytes || prior.sha256 !== record.sha256 || !sameHeaders(prior.headers, record.headers)) fail("history_conflict");
  }
}

export async function mergeSkyStaticBundles({ directories, outputDirectory }) {
  if (!Array.isArray(directories) || !directories.length) fail("merge_input_invalid");
  const bundles = [];
  for (const directory of directories) bundles.push(await validateSkyStaticBundle(directory));
  const entries = new Map();
  for (const bundle of bundles) {
    for (const record of bundle.records) {
      const prior = entries.get(record.route);
      if (prior && (prior.record.bytes !== record.bytes || prior.record.sha256 !== record.sha256 || !sameHeaders(prior.record.headers, record.headers))) fail("history_conflict");
      if (!prior) entries.set(record.route, { directory: bundle.directory, record });
    }
  }
  async function* inputs() {
    for (const { directory, record } of entries.values()) yield {
      route: record.route, headers: record.headers, bytes: await readPlainSkyFile(directory, `files${record.route}`),
    };
  }
  return writeSkyStaticBundle(outputDirectory, inputs());
}
