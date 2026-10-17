/** One declared text batch using mature curl and the shared offline admission owner. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { textTransportReceipt } from "./wikimedia_text_input_protocol.mjs";
import { loadBsc5pStarCatalog } from "../../packages/astronomy-core/src/bsc5p-catalog.ts";
import { CHINESE_INTRODUCTION_PUBLICATION, parseChineseIntroductionIndex, createChineseIntroductionLookup }
  from "../../workers/miniapp-api/src/celestial-object-introductions.ts";
import { recordFetchedWikipediaInput, collectCachedIntroductionInputs, prepareCachedIntroductionInputs,
  type Pin, type Inspection, type HttpTextRetrieval } from "./prepare_introduction_batch.mts";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
assert.equal(root.replaceAll("\\", "/").toLowerCase(), "e:/dev/worktrees/starward/remote-main-20260908");
const [inputsPath, cachePath, researchPath, outputPath] = process.argv.slice(2);
if (process.argv.length !== 6 || !inputsPath || !cachePath || !researchPath || !outputPath)
  throw Error("usage: acquire_introduction_articles.mts <article-inputs.json> <cached-preflight.json> <research.json> <new-output-directory>");
const withinRoot = (file: string) => { const full = path.resolve(root, file), relative = path.relative(root, full);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw Error("article_input_outside_workspace"); return full; };
const output = withinRoot(outputPath);
if (!path.relative(root, output).replaceAll("\\", "/").startsWith("output/")) throw Error("article_output_not_task_local");
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const pin = async (file: string): Promise<Pin> => { const bytes = await readFile(withinRoot(file)); return { path: file, bytes: bytes.length, sha256: hash(bytes) }; };
const readPinned = async (expected: Pin) => { const bytes = await readFile(withinRoot(expected.path));
  assert.deepEqual(await pin(expected.path), expected); return bytes; };
const inputs = JSON.parse(await readFile(withinRoot(inputsPath), "utf8"));
if (inputs.format !== "celestial-introduction-article-input-declaration-v1" || !Array.isArray(inputs.selectedReferences) ||
    inputs.selectedReferences.length < 1 || new Set(inputs.selectedReferences).size !== inputs.selectedReferences.length)
  throw Error("article_declaration_invalid");
const discovery = JSON.parse(Buffer.from(await readPinned(inputs.discovery)).toString("utf8"));
if (discovery.status === "FAILED_ENTITY_DISCOVERY" || discovery.execution?.bindingsVerified === false)
  throw Error("article_discovery_execution_unverified");
for (const row of discovery.sourcePins) await readPinned(row);
const selected = inputs.selectedReferences.map((reference: string) => {
  const rows = discovery.candidates.filter((row: any) => row.reference === reference);
  if (rows.length !== 1) throw Error("article_reference_not_discovered");
  const row = rows[0], expected = `https://en.wikipedia.org/wiki/${encodeURIComponent(row.title.replaceAll(" ", "_"))}`;
  if (row.sourceUrl !== expected || row.state !== "ARTICLE_INPUT_NOT_FETCHED_OR_REVIEWED") throw Error("article_url_not_declared");
  return row;
});
const cache = JSON.parse(await readFile(withinRoot(cachePath), "utf8"));
const research = JSON.parse(await readFile(withinRoot(researchPath), "utf8"));
if (typeof research.userAgent !== "string" || !research.userAgent.startsWith("StarwardCloudSkyTextInspection/1.0 (+https://github.com/"))
  throw Error("article_user_agent_invalid");
const indexFile = "workers/miniapp-api/assets/celestial-object-introductions.index.json";
const packFile = `workers/miniapp-api/assets/${CHINESE_INTRODUCTION_PUBLICATION.file}`;
const indexBytes = await readFile(withinRoot(indexFile)), packBytes = await readFile(withinRoot(packFile));
const admitted = parseChineseIntroductionIndex(indexBytes);
createChineseIntroductionLookup(() => packBytes, () => indexBytes)([...admitted][0]!);
const dependencies = ["data-pipelines/star-catalog/acquire_introduction_articles.mts", "data-pipelines/star-catalog/prepare_introduction_batch.mts",
  "data-pipelines/star-catalog/wikimedia_text_input_protocol.mjs", "data-pipelines/star-catalog/enrich_wikidata_chinese_aliases.mjs",
  "workers/miniapp-api/src/celestial-object-introductions.ts", "packages/astronomy-core/src/bsc5p-catalog.ts"];
const dependencyPins = await Promise.all(dependencies.map(pin));
await mkdir(output); await writeFile(path.join(output, "executed-article-collector.mts"), await readFile(fileURLToPath(import.meta.url)), { flag: "wx" });
await writeFile(path.join(output, "source-bindings-before.json"), JSON.stringify(dependencyPins, null, 2) + "\n", { flag: "wx" });
const sourcePins: Pin[] = [...dependencyPins, await pin(inputsPath), inputs.discovery, await pin(cachePath), await pin(researchPath),
  await pin(indexFile), await pin(packFile), ...discovery.sourcePins];
const reused: { path: string; value: Inspection }[] = [];
for (const expected of inputs.reuseInspections ?? []) {
  const value = JSON.parse(Buffer.from(await readPinned(expected)).toString("utf8")); sourcePins.push(expected); reused.push({ path: expected.path, value });
}
const inspection: Inspection = { status: "SOURCE_INSPECTION_NOT_ADOPTION", rows: [], entities: discovery.entities,
  terms: cache.terms, termsUrl: cache.termsUrl, sourceExceptions: [] };
const requests: any[] = [], urlReceipts = new Map<string, HttpTextRetrieval>();
let networkRequests = 0, stopped = false;
for (const candidate of selected) {
  const title = candidate.title;
  if (stopped) { inspection.sourceExceptions!.push({ title, reason: "not_requested_after_shared_source_failure" }); continue; }
  const cached = reused.flatMap(receipt => receipt.value.rows).find(row => row.entityId === candidate.wikidataItem &&
    row.title.replaceAll("_", " ") === title.replaceAll("_", " "));
  if (cached) { await readPinned(cached.source); inspection.rows.push(cached); continue; }
  let retrieval = urlReceipts.get(candidate.sourceUrl), request: any;
  try {
    if (!retrieval) {
      const file = `${outputPath.replaceAll("\\", "/")}/article-${candidate.reference.replace(":", "-")}.html`;
      const startedAt = new Date().toISOString(); networkRequests++;
      const result = spawnSync("curl.exe", ["--silent", "--show-error", "--location", "--compressed", "--proto", "=https", "--proto-redir", "=https",
        "--max-redirs", "3", "--max-time", "35", "--user-agent", research.userAgent, "--output", withinRoot(file), "--write-out",
        '{"httpStatus":%{http_code},"effectiveUrl":"%{url_effective}","downloadedBytes":%{size_download},"wallSeconds":%{time_total}}', candidate.sourceUrl],
      { encoding: "utf8", windowsHide: true, timeout: 40000 });
      request = { reference: candidate.reference, requestUrl: candidate.sourceUrl, startedAt, completedAt: new Date().toISOString(),
        ...textTransportReceipt(result) };
      try { request.source = await pin(file); sourcePins.push(request.source); } catch { /* Failed transport may leave no bytes. */ }
      requests.push(request);
      await writeFile(path.join(output, `article-${candidate.reference.replace(":", "-")}-receipt.json`), JSON.stringify(request, null, 2) + "\n", { flag: "wx" });
      if (request.httpStatus !== 200 || request.exitCode !== 0 || request.error || !request.source) {
        stopped = request.httpStatus !== 404;
        throw Error("article_http_unavailable");
      }
      retrieval = { requestUrl: request.requestUrl, effectiveUrl: request.effectiveUrl, completedAt: request.completedAt,
        httpStatus: 200, source: request.source }; urlReceipts.set(candidate.sourceUrl, retrieval);
    }
    const row = recordFetchedWikipediaInput(await readPinned(retrieval.source), retrieval.source, retrieval);
    if (row.entityId !== candidate.wikidataItem) throw Error(`article_producer_entity_mismatch:${row.entityId}`);
    row.entitySourceSha256 = candidate.entity.source.sha256; inspection.rows.push(row);
  } catch (error) { inspection.sourceExceptions!.push({ title, reason: String(error) }); }
  console.log(JSON.stringify({ reference: candidate.reference, sourcesRecorded: inspection.rows.length, sourceExceptions: inspection.sourceExceptions!.length }));
}
const inspectionPath = `${outputPath.replaceAll("\\", "/")}/inspection.json`;
await writeFile(withinRoot(inspectionPath), JSON.stringify(inspection, null, 2) + "\n", { flag: "wx" }); sourcePins.push(await pin(inspectionPath));
const collection = await collectCachedIntroductionInputs(inspection, [{ path: inspectionPath, value: inspection }], readPinned);
const used = new Map<string, Pin>();
const prepared = await prepareCachedIntroductionInputs(collection, loadBsc5pStarCatalog("bsc5p-bright-stars.v3"),
  async expected => { used.set(expected.path, expected); return readPinned(expected); }, admitted);
for (const row of used.values()) sourcePins.push(row);
for (const expected of sourcePins) await readPinned(expected);
assert.deepEqual(await Promise.all(dependencies.map(pin)), dependencyPins);
await writeFile(path.join(output, "source-bindings-after.json"), JSON.stringify(dependencyPins, null, 2) + "\n", { flag: "wx" });
const result = { ...prepared, sourcePins: [...new Map(sourcePins.map(row => [row.path, row])).values()], requests,
  sourceAcquisitionRequests: networkRequests, mediaFetched: 0, selectedReferences: inputs.selectedReferences,
  sourceInputsUnchanged: true, candidateMeaning: "Fixed text/source inputs only. No translation, prose edition, runtime adoption or image acquisition." };
await writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: result.status, selected: selected.length, recorded: inspection.rows.length,
  candidates: result.candidates.length, identityExceptions: result.exceptions.length, sourceExceptions: result.collection.exceptions.length,
  sourceAcquisitionRequests: networkRequests, mediaFetched: 0 }));
