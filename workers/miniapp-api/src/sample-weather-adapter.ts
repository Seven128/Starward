import { createHash } from "node:crypto";
import type { SourceSummary } from "@starward/miniapp-contracts";
import type {
  CanonicalWeatherHour,
  ProviderResult,
  WeatherPort,
} from "./ports.ts";

function seed(input: string) {
  return Number.parseInt(
    createHash("sha256").update(input).digest("hex").slice(0, 8),
    16,
  );
}

export class SampleWeatherAdapter implements WeatherPort {
  readonly key = "starward-clearly-labelled-weather-scenario-v1";

  async getHourly(input: Parameters<WeatherPort["getHourly"]>[0]): Promise<
    ProviderResult<readonly CanonicalWeatherHour[]>
  > {
    input.signal?.throwIfAborted();
    const scenarioSeed = seed(
      `${input.point.latitude}:${input.point.longitude}:${input.localDate}`,
    );
    const start = new Date(`${input.localDate}T10:00:00.000Z`);
    const baseCloud = 12 + (scenarioSeed % 24);
    const value = Array.from({ length: 25 }, (_, index) => {
      const at = new Date(start.getTime() + index * 30 * 60 * 1_000);
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
        windKph,
        temperatureC: Math.round((25 - index * 0.16) * 10) / 10,
        visibilityKm: Math.round((13 + (scenarioSeed % 5)) * 10) / 10,
        thunderstorm: false,
        severeRain: false,
        severeWind: false,
      };
    });
    const source: SourceSummary = {
      id: `source-weather-sample-${input.localDate}-${scenarioSeed.toString(16)}`,
      kind: "DEMO_FIXTURE",
      provider: "今晚去观星 Demo 天气情景",
      title: "用于验证完整决策闭环的确定性天气样例",
      sourceUrl: "",
      license: "Project-owned deterministic Demo fixture",
      licenseUrl: "",
      publishedAt: "2026-08-06",
      retrievedAt: new Date().toISOString(),
      validFrom: value[0]!.at,
      validTo: value.at(-1)!.at,
      state: "SAMPLE_DATA",
      confidence: null,
      precision: "非实时预报；数值只用于演示天气→规则→解释的产品闭环",
      limitations: [
        "不得用于实际出行决定",
        "未调用 QWeather 或其他实时天气供应商",
        "生产/获邀试用必须配置已许可供应商或保持数据不足状态",
      ],
    };
    return { value, state: "SAMPLE_DATA", source, errorCode: null };
  }
}
