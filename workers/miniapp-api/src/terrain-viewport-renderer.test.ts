import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { createTerrainViewportRenderer } from "./terrain-viewport-renderer.ts";
import { normalizeTerrainRequest, terrainRequestKey, validateTerrainRequest } from "./terrain-request.ts";
import { terrainPublicationSource, validateTerrainPublication } from "./terrain-publication.ts";
import { TerrainService } from "./terrain-service.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

const request: TerrainOverlayRequest = { purpose: "MAP", center: { system: "GCJ02", latitude: 22.65, longitude: 114.05 },
  viewportBounds: { west: 111.9, south: 20.1, east: 116.2, north: 25.2 } };

function sourceTransport(contributors = "srtm/test-height.tif, etopo1/test-depth.tif") {
  const requests: string[] = [];
  const transport = (async (url: string | URL | Request) => {
    requests.push(String(url));
    const match = /\/(\d+)\/(\d+)\/(\d+)\.png$/u.exec(String(url))!;
    const x = Number(match[2]), y = Number(match[3]), png = new PNG({ width: 256, height: 256 });
    for (let row = 0; row < 256; row++) for (let column = 0; column < 256; column++) {
      // Continuous across tile edges, includes real negative elevations.
      const value = (x * 256 + column) / 8 - (y * 256 + row) / 4 + 32768;
      const index = (row * 256 + column) * 4;
      png.data.set([Math.floor(value / 256), Math.floor(value) % 256, Math.round(value % 1 * 256), 255], index);
    }
    return new Response(new Uint8Array(PNG.sync.write(png)), { headers: { etag: '"controlled-source"', "x-amz-meta-x-imagery-sources": contributors } });
  }) as typeof fetch;
  return { transport, requests };
}

test("a wide rectangular viewport fits the source budget, retains provenance and has actual relief", async () => {
  const source = sourceTransport(), renderer = createTerrainViewportRenderer(source.transport);
  try {
    const result = await renderer.render(request, new AbortController().signal);
    assert.ok(result); assert.equal(result.publication.validPixelPercent, 100);
    assert.deepEqual(result.publication.boundsGcj02, request.viewportBounds);
    assert.equal(result.publication.maximumRadiusKm, null);
    assert.ok(source.requests.length > 1 && source.requests.length <= 12);
    assert.ok(result.publication.elevationM.minimum < 0, "bathymetry is preserved rather than silently flattened");
    const rgba = PNG.sync.read(result.bytes).data;
    assert.ok([3, (255 * 512 + 255) * 4 + 3, rgba.length - 1].every(index => rgba[index] > 0),
      "a PNG response with empty relief would not establish full-view coverage");
    const sourceInfo = terrainPublicationSource(result.publication);
    assert.match(sourceInfo.attribution!.statements.join(" "), /SRTM.*NOAA/su);
    assert.doesNotMatch(sourceInfo.sourceUrl!, /copernicus|doi.org/u);
    const altered = structuredClone(result.publication);
    altered.sources[0].hashScope = "RETRIEVED_RANGES";
    assert.throws(() => validateTerrainPublication(altered), /terrain_viewport_publication_invalid/u);
  } finally { renderer.close(); }
});

test("unrecognized source contributors fail before publication and are not cached as licensed tiles", async () => {
  const source = sourceTransport("unknown/other-rights.tif"), renderer = createTerrainViewportRenderer(source.transport);
  try {
    await assert.rejects(renderer.render(request, new AbortController().signal), /terrain_sources_failed/u);
    const first = source.requests.length;
    await assert.rejects(renderer.render(request, new AbortController().signal), /terrain_sources_failed/u);
    assert.equal(source.requests.length, first * 2);
  } finally { renderer.close(); }
});

test("one transient tile failure preserves known terrain but expires for a real ordinary recovery", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-partial-recovery-"));
  const source = sourceTransport(); let failOnce = true;
  const renderer = createTerrainViewportRenderer((async (...args: Parameters<typeof fetch>) => {
    if (failOnce) { failOnce = false; return new Response(null, { status: 503 }); }
    return source.transport(...args);
  }) as typeof fetch);
  const terrain = new TerrainService({ directory, renderer: renderer.render });
  const service = createTestMiniappService({ terrain });
  const recoveryRequest: TerrainOverlayRequest = { purpose: "MAP", center: { system: "GCJ02", latitude: 22.625, longitude: 114.025 },
    viewportBounds: { west: 114.02, south: 22.62, east: 114.03, north: 22.63 } };
  try {
    const first = await service.getTerrainOverlay(recoveryRequest);
    assert.equal(first.data.state, "PARTIAL"); assert.ok(first.data.imageUrl);
    assert.equal(first.data.failureCode, "TERRAIN_READ_FAILED");
    const partialFile = decodeURIComponent(first.data.imageUrl.split("/").at(-1)!);
    const partialAsset = await terrain.getAsset(partialFile);
    assert.ok(partialFile.endsWith(createHash("sha256").update(partialAsset.bytes).digest("hex") + ".png"),
      "published partial bytes must be delivered before a source recovery changes the current image");
    const requestsBeforeRetry = source.requests.length;
    const recovered = await service.getTerrainOverlay(recoveryRequest);
    assert.equal(recovered.data.state, "AVAILABLE"); assert.equal(recovered.data.failureCode, undefined);
    assert.notEqual(recovered.data.imageUrl, first.data.imageUrl);
    assert.equal(source.requests.length, requestsBeforeRetry + 1, "retry retrieves the failed tile while retaining completed independent sources");
    assert.deepEqual((await terrain.getAsset(partialFile)).bytes, partialAsset.bytes, "advancing metadata cannot replace or strand the previously published partial PNG");
  } finally { terrain.close(); renderer.close(); await rm(directory, { recursive: true, force: true }); }
});

test("the immutable viewport URL reconstructs all bounds without rounding drift after cache eviction", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "starward-terrain-viewport-test-"));
  const source = sourceTransport(), renderer = createTerrainViewportRenderer(source.transport);
  let service = new TerrainService({ directory, renderer: renderer.render });
  try {
    const publication = await service.getPublication(request); assert.ok(publication);
    const first = await service.getAsset(publication.image.file);
    assert.equal(createHash("sha256").update(first.bytes).digest("hex"), publication.image.sha256);
    service.close(); await rm(directory, { recursive: true, force: true });
    service = new TerrainService({ directory, renderer: renderer.render });
    assert.deepEqual((await service.getAsset(publication.image.file)).bytes, first.bytes);
    const moved = { ...request, viewportBounds: { ...request.viewportBounds!, east: 117.2 } };
    assert.notEqual(terrainRequestKey(request), terrainRequestKey(moved));
    assert.equal(terrainRequestKey(request), terrainRequestKey(normalizeTerrainRequest(request)));
    assert.throws(() => validateTerrainRequest({ ...request, radiusKm: 50 } as unknown as TerrainOverlayRequest), /request_invalid/u);
  } finally { service.close(); renderer.close(); await rm(directory, { recursive: true, force: true }); }
});
