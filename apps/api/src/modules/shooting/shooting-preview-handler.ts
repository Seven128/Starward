import type { ShootingPreviewService } from "./shooting-preview-service";
import type { AwaitedShootingRuntime } from "./runtime-types";

export function createShootingPreviewHandler(service: Pick<ShootingPreviewService, "get">, runtime?: AwaitedShootingRuntime) {
  return async (input: Record<string, unknown>) => {
    const query = { latitude: Number(input.latitude), longitude: Number(input.longitude), timezone: String(input.timezone ?? ""), nightDate: String(input.nightDate ?? ""), locationId: String(input.locationId ?? ""), scheduledAt: String(input.scheduledAt ?? ""), focalLengthMm: Number(input.focalLengthMm ?? 24), acceptsStacking: String(input.acceptsStacking ?? "true") === "true" };
    if (!Number.isFinite(query.latitude) || query.latitude < -90 || query.latitude > 90 || !Number.isFinite(query.longitude) || query.longitude < -180 || query.longitude > 180) return { status: 400, body: { code: "shooting_coordinate_invalid" } };
    if (!query.locationId || !Number.isFinite(Date.parse(query.scheduledAt)) || !/^\d{4}-\d{2}-\d{2}$/u.test(query.nightDate) || query.focalLengthMm <= 0) return { status: 400, body: { code: "shooting_query_invalid" } };
    const preview = await service.get(query);
    if (runtime) {
      const token = `${preview.context.locationId}:${preview.context.scheduledAt}:${preview.context.focalLengthMm}`;
      await runtime.execute({
        outcome: "shooting-assistant",
        actorId: "personal-trial-owner",
        operation: "shooting.plan",
        idempotencyKey: `shooting:${preview.provenance.weather.runId}:${token}`,
        payload: {
          token,
          context: preview.context,
          conditionsCapturedAt: preview.conditions.capturedAt,
          weatherRunId: preview.provenance.weather.runId,
          astronomyVersion: preview.provenance.astronomy,
          phoneRuleVersion: preview.phone.result.ruleVersion,
          cameraRuleVersion: preview.camera.result.ruleVersion,
        },
      });
    }
    return { status: 200, body: preview };
  };
}
