/** Serial official entity discovery for a declared text batch. No prose or media adoption. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { qualifiedBscReferences } from "./enrich_wikidata_chinese_aliases.mjs";
import { entityBatchUrl, textTransportReceipt } from "./wikimedia_text_input_protocol.mjs";
export { entityBatchUrl } from "./wikimedia_text_input_protocol.mjs";

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
/** Only a real MediaWiki maxlag body permits bounded retry; HTTP 200 is insufficient. */
export function lagRetryDelay(bytes, receipt, attempt) {
  let response; try { response = JSON.parse(Buffer.from(bytes).toString("utf8")); } catch { return null; }
  if (receipt.httpStatus !== 200 || receipt.exitCode !== 0 || receipt.error || response.error?.code !== "maxlag" ||
      attempt >= 2 || !Number.isFinite(response.error.lag) || response.error.lag < 0) return null;
  const retryAfter = receipt.retryAfter === "" || receipt.retryAfter === undefined ? 5 : Number(receipt.retryAfter);
  if (!Number.isFinite(retryAfter) || retryAfter < 0 || retryAfter > 60) return null;
  return Math.max(5 * 2 ** attempt, retryAfter) * 1000;
}
export function inspectEntityBatch(bytes, receipt, requestedIds, pendingRows) {
  const requestUrl = entityBatchUrl(requestedIds);
  if (receipt.requestUrl !== requestUrl || receipt.effectiveUrl !== requestUrl || receipt.httpStatus !== 200 ||
      receipt.exitCode !== 0 || receipt.error || receipt.source?.bytes !== bytes.length ||
      receipt.source?.sha256 !== sha256(bytes) || !Number.isFinite(Date.parse(receipt.completedAt)) ||
      !Number.isFinite(Date.parse(receipt.startedAt)) || receipt.startedAt > receipt.completedAt)
    throw Error("introduction_entity_response_binding_invalid");
  const response = JSON.parse(Buffer.from(bytes).toString("utf8"));
  if (response.success !== 1 || response.error || response.warnings || response.redirects ||
      !response.entities || Array.isArray(response.entities) ||
      JSON.stringify(Object.keys(response.entities).sort()) !== JSON.stringify([...requestedIds].sort()))
    throw Error("introduction_entity_response_invalid");
  const entities = [], candidates = [], exceptions = [];
  for (const id of requestedIds) {
    const entity = response.entities[id];
    if (entity?.id !== id || entity.type !== "item" || !Number.isSafeInteger(entity.lastrevid) || entity.lastrevid < 1 ||
        !Number.isFinite(Date.parse(entity.modified)) || Date.parse(entity.modified) > Date.parse(receipt.completedAt)) {
      exceptions.push({ id, reason: "entity_missing_or_invalid" }); continue;
    }
    const declaration = { source: receipt.source, id, revision: entity.lastrevid,
      container: { format: "wikimedia-wbgetentities-v1", requestUrl, requestedIds,
        startedAt: receipt.startedAt, completedAt: receipt.completedAt, httpStatus: 200 } };
    entities.push(declaration);
    const rows = pendingRows.filter(row => row.wikidataItem === id), references = [...qualifiedBscReferences(entity)];
    for (const row of rows) {
      if (references.length !== 1 || references[0] !== row.reference) {
        exceptions.push({ id, reference: row.reference, reason: "qualified_hr_not_exact", actualQualifiedHR: references }); continue;
      }
      const title = entity.sitelinks?.enwiki?.title;
      if (entity.sitelinks?.enwiki?.site !== "enwiki" || typeof title !== "string" || !title.trim() ||
          title.length > 256 || /[\u0000-\u001f\u007f]/u.test(title)) {
        exceptions.push({ id, reference: row.reference, reason: "english_article_sitelink_missing" }); continue;
      }
      candidates.push({ ...row, title, entity: declaration, sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`,
        state: "ARTICLE_INPUT_NOT_FETCHED_OR_REVIEWED" });
    }
  }
  return { entities, candidates, exceptions };
}

export async function collectIntroductionEntities(
  { declarationPath, outputPath, researchPath, cachedReceiptPath },
  { request = spawnSync, wait = delay => new Promise(resolve => setTimeout(resolve, delay)), log = value => console.log(JSON.stringify(value)) } = {},
) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  assert.equal(root.replaceAll("\\", "/").toLowerCase(), "e:/dev/worktrees/starward/remote-main-20260908");
  const withinRoot = value => {
    const full = path.resolve(root, value), relative = path.relative(root, full);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw Error("entity_input_outside_workspace");
    return full;
  };
  const output = withinRoot(outputPath);
  if (!path.relative(root, output).replaceAll("\\", "/").startsWith("output/")) throw Error("entity_output_not_task_local");
  const pin = async value => { const bytes = await readFile(withinRoot(value)); return { path: value, bytes: bytes.length, sha256: sha256(bytes) }; };
  const plan = JSON.parse(await readFile(withinRoot(declarationPath), "utf8"));
  if (plan.status !== "CURRENT_NAMED_TEXT_INPUT_DECLARATION_NOT_PROSE_ADOPTION" || !Array.isArray(plan.rows) ||
      !Array.isArray(plan.batches) || !Array.isArray(plan.inputs) || !Array.isArray(plan.missingEntityMapping) ||
      plan.remaining !== plan.rows.length || new Set(plan.rows.map(row => row.reference)).size !== plan.rows.length ||
      plan.rows.some(row => !/^HR:[1-9]\d{0,3}$/u.test(row.reference) || row.reference !== `HR:${row.identity?.hr}`))
    throw Error("entity_declaration_invalid");
  const expected = [...new Set(plan.rows.flatMap(row => row.wikidataItem ? [row.wikidataItem] : []))];
  assert.deepEqual(plan.batches.flat(), expected);
  plan.batches.forEach(entityBatchUrl);
  for (const row of plan.inputs) assert.deepEqual(await pin(row.path), row);
  const research = JSON.parse(await readFile(withinRoot(researchPath), "utf8"));
  if (typeof research.userAgent !== "string" || !/^StarwardCloudSkyTextInspection\/1\.0 \(\+https:\/\/github\.com\/[^\s;]+; offline source review\)$/u.test(research.userAgent))
    throw Error("entity_user_agent_invalid");
  const dependencies = ["data-pipelines/star-catalog/collect_introduction_entities.mjs",
    "data-pipelines/star-catalog/wikimedia_text_input_protocol.mjs", "data-pipelines/star-catalog/enrich_wikidata_chinese_aliases.mjs"];
  const dependencyPins = await Promise.all(dependencies.map(pin));
  const sourcePins = [...dependencyPins, await pin(declarationPath), await pin(researchPath), ...plan.inputs];
  const executionInputs = [...sourcePins];
  const save = (name, value) => writeFile(path.join(output, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  await mkdir(output);
  await writeFile(path.join(output, "executed-entity-collector.mjs"), await readFile(fileURLToPath(import.meta.url)), { flag: "wx" });
  const executionCopy = { ...dependencyPins[0], path: path.relative(root, path.join(output, "executed-entity-collector.mjs")).replaceAll("\\", "/") };
  sourcePins.push(executionCopy); executionInputs.push(executionCopy);
  await save("source-bindings-before.json", sourcePins);
  const batches = [], entities = [], candidates = [];
  const exceptions = plan.missingEntityMapping.map(reference => ({ reference, reason: "existing_entity_mapping_missing" }));
  let stopped = false, networkRequests = 0, retries = 0, failure = null;
  try {
    for (let index = 0; index < plan.batches.length; index++) {
      const ids = plan.batches[index];
      if (stopped) { batches.push({ index, ids, status: "NOT_REQUESTED_AFTER_SHARED_FAILURE" }); continue; }
      let receipt;
      const attempts = [];
      try {
        for (const expected of executionInputs) assert.deepEqual(await pin(expected.path), expected);
        if (index === 0 && cachedReceiptPath) {
          const pinned = await pin(cachedReceiptPath);
          receipt = JSON.parse(await readFile(withinRoot(cachedReceiptPath), "utf8")); sourcePins.push(pinned);
        } else for (let attempt = 0; attempt < 3; attempt++) {
          const requestUrl = entityBatchUrl(ids), name = `batch-${String(index).padStart(2, "0")}-attempt-${attempt}`;
          const file = `${outputPath.replaceAll("\\", "/")}/${name}.json`, startedAt = new Date().toISOString();
          networkRequests++;
          let transport;
          try {
            transport = await request("curl.exe", ["--silent", "--show-error", "--location", "--compressed", "--proto", "=https", "--proto-redir", "=https",
              "--max-redirs", "3", "--max-time", "35", "--user-agent", research.userAgent, "--output", withinRoot(file), "--write-out",
              '{"httpStatus":%{http_code},"effectiveUrl":"%{url_effective}","downloadedBytes":%{size_download},"wallSeconds":%{time_total},"retryAfter":"%header{retry-after}"}', requestUrl],
              { encoding: "utf8", windowsHide: true, timeout: 40000 });
          } catch (error) { transport = { status: null, error, stdout: "", stderr: "" }; }
          receipt = { requestUrl, startedAt, completedAt: new Date().toISOString(), ...textTransportReceipt(transport) };
          try { receipt.source = await pin(file); sourcePins.push(receipt.source); } catch { /* Transport failure may leave no body. */ }
          attempts.push(receipt);
          await save(name + "-receipt.json", receipt);
          const delay = receipt.source ? lagRetryDelay(await readFile(withinRoot(file)), receipt, attempt) : null;
          if (delay === null) break;
          retries++; log({ batch: index, state: "MAXLAG_WAIT", attempt, delayMs: delay });
          await wait(delay);
        }
        if (!receipt?.source) throw Error("entity_transport_body_missing");
        const body = await readFile(withinRoot(receipt.source.path));
        const inspected = inspectEntityBatch(body, receipt, ids, plan.rows);
        if (index === 0 && cachedReceiptPath) sourcePins.push(receipt.source);
        entities.push(...inspected.entities); candidates.push(...inspected.candidates); exceptions.push(...inspected.exceptions);
        batches.push({ index, ids, status: "ENTITY_INPUTS_INSPECTED_NOT_ADOPTED", receipt, attempts,
          candidates: inspected.candidates.length, exceptions: inspected.exceptions.length });
      } catch (error) {
        stopped = true;
        batches.push({ index, ids, status: "SHARED_SOURCE_RESPONSE_FAILED", receipt: receipt ?? null, attempts, reason: String(error) });
      }
      log({ batch: index, state: batches.at(-1).status, cumulativeCandidates: candidates.length, cumulativeExceptions: exceptions.length });
    }
  } catch (error) { failure = String(error); }
  // Always preserve the observed output and changed/missing inputs. Historical
  // executions without a copy stay missing; this receipt only binds this run.
  const bindingChecks = await Promise.all(sourcePins.map(async expected => {
    try { const current = await pin(expected.path);
      return { expected, current, unchanged: current.bytes === expected.bytes && current.sha256 === expected.sha256 };
    } catch (error) { return { expected, current: null, unchanged: false, error: String(error) }; }
  }));
  const bindingsVerified = bindingChecks.every(row => row.unchanged);
  await save("source-bindings-after.json", { bindingsVerified, checks: bindingChecks });
  const result = { format: "celestial-introduction-entity-discovery-v1",
    status: failure || !bindingsVerified ? "FAILED_ENTITY_DISCOVERY" : stopped || exceptions.length ? "PARTIAL_ENTITY_DISCOVERY" : "ENTITY_DISCOVERY_NOT_ARTICLE_REVIEW",
    declaration: sourcePins.find(row => row.path === declarationPath), batches, entities, candidates, exceptions, sourcePins, networkRequests,
    priorRequestReused: cachedReceiptPath ? 1 : 0, retries, httpConcurrency: 1, mediaFetched: 0, proseAdopted: 0, newProseEdition: false,
    execution: { copy: executionCopy.path, copyPin: executionCopy,
      dependencies: dependencyPins, bindingsVerified, failure },
    meaning: "Exact HR is only input eligibility. Articles still require fixed producer identity, HD/HIP, text/license checks and content review. Component/system exceptions do not borrow sibling prose." };
  await save("result.json", result);
  log({ status: result.status, entities: entities.length, candidates: candidates.length, exceptions: exceptions.length, networkRequests });
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [declarationPath, outputPath, researchPath, cachedReceiptPath] = process.argv.slice(2);
  if (![5, 6].includes(process.argv.length) || !declarationPath || !outputPath || !researchPath)
    throw Error("usage: collect_introduction_entities.mjs <declaration.json> <new-output-directory> <research.json> [cached-first-receipt.json]");
  const result = await collectIntroductionEntities({ declarationPath, outputPath, researchPath, cachedReceiptPath });
  if (result.status === "FAILED_ENTITY_DISCOVERY") process.exitCode = 1;
}
