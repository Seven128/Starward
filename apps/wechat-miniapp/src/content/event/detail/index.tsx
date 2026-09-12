import Taro, { useRouter } from "@tarojs/taro";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { CustomNav } from "@/components/custom-nav";
import { FloatingNotificationHost } from "@/components/notification";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { currentDraftUserId, getAstronomicalEvent, resolveObservationContext, restoreObservationContext } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { writePlanEventSelection } from "@/content/plan/detail/plan-event-selection";
import { compassLabel, eclipseKindLabel, eventKindLabel, phaseLabel } from "../event-model";
import { useEffect, useMemo, useState } from "react";
import "./index.scss";

function decode(value: string | undefined) {
  try { return value ? decodeURIComponent(value) : ""; } catch { return ""; }
}

function addDays(localDate: string, amount: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + amount)).toISOString().slice(0, 10);
}

export default function EventDetailPage() {
  const router = useRouter();
  const themeClass = useThemeClass();
  const occurrenceId = decode(router.params.occurrenceId);
  const planId = decode(router.params.planId) || null;
  const returnTarget = decode(router.params.returnTarget) || null;
  const sourceContext = useAppStore(state => state.observationContext);
  const catalogQuery = useResourceQuery({
    queryKey: ["astronomical-event-catalog", occurrenceId],
    queryFn: signal => getAstronomicalEvent(occurrenceId, signal),
    enabled: Boolean(occurrenceId), staleTime: 6 * 60 * 60 * 1000,
  });
  const event = catalogQuery.data?.data.event;
  const [selectedDate, setSelectedDate] = useState("");
  useEffect(() => { if (event && !selectedDate) setSelectedDate(event.peakDate); }, [event, selectedDate]);
  const dates = useMemo(() => {
    if (!event) return [];
    if (event.kind !== "METEOR_SHOWER") return [event.peakDate];
    return [-2, -1, 0, 1, 2].map(offset => addDays(event.peakDate, offset))
      .filter(date => date >= event.activeStartDate && date <= event.activeEndDate);
  }, [event]);
  const contextQuery = useResourceQuery({
    queryKey: ["event-context", occurrenceId, selectedDate, sourceContext?.contextId, sourceContext?.revision],
    queryFn: async signal => {
      if (!event || !sourceContext || !selectedDate) throw new Error("event_context_missing");
      if (sourceContext.localDate === selectedDate && sourceContext.eventInstanceId === event.occurrenceId)
        return restoreObservationContext(sourceContext, signal);
      const timezoneHint: "Asia/Shanghai" | "Asia/Hong_Kong" | null = sourceContext.timezone === "Asia/Shanghai" || sourceContext.timezone === "Asia/Hong_Kong"
        ? sourceContext.timezone : null;
      const location = sourceContext.location.kind === "FORMAL_SPOT"
        ? { kind: "FORMAL_SPOT" as const, spotId: sourceContext.location.spotId }
        : { ...sourceContext.location, ...(timezoneHint ? { timezoneHint } : {}) };
      return resolveObservationContext({
        location, localDate: selectedDate, eventInstanceId: event.occurrenceId,
        targetProfile: event.kind === "METEOR_SHOWER" ? "METEOR" : "DAILY",
      }, signal);
    },
    enabled: Boolean(event && sourceContext && selectedDate), staleTime: 60_000,
  });
  const eventContext = contextQuery.data?.data;
  const projectionQuery = useResourceQuery({
    queryKey: ["astronomical-event-projection", occurrenceId, eventContext?.contextId, eventContext?.revision],
    queryFn: signal => getAstronomicalEvent(occurrenceId, signal, eventContext!.contextId),
    enabled: Boolean(occurrenceId && eventContext), staleTime: 60_000,
  });
  const data = projectionQuery.data?.data ?? catalogQuery.data?.data;
  const visibility = data?.localVisibility;
  const [navigationError, setNavigationError] = useState(false);
  const addToPlan = async () => {
    if (!event) return;
    const owner = currentDraftUserId();
    if (returnTarget && owner && writePlanEventSelection(Taro, owner, { occurrenceId: event.occurrenceId, target: returnTarget })) {
      try { await Taro.navigateBack({ delta: 2 }); } catch { /* one-shot selection remains available */ }
      return;
    }
    try {
      setNavigationError(false);
      await Taro.redirectTo({ url: `/content/plan/edit/index?${planId ? `planId=${encodeURIComponent(planId)}&` : "new=1&"}eventOccurrenceId=${encodeURIComponent(event.occurrenceId)}&eventDate=${encodeURIComponent(selectedDate || event.peakDate)}` });
    } catch { setNavigationError(true); }
  };
  const chooseLocation = async () => {
    if (sourceContext) return;
    try { await Taro.switchTab({ url: "/pages/map/index" }); } catch { setNavigationError(true); }
  };

  return <View className={`${themeClass} event-detail-page`}>
    <FloatingNotificationHost />
    <CustomNav title="天文事件" back backFallbackTab="/pages/my/index" />
    <ScrollView scrollY enhanced showScrollbar={false} className="event-detail-scroll">
      <View className="event-detail-content safe-bottom">
        {catalogQuery.isPending ? <StatusPanel state="LOADING" detail="正在读取事件资料。" /> : null}
        {catalogQuery.isError || !occurrenceId ? <StatusPanel state="ERROR" detail="事件资料暂不可用。" recoveryLabel="重试" onRecover={() => void catalogQuery.refetch()} /> : null}
        {event ? <>
          <View className="event-detail-hero">
            <View><Text className="event-detail-code">{eventKindLabel(event)} / {event.peakDate.slice(0, 4)}</Text><Text className="event-detail-title">{event.displayName}</Text><Text className="event-detail-kind">{event.kind === "METEOR_SHOWER" ? "年度目录事件" : `${eclipseKindLabel(event.eclipseKind)} · 锁定算法计算事件`}</Text></View>
            <View className={event.kind === "METEOR_SHOWER" ? "event-detail-symbol event-detail-symbol--meteor" : `event-detail-symbol event-detail-symbol--${event.kind === "SOLAR_ECLIPSE" ? "solar" : "lunar"}`} aria-hidden="true" />
          </View>
          <View className="event-detail-card">
            <View className="event-detail-date"><Text className="event-detail-label">{event.kind === "METEOR_SHOWER" ? "目录极大日期" : "峰值参考日期"}</Text><Text className="event-detail-date-value">{event.peakDate.slice(5).replace("-", " / ")}</Text></View>
            <View className="event-detail-range"><Text className="event-detail-label">{event.kind === "METEOR_SHOWER" ? "活动期" : "事件类型"}</Text><Text className="event-detail-value">{event.kind === "METEOR_SHOWER" ? `${event.activeStartDate.slice(5)} — ${event.activeEndDate.slice(5)}` : eclipseKindLabel(event.eclipseKind)}</Text><Text className="event-detail-small">{event.peakAtUtc ? `食甚 UTC ${event.peakAtUtc.slice(11, 16)}` : "极大时分尚未提供"}</Text></View>
            <View className="event-detail-axis"><View /><Text>峰值</Text><View className="event-detail-axis-dot" /></View>
          </View>
          <View className="event-detail-section event-local">
            <View className="event-section-head"><Text className="type-section">在这里怎么看</Text><Text className="event-detail-label">地点当地时间</Text></View>
            <View className="event-context-row">
              <Button onClick={() => void chooseLocation()}><Text className="event-context-icon">⌖</Text><Text>{visibility?.locationName ?? (sourceContext ? "正在读取地点" : "选择观测地点")}</Text><Text>⌄</Text></Button>
              <View><Text className="event-context-icon">□</Text><Text>{(selectedDate || event.peakDate).slice(5).replace("-", "月")}日</Text></View>
            </View>
            <View className="event-day-strip" role="group" aria-label="观测日期">
              {dates.map(date => <Button key={date} aria-pressed={date === selectedDate} className={date === selectedDate ? "is-selected" : ""} onClick={() => setSelectedDate(date)}><Text>{["日", "一", "二", "三", "四", "五", "六"][new Date(`${date}T00:00:00Z`).getUTCDay()]}</Text><Text>{date.slice(8)}</Text></Button>)}
            </View>
            <View className={`event-visibility event-visibility--${visibility?.state?.toLowerCase() ?? "unavailable"}`}>
              <View className="event-visibility-art" aria-hidden="true"><View /></View>
              <View><Text className="event-visibility-title">{contextQuery.isPending || projectionQuery.isPending ? "正在计算本地观测条件" : visibility?.state === "AVAILABLE" ? "已计算本地几何条件" : visibility?.state === "NOT_VISIBLE" ? "所选地点没有可见时段" : "本地观测条件待获取"}</Text><Text className="event-visibility-copy">{visibility?.reason ?? "选择地图中的地点后，将计算时段、方向高度与月光影响。"}</Text></View>
            </View>
            {visibility?.state === "AVAILABLE" && visibility.bestAtLocal ? <View className="event-local-metrics">
              <View><Text>最佳几何时刻</Text><Text>{visibility.bestAtLocal}</Text></View>
              <View><Text>方向 / 高度</Text><Text>{compassLabel(visibility.bestAzimuthDeg)} {visibility.bestAzimuthDeg?.toFixed(0)}° / {visibility.bestAltitudeDeg?.toFixed(0)}°</Text></View>
              {visibility.moonIllumination != null ? <View><Text>月面照明</Text><Text>{Math.round(visibility.moonIllumination * 100)}%</Text></View> : null}
            </View> : null}
            {visibility?.phases?.length ? <View className="event-phase-list">{visibility.phases.map(phase => <View key={phase.key}><Text>{phaseLabel(phase.key)}</Text><Text>{phase.localDateTime.slice(5)} · 高度 {phase.altitudeDeg.toFixed(0)}°</Text></View>)}</View> : null}
            {visibility?.constraints?.map(item => <Text key={item} className={event.kind === "SOLAR_ECLIPSE" && item.includes("日食观测镜") ? "event-safety-note" : "event-precision-note"}>{item}</Text>)}
            {!visibility?.constraints?.length ? <Text className="event-precision-note">目录峰值日期不等于这个地点的最佳观测时间。</Text> : null}
          </View>
          {event.kind === "METEOR_SHOWER" ? <View className="event-detail-section event-facts"><Text className="type-section">目录事实</Text><Text className="type-body">参考峰值 ZHR {event.nominalPeakZhr} · 速度 {event.velocityKmPerSecond} km/s</Text><Text className="type-caption">ZHR 是理想条件下的目录参考率，不是现场每小时可见数量。</Text><Text className="type-body">峰值辐射点：赤经 {event.radiantRightAscensionDeg}° · 赤纬 {event.radiantDeclinationDeg}°</Text></View> : null}
          <View className="event-detail-section event-source"><Text className="type-section">来源与数据说明</Text><View><Text className="type-body">{data?.source.provider}</Text><Text className="type-caption">{data?.source.title}</Text></View><Button className="event-source-copy" onClick={() => data && void Taro.setClipboardData({ data: data.source.sourceUrl })}>复制来源链接</Button></View>
          {navigationError ? <StatusPanel state="PARTIAL" detail="目标页面暂未打开；事件资料保持不变，请重试。" /> : null}
        </> : null}
      </View>
    </ScrollView>
    {event ? <View className="event-detail-action"><SoftButton variant="primary" label={planId || returnTarget ? "关联到当前计划" : "加入观星计划"} onClick={() => void addToPlan()}>{planId || returnTarget ? "关联到当前计划" : "加入观星计划"}</SoftButton></View> : null}
  </View>;
}
