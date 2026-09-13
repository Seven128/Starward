import { assertHttpsHost, requestJson, type HttpTransport } from "../../../../../packages/data-source-runtime/src/index";
import type { ProviderUse } from "../../../../../packages/weather-schema/src/index";
import { normalizeOpenMeteo, type OpenMeteoAirQualityPayload, type OpenMeteoPayload } from "./open-meteo-adapter";
import type { WeatherProviderGateRecord } from "./provider-gate";

const HOURLY_VARIABLES = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "dew_point_2m",
  "surface_pressure",
  "weather_code",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "visibility",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "precipitation",
  "precipitation_probability",
] as const;

const AIR_QUALITY_VARIABLES = ["european_aqi", "pm2_5", "pm10", "aerosol_optical_depth"] as const;

export interface OpenMeteoHttpClientOptions {
  endpointClass: "free" | "commercial";
  apiKey?: string;
  models: string[];
  licenseVersion: string;
  rawRetentionAllowed: boolean;
  gate: WeatherProviderGateRecord;
  use: ProviderUse;
  transport?: HttpTransport;
  now?: () => Date;
}

export class OpenMeteoHttpClient {
  private readonly baseUrl: URL;
  private readonly airQualityBaseUrl: URL;
  private readonly now: () => Date;
  private airQualityRequests = new Map<string, Promise<OpenMeteoAirQualityPayload>>();

  constructor(private readonly options: OpenMeteoHttpClientOptions) {
    if (options.endpointClass === "commercial" && !options.apiKey) throw new Error("open_meteo_commercial_api_key_required");
    if (options.endpointClass === "free" && options.use === "production") throw new Error("open_meteo_free_endpoint_forbidden_in_production");
    this.baseUrl = new URL(options.endpointClass === "commercial" ? "https://customer-api.open-meteo.com/" : "https://api.open-meteo.com/");
    this.airQualityBaseUrl = new URL(options.endpointClass === "commercial" ? "https://customer-air-quality-api.open-meteo.com/" : "https://air-quality-api.open-meteo.com/");
    assertHttpsHost(this.baseUrl, ["api.open-meteo.com", "customer-api.open-meteo.com"]);
    assertHttpsHost(this.airQualityBaseUrl, ["air-quality-api.open-meteo.com", "customer-air-quality-api.open-meteo.com"]);
    this.now = options.now ?? (() => new Date());
  }

  /** Model siblings keep the same transport/entitlement but share the one AQ
   * request that has no weather-model parameter. Settled responses are not kept. */
  withModels(models: string[]): OpenMeteoHttpClient {
    const sibling = new OpenMeteoHttpClient({ ...this.options, models: [...models] });
    sibling.airQualityRequests = this.airQualityRequests;
    return sibling;
  }

  private loadAirQuality(url: URL, init: RequestInit): Promise<OpenMeteoAirQualityPayload> {
    // The provider's default horizon starts on its current UTC day. A request
    // crossing midnight must not reuse yesterday's still-pending horizon.
    const key = `${this.now().toISOString().slice(0, 10)}:${url.href}`;
    const pending = this.airQualityRequests.get(key);
    if (pending) return pending;
    const request = requestJson<OpenMeteoAirQualityPayload>({ provider: "open-meteo-air-quality", url, init, transport: this.options.transport })
      .finally(() => this.airQualityRequests.delete(key));
    this.airQualityRequests.set(key, request);
    return request;
  }

  async load(input: { latitude: number; longitude: number; runId: string; issuedAt: string; expiresAt: string }) {
    const url = new URL("v1/forecast", this.baseUrl);
    const params = new URLSearchParams({
      latitude: input.latitude.toFixed(5),
      longitude: input.longitude.toFixed(5),
      hourly: HOURLY_VARIABLES.join(","),
      timezone: "GMT",
      wind_speed_unit: "ms",
      forecast_days: "16",
      cell_selection: "land",
    });
    if (this.options.models.length) params.set("models", this.options.models.join(","));
    if (this.options.apiKey) params.set("apikey", this.options.apiKey);
    url.search = params.toString();
    const airQualityUrl = new URL("v1/air-quality", this.airQualityBaseUrl);
    const airQualityParams = new URLSearchParams({
      latitude: input.latitude.toFixed(5),
      longitude: input.longitude.toFixed(5),
      hourly: AIR_QUALITY_VARIABLES.join(","),
      timezone: "GMT",
      forecast_days: "7",
      cell_selection: "land",
    });
    if (this.options.apiKey) airQualityParams.set("apikey", this.options.apiKey);
    airQualityUrl.search = airQualityParams.toString();
    const init = { headers: { accept: "application/json", "accept-encoding": "gzip" } } satisfies RequestInit;
    const [payload, airQuality] = await Promise.all([
      requestJson<OpenMeteoPayload>({ provider: "open-meteo", url, init, transport: this.options.transport }),
      this.loadAirQuality(airQualityUrl, init)
        .catch(() => undefined),
    ]);
    return normalizeOpenMeteo({
      payload,
      airQuality,
      use: this.options.use,
      endpointClass: this.options.endpointClass,
      gate: this.options.gate,
      fetchedAt: this.now().toISOString(),
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      model: this.options.models.length ? this.options.models.join("+") : "best-match",
      runId: input.runId,
      licenseVersion: this.options.licenseVersion,
      rawRetentionAllowed: this.options.rawRetentionAllowed,
    });
  }
}
