import type { ForecastQueryService } from "../forecast/forecast-query-service";
import { buildShootingPlan, type ShootingInput } from "@starward/domain/shooting";

export interface ShootingPreviewQuery {
  latitude: number; longitude: number; timezone: string; nightDate: string; locationId: string;
  scheduledAt: string; focalLengthMm: number; acceptsStacking: boolean;
}

export class ShootingPreviewService {
  constructor(private readonly forecast: Pick<ForecastQueryService, "get">) {}

  async get(query: ShootingPreviewQuery) {
    const bundle = await this.forecast.get({ latitude: query.latitude, longitude: query.longitude, timezone: query.timezone, nightDate: query.nightDate, target: "milky-way-core" });
    const desired = Date.parse(query.scheduledAt);
    const hour = [...bundle.primary.hours].sort((a, b) => Math.abs(Date.parse(a.validTimeUtc) - desired) - Math.abs(Date.parse(b.validTimeUtc) - desired))[0];
    if (!hour) throw new Error("shooting_conditions_missing");
    const conditions = {
      capturedAt: bundle.generatedAt,
      sourceVersions: [bundle.primary.run.runId, bundle.astronomy.algorithmVersion],
      moonIllumination: hour.moonIlluminationPct === null ? undefined : hour.moonIlluminationPct / 100,
      totalCloudPercent: hour.totalCloudPct ?? undefined, windMps: hour.windSpeedMps ?? undefined,
      humidityPercent: hour.relativeHumidityPct ?? undefined, targetAltitudeDeg: hour.targetAltitudeDeg ?? undefined,
    };
    const base = { target: "milky-way" as const, locationId: query.locationId, scheduledAt: hour.validTimeUtc, timezone: query.timezone, acceptsStacking: query.acceptsStacking, experience: "intermediate" as const, conditions };
    const camera: ShootingInput = { ...base, equipment: { kind: "camera", model: "临时设备输入 · 全画幅", sensorWidthMm: 36, sensorHeightMm: 24, focalLengthMm: query.focalLengthMm, maxAperture: 2.8, tracker: false, tripod: true } };
    const phone: ShootingInput = { ...base, experience: "beginner", equipment: { kind: "phone", model: "临时设备输入 · 支持专业控制的手机", focalLengthMm: 6.8, equivalentFocalLengthMm: 24, tripod: true, controls: ["iso", "shutter", "white-balance", "focus", "exposure-compensation", "burst", "raw", "night-mode"] } };
    return {
      schemaVersion: "starward-shooting-preview-v1" as const, generatedAt: new Date().toISOString(), state: bundle.status,
      context: { ...query, scheduledAt: hour.validTimeUtc, coordinateSystem: "WGS84" as const },
      conditions: { ...conditions, lightPollutionSqm: null, boundary: "地点光污染数据缺失；规则置信度按缺失条件降低，不以 0 填充。" },
      phone: { input: phone, result: buildShootingPlan(phone) }, camera: { input: camera, result: buildShootingPlan(camera) },
      provenance: { weather: bundle.primary.run, astronomy: bundle.astronomy.algorithmVersion },
    };
  }
}
