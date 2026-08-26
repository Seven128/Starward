import rateLimit from "@fastify/rate-limit";
import type {
  FastifyInstance,
  FastifyPluginCallback,
  FastifyRequest,
} from "fastify";
import Redis from "ioredis";
import { requestIdFromHeaders } from "./request-id.ts";
import type { ReleaseMetadata } from "./release-metadata.ts";

export interface PublicRateLimitConfig {
  enabled: boolean;
  environment: ReleaseMetadata["environment"];
  max: number;
  timeWindowMs: number;
  redisUrl: string | null;
  namespace: string;
}

function selected(name: string, environment: NodeJS.ProcessEnv) {
  const value = environment[name]?.trim();
  return value ? value : null;
}

function boundedInteger(
  name: string,
  raw: string | null,
  minimum: number,
  maximum: number,
) {
  if (!raw || !/^[1-9][0-9]*$/u.test(raw))
    throw new Error(`rate_limit_config_required:${name}`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new Error(`rate_limit_config_invalid:${name}`);
  return value;
}

export function loadPublicRateLimitConfig(
  release: ReleaseMetadata,
  environment: NodeJS.ProcessEnv = process.env,
): PublicRateLimitConfig {
  if (release.environment === "local")
    return Object.freeze({
      enabled: false,
      environment: "local",
      max: 0,
      timeWindowMs: 0,
      redisUrl: null,
      namespace: "starward:rate-limit:local:",
    });

  const redisUrl = selected("REDIS_URL", environment);
  if (!redisUrl) throw new Error("rate_limit_config_required:REDIS_URL");
  const parsedRedis = new URL(redisUrl);
  if (
    (parsedRedis.protocol !== "redis:" && parsedRedis.protocol !== "rediss:") ||
    !parsedRedis.hostname ||
    parsedRedis.hash
  )
    throw new Error("rate_limit_config_invalid:REDIS_URL");

  return Object.freeze({
    enabled: true,
    environment: release.environment,
    max: boundedInteger(
      "MINIAPP_RATE_LIMIT_MAX",
      selected("MINIAPP_RATE_LIMIT_MAX", environment),
      1,
      5_000,
    ),
    timeWindowMs: boundedInteger(
      "MINIAPP_RATE_LIMIT_WINDOW_MS",
      selected("MINIAPP_RATE_LIMIT_WINDOW_MS", environment),
      1_000,
      3_600_000,
    ),
    redisUrl,
    namespace: `starward:rate-limit:${release.environment}:`,
  });
}

function isInternalHealthProbe(request: FastifyRequest) {
  if (request.url !== "/health/live" && request.url !== "/health/ready")
    return false;
  return (
    request.ip === "172.30.10.2" ||
    request.ip === "127.0.0.1" ||
    request.ip === "::1"
  );
}

async function allowInternalHealthProbe(
  request: FastifyRequest,
  redis: Redis | undefined,
) {
  if (!isInternalHealthProbe(request)) return false;
  if (request.url === "/health/live" || !redis) return true;
  return (await redis.ping()) === "PONG";
}

export function publicRateLimitPluginOptions(
  config: PublicRateLimitConfig,
  redis?: Redis,
) {
  return {
    global: true,
    max: config.max,
    timeWindow: config.timeWindowMs,
    redis,
    nameSpace: config.namespace,
    ipv6Subnet: 64,
    skipOnError: false,
    continueExceeding: false,
    allowList: (request: FastifyRequest) =>
      allowInternalHealthProbe(request, redis),
    errorResponseBuilder: (request: FastifyRequest) => ({
      statusCode: 429,
      code: "RATE_LIMITED",
      message: "RATE_LIMITED",
      retryable: true,
      recovery: ["WAIT_AND_RETRY"],
      requestId: requestIdFromHeaders(request.headers),
    }),
  } as const;
}

export async function registerRateLimitPlugin(
  fastify: FastifyInstance,
  options: ReturnType<typeof publicRateLimitPluginOptions>,
) {
  // The plugin declaration augments FastifyInstance and then requires those
  // decorations on its own pre-registration instance type. Isolate that
  // upstream type cycle here while keeping the concrete options fully typed.
  const plugin = rateLimit as unknown as FastifyPluginCallback<typeof options>;
  await fastify.register(plugin, options);
}

export async function registerPublicRateLimit(
  fastify: FastifyInstance,
  config: PublicRateLimitConfig,
) {
  if (!config.enabled) return;
  if (!config.redisUrl) throw new Error("rate_limit_config_required:REDIS_URL");

  const redis = new Redis(config.redisUrl, {
    lazyConnect: true,
    connectTimeout: 2_000,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    connectionName: `starward-${config.environment}-public-rate-limit`,
  });
  try {
    await redis.connect();
    if ((await redis.ping()) !== "PONG")
      throw new Error("rate_limit_redis_health_failed");
    fastify.addHook("onClose", async () => {
      if (redis.status !== "end") await redis.quit();
    });
    await registerRateLimitPlugin(
      fastify,
      publicRateLimitPluginOptions(config, redis),
    );
  } catch (error) {
    redis.disconnect(false);
    throw error;
  }
}
