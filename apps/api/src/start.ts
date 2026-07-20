import { buildApi } from "./server";
import { ForecastQueryService } from "./modules/forecast/forecast-query-service";
import { OpenMeteoHttpClient } from "./modules/forecast/open-meteo-http-client";
import type { WeatherProviderGateRecord } from "./modules/forecast/provider-gate";
import { OverpassSpotSearchSource } from "./modules/map/overpass-spot-search-source";
import { RouteService } from "./modules/map/route-service";

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

const forecast = new ForecastQueryService({ primary: source("gfs_seamless"), comparison: source("ecmwf_ifs025") });
const mapSpots = new OverpassSpotSearchSource();
const routes = new RouteService(
  { route: async () => { throw new Error("amap_route_key_not_configured"); } },
  { findUsable: async () => null, save: async (snapshot) => snapshot },
);
const allowedOrigins = (process.env.STARWARD_ALLOWED_ORIGINS ?? "http://127.0.0.1:8081,http://localhost:8081")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const app = await buildApi({
  nightReports: { create: async () => { throw new Error("night_report_runtime_not_composed"); } },
  spots: { getDetail: async () => { throw new Error("spot_runtime_not_composed"); } },
  resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }),
  allowedOrigins,
  forecast,
  mapSpots,
  routes,
  logger: true,
});

const port = Number(process.env.STARWARD_API_PORT ?? 4318);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("api_port_invalid");
await app.listen({ host: process.env.STARWARD_API_HOST ?? "127.0.0.1", port });
