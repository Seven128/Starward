import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { NightReportService } from "./modules/night-report/night-report-service";
import { createNightReportHandler } from "./modules/night-report/night-report-handler";
import type { AwaitedNightReportRuntime } from "./modules/night-report/runtime-types";
import { NightReportPersistenceError } from "./modules/night-report/sqlite-night-report-repository";
import type { LocalPocOwnerResolver } from "./local-poc-owner";
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
import type { ItineraryService } from "./modules/itinerary/itinerary-service";
import type { ItineraryActorResolver } from "./modules/itinerary/itinerary-routes";
import type { FieldService } from "./modules/field/field-service";
import type { FieldReportService } from "./modules/field/report-service";
import type { FieldReportActorResolver } from "./modules/field/report-routes";
import type { CommunityWorkflowService } from "./modules/community/community-workflow-service";
import type { AwaitedCommunityRuntime } from "./modules/community/runtime-types";
import type { ToolsService } from "./modules/notifications/tools-service";
import type { NotificationRuleService } from "./modules/notifications/rule-service";
import type { NotificationEvaluationService } from "./modules/notifications/evaluation-service";
import type { NotificationRuleActorResolver } from "./modules/notifications/rule-routes";
import type { AdminOperationsService } from "./modules/admin/admin-operations-service";
import type { AwaitedAdminRuntime } from "./modules/admin/runtime-types";
import type { QualityService } from "./modules/quality/quality-service";
import type { AwaitedQualityRuntime } from "./modules/quality/runtime-types";
import { registerFeatureRoutes } from "./feature-routes";

export interface ApiDependencies {
  nightReports: Pick<NightReportService, "create"> & Partial<Pick<NightReportService, "generate">>; nightReportRuntime?: AwaitedNightReportRuntime; resolveNightReportActor?: LocalPocOwnerResolver;
  spots: Pick<SpotTrustService, "getDetail">; resolveSpotActor: SpotActorResolver; spotTrustRuntime?: AwaitedSpotTrustRuntime;
  allowedOrigins: string[]; logger?: boolean; now?: () => Date;
  forecast?: Pick<ForecastQueryService, "get">; forecastRuntime?: AwaitedForecastRuntime;
  mapSpots?: SpotSearchProvider; routes?: Pick<RouteService, "load">; mapRouteRuntime?: AwaitedMapRouteRuntime;
  sky?: Pick<SkyContextService, "get">;
  shooting?: Pick<ShootingPreviewService, "get">; shootingRuntime?: AwaitedShootingRuntime;
  profile?: Pick<ProfileService, "get" | "command">; identityRuntime?: AwaitedIdentityRuntime;
  itineraries?: Pick<ItineraryService, "list" | "get" | "command">; resolveItineraryActor?: ItineraryActorResolver;
  field?: Pick<FieldService, "get">;
  fieldReports?: Pick<FieldReportService, "list" | "get" | "command">; resolveFieldReportActor?: FieldReportActorResolver;
  community?: Pick<CommunityWorkflowService, "get" | "command">; communityRuntime?: AwaitedCommunityRuntime;
  tools?: Pick<ToolsService, "get" | "command">;
  notificationRules?: Pick<NotificationRuleService, "list" | "get" | "command">; resolveNotificationActor?: NotificationRuleActorResolver;
  notificationEvaluations?: Pick<NotificationEvaluationService, "controls" | "command" | "inbox" | "activity">;
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
  app.get("/v1/night-report-session", async (request, reply) => {
    reply.header("cache-control", "private, no-store").header("vary", "authorization");
    try {
      const actor = await dependencies.resolveNightReportActor?.(request) ?? null;
      return { schemaVersion: "starward-night-report-session-v1", ...(dependencies.nightReportRuntime && actor?.scope === "local-owner-poc" && actor.id.trim() ? { storage: "local-owner-poc-v1", ownerId: actor.id } : { storage: "ephemeral" }) };
    } catch { return reply.code(503).send({ code: "night_report_session_unavailable", outcome: "unknown" }); }
  });
  app.post("/v1/night-reports", async (request, reply) => {
    const headers = Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, value]));
    const actor = await dependencies.resolveNightReportActor?.(request) ?? null;
    const response = await nightReportHandler({ body: request.body, headers, actor });
    for (const [name, value] of Object.entries(response.headers)) reply.header(name, value);
    return reply.code(response.status).send(response.body);
  });
  const readReport = async (request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply, result: boolean, id: string) => {
    reply.header("cache-control", "private, no-store").header("vary", "authorization");
    try {
      const actor = await dependencies.resolveNightReportActor?.(request) ?? null;
      if (!actor) throw new NightReportPersistenceError("night_report_owner_required", 403);
      if (!dependencies.nightReportRuntime) throw new Error("night_report_storage_unavailable");
      return reply.send(result ? dependencies.nightReportRuntime.service.result(actor, id) : { schemaVersion: "starward-night-report-persistence-v1", scope: "local-owner-poc", ownerId: actor.id, report: dependencies.nightReportRuntime.service.get(actor, id) });
    } catch (error) {
      if (error instanceof NightReportPersistenceError) return reply.code(error.statusCode).send({ code: error.code, outcome: "rejected" });
      return reply.code(503).send({ code: "night_report_storage_unavailable", outcome: "unknown" });
    }
  };
  app.get<{ Params: { id: string } }>("/v1/night-reports/:id", (request, reply) => readReport(request, reply, false, request.params.id));
  app.get<{ Params: { requestId: string } }>("/v1/night-report-requests/:requestId", (request, reply) => readReport(request, reply, true, request.params.requestId));
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
  await app.register(cors, { credentials: true, exposedHeaders: ["etag", "x-request-id", "x-night-report-storage", "x-night-report-owner", "x-night-report-replayed"], origin(origin, callback) { if (!origin || allowedOrigins.has(origin)) callback(null, true); else callback(new Error("origin_not_allowed"), false); } });
  app.get("/health/live", async () => ({ status: "ok", at: (dependencies.now ?? (() => new Date()))().toISOString() }));
  registerFeatureRoutes(app, dependencies);
  registerCoreRoutes(app, dependencies);
  registerErrorHandling(app);
  return app;
}
