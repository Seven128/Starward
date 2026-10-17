import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { buildReviewedIntroductionBatch } from "./build_reviewed_introduction_batch.mts";
import { encodeChineseIntroductionIndex, parseChineseIntroductionPublication, parseNextChineseIntroductionPublication,
  CHINESE_INTRODUCTION_PUBLICATION } from "../../workers/miniapp-api/src/celestial-object-introductions.ts";

const root = new URL("../../", import.meta.url), task = ".codex/work-items/cloud-sky-native-2026-09-22/evidence/";
const preflight = JSON.parse(await readFile(new URL(task + "content-cached-preflight-2026-10-11.json", root), "utf8"));
const reviews = JSON.parse(await readFile(new URL(task + "content-reviewed-translations-2026-10-11.json", root), "utf8"));
const parent = await readFile(new URL("workers/miniapp-api/assets/" + reviews.parent.file, root));
const read = (pin: { path: string }) => readFile(new URL(pin.path, root));
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const references = ["HR:1829", "HR:4932", "HR:5359", "HR:8502"];

test("one reviewed batch preserves all 247 prior rows, re-reads real sources and encodes only four additions", async () => {
  const result = await buildReviewedIntroductionBatch(preflight, reviews, parent, read);
  assert.equal(result.report.status, "PARTIAL_REVIEWED_LOCAL_BATCH_CANDIDATE");
  assert.equal(result.report.addedRows, 4); assert.equal(result.report.retainedRows, 247);
  assert.equal(result.report.inputExceptions.length, 16); assert.equal(result.report.inheritedCollectorExceptions.length, 1);
  assert.deepEqual(result.report.reviewExceptions, []); assert.deepEqual(result.report.pending, []);
  const bytes = result.publicationBytes!, rows = JSON.parse(bytes.toString("utf8")).rows;
  assert.equal(rows.length, 251); assert.deepEqual(rows.slice(0, 247), JSON.parse(parent.toString("utf8")).rows);
  assert.deepEqual(rows.slice(247).map((row: any) => row.reference), references);
  const index = JSON.parse(result.indexBytes!.toString("utf8"));
  assert.deepEqual(index.references, rows.map((row: any) => row.reference).sort());
  assert.equal(index.publication.sha256, hash(bytes)); assert.equal(index.publication.bytes, bytes.length);
  for (const row of rows.slice(247)) {
    assert.equal(row.source.retrievedAt, null, "legacy file mtime is not an HTTP acquisition time");
    assert.equal(row.source.confidence, null); assert.equal(row.source.license, "CC-BY-SA-4.0");
    assert(row.source.attribution.statements.some((statement: string) => statement.includes(row.source.licenseUrl)));
  }
  const repeated = await buildReviewedIntroductionBatch(preflight, reviews, parent, read);
  assert(repeated.publicationBytes!.equals(bytes)); assert(repeated.indexBytes!.equals(result.indexBytes!));
  assert.equal(result.report.runtimeAdopted, false); assert.equal(result.report.independentReview, "MISSING");
});

test("review identity mismatch, duplicates and unreviewed input cannot acquire prose", async () => {
  const wrong = structuredClone(reviews); wrong.rows[0].identity.hd = "1";
  const result = await buildReviewedIntroductionBatch(preflight, wrong, parent, read);
  assert.equal(result.report.addedRows, 3); assert.equal(result.report.reviewExceptions.length, 1);
  assert(result.report.reviewExceptions[0]!.reason.includes("review_identity_or_source_mismatch"));
  assert.deepEqual(result.report.pending, ["HR:5359"]);
  const duplicate = structuredClone(reviews); duplicate.rows.push(structuredClone(duplicate.rows[0]));
  const deduped = await buildReviewedIntroductionBatch(preflight, duplicate, parent, read);
  assert.equal(deduped.report.addedRows, 3); assert.equal(deduped.report.reviewExceptions.length, 2);
  const none = await buildReviewedIntroductionBatch(preflight, { ...reviews, rows: [] }, parent, read);
  assert.equal(none.report.status, "NO_REVIEWED_ADDITIONS"); assert.equal(none.publicationBytes, null);
  assert.deepEqual(none.report.pending.sort(), references);
});

test("a changed fixed article is isolated and cannot reuse the prior review binding", async () => {
  const pin = preflight.candidates.find((row: any) => row.reference === "HR:4932").article.pin;
  const result = await buildReviewedIntroductionBatch(preflight, reviews, parent,
    async source => source.path === pin.path ? Buffer.concat([await read(source), Buffer.from(" ")]) : read(source));
  assert.equal(result.report.addedRows, 3); assert.equal(result.report.inputExceptions.length, 17);
  assert(result.report.inputExceptions.some(row => row.reason.includes("source_pin_mismatch")));
  assert.equal(result.report.reviewExceptions.length, 1);
  assert(!JSON.parse(result.publicationBytes!.toString("utf8")).rows.some((row: any) => row.reference === "HR:4932"));
});

test("corrupt parent, shared terms and changed catalog fail the batch before output", async () => {
  await assert.rejects(buildReviewedIntroductionBatch(preflight, reviews, Buffer.concat([parent, Buffer.from(" ")]), read), /parent_binding_invalid/u);
  const wrongCatalog = structuredClone(preflight); wrongCatalog.catalog.hash = "0".repeat(64);
  await assert.rejects(buildReviewedIntroductionBatch(wrongCatalog, reviews, parent, read), /preflight_binding_invalid/u);
  await assert.rejects(buildReviewedIntroductionBatch(preflight, reviews, parent,
    async pin => pin.path === preflight.collection.inspection.terms.path ? Buffer.from("unlicensed") : read(pin)), /source_pin_mismatch/u);
  const changedReview = structuredClone(reviews); changedReview.independentReview = "PASSED";
  await assert.rejects(buildReviewedIntroductionBatch(preflight, changedReview, parent, read), /review_manifest_invalid/u);
});

test("next-edition preview cannot admit arbitrary future editions or change the current runtime declaration", async () => {
  const current = Number(CHINESE_INTRODUCTION_PUBLICATION.version.split(".v")[1]);
  const pack = { ...JSON.parse(parent.toString("utf8")), version: `starward-celestial-introductions.zh-cn.v${current + 1}` };
  const preview = Buffer.from(JSON.stringify(pack)), nextHash = hash(preview);
  assert.throws(() => parseChineseIntroductionPublication(preview, nextHash), /publication_invalid/u);
  assert.equal(parseNextChineseIntroductionPublication(preview, nextHash).size, 247);
  assert.equal(JSON.parse(encodeChineseIntroductionIndex(preview).toString("utf8")).publication.sha256, nextHash);
  const future = Buffer.from(JSON.stringify({ ...pack, version: `starward-celestial-introductions.zh-cn.v${current + 2}` }));
  assert.throws(() => parseNextChineseIntroductionPublication(future, hash(future)), /publication_invalid/u);
  assert.throws(() => parseNextChineseIntroductionPublication(parent, hash(parent)), /candidate_version_invalid/u);
});

test("real HTTP source time survives reviewed publication without the legacy mtime limitation", async () => {
  const actual = JSON.parse(await readFile(new URL("output/cloud-sky-text-inputs-2026-10-11-r1/article-preflight-r2/result.json", root), "utf8"));
  const candidate = actual.candidates.find((row: any) => row.reference === "HR:1165");
  const parentBytes = await readFile(new URL("workers/miniapp-api/assets/celestial-object-introductions.zh-cn.v73.json", root));
  const actualReview = { ...reviews, parent: { file: "celestial-object-introductions.zh-cn.v73.json",
    version: "starward-celestial-introductions.zh-cn.v73", bytes: parentBytes.length, sha256: hash(parentBytes) },
    rows: [{ reference: candidate.reference, inputKey: candidate.inputKey, identity: candidate.identity,
      articleSha256: candidate.article.pin.sha256, entitySha256: candidate.entity.pin.sha256,
      sourceParagraphIndexes: [0, 3], state: "SELF_REVIEWED_TRANSLATION", aliases: ["昴宿六"],
      introduction: "昴宿六是昴星团中的蓝白色恒星，其光谱中可见发射线。", limitations: ["不采用候选伴星的参数或成员点。"],
      reviewNotes: "有限节选支持颜色、星团归属和发射线；未采用年龄或伴星争议。", omittedClaims: ["数值物理参数及伴星列表。"] }] };
  const result = await buildReviewedIntroductionBatch(actual, actualReview, parentBytes, read);
  assert.equal(result.report.addedRows, 1); assert.deepEqual(result.report.reviewExceptions, []);
  const source = JSON.parse(result.publicationBytes!.toString("utf8")).rows.find((row: any) => row.reference === "HR:1165").source;
  assert.equal(source.retrievedAt, candidate.actualHttpRetrievedAt);
  assert(!source.limitations.some((value: string) => /mtime|未记录|保持未记录/u.test(value)));
  assert(source.limitations.some((value: string) => value.includes("实际HTTP响应完成")));
});
