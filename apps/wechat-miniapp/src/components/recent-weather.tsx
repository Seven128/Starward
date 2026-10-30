import { Text, View } from "@tarojs/components";
import { useEffect, useMemo } from "react";
import { useRecentWeatherQuery } from "@/hooks/use-recent-weather-query";
import { useAppStore } from "@/state/app-store";
import { createResourceFailureEpisode, type ResourceFailureEpisode } from "@/services/resource-failure-episode";
import { SourceEntry } from "./source-entry";
import { SourceAttribution } from "./source-attribution";
import { SoftButton } from "./soft-button";
import { StatusPanel } from "./status-panel";
import { recentWeatherDetails, recentWeatherFacts, recentWeatherImplications } from "./recent-weather-summary";
import "./recent-weather.scss";

/** Regional history in the current map's formal-spot document. */
export function RecentWeather({ spotId, timezone, visible = true, id, onLayoutChange, failureEpisode: retainedFailureEpisode }: {
  spotId: string; timezone: string; visible?: boolean; id?: string; onLayoutChange?: () => void;
  failureEpisode?: ResourceFailureEpisode | undefined;
}) {
  const { active, liveFailed, query, envelope, data, failed, stale, retry: retryQuery } = useRecentWeatherQuery({ spotId, timezone, visible });
  const notify = useAppStore(state => state.notify);
  const localFailureEpisode = useMemo(() => createResourceFailureEpisode(), []);
  const failureEpisode = retainedFailureEpisode ?? localFailureEpisode;
  useEffect(() => { onLayoutChange?.(); }, [active, data, failed, stale, query.isPending, onLayoutChange]);
  useEffect(() => {
    if (!failureEpisode.observe({ scope: spotId, active,
      pending: query.isFetching || (query.isPending && !liveFailed), failed,
      healthy: Boolean(envelope && !failed) })) return;
    notify({ owner: "recent-weather", placement: "floating", tone: "info", title: "近期天气数据异常",
      body: "暂时无法取得完整地区记录，可在近期天气中重试。", dedupeKey: spotId });
  }, [active, failed, query.isFetching, query.isPending, liveFailed, envelope, notify, spotId, failureEpisode]);
  const retry = () => { if (retryQuery()) failureEpisode.retry(); };
  if (!spotId.startsWith("spot:")) return null;
  const days = data?.days ?? [];
  const dates = data ? [...new Set([...days.map(day => day.localDate), ...data.missingDates])].sort() : [];
  const details = days.flatMap(day => {
    const facts = recentWeatherDetails(day);
    return facts.length ? [{ date: day.localDate, facts }] : [];
  });
  const implications = recentWeatherImplications(days);
  return <View {...(id ? { id } : {})} className={`recent-weather${id ? " panel-reading-anchor" : ""}${days.length ? " recent-weather--with-days" : ""}`} data-control="spot-recent-weather">
    <View className="recent-weather__heading">
      <Text className="type-label">近期天气</Text>
    </View>
    {data?.region ? <Text className="type-caption">邻近地区：{data.region.name}</Text> : null}
    {data?.asOfLocalDate ? <Text className="type-caption">截至 {data.asOfLocalDate} 的前两日 · {data.region?.timezone}</Text> : null}
    {query.isPending && !liveFailed ? <StatusPanel state="LOADING" detail="正在加载地区天气" /> : days.length ?
      dates.map(date => {
        const day = days.find(day => day.localDate === date);
        return <View className="recent-weather__day" key={date}>
          <Text className="type-secondary">{date}</Text>
          <Text className="type-body">{day ? recentWeatherFacts(day).join(" · ") || "温度、降水未返回" : "未返回"}</Text>
        </View>;
      }) : failed ? <StatusPanel state="ERROR" detail="地区历史天气暂时无法获取。" recoveryLabel="重试近期天气" onRecover={retry} /> : <View role="status"><Text className="type-body">地区暂无数据</Text></View>}
    {days.length && failed ? <Text className="type-caption">部分记录暂未取得，请重试</Text> : null}
    {stale ? <Text className="type-caption">资料暂未刷新，请重试获取当前地区记录。</Text> : null}
    {implications.map(message => <Text className="type-caption" key={message}>{message}</Text>)}
    {days.length ? <SourceAttribution presentation="credit" sources={envelope?.sources ?? []} /> : null}
    {active ? <SourceEntry key={spotId} id="recent-weather-source" label={days.length ? "近期天气范围与来源" : "说明近期天气数据范围"} sources={envelope?.sources ?? []}
      {...(data?.region?.name ? { subtitle: data.region.name } : {})} sections={[
        { kind: "text", paragraphs: [
          "这里展示邻近地区前两个自然日的历史再分析，不含今天，也不是点位过去48小时的现场实测。未返回的日期或字段不补齐；当前选中的观测日期不会改变这些历史记录。",
          ...(data?.missingDates.length ? [`暂无数据：${data.missingDates.join("、")}`] : []),
        ] },
        ...details.map(day => ({ kind: "text" as const, title: day.date, paragraphs: day.facts })),
        { kind: "text", paragraphs: ["天气只提示可能影响，不能确认道路、积水、结冰、开放或通行安全。"] },
      ]} /> : null}
    {(days.length || !failed) && (failed || stale || envelope?.dataState === "PARTIAL" || envelope?.dataState === "UNAVAILABLE") ? <SoftButton label="重试近期天气" loading={query.isFetching ? "arc" : false} onClick={retry}>重试</SoftButton> : null}
  </View>;
}
