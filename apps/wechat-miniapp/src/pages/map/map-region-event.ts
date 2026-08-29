interface RegionEnd {
  center: { latitude: number; longitude: number };
  zoom?: number;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function inRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

/** WeChat puts phase/cause at the event root; Taro's component types also admit a nested wrapper. */
function gesturePayload(event: unknown): Record<string, unknown> | null {
  const root = record(event);
  const detail = record(root?.detail);
  const nested = record(detail?.detail);
  const payload = nested ?? detail;
  const phase = detail?.type ?? root?.type;
  const cause = detail?.causedBy ?? root?.causedBy ?? payload?.causedBy;
  if (phase !== "end" || (cause !== "drag" && cause !== "scale")) return null;
  return payload;
}

export function userMapRegionEnd(event: unknown): RegionEnd | null {
  const payload = gesturePayload(event);
  const center = record(payload?.centerLocation);
  const latitude = center?.latitude, longitude = center?.longitude;
  if (!inRange(latitude, -90, 90) || !inRange(longitude, -180, 180)) return null;
  const zoom = payload?.scale;
  if (zoom !== undefined && !inRange(zoom, 3, 20)) return null;
  return { center: { latitude, longitude }, ...(typeof zoom === "number" ? { zoom } : {}) };
}
