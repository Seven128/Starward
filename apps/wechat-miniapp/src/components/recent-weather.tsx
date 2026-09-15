import { Button, Text, View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useState } from "react";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useCalendarDay } from "@/hooks/use-calendar-day";
import { getSpotRecentWeather } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { calendarDateInTimezone } from "@/utils/zoned-date";
import { Provenance } from "./provenance";
import { SoftButton } from "./soft-button";
import { StatusPanel } from "./status-panel";
import { recentWeatherFacts, recentWeatherImplications } from "./recent-weather-summary";
import "./recent-weather.scss";

/** Regional history in the current map's formal-spot document. */
export function RecentWeather({ spotId, timezone, visible = true }: { spotId: string; timezone: string; visible?: boolean }) {
  const [pageActive, setPageActive] = useState(true);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [regionClock, setRegionClock] = useState({ spotId, timezone });
  const notify = useAppStore(state => state.notify);
  const enabled = visible && pageActive && spotId.startsWith("spot:");
  const calendarTimezone = regionClock.spotId === spotId ? regionClock.timezone : timezone;
  const day = useCalendarDay(calendarTimezone, enabled);
  const query = useResourceQuery({ queryKey: ["spot-recent-weather", spotId, day],
    queryFn: signal => getSpotRecentWeather(spotId, signal), enabled, staleTime: 60_000 });
  useDidHide(() => setPageActive(false));
  useDidShow(() => setPageActive(true));
  useEffect(() => setExplanationOpen(false), [spotId]);
  const envelope = query.data?.data.spotId === spotId ? query.data : undefined;
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
  const failed = query.isError || Boolean(query.refreshError) || envelope?.dataState === "STALE_USABLE" || outdatedDay || data?.unavailableReason === "REQUEST_FAILED";
  useEffect(() => {
    if (!enabled || !failed) return;
    notify({ owner: "recent-weather", placement: "floating", tone: "info", title: "近期天气数据异常",
      body: "暂时无法取得完整地区记录，可在近期天气中重试。", dedupeKey: spotId });
  }, [enabled, failed, notify, spotId]);
  if (!spotId.startsWith("spot:")) return null;
  const days = data?.days ?? [];
  const implications = recentWeatherImplications(days);
  const stale = Boolean(query.refreshError) || envelope?.dataState === "STALE_USABLE";
  return <View className="recent-weather" data-control="spot-recent-weather">
    <View className="recent-weather__heading">
      <Text className="type-label">近期天气</Text>
      <Button className="recent-weather__help focus-ring" aria-label="说明近期天气数据范围" aria-expanded={explanationOpen}
        onClick={() => setExplanationOpen(value => !value)}><Text aria-hidden="true">?</Text></Button>
    </View>
    {data?.region ? <Text className="type-caption">邻近地区：{data.region.name}</Text> : null}
    {data?.asOfLocalDate ? <Text className="type-caption">截至 {data.asOfLocalDate} 的前两日 · {data.region?.timezone}</Text> : null}
    {query.isPending ? <View role="status"><Text className="type-caption">正在加载地区天气…</Text></View> : days.length ?
      days.map(day => <View className="recent-weather__day" key={day.localDate}>
        <Text className="type-secondary">{day.localDate}</Text>
        <Text className="type-body">{recentWeatherFacts(day).join(" · ")}</Text>
      </View>) : <StatusPanel state="EMPTY" detail="地区历史天气尚无可用记录。" />}
    {stale ? <Text className="type-caption">资料暂未刷新，以下仅为所列日期记录。</Text> : null}
    {implications.map(message => <Text className="type-caption" key={message}>{message}</Text>)}
    {explanationOpen ? <View className="recent-weather__explanation" role="note">
      <Text className="type-caption">这里展示邻近地区前两个自然日的历史再分析，不含今天，也不是点位过去48小时的现场实测。未返回的日期或字段不补齐；当前选中的观测日期不会改变这些历史记录。</Text>
      {data?.missingDates.length ? <Text className="type-caption">暂无数据：{data.missingDates.join("、")}</Text> : null}
      <Text className="type-caption">天气只提示可能影响，不能确认道路、积水、结冰、开放或通行安全。</Text>
      {envelope?.sources.map(source => <Provenance key={source.id} source={source} />)}
      <Button className="recent-weather__close focus-ring" onClick={() => setExplanationOpen(false)}>收起说明</Button>
    </View> : null}
    {failed || stale || envelope?.dataState === "PARTIAL" || envelope?.dataState === "UNAVAILABLE" ? <SoftButton label="重试近期天气" onClick={() => void query.refetch()}>重试</SoftButton> : null}
  </View>;
}
