import type { DataState, SpotId } from "@starward/miniapp-contracts";
import type { MiniappRepositoryPort } from "./ports.ts";
import type { AirQualityPort } from "./air-quality-provider.ts";
import type { RecentWeatherPort } from "./recent-weather-provider.ts";

/** Public environmental evidence belongs to a published spot, independently of trip/sky time. */
export class SpotEnvironmentService {
  constructor(private readonly repository: Pick<MiniappRepositoryPort, "getSpot">,
    private readonly recentWeather: RecentWeatherPort, private readonly airQuality: AirQualityPort) {}

  private async spot(spotId: string) {
    const spot = await this.repository.getSpot(spotId as SpotId);
    if (!spot) throw new Error("formal_spot_not_found");
    return spot;
  }

  async recent(spotId: string) {
    const spot = await this.spot(spotId);
    const result = await this.recentWeather.getRecent({ point: spot.wgs84 });
    return { data: { spotId: spot.spotId, ...(result.value ?? {
      region: null, requestedDates: [], days: [], missingDates: [], asOfLocalDate: null, unavailableReason: "REQUEST_FAILED" as const,
    }) }, state: result.state, sources: [result.source], warnings: result.errorCode
      ? ["部分地区历史天气暂不可用；不影响独立场地资料与天文信息。"] : [] };
  }

  async air(spotId: string) {
    const spot = await this.spot(spotId);
    const result = await this.airQuality.getAirQuality({ point: spot.wgs84 });
    const segments = [result.current, result.forecast];
    const state: DataState = segments.every(item => item.state === "FRESH") ? "FRESH"
      : segments.some(item => item.value !== null) ? "PARTIAL" : "UNAVAILABLE";
    return { data: { spotId: spot.spotId, ...result }, state, sources: segments.map(item => item.source),
      warnings: segments.some(item => item.unavailableReason === "REQUEST_FAILED")
        ? ["部分空气质量数据暂不可用；其他有效数据保留。"] : [] };
  }
}
