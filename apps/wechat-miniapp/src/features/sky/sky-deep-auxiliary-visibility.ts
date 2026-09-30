/** Catalog rings and names identify an unresolved deep-sky object. Once its
 * registered image has actually painted, retire those aids as the object's
 * measured angular footprint becomes readable. Missing images or dimensions
 * keep the catalog aid, rather than making the object disappear. */
export function deepSkyAuxiliaryOpacity(verticalFovDeg: number, viewportHeight: number,
  majorAxisArcmin: number | null, imagePainted: boolean): number {
  if (!imagePainted || !Number.isFinite(verticalFovDeg) || verticalFovDeg <= 0 || verticalFovDeg >= 90 ||
    !Number.isFinite(viewportHeight) || viewportHeight <= 0 || majorAxisArcmin === null ||
    !Number.isFinite(majorAxisArcmin) || majorAxisArcmin <= 0) return 1;
  const diameterPx = viewportHeight * Math.tan(majorAxisArcmin * Math.PI / (60 * 360)) /
    Math.tan(verticalFovDeg * Math.PI / 360);
  const t = Math.max(0, Math.min(1, (diameterPx - 24) / 72));
  return 1 - t * t * (3 - 2 * t);
}
