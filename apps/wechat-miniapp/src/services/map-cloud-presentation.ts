import { mapCloudCellId, type MapCloudSnapshot, type MapLayerPolygon, type MapSceneData, type MapSceneTimeFrame } from "@starward/miniapp-contracts";

const HOUR = 3_600_000;
type CloudData = Pick<MapSceneData, "layer" | "timeFrames" | "cloudSnapshot">;
const hourEnd = (at: string | undefined) => Date.parse(at ?? "") + HOUR;

export function mapCloudBoundaries(data: CloudData): number[] {
  return [...new Set([
    ...data.timeFrames.flatMap(frame => frame.dynamicLayer?.kind === "CLOUD"
      ? frame.dynamicLayer.polygons.map(polygon => hourEnd(polygon.weatherAt)) : []),
    ...(data.cloudSnapshot?.cells.map(cell => Date.parse(cell.retrievedAt ?? "")
      + data.cloudSnapshot!.maximumSourceAgeSeconds * 1000) ?? []),
  ].filter(Number.isFinite))];
}

/** Real geographic cells expire independently of the formal-place catalogue.
 * The snapshot owns actual query locations and source age; no neighbouring
 * sample or display tick can extend either coverage or the source hour. */
export function currentMapCloudPolygons(polygons: readonly MapLayerPolygon[], at: string,
  snapshot: MapCloudSnapshot | null | undefined, now: number,
  legacySignals: MapSceneTimeFrame["spotSignals"]): readonly MapLayerPolygon[] {
  const instant = Date.parse(at);
  const current = polygons.filter(polygon => {
    if (!polygon.weatherAt) {
      // Older responses had only formal-place cells and their spot source hour.
      const signal = legacySignals[polygon.id.replace(/^cloud:/u, "")];
      const start = Date.parse(signal?.weatherAt ?? "");
      return signal?.state !== "UNAVAILABLE" && start <= instant && instant < start + HOUR && now < start + HOUR;
    }
    const start = Date.parse(polygon.weatherAt);
    if (polygon.state === "UNAVAILABLE" || !Number.isFinite(polygon.value) || polygon.value === null
      || polygon.value < 0 || polygon.value > 100 || !(start <= instant && instant < start + HOUR && now < start + HOUR)) return false;
    if (!snapshot) return true; // Pre-snapshot servers still bind their source hour.
    return snapshot.cells.some(cell => {
      const retrieved = Date.parse(cell.retrievedAt ?? "");
      return mapCloudCellId(cell.requestedGcj02) === polygon.id && cell.quality === "AVAILABLE"
        && cell.sourceState !== "EXPIRED" && cell.sourceState !== "UNAVAILABLE"
        && retrieved <= now && now < retrieved + snapshot.maximumSourceAgeSeconds * 1000
        && cell.hours.some(hour => Date.parse(hour.at) === start && hour.cloudPercent === polygon.value);
    });
  });
  return current.length === polygons.length ? polygons : current;
}

export function currentMapCloudFrame(frame: MapSceneTimeFrame, snapshot: CloudData["cloudSnapshot"], now: number) {
  const layer = frame.dynamicLayer;
  if (layer?.kind !== "CLOUD") return frame;
  const polygons = currentMapCloudPolygons(layer.polygons, frame.atUtc, snapshot, now, frame.spotSignals);
  return polygons === layer.polygons ? frame : { ...frame, dynamicLayer: { ...layer, polygons,
    state: polygons.length ? "PARTIAL" as const : "UNAVAILABLE" as const } };
}
