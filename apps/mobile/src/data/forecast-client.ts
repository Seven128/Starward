import type { ForecastBundle, ForecastQuery } from "@starward/contracts/forecast";

export type ForecastClient = { get(query: ForecastQuery, signal?: AbortSignal): Promise<ForecastBundle> };

function isForecastBundle(value: unknown): value is ForecastBundle {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ForecastBundle>;
  return candidate.schemaVersion === "starward-forecast-bundle-v1"
    && Array.isArray(candidate.primary?.hours)
    && Array.isArray(candidate.trends)
    && typeof candidate.astronomy?.algorithmVersion === "string";
}

export function createForecastClient(options: { baseUrl?: string; fetcher?: typeof fetch } = {}): ForecastClient {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL;
  const fetcher = options.fetcher ?? fetch;
  return {
    async get(query, signal) {
      if (!baseUrl) throw new Error("forecast_api_base_url_missing");
      const params = new URLSearchParams({
        latitude: String(query.latitude), longitude: String(query.longitude), timezone: query.timezone,
        nightDate: query.nightDate, target: query.target,
      });
      const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}/v1/forecast/hourly?${params}`, { headers: { accept: "application/json" }, signal });
      if (!response.ok) throw new Error(`forecast_http_${response.status}`);
      const value: unknown = await response.json();
      if (!isForecastBundle(value)) throw new Error("forecast_response_invalid");
      return value;
    },
  };
}
