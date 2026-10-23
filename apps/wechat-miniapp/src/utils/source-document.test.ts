import assert from "node:assert/strict";
import test from "node:test";
import type { SourceSummary } from "@starward/miniapp-contracts";
import { readSourceReadingEnvelope, sourceReadingIdentityMatches, type SourceReadingIdentity } from "./source-document";

const source: SourceSummary = { id: "same-id", kind: "OPEN_DATA", provider: "来源", title: "当前数据",
  sourceUrl: "https://example.org/source", license: "保留许可", licenseUrl: "https://example.org/license",
  publishedAt: null, retrievedAt: null, validFrom: "2026-10-01T00:00:00Z", validTo: null,
  state: "ESTIMATED", confidence: null, precision: "年度网格", limitations: ["非现场实测"],
  attribution: { name: "供应方", url: "https://example.org", statements: ["完整必要声明"] } };
const identity: SourceReadingIdentity = { accountOwnerId: null, mapResetVersion: 0, selectedSpotId: null, context: "ctx:a" };

test("the reading transfer preserves full independent rights/coverage and only removes exact duplicates and internal records", () => {
  const next = { ...source, validFrom: "2026-10-02T00:00:00Z", license: "另一许可" };
  const doc = readSourceReadingEnvelope({ identity, document: { title: "来源", sources: [source, source, next, { ...source, kind: "TEST_FIXTURE" }] } })!;
  assert.deepEqual(doc.document.sources, [source, next]);
  assert.equal(doc.document.sources[0]?.retrievedAt, null, "missing acquisition time must stay missing");
  assert.deepEqual(doc.document.sources[0]?.attribution?.statements, ["完整必要声明"]);
  assert.notEqual(doc.document.sources[0], source, "native EventChannel must not share mutable producer records");
  assert.notEqual(doc.document.sources[0]?.limitations, source.limitations);
});

test("media facts and fixed-publication links are plain reading data; React content and unrelated metadata cannot cross", () => {
  const doc = readSourceReadingEnvelope({ identity: { ...identity, privateExtra: "excluded" }, document: {
    title: "图片来源", sources: [], component: () => {}, sections: [
      { kind: "facts", items: [{ label: "拍摄时间", value: "来源未提供", privateExtra: "excluded" }] },
      { kind: "links", items: [{ label: "当前图片", url: "https://example.org/edition/image", download: true }] },
    ],
  } })!;
  assert.ok(doc);
  assert.ok(!JSON.stringify(doc).includes("privateExtra"));
  assert.equal(JSON.stringify(doc.document.sections), JSON.stringify([
    { kind: "facts", items: [{ label: "拍摄时间", value: "来源未提供" }] },
    { kind: "links", items: [{ label: "当前图片", url: "https://example.org/edition/image", download: true }] },
  ]));
  assert.equal(readSourceReadingEnvelope({ identity, document: { title: "来源", sources: [], sections: [{ kind: "text", paragraphs: [{ type: "View" }] }] } }), null);
  assert.equal(readSourceReadingEnvelope(undefined), null);
});

test("account, reset, selection and context changes invalidate the old reading rather than selecting replacement data", () => {
  assert.equal(sourceReadingIdentityMatches(identity, { ...identity }), true);
  for (const changed of [{ accountOwnerId: "another" }, { mapResetVersion: 1 }, { selectedSpotId: "spot:new" }, { context: "ctx:new" }]) {
    assert.equal(sourceReadingIdentityMatches(identity, { ...identity, ...changed }), false);
  }
});
