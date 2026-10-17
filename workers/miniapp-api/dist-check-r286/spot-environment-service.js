/** Public environmental evidence belongs to a published spot, independently of trip/sky time. */
export class SpotEnvironmentService {
    repository;
    recentWeather;
    airQuality;
    constructor(repository, recentWeather, airQuality) {
        this.repository = repository;
        this.recentWeather = recentWeather;
        this.airQuality = airQuality;
    }
    async spot(spotId) {
        const spot = await this.repository.getSpot(spotId);
        if (!spot)
            throw new Error("formal_spot_not_found");
        return spot;
    }
    async recent(spotId) {
        const spot = await this.spot(spotId);
        const result = await this.recentWeather.getRecent({ point: spot.wgs84 });
        return { data: { spotId: spot.spotId, ...(result.value ?? {
                    region: null, requestedDates: [], days: [], missingDates: [], asOfLocalDate: null, unavailableReason: "REQUEST_FAILED",
                }) }, state: result.state, sources: [result.source], warnings: result.errorCode
                ? ["部分地区历史天气暂不可用；不影响独立场地资料与天文信息。"] : [] };
    }
    async air(spotId) {
        const spot = await this.spot(spotId);
        const result = await this.airQuality.getAirQuality({ point: spot.wgs84 });
        const segments = [result.current, result.forecast];
        const state = segments.every(item => item.state === "FRESH") ? "FRESH"
            : segments.some(item => item.value !== null) ? "PARTIAL" : "UNAVAILABLE";
        return { data: { spotId: spot.spotId, ...result }, state, sources: segments.map(item => item.source),
            warnings: segments.some(item => item.unavailableReason === "REQUEST_FAILED")
                ? ["部分空气质量数据暂不可用；其他有效数据保留。"] : [] };
    }
}
//# sourceMappingURL=spot-environment-service.js.map