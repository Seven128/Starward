import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { displayRasterWindowForBounds, displayRasterWindowKey, normalizeDisplayRasterBounds } from "@starward/coordinate-system";
import { MAP_TERRAIN_SUPPORTED_BOUNDS, type TerrainBounds, type TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { normalizeTerrainOverlayRequest, terrainOverlayRequestIdentity, terrainOverlayRequestQuery } from "./terrain-overlay-request.ts";
import { normalizeTerrainRequest, terrainLocationIsSupported, terrainRequestKey, terrainWindowViewport } from "../../../../workers/miniapp-api/src/terrain-request.ts";

const mapRequest = (viewportBounds: TerrainBounds): TerrainOverlayRequest => ({ purpose: "MAP", viewportBounds,
  center: { system: "GCJ02", latitude: (viewportBounds.north + viewportBounds.south) / 2,
    longitude: (viewportBounds.east + viewportBounds.west) / 2 } });

test("client window identity matches the producer after outward transport normalization, keeping the actual requested bounds", () => {
  const input = mapRequest({ west: 114.082031249, south: 22.600000001, east: 114.105000003, north: 22.635000002 });
  const original = structuredClone(input);
  const normalized = normalizeTerrainOverlayRequest(input);
  assert.ok(normalized.viewportBounds);
  const bounds = normalized.viewportBounds;
  assert.ok(bounds.west <= input.viewportBounds!.west && bounds.south <= input.viewportBounds!.south
    && bounds.east >= input.viewportBounds!.east && bounds.north >= input.viewportBounds!.north);
  assert.deepEqual(bounds, normalizeTerrainRequest(input).viewportBounds);
  // HTTP has already serialized the canonical seven-place request. Offline
  // grid-exact requests retain their original full-precision boundary path.
  const producer = terrainWindowViewport(normalized);
  assert.equal(terrainOverlayRequestIdentity(input), `MAP:window:${displayRasterWindowKey(producer.fixedWindow!)}`);
  assert.notDeepEqual(bounds, producer.viewportBounds, "fixed coverage must not replace the real requested rectangle");
  assert.deepEqual(input, original, "the native viewport is never rewritten");
  assert.deepEqual(normalizeDisplayRasterBounds(bounds), bounds, "reconstructed transport bounds are idempotent");
});

test("the real API serializer sends the same normalized bounds used for window identity and forwards cancellation", async () => {
  const source = ts.createSourceFile("api-client.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = source.statements.filter(node => ts.isFunctionDeclaration(node)
    && ["getTerrainOverlay", "getTerrainOverlayPreview"].includes(node.name?.text ?? ""))
    .map(node => node.getText(source).replace(/^export /u, "")).join("\n");
  let call: any;
  const readers = vm.runInNewContext(ts.transpileModule(declarations + ";[getTerrainOverlay, getTerrainOverlayPreview];", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { terrainOverlayRequestQuery, requestOperation: (...args: unknown[]) => { call = args; return Promise.resolve({}); } });
  const input = mapRequest({ west: 114.082031249, south: 22.600000001, east: 114.105000003, north: 22.635000002 });
  const controller = new AbortController();
  for (const [index, get] of readers.entries()) {
    await get(input, controller.signal);
    const query = new URLSearchParams(call[2].query), normalized = normalizeTerrainOverlayRequest(input);
    assert.deepEqual(query.get("viewportBounds")!.split(",").map(Number), [normalized.viewportBounds!.west,
      normalized.viewportBounds!.south, normalized.viewportBounds!.east, normalized.viewportBounds!.north]);
    assert.equal(call[2].signal, controller.signal); assert.equal(call[2].cache, false);
    assert.equal(call[1], index ? "terrainOverlayPreviewGet" : "terrainOverlayGet");
  }
});

test("an unsupported rectangle and its supported neighbour in the same window never share failure identity", () => {
  const edge = MAP_TERRAIN_SUPPORTED_BOUNDS.east;
  const outside = mapRequest({ west: edge + 0.001, east: edge + 0.004, south: 22.61, north: 22.63 });
  const inside = mapRequest({ west: edge - 0.001, east: edge + 0.002, south: 22.61, north: 22.63 });
  assert.equal(displayRasterWindowKey(displayRasterWindowForBounds(outside.viewportBounds!)),
    displayRasterWindowKey(displayRasterWindowForBounds(inside.viewportBounds!)), "the test straddles the support boundary within one fixed window");
  assert.equal(terrainLocationIsSupported(outside), false); assert.equal(terrainLocationIsSupported(inside), true);
  assert.notEqual(terrainOverlayRequestIdentity(outside), terrainOverlayRequestIdentity(inside));
  const invalidCenter = { ...inside, center: { ...inside.center, longitude: edge + 1 } };
  assert.notEqual(terrainOverlayRequestIdentity(invalidCenter), terrainOverlayRequestIdentity(inside));
});

test("Spot point/radius and legacy Map radius identities remain separate from fixed viewport identities", () => {
  const spot: TerrainOverlayRequest = { purpose: "SPOT", center: { system: "GCJ02", latitude: 22.61, longitude: 114.1 }, radiusKm: 5 };
  assert.notEqual(terrainOverlayRequestIdentity(spot), terrainOverlayRequestIdentity({ ...spot, radiusKm: 5.1 }));
  assert.notEqual(terrainOverlayRequestIdentity(spot), terrainOverlayRequestIdentity({ ...spot, center: { ...spot.center, longitude: 114.1000001 } }));
  assert.notEqual(terrainOverlayRequestIdentity(spot), terrainOverlayRequestIdentity({ ...spot, purpose: "MAP" }));
  assert.match(terrainRequestKey(normalizeTerrainRequest(spot)), /^glo30-cn-v1-/u);
});
