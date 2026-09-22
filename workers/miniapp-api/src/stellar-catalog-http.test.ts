import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { loadBsc5pStarCatalog, positionBsc5pCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { projectStellarMotion } from "@starward/astronomy-core/stellar-vectors";
import { bsc5pHorizontalFrame } from "@starward/astronomy-core/bsc5p-catalog";
import { assertStellarCatalogPublication } from "@starward/miniapp-contracts";
import { StellarCatalogController } from "./stellar-catalog.controller.ts";
import { StellarCatalogPublicationService } from "./stellar-catalog-publication.ts";
import { EtagInterceptor } from "./etag.interceptor.ts";
import { createStellarCatalogClient } from "../../../apps/wechat-miniapp/src/services/stellar-catalog-client.ts";
import { createResponseCache } from "../../../apps/wechat-miniapp/src/services/response-cache.ts";

test("real static catalog HTTP delivers all 8404 stars to client validation, with conditional reuse and exact publication binding", async () => {
  class TestModule {}
  Module({ controllers: [StellarCatalogController], providers: [StellarCatalogPublicationService] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  app.useGlobalInterceptors(new EtagInterceptor());
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl(), owner = loadBsc5pStarCatalog("bsc5p-bright-stars.v2");
    const url = `${base}/v2/sky/catalogs/${owner.catalogVersion}/${owner.catalogHash}`;
    let bytes = 0, tag: string | null = null;
    const client = createStellarCatalogClient({
      async request() {
        const response = await fetch(url);
        assert.equal(response.status, 200);
        tag = response.headers.get("etag");
        const text = await response.text();
        bytes = Buffer.byteLength(text, "utf8");
        return JSON.parse(text);
      },
      invalidate() { assert.fail("valid real catalog was rejected"); },
    });
    const envelope = await client(owner);
    assert.equal(envelope.data.rows.length, 8404);
    assert.ok(bytes < 2 * 1024 * 1024, `actual envelope bytes: ${bytes}`);
    assert.equal(envelope.data.sources.length, 3);
    assert.ok(envelope.data.sources.some(source => source.sourceUrl === owner.manifest.sources.nameIdentities?.sourceUrl));
    assert.ok(envelope.data.sources[0]!.limitations.some(text => text.includes("6.5")));
    const disk = new Map<string, unknown>();
    const storage = {
      getStorageSync: (key: string) => disk.get(key), setStorageSync: (key: string, value: unknown) => { disk.set(key, value); },
      removeStorageSync: (key: string) => { disk.delete(key); }, getStorageInfoSync: () => ({ keys: [...disk.keys()] }),
      setStorage: async ({ key, data }: { key: string; data: string }) => { disk.set(key, data); },
    };
    const cache = createResponseCache(storage), cacheKey = `stellar-catalog:${owner.catalogVersion}:${owner.catalogHash}`;
    cache.set(cacheKey, envelope);
    await cache.flush();
    assert.ok([...disk.keys()].filter(key => key.includes(".chunk.")).length >= 5, "actual full publication spans multiple bounded writes");
    const restartedCache = createResponseCache(storage);
    const restored = restartedCache.get(cacheKey);
    assert.ok(restored, "full real publication must fit the existing persisted budget");
    assert.deepEqual(restored.envelope.data, envelope.data);
    restartedCache.clear(); await restartedCache.flush();
    const input = { at: new Date("2026-09-19T13:00:00.000Z"), latitude: 22.6, longitude: 114.5, elevationM: 30 };
    const frame = bsc5pHorizontalFrame(input), positions = positionBsc5pCatalog({ ...input, catalog: owner });
    for (let i = 0; i < owner.rows.length; i++) {
      const row = envelope.data.rows[i]!, original = owner.rows[i]!;
      assert.deepEqual(row.slice(0, 4), [original.sourceId, original.properName, original.vMag, original.bV]);
      const result = projectStellarMotion([row[4], row[5], row[6], row[7], row[8], row[9]], frame.julianYears, frame.equatorialToEnu);
      assert.equal(result.azimuthDeg, positions[i]!.azimuthDeg);
      assert.equal(result.altitudeDeg, positions[i]!.altitudeDeg);
    }
    const reused = await fetch(url, { headers: { "If-None-Match": tag! } });
    assert.equal(reused.status, 304);
    assert.equal(await reused.text(), "");
    const changedTag = await fetch(url, { headers: { "If-None-Match": "wrong" } });
    assert.equal(changedTag.status, 200);
    await changedTag.arrayBuffer();
    for (const suffix of [`${owner.catalogVersion}/${"0".repeat(64)}`, `bsc5p-bright-stars.v3/${owner.catalogHash}`,
      `bsc5p-bright-stars.v1/${owner.catalogHash}`]) {
      const denied = await fetch(`${base}/v2/sky/catalogs/${suffix}`);
      assert.equal(denied.status, 404);
      await denied.arrayBuffer();
    }
    console.log(JSON.stringify({ publication: owner.catalogVersion, rows: envelope.data.rows.length, envelopeBytes: bytes, http304: true }));
  } finally { await app.close(); }
});

test("catalog publication is immutable and stable across service instances", () => {
  const owner = loadBsc5pStarCatalog("bsc5p-bright-stars.v2");
  const service = new StellarCatalogPublicationService(), first = service.get(owner);
  assert.strictEqual(service.get(owner), first);
  const restarted = new StellarCatalogPublicationService().get(owner);
  assert.equal(restarted.etag, first.etag);
  assert.deepEqual(restarted.data, first.data);
  assert.throws(() => { (first.data.rows[0] as unknown as number[])[2] = 9; }, TypeError);
  assert.throws(() => { first.data.sources[0]!.title = "changed"; }, TypeError);
  assert.throws(() => { (first.data.sources[0]!.limitations as string[]).push("changed"); }, TypeError);
  assert.throws(() => { owner.manifest.sources.catalog.landingUrl = "https://example.invalid/changed"; }, TypeError);
  assert.throws(() => { owner.manifest.derivation.nonStellarExclusionList.push(9000); }, TypeError);
  assert.throws(() => { owner.manifest.sources.nameIdentities!.sourceUrl = "https://example.invalid/changed"; }, TypeError);
  const afterMutation = new StellarCatalogPublicationService().get(owner);
  assert.equal(afterMutation.etag, first.etag);
  assert.deepEqual(afterMutation.data.sources, first.data.sources);
});

test("publication validation rejects changed photometry, geometry, identity and provenance", () => {
  const owner = loadBsc5pStarCatalog("bsc5p-bright-stars.v2"), data = new StellarCatalogPublicationService().get(owner).data;
  const mutations = [
    (value: any) => { value.magnitudeBand = "VT"; },
    (value: any) => { value.rows[0][2] = 8; },
    (value: any) => { value.rows[0][3] = "0.1"; },
    (value: any) => { value.rows[0][4] *= 2; },
    (value: any) => { value.rows[1][0] = value.rows[0][0]; },
    (value: any) => { value.sources[0].sourceUrl = null; },
    (value: any) => { value.sources[0].kind = "TEST_FIXTURE"; },
    (value: any) => { value.sources[0].precision = undefined; },
  ];
  for (const mutate of mutations) {
    const wrong = structuredClone(data); mutate(wrong);
    assert.throws(() => assertStellarCatalogPublication(wrong, owner), /stellar_(?:geometry|publication)_invalid/);
  }
});
