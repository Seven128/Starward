import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { EtagInterceptor } from "./etag.interceptor.ts";
import {
  loadPublicRateLimitConfig,
  registerPublicRateLimit,
} from "./rate-limit.ts";
import {
  fastifyDeploymentOptions,
  loadHttpDeploymentConfig,
  loadReleaseMetadata,
} from "./release-metadata.ts";

const host = process.env.MINIAPP_API_HOST ?? "127.0.0.1";
const port = Number(process.env.MINIAPP_API_PORT ?? 8787);
const release = loadReleaseMetadata();
const http = loadHttpDeploymentConfig(release);
const publicRateLimit = loadPublicRateLimitConfig(release);

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(fastifyDeploymentOptions(http)),
  { logger: ["error", "warn", "log"] },
);
app.enableCors({
  origin:
    release.environment === "local"
      ? [/^http:\/\/127\.0\.0\.1(?::\d+)?$/u]
      : http.origins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: [
    "content-type",
    "authorization",
    "idempotency-key",
    "if-none-match",
    "x-admin-token",
    "x-admin-actor",
    "x-request-id",
  ],
});
app.useGlobalFilters(new ApiExceptionFilter());
app.useGlobalInterceptors(new EtagInterceptor());
app.enableShutdownHooks();
try {
  await registerPublicRateLimit(app.getHttpAdapter().getInstance(), publicRateLimit);
  await app.listen(port, host);
} catch (error) {
  await app.close();
  throw error;
}
Logger.log(
  JSON.stringify({
    event: "miniapp_api_ready",
    address: `http://${host}:${port}`,
    release,
  }),
  "Bootstrap",
);
