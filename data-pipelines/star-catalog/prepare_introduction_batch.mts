/** Offline preflight of cached English Wikipedia input. No translation or prose publication. */
import { createHash } from "node:crypto";
import { readFile, stat, mkdir, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { qualifiedBscReferences } from "./enrich_wikidata_chinese_aliases.mjs";
import { loadBsc5pStarCatalog, type Bsc5pCatalog } from "../../packages/astronomy-core/src/bsc5p-catalog.ts";
import { parseChineseIntroductionIndex, createChineseIntroductionLookup, CHINESE_INTRODUCTION_PUBLICATION }
  from "../../workers/miniapp-api/src/celestial-object-introductions.ts";

type Pin = { path: string; bytes: number; sha256: string };
type InputRow = { key: string; title: string; revision: string; entityId: string; entitySourceSha256?: string;
  sourceUrl: string; source: Pin; retrievedAt: string };
type Inspection = { status: string; rows: InputRow[];
  entities: { source: Pin; id: string; revision: number }[]; terms: Pin; termsUrl: string };
type Candidate = { inputKey: string; reference: string; identity: { hr: string; hd: string; hip: string | null };
  article: { sourceUrl: string; title: string; revision: string; pin: Pin };
  entity: { id: string; revision: number; pin: Pin }; sourceParagraphs: string[];
  warnings: string[]; license: string; licenseUrl: string; state: string;
  recordedSourceTime: string; sourceTimeMeaning: string };
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const normalize = (value: string) => value.replaceAll("_", " ").replace(/\s+/gu, " ").trim();
const articleLicensePath = "/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License";
function fail(reason: string): never { throw Error(`introduction_input_${reason}`); }
function checkPin(pin: Pin, bytes: Uint8Array) {
  if (!pin || !Number.isSafeInteger(pin.bytes) || pin.bytes < 1 || !/^[a-f0-9]{64}$/u.test(pin.sha256)) fail("pin_invalid");
  if (bytes.length !== pin.bytes || hash(bytes) !== pin.sha256) fail("source_pin_mismatch");
  return bytes;
}

function fixedArticleUrl(row: InputRow) {
  const url = new URL(row.sourceUrl);
  if (url.protocol !== "https:" || url.hostname !== "en.wikipedia.org" || url.port ||
      url.username || url.password || url.hash || url.pathname !== "/w/index.php" ||
      [...url.searchParams.keys()].length !== 2 || url.searchParams.getAll("oldid").length !== 1 ||
      url.searchParams.getAll("title").length !== 1 || !/^[1-9]\d*$/u.test(row.revision) ||
      url.searchParams.get("oldid") !== row.revision ||
      !url.searchParams.get("title")?.trim()) fail("fixed_url_invalid");
  // A request alias can redirect to the actual title. oldid identifies the
  // revision; the article's own revision/title/entity and catalog remain bound below.
}

function configValue(html: string, key: string, numeric = false) {
  const expression = numeric ? `"${key}":([1-9]\\d*)` : `"${key}":("(?:[^"\\\\]|\\\\.)*")`;
  const values = [...new Set([...html.matchAll(new RegExp(expression, "gu"))]
    .map(match => numeric ? match[1] : JSON.parse(match[1]!)))];
  if (values.length !== 1) fail("article_configuration_invalid");
  return values[0] as string;
}

/** Flatten cached data records only. No history links, source fetches or edition execution. */
export async function collectCachedIntroductionInputs(policy: Inspection,
  receipts: { path: string; value: Inspection }[], readPinned: (pin: Pin) => Promise<Uint8Array>) {
  const rows = new Map<string, InputRow>(), entities = new Map<string, Inspection["entities"][number]>();
  const exceptions: { path: string; title: string; reason: string }[] = [];
  const recoveredBindings: { path: string; title: string; entityId: string; source: Pin }[] = [];
  let outsideSourceFamily = 0, duplicates = 0;
  for (const receipt of receipts) {
    for (const original of receipt.value.rows ?? []) {
      const row = { ...original };
      if (typeof row.sourceUrl !== "string" || !row.sourceUrl.startsWith("https://en.wikipedia.org/")) {
        outsideSourceFamily++; continue;
      }
      if (!row.entityId && row.source) {
        try {
          const html = Buffer.from(checkPin(row.source, await readPinned(row.source))).toString("utf8");
          if (configValue(html, "wgRevisionId", true) !== row.revision ||
              normalize(configValue(html, "wgPageName")) !== normalize(row.title)) fail("legacy_article_binding_mismatch");
          row.entityId = configValue(html, "wgWikibaseItemId");
          recoveredBindings.push({ path: receipt.path, title: row.title, entityId: row.entityId, source: row.source });
        } catch (error) { exceptions.push({ path: receipt.path, title: row.title, reason: String(error) }); continue; }
      }
      const bindings = (receipt.value.entities ?? []).filter(entity => entity.id === row.entityId);
      if (!row.source || bindings.length !== 1 || !bindings[0]?.source || !row.revision || !row.retrievedAt) {
        exceptions.push({ path: receipt.path, title: row.title, reason: "cached_record_binding_not_supported" }); continue;
      }
      const entity = bindings[0]!, key = hash(Buffer.from(JSON.stringify([row.sourceUrl, row.source.sha256, entity.source.sha256])));
      if (rows.has(key)) { duplicates++; continue; }
      rows.set(key, { key, title: row.title, revision: row.revision, entityId: row.entityId,
        sourceUrl: row.sourceUrl, source: row.source, retrievedAt: row.retrievedAt, entitySourceSha256: entity.source.sha256 });
      entities.set(entity.source.sha256, entity);
    }
  }
  return { inspection: { status: "SOURCE_INSPECTION_NOT_ADOPTION", rows: [...rows.values()],
    entities: [...entities.values()], terms: policy.terms, termsUrl: policy.termsUrl },
    exceptions, recoveredBindings, outsideSourceFamily, duplicates, metadataReceipts: receipts.length, historyLinksFollowed: 0 };
}

export async function prepareIntroductionInputs(inspection: Inspection, catalog: Readonly<Bsc5pCatalog>,
  readPinned: (pin: Pin) => Promise<Uint8Array>, admittedReferences: ReadonlySet<string> = new Set()) {
  if (inspection.status !== "SOURCE_INSPECTION_NOT_ADOPTION" || !Array.isArray(inspection.rows) ||
      !Array.isArray(inspection.entities) ||
      new Set(inspection.rows.map(row => row.key)).size !== inspection.rows.length) fail("batch_invalid");
  const boundBytes = async (pin: Pin) => {
    return checkPin(pin, await readPinned(pin));
  };
  // Terms are one batch responsibility, not copied into per-object editions.
  const terms = await boundBytes(inspection.terms);
  if (inspection.termsUrl !== "https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use#7._Licensing_of_Content" ||
      !Buffer.from(terms).toString("utf8").includes("Creative Commons Attribution-ShareAlike 4.0"))
    fail("terms_invalid");
  const stars = new Map(catalog.rows.map(row => [row.sourceId, row]));
  const candidates: Candidate[] = [], exceptions: { key: string; reason: string }[] = [];
  const retainedExisting: { key: string; reference: string; meaning: string }[] = [];
  for (const input of inspection.rows) {
    try {
      fixedArticleUrl(input);
      if (typeof input.retrievedAt !== "string" || !Number.isFinite(Date.parse(input.retrievedAt)) ||
          new Date(input.retrievedAt).toISOString() !== input.retrievedAt) fail("recorded_time_invalid");
      const entityPins = inspection.entities.filter(entity => entity.id === input.entityId &&
        (!input.entitySourceSha256 || entity.source.sha256 === input.entitySourceSha256));
      if (entityPins.length !== 1) fail("entity_binding_invalid");
      const entityPin = entityPins[0]!;
      const entityBytes = await boundBytes(entityPin.source);
      const snapshot = JSON.parse(Buffer.from(entityBytes).toString("utf8"));
      const entities = snapshot.entities && Object.values(snapshot.entities);
      const entity: any = entities?.length === 1 ? entities[0] : null;
      if (entity?.type !== "item" || entity.id !== input.entityId || !/^Q[1-9]\d*$/u.test(entity.id) ||
          !Number.isSafeInteger(entity.lastrevid) || entity.lastrevid !== entityPin.revision) fail("entity_revision_invalid");
      const references = qualifiedBscReferences(entity);
      if (!references.size) fail("qualified_hr_missing");
      if (references.size !== 1) fail("qualified_hr_ambiguous");
      const reference = [...references][0] as string, star = stars.get(reference);
      if (!star) fail("catalog_identity_missing");
      if (star.hd === null) fail("catalog_hd_missing");
      if (admittedReferences.has(reference)) {
        retainedExisting.push({ key: input.key, reference, meaning: "Existing admitted prose retained; this new article is not prepared or qualified." });
        continue;
      }
      const articleBytes = await boundBytes(input.source), html = Buffer.from(articleBytes).toString("utf8");
      if (configValue(html, "wgRevisionId", true) !== input.revision ||
          configValue(html, "wgWikibaseItemId") !== entity.id ||
          normalize(configValue(html, "wgPageName")) !== normalize(input.title)) fail("article_binding_mismatch");
      const dom = new JSDOM(html);
      try {
        const document = dom.window.document;
        const body = [...document.querySelectorAll(".mw-parser-output")]
          .sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))[0];
        if (!body || normalize(document.querySelector("#firstHeading")?.textContent ?? "") !== normalize(input.title) ||
            document.querySelector(".mw-disambig,.dmbox")) fail("article_identity_invalid");
        const license = [...document.querySelectorAll("#footer-info-copyright a")]
          .some(anchor => anchor.textContent?.includes("Creative Commons Attribution-ShareAlike 4.0 License") &&
            anchor.getAttribute("href") === articleLicensePath);
        if (!license) fail("article_license_missing");
        const identityText = [...body.querySelectorAll("table.infobox")].map(node => node.textContent).join(" ");
        for (const [prefix, expected] of [["HR", star.hr], ["HD", star.hd], ["HIP", star.hip]] as const) {
          const codes = new Set([...identityText.matchAll(new RegExp(`\\b${prefix}\\s*([1-9]\\d*)\\b`, "gu"))].map(match => match[1]));
          if (expected === null ? codes.size !== 0 : codes.size !== 1 || !codes.has(expected)) fail("article_catalog_identity_mismatch");
        }
        const sourceParagraphs = [...body.querySelectorAll("p")]
          .filter(node => !node.closest("table,figure,.ambox") && (node.textContent?.trim().length ?? 0) > 20)
          .map(node => node.textContent!.trim());
        if (!sourceParagraphs.length) fail("source_text_missing");
        candidates.push({ inputKey: input.key, reference, identity: { hr: star.hr, hd: star.hd, hip: star.hip },
          article: { sourceUrl: input.sourceUrl, title: input.title, revision: input.revision, pin: input.source },
          entity: { id: entity.id, revision: entity.lastrevid, pin: entityPin.source }, sourceParagraphs,
          warnings: [...body.querySelectorAll(".ambox,.dmbox")].map(node => node.textContent!.trim()),
          license: "CC-BY-SA-4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
          state: "TEXT_REVIEW_REQUIRED", recordedSourceTime: input.retrievedAt,
          sourceTimeMeaning: "Legacy inspector recorded file mtime, not a directly recorded HTTP retrieval time." });
      } finally { dom.window.close(); }
    } catch (error) { exceptions.push({ key: input.key, reason: String(error) }); }
  }
  const counts = new Map<string, number>();
  for (const row of candidates) counts.set(row.reference, (counts.get(row.reference) ?? 0) + 1);
  const admittedInputs = candidates.filter(row => {
    if (counts.get(row.reference) === 1) return true;
    exceptions.push({ key: row.inputKey, reason: "introduction_input_duplicate_object_sources" }); return false;
  });
  return { format: "celestial-introduction-source-inputs-v1", status: exceptions.length ? "PARTIAL_INPUTS_PREPARED" :
    admittedInputs.length || retainedExisting.length ? "INPUTS_PREPARED_NOT_PUBLISHED" : "NO_INPUTS_PREPARED",
    catalog: { version: catalog.catalogVersion, hash: catalog.catalogHash }, candidates: admittedInputs, exceptions, retainedExisting,
    terms: inspection.terms, termsUrl: inspection.termsUrl, networkRequests: 0, mediaFetched: 0,
    catalogMeasurementsChanged: 0, translatedProse: 0, newProseEdition: false };
}

/** Collection failures remain part of the batch outcome, even if every supported row succeeds. */
export async function prepareCachedIntroductionInputs(collection: Awaited<ReturnType<typeof collectCachedIntroductionInputs>>,
  catalog: Readonly<Bsc5pCatalog>, readPinned: (pin: Pin) => Promise<Uint8Array>,
  admittedReferences: ReadonlySet<string> = new Set()) {
  const result = await prepareIntroductionInputs(collection.inspection, catalog, readPinned, admittedReferences);
  return { ...result, collection,
    status: collection.exceptions.length ? "PARTIAL_INPUTS_PREPARED" : result.status };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.length !== 4 && !(process.argv.length === 6 && process.argv[4] === "--cache-dir"))
    fail("usage_prepare_introduction_batch_inspection_output_directory_optional_cache_dir");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const withinRoot = (file: string) => {
    const resolved = path.resolve(root, file), relative = path.relative(root, resolved);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) fail("file_outside_workspace");
    return resolved;
  };
  const input = withinRoot(process.argv[2]!); const output = withinRoot(process.argv[3]!);
  if (!path.relative(root, output).replaceAll("\\", "/").startsWith("output/")) fail("output_not_task_local");
  const pins = new Map<string, Pin>();
  const readPinned = async (pin: Pin) => {
    if (!Number.isSafeInteger(pin.bytes) || pin.bytes < 1 || !/^[a-f0-9]{64}$/u.test(pin.sha256)) fail("pin_invalid");
    const file = withinRoot(pin.path);
    if ((await stat(file)).size !== pin.bytes) fail("source_length_mismatch");
    const bytes = await readFile(file);
    if (bytes.length !== pin.bytes || hash(bytes) !== pin.sha256) fail("source_hash_mismatch");
    pins.set(pin.path, { ...pin }); return bytes;
  };
  const inputBytes = await readFile(input);
  const policy: Inspection = JSON.parse(inputBytes.toString("utf8"));
  let inspection = policy, collection: Awaited<ReturnType<typeof collectCachedIntroductionInputs>> | null = null;
  if (process.argv[5]) {
    const directory = withinRoot(process.argv[5]), receipts: { path: string; value: Inspection }[] = [];
    // Flat source-cache metadata only; never follow previousTurn/previousSeal or other history links.
    for (const name of (await readdir(directory)).filter(name => /-text-inspection-.*\.json$/u.test(name)).sort()) {
      const file = path.join(directory, name), bytes = await readFile(file);
      const pin = { path: path.relative(root, file).replaceAll("\\", "/"), bytes: bytes.length, sha256: hash(bytes) };
      pins.set(pin.path, pin); receipts.push({ path: pin.path, value: JSON.parse(bytes.toString("utf8")) });
    }
    collection = await collectCachedIntroductionInputs(policy, receipts, readPinned);
  } else {
    collection = await collectCachedIntroductionInputs(policy,
      [{ path: path.relative(root, input).replaceAll("\\", "/"), value: policy }], readPinned);
  }
  inspection = collection.inspection;
  const admissionPath = "workers/miniapp-api/assets/celestial-object-introductions.index.json";
  const admissionBytes = await readFile(path.join(root, admissionPath));
  pins.set(admissionPath, { path: admissionPath, bytes: admissionBytes.length, sha256: hash(admissionBytes) });
  const publicationPath = `workers/miniapp-api/assets/${CHINESE_INTRODUCTION_PUBLICATION.file}`;
  const publicationBytes = await readFile(path.join(root, publicationPath));
  const admittedReferences = parseChineseIntroductionIndex(admissionBytes);
  // Reuse the runtime's exact publication/hash/full-membership guard before skipping existing prose.
  createChineseIntroductionLookup(() => publicationBytes, () => admissionBytes)([...admittedReferences][0]!);
  pins.set(publicationPath, { path: publicationPath, bytes: publicationBytes.length, sha256: hash(publicationBytes) });
  const result = await prepareCachedIntroductionInputs(collection, loadBsc5pStarCatalog("bsc5p-bright-stars.v3"),
    readPinned, admittedReferences);
  for (const pin of [...pins.values()]) await readPinned(pin);
  if (!(await readFile(input)).equals(inputBytes)) fail("inspection_changed");
  await mkdir(output, { recursive: false });
  await writeFile(path.join(output, "result.json"), JSON.stringify({ ...result, sourcePins: [...pins.values()],
    inspection: { path: path.relative(root, input).replaceAll("\\", "/"), bytes: inputBytes.length, sha256: hash(inputBytes) },
    verifiedSourcePinsUnchanged: true,
    sourceInputsUnchanged: result.exceptions.length || collection.exceptions.length || result.retainedExisting.length ? null : true,
    verificationScope: "Only listed sourcePins were read and verified; retained prose does not qualify its new article input." }, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: result.status, candidates: result.candidates.length, exceptions: result.exceptions,
    retainedExisting: result.retainedExisting.length, collectedRows: inspection.rows.length,
    collectorExceptions: collection?.exceptions.length ?? 0, networkRequests: 0, translatedProse: 0, newProseEdition: false }));
}
