import { useEffect, useMemo, useRef, useState } from "react";
import { hashKey } from "@tanstack/react-query";
import type { ApiEnvelope, MapCloudData, MapSceneData, SkyReport, SpotAirQualityData } from "@starward/miniapp-contracts";
import { airQualityPresentation, mapCloudForecastPresentation, mapForecastPresentation, skyForecastPresentation, type ForecastPresentation } from "../services/forecast-presentation";
import { useResourceQuery, type QueryOptions } from "./use-resource-query";

function useForecastQuery<T>(options: QueryOptions<ApiEnvelope<T>>, presentation: ForecastPresentation<T>, refreshOnResume = false) {
  const query = useResourceQuery(options);
  const [, wake] = useState(0);
  const refresh = useRef(query.refetch);
  const wasActive = useRef(options.enabled !== false);
  const lastRevalidation = useRef("");
  const queryIdentity = hashKey(options.queryKey);
  refresh.current = query.refetch;
  // The source and reply use the BFF clock. A slightly slower device clock
  // must not reject a just-acquired source as future data. Anchor that clock
  // to Query's receipt time, then keep it advancing during idle/cache reuse.
  // Do not move an already later device clock backwards or extend source TTLs.
  const generatedAt = Date.parse(query.data?.generatedAt ?? "");
  const forecastClockOffsetMs = Number.isFinite(generatedAt) && Number.isFinite(query.updatedAt) && query.updatedAt > 0
    ? Math.max(0, generatedAt - query.updatedAt) : 0;
  const boundaries = useMemo(() => query.data ? presentation.boundaries(query.data.data) : [], [query.data, presentation]);
  const now = Date.now() + forecastClockOffsetMs;
  const elapsed = boundaries.filter(boundary => boundary <= now).length;
  // Memoize by an actual validity transition, not every render/pose update.
  // Foreground renders sample time immediately, before any timer effect runs.
  const data = useMemo(() => {
    if (!query.data) return undefined;
    const projected = presentation.project(query.data.data, Date.now() + forecastClockOffsetMs);
    // Normal clock expiry is partial forecast coverage, not a failed request.
    // Keep existing transport/sample states and independent warning freshness.
    return projected === query.data.data ? query.data : { ...query.data, data: projected,
      dataState: query.data.dataState === "FRESH" ? "PARTIAL" as const : query.data.dataState };
  }, [query.data, elapsed, presentation, forecastClockOffsetMs]);
  useEffect(() => {
    const resumed = options.enabled !== false && !wasActive.current;
    wasActive.current = options.enabled !== false;
    if (options.enabled === false) return;
    const current = Date.now() + forecastClockOffsetMs;
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
      revalidateElapsed(Date.now() + forecastClockOffsetMs);
    }, Math.min(2_147_483_647, Math.max(1, next - current)));
    return () => clearTimeout(timer);
  }, [boundaries, elapsed, options.enabled, queryIdentity, refreshOnResume, forecastClockOffsetMs]);
  return { ...query, forecastClockOffsetMs, ...(query.data === undefined ? {} : { data: data! }) };
}

export function useSkyForecastQuery(options: QueryOptions<ApiEnvelope<SkyReport>>) {
  return useForecastQuery(options, skyForecastPresentation);
}
// Keep the pure validity policy with the query entry that already exports it
// across WEAPP packages; transient presentation need not duplicate the rule.
useSkyForecastQuery.presentation = skyForecastPresentation;

export function useMapForecastQuery(options: QueryOptions<ApiEnvelope<MapSceneData>>) {
  return useForecastQuery(options, mapForecastPresentation);
}

export function useMapCloudForecastQuery(options: QueryOptions<ApiEnvelope<MapCloudData>>) {
  return useForecastQuery(options, mapCloudForecastPresentation);
}

export function useAirQualityQuery(options: QueryOptions<ApiEnvelope<SpotAirQualityData>>) {
  return useForecastQuery(options, airQualityPresentation, true);
}
