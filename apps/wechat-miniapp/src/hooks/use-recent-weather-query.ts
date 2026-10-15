import { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useResourceQuery } from "./use-resource-query";
import { useCalendarDay } from "./use-calendar-day";
import { getSpotRecentWeather } from "@/services/api-client";
import { calendarDateInTimezone } from "@/utils/zoned-date";

/** Map and source reading share one live-only regional-history lifecycle. */
export function useRecentWeatherQuery({ spotId, timezone, visible = true }: { spotId: string; timezone: string; visible?: boolean }) {
  const [pageActive, setPageActive] = useState(true);
  const [regionClock, setRegionClock] = useState({ spotId, timezone });
  const [failedSpot, setFailedSpot] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const active = visible && pageActive && spotId.startsWith("spot:");
  const liveFailed = failedSpot === spotId;
  const enabled = active && !liveFailed;
  const calendarTimezone = regionClock.spotId === spotId ? regionClock.timezone : timezone;
  const day = useCalendarDay(calendarTimezone, enabled);
  // A departed observer releases GeoAPI state; no persisted or stale fallback.
  const query = useResourceQuery({ queryKey: ["spot-recent-weather", spotId, day, enabled],
    queryFn: signal => getSpotRecentWeather(spotId, signal), enabled, staleTime: 0, gcTime: 0 });
  useDidHide(() => setPageActive(false));
  useDidShow(() => setPageActive(true));
  useEffect(() => { setFailedSpot(previous => previous === spotId ? previous : null); }, [spotId]);
  useEffect(() => {
    if (!active) { setRegionClock({ spotId, timezone }); setFailedSpot(null); }
  }, [active, spotId, timezone]);
  const envelope = enabled && !query.refreshError && query.data?.dataState !== "STALE_USABLE" && query.data?.data.spotId === spotId ? query.data : undefined;
  const rejectedStale = query.data?.dataState === "STALE_USABLE";
  useEffect(() => {
    if (query.isFetching || !query.refreshError && !query.isError && !rejectedStale) return;
    // Resetting a foreign region's date must not start another failed request.
    setFailedSpot(spotId);
    const current = queryClient.getQueryCache().find({ queryKey: ["spot-recent-weather", spotId, day, enabled], exact: true });
    if (current?.state.data !== undefined) current.setState({ data: undefined, dataUpdatedAt: 0,
      status: "error", error: query.refreshError instanceof Error ? query.refreshError : new Error("recent_weather_live_response_required") });
    setRegionClock(previous => previous.spotId === spotId && previous.timezone === timezone ? previous : { spotId, timezone });
  }, [queryClient, query.refreshError, query.isError, query.isFetching, rejectedStale, spotId, day, enabled, timezone]);
  useEffect(() => {
    const sourceTimezone = envelope?.data.region?.timezone;
    if (sourceTimezone) setRegionClock(previous => previous.spotId === spotId && previous.timezone === sourceTimezone ? previous : { spotId, timezone: sourceTimezone });
  }, [spotId, envelope?.data.region?.timezone]);
  // Validate the first response in its own timezone before effects update the key.
  const sourceDay = envelope?.data.region?.timezone
    ? calendarDateInTimezone(new Date(), envelope.data.region.timezone) : day;
  const outdatedDay = Boolean(envelope?.data.asOfLocalDate && envelope.data.asOfLocalDate !== sourceDay);
  const data = outdatedDay ? undefined : envelope?.data;
  const failed = liveFailed || query.isError || Boolean(query.refreshError) || rejectedStale || outdatedDay || data?.unavailableReason === "REQUEST_FAILED";
  const stale = Boolean(query.refreshError) || rejectedStale;
  const retry = () => liveFailed ? setFailedSpot(null) : void query.refetch();
  return { active, enabled, liveFailed, query, envelope: outdatedDay ? undefined : envelope, data, failed, stale, retry };
}
