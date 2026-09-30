import assert from "node:assert/strict";
import test from "node:test";
import type { ApiEnvelope, CelestialObjectSearchData } from "@starward/miniapp-contracts";
import { matchingCelestialSearchResponse } from "./celestial-search-response.ts";

function response(): ApiEnvelope<CelestialObjectSearchData> {
  return { dataState: "FRESH", data: { query: "织女星", results: [
    { reference: "HR:7001", kind: "STAR", displayName: "Vega", matchedAlias: "织女星", aliases: ["织女星", "Vega"] },
  ], truncated: false, catalogs: [], unavailableCatalogs: [] } } as unknown as ApiEnvelope<CelestialObjectSearchData>;
}

test("search accepts its query's identities without inventing positions or mutating cached data", () => {
  const input = response();
  assert.equal(matchingCelestialSearchResponse(input, " 织女星 "), input);
  assert.equal(input.data.results[0]?.reference, "HR:7001");
  assert.equal("x" in input.data.results[0]!, false);
  assert.throws(() => matchingCelestialSearchResponse(input, "M31"), /celestial_search_response_invalid/);
});

test("wrong component identities, kind mismatches and duplicate selectable rows are rejected", () => {
  for (const patch of [{ reference: "HIP:91262" }, { reference: "HR:0" }, { kind: "GALAXY" },
    { displayName: "" }, { matchedAlias: "" }, { aliases: [null] }]) {
    const input = response();
    Object.assign(input.data.results[0]!, patch);
    assert.throws(() => matchingCelestialSearchResponse(input, "织女星"), /celestial_search_response_invalid/);
  }
  const duplicate = response();
  duplicate.data.results.push({ ...duplicate.data.results[0]! });
  assert.throws(() => matchingCelestialSearchResponse(duplicate, "织女星"), /celestial_search_response_invalid/);
});

test("a partial or unavailable catalogue remains distinct from a fresh empty match", () => {
  const partial = response();
  partial.dataState = "PARTIAL";
  partial.data.unavailableCatalogs = ["sao"];
  assert.equal(matchingCelestialSearchResponse(partial, "织女星").data.results.length, 1);
  const unavailable = response();
  unavailable.dataState = "UNAVAILABLE";
  unavailable.data.results = [];
  assert.equal(matchingCelestialSearchResponse(unavailable, "织女星").dataState, "UNAVAILABLE");
});

test("planet search results retain a planet identity and reject a mismatched kind", () => {
  const input = response();
  input.data.results = [{ reference: "PLANET:VENUS", kind: "PLANET", displayName: "金星",
    matchedAlias: "金星", aliases: ["金星", "Venus"] }];
  assert.equal(matchingCelestialSearchResponse(input, "织女星"), input);
  input.data.results[0]!.kind = "STAR";
  assert.throws(() => matchingCelestialSearchResponse(input, "织女星"), /celestial_search_response_invalid/);
});
