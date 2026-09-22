import { useEffect, useMemo, useRef, useState } from "react";
import { hashKey } from "@tanstack/react-query";
import type { ApiEnvelope, MapSceneData, SkyReport, SpotAirQualityData } from "@starward/miniapp-contracts";
import { airQualityPresentation, mapForecastPresentation, skyForecastPresentation, type ForecastPresentation } from "../services/forecast-presentation";
import { useResourceQuery, type QueryOptions } from "./use-resource-query";

function useForecastQuery<T>(options: QueryOptions<ApiEnvelope<T>>, presentation: ForecastPresentation<T>, refreshOnResume = false) {
  const query = useResourceQuery(options);
  const [, wake] = useState(0);
  const refresh = useRef(query.refetch);
  const wasActive = useRef(options.enabled !== false);
  const lastRevalidation = useRef("");
  const queryIdentity = hashKey(options.queryKey);
  refresh.current = query.refetch;
  const boundaries = useMemo(() => query.data ? presentation.boundaries(query.data.data) : [], [query.data, presentation]);
  const now = Date.now();
  const elapsed = boundaries.filter(boundary => boundary <= now).length;
  // Memoize by an actual validity transition, not every render/pose update.
  // Foreground renders sample time immediately, before any timer effect runs.
  const data = useMemo(() => {
    if (!query.data) return undefined;
    const projected = presentation.project(query.data.data, Date.now());
    // Normal clock expiry is partial forecast coverage, not a failed request.
    // Keep existing transport/sample states and independent warning freshness.
    return projected === query.data.data ? query.data : { ...query.data, data: projected,
      dataState: query.data.dataState === "FRESH" ? "PARTIAL" as const : query.data.dataState };
  }, [query.data, elapsed, presentation]);
  useEffect(() => {
    const resumed = options.enabled !== false && !wasActive.current;
    wasActive.current = options.enabled !== false;
    if (options.enabled === false) return;
    const current = Date.now();
    const revalidateElapsed = (at: number, force = false) => {
      const latest = Math.max(...boundaries.filter(boundary => boundary <= at));
      if (!Number.isFinite(latest) && !(force && refreshOnResume)) return;
      const stamp = `${queryIdentity}:${latest}`;
      if (!force && lastRevalidation.current === stamp) return;
      lastRevalidation.current = stamp;
      // Enabling a stale query may already have started its fetch in Query's
      // own effect. Automatic expiry/resume joins it instead of canceling it.
      void refresh.current({ cancelRefetch: false }).catch(() => {});
    };
    // Re-entering an already expired cache must revalidate once, without a
    // request loop when offline or when the server repeats the same envelope.
    revalidateElapsed(current, resumed);
    if (boundaries.filter(boundary => boundary <= current).length !== elapsed) {
      wake(value => value + 1);
      return;
    }
    const next = Math.min(...boundaries.filter(boundary => boundary > current));
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(() => {
      wake(value => value + 1);
      // The query retains cancellation, errors and retry ownership. Local
      // expiry works even if offline or if the refresh keeps the old envelope.
      revalidateElapsed(Date.now());
    }, Math.min(2_147_483_647, Math.max(1, next - current)));
    return () => clearTimeout(timer);
  }, [boundaries, elapsed, options.enabled, queryIdentity, refreshOnResume]);
  return query.data === undefined ? query : { ...query, data: data! };
}

export function useSkyForecastQuery(options: QueryOptions<ApiEnvelope<SkyReport>>) {
  return useForecastQuery(options, skyForecastPresentation);
}

export function useMapForecastQuery(options: QueryOptions<ApiEnvelope<MapSceneData>>) {
  return useForecastQuery(options, mapForecastPresentation);
}

export function useAirQualityQuery(options: QueryOptions<ApiEnvelope<SpotAirQualityData>>) {
  return useForecastQuery(options, airQualityPresentation, true);
}
