import { localParts } from "@starward/miniapp-contracts";
import type { RecentWeatherPort } from "../recent-weather-provider.ts";

/** Only composed by explicit development fixture mode; never a provider fallback. */
export class DeterministicRecentWeatherAdapter implements RecentWeatherPort {
  async getRecent(input: Parameters<RecentWeatherPort["getRecent"]>[0]) {
    input.signal?.throwIfAborted();
    const now = new Date();
    const parts = localParts(now, "Asia/Shanghai");
    const asOfLocalDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    const dates = [2, 1].map(offset => new Date(Date.parse(`${asOfLocalDate}T12:00:00Z`) - offset * 86_400_000).toISOString().slice(0, 10));
    return {
      value: { region: { locationId: "fixture-region", name: "示例地区", timezone: "Asia/Shanghai" },
        requestedDates: dates, missingDates: [], asOfLocalDate, unavailableReason: null,
        days: dates.map((localDate, index) => ({ localDate, precipitationMm: index ? 0 : 4.5,
          temperatureMinC: index ? 10 : 8, temperatureMaxC: 20, sampledWindMaxKph: index ? 8 : 19, sampledWindHours: 24, conditions: [index ? "多云" : "小雨"] })),
      },
      state: "SAMPLE_DATA" as const, errorCode: null,
      source: { id: "test-fixture:recent-weather", kind: "TEST_FIXTURE" as const, provider: "近期天气开发测试",
        title: "确定性示例，不代表实际地区天气", sourceUrl: "", license: "Project-owned test fixture", licenseUrl: "",
        publishedAt: null, retrievedAt: now.toISOString(), validFrom: null, validTo: null, state: "SAMPLE_DATA" as const,
        confidence: null, precision: "仅用于界面与状态验证", limitations: ["不是实际天气，不可用于出行判断"] },
    };
  }
}
