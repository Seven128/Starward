export interface DeviceLocationFix {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  timestampMs: number;
  coordinateSystem: "WGS84";
  mocked?: boolean;
}

export function coordinatesValid(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

export function assertDeviceLocationFix(fix: DeviceLocationFix): void {
  if (!coordinatesValid(fix.latitude, fix.longitude)
    || fix.coordinateSystem !== "WGS84"
    || !Number.isFinite(fix.timestampMs) || fix.timestampMs < 0
    || (fix.accuracyMeters !== null && (!Number.isFinite(fix.accuracyMeters) || fix.accuracyMeters < 0))
    || (fix.mocked !== undefined && typeof fix.mocked !== "boolean")) {
    throw new Error("device_location_fix_invalid");
  }
}
