import assert from "node:assert/strict";
import test from "node:test";
import type { ApiEnvelope, CelestialObjectInformationData } from "@starward/miniapp-contracts";
import { matchingCelestialInformationResponse } from "./celestial-information-response.ts";

function response(): ApiEnvelope<CelestialObjectInformationData> {
  return { apiVersion: "v2", dataState: "FRESH", generatedAt: "2026-09-24T00:00:00Z",
    validAt: null, etag: "information-v3", sources: [], warnings: [], requestId: "test-info",
    data: {
    reference: "HR:7001", kind: "STAR", displayName: "织女星", catalogId: "HR 7001",
    aliases: ["Vega"], introduction: null,
    facts: [{ label: "视星等", value: "0.03", unit: "mag" }],
    contentState: "BASIC_ONLY", contentRevision: "stellar-v3", limitations: ["几何位置不保证可见"],
    sources: [{ id: "bsc", kind: "OPEN_DATA", provider: "BSC", title: "Bright Star Catalogue",
      sourceUrl: "https://example.org/bsc", license: "Open", licenseUrl: "https://example.org/rights",
      publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
      state: "FRESH", confidence: null, precision: "catalog", limitations: [],
      attribution: { name: "BSC", url: "https://example.org/bsc", statements: ["BSC data"] } }],
  } };
}

test("the current object modal and source route can use a matching static identity", () => {
  const input = response();
  assert.equal(matchingCelestialInformationResponse(input, "HR:7001"), input);
  assert.equal(input.data.facts[0]?.value, "0.03", "the adapter preserves source facts and credit");
});

test("optical and W3 source identities remain independently bound to the two selected versions", () => {
  const infraredHash = "a".repeat(64), opticalHash = "b".repeat(64);
  const input = response();
  input.data.reference = "M:51"; input.data.kind = "GALAXY";
  const catalog = input.data.sources[0]!;
  input.data.sources = [catalog,
    { ...catalog, id: `imagery:w3:${infraredHash}` },
    { ...catalog, id: `optical-imagery:science-optical:${opticalHash}` }];
  input.sources = input.data.sources;
  assert.equal(matchingCelestialInformationResponse(input, "M:51", infraredHash, opticalHash), input);
  const wrongEnvelope = structuredClone(input);
  wrongEnvelope.sources = wrongEnvelope.sources.map(source => source.id.startsWith("optical-imagery:")
    ? { ...source, id: `optical-imagery:current:${"c".repeat(64)}` } : source);
  assert.throws(() => matchingCelestialInformationResponse(wrongEnvelope, "M:51", infraredHash, opticalHash), /optical_source_invalid/u);
  for (const replacement of [`optical-imagery:old:${infraredHash}`, `optical-imagery:current:${"c".repeat(64)}`,
    `optical-imagery:../escape:${opticalHash}`]) {
    const wrong = structuredClone(input);
    wrong.data.sources[2]!.id = replacement;
    assert.throws(() => matchingCelestialInformationResponse(wrong, "M:51", infraredHash, opticalHash), /optical_source_invalid/u);
  }
  const partial = structuredClone(input);
  partial.data.sources = partial.data.sources.slice(0, 2); partial.sources = partial.data.sources;
  assert.throws(() => matchingCelestialInformationResponse(partial, "M:51", infraredHash, opticalHash), /optical_source_invalid/u);
  partial.dataState = "PARTIAL";
  assert.equal(matchingCelestialInformationResponse(partial, "M:51", infraredHash, opticalHash), partial);
  assert.deepEqual(partial.data.facts, input.data.facts, "missing optical provenance does not erase independent facts");
  partial.dataState = "STALE_USABLE"; partial.warnings = ["sdss_optical_publication_unavailable"];
  assert.equal(matchingCelestialInformationResponse(partial, "M:51", infraredHash, opticalHash), partial);
  partial.warnings = ["deep_sky_image_publication_unavailable"];
  assert.throws(() => matchingCelestialInformationResponse(partial, "M:51", infraredHash, opticalHash), /optical_source_invalid/u);
  for (const invalid of ["", "../outside", "G".repeat(64)])
    assert.throws(() => matchingCelestialInformationResponse(input, "M:51", infraredHash, invalid), /optical_source_invalid/u);
  assert.throws(() => matchingCelestialInformationResponse(response(), "HR:7001", undefined, opticalHash), /optical_source_invalid/u);
});

test("another object's response or a mismatched kind never enters the current information cache", () => {
  const wrong = response();
  wrong.data.reference = "HR:2491";
  assert.throws(() => matchingCelestialInformationResponse(wrong, "HR:7001"), /celestial_information_response_invalid/);
  const wrongKind = response();
  wrongKind.data.kind = "GALAXY";
  assert.throws(() => matchingCelestialInformationResponse(wrongKind, "HR:7001"), /celestial_information_response_invalid/);
  assert.throws(() => matchingCelestialInformationResponse(response(), "HIP:91262"), /celestial_information_response_invalid/);
});

test("malformed information facts and credit are rejected before rendering", () => {
  const missingFacts = response();
  missingFacts.data.facts = undefined as unknown as CelestialObjectInformationData["facts"];
  assert.throws(() => matchingCelestialInformationResponse(missingFacts, "HR:7001"), /celestial_information_response_invalid/);
  const malformedCredit = response();
  malformedCredit.data.sources[0]!.attribution!.statements = null as unknown as readonly string[];
  assert.throws(() => matchingCelestialInformationResponse(malformedCredit, "HR:7001"), /celestial_information_response_invalid/);
});

test("a painted image's source cannot be replaced by the current publication or a cached source", () => {
  const boundHash = "a".repeat(64), currentHash = "b".repeat(64);
  const input = response();
  input.data.reference = "M:42"; input.data.kind = "NEBULA";
  input.data.sources[0]!.id = `imagery:source-finite:${boundHash}`;
  input.sources = input.data.sources;
  assert.equal(matchingCelestialInformationResponse(input, "M:42", boundHash), input);
  const wrong = structuredClone(input);
  wrong.data.sources[0]!.id = `imagery:source-finite:${currentHash}`;
  assert.throws(() => matchingCelestialInformationResponse(wrong, "M:42", boundHash), /image_source_invalid/u);
  const missing = structuredClone(input);
  missing.data.sources = []; missing.sources = [];
  assert.throws(() => matchingCelestialInformationResponse(missing, "M:42", boundHash), /image_source_invalid/u);
  missing.dataState = "PARTIAL";
  assert.equal(matchingCelestialInformationResponse(missing, "M:42", boundHash), missing,
    "independent catalog facts survive explicitly unavailable bound provenance");
});
