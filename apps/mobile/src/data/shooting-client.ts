import type { ShootingInput, ShootingPlanResult } from "@starward/domain/shooting";
import { normalizeUtcMoment } from "@starward/contracts/observing-time";

export interface ShootingPreviewRequest {
  latitude: number; longitude: number; timezone: string; nightDate: string;
  locationId: string; scheduledAt: string; target: string; focalLengthMm: number; acceptsStacking: boolean;
}

export interface ShootingPreview {
  schemaVersion: "starward-shooting-preview-v1"; generatedAt: string; state: string;
  context: ShootingPreviewRequest & { coordinateSystem: "WGS84" };
  conditions: Omit<ShootingInput["conditions"], "lightPollutionSqm"> & { lightPollutionSqm: null; boundary: string };
  phone: { input: ShootingInput; result: ShootingPlanResult }; camera: { input: ShootingInput; result: ShootingPlanResult };
  provenance: { weather: { provider: string; model: string; runId: string }; astronomy: string };
}
export function createShootingClient(options: { baseUrl?: string; fetcher?: typeof fetch } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL; const fetcher = options.fetcher ?? fetch;
  return { async get(input: ShootingPreviewRequest, signal?: AbortSignal): Promise<ShootingPreview> {
    if (!baseUrl) throw new Error("shooting_api_base_url_missing");
    const params = new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)]));
    const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}/v1/shooting-plans?${params}`, { headers: { accept: "application/json" }, signal });
    if (!response.ok) throw new Error(`shooting_http_${response.status}`);
    const value = await response.json() as Partial<ShootingPreview>;
    if (value.schemaVersion !== "starward-shooting-preview-v1" || !value.phone?.result?.deterministic || !value.camera?.result?.deterministic) throw new Error("shooting_response_invalid");
    const context = value.context;
    const expectedMoment = normalizeUtcMoment(input.scheduledAt);
    if (!context || !expectedMoment || Object.entries(input).some(([key, expected]) => key === "scheduledAt"
      ? context.scheduledAt !== expectedMoment : context[key as keyof ShootingPreviewRequest] !== expected)
      || [value.phone.input, value.camera.input].some((plan) => !plan || plan.locationId !== input.locationId
        || plan.scheduledAt !== expectedMoment || plan.timezone !== input.timezone || plan.target !== "milky-way")) throw new Error("shooting_response_context_mismatch");
    return value as ShootingPreview;
  } };
}
