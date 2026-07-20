import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { NightReportService } from "./modules/night-report/night-report-service";
import { createNightReportHandler } from "./modules/night-report/night-report-handler";
import type { AwaitedNightReportRuntime } from "./modules/night-report/runtime-types";
import type { SpotTrustService } from "./modules/spots/spot-trust-service";
import { createSpotTrustHandler, type SpotActorResolver } from "./modules/spots/spot-trust-handler";
import type { AwaitedSpotTrustRuntime } from "./modules/spots/runtime-types";
import type { ForecastQueryService } from "./modules/forecast/forecast-query-service";
import type { AwaitedForecastRuntime } from "./modules/forecast/runtime-types";
import type { SpotSearchProvider } from "./modules/map/spot-search-service";
import type { RouteService } from "./modules/map/route-service";
import type { AwaitedMapRouteRuntime } from "./modules/map/runtime-types";
import type { SkyContextService } from "./modules/sky/sky-context-service";
import type { ShootingPreviewService } from "./modules/shooting/shooting-preview-service";
import type { AwaitedShootingRuntime } from "./modules/shooting/runtime-types";
import type { ProfileService } from "./modules/identity/profile-service";
import type { AwaitedIdentityRuntime } from "./modules/identity/runtime-types";
import type { ItineraryWorkflowService } from "./modules/itinerary/itinerary-workflow-service";
import type { AwaitedItineraryRuntime } from "./modules/itinerary/runtime-types";
import type { FieldService } from "./modules/field/field-service";
import type { AwaitedFieldRuntime } from "./modules/field/runtime-types";
import type { CommunityWorkflowService } from "./modules/community/community-workflow-service";
import type { AwaitedCommunityRuntime } from "./modules/community/runtime-types";
import type { ToolsService } from "./modules/notifications/tools-service";
import type { AwaitedNotificationToolsRuntime } from "./modules/notifications/runtime-types";
import type { AdminOperationsService } from "./modules/admin/admin-operations-service";
import type { AwaitedAdminRuntime } from "./modules/admin/runtime-types";
import type { QualityService } from "./modules/quality/quality-service";
import type { AwaitedQualityRuntime } from "./modules/quality/runtime-types";
import { registerFeatureRoutes } from "./feature-routes";

export interface ApiDependencies {
  nightReports: Pick<NightReportService, "create">; nightReportRuntime?: AwaitedNightReportRuntime;
  spots: Pick<SpotTrustService, "getDetail">; resolveSpotActor: SpotActorResolver; spotTrustRuntime?: AwaitedSpotTrustRuntime;
  allowedOrigins: string[]; logger?: boolean; now?: () => Date;
  forecast?: Pick<ForecastQueryService, "get">; forecastRuntime?: AwaitedForecastRuntime;
  mapSpots?: SpotSearchProvider; routes?: Pick<RouteService, "load">; mapRouteRuntime?: AwaitedMapRouteRuntime;
  sky?: Pick<SkyContextService, "get">;
  shooting?: Pick<ShootingPreviewService, "get">; shootingRuntime?: AwaitedShootingRuntime;
  profile?: Pick<ProfileService, "get" | "command">; identityRuntime?: AwaitedIdentityRuntime;
  itineraries?: Pick<ItineraryWorkflowService, "get" | "command">; itineraryRuntime?: AwaitedItineraryRuntime;
  field?: Pick<FieldService, "get" | "command">; fieldRuntime?: AwaitedFieldRuntime;
  community?: Pick<CommunityWorkflowService, "get" | "command">; communityRuntime?: AwaitedCommunityRuntime;
  tools?: Pick<ToolsService, "get" | "command">; notificationToolsRuntime?: AwaitedNotificationToolsRuntime;
  admin?: Pick<AdminOperationsService, "get" | "command">; adminRuntime?: AwaitedAdminRuntime;
  quality?: Pick<QualityService, "get" | "command">; qualityRuntime?: AwaitedQualityRuntime;
}

function normalizeOrigins(origins: string[]): Set<string> {
  const normalized = origins.map((origin) => origin.trim()).filter(Boolean);
  if (!normalized.length) throw new Error("api_allowed_origins_required");
  if (normalized.includes("*")) throw new Error("api_wildcard_origin_forbidden");
  return new Set(normalized);
}

function registerCoreRoutes(app: FastifyInstance, dependencies: ApiDependencies) {
  const nightReportHandler = createNightReportHandler(dependencies.nightReports, dependencies.nightReportRuntime);
  app.post("/v1/night-reports", async (request, reply) => {
    const headers = Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, value]));
    const response = await nightReportHandler({ body: request.body, headers });
    for (const [name, value] of Object.entries(response.headers)) reply.header(name, value);
    return reply.code(response.status).send(response.body);
  });
  const spotTrustHandler = createSpotTrustHandler(dependencies.spots, dependencies.resolveSpotActor, dependencies.spotTrustRuntime);
  app.get<{ Params: { spotId: string } }>("/v1/spots/:spotId", async (request, reply) => {
    const headers = Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, value]));
    const response = await spotTrustHandler({ spotId: request.params.spotId, headers });
    for (const [name, value] of Object.entries(response.headers)) reply.header(name, value);
    return reply.code(response.status).send(response.body);
  });
}

function registerErrorHandling(app: FastifyInstance) {
  app.setNotFoundHandler((_request, reply) => reply.code(404).header("cache-control", "no-store").send({ code: "route_not_found" }));
  app.setErrorHandler((error, request, reply) => {
    const message = error instanceof Error ? error.message : "unknown_error";
    const candidate = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : null;
    const status = message === "origin_not_allowed" ? 403 : candidate !== null && candidate < 500 ? candidate : 500;
    request.log.error({ err: error, requestId: request.id }, "api_request_failed");
    return reply.code(status).header("cache-control", "no-store").send({ code: status === 403 ? "origin_not_allowed" : status === 413 ? "request_body_too_large" : "internal_error", requestId: request.id });
  });
}

export async function buildApi(dependencies: ApiDependencies): Promise<FastifyInstance> {
  const allowedOrigins = normalizeOrigins(dependencies.allowedOrigins);
  const app = Fastify({ logger: dependencies.logger ?? false, bodyLimit: 64 * 1024, requestIdHeader: "x-request-id", genReqId: () => crypto.randomUUID() });
  await app.register(cors, { credentials: true, origin(origin, callback) { if (!origin || allowedOrigins.has(origin)) callback(null, true); else callback(new Error("origin_not_allowed"), false); } });
  app.get("/health/live", async () => ({ status: "ok", at: (dependencies.now ?? (() => new Date()))().toISOString() }));
  registerFeatureRoutes(app, dependencies);
  registerCoreRoutes(app, dependencies);
  registerErrorHandling(app);
  return app;
}
