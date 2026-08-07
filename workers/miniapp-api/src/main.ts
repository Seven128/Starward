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

const host = process.env.MINIAPP_API_HOST ?? "127.0.0.1";
const port = Number(process.env.MINIAPP_API_PORT ?? 8787);

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ bodyLimit: 2_000_000 }),
  { logger: ["error", "warn", "log"] },
);
app.enableCors({
  origin: [/^http:\/\/127\.0\.0\.1(?::\d+)?$/u],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: [
    "content-type",
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
await app.listen(port, host);
Logger.log(
  `Miniapp modular-monolith BFF listening on http://${host}:${port}/v1`,
  "Bootstrap",
);
