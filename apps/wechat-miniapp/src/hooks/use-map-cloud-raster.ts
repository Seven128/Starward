import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiEnvelope, MapCloudData, ObservationContext } from "@starward/miniapp-contracts";
import { currentMapCloudRaster, mapCloudRasterRetentionKey, mapCloudRasterView,
  type MapCloudRasterView } from "../services/map-cloud-raster-presentation";

/** Only the same cloud pin/precise instant can survive viewport discovery.
 * Retained bounds stay the actual old bounds; no data or source is relabelled. */
export function useMapCloudRaster(input: {
  scene: ApiEnvelope<MapCloudData> | undefined; context: ObservationContext | null | undefined;
  scope: string | null; selectedAt: string; enabled: boolean; clockOffsetMs: number;
  viewport: { west: number; east: number; south: number; north: number } | null;
}) {
  const previous = useRef<{ identity: string; view: MapCloudRasterView } | null>(null);
  const [, wake] = useState(0);
  const identity = mapCloudRasterRetentionKey(input.scope, input.context, input.selectedAt);
  const current = useMemo(() => {
    if (!input.enabled || !identity || !input.scene || !input.context || !input.viewport) return { view: null, error: null };
    try { return { view: mapCloudRasterView({ scene: input.scene, context: input.context,
      selectedAt: input.selectedAt, viewport: input.viewport, clockOffsetMs: input.clockOffsetMs }), error: null }; }
    catch (error) { return { view: null, error }; }
  }, [input.enabled, identity, input.scene, input.context, input.selectedAt, input.viewport, input.clockOffsetMs]);
  if (!input.enabled || !identity || previous.current?.identity !== identity) previous.current = null;
  const readEvaluated = Boolean(input.scene && input.viewport);
  if (input.enabled && identity && readEvaluated) previous.current = current.view ? { identity, view: current.view } : null;
  const held = input.enabled ? current.view ?? previous.current?.view ?? null : null;
  const offset = held?.clockOffsetMs ?? 0;
  const currentAt = Date.now() + offset;
  const usable = held && currentMapCloudRaster(held, currentAt) ? held : null;
  const expires = held ? Date.parse(held.raster.sourceValidUntil) + 1 : NaN;
  let unavailability: "NOT_READY" | "SOURCE_MISSING" | "OUTSIDE_COVERAGE" | "EXPIRED" | "UNAVAILABLE" | null = null;
  if (input.enabled && !current.error) {
    if (!identity) unavailability = input.context?.weatherView.totalCloud?.state === "UNAVAILABLE"
      && input.context.weatherView.totalCloud.reason === "NOT_READY" ? "NOT_READY" : "UNAVAILABLE";
    else if (held && !usable) unavailability = currentAt >= expires || held.layer.source?.state === "EXPIRED" ? "EXPIRED"
      : held.raster.validPixelCount === 0 ? "SOURCE_MISSING" : "UNAVAILABLE";
    else if (readEvaluated && !current.view) {
      const state = input.scene?.data.gridTimeline?.display.state;
      unavailability = state === "NOT_READY" || state === "SOURCE_MISSING" || state === "OUTSIDE_COVERAGE" || state === "EXPIRED"
        ? state : "UNAVAILABLE";
    }
  }
  useEffect(() => {
    if (!held || !Number.isFinite(expires) || expires <= Date.now() + offset) return;
    const timer = setTimeout(() => wake(value => value + 1), Math.min(2_147_483_647, Math.max(1, expires - Date.now() - offset)));
    return () => clearTimeout(timer);
  }, [held, expires, offset, Boolean(usable)]);
  return { identity, view: usable, error: current.error, retaining: Boolean(usable && !current.view), unavailability,
    // A pending same-identity read may keep valid old coverage. An explicit
    // missing/invalid response or expiry requests actual native retirement.
    unavailable: Boolean(!input.enabled || !identity || current.error || readEvaluated && !current.view || held && !usable),
  };
}
