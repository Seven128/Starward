import assert from "node:assert/strict";
import test from "node:test";
import type { SourceSummary } from "./types.ts";
import { uniqueSourceRecords } from "./source-records.ts";

const source: SourceSummary = {
  id: "test-fixture:record-identity", kind: "TEST_FIXTURE", provider: "TEST source records",
  title: "TEST identity only", sourceUrl: "https://example.com/source", license: "TEST license A",
  licenseUrl: "https://example.com/license-a", publishedAt: null, retrievedAt: "2026-10-01T00:00:00Z",
  validFrom: "2026-10-01T00:00:00Z", validTo: "2026-10-02T00:00:00Z", state: "SAMPLE_DATA",
  confidence: null, precision: "TEST input", limitations: ["Not production evidence"],
  attribution: { name: "TEST credit", url: "https://example.com/credit", statements: ["TEST statement"] },
};

test("equivalent complete source records collapse without depending on object property order", () => {
  const copy = Object.fromEntries(Object.entries(structuredClone(source)).reverse()) as unknown as SourceSummary;
  copy.attribution = { statements: source.attribution!.statements, url: source.attribution!.url, name: source.attribution!.name };
  const other = { ...source, id: "test-fixture:other-source" };
  const actual = uniqueSourceRecords([source, copy, other, structuredClone(source)]);
  assert.deepEqual(actual, [source, other]);
  assert.equal(actual[0], source);
});

test("validity, license, missing confidence and required credit remain distinct records", () => {
  const records: SourceSummary[] = [source,
    { ...source, validFrom: source.validTo, validTo: null },
    { ...source, license: "TEST license B", licenseUrl: "https://example.com/license-b" },
    { ...source, confidence: 0 },
    { ...source, state: "UNAVAILABLE" },
    { ...source, attribution: { ...source.attribution!, statements: ["TEST revised statement"] } },
  ];
  assert.deepEqual(uniqueSourceRecords(records), records);
});

test("record selection preserves caller order, references and the original arrays", () => {
  const before = structuredClone(source);
  const records = Object.freeze([source, { ...source, retrievedAt: null }, structuredClone(source)]);
  const result = uniqueSourceRecords(records);
  assert.equal(result[0], records[0]); assert.equal(result[1], records[1]);
  assert.deepEqual(source, before); assert.equal(records.length, 3);
});
