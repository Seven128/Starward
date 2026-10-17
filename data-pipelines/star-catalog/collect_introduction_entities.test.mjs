import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { entityBatchUrl, inspectEntityBatch, lagRetryDelay } from "./collect_introduction_entities.mjs";
const base = new URL("../../output/cloud-sky-text-inputs-2026-10-11-r1/", import.meta.url);
const read = file => JSON.parse(readFileSync(new URL(file, base), "utf8"));
const plan = read("input-declaration.json"), receipt = read("wbgetentities-00-receipt.json");
const original = readFileSync(new URL("wbgetentities-00.json", base)), ids = plan.batches[0];
const expected = inspectEntityBatch(original, receipt, ids, plan.rows);
const repin = response => { const bytes = Buffer.from(JSON.stringify(response)); return { bytes,
  receipt: { ...receipt, source: { ...receipt.source, bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex") } } }; };

test("real official batch preserves exact entity pins and keeps missing articles separate", () => {
  assert.equal(expected.entities.length, 50); assert.equal(expected.candidates.length, 46); assert.equal(expected.exceptions.length, 4);
  for (const row of expected.candidates) {
    assert.equal(row.reference, `HR:${row.identity.hr}`); assert.equal(row.entity.id, row.wikidataItem);
    assert.deepEqual(row.entity.source, receipt.source); assert.equal(row.state, "ARTICLE_INPUT_NOT_FETCHED_OR_REVIEWED");
  }
  assert(expected.exceptions.some(row => row.reference === "HR:4915" && row.reason === "english_article_sitelink_missing"));
});
test("ID limits, response bytes, request identity and incomplete containers cannot qualify inputs", () => {
  for (const invalid of [[], ["Q1", "Q1"], ["Q0"], Array.from({ length: 51 }, (_, i) => `Q${i + 1}`)])
    assert.throws(() => entityBatchUrl(invalid), /ids_invalid/u);
  assert.throws(() => inspectEntityBatch(Buffer.concat([original, Buffer.from(" ")]), receipt, ids, plan.rows), /response_binding_invalid/u);
  assert.throws(() => inspectEntityBatch(original, { ...receipt, requestUrl: entityBatchUrl(["Q1"]) }, ids, plan.rows), /response_binding_invalid/u);
  const response = JSON.parse(original); delete response.entities[ids[0]];
  const changed = repin(response); assert.throws(() => inspectEntityBatch(changed.bytes, changed.receipt, ids, plan.rows), /response_invalid/u);
});
test("title, labels and a matching HR elsewhere do not replace the selected entity's qualified HR", () => {
  const response = JSON.parse(original), chosen = expected.candidates[0];
  for (const claim of response.entities[chosen.wikidataItem].claims.P528) {
    if (claim.qualifiers?.P972?.some(qualifier => qualifier.datavalue?.value?.id === "Q499138")) claim.rank = "deprecated";
  }
  const changed = repin(response), result = inspectEntityBatch(changed.bytes, changed.receipt, ids, plan.rows);
  assert.equal(result.candidates.length, 45);
  assert(result.exceptions.some(row => row.reference === chosen.reference && row.reason === "qualified_hr_not_exact"));
  assert.deepEqual(result.candidates.map(row => row.reference), expected.candidates.filter(row => row.reference !== chosen.reference).map(row => row.reference));
});
test("future or malformed entity information isolates that item while preserving independent inputs", () => {
  const response = JSON.parse(original), chosen = expected.candidates[0];
  response.entities[chosen.wikidataItem].modified = "2099-01-01T00:00:00Z";
  const changed = repin(response), result = inspectEntityBatch(changed.bytes, changed.receipt, ids, plan.rows);
  assert.equal(result.entities.length, 49); assert.equal(result.candidates.length, 45);
  assert(result.exceptions.some(row => row.id === chosen.wikidataItem && row.reason === "entity_missing_or_invalid"));
});
test("real HTTP 200 maxlag is unavailable data, with bounded waits and no generic timeout retry", () => {
  const lagReceipt = read("entity-discovery-r1/batch-01-receipt.json");
  const lag = readFileSync(new URL("entity-discovery-r1/batch-01.json", base));
  assert.equal(JSON.parse(lag).error.code, "maxlag");
  assert.throws(() => inspectEntityBatch(lag, lagReceipt, plan.batches[1], plan.rows), /response_invalid/u);
  assert.equal(lagRetryDelay(lag, lagReceipt, 0), 5000); assert.equal(lagRetryDelay(lag, lagReceipt, 1), 10000);
  assert.equal(lagRetryDelay(lag, lagReceipt, 2), null);
  assert.equal(lagRetryDelay(lag, { ...lagReceipt, retryAfter: "20" }, 0), 20000);
  assert.equal(lagRetryDelay(lag, { ...lagReceipt, retryAfter: "120" }, 0), null);
  assert.equal(lagRetryDelay(lag, { ...lagReceipt, httpStatus: 503 }, 0), null);
  assert.equal(lagRetryDelay(Buffer.from("upstream timeout"), lagReceipt, 0), null);
  assert.equal(lagRetryDelay(original, receipt, 0), null);
});
