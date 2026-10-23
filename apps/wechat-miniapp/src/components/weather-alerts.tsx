import { Text, View } from "@tarojs/components";
import { SharedButton as Button } from "./shared-button-press";
import { useEffect, useState } from "react";
import type { WeatherEvidenceSummary } from "@starward/miniapp-contracts";
import { useWeatherAlertClock } from "./use-weather-alert-clock";
import { useAppStore } from "@/state/app-store";
import { calendarDateInTimezone, clockTimeInTimezone } from "@/utils/zoned-date";
import { weatherAlertState } from "./weather-alert-state";
import { StatusPanel } from "./status-panel";
import { SourceAttribution } from "./source-attribution";
import { SourceEntry } from "./source-entry";
import { SemanticIcon } from "./semantic-asset";

export function WeatherAlerts({ evidence, timezone, active, scopeKey, compact = false, refreshFailed = false, refreshing = false, reportHandlesFailure = false, onRecover, onContentChange }: {
  evidence: WeatherEvidenceSummary | undefined;
  timezone: string;
  active: boolean;
  scopeKey: string;
  /** Map's adopted fact summary; other consumers retain their full warning presentation. */
  compact?: boolean;
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
  const [expandedWarnings, setExpandedWarnings] = useState<readonly string[]>([]);
  // Reading a source hides this page; returning keeps the same warning reading.
  useEffect(() => setExpandedWarnings([]), [scopeKey]);
  const visibleAlertIds = view.alerts.map(alert => alert.id).join("\0");
  const expandedWarningIds = expandedWarnings.join("\0");
  useEffect(() => { onContentChange?.(); }, [evidence, view.failed, visibleAlertIds, refreshing, expandedWarningIds, onContentChange]);
  useEffect(() => {
    // The report owner reports transport failure once. A due feed being
    // revalidated is not a failed request; only a settled child failure notifies.
    if (active && view.failed && !refreshing && !refreshFailed && !reportHandlesFailure) notify({ owner: "weather-alerts", placement: "floating", tone: "info",
      title: "官方预警数据异常", body: "暂时无法确认最新预警，可在预警区域重试。", dedupeKey: scopeKey });
  }, [active, view.failed, refreshing, refreshFailed, reportHandlesFailure, notify, scopeKey]);
  if (!evidence || (!view.failed && !view.alerts.length)) return null;
  const label = (at: string) => Number.isFinite(Date.parse(at))
    ? `${calendarDateInTimezone(new Date(at), timezone)} ${clockTimeInTimezone(new Date(at), timezone)}` : "时间暂无数据";
  return <View className={`weather-alerts${compact ? " weather-alerts--compact" : ""}`} data-control="official-weather-alerts">
    {view.failed ? <StatusPanel state={refreshing ? "LOADING" : "ERROR"}
      detail={refreshing ? "正在更新官方预警…" : "官方预警暂未确认最新状态，不能据此判断没有预警。"}
      recoveryLabel={refreshing ? undefined : "重试官方预警"} onRecover={onRecover} /> : null}
    {view.alerts.map(alert => <View className="weather-alerts__item" role="alert" key={alert.id}>
      {compact ? <>
        <View className="weather-alerts__heading">
          <SemanticIcon name="warning" presentation="forecast" />
          <View><Text className="weather-alerts__title">{alert.headline}</Text>
            <Text className="weather-alerts__sender">{alert.senderName || "发布机构未提供"}</Text></View>
        </View>
        <View className="weather-alerts__times">
          {([["发布", label(alert.issuedAt)], ["生效", alert.effectiveAt ? label(alert.effectiveAt) : "来源未提供"],
            ["到期", alert.expiresAt ? label(alert.expiresAt) : "来源未提供"], ["时区", timezone === "Asia/Shanghai" ? "北京时间 UTC+8" : timezone]] as const)
            .map(([name, value]) => <View key={name}><Text>{name}</Text><Text>{value}</Text></View>)}
        </View>
        {alert.instruction?.trim() ? <Text className="weather-alerts__instruction">{alert.instruction}</Text> : null}
        <View className="weather-alerts__details">
          <Button className="weather-alerts__details-toggle focus-ring" ariaLabel="完整预警与防御指引"
            aria-expanded={expandedWarnings.includes(`${scopeKey}:${alert.id}`)} onClick={() => setExpandedWarnings(current => current.includes(`${scopeKey}:${alert.id}`)
              ? current.filter(id => id !== `${scopeKey}:${alert.id}`) : [...current, `${scopeKey}:${alert.id}`])}>
            <Text>完整预警与防御指引</Text><SemanticIcon name={expandedWarnings.includes(`${scopeKey}:${alert.id}`) ? "chevron-up" : "chevron-down"} />
          </Button>
          {expandedWarnings.includes(`${scopeKey}:${alert.id}`) ? <Text className="weather-alerts__description">{alert.description}</Text> : null}
        </View>
        <SourceAttribution presentation="credit" compact sources={evidence.warningSource ? [evidence.warningSource] : []} />
      </> : <>
        <Text className="type-label">{alert.headline}</Text>
        <Text className="type-caption">{alert.description}</Text>
        {alert.instruction ? <Text className="type-caption">{alert.instruction}</Text> : null}
        <Text className="type-caption">发布：{alert.senderName ? `${alert.senderName} · ` : ""}{label(alert.issuedAt)}</Text>
        <Text className="type-caption">生效：{label(alert.effectiveAt ?? alert.issuedAt)} · {alert.expiresAt ? `截至 ${label(alert.expiresAt)}` : "结束时间未提供"}</Text>
      </>}
    </View>)}
    {!compact || !view.alerts.length ? <SourceAttribution presentation="credit" compact={compact} sources={evidence.warningSource ? [evidence.warningSource] : []} /> : null}
    <SourceEntry key={scopeKey} id="weather-warning-source" label="官方预警来源" sources={evidence.warningSource ? [evidence.warningSource] : []} />
  </View>;
}
