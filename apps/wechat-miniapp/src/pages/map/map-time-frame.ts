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

/** Missing exact instants carry no signals; never borrow a neighboring forecast. */
export function mapTimeFrameAt(frames: readonly MapSceneTimeFrame[], atUtc: string): MapSceneTimeFrame {
  const instant = Date.parse(atUtc);
  const matches = Number.isFinite(instant) ? frames.filter(frame => Date.parse(frame.atUtc) === instant) : [];
  return matches.length === 1 ? matches[0]! : { atUtc, spotSignals: {}, dynamicLayer: null };
}

export function projectMapEvaluations(
  evaluations: Readonly<Record<string, MapSpotEvaluation>>,
  frame: MapSceneTimeFrame | null,
) {
  if (!frame) return evaluations;
  return Object.fromEntries(
    Object.entries(evaluations).map(([spotId, evaluation]) => {
      const signal = frame.spotSignals[spotId];
      return [spotId, signal?.spotId === spotId && signal.state !== "UNAVAILABLE" ? { ...evaluation, ...signal } : {
        ...evaluation,
        cloudPercent: null, lowCloudPercent: null, midCloudPercent: null, highCloudPercent: null,
        moonImpact: "UNKNOWN", opportunityScore: null, opportunityConfidence: null,
        opportunityEligible: false, opportunityLabel: "当前时段暂无数据", state: "UNAVAILABLE",
      }];
    }),
  ) as Readonly<Record<string, MapSpotEvaluation>>;
}

export function projectedLayerPolygons(
  layer: MapLayerData,
  frame: MapSceneTimeFrame | null,
) {
  if (frame && (layer.kind === "CLOUD" || layer.kind === "OPPORTUNITY")) {
    return frame.dynamicLayer?.kind === layer.kind && frame.dynamicLayer.state !== "UNAVAILABLE"
      ? frame.dynamicLayer.polygons : [];
  }
  return layer.polygons;
}
