import type { ForecastQueryService } from "../forecast/forecast-query-service";
import { buildShootingPlan, type ShootingInput } from "@starward/domain/shooting";
import type { ForecastQuery } from "@starward/contracts/forecast";
import { normalizeUtcMoment, observingNightAt } from "@starward/contracts/observing-time";
import { Body, Illumination } from "../../../../../packages/astronomy-core/src/astronomy-engine-runtime";
import { positionMilkyWayCoreDirection } from "../../../../../packages/astronomy-core/src/milky-way-direction";
import { ASTRONOMY_ENGINE_VERSION } from "../../../../../packages/astronomy-core/src/index";

const exactAstronomyVersion = `starward-shooting-instant@1+astronomy-engine@${ASTRONOMY_ENGINE_VERSION}`;

export interface ShootingPreviewQuery {
  latitude: number; longitude: number; timezone: string; nightDate: string; locationId: string;
  scheduledAt: string; focalLengthMm: number; acceptsStacking: boolean;
  target?: ForecastQuery["target"];
}

export class ShootingPreviewService {
  constructor(private readonly forecast: Pick<ForecastQueryService, "get">) {}

  async get(query: ShootingPreviewQuery) {
    const target = query.target ?? "milky-way-core";
    if (target !== "milky-way-core") throw new TypeError("shooting_target_unsupported");
    const scheduledAt = normalizeUtcMoment(query.scheduledAt);
    if (!scheduledAt || observingNightAt(new Date(scheduledAt), query.timezone) !== query.nightDate) throw new TypeError("shooting_time_context_invalid");
    const bundle = await this.forecast.get({ latitude: query.latitude, longitude: query.longitude, timezone: query.timezone, nightDate: query.nightDate, target });
    const desired = Date.parse(scheduledAt);
    const hour = bundle.primary.hours.reduce<typeof bundle.primary.hours[number] | null>((best, candidate) => {
      if (!Number.isFinite(Date.parse(candidate.validTimeUtc)) || observingNightAt(new Date(candidate.validTimeUtc), query.timezone) !== query.nightDate) return best;
      return !best || Math.abs(Date.parse(candidate.validTimeUtc) - desired) < Math.abs(Date.parse(best.validTimeUtc) - desired) ? candidate : best;
    }, null);
    if (!hour) throw new Error("shooting_conditions_missing");
    const at = new Date(scheduledAt);
    const exactTarget = positionMilkyWayCoreDirection({ latitude: query.latitude, longitude: query.longitude, elevationM: 0, at });
    const conditions = {
      capturedAt: bundle.generatedAt,
      sourceVersions: [bundle.primary.run.runId, exactAstronomyVersion],
      weatherSampleAt: hour.validTimeUtc,
      weatherSampleOffsetMinutes: Math.abs(Date.parse(hour.validTimeUtc) - desired) / 60_000,
      astronomyAt: scheduledAt,
      moonIllumination: Illumination(Body.Moon, at).phase_fraction,
      totalCloudPercent: hour.totalCloudPct ?? undefined, windMps: hour.windSpeedMps ?? undefined,
      humidityPercent: hour.relativeHumidityPct ?? undefined, targetAltitudeDeg: exactTarget.altitudeDeg,
    };
    const base = { target: "milky-way" as const, locationId: query.locationId, scheduledAt, timezone: query.timezone, acceptsStacking: query.acceptsStacking, experience: "intermediate" as const, conditions };
    const camera: ShootingInput = { ...base, equipment: { kind: "camera", model: "临时设备输入 · 全画幅", sensorWidthMm: 36, sensorHeightMm: 24, focalLengthMm: query.focalLengthMm, maxAperture: 2.8, tracker: false, tripod: true } };
    const phone: ShootingInput = { ...base, experience: "beginner", equipment: { kind: "phone", model: "临时设备输入 · 支持专业控制的手机", focalLengthMm: 6.8, equivalentFocalLengthMm: 24, tripod: true, controls: ["iso", "shutter", "white-balance", "focus", "exposure-compensation", "burst", "raw", "night-mode"] } };
    return {
      schemaVersion: "starward-shooting-preview-v1" as const, generatedAt: new Date().toISOString(), state: bundle.status,
      context: { ...query, target, scheduledAt, coordinateSystem: "WGS84" as const },
      conditions: { ...conditions, lightPollutionSqm: null, boundary: "地点光污染数据缺失；规则置信度按缺失条件降低，不以 0 填充。" },
      phone: { input: phone, result: buildShootingPlan(phone) }, camera: { input: camera, result: buildShootingPlan(camera) },
      provenance: { weather: bundle.primary.run, astronomy: exactAstronomyVersion },
    };
  }
}
