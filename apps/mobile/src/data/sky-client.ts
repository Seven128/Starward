import { isSkyContext, type SkyContext, type SkyQuery } from "@starward/contracts/sky";

export type SkyClient = { get(query: SkyQuery, signal?: AbortSignal): Promise<SkyContext> };

export function createSkyClient(options: { baseUrl?: string; fetcher?: typeof fetch } = {}): SkyClient {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL;
  const fetcher = options.fetcher ?? fetch;
  return {
    async get(query, signal) {
      if (!baseUrl) throw new Error("sky_api_base_url_missing");
      const params = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
      const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}/v1/sky?${params}`, { headers: { accept: "application/json" }, signal });
      if (!response.ok) throw new Error(`sky_http_${response.status}`);
      const value: unknown = await response.json();
      if (!isSkyContext(value)) throw new Error("sky_response_invalid");
      return value;
    },
  };
}
