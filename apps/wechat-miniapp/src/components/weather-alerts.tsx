import { Text, View } from "@tarojs/components";
import { useEffect } from "react";
import type { WeatherEvidenceSummary } from "@starward/miniapp-contracts";
import { useWeatherAlertClock } from "./use-weather-alert-clock";
import { useAppStore } from "@/state/app-store";
import { calendarDateInTimezone, clockTimeInTimezone } from "@/utils/zoned-date";
import { weatherAlertState } from "./weather-alert-state";
import { StatusPanel } from "./status-panel";
import { SourceAttribution } from "./source-attribution";

export function WeatherAlerts({ evidence, timezone, active, scopeKey, refreshFailed = false, refreshing = false, reportHandlesFailure = false, onRecover, onContentChange }: {
  evidence: WeatherEvidenceSummary | undefined;
  timezone: string;
  active: boolean;
  scopeKey: string;
  refreshFailed?: boolean;
  refreshing?: boolean;
  /** Suppress only duplicate feedback, not usable independent warning evidence. */
  reportHandlesFailure?: boolean;
  onRecover: () => void;
  /** A measured parent can respond to local activation/expiry without polling. */
  onContentChange?: () => void;
}) {
  const now = useWeatherAlertClock(evidence, active, onRecover);
  const view = weatherAlertState(evidence, now, refreshFailed);
  const notify = useAppStore(state => state.notify);
  const visibleAlertIds = view.alerts.map(alert => alert.id).join("\0");
  useEffect(() => { onContentChange?.(); }, [evidence, view.failed, visibleAlertIds, refreshing, onContentChange]);
  useEffect(() => {
    // The report owner reports transport failure once. A due feed being
    // revalidated is not a failed request; only a settled child failure notifies.
    if (active && view.failed && !refreshing && !refreshFailed && !reportHandlesFailure) notify({ owner: "weather-alerts", placement: "floating", tone: "info",
      title: "官方预警数据异常", body: "暂时无法确认最新预警，可在预警区域重试。", dedupeKey: scopeKey });
  }, [active, view.failed, refreshing, refreshFailed, reportHandlesFailure, notify, scopeKey]);
  if (!evidence || (!view.failed && !view.alerts.length)) return null;
  const label = (at: string) => Number.isFinite(Date.parse(at))
    ? `${calendarDateInTimezone(new Date(at), timezone)} ${clockTimeInTimezone(new Date(at), timezone)}` : "时间暂无数据";
  return <View className="weather-alerts" data-control="official-weather-alerts">
    {view.failed ? <StatusPanel state={refreshing ? "LOADING" : "ERROR"}
      detail={refreshing ? "正在更新官方预警…" : "官方预警暂未确认最新状态，不能据此判断没有预警。"}
      recoveryLabel={refreshing ? undefined : "重试官方预警"} onRecover={onRecover} /> : null}
    {view.alerts.map(alert => <View className="weather-alerts__item" role="alert" key={alert.id}>
      <Text className="type-label">{alert.headline}</Text>
      <Text className="type-caption">{alert.description}</Text>
      {alert.instruction ? <Text className="type-caption">{alert.instruction}</Text> : null}
      <Text className="type-caption">发布：{alert.senderName ? `${alert.senderName} · ` : ""}{label(alert.issuedAt)}</Text>
      <Text className="type-caption">生效：{label(alert.effectiveAt ?? alert.issuedAt)} · {alert.expiresAt ? `截至 ${label(alert.expiresAt)}` : "结束时间未提供"}</Text>
    </View>)}
    <SourceAttribution sources={evidence.warningSource ? [evidence.warningSource] : []} />
  </View>;
}
