import type { createAuthenticatedOperationRequester } from "./authenticated-operation";

/** Environmental evidence is public and follows each source's validity, not the selected trip date. */
export function createSpotEnvironmentClient(request: ReturnType<typeof createAuthenticatedOperationRequester>) {
  return {
    getSpotRecentWeather(spotId: string, signal?: AbortSignal) {
      return request("spot-recent-weather:" + spotId, "spotRecentWeatherGet", {
        pathParams: { spotId }, auth: "NONE", cache: false, ...(signal ? { signal } : {}),
      });
    },
    getSpotAirQuality(spotId: string, signal?: AbortSignal) {
      return request("spot-air-quality:" + spotId, "spotAirQualityGet", {
        pathParams: { spotId }, auth: "NONE", cache: false, ...(signal ? { signal } : {}),
      });
    },
  };
}
