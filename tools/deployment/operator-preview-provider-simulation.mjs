// Executed only over stdin inside the already deployed API container when the
// staging database has no formal spots. It deliberately reuses the production
// provider and astronomy owners while keeping the synthetic location out of
// product storage, routes and bundles.
export const operatorPreviewProviderSimulationProgram = String.raw`
import {
  TEST_PUBLISHED_SPOT,
  buildTestSpotDetail,
} from "@starward/miniapp-contracts/test-fixtures";
import { AstronomyService } from "./workers/miniapp-api/dist/astronomy-service.js";
import { MemoryCache } from "./workers/miniapp-api/dist/cache.js";
import { ObservationContextService } from "./workers/miniapp-api/dist/observation-context-service.js";
import { loadRuntimeConfig } from "./workers/miniapp-api/dist/runtime-config.js";
import { createWeatherPort } from "./workers/miniapp-api/dist/weather-provider.js";

const localDate = process.env.STARWARD_PROVIDER_SMOKE_LOCAL_DATE ?? "";
if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate))
  throw new Error("provider_simulation_local_date_invalid");
const detail = buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId);
if (!detail) throw new Error("provider_simulation_fixture_missing");
const repository = {
  kind: "memory",
  async getSpot(spotId) {
    return spotId === TEST_PUBLISHED_SPOT.spotId
      ? structuredClone(TEST_PUBLISHED_SPOT)
      : null;
  },
  async getDetail(spotId) {
    return spotId === TEST_PUBLISHED_SPOT.spotId
      ? structuredClone(detail)
      : null;
  },
};
const config = loadRuntimeConfig();
const contexts = new ObservationContextService(
  repository,
  new MemoryCache(),
  config,
);
const context = await contexts.resolve({
  location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
  localDate,
});
const report = await new AstronomyService(
  createWeatherPort(config),
  repository,
  config,
).compute(context);
const weather = report.sources.find(
  (source) =>
    source.kind === "THIRD_PARTY_FORECAST" &&
    source.provider === "和风天气" &&
    source.state !== "UNAVAILABLE",
);
const astronomy = report.sources.find(
  (source) =>
    source.kind === "PRODUCT_CALCULATION" &&
    source.provider === "Astronomy Engine" &&
    source.state === "FRESH",
);
if (!weather) throw new Error("provider_simulation_qweather_evidence_missing");
if (!astronomy) throw new Error("provider_simulation_astronomy_evidence_missing");
process.stdout.write(JSON.stringify({
  status: "passed",
  evidenceScope: "ISOLATED_TEST_SIMULATION",
  productPopulation: "FORMAL_POPULATION_MISSING",
  hourlyCount: report.data.hourly.length,
  weather: { provider: weather.provider, state: weather.state },
  astronomy: { provider: astronomy.provider, state: astronomy.state },
}) + "\n");
`;
