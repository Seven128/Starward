import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiEnvelope, MapSceneData } from "@starward/miniapp-contracts";
import { currentMapCloudFrame, mapCloudBoundaries } from "../services/map-cloud-presentation";

type CloudView = Pick<MapSceneData, "layer" | "timeFrames" | "cloudSnapshot"> & Pick<ApiEnvelope<MapSceneData>, "sources">;
type Input = { scene: ApiEnvelope<MapSceneData> | undefined; scope: string | null; enabled: boolean; selectedAtUtc: string };

/** One public acquisition survives a viewport request. It never supplies old
 * spots, account state or a new coverage rectangle. New responses, including
 * missing cells, replace it; expiry is checked even if the request is offline. */
export function useMapCloudPresentation({ scene, scope, enabled, selectedAtUtc }: Input) {
  const previous = useRef<{ scope: string; view: CloudView } | null>(null);
  const [, wake] = useState(0);
  const current = useMemo<CloudView | undefined>(() => scene?.data.layer.kind === "CLOUD" ? {
    layer: scene.data.layer, timeFrames: scene.data.timeFrames, cloudSnapshot: scene.data.cloudSnapshot ?? null,
    sources: scene.sources.filter(source => source.kind === "THIRD_PARTY_FORECAST"),
  } : undefined, [scene]);
  const retained = useMemo<CloudView | undefined>(() => current?.cloudSnapshot ? {
    ...current, timeFrames: current.timeFrames.map(frame => ({ ...frame, spotSignals: {} })),
  } : undefined, [current]);
  if (!enabled || !scope || previous.current?.scope !== scope) previous.current = null;
  if (enabled && scope && current) previous.current = retained ? { scope, view: retained } : null;
  const retaining = enabled && !current && Boolean(previous.current);
  const candidate = enabled ? current ?? previous.current?.view : undefined;
  const boundaries = useMemo(() => candidate ? mapCloudBoundaries(candidate) : [], [candidate]);
  const elapsed = boundaries.filter(boundary => boundary <= Date.now()).length;
  useEffect(() => {
    // Current data already has the forecast-query timer. Only the held public
    // acquisition needs its own expiry wake, never a second request/retry owner.
    if (!retaining) return;
    const next = Math.min(...boundaries.filter(boundary => boundary > Date.now()));
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(() => wake(value => value + 1), Math.min(2_147_483_647, Math.max(1, next - Date.now())));
    return () => clearTimeout(timer);
  }, [boundaries, elapsed, retaining]);
  return useMemo(() => {
    if (!candidate) return undefined;
    const now = Date.now(), timeFrames = candidate.timeFrames.map(frame => currentMapCloudFrame(frame, candidate.cloudSnapshot, now));
    const selected = timeFrames.find(frame => Date.parse(frame.atUtc) === Date.parse(selectedAtUtc))?.dynamicLayer;
    const layer = { ...candidate.layer, polygons: selected?.kind === "CLOUD" ? selected.polygons : [],
      state: selected?.kind === "CLOUD" ? selected.state : "UNAVAILABLE" as const };
    return { ...candidate, timeFrames, layer, retaining };
  }, [candidate, elapsed, selectedAtUtc, retaining]);
}
