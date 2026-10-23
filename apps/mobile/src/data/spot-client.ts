import { isSpotTrustDetail, type SpotTrustDetail } from "@starward/contracts/spot";

export function createSpotClient(options: { baseUrl?: string; fetcher?: typeof fetch } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL;
  const fetcher = options.fetcher ?? fetch;
  return {
    async get(id: string, signal?: AbortSignal): Promise<SpotTrustDetail> {
      if (!id.trim() || id !== id.trim()) throw new Error("spot_id_required");
      if (!baseUrl) throw new Error("spot_api_base_url_missing");
      const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}/v1/spots/${encodeURIComponent(id)}`, { headers: { accept: "application/json" }, signal });
      if (!response.ok) throw new Error(`spot_http_${response.status}`);
      const value: unknown = await response.json();
      if (!isSpotTrustDetail(value)) throw new Error("spot_response_invalid");
      if (value.id !== id) throw new Error("spot_response_identity_mismatch");
      return value;
    },
  };
}
