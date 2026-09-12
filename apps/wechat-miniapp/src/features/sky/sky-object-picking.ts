export interface PaintedSkyObject {
  reference: string;
  displayName: string;
  kind: "STAR" | "GALAXY" | "NEBULA";
  magnitude: number | null;
  x: number;
  y: number;
}

export interface SkyPickSnapshot {
  catalogVersion: string;
  catalogHash: string;
  frameAt: string;
  width: number;
  height: number;
  objects: readonly PaintedSkyObject[];
}

export function pickPaintedSkyObjects(
  snapshot: SkyPickSnapshot | null,
  input: { x: number; y: number; frameAt: string; catalogVersion: string; catalogHash: string },
  tolerancePx = 18,
) {
  if (!snapshot || snapshot.frameAt !== input.frameAt ||
    snapshot.catalogVersion !== input.catalogVersion || snapshot.catalogHash !== input.catalogHash)
    return [];
  return snapshot.objects
    .map((object) => ({ object, distance: Math.hypot(object.x - input.x, object.y - input.y) }))
    .filter((candidate) => candidate.distance <= tolerancePx)
    .sort((left, right) => left.distance - right.distance ||
      (left.object.magnitude ?? 99) - (right.object.magnitude ?? 99) ||
      left.object.reference.localeCompare(right.object.reference))
    .slice(0, 4)
    .map((candidate) => candidate.object);
}

export function isUnambiguousTapGesture(input: {
  startedWithTouches: number;
  maximumTouches: number;
  travelPx: number;
  cancelled: boolean;
}) {
  return !input.cancelled && input.startedWithTouches === 1 &&
    input.maximumTouches === 1 && input.travelPx <= 8;
}
