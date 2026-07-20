import { buildApi } from "./server";
import { ForecastQueryService } from "./modules/forecast/forecast-query-service";
import { OpenMeteoHttpClient } from "./modules/forecast/open-meteo-http-client";
import type { WeatherProviderGateRecord } from "./modules/forecast/provider-gate";
import { OverpassSpotSearchSource } from "./modules/map/overpass-spot-search-source";
import { RouteService } from "./modules/map/route-service";
import { SpotTrustService } from "./modules/spots/spot-trust-service";
import { PocSpotTrustRepository } from "./modules/spots/poc-spot-trust-repository";
import { AstronomyEngineNightReportProvider } from "./modules/astronomy/night-report-astronomy-provider";
import { NormalizedNightReportWeatherProvider } from "./modules/forecast/night-report-weather-provider";
import type { NightReportRequest } from "../../../packages/contracts/src/night-report";
import { InMemoryNightReportRepository, NightReportService, type RouteEvidence, type SpotCandidate } from "./modules/night-report/night-report-service";
import { pocAstronomyEligibilityPolicy, pocWeatherEligibilityPolicy } from "./modules/night-report/runtime-policies";
import { SkyContextService } from "./modules/sky/sky-context-service";
import { ShootingPreviewService } from "./modules/shooting/shooting-preview-service";
import { ProfileService } from "./modules/identity/profile-service";
import { ItineraryWorkflowService } from "./modules/itinerary/itinerary-workflow-service";
import { FieldService } from "./modules/field/field-service";
import { CommunityWorkflowService } from "./modules/community/community-workflow-service";
import { ToolsService } from "./modules/notifications/tools-service";
import { AdminOperationsService } from "./modules/admin/admin-operations-service";
import { QualityService } from "./modules/quality/quality-service";

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
const mapSpots = new OverpassSpotSearchSource();
const routes = new RouteService(
  { route: async () => { throw new Error("amap_route_key_not_configured"); } },
  { findUsable: async () => null, save: async (snapshot) => snapshot },
);
const spotTrust = new SpotTrustService(new PocSpotTrustRepository(mapSpots));
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
const allowedOrigins = (process.env.STARWARD_ALLOWED_ORIGINS ?? "http://127.0.0.1:8081,http://localhost:8081")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const app = await buildApi({
  nightReports,
  spots: spotTrust,
  resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }),
  allowedOrigins,
  forecast,
  mapSpots,
  routes,
  sky: new SkyContextService(),
  shooting: new ShootingPreviewService(forecast),
  profile: new ProfileService(),
  itineraries: new ItineraryWorkflowService(),
  field: new FieldService(),
  community: new CommunityWorkflowService(),
  tools:new ToolsService(),
  admin:new AdminOperationsService(),
  quality:new QualityService(),
  logger: true,
});

const port = Number(process.env.STARWARD_API_PORT ?? 4318);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("api_port_invalid");
await app.listen({ host: process.env.STARWARD_API_HOST ?? "127.0.0.1", port });
