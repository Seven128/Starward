import { gcj02ToWgs84 } from "@starward/coordinate-system";

/** Platform coordinates enter once as GCJ02; domain consumers store WGS84. No spot identity is assigned. */
export function normalizePlatformLocation(selected: { latitude: number; longitude: number; name?: string; address?: string }) {
  if (!Number.isFinite(selected.latitude) || Math.abs(selected.latitude) > 90 ||
      !Number.isFinite(selected.longitude) || Math.abs(selected.longitude) > 180)
    throw new Error("所选地点没有有效坐标");
  const name = selected.name?.trim() ?? "", address = selected.address?.trim() ?? "";
  const point = gcj02ToWgs84({ lat: selected.latitude, lon: selected.longitude, system: "GCJ-02" });
  return { name, address, label: name || address || `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`,
    location: { system: "GCJ02" as const, latitude: selected.latitude, longitude: selected.longitude },
    wgs84: { system: "WGS84" as const, latitude: point.lat, longitude: point.lon } };
}
