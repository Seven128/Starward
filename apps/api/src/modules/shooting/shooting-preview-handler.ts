import type { ShootingPreviewService } from "./shooting-preview-service";

export function createShootingPreviewHandler(service: Pick<ShootingPreviewService, "get">) {
  return async (input: Record<string, unknown>) => {
    const query = { latitude: Number(input.latitude), longitude: Number(input.longitude), timezone: String(input.timezone ?? ""), nightDate: String(input.nightDate ?? ""), locationId: String(input.locationId ?? ""), scheduledAt: String(input.scheduledAt ?? ""), focalLengthMm: Number(input.focalLengthMm ?? 24), acceptsStacking: String(input.acceptsStacking ?? "true") === "true" };
    if (!Number.isFinite(query.latitude) || query.latitude < -90 || query.latitude > 90 || !Number.isFinite(query.longitude) || query.longitude < -180 || query.longitude > 180) return { status: 400, body: { code: "shooting_coordinate_invalid" } };
    if (!query.locationId || !Number.isFinite(Date.parse(query.scheduledAt)) || !/^\d{4}-\d{2}-\d{2}$/u.test(query.nightDate) || query.focalLengthMm <= 0) return { status: 400, body: { code: "shooting_query_invalid" } };
    return { status: 200, body: await service.get(query) };
  };
}
