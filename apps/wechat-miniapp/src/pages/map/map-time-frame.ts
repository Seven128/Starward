import type {
  MapLayerData,
  MapSceneTimeFrame,
  MapSpotEvaluation,
} from "@starward/miniapp-contracts";

export function nearestMapTimeFrameIndex(
  frames: readonly MapSceneTimeFrame[],
  selectedAtUtc: string,
) {
  if (!frames.length) return 0;
  const selected = Date.parse(selectedAtUtc);
  if (!Number.isFinite(selected)) return 0;
  return frames.reduce(
    (nearestIndex, frame, index) =>
      Math.abs(Date.parse(frame.atUtc) - selected) <
      Math.abs(Date.parse(frames[nearestIndex]!.atUtc) - selected)
        ? index
        : nearestIndex,
    0,
  );
}

export function projectMapEvaluations(
  evaluations: Readonly<Record<string, MapSpotEvaluation>>,
  frame: MapSceneTimeFrame | null,
) {
  if (!frame) return evaluations;
  return Object.fromEntries(
    Object.entries(evaluations).map(([spotId, evaluation]) => [
      spotId,
      frame.spotSignals[spotId]
        ? { ...evaluation, ...frame.spotSignals[spotId] }
        : evaluation,
    ]),
  ) as Readonly<Record<string, MapSpotEvaluation>>;
}

export function projectedLayerPolygons(
  layer: MapLayerData,
  frame: MapSceneTimeFrame | null,
) {
  if (
    frame?.dynamicLayer &&
    frame.dynamicLayer.kind === layer.kind &&
    (layer.kind === "CLOUD" || layer.kind === "OPPORTUNITY")
  )
    return frame.dynamicLayer.polygons;
  return layer.polygons;
}
