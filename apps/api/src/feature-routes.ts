import type { FastifyInstance } from "fastify";
import type { ApiDependencies } from "./server";
import { createForecastHandler } from "./modules/forecast/forecast-handler";
import { createMapSpotsHandler, createRouteHandler } from "./modules/map/map-handler";
import { createSkyContextHandler } from "./modules/sky/sky-context-handler";
import { createShootingPreviewHandler } from "./modules/shooting/shooting-preview-handler";

interface CommandRouteConfig {
  base: string;
  commandBase?: string;
  invalidCode: string;
  commands: string[];
  actorId: string;
  outcome: string;
  operation: string;
  privateAuthorization?: boolean;
  service: { get(): unknown; command(command: never): unknown };
  runtime?: { execute(request: any): Promise<unknown> };
}

function registerCommandRoute(app: FastifyInstance, config: CommandRouteConfig) {
  app.get(config.base, async (_request, reply) => {
    const response = reply.header("cache-control", "private, no-store");
    if (config.privateAuthorization) response.header("vary", "authorization");
    return response.send(config.service.get());
  });
  app.post<{ Body: { command?: string } }>(`${config.commandBase ?? config.base}/commands`, async (request, reply) => {
    const command = request.body?.command;
    if (!command || !config.commands.includes(command)) return reply.code(400).header("cache-control", "no-store").send({ code: config.invalidCode });
    await config.runtime?.execute({ outcome: config.outcome, actorId: config.actorId, operation: config.operation, idempotencyKey: `${config.outcome}:${request.id}`, payload: { token: command, command, correlationId: request.id } });
    const response = reply.header("cache-control", "private, no-store");
    if (config.privateAuthorization) response.header("vary", "authorization");
    return response.send(config.service.command(command as never));
  });
}

function registerForecast(app: FastifyInstance, dependencies: ApiDependencies) {
  if (!dependencies.forecast) return;
  const handler = createForecastHandler(dependencies.forecast, dependencies.forecastRuntime);
  app.get<{ Querystring: Record<string, string> }>("/v1/forecast/hourly", async (request, reply) => {
    const response = await handler(request.query);
    for (const [name, value] of Object.entries(response.headers)) reply.header(name, value);
    return reply.code(response.status).send(response.body);
  });
  app.get<{ Querystring: Record<string, string> }>("/v1/astronomy/evidence", async (request, reply) => {
    const response = await handler(request.query);
    for (const [name, value] of Object.entries(response.headers)) reply.header(name, value);
    return reply.code(response.status).send("astronomy" in response.body ? response.body.astronomy : response.body);
  });
}

function registerMapAndSky(app: FastifyInstance, dependencies: ApiDependencies) {
  if (dependencies.mapSpots) {
    const handler = createMapSpotsHandler(dependencies.mapSpots, dependencies.now);
    app.get<{ Querystring: Record<string, string> }>("/v1/map/spots", async (request, reply) => {
      const response = await handler(request.query);
      return reply.code(response.status).header("cache-control", "private, max-age=300").send(response.body);
    });
  }
  if (dependencies.routes) {
    const handler = createRouteHandler(dependencies.routes, dependencies.mapRouteRuntime);
    app.post("/v1/routes/plan", async (request, reply) => {
      const response = await handler(request.body);
      return reply.code(response.status).header("cache-control", "private, no-store").send(response.body);
    });
  }
  if (dependencies.sky) {
    const handler = createSkyContextHandler(dependencies.sky);
    app.get<{ Querystring: Record<string, string> }>("/v1/sky", async (request, reply) => {
      const response = await handler(request.query);
      return reply.code(response.status).header("cache-control", "private, max-age=900").send(response.body);
    });
  }
}

function registerShooting(app: FastifyInstance, dependencies: ApiDependencies) {
  if (!dependencies.shooting) return;
  const handler = createShootingPreviewHandler(dependencies.shooting, dependencies.shootingRuntime);
  app.get<{ Querystring: Record<string, string> }>("/v1/shooting-plans", async (request, reply) => {
    const response = await handler(request.query);
    return reply.code(response.status).header("cache-control", "private, max-age=300").send(response.body);
  });
}

function registerCommandRoutes(app: FastifyInstance, dependencies: ApiDependencies) {
  const routes: Array<CommandRouteConfig | null> = [
    dependencies.profile ? { base: "/v1/profile", invalidCode: "invalid_profile_command", commands: ["merge-guest", "revoke-session", "inspect-content", "request-export", "request-deletion", "open-sources", "restrict-location"], actorId: "user-demo", outcome: "identity-profile-privacy", operation: "profile.update", privateAuthorization: true, service: dependencies.profile, runtime: dependencies.identityRuntime } : null,
    dependencies.itineraries ? { base: "/v1/itineraries", invalidCode: "invalid_itinerary_command", commands: ["generate", "overview", "add-candidate", "select-route", "refresh", "share-offline", "merge-collaboration", "astronomy-timeline"], actorId: "user-demo", outcome: "itinerary-and-collaboration", operation: "itinerary.create", privateAuthorization: true, service: dependencies.itineraries, runtime: dependencies.itineraryRuntime } : null,
    dependencies.field ? { base: "/v1/field", invalidCode: "invalid_field_command", commands: ["verify-pack", "toggle-red", "switch-backup", "start-session", "share-location", "save-report", "enter-offline"], actorId: "user-demo", outcome: "field-offline-safety", operation: "field.pack-and-report", service: dependencies.field, runtime: dependencies.fieldRuntime } : null,
    dependencies.community ? { base: "/v1/community", invalidCode: "invalid_community_command", commands: ["submit-spot", "submit-report", "submit-correction", "upload-media", "open-trust", "publish-review"], actorId: "user-demo", outcome: "community-contribution", operation: "community.media-contribute", service: dependencies.community, runtime: dependencies.communityRuntime } : null,
    dependencies.tools ? { base: "/v1/tools", invalidCode: "invalid_tools_command", commands: ["create-rule", "open-risk", "change-controls", "calendar", "position", "professional", "learning"], actorId: "user-demo", outcome: "notifications-and-toolbox", operation: "notification.rule-create", service: dependencies.tools, runtime: dependencies.notificationToolsRuntime } : null,
    dependencies.admin ? { base: "/v1/admin/data-status", commandBase: "/v1/admin", invalidCode: "invalid_admin_command", commands: ["provider-tco-evaluate", "job-replay", "spot-merge-review", "moderation-open-case", "source-disable", "dataset-release-preview", "admin-open-audit", "pipeline-open-run"], actorId: "admin-demo", outcome: "admin-data-operations", operation: "admin.job-replay", privateAuthorization: true, service: dependencies.admin, runtime: dependencies.adminRuntime } : null,
    dependencies.quality ? { base: "/v1/quality", invalidCode: "invalid_quality_command", commands: ["quality-open-restore-drill", "quality-open-release-matrix", "quality-open-trace", "quality-open-funnel"], actorId: "operator-demo", outcome: "quality-release-observability", operation: "quality.restore-drill", service: dependencies.quality, runtime: dependencies.qualityRuntime } : null,
  ];
  routes.filter((route): route is CommandRouteConfig => route !== null).forEach((route) => registerCommandRoute(app, route));
}

export function registerFeatureRoutes(app: FastifyInstance, dependencies: ApiDependencies) {
  registerForecast(app, dependencies);
  registerMapAndSky(app, dependencies);
  registerShooting(app, dependencies);
  registerCommandRoutes(app, dependencies);
}
