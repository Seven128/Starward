import { Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import { useEffect, useId, useState } from "react";
import { forecastCoverage, mergeForecastIntervals, type ForecastInterval } from "./forecast-coverage";
import { StatusPanel } from "./status-panel";
import { calendarDateInTimezone, clockTimeInTimezone } from "@/utils/zoned-date";
import "./forecast-coverage-note.scss";

export function ForecastCoverageNote({ starts, cloudIntervals, timezone, scopeKey, scope = "spot", stale = false, onExpandedChange }: {
  starts: readonly string[]; cloudIntervals?: readonly ForecastInterval[]; timezone: string; scopeKey: string;
  scope?: "spot" | "map" | "air"; stale?: boolean; onExpandedChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => setOpen(false), [scopeKey]);
  useEffect(() => onExpandedChange?.(open), [open, onExpandedChange]);
  const ranges = forecastCoverage(starts);
  const cloudRanges = cloudIntervals === undefined ? undefined : mergeForecastIntervals(cloudIntervals);
  if (stale && ranges.length === 0 && !cloudRanges?.length) return null;
  const label = (at: string) => {
    const date = new Date(at);
    return `${calendarDateInTimezone(date, timezone).slice(5).replace("-", "/")} ${clockTimeInTimezone(date, timezone)}`;
  };
  return <View className="forecast-coverage">
    <View className="forecast-coverage__heading">
      <Text className="type-caption">{stale ? "上次获取的预报时段" : "可用预报时段"}</Text>
      <Button className="forecast-coverage__help focus-ring" aria-label={scope === "air" ? "说明空气质量数据范围" : "说明天气数据范围"} aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(value => !value)}><Text aria-hidden="true">?</Text></Button>
    </View>
    {cloudRanges?.map(range => <Text key={`cloud:${range.start}`} className="forecast-coverage__range type-caption">{scope === "map" ? "" : "总云量："}{label(range.start)}{range.start === range.end ? "" : `–${label(range.end)}`}</Text>)}
    {cloudRanges && !cloudRanges.length && ranges.length > 0 && scope !== "map" ? <Text className="forecast-coverage__range type-caption">总云量暂无覆盖</Text> : null}
    {ranges.map(range => <Text key={range.start} className="forecast-coverage__range type-caption">{cloudRanges && scope !== "map" ? "其他天气：" : ""}{label(range.start)}–{label(range.end)}</Text>)}
    {cloudRanges?.length && !ranges.length && scope !== "map" ? <Text className="forecast-coverage__range type-caption">其他天气暂无覆盖</Text> : null}
    {!ranges.length && !cloudRanges?.length && !stale ? <StatusPanel state="EMPTY" emptyLevel="section" title="暂无可用预报时段"
      detail={scope === "map" ? "当前地图采样点未返回可用云量预报；移动地图或选择其他日期可重新查看。" : scope === "air" ? "本地点暂未返回空气质量小时预报；当前区域若有读数，会在上方单独显示。" : cloudRanges ? "本地点在所选时段暂无有效云量及其他天气预报；天文资料仍可独立查看。" : "本地点在所选时段未返回小时天气预报；天文资料仍可独立查看。"} /> : null}
    {open ? <View id={id} className="forecast-coverage__explanation" role="note">
      <Text className="type-caption">{scope === "map" ? "这里列出当前地图采样点中有云量数据的时段；不同点位的覆盖可能不同，不代表整片区域均有数据。" : scope === "air" ? "这里仅列出本地点当前取得的空气质量预报时段，与普通天气的覆盖范围可能不同。中国地区预报不提供详细污染物，当前浓度不会填入未来时刻。" : cloudRanges ? "总云量与其他天气分别列出覆盖范围；云量可在同一起报批次的相邻有效时次间插值，其他天气仅使用实际返回的对应小时。" : "天气仅展示本地点当前取得的小时预报。"}{cloudRanges && scope === "map" ? "云量仅在同一起报批次的相邻有效时次间插值，单个有效时刻不延长为一小时。" : ""}数据范围随地点、发布时间和服务实际返回而变化；未返回及中断的时段不补齐。天文查看和手动计划日期仍可独立使用。</Text>
      <Button className="forecast-coverage__close focus-ring" onClick={() => setOpen(false)} aria-label={scope === "air" ? "关闭空气质量范围说明" : "关闭天气范围说明"}>收起说明</Button>
    </View> : null}
  </View>;
}
