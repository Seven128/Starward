import { useMemo, useRef } from "react";
import { skyGeometryWindow, type SkyReport, type SkyTimeModel, type SourceSummary } from "@starward/miniapp-contracts";
import { useResourceQuery } from "../../hooks/use-resource-query";
import { getSkyGeometryWindow } from "../../services/sky-celestial-client";
import { skyGeometryWindowKey, type SkyGeometryWindowBinding } from "../../services/sky-geometry-window-response";
import { skyPresentationTimeModel } from "./sky-time-presentation";
import { exactSkyTimeFrame } from "./sky-time-frame";

export function skyTimeModelCovers(model: SkyTimeModel | null, at: string): boolean {
  const value = Date.parse(at);
  return Boolean(model && Number.isFinite(value) && value >= Date.parse(model.startAt) && value <= Date.parse(model.endAt));
}

/** One admitted window on the visible page; request/cache/cancellation stay
 * with the existing Query and transport owners. No delayed response writes
 * the clock or Context. The latest clock intent decides what can be drawn. */
export function useSkyTimeGeometry(report: SkyReport | undefined, at: string, active: boolean) {
  const original = useMemo(() => skyPresentationTimeModel(report), [report]);
  const exact = Boolean(exactSkyTimeFrame(report?.hourly, at));
  const originalCovers = exact || skyTimeModelCovers(original, at);
  const context = report?.context;
  const observer = report?.observationFrames?.[0]?.observer;
  const scope = context ? `${context.spotId}:${context.contextId}:${context.contextRevision}:${context.contextFingerprint}:${context.dataRevision}` : "";
  const retained = useRef<{ scope: string; model: SkyTimeModel; sources: readonly SourceSummary[] } | null>(null);
  if (retained.current?.scope !== scope) retained.current = null;
  const retainedModel = retained.current?.model;
  const binding = useMemo<SkyGeometryWindowBinding | null>(() => {
    if (!context || !observer || originalCovers || skyTimeModelCovers(retainedModel ?? null, at) || !active) return null;
    try {
      skyGeometryWindow(at, context.timezone);
      return { spotId: context.spotId, contextId: context.contextId, contextRevision: context.contextRevision,
        contextFingerprint: context.contextFingerprint, timezone: context.timezone, observer, at };
    } catch { return null; }
  }, [context, observer, originalCovers, retainedModel, active, at]);
  const query = useResourceQuery({ queryKey: skyGeometryWindowKey(binding, context?.dataRevision),
    queryFn: signal => getSkyGeometryWindow(binding!, signal), enabled: Boolean(binding),
    staleTime: 30 * 60_000, gcTime: 0, structuralSharing: false });
  if (binding && query.data) retained.current = { scope, model: query.data.data.model, sources: query.data.sources };
  const model = originalCovers ? original : retained.current?.model ?? original;
  return { model, original, sources: !originalCovers ? retained.current?.sources : undefined,
    pending: Boolean(binding && !skyTimeModelCovers(model, at) && !query.isError),
    failed: Boolean(active && !originalCovers && !skyTimeModelCovers(model, at) && (!binding || query.isError)), retry: query.refetch };
}
