import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { NightReportService } from "./modules/night-report/night-report-service";
import { createNightReportHandler } from "./modules/night-report/night-report-handler";
import type { SpotTrustService } from "./modules/spots/spot-trust-service";
import { createSpotTrustHandler, type SpotActorResolver } from "./modules/spots/spot-trust-handler";

export interface ApiDependencies {
  nightReports: Pick<NightReportService, "create">;
  spots: Pick<SpotTrustService, "getDetail">;
  resolveSpotActor: SpotActorResolver;
  allowedOrigins: string[];
  logger?: boolean;
  now?: () => Date;
}

function normalizeOrigins(origins: string[]): Set<string> {
  const normalized = origins.map((origin) => origin.trim()).filter(Boolean);
  if (!normalized.length) throw new Error("api_allowed_origins_required");
  if (normalized.includes("*")) throw new Error("api_wildcard_origin_forbidden");
  return new Set(normalized);
}

export async function buildApi(dependencies: ApiDependencies): Promise<FastifyInstance> {
  const allowedOrigins = normalizeOrigins(dependencies.allowedOrigins);
  const app = Fastify({
    logger: dependencies.logger ?? false,
    bodyLimit: 64 * 1024,
    requestIdHeader: "x-request-id",
    genReqId: () => crypto.randomUUID(),
  });
  await app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) callback(null, true);
      else callback(new Error("origin_not_allowed"), false);
    },
  });

  app.get("/health/live", async () => ({ status: "ok", at: (dependencies.now ?? (() => new Date()))().toISOString() }));
  const nightReportHandler = createNightReportHandler(dependencies.nightReports);
  app.post("/v1/night-reports", async (request, reply) => {
    const headers = Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, value]));
    const response = await nightReportHandler({ body: request.body, headers });
    for (const [name, value] of Object.entries(response.headers)) reply.header(name, value);
    return reply.code(response.status).send(response.body);
  });
  const spotTrustHandler = createSpotTrustHandler(dependencies.spots, dependencies.resolveSpotActor);
  app.get<{ Params: { spotId: string } }>("/v1/spots/:spotId", async (request, reply) => {
    const headers = Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, value]));
    const response = await spotTrustHandler({ spotId: request.params.spotId, headers });
    for (const [name, value] of Object.entries(response.headers)) reply.header(name, value);
    return reply.code(response.status).send(response.body);
  });

  app.setNotFoundHandler((_request, reply) => reply.code(404).header("cache-control", "no-store").send({ code: "route_not_found" }));
  app.setErrorHandler((error, request, reply) => {
    const message = error instanceof Error ? error.message : "unknown_error";
    const candidateStatus = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : null;
    const status = message === "origin_not_allowed" ? 403 : candidateStatus !== null && candidateStatus < 500 ? candidateStatus : 500;
    request.log.error({ err: error, requestId: request.id }, "api_request_failed");
    return reply.code(status).header("cache-control", "no-store").send({ code: status === 403 ? "origin_not_allowed" : status === 413 ? "request_body_too_large" : "internal_error", requestId: request.id });
  });
  return app;
}
