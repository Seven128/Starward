import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { ApiExceptionFilter } from "./api-exception.filter.js";
import { EtagInterceptor } from "./etag.interceptor.js";
import { loadPublicRateLimitConfig, registerPublicRateLimit, } from "./rate-limit.js";
import { fastifyDeploymentOptions, loadHttpDeploymentConfig, loadReleaseMetadata, } from "./release-metadata.js";
const host = process.env.MINIAPP_API_HOST ?? "127.0.0.1";
const port = Number(process.env.MINIAPP_API_PORT ?? 8787);
const release = loadReleaseMetadata();
const http = loadHttpDeploymentConfig(release);
const publicRateLimit = loadPublicRateLimitConfig(release);
const app = await NestFactory.create(AppModule, new FastifyAdapter(fastifyDeploymentOptions(http)), { logger: ["error", "warn", "log"] });
app.enableCors({
    origin: release.environment === "local"
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
        "x-wechat-reauth-code",
    ],
});
app.useGlobalFilters(new ApiExceptionFilter());
app.useGlobalInterceptors(new EtagInterceptor());
app.enableShutdownHooks();
try {
    await registerPublicRateLimit(app.getHttpAdapter().getInstance(), publicRateLimit);
    await app.listen(port, host);
}
catch (error) {
    await app.close();
    throw error;
}
Logger.log(JSON.stringify({
    event: "miniapp_api_ready",
    address: `http://${host}:${port}`,
    release,
}), "Bootstrap");
//# sourceMappingURL=main.js.map