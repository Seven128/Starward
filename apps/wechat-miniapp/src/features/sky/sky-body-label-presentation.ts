import type { SkyPickSnapshot } from "./sky-object-picking";

/** Only bodies actually accepted by the renderer may replace a target label.
 * Match the existing 24rpx marker diameter; unresolved points still need labels. */
export function resolvedSkyBodyReferences(snapshot: SkyPickSnapshot | null): readonly string[] {
  if (!snapshot || !Number.isFinite(snapshot.width) || snapshot.width <= 0) return [];
  const markerRadius = snapshot.width * 12 / 750;
  return snapshot.objects.filter(object =>
    (object.reference.startsWith("PLANET:") || object.reference.startsWith("SOLAR:")) &&
    object.hitDisc && Number.isFinite(object.hitDisc.majorRadiusPx) &&
    object.hitDisc.majorRadiusPx >= markerRadius).map(object => object.reference);
}

/** A label cannot cover a resolved disc or expose an intentionally suppressed
 * unresolved point. Missing/failed geometry retains its independent guide. */
export function skyTargetLabelSuppressed(target: { type: string; targetId: string },
  resolvedReferences: readonly string[] = [], suppressedReferences: readonly string[] = []): boolean {
  if (target.type !== "PLANET" || !target.targetId.startsWith("target:")) return false;
  const reference = `PLANET:${target.targetId.slice("target:".length).toUpperCase()}`;
  return resolvedReferences.includes(reference) || suppressedReferences.includes(reference);
}
