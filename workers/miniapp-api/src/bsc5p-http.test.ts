import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { StellarCatalogController } from "./stellar-catalog.controller.ts";
import { StellarCatalogPublicationService } from "./stellar-catalog-publication.ts";
import { createStellarCatalogClient } from "../../../apps/wechat-miniapp/src/services/stellar-catalog-client.ts";
import { attachSkyCatalog, resolveSkySceneFrame } from "../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { projectAdoptedSkyCatalog } from "../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts";
import { positionBsc5pCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createBsc5pSkyCatalogProvider } from "./sky-scene-catalog-provider.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("real BSC5P catalog flows through a formal spot sky HTTP frame into the matching object details", async () => {
  const service = createTestMiniappService({ skyCatalog: createBsc5pSkyCatalogProvider() });
  const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-09-15" })).data;
  class TestModule {}
  Module({ controllers: [MiniappController, StellarCatalogController], providers: [StellarCatalogPublicationService, { provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const response = await fetch(`${base}/v2/spots/${encodeURIComponent(TEST_PUBLISHED_SPOT.spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}`);
    assert.equal(response.status, 200);
    const report = await response.json();
    const accepted = projectAdoptedSkyCatalog(report);
    assert.equal(accepted.data.skyScene.state, "AVAILABLE");
    const publicationClient = createStellarCatalogClient({
      request: async reference => {
        const response = await fetch(base + "/v2/sky/catalogs/" + reference.catalogVersion + "/" + reference.catalogHash);
        assert.equal(response.status, 200); return response.json();
      }, invalidate: () => assert.fail("valid publication rejected"),
    });
    const publication = await publicationClient(accepted.data.skyScene.catalog!);
    const scene = attachSkyCatalog(accepted.data, publication.data).skyScene;
    assert.equal(scene.state, "AVAILABLE", JSON.stringify({ reason: scene.unavailableReason, warnings: report.warnings, frames: scene.frames.length }));
    assert.equal(scene.catalog!.catalogVersion, "bsc5p-bright-stars.v2");
    assert.equal(scene.catalog!.entries.length, 8404);
    const frame = resolveSkySceneFrame(scene, report.data.hourly[0].at);
    const actual = positionBsc5pCatalog({ at: report.data.hourly[0].at, ...scene.observer! }).filter(p => p.visible);
    assert.equal(frame?.points.length, actual.length);
    frame!.points.forEach(([index, azimuth, altitude], i) => {
      assert.equal(scene.catalog!.entries[index]!.sourceId, actual[i]!.sourceId);
      assert.ok(Math.abs(azimuth-actual[i]!.azimuthDeg)<1e-10 && Math.abs(altitude-actual[i]!.altitudeDeg)<1e-10);
    });
    assert.ok(frame);
    const entry = scene.catalog!.entries[frame.points.find(([i])=>scene.catalog!.entries[i]!.magnitude>5)![0]]!;
    assert.ok(entry.magnitude>5, "newly included stars must have matching details, not just old bright stars");
    assert.match(entry.objectRef, /^HR:/);
    const selected = await fetch(`${base}/v2/celestial-objects/${encodeURIComponent(entry.objectRef)}?locale=zh-CN`);
    assert.equal(selected.status, 200);
    const information = await selected.json();
    assert.equal(information.data.reference, entry.objectRef);
    assert.equal(information.data.catalogId, entry.objectRef.replace(":", " "));
    assert.equal(information.data.displayName, entry.displayName ?? entry.objectRef.replace(":", " "));
    assert.ok(information.data.facts.some((fact: any) => fact.label === "V 波段视星等" && Number(fact.value) === entry.magnitude));
    assert.ok(information.sources.some((source: any) => source.provider.includes("HEASARC")));
    assert.equal(scene.frames.length, report.data.hourly.length);
    assert.ok(scene.frames.every((item: any, index: number) => item.at === report.data.hourly[index].at));
    assert.ok(Buffer.byteLength(JSON.stringify(report.data.skyScene)) < 300000, "dynamic report must not repeat the static star rows");
    assert.ok(Buffer.byteLength(JSON.stringify(JSON.stringify(report))) < 2 * 1_048_576, "full response fits the existing persisted item budget including JSON escaping");
  } finally { await app.close(); }
});

test("Mini Program production catalog/detail imports operate while retired Gaia and Hipparcos modules are unavailable", () => {
  const code = `import { registerHooks } from 'node:module';
    registerHooks({ resolve(specifier, context, next) {
      const result = next(specifier, context);
      if (/astronomy-core.*(?:gaia|hipparcos)/i.test(result.url)) throw new Error('retired_star_module_loaded:' + result.url);
      return result;
    }});
    const { createBsc5pSkyCatalogProvider } = await import('./src/sky-scene-catalog-provider.ts');
    const { CelestialObjectInformationService } = await import('./src/celestial-object-information.ts');
    await import('./src/deep-sky-scene-provider.ts'); await import('./src/deep-sky-imagery.ts');
    if (createBsc5pSkyCatalogProvider().load().rowCount !== 8404) throw new Error('catalog_missing');
    if (new CelestialObjectInformationService().get('HR:2491').data.displayName !== 'Sirius') throw new Error('identity_wrong');`;
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", code], { cwd: new URL("..", import.meta.url), encoding: "utf8", timeout: 30_000 });
  assert.equal(child.status, 0, child.stderr);
});
