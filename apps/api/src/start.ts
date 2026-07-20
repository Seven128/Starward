import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApi } from "./server";
import { ForecastQueryService } from "./modules/forecast/forecast-query-service";
import { OpenMeteoHttpClient } from "./modules/forecast/open-meteo-http-client";
import { createForecastRuntime } from "./modules/forecast/runtime";
import type { WeatherProviderGateRecord } from "./modules/forecast/provider-gate";
import { OverpassSpotSearchSource } from "./modules/map/overpass-spot-search-source";
import { RouteService } from "./modules/map/route-service";
import { createMapRouteRuntime } from "./modules/map/runtime";
import { SpotTrustService } from "./modules/spots/spot-trust-service";
import { PocSpotTrustRepository } from "./modules/spots/poc-spot-trust-repository";
import { createSpotTrustRuntime } from "./modules/spots/runtime";
import { AstronomyEngineNightReportProvider } from "./modules/astronomy/night-report-astronomy-provider";
import { NormalizedNightReportWeatherProvider } from "./modules/forecast/night-report-weather-provider";
import type { NightReportRequest } from "../../../packages/contracts/src/night-report";
import { InMemoryNightReportRepository, NightReportService, type RouteEvidence, type SpotCandidate } from "./modules/night-report/night-report-service";
import { pocAstronomyEligibilityPolicy, pocWeatherEligibilityPolicy } from "./modules/night-report/runtime-policies";
import { createNightReportRuntime } from "./modules/night-report/runtime";
import { SkyContextService } from "./modules/sky/sky-context-service";
import { ShootingPreviewService } from "./modules/shooting/shooting-preview-service";
import { createShootingRuntime } from "./modules/shooting/runtime";
import { ProfileService } from "./modules/identity/profile-service";
import { createIdentityRuntime } from "./modules/identity/runtime";
import { ItineraryWorkflowService } from "./modules/itinerary/itinerary-workflow-service";
import { createItineraryRuntime } from "./modules/itinerary/runtime";
import { FieldService } from "./modules/field/field-service";
import { createFieldRuntime } from "@starward/domain/offline/runtime";
import { CommunityWorkflowService } from "./modules/community/community-workflow-service";
import { createCommunityRuntime } from "./modules/community/runtime";
import { ToolsService } from "./modules/notifications/tools-service";
import { createNotificationToolsRuntime } from "./modules/notifications/runtime";
import { AdminOperationsService } from "./modules/admin/admin-operations-service";
import { createAdminRuntime } from "./modules/admin/runtime";
import { QualityService } from "./modules/quality/quality-service";
import { createQualityRuntime } from "./modules/quality/runtime";

const mode = process.env.STARWARD_WEATHER_MODE ?? "noncommercial-poc";
if (mode !== "noncommercial-poc") {
  throw new Error("production_weather_startup_requires_approved_commercial_composition");
}

const gate: WeatherProviderGateRecord = {
  id: "open-meteo",
  productionEnabled: false,
  passedGates: ["provenance", "authenticity", "target-region-stability", "safe-degradation"],
  licenseStatus: "noncommercial-poc-only",
};

function source(model: string) {
  return new OpenMeteoHttpClient({
    endpointClass: "free",
    models: [model],
    licenseVersion: "4.0",
    rawRetentionAllowed: false,
    gate,
    use: "noncommercial-poc",
  });
}

const primaryWeather = source("gfs_seamless");
const forecast = new ForecastQueryService({ primary: primaryWeather, comparison: source("ecmwf_ifs025") });
const forecastRuntime = await createForecastRuntime({
  dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"),
  releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
  boundary: {
    async invoke(request) {
      return { status: "available", kind: request.kind, token: request.payload.token, mode };
    },
  },
});
const mapSpots = new OverpassSpotSearchSource();
const routes = new RouteService(
  { route: async () => { throw new Error("amap_route_key_not_configured"); } },
  { findUsable: async () => null, save: async (snapshot) => snapshot },
);
const mapRouteRuntime = await createMapRouteRuntime({
  dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"),
  releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
  boundary: { async invoke(request) { return { status: "available", kind: request.kind, token: request.payload.token, mode }; } },
});
const spotTrust = new SpotTrustService(new PocSpotTrustRepository(mapSpots));
const spotTrustRuntime = await createSpotTrustRuntime({
  dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"),
  releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
  boundary: { async invoke(request) { return { status: "available", kind: request.kind, token: request.payload.token, mode }; } },
});
const weatherEvidence = new NormalizedNightReportWeatherProvider({
  load: async (request) => {
    const issuedAt = new Date();
    return primaryWeather.load({
      latitude: request.location.lat,
      longitude: request.location.lon,
      runId: `night-poc-${issuedAt.toISOString().slice(0, 13)}`,
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + 60 * 60_000).toISOString(),
    });
  },
}, pocWeatherEligibilityPolicy);
const astronomyEvidence = new AstronomyEngineNightReportProvider(pocAstronomyEligibilityPolicy, async () => 0);
const spotEvidence = {
  find: async (request: NightReportRequest) => {
    const page = await mapSpots.search({ center: request.location, radiusMeters: 100_000, limit: 24 });
    const generatedAt = page.items.map((item) => item.source?.fetchedAt).filter(Boolean).sort().at(-1) ?? new Date().toISOString();
    const candidates: SpotCandidate[] = page.items.map((item) => ({
      id: item.id,
      name: item.name,
      coordinate: item.coordinate,
      sky: 50,
      access: Math.min(65, 35 + item.facilities.length * 5),
      safety: 50,
      preference: 50,
      risks: [item.factsBoundary ?? "地点事实未核验", "OpenStreetMap POI 仅用于候选发现；不代表夜间开放、安全或适合观星"],
    }));
    return { version: "openstreetmap-overpass-poc/ODbL-1.0", generatedAt, confidence: 0.35, candidates };
  },
};
const routeEvidence = {
  load: async (request: NightReportRequest, candidates: SpotCandidate[]) => {
    const evidence: RouteEvidence[] = [];
    for (let offset = 0; offset < candidates.length; offset += 4) {
      const batch = candidates.slice(offset, offset + 4);
      const values = await Promise.all(batch.map(async (candidate) => {
        if (!candidate.coordinate) return null;
        const result = await routes.load({ requestId: `${request.requestId}:${candidate.id}`, origin: request.route.origin, destination: candidate.coordinate, mode: request.route.modes[0] }).catch(() => null);
        return result ? { candidate, result } : null;
      }));
      for (const value of values) {
        if (!value || value.result.state === "missing") continue;
        evidence.push({
          spotId: value.candidate.id,
          distanceKm: Math.round((value.result.distanceMeters ?? 0) / 100) / 10,
          travelMinutes: Math.round((value.result.durationSeconds ?? 0) / 60),
          accessScore: 70,
          version: `${value.result.provider}/${value.result.providerVersion}`,
          generatedAt: value.result.generatedAt,
          state: value.result.state,
        });
      }
    }
    return evidence;
  },
};
const nightReports = new NightReportService(
  { weather: weatherEvidence, astronomy: astronomyEvidence, spots: spotEvidence, routes: routeEvidence },
  new InMemoryNightReportRepository(),
);
const nightReportRuntime = await createNightReportRuntime({
  dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"),
  releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
  boundary: { async invoke(request) { return { status: "available", kind: request.kind, token: request.payload.token, mode }; } },
});
const allowedOrigins = (process.env.STARWARD_ALLOWED_ORIGINS ?? "http://127.0.0.1:8081,http://localhost:8081")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const identityRuntime = await createIdentityRuntime({
  dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"),
  releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
});
const shootingRuntime = await createShootingRuntime({
  dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"),
  releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
  boundary: { async invoke(request) { return { status: "available", kind: request.kind, token: request.payload.token, mode }; } },
});
const fieldRuntime = await createFieldRuntime({
  dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"),
  releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
});
const notificationToolsRuntime = await createNotificationToolsRuntime({
  dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"),
  releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
  boundary: { async invoke(request) { return { status: "local-and-inbox-only", kind: request.kind, token: request.payload.token, mode }; } },
});
const communityRuntime = await createCommunityRuntime({
  dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"),
  releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
  boundary: { async invoke(request) { return { status: "local-quarantine", kind: request.kind, token: request.payload.token, mode }; } },
});
const adminRuntime = await createAdminRuntime({
  dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"),
  releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
});
const qualityRuntime = await createQualityRuntime({
  dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"),
  releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false },
  boundary: { async invoke(request) { return { status: "local-telemetry", kind: request.kind, token: request.payload.token, mode }; } },
});
const profile = new ProfileService();
for (const record of await identityRuntime.list({ actorId: "user-demo" })) {
  const command = (record.result.payload as { command?: string } | undefined)?.command;
  if (["merge-guest", "revoke-session", "inspect-content", "request-export", "request-deletion", "open-sources", "restrict-location"].includes(command ?? "")) profile.command(command as import("./modules/identity/profile-service").ProfileCommand);
}
const itineraryRuntime = await createItineraryRuntime({ dataDir: process.env.STARWARD_DATA_DIR ?? join(tmpdir(), "starward-api-runtime"), releaseProfile: { id: "individual-personal-trial", externalServicesBudgetCny: 200, productionTrafficAllowed: false } });
const itineraries = new ItineraryWorkflowService();
for (const record of await itineraryRuntime.list({ actorId: "user-demo" })) {
  const command = (record.result.payload as { command?: string } | undefined)?.command;
  if (["generate", "overview", "add-candidate", "select-route", "refresh", "share-offline", "merge-collaboration", "astronomy-timeline"].includes(command ?? "")) itineraries.command(command as import("./modules/itinerary/itinerary-workflow-service").ItineraryCommand);
}
const app = await buildApi({
  nightReports,
  nightReportRuntime,
  spots: spotTrust,
  spotTrustRuntime,
  resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }),
  allowedOrigins,
  forecast,
  forecastRuntime,
  mapSpots,
  routes,
  mapRouteRuntime,
  sky: new SkyContextService(),
  shooting: new ShootingPreviewService(forecast),
  shootingRuntime,
  profile,
  identityRuntime,
  itineraries,
  itineraryRuntime,
  field: new FieldService(),
  fieldRuntime,
  community: new CommunityWorkflowService(),
  communityRuntime,
  tools:new ToolsService(),
  notificationToolsRuntime,
  admin:new AdminOperationsService(),
  adminRuntime,
  quality:new QualityService(),
  qualityRuntime,
  logger: true,
});
app.addHook("onClose", async () => { await forecastRuntime.close(); await mapRouteRuntime.close(); await spotTrustRuntime.close(); await nightReportRuntime.close(); await identityRuntime.close(); await itineraryRuntime.close(); await shootingRuntime.close(); await fieldRuntime.close(); await notificationToolsRuntime.close(); await communityRuntime.close(); await adminRuntime.close(); await qualityRuntime.close(); });

const port = Number(process.env.STARWARD_API_PORT ?? 4318);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("api_port_invalid");
await app.listen({ host: process.env.STARWARD_API_HOST ?? "127.0.0.1", port });
