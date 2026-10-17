import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { collectIntroductionEntities, inspectEntityBatch } from "./collect_introduction_entities.mjs";
import { textTransportReceipt } from "./wikimedia_text_input_protocol.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cached = path.join(root, "output/cloud-sky-text-inputs-2026-10-11-r1");
const original = await readFile(path.join(cached, "wbgetentities-00.json"));
const plan = JSON.parse(await readFile(path.join(cached, "input-declaration.json"), "utf8"));
const receipt = JSON.parse(await readFile(path.join(cached, "wbgetentities-00-receipt.json"), "utf8"));
const samples = inspectEntityBatch(original, receipt, plan.batches[0], plan.rows).candidates.slice(0, 3);
const source = JSON.parse(original);
const hash = b => createHash("sha256").update(b).digest("hex");
const relative = file => path.relative(root, file).replaceAll("\\", "/");

async function fixture() {
  const folder = await mkdtemp(path.join(root, "output/cloud-sky-entity-execution-test-"));
  const input = path.join(folder, "fixed-input.json");
  const data = Buffer.from('{"purpose":"controlled execution test, no network"}');
  await writeFile(input, data, { flag: "wx" });
  const declarationPath = relative(path.join(folder, "declaration.json"));
  const researchPath = relative(path.join(folder, "research.json"));
  const rows = samples.map(sample => plan.rows.find(row => row.reference === sample.reference));
  await writeFile(path.join(root, declarationPath), JSON.stringify({ status: "CURRENT_NAMED_TEXT_INPUT_DECLARATION_NOT_PROSE_ADOPTION",
    rows, remaining: rows.length, batches: rows.map(row => [row.wikidataItem]), missingEntityMapping: [],
    inputs: [{ path: relative(input), bytes: data.length, sha256: hash(data) }] }), { flag: "wx" });
  await writeFile(path.join(root, researchPath), JSON.stringify({ userAgent: "StarwardCloudSkyTextInspection/1.0 (+https://github.com/example/starward; offline source review)" }), { flag: "wx" });
  const calls = [], waits = [];
  const options = { declarationPath, researchPath, outputPath: relative(path.join(folder, "result")) };
  const success = async (_command, args) => {
    const url = args.at(-1), ids = new URL(url).searchParams.get("ids").split("|");
    const bytes = Buffer.from(JSON.stringify({ success: 1, entities: Object.fromEntries(ids.map(id => [id, source.entities[id]])) }));
    await writeFile(args[args.indexOf("--output") + 1], bytes, { flag: "wx" });
    calls.push({ url, ids });
    return { status: 0, stderr: "", stdout: JSON.stringify({ httpStatus: 200, effectiveUrl: url, downloadedBytes: bytes.length, wallSeconds: 0.01, retryAfter: "" }) };
  };
  const ports = { request: success, wait: async delay => { waits.push(delay); }, log() {} };
  return { folder, input, options, ports, calls, waits, success,
    async saved() { return JSON.parse(await readFile(path.join(root, options.outputPath, "result.json"), "utf8")); } };
}

test("actual entity collector records its execution and all producer dependencies without network", async () => {
  const f = await fixture(), result = await collectIntroductionEntities(f.options, f.ports);
  assert.equal(result.status, "ENTITY_DISCOVERY_NOT_ARTICLE_REVIEW");
  assert.equal(result.candidates.length, 3); assert.equal(f.calls.length, 3);
  assert.equal(result.execution.bindingsVerified, true);
  assert.deepEqual(result.execution.dependencies.map(row => path.basename(row.path)).sort(),
    ["collect_introduction_entities.mjs", "enrich_wikidata_chinese_aliases.mjs", "wikimedia_text_input_protocol.mjs"]);
  assert.deepEqual(await readFile(path.join(root, result.execution.copy)), await readFile(new URL("./collect_introduction_entities.mjs", import.meta.url)));
  assert.deepEqual(await f.saved(), result);
  await assert.rejects(collectIntroductionEntities(f.options, f.ports), /EEXIST/u);
  assert.equal(f.calls.length, 3, "a replay cannot overwrite output or issue more requests");
});

for (const malformed of ["not-json", "null", '{"httpStatus":200}', '{"httpStatus":200,"effectiveUrl":"https://www.wikidata.org/","downloadedBytes":-1,"wallSeconds":0}'])
  test(`invalid transport metadata preserves independent completed batches: ${malformed}`, async () => {
    const f = await fixture(); let count = 0;
    const result = await collectIntroductionEntities(f.options, { ...f.ports, request: async (...args) => {
      if (count++ === 0) return f.success(...args);
      return { status: 0, stderr: "", stdout: malformed };
    } });
    assert.equal(result.status, "PARTIAL_ENTITY_DISCOVERY"); assert.equal(result.candidates.length, 1);
    assert.equal(result.batches[1].status, "SHARED_SOURCE_RESPONSE_FAILED");
    assert.equal(result.batches[1].attempts[0].transportMetadata, "INVALID");
    assert.equal(result.batches[2].status, "NOT_REQUESTED_AFTER_SHARED_FAILURE");
    assert.equal(result.networkRequests, 2); assert.deepEqual(f.waits, []);
    assert.deepEqual(await f.saved(), result);
  });

test("an input changed during execution stops further batches and leaves a failed binding receipt", async () => {
  const f = await fixture();
  const result = await collectIntroductionEntities(f.options, { ...f.ports, request: async (...args) => {
    const response = await f.success(...args); await writeFile(f.input, "changed after start"); return response;
  } });
  assert.equal(result.status, "FAILED_ENTITY_DISCOVERY"); assert.equal(result.execution.bindingsVerified, false);
  assert.equal(result.candidates.length, 1); assert.equal(f.calls.length, 1);
  const after = JSON.parse(await readFile(path.join(root, f.options.outputPath, "source-bindings-after.json"), "utf8"));
  assert(after.checks.some(row => row.expected.path === relative(f.input) && !row.unchanged));
  assert.deepEqual(await f.saved(), result);
});

test("maxlag keeps the existing bounded three attempts and never proceeds to the remaining queue", async () => {
  const f = await fixture(); let attempts = 0;
  const result = await collectIntroductionEntities(f.options, { ...f.ports, request: async (_command, args) => {
    attempts++; const bytes = Buffer.from('{"error":{"code":"maxlag","lag":8}}');
    await writeFile(args[args.indexOf("--output") + 1], bytes, { flag: "wx" });
    return { status: 0, stderr: "", stdout: JSON.stringify({ httpStatus: 200, effectiveUrl: args.at(-1), downloadedBytes: bytes.length, wallSeconds: .01, retryAfter: "5" }) };
  } });
  assert.equal(attempts, 3); assert.deepEqual(f.waits, [5000, 10000]);
  assert.equal(result.status, "PARTIAL_ENTITY_DISCOVERY"); assert.equal(result.candidates.length, 0);
  assert.equal(result.batches[0].attempts.length, 3); assert.equal(result.batches[1].status, "NOT_REQUESTED_AFTER_SHARED_FAILURE");
  assert.deepEqual(await f.saved(), result);
});

test("thrown or absent transport results still produce bounded failure metadata", async () => {
  assert.equal(textTransportReceipt(undefined).transportMetadata, "INVALID");
  const f = await fixture();
  const result = await collectIntroductionEntities(f.options, { ...f.ports, request: () => { throw Error("controlled transport exception"); } });
  assert.equal(result.status, "PARTIAL_ENTITY_DISCOVERY"); assert.equal(result.networkRequests, 1);
  assert.match(result.batches[0].attempts[0].error, /controlled transport exception/u);
  assert.deepEqual(await f.saved(), result);
});
