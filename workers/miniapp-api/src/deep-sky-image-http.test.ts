import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";

test("deep-sky image HTTP route preserves JPEG bytes and cache-safe ASCII headers", async () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const service = {
    async getDeepSkyImage(reference: string, level: string) {
      assert.equal(reference, "M:31");
      assert.equal(level, "DETAIL");
      return {
        bytes: Buffer.from(jpeg),
        contentType: "image/jpeg",
        sourceLabel: "NASA/IPAC IRSA - AllWISE W3 12um",
        fieldDegrees: 0.6,
      };
    },
  } as MiniappService;
  class TestModule {}
  Module({
    controllers: [MiniappController],
    providers: [{ provide: MiniappService, useValue: service }],
  })(TestModule);
  const app = await NestFactory.create<NestFastifyApplication>(
    TestModule,
    new FastifyAdapter(),
    { logger: false },
  );
  const fastify = app.getHttpAdapter().getInstance();
  try {
    await app.init();
    const response = await fastify.inject({
      method: "GET",
      url: "/v2/celestial-objects/M%3A31/image?level=DETAIL",
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "image/jpeg");
    assert.equal(response.headers["cache-control"], "public, max-age=86400");
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(
      response.headers["x-starward-image-source"],
      "NASA/IPAC IRSA - AllWISE W3 12um",
    );
    assert.equal(response.headers["x-starward-image-field-degrees"], "0.6");
    assert.deepEqual(response.rawPayload, jpeg);
  } finally {
    await app.close();
  }
});
