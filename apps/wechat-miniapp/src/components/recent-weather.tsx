import { Button, Text, View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useCalendarDay } from "@/hooks/use-calendar-day";
import { getSpotRecentWeather } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { calendarDateInTimezone } from "@/utils/zoned-date";
import { Provenance } from "./provenance";
import { SourceAttribution } from "./source-attribution";
import { SoftButton } from "./soft-button";
import { StatusPanel } from "./status-panel";
import { recentWeatherFacts, recentWeatherImplications } from "./recent-weather-summary";
import "./recent-weather.scss";

/** Regional history in the current map's formal-spot document. */
export function RecentWeather({ spotId, timezone, visible = true }: { spotId: string; timezone: string; visible?: boolean }) {
  const [pageActive, setPageActive] = useState(true);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [regionClock, setRegionClock] = useState({ spotId, timezone });
  const [failedSpot, setFailedSpot] = useState<string | null>(null);
  const notify = useAppStore(state => state.notify);
  const queryClient = useQueryClient();
  const active = visible && pageActive && spotId.startsWith("spot:");
  const liveFailed = failedSpot === spotId;
  const enabled = active && !liveFailed;
  const calendarTimezone = regionClock.spotId === spotId ? regionClock.timezone : timezone;
  const day = useCalendarDay(calendarTimezone, enabled);
  // GeoAPI fields are live display state only. Moving to an inactive identity
  // releases the active observer; gcTime=0 drops its response and cancels work.
  const query = useResourceQuery({ queryKey: ["spot-recent-weather", spotId, day, enabled],
    queryFn: signal => getSpotRecentWeather(spotId, signal), enabled, staleTime: 0, gcTime: 0 });
  useDidHide(() => setPageActive(false));
  useDidShow(() => setPageActive(true));
  useEffect(() => { setExplanationOpen(false); setFailedSpot(previous => previous === spotId ? previous : null); }, [spotId]);
  useEffect(() => {
    if (!active) { setRegionClock({ spotId, timezone }); setFailedSpot(null); }
  }, [active, spotId, timezone]);
  const envelope = enabled && !query.refreshError && query.data?.dataState !== "STALE_USABLE" && query.data?.data.spotId === spotId ? query.data : undefined;
  const rejectedStale = query.data?.dataState === "STALE_USABLE";
  useEffect(() => {
    if (query.isFetching || !query.refreshError && !query.isError && !rejectedStale) return;
    // Clearing a foreign regional timezone can change the calendar key. Keep
    // the failure independently so that cleanup cannot initiate another fetch.
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
  // A first regional response can cross a date boundary relative to the spot.
  // Validate in the source timezone immediately, before the effect updates the clock.
  const sourceDay = envelope?.data.region?.timezone
    ? calendarDateInTimezone(new Date(), envelope.data.region.timezone) : day;
  const outdatedDay = Boolean(envelope?.data.asOfLocalDate && envelope.data.asOfLocalDate !== sourceDay);
  const data = outdatedDay ? undefined : envelope?.data;
  const failed = liveFailed || query.isError || Boolean(query.refreshError) || rejectedStale || outdatedDay || data?.unavailableReason === "REQUEST_FAILED";
  useEffect(() => {
    if (!enabled || !failed) return;
    notify({ owner: "recent-weather", placement: "floating", tone: "info", title: "近期天气数据异常",
      body: "暂时无法取得完整地区记录，可在近期天气中重试。", dedupeKey: spotId });
  }, [enabled, failed, notify, spotId]);
  if (!spotId.startsWith("spot:")) return null;
  const days = data?.days ?? [];
  const implications = recentWeatherImplications(days);
  const stale = Boolean(query.refreshError) || rejectedStale;
  return <View className="recent-weather" data-control="spot-recent-weather">
    <View className="recent-weather__heading">
      <Text className="type-label">近期天气</Text>
      <Button className="recent-weather__help focus-ring" aria-label="说明近期天气数据范围" aria-expanded={explanationOpen}
        onClick={() => setExplanationOpen(value => !value)}><Text aria-hidden="true">?</Text></Button>
    </View>
    {data?.region ? <Text className="type-caption">邻近地区：{data.region.name}</Text> : null}
    {data?.asOfLocalDate ? <Text className="type-caption">截至 {data.asOfLocalDate} 的前两日 · {data.region?.timezone}</Text> : null}
    {query.isPending && !liveFailed ? <View role="status"><Text className="type-caption">正在加载地区天气…</Text></View> : days.length ?
      days.map(day => <View className="recent-weather__day" key={day.localDate}>
        <Text className="type-secondary">{day.localDate}</Text>
        <Text className="type-body">{recentWeatherFacts(day).join(" · ")}</Text>
      </View>) : failed ? <StatusPanel state="ERROR" detail="地区历史天气暂时无法获取。" recoveryLabel="重试近期天气" onRecover={() => liveFailed ? setFailedSpot(null) : void query.refetch()} /> : <StatusPanel state="EMPTY" detail="地区历史天气尚无可用记录。" />}
    {stale ? <Text className="type-caption">资料暂未刷新，请重试获取当前地区记录。</Text> : null}
    {implications.map(message => <Text className="type-caption" key={message}>{message}</Text>)}
    {!explanationOpen && days.length ? <SourceAttribution sources={envelope?.sources ?? []} /> : null}
    {explanationOpen ? <View className="recent-weather__explanation" role="note">
      <Text className="type-caption">这里展示邻近地区前两个自然日的历史再分析，不含今天，也不是点位过去48小时的现场实测。未返回的日期或字段不补齐；当前选中的观测日期不会改变这些历史记录。</Text>
      {data?.missingDates.length ? <Text className="type-caption">暂无数据：{data.missingDates.join("、")}</Text> : null}
      <Text className="type-caption">天气只提示可能影响，不能确认道路、积水、结冰、开放或通行安全。</Text>
      {envelope?.sources.map(source => <Provenance key={source.id} source={source} />)}
      <Button className="recent-weather__close focus-ring" onClick={() => setExplanationOpen(false)}>收起说明</Button>
    </View> : null}
    {(days.length || !failed) && (failed || stale || envelope?.dataState === "PARTIAL" || envelope?.dataState === "UNAVAILABLE") ? <SoftButton label="重试近期天气" onClick={() => liveFailed ? setFailedSpot(null) : void query.refetch()}>重试</SoftButton> : null}
  </View>;
}
