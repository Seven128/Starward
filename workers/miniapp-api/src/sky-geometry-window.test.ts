import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { skyGeometryWindow, assertSkyTimeModel } from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { evaluateSkyTimeModel } from "@starward/astronomy-core/sky-time-model";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { DeterministicWeatherTestAdapter } from "./test-fixtures/deterministic-weather-adapter.ts";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { matchingSkyGeometryWindow } from "../../../apps/wechat-miniapp/src/services/sky-geometry-window-response.ts";
import { presentSkyTime } from "../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts";
import { attachSkyCatalog, resolveSkySceneFrame } from "../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { StellarCatalogPublicationService } from "./stellar-catalog-publication.ts";

test("HTTP cross-date geometry reuses the authorized observer without weather or a Context edit", async () => {
  let weatherCalls = 0;
  class Weather extends DeterministicWeatherTestAdapter {
    override async getHourly(input: Parameters<DeterministicWeatherTestAdapter["getHourly"]>[0]) {
      weatherCalls++; return super.getHourly(input);
    }
  }
  const service = createTestMiniappService({ weather: new Weather() });
  const spotId = TEST_PUBLISHED_SPOT.spotId;
  const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId },
    localDate: "2026-09-29", selectedAt: "2026-09-29T13:00:00.000Z" })).data;
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  try {
    await app.listen(0, "127.0.0.1");
    const at = "2026-09-28T13:15:17.123Z", window = skyGeometryWindow(at, context.timezone);
    const root = `${await app.getUrl()}/v2/spots/${encodeURIComponent(spotId)}/sky/geometry`;
    const query = `?contextId=${encodeURIComponent(context.contextId)}&at=${encodeURIComponent(at)}`;
    const reply = await fetch(root + query); assert.equal(reply.status, 200);
    const response = await reply.json();
    const observer = { latitude: TEST_PUBLISHED_SPOT.wgs84.latitude, longitude: TEST_PUBLISHED_SPOT.wgs84.longitude,
      elevationM: TEST_PUBLISHED_SPOT.altitudeM ?? 0 };
    const binding = { spotId, contextId: context.contextId, contextRevision: context.revision,
      contextFingerprint: context.contextFingerprint, timezone: context.timezone, observer, at };
    matchingSkyGeometryWindow(response, binding);
    assertSkyTimeModel(response.data.model, { observer, hourlyAt: window.hourlyAt });
    assert.equal(response.data.model.knots.length, 49);
    const explicitNight = await fetch(root + query + "&window=NIGHT");
    assert.equal(explicitNight.status, 200);
    assert.deepEqual((await explicitNight.json()).data, response.data);
    const shortReply = await fetch(root + query + "&window=TWO_HOURS");
    assert.equal(shortReply.status, 200);
    const short = await shortReply.json();
    const shortWindow = skyGeometryWindow(at, context.timezone, "TWO_HOURS");
    assertSkyTimeModel(short.data.model, { observer, hourlyAt: shortWindow.hourlyAt });
    assert.equal(short.validAt, shortWindow.startAt);
    assert.equal(short.data.model.knots.length, 5);
    assert.equal(short.data.model.algorithmVersion, response.data.model.algorithmVersion);
    assert.deepEqual(short.data.model.knots, response.data.model.knots.filter((knot: { at: string }) =>
      knot.at >= shortWindow.startAt && knot.at <= shortWindow.endAt), "all nine bodies use the unchanged scientific samples");
    assert.deepEqual(evaluateSkyTimeModel(short.data.model, at), evaluateSkyTimeModel(response.data.model, at));
    assert.equal(evaluateSkyTimeModel(short.data.model, window.startAt), null, "short supply cannot claim the rest of the night");
    assert.deepEqual({ ...short.data, model: response.data.model }, response.data, "scope and authorization bindings stay identical");
    assert.notEqual(short.sources[0].id, response.sources[0].id, "different model coverage has a different source identity");
    const inSameCell = await service.getSkyGeometryWindow(spotId, context.contextId,
      "2026-09-28T13:59:59.999Z", undefined, "TWO_HOURS");
    assert.deepEqual(inSameCell.data.model, short.data.model);
    assert.equal(inSameCell.sources[0]!.id, short.sources[0].id);
    const nextCell = await service.getSkyGeometryWindow(spotId, context.contextId, shortWindow.endAt, undefined, "TWO_HOURS");
    assert.equal(nextCell.data.model.startAt, shortWindow.endAt);
    assert.deepEqual(nextCell.data.model.knots[0], short.data.model.knots.at(-1), "adjacent models share the exact boundary sample");
    assert.equal(weatherCalls, 0, "a geometry preview cannot wait for or bill a weather report");
    assert.deepEqual(await service.observationContexts.get(context.contextId), context);
    assert.equal("targets" in response.data, false); assert.equal("hourly" in response.data, false);
    const report = (await service.getSky(spotId, context.contextId, null, "bsc5p-bright-stars.v3")).data;
    assert.equal(presentSkyTime(report, at), null, "the original report does not cover this date");
    const preview = presentSkyTime(report, at, response.data.model)!;
    assert.equal(preview.row.at, at); assert.equal(preview.weather, null);
    assert.equal(preview.report.targetFrames.length, 0);
    assert.notEqual(preview.row.sunAltitudeDeg, presentSkyTime(report, context.selectedAtUtc)!.row.sunAltitudeDeg);
    const publication = new StellarCatalogPublicationService().get(preview.report.skyScene.catalog!).data;
    const stellar = resolveSkySceneFrame(attachSkyCatalog(preview.report, publication).skyScene, at)!;
    assert.equal(stellar.points?.length, 8404, "all admitted base stars reach the cross-date consumer");
    assert(preview.report.skyScene.deepSky?.frames[0]?.points?.length, "registered deep objects retain their original anchor");
    assert.equal(preview.row.sunAltitudeDeg, evaluateSkyTimeModel(response.data.model, at)!.hourly.sunAltitudeDeg);
    for (const mutate of [
      (value: typeof response) => { value.data.contextRevision++; },
      (value: typeof response) => { value.data.model.observer.latitude += 1; },
      (value: typeof response) => { value.validAt = at; },
      (value: typeof response) => { value.data.model.knots[0].at = at; },
    ]) {
      const invalid = structuredClone(response); mutate(invalid);
      assert.throws(() => matchingSkyGeometryWindow(invalid, binding));
    }
    assert.equal((await fetch(root + query.replace(encodeURIComponent(context.contextId), "missing"))).status, 404);
    assert.equal((await fetch(root.replace(encodeURIComponent(spotId), "spot%3Aother") + query)).status, 400);
    assert.equal((await fetch(root + query.replace(encodeURIComponent(at), encodeURIComponent("2999-01-01T00:00:00.000Z")))).status, 400);
    assert.equal((await fetch(root + query.replace(encodeURIComponent(at), "invalid"))).status, 400);
    assert.equal((await fetch(root + query.replace(encodeURIComponent(at), encodeURIComponent("2999-01-01T00:00:00.000Z")) +
      "&window=TWO_HOURS")).status, 400);
    for (const suffix of ["&window=", "&window=two_hours", "&window=OTHER", "&window=NIGHT&window=TWO_HOURS"]) {
      const invalid = await fetch(root + query + suffix);
      assert.equal(invalid.status, 400);
      assert.equal((await invalid.json()).code, "INVALID_INPUT");
    }
  } finally { await app.close(); }
});
