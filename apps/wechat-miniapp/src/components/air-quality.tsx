import { Text, View } from "@tarojs/components";
import { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useState } from "react";
import type { AirQualitySnapshot } from "@starward/miniapp-contracts";
import { useAirQualityQuery } from "@/hooks/use-forecast-query";
import { getSpotAirQuality } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { calendarDateInTimezone, clockTimeInTimezone } from "@/utils/zoned-date";
import { ForecastCoverageNote } from "./forecast-coverage-note";
import { Provenance } from "./provenance";
import { SoftButton } from "./soft-button";
import { StatusPanel } from "./status-panel";
import { airQualityState } from "./air-quality-state";

function Reading({ value }: { value: AirQualitySnapshot }) {
  return <View className="spot-panel__metric-grid">
    {value.indexes.map(index => <View className="spot-panel__metric" key={index.code}>
      <Text className="type-secondary">{index.name}</Text>
      <Text className="type-data">{index.display}{index.category ? ` · ${index.category}` : ""}</Text>
      {index.primaryPollutant ? <Text className="type-caption">首要污染物：{index.primaryPollutant}</Text> : null}
    </View>)}
    {value.pollutants.map(item => <View className="spot-panel__metric" key={item.code}>
      <Text className="type-secondary">{item.name}</Text><Text className="type-data">{item.value} {item.unit}</Text>
    </View>)}
  </View>;
}

export function AirQuality({ spotId, selectedAt, timezone, visible = true }: { spotId: string; selectedAt: string; timezone: string; visible?: boolean }) {
  const [active, setActive] = useState(true);
  const notify = useAppStore(state => state.notify);
  const enabled = active && visible && spotId.startsWith("spot:");
  const query = useAirQualityQuery({ queryKey: ["spot-air-quality", spotId], queryFn: signal => getSpotAirQuality(spotId, signal),
    enabled, staleTime: 60_000, refetchInterval: 60_000 });
  useDidHide(() => setActive(false));
  useDidShow(() => setActive(true));
  const envelope = query.data?.data.spotId === spotId ? query.data : undefined;
  const view = airQualityState(envelope?.data, selectedAt, Date.now());
  const failed = view.failed || query.isError || Boolean(query.refreshError) || envelope?.dataState === "STALE_USABLE";
  useEffect(() => {
    if (enabled && failed) notify({ owner: "air-quality", placement: "floating", tone: "info", title: "空气质量数据异常",
      body: "部分数据暂不可用，可在空气质量中重试。", dedupeKey: spotId });
  }, [enabled, failed, notify, spotId]);
  if (!spotId.startsWith("spot:")) return null;
  const label = (at: string) => `${calendarDateInTimezone(new Date(at), timezone)} ${clockTimeInTimezone(new Date(at), timezone)}`;
  return <View className="spot-panel__evidence-group" data-control="spot-air-quality">
    <Text className="type-label">空气质量</Text>
    <Text className="type-secondary">当前区域参考</Text>
    {query.isPending ? <View role="status"><Text className="type-caption">正在加载空气质量…</Text></View>
      : view.current ? <Reading value={view.current} /> : <StatusPanel state="EMPTY" detail="当前空气质量暂无可用数据。" />}
    {view.current && envelope?.data.current.source.retrievedAt ? <Text className="type-caption">获取于 {label(envelope.data.current.source.retrievedAt)}，不是点位实测时间</Text> : null}
    <Text className="type-secondary">所选时刻的空气质量预报</Text>
    {view.forecast ? <View><Text className="type-caption">对应小时：{label(view.forecast.at)}</Text><Reading value={view.forecast} /></View>
      : query.isPending ? null : <StatusPanel state="EMPTY" detail="所选时刻暂无空气质量预报。" />}
    <ForecastCoverageNote starts={view.hours.map(hour => hour.at)} timezone={timezone} scopeKey={`${spotId}:${selectedAt}`} scope="air" />
    <Text className="type-caption">不同 AQI 标准保留原值；缺失污染物不补齐。空气质量不等于天文透明度或视宁度。</Text>
    {envelope ? [envelope.data.current.source, envelope.data.forecast.source].map(source => <Provenance key={source.id} source={source} />) : null}
    {failed || view.expired || envelope?.dataState === "PARTIAL" || envelope?.dataState === "UNAVAILABLE" ? <SoftButton label="重试空气质量" onClick={() => void query.refetch()}>重试</SoftButton> : null}
  </View>;
}
