import assert from "node:assert/strict";
import test from "node:test";
import { Controller, Get, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import Fastify from "fastify";
import {
  loadPublicRateLimitConfig,
  publicRateLimitPluginOptions,
  registerRateLimitPlugin,
} from "./rate-limit.ts";
import type { ReleaseMetadata } from "./release-metadata.ts";

const remoteRelease: ReleaseMetadata = {
  environment: "staging",
  revision: "a".repeat(40),
  imageDigest: `sha256:${"b".repeat(64)}`,
  releasedAt: "2026-08-26T12:00:00.000Z",
};

@Controller()
class LimitedTestController {
  @Get("limited")
  limited() {
    return { ok: true };
  }
}

@Module({ controllers: [LimitedTestController] })
class LimitedTestModule {}

test("remote limiter requires bounded explicit Redis-backed configuration", () => {
  assert.deepEqual(
    loadPublicRateLimitConfig(remoteRelease, {
      REDIS_URL: "redis://:secret@redis:6379/0",
      MINIAPP_RATE_LIMIT_MAX: "120",
      MINIAPP_RATE_LIMIT_WINDOW_MS: "60000",
    }),
    {
      enabled: true,
      environment: "staging",
      max: 120,
      timeWindowMs: 60_000,
      redisUrl: "redis://:secret@redis:6379/0",
      namespace: "starward:rate-limit:staging:",
    },
  );
  assert.throws(
    () => loadPublicRateLimitConfig(remoteRelease, {
      MINIAPP_RATE_LIMIT_MAX: "120",
      MINIAPP_RATE_LIMIT_WINDOW_MS: "60000",
    }),
    /REDIS_URL/u,
  );
  assert.throws(
    () => loadPublicRateLimitConfig(remoteRelease, {
      REDIS_URL: "redis://:secret@redis:6379/0",
      MINIAPP_RATE_LIMIT_MAX: "0",
      MINIAPP_RATE_LIMIT_WINDOW_MS: "60000",
    }),
    /MINIAPP_RATE_LIMIT_MAX/u,
  );
});

test("local development keeps the public limiter disabled", () => {
  assert.equal(
    loadPublicRateLimitConfig({ ...remoteRelease, environment: "local" }, {}).enabled,
    false,
  );
});

test("limiter normalizes equivalent IPv6 clients and returns stable 429 shape", async () => {
  const config = {
    ...loadPublicRateLimitConfig(remoteRelease, {
      REDIS_URL: "redis://:secret@redis:6379/0",
      MINIAPP_RATE_LIMIT_MAX: "1",
      MINIAPP_RATE_LIMIT_WINDOW_MS: "60000",
    }),
    redisUrl: null,
  };
  const app = Fastify({ trustProxy: ["127.0.0.1/32"] });
  await registerRateLimitPlugin(app, publicRateLimitPluginOptions(config));
  app.get("/limited", async () => ({ ok: true }));

  const first = await app.inject({
    method: "GET",
    url: "/limited",
    headers: { "x-forwarded-for": "2001:db8:1:2::1" },
  });
  const second = await app.inject({
    method: "GET",
    url: "/limited",
    headers: {
      "x-forwarded-for": "2001:0db8:0001:0002:ffff:ffff:ffff:ffff",
      "x-request-id": "request-ipv6-0001",
    },
  });

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 429);
  assert.deepEqual(second.json(), {
    statusCode: 429,
    code: "RATE_LIMITED",
    message: "RATE_LIMITED",
    retryable: true,
    recovery: ["WAIT_AND_RETRY"],
    requestId: "request-ipv6-0001",
  });
  assert.equal(second.headers["retry-after"], "60");
  await app.close();
});

test("only exact internal liveness and readiness probes are exempt", async () => {
  const config = {
    ...loadPublicRateLimitConfig(remoteRelease, {
      REDIS_URL: "redis://:secret@redis:6379/0",
      MINIAPP_RATE_LIMIT_MAX: "1",
      MINIAPP_RATE_LIMIT_WINDOW_MS: "60000",
    }),
    redisUrl: null,
  };
  const app = Fastify();
  await registerRateLimitPlugin(app, publicRateLimitPluginOptions(config));
  app.get("/health/ready", async () => ({ ready: true }));
  app.get("/health/release", async () => ({ release: true }));

  const internal = { remoteAddress: "172.30.10.2" };
  assert.equal((await app.inject({ url: "/health/ready", ...internal })).statusCode, 200);
  assert.equal((await app.inject({ url: "/health/ready", ...internal })).statusCode, 200);
  assert.equal((await app.inject({ url: "/health/release", ...internal })).statusCode, 200);
  assert.equal((await app.inject({ url: "/health/release", ...internal })).statusCode, 429);
  await app.close();
});

test("startup registration applies the limiter to Nest-owned routes", async () => {
  const config = {
    ...loadPublicRateLimitConfig(remoteRelease, {
      REDIS_URL: "redis://:secret@redis:6379/0",
      MINIAPP_RATE_LIMIT_MAX: "1",
      MINIAPP_RATE_LIMIT_WINDOW_MS: "60000",
    }),
    redisUrl: null,
  };
  const app = await NestFactory.create<NestFastifyApplication>(
    LimitedTestModule,
    new FastifyAdapter(),
    { logger: false },
  );
  const fastify = app.getHttpAdapter().getInstance();
  await registerRateLimitPlugin(fastify, publicRateLimitPluginOptions(config));
  await app.init();

  assert.equal((await fastify.inject({ url: "/limited" })).statusCode, 200);
  assert.equal((await fastify.inject({ url: "/limited" })).statusCode, 429);
  await app.close();
});
