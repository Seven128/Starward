import type { ShootingInput, ShootingPlanResult } from "@starward/domain/shooting";

export interface ShootingPreview {
  schemaVersion: "starward-shooting-preview-v1"; generatedAt: string; state: string;
  context: { scheduledAt: string; timezone: string; locationId: string; focalLengthMm: number; coordinateSystem: "WGS84" };
  conditions: Omit<ShootingInput["conditions"], "lightPollutionSqm"> & { lightPollutionSqm: null; boundary: string };
  phone: { input: ShootingInput; result: ShootingPlanResult }; camera: { input: ShootingInput; result: ShootingPlanResult };
  provenance: { weather: { provider: string; model: string; runId: string }; astronomy: string };
}
export function createShootingClient(options: { baseUrl?: string; fetcher?: typeof fetch } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL; const fetcher = options.fetcher ?? fetch;
  return { async get(input: Record<string, string | number | boolean>, signal?: AbortSignal): Promise<ShootingPreview> {
    if (!baseUrl) throw new Error("shooting_api_base_url_missing");
    const params = new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)]));
    const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}/v1/shooting-plans?${params}`, { headers: { accept: "application/json" }, signal });
    if (!response.ok) throw new Error(`shooting_http_${response.status}`);
    const value = await response.json() as Partial<ShootingPreview>;
    if (value.schemaVersion !== "starward-shooting-preview-v1" || !value.phone?.result?.deterministic || !value.camera?.result?.deterministic) throw new Error("shooting_response_invalid");
    return value as ShootingPreview;
  } };
}
