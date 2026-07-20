import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { NightReportService } from "./modules/night-report/night-report-service";
import { createNightReportHandler } from "./modules/night-report/night-report-handler";
import type { SpotTrustService } from "./modules/spots/spot-trust-service";
import { createSpotTrustHandler, type SpotActorResolver } from "./modules/spots/spot-trust-handler";
import type { ForecastQueryService } from "./modules/forecast/forecast-query-service";
import { createForecastHandler } from "./modules/forecast/forecast-handler";
import type { SpotSearchProvider } from "./modules/map/spot-search-service";
import type { RouteService } from "./modules/map/route-service";
import { createMapSpotsHandler, createRouteHandler } from "./modules/map/map-handler";
import type { SkyContextService } from "./modules/sky/sky-context-service";
import { createSkyContextHandler } from "./modules/sky/sky-context-handler";
import type { ShootingPreviewService } from "./modules/shooting/shooting-preview-service";
import { createShootingPreviewHandler } from "./modules/shooting/shooting-preview-handler";

export interface ApiDependencies {
  nightReports: Pick<NightReportService, "create">;
  spots: Pick<SpotTrustService, "getDetail">;
  resolveSpotActor: SpotActorResolver;
  allowedOrigins: string[];
  logger?: boolean;
  now?: () => Date;
  forecast?: Pick<ForecastQueryService, "get">;
  mapSpots?: SpotSearchProvider;
  routes?: Pick<RouteService, "load">;
  sky?: Pick<SkyContextService, "get">;
  shooting?: Pick<ShootingPreviewService, "get">;
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
  if (dependencies.forecast) {
    const forecastHandler = createForecastHandler(dependencies.forecast);
    app.get<{ Querystring: Record<string, string> }>("/v1/forecast/hourly", async (request, reply) => {
      const response = await forecastHandler(request.query);
      for (const [name, value] of Object.entries(response.headers)) reply.header(name, value);
      return reply.code(response.status).send(response.body);
    });
    app.get<{ Querystring: Record<string, string> }>("/v1/astronomy/evidence", async (request, reply) => {
      const response = await forecastHandler(request.query);
      for (const [name, value] of Object.entries(response.headers)) reply.header(name, value);
      return reply.code(response.status).send("astronomy" in response.body ? response.body.astronomy : response.body);
    });
  }
  if (dependencies.mapSpots) {
    const mapSpotsHandler = createMapSpotsHandler(dependencies.mapSpots, dependencies.now);
    app.get<{ Querystring: Record<string, string> }>("/v1/map/spots", async (request, reply) => {
      const response = await mapSpotsHandler(request.query);
      return reply.code(response.status).header("cache-control", "private, max-age=300").send(response.body);
    });
  }
  if (dependencies.routes) {
    const routeHandler = createRouteHandler(dependencies.routes);
    app.post("/v1/routes/plan", async (request, reply) => {
      const response = await routeHandler(request.body);
      return reply.code(response.status).header("cache-control", "private, no-store").send(response.body);
    });
  }
  if (dependencies.sky) {
    const skyHandler = createSkyContextHandler(dependencies.sky);
    app.get<{ Querystring: Record<string, string> }>("/v1/sky", async (request, reply) => {
      const response = await skyHandler(request.query);
      return reply.code(response.status).header("cache-control", "private, max-age=900").send(response.body);
    });
  }
  if (dependencies.shooting) {
    const shootingHandler = createShootingPreviewHandler(dependencies.shooting);
    app.get<{ Querystring: Record<string, string> }>("/v1/shooting-plans", async (request, reply) => {
      const response = await shootingHandler(request.query);
      return reply.code(response.status).header("cache-control", "private, max-age=300").send(response.body);
    });
  }
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
