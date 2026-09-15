import { Button, Text, View } from "@tarojs/components";
import { useEffect, useId, useState } from "react";
import { forecastCoverage } from "./forecast-coverage";
import { calendarDateInTimezone, clockTimeInTimezone } from "@/utils/zoned-date";
import "./forecast-coverage-note.scss";

export function ForecastCoverageNote({ starts, timezone, scopeKey, scope = "spot", onExpandedChange }: { starts: readonly string[]; timezone: string; scopeKey: string; scope?: "spot" | "map" | "air"; onExpandedChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => setOpen(false), [scopeKey]);
  useEffect(() => onExpandedChange?.(open), [open, onExpandedChange]);
  const ranges = forecastCoverage(starts);
  const label = (at: string) => {
    const date = new Date(at);
    return `${calendarDateInTimezone(date, timezone).slice(5).replace("-", "/")} ${clockTimeInTimezone(date, timezone)}`;
  };
  return <View className="forecast-coverage">
    <View className="forecast-coverage__heading">
      <Text className="type-caption">{ranges.length ? "可用预报时段" : "暂无数据"}</Text>
      <Button className="forecast-coverage__help focus-ring" aria-label={scope === "air" ? "说明空气质量数据范围" : "说明天气数据范围"} aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(value => !value)}><Text aria-hidden="true">?</Text></Button>
    </View>
    {ranges.map(range => <Text key={range.start} className="forecast-coverage__range type-caption">{label(range.start)}–{label(range.end)}</Text>)}
    {open ? <View id={id} className="forecast-coverage__explanation" role="note">
      <Text className="type-caption">{scope === "map" ? "这里列出当前地图采样点中有云量数据的时段；不同点位的覆盖可能不同，不代表整片区域均有数据。" : scope === "air" ? "这里仅列出本地点当前取得的空气质量预报时段，与普通天气的覆盖范围可能不同。中国地区预报不提供详细污染物，当前浓度不会填入未来时刻。" : "天气仅展示本地点当前取得的小时预报。"}数据范围随地点、发布时间和服务实际返回而变化；未返回及中断的时段不补齐。天文查看和手动计划日期仍可独立使用。</Text>
      <Button className="forecast-coverage__close focus-ring" onClick={() => setOpen(false)} aria-label={scope === "air" ? "关闭空气质量范围说明" : "关闭天气范围说明"}>收起说明</Button>
    </View> : null}
  </View>;
}
