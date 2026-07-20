import { assertHttpsHost, requestJson, type HttpTransport } from "../../../../../packages/data-source-runtime/src/index";
import type { ProviderUse } from "../../../../../packages/weather-schema/src/index";
import { normalizeOpenMeteo, type OpenMeteoPayload } from "./open-meteo-adapter";
import type { WeatherProviderGateRecord } from "./provider-gate";

const HOURLY_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "visibility",
  "wind_speed_10m",
  "wind_gusts_10m",
  "precipitation",
] as const;

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
  private readonly now: () => Date;

  constructor(private readonly options: OpenMeteoHttpClientOptions) {
    if (options.endpointClass === "commercial" && !options.apiKey) throw new Error("open_meteo_commercial_api_key_required");
    if (options.endpointClass === "free" && options.use === "production") throw new Error("open_meteo_free_endpoint_forbidden_in_production");
    this.baseUrl = new URL(options.endpointClass === "commercial" ? "https://customer-api.open-meteo.com/" : "https://api.open-meteo.com/");
    assertHttpsHost(this.baseUrl, ["api.open-meteo.com", "customer-api.open-meteo.com"]);
    this.now = options.now ?? (() => new Date());
  }

  async load(input: { latitude: number; longitude: number; runId: string; issuedAt: string; expiresAt: string }) {
    const url = new URL("v1/forecast", this.baseUrl);
    const params = new URLSearchParams({
      latitude: input.latitude.toFixed(5),
      longitude: input.longitude.toFixed(5),
      hourly: HOURLY_VARIABLES.join(","),
      timezone: "GMT",
      wind_speed_unit: "ms",
      forecast_days: "7",
      cell_selection: "land",
    });
    if (this.options.models.length) params.set("models", this.options.models.join(","));
    if (this.options.apiKey) params.set("apikey", this.options.apiKey);
    url.search = params.toString();
    const payload = await requestJson<OpenMeteoPayload>({
      provider: "open-meteo",
      url,
      init: { headers: { accept: "application/json", "accept-encoding": "gzip" } },
      transport: this.options.transport,
    });
    return normalizeOpenMeteo({
      payload,
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
