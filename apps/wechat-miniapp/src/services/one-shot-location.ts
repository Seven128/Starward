import type Taro from "@tarojs/taro";

type LocationPort = Pick<typeof Taro, "getLocation" | "getSetting">;
export type OneShotLocationResult =
  | { state: "GRANTED"; center: { latitude: number; longitude: number } }
  | { state: "DENIED" | "UNAVAILABLE" };

/** A failed GPS request is not proof that this Mini Program's permission was denied. */
export async function requestOneShotLocation(platform: LocationPort): Promise<OneShotLocationResult> {
  try {
    const result = await platform.getLocation({
      type: "gcj02",
      isHighAccuracy: false,
      highAccuracyExpireTime: 2500,
    });
    const { latitude, longitude } = result;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
      return { state: "UNAVAILABLE" };
    return { state: "GRANTED", center: { latitude, longitude } };
  } catch {
    try {
      const settings = await platform.getSetting();
      if (settings.authSetting?.["scope.userLocation"] === false) return { state: "DENIED" };
    } catch { /* Unknown permission remains unknown, never assumed denied. */ }
    return { state: "UNAVAILABLE" };
  }
}
