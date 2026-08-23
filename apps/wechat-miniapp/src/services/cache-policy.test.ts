import assert from "node:assert/strict";
import test from "node:test";
import {
  READ_MODEL_INVALIDATION_POLICY,
  invalidationPolicy,
  responseCacheKey,
} from "./cache-policy.ts";

test("every library mutation invalidates both aggregate cache layers", () => {
  for (const [mutation, policy] of Object.entries(
    READ_MODEL_INVALIDATION_POLICY,
  )) {
    assert.ok(policy.responsePrefixes.includes("user-library"), mutation);
    assert.ok(policy.queryRoots.includes("user-library"), mutation);
    assert.equal(
      new Set(policy.responsePrefixes).size,
      policy.responsePrefixes.length,
      mutation,
    );
    assert.equal(new Set(policy.queryRoots).size, policy.queryRoots.length, mutation);
  }
});

test("favorite and preference mutations invalidate their map projection", () => {
  assert.ok(invalidationPolicy("FAVORITE").queryRoots.includes("map-scene"));
  assert.ok(invalidationPolicy("PREFERENCES").queryRoots.includes("map-scene"));
});

test("import invalidation maps transport prefixes to structured query roots", () => {
  assert.ok(invalidationPolicy("IMPORT").responsePrefixes.includes("import:"));
  assert.ok(invalidationPolicy("IMPORT").queryRoots.includes("import"));
});

test("response cache isolates URL representations inside one cancellation group", () => {
  const nearby = responseCacheKey(
    "map-scene",
    "/v2/map/scene?center=22.5431,114.0579&zoom=8",
  );
  const filtered = responseCacheKey(
    "map-scene",
    "/v2/map/scene?center=22.5431,114.0579&zoom=8&facility=parking",
  );

  assert.notEqual(nearby, filtered);
  assert.ok(nearby.startsWith("map-scene"));
  assert.ok(filtered.startsWith("map-scene"));
});
