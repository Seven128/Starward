import { useMemo, useRef } from "react";
import { skyGeometryWindow, type SkyGeometryWindowMode, type SkyReport, type SkyTimeModel, type SourceSummary } from "@starward/miniapp-contracts";
import { useResourceQuery } from "../../hooks/use-resource-query";
import { getSkyGeometryWindow } from "../../services/sky-celestial-client";
import { skyGeometryWindowKey, type SkyGeometryWindowBinding } from "../../services/sky-geometry-window-response";
import { MiniappRequestCancelled } from "../../services/request-lifecycle";
import { skyPresentationTimeModel } from "./sky-time-presentation";
import { exactSkyTimeFrame } from "./sky-time-frame";

export function skyTimeModelCovers(model: SkyTimeModel | null, at: string): boolean {
  const value = Date.parse(at);
  return Boolean(model && Number.isFinite(value) && value >= Date.parse(model.startAt) && value <= Date.parse(model.endAt));
}

/** One admitted window on the visible page; request/cache/cancellation stay
 * with the existing Query and transport owners. No delayed response writes
 * the clock or Context. The latest clock intent decides what can be drawn. */
export function useSkyTimeGeometry(report: SkyReport | undefined, at: string, active: boolean, fullWindow: boolean,
  readDemand: () => { at: string; fullWindow: boolean } | null) {
  const original = useMemo(() => skyPresentationTimeModel(report), [report]);
  const exact = Boolean(exactSkyTimeFrame(report?.hourly, at));
  const originalCovers = exact || skyTimeModelCovers(original, at);
  const context = report?.context;
  const observer = report?.observationFrames?.[0]?.observer;
  const scope = context ? `${context.spotId}:${context.contextId}:${context.contextRevision}:${context.contextFingerprint}:${context.dataRevision}` : "";
  const retained = useRef<{ scope: string; model: SkyTimeModel; sources: readonly SourceSummary[];
    windowMode: SkyGeometryWindowMode } | null>(null);
  if (retained.current?.scope !== scope) retained.current = null;
  const retainedModel = retained.current?.model;
  const originalPlaybackReady = Boolean(original && skyTimeModelCovers(original, at) &&
    Date.parse(at) < Date.parse(original.endAt));
  const retainedPlaybackReady = retained.current?.windowMode === "NIGHT" && skyTimeModelCovers(retainedModel ?? null, at) &&
    Date.parse(at) < Date.parse(retainedModel!.endAt);
  const originalUsable = originalCovers && (!fullWindow || originalPlaybackReady);
  const binding = useMemo<SkyGeometryWindowBinding | null>(() => {
    if (!context || !observer || originalUsable ||
      (skyTimeModelCovers(retainedModel ?? null, at) && (!fullWindow || retainedPlaybackReady)) || !active) return null;
    try {
      const windowMode = fullWindow ? "NIGHT" : "TWO_HOURS";
      skyGeometryWindow(at, context.timezone, windowMode);
      return { spotId: context.spotId, contextId: context.contextId, contextRevision: context.contextRevision,
        contextFingerprint: context.contextFingerprint, timezone: context.timezone, observer, at, windowMode };
    } catch { return null; }
  }, [context, observer, originalUsable, retainedModel, retainedPlaybackReady, fullWindow, active, at]);
  const queryKey = skyGeometryWindowKey(binding, context?.dataRevision);
  const current = useRef({ binding, queryKey, readDemand });
  current.current = { binding, queryKey, readDemand };
  const demandCurrent = () => {
    const latest = current.current;
    if (!binding || !latest.binding || queryKey.some((value, index) => value !== latest.queryKey[index])) return false;
    const demand = latest.readDemand();
    if (!demand || (demand.fullWindow ? "NIGHT" : "TWO_HOURS") !== binding.windowMode) return false;
    try {
      return skyGeometryWindow(demand.at, binding.timezone, binding.windowMode).startAt === queryKey[6];
    } catch { return false; }
  };
  // A newer native input can precede Query's passive effect for an older
  // render. Read the existing clock at actual dispatch; equal window demand
  // still shares its request while seconds/minutes continue changing.
  // Once these queued options were disabled, keep that fact for Query's
  // previous-enabled comparison. A fresh A render can then restart after an
  // A -> B -> A input sequence even when the B render was coalesced away.
  let observerEnabled = true;
  const queryEnabled = () => {
    observerEnabled = observerEnabled && demandCurrent();
    return observerEnabled;
  };
  const query = useResourceQuery({ queryKey,
    queryFn: signal => {
      if (!demandCurrent()) return Promise.reject(new MiniappRequestCancelled("superseded"));
      return getSkyGeometryWindow(binding!, signal).then(response => {
        if (signal?.aborted || !demandCurrent()) throw new MiniappRequestCancelled("superseded");
        return response;
      });
    }, enabled: binding ? queryEnabled : false,
    staleTime: 30 * 60_000, gcTime: 0, structuralSharing: false });
  if (binding && query.data && demandCurrent()) retained.current = { scope, model: query.data.data.model, sources: query.data.sources,
    windowMode: binding.windowMode ?? "NIGHT" };
  const model = originalUsable || originalCovers && !skyTimeModelCovers(retained.current?.model ?? null, at)
    ? original : retained.current?.model ?? original;
  const playbackReady = model === original ? originalPlaybackReady
    : retained.current?.windowMode === "NIGHT" && skyTimeModelCovers(model, at) && Date.parse(at) < Date.parse(model!.endAt);
  return { model, original, sources: model !== original ? retained.current?.sources : undefined, playbackReady,
    playbackPending: Boolean(active && fullWindow && !playbackReady && binding && !query.isError),
    playbackFailed: Boolean(active && fullWindow && !playbackReady && (!binding || query.isError)),
    pending: Boolean(binding && !skyTimeModelCovers(model, at) && !query.isError),
    failed: Boolean(active && !originalCovers && !skyTimeModelCovers(model, at) && (!binding || query.isError)),
    retry: () => demandCurrent() ? query.refetch() : Promise.resolve(undefined) };
}
