import { Text, View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";
import type { AirQualitySnapshot } from "@starward/miniapp-contracts";
import { useAirQualityQuery } from "@/hooks/use-forecast-query";
import { getSpotAirQuality } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { createResourceFailureEpisode, type ResourceFailureEpisode } from "@/services/resource-failure-episode";
import { calendarDateInTimezone, clockTimeInTimezone } from "@/utils/zoned-date";
import { SourceAttribution } from "./source-attribution";
import { SourceEntry } from "./source-entry";
import { SoftButton } from "./soft-button";
import { StatusPanel } from "./status-panel";
import { airQualityState } from "./air-quality-state";

function Reading({ value }: { value: AirQualitySnapshot }) {
  return <View className="spot-panel__metric-grid air-quality__readings">
    {value.indexes.map(index => <View className="spot-panel__metric air-quality__reading" key={index.code}>
      <Text className="type-secondary air-quality__reading-label">{index.name}</Text>
      <Text className="type-data air-quality__reading-value">{index.display}{index.category ? ` · ${index.category}` : ""}</Text>
      {index.primaryPollutant ? <Text className="type-caption">首要污染物：{index.primaryPollutant}</Text> : null}
    </View>)}
    {value.pollutants.map(item => <View className="spot-panel__metric air-quality__reading" key={item.code}>
      <Text className="type-secondary air-quality__reading-label">{item.name}</Text><Text className="type-data air-quality__reading-value">{item.value} {item.unit}</Text>
    </View>)}
  </View>;
}

export function AirQuality({ spotId, selectedAt, timezone, visible = true, id, onLayoutChange, failureEpisode: retainedFailureEpisode }: {
  spotId: string; selectedAt: string; timezone: string; visible?: boolean; id?: string; onLayoutChange?: () => void;
  failureEpisode?: ResourceFailureEpisode | undefined;
}) {
  const [active, setActive] = useState(true);
  const notify = useAppStore(state => state.notify);
  const localFailureEpisode = useMemo(() => createResourceFailureEpisode(), []);
  const failureEpisode = retainedFailureEpisode ?? localFailureEpisode;
  const enabled = active && visible && spotId.startsWith("spot:");
  const query = useAirQualityQuery({ queryKey: ["spot-air-quality", spotId], queryFn: signal => getSpotAirQuality(spotId, signal),
    enabled, staleTime: 60_000, refetchInterval: 60_000 });
  useDidHide(() => setActive(false));
  useDidShow(() => setActive(true));
  const envelope = query.data?.data.spotId === spotId ? query.data : undefined;
  const view = airQualityState(envelope?.data, selectedAt, Date.now());
  const failed = view.failed || query.isError || Boolean(query.refreshError) || envelope?.dataState === "STALE_USABLE";
  const requestFailed = Boolean(query.isError || query.refreshError || envelope?.dataState === "STALE_USABLE");
  const currentUnavailableByFailure = requestFailed || envelope?.data.current.unavailableReason === "REQUEST_FAILED" || envelope?.data.current.state === "STALE_USABLE";
  const forecastUnavailableByFailure = requestFailed || envelope?.data.forecast.unavailableReason === "REQUEST_FAILED" || envelope?.data.forecast.state === "STALE_USABLE";
  useEffect(() => { onLayoutChange?.(); }, [envelope, failed, query.isPending, selectedAt, onLayoutChange]);
  useEffect(() => {
    if (!failureEpisode.observe({ scope: spotId, active: enabled,
      pending: query.isPending || query.isFetching, failed,
      healthy: Boolean(envelope && !failed) })) return;
    notify({ owner: "air-quality", placement: "floating", tone: "info", title: "空气质量数据异常",
      body: "部分数据暂不可用，可在空气质量中重试。", dedupeKey: spotId });
  }, [enabled, failed, query.isPending, query.isFetching, envelope, notify, spotId, failureEpisode]);
  const retry = () => {
    if (!enabled || query.isFetching) return;
    failureEpisode.retry();
    void query.refetch();
  };
  if (!spotId.startsWith("spot:")) return null;
  const label = (at: string) => `${calendarDateInTimezone(new Date(at), timezone)} ${clockTimeInTimezone(new Date(at), timezone)}`;
  const retrievedAt = view.current ? envelope?.data.current.source.retrievedAt : null;
  const retrievedLabel = retrievedAt ? `${calendarDateInTimezone(new Date(retrievedAt), timezone).slice(5).replace("-", "月")}日${clockTimeInTimezone(new Date(retrievedAt), timezone)}` : null;
  const currentExpired = envelope?.data.current.state === "EXPIRED";
  const forecastExpired = envelope?.data.forecast.state === "EXPIRED";
  return <View {...(id ? { id } : {})} className={`spot-panel__evidence-group air-quality${id ? " panel-reading-anchor" : ""}`} data-control="spot-air-quality">
    <Text className="type-label air-quality__heading">空气质量</Text>
    {query.isError && !envelope ? <StatusPanel state="ERROR" detail="空气质量暂时无法获取，其他地点信息仍可查看。" recoveryLabel="重试空气质量" onRecover={retry} /> : <>
    <View className="air-quality__segment-heading"><Text className="type-secondary">当前区域参考{retrievedLabel ? ` · 获取于${retrievedLabel}` : ""}</Text></View>
    {query.isPending ? <StatusPanel state="LOADING" detail="正在加载空气质量" />
      : view.current ? <Reading value={view.current} /> : currentUnavailableByFailure
        ? <StatusPanel state="ERROR" detail={currentExpired ? "当前区域参考已过期，更新暂未成功。" : "当前区域参考读数暂未获取；可在本节重试。"} />
        : <View role="status" aria-live="polite"><Text className="type-body air-quality__unavailable">{currentExpired ? "当前区域参考已过期" : "当前区域暂无数据"}</Text></View>}
    {view.current && currentUnavailableByFailure ? <Text className="type-caption">更新失败，保留有效区域参考</Text> : null}
    <View className="air-quality__segment-heading"><Text className="type-secondary">所选时刻预报 · {label(selectedAt)}</Text></View>
    {view.forecast ? <View><Text className="type-caption">对应小时：{label(view.forecast.at)}</Text><Reading value={view.forecast} /></View>
      : query.isPending ? null : forecastUnavailableByFailure
        ? <StatusPanel state="ERROR" detail={forecastExpired ? "空气质量预报已过期，更新暂未成功。" : "所选时刻的空气质量预报暂未获取；可在本节重试。"} />
        : <View role="status" aria-live="polite"><Text className="type-body air-quality__unavailable">{forecastExpired ? "空气质量预报已过期" : "该小时暂无空气质量预报"}</Text></View>}
    {view.forecast && forecastUnavailableByFailure ? <Text className="type-caption">更新失败，保留有效小时预报</Text> : null}
    {failed || view.expired || envelope?.dataState === "PARTIAL" || envelope?.dataState === "UNAVAILABLE" ? <SoftButton label="重试空气质量" loading={query.isFetching ? "arc" : false} onClick={retry}>重试</SoftButton> : null}
    {envelope ? <SourceAttribution presentation="credit" sources={[...(view.current ? [envelope.data.current.source] : []), ...(view.forecast ? [envelope.data.forecast.source] : [])]} /> : null}
    </>}
    <SourceEntry key={spotId} id="air-quality-source" label="空气质量范围与来源" sources={envelope ? [envelope.data.current.source, envelope.data.forecast.source] : []}
      sections={[
        ...(view.hours.length ? [{ kind: "forecast" as const, starts: view.hours.map(hour => hour.at), timezone, scope: "air" as const, stale: forecastUnavailableByFailure }] : []),
        { kind: "text", paragraphs: [
          "获取时间不是点位实测时间。不同 AQI 标准保留原值；缺失污染物不补齐。空气质量不等于天文透明度或视宁度。",
          "当前区域参考与所选时刻预报分别取数。小时预报仅适用于其对应小时，当前浓度不会填入未来时刻。",
        ] },
      ]} />
  </View>;
}
