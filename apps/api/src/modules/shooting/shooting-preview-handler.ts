import type { ShootingPreviewService } from "./shooting-preview-service";
import type { AwaitedShootingRuntime } from "./runtime-types";
import { isObservingNight, normalizeUtcMoment, observingNightAt } from "@starward/contracts/observing-time";

export function createShootingPreviewHandler(service: Pick<ShootingPreviewService, "get">, runtime?: AwaitedShootingRuntime) {
  return async (input: Record<string, unknown>) => {
    const requestedTarget = input.target ?? "milky-way-core";
    if (requestedTarget !== "milky-way-core") return { status: 422, body: { code: "shooting_target_unsupported" } };
    const moment = normalizeUtcMoment(String(input.scheduledAt ?? ""));
    const query = { latitude: Number(input.latitude), longitude: Number(input.longitude), timezone: String(input.timezone ?? ""), nightDate: String(input.nightDate ?? ""), locationId: String(input.locationId ?? ""), scheduledAt: moment ?? "", target: "milky-way-core" as const, focalLengthMm: Number(input.focalLengthMm ?? 24), acceptsStacking: String(input.acceptsStacking ?? "true") === "true" };
    if (!Number.isFinite(query.latitude) || query.latitude < -90 || query.latitude > 90 || !Number.isFinite(query.longitude) || query.longitude < -180 || query.longitude > 180) return { status: 400, body: { code: "shooting_coordinate_invalid" } };
    if (!query.locationId || !moment || !isObservingNight(query.nightDate) || !Number.isFinite(query.focalLengthMm) || query.focalLengthMm <= 0) return { status: 400, body: { code: "shooting_query_invalid" } };
    try {
      if (observingNightAt(new Date(moment), query.timezone) !== query.nightDate) return { status: 400, body: { code: "shooting_time_context_invalid" } };
    } catch { return { status: 400, body: { code: "shooting_timezone_invalid" } }; }
    const preview = await service.get(query);
    if (runtime) {
      const token = JSON.stringify(preview.context);
      await runtime.execute({
        outcome: "shooting-assistant",
        actorId: "personal-trial-owner",
        operation: "shooting.plan",
        idempotencyKey: `shooting-v2:${preview.provenance.weather.runId}:${preview.provenance.astronomy}:${preview.conditions.capturedAt}:${token}`,
        payload: {
          token,
          context: preview.context,
          conditionsCapturedAt: preview.conditions.capturedAt,
          weatherSampleAt: preview.conditions.weatherSampleAt,
          weatherSampleOffsetMinutes: preview.conditions.weatherSampleOffsetMinutes,
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
