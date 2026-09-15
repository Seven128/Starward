import { createHash } from "node:crypto";
import type { SourceSummary } from "@starward/miniapp-contracts";
import type {
  CanonicalWeatherHour,
  WeatherEvidenceResult,
  WeatherPort,
} from "../ports.ts";

function seed(input: string) {
  return Number.parseInt(
    createHash("sha256").update(input).digest("hex").slice(0, 8),
    16,
  );
}

export class DeterministicWeatherTestAdapter implements WeatherPort {
  readonly key = "deterministic-weather-test-fixture";

  async getHourly(input: Parameters<WeatherPort["getHourly"]>[0]): Promise<
    WeatherEvidenceResult
  > {
    input.signal?.throwIfAborted();
    const scenarioSeed = seed(
      `${input.point.latitude}:${input.point.longitude}:${input.localDate}`,
    );
    const start = new Date(`${input.localDate}T10:00:00.000Z`);
    const baseCloud = 12 + (scenarioSeed % 24);
    const value = Array.from({ length: 13 }, (_, index) => {
      const at = new Date(start.getTime() + index * 60 * 60 * 1_000);
      const cloudPercent = Math.max(
        4,
        Math.min(
          72,
          Math.round(baseCloud + Math.sin((index + scenarioSeed) / 3) * 14),
        ),
      );
      const windKph = Math.round(6 + ((scenarioSeed + index * 3) % 9));
      return {
        at: at.toISOString(),
        cloudPercent,
        precipitationMm: 0,
        precipitationProbabilityPercent: 0,
        windKph,
        windGustKph: windKph + 3,
        windDirectionDeg: 120,
        temperatureC: Math.round((25 - index * 0.16) * 10) / 10,
        relativeHumidityPercent: 66,
        dewPointC: 18,
        visibilityKm: Math.round((13 + (scenarioSeed % 5)) * 10) / 10,
        thunderstorm: false,
        severeRain: false,
        severeWind: false,
        evidenceSourceIds: [
          `source-weather-test-${input.localDate}-${scenarioSeed.toString(16)}`,
        ],
      };
    });
    const source: SourceSummary = {
      id: `source-weather-test-${input.localDate}-${scenarioSeed.toString(16)}`,
      kind: "TEST_FIXTURE",
      provider: "今晚去观星确定性测试天气",
      title: "用于验证完整决策闭环的确定性天气样例",
      sourceUrl: "",
      license: "Project-owned deterministic test fixture",
      licenseUrl: "",
      publishedAt: "2026-08-06",
      retrievedAt: new Date().toISOString(),
      validFrom: value[0]!.at,
      validTo: new Date(Date.parse(value.at(-1)!.at) + 3_600_000).toISOString(),
      state: "SAMPLE_DATA",
      confidence: null,
      precision: "非实时预报；数值只用于自动化测试天气→规则→解释的产品闭环",
      limitations: [
        "不得用于实际出行决定",
        "未调用 QWeather 或其他实时天气供应商",
        "生产/获邀试用必须配置已许可供应商或保持数据不足状态",
      ],
    };
    return {
      value,
      state: "SAMPLE_DATA",
      source,
      sources: [source],
      errorCode: null,
      warningState: "SAMPLE_DATA",
      alerts: [],
      timelineRole: "PRIMARY",
      modelRuns: [
        {
          provider: "今晚去观星确定性测试天气",
          modelKey: "deterministic-test-fixture",
          modelRunAt: source.publishedAt,
          fetchedAt: source.retrievedAt,
          validFrom: source.validFrom,
          validTo: source.validTo,
          nativeSpatialResolutionKm: null,
          nativeTemporalResolutionMinutes: 60,
          outputTemporalResolutionMinutes: 60,
          interpolatedVariables: [],
          state: "SAMPLE_DATA",
          sourceId: source.id,
        },
      ],
      warnings: [],
    };
  }
}
