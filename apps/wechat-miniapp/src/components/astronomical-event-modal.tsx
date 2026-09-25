import { isProductSource, productSourceNames } from "@/utils/source-presentation";
import { Button, RootPortal, ScrollView, Text, View } from "@tarojs/components";
import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import type { AstronomicalEventLocalVisibility, AstronomicalEventOccurrence, ObservationContext, SourceSummary } from "@starward/miniapp-contracts";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { eventDatePresentation, eventDayLabel, eventKindLabel, eventPreviewDays, groupEventsByPeakMonth, phaseLabel } from "@/content/event/event-model";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getAstronomicalEvent, getAstronomicalEvents, resolveObservationContext } from "@/services/api-client";
import { eventPreviewContextInput } from "@/services/event-preview-context";
import { useAppStore } from "@/state/app-store";
import { NativeBackBoundary } from "./native-back-boundary";
import { SemanticIcon } from "./semantic-asset";
import { StatusPanel } from "./status-panel";
import { Provenance } from "./provenance";
import { FloatingNotificationHost } from "./notification";
import { calendarDateInTimezone } from "@/utils/zoned-date";

type ModalMode = "browse" | "select-one";
type ModalPhase = "opening" | "open" | "closing";

export interface AstronomicalEventModalHandle {
  /** Keep the native layer until the modal has finished closing. */
  back: () => boolean;
}

export const AstronomicalEventModal = forwardRef<AstronomicalEventModalHandle, {
  open: boolean;
  mode: ModalMode;
  context: ObservationContext | null;
  initialOccurrenceIds?: readonly string[];
  initialDetailId?: string | null;
  onClose: () => void;
  onConfirm?: (occurrenceId: string | null) => void;
  nativeBackBoundary?: boolean;
  portal?: boolean;
  onPresenceChange?: (present: boolean) => void;
}>(function AstronomicalEventModal({
  open, mode, context, initialOccurrenceIds = [], initialDetailId = null, onClose, onConfirm,
  nativeBackBoundary = true, portal = true, onPresenceChange,
}: {
  open: boolean;
  mode: ModalMode;
  context: ObservationContext | null;
  initialOccurrenceIds?: readonly string[];
  initialDetailId?: string | null;
  onClose: () => void;
  onConfirm?: (occurrenceId: string | null) => void;
  nativeBackBoundary?: boolean;
  portal?: boolean;
  onPresenceChange?: (present: boolean) => void;
}, ref) {
  const reducedMotion = useAppStore((state) => state.preferences.reducedMotion);
  const themeClass = useAppStore((state) => `theme-${state.mode.toLowerCase()}`);
  const [pageVisible, setPageVisible] = useState(true);
  useDidHide(() => {
    setPageVisible(false);
    useAppStore.getState().clearNotifications("event-modal");
  });
  useDidShow(() => setPageVisible(true));
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<ModalPhase>("opening");
  const [detailId, setDetailId] = useState<string | null>(initialDetailId);
  const [previewSelection, setPreviewSelection] = useState<{ occurrenceId: string; date: string } | null>(null);
  const [draftSelection, setDraftSelection] = useState<string | null>(
    initialOccurrenceIds.length === 1 ? initialOccurrenceIds[0]! : null,
  );
  const generation = useRef(0);
  const confirming = useRef(false);
  const notify = useAppStore(state => state.notify);
  useEffect(() => { onPresenceChange?.(mounted); }, [mounted, onPresenceChange]);

  useEffect(() => {
    const current = ++generation.current;
    if (open) {
      confirming.current = false;
      setMounted(true);
      setPhase("opening");
      setDetailId(initialDetailId);
      setPreviewSelection(null);
      setDraftSelection(initialOccurrenceIds.length === 1 ? initialOccurrenceIds[0]! : null);
      const timer = setTimeout(() => {
        if (generation.current === current) setPhase("open");
      }, reducedMotion ? 0 : 16);
      return () => clearTimeout(timer);
    }
    if (!mounted) return;
    setPhase("closing");
    const timer = setTimeout(() => {
      if (generation.current !== current) return;
      setMounted(false);
      setDetailId(null);
    }, reducedMotion ? 0 : 180);
    return () => clearTimeout(timer);
  }, [open, reducedMotion]);

  useEffect(() => {
    if (!mounted) return;
    const route = Taro.getCurrentPages().at(-1)?.route;
    if (route !== "pages/map/index") return;
    let active = true;
    void Taro.hideTabBar({ animation: false }).catch(() => undefined);
    return () => {
      if (active) void Taro.showTabBar({ animation: false }).catch(() => undefined);
      active = false;
    };
  }, [mounted]);

  const catalog = useResourceQuery({
    queryKey: ["astronomical-events"], queryFn: getAstronomicalEvents,
    enabled: mounted && pageVisible, staleTime: 6 * 60 * 60 * 1000,
  });
  const catalogDetail = catalog.data?.data.events.find(item => item.occurrenceId === detailId);
  const previewDate = mode === "browse" && previewSelection?.occurrenceId === detailId
    ? previewSelection.date : context?.localDate ?? catalogDetail?.peakDate;
  const eventRecord = useResourceQuery({
    queryKey: ["astronomical-event-record", detailId, catalog.data?.data.catalogVersion],
    queryFn: (signal) => getAstronomicalEvent(detailId!, signal),
    enabled: mounted && pageVisible && Boolean(detailId), staleTime: 60_000,
  });
  const detail = useResourceQuery({
    queryKey: ["astronomical-event-modal-detail", detailId, previewDate, mode, catalog.data?.data.catalogVersion, context?.contextId, context?.contextFingerprint, context?.revision],
    queryFn: async (signal) => {
      if (!context || !previewDate) return getAstronomicalEvent(detailId!, signal);
      const local = await resolveObservationContext(eventPreviewContextInput(context, previewDate), signal);
      return getAstronomicalEvent(detailId!, signal, local.data.contextId);
    },
    enabled: mounted && pageVisible && Boolean(detailId) && Boolean(context && previewDate), staleTime: 60_000,
  });
  const groups = useMemo(() => groupEventsByPeakMonth(catalog.data?.data.events ?? []), [catalog.data?.data.events]);
  const record = eventRecord.data?.data.event.occurrenceId === detailId ? eventRecord.data.data : undefined;
  const selectedDetail = record?.event ?? catalogDetail;
  const matchingGeometry = detail.data?.data.event.occurrenceId === detailId && detail.data.data.catalogVersion === record?.catalogVersion ? detail.data.data.localVisibility : null;
  const versionMismatch = Boolean(record && detail.data && detail.data.data.catalogVersion !== record.catalogVersion);
  useEffect(() => {
    if (pageVisible && mounted && versionMismatch) void Promise.all([eventRecord.refetch(), detail.refetch()]);
  }, [pageVisible, mounted, versionMismatch, detail.data?.data.catalogVersion]);
  const catalogYear = catalog.data?.data.events[0]?.peakDate.slice(0, 4) ?? "2026";
  const catalogFailed = catalog.isError || Boolean(catalog.refreshError) || catalog.data?.dataState === "STALE_USABLE" || catalog.data?.dataState === "UNAVAILABLE";
  const canKeepCatalog = Boolean(catalog.data?.data.events.length) && catalog.data?.dataState !== "UNAVAILABLE";
  const recordFailed = eventRecord.isError || Boolean(eventRecord.refreshError) || eventRecord.data?.dataState === "STALE_USABLE" || eventRecord.data?.dataState === "UNAVAILABLE";
  const geometryFailed = Boolean(context && previewDate) && (detail.isError || Boolean(detail.refreshError) || versionMismatch || detail.data?.dataState === "STALE_USABLE" || detail.data?.dataState === "UNAVAILABLE");
  const detailFailed = recordFailed || geometryFailed;
  useEffect(() => {
    if (!pageVisible || !open || !(detailId ? detailFailed : catalogFailed)) return;
    notify({ owner: "event-modal", placement: "floating", tone: "info", title: "天文事件数据异常",
      body: "部分资料暂未更新，可在弹窗中重试。", dedupeKey: detailId ? `${detailId}:${previewDate}` : "catalog" });
  }, [pageVisible, open, detailId, previewDate, detailFailed, catalogFailed, notify]);
  useEffect(() => {
    if (open) return;
    useAppStore.getState().clearNotifications("event-modal");
  }, [open]);
  useEffect(() => () => useAppStore.getState().clearNotifications("event-modal"), []);

  const requestClose = () => {
    if (phase === "closing") return;
    if (detailId) { setDetailId(null); return; }
    onClose();
  };
  const confirm = () => {
    if (!onConfirm || confirming.current) return;
    confirming.current = true;
    onConfirm(draftSelection);
  };
  useImperativeHandle(ref, () => ({
    back: () => {
      if (!mounted) return false;
      if (phase !== "closing") requestClose();
      return true;
    },
  }), [detailId, mounted, onClose, phase]);

  if (!mounted) return null;

  const surface = <View className={`event-modal ${themeClass} event-modal--${phase}${reducedMotion ? " event-modal--reduced" : ""}`}
      role="dialog" aria-modal="true" ariaLabel={mode === "browse" ? "浏览天文事件" : "选择一个天文事件"}
      catchMove data-control="astronomical-event-modal">
      <FloatingNotificationHost />
      <View className="event-modal__backdrop" onClick={() => { if (phase !== "closing") onClose(); }} />
      <View className="event-modal__shell">
        <View className="event-modal__header">
          {detailId ? <Button className="event-modal__icon-button" ariaLabel="返回事件列表" onClick={() => setDetailId(null)}><SemanticIcon name="arrow-left" /></Button> : <View className="event-modal__icon-spacer" />}
          <Text className="event-modal__title">{detailId ? "天文事件详情" : "天文事件"}</Text>
          <Button className="event-modal__icon-button" ariaLabel="关闭天文事件" onClick={onClose}><SemanticIcon name="close" /></Button>
        </View>
        <View className={`event-modal__pages${detailId ? " event-modal__pages--detail" : ""}`}>
          <ScrollView scrollY enhanced showScrollbar={false} className="event-modal__page event-modal__list" ariaLabel="天文事件列表">
            <View className="event-modal__content">
              {catalog.isPending ? <StatusPanel state="LOADING" detail="正在读取事件目录。" /> : null}
              {catalogFailed ? <StatusPanel state={canKeepCatalog ? "STALE" : "ERROR"} detail={canKeepCatalog ? "目录尚未确认最新状态，以下保留上次资料。" : "事件目录暂不可用。"} recoveryLabel="重试事件目录" onRecover={() => void catalog.refetch()} /> : null}
              {catalog.data?.dataState === "PARTIAL" && !catalogFailed ? <StatusPanel state="PARTIAL" detail="事件目录仅有部分资料，重试可检查是否有新内容。" recoveryLabel="重试事件目录" onRecover={() => void catalog.refetch()} /> : null}
              {catalog.data?.dataState === "FRESH" && !catalogFailed && !catalog.data.data.events.length ? <StatusPanel state="EMPTY" detail="当前目录没有可显示的事件。" recoveryLabel="刷新" onRecover={() => void catalog.refetch()} /> : null}
              {mode === "select-one" && initialOccurrenceIds.length > 1 ? <StatusPanel state="PARTIAL" detail={`此历史计划保留了 ${initialOccurrenceIds.length} 个关联；只有确认新选择或清除时才会改为最多一个。`} /> : null}
              {catalog.data ? <View className="event-modal__catalogue"><Text>{catalogYear} 事件目录</Text><Text>{catalog.data.data.coverage === "ANNUAL_METEOR_REFERENCES_AND_ECLIPSES" ? "常年参考与食事件" : "年度资料"}</Text></View> : null}
              {groups.map((group) => <View key={group.month} className="event-modal__month">
                <View className="event-modal__month-label"><Text>{Number(group.month.slice(5, 7))}月</Text><Text>{group.month.slice(0, 4)}</Text></View>
                {group.events.map((event) => <View key={event.occurrenceId} className={`event-modal__row${mode === "select-one" && draftSelection === event.occurrenceId ? " is-selected" : ""}`}>
                  <Button className="event-modal__row-main" onClick={() => setDetailId(event.occurrenceId)} ariaLabel={`查看${event.displayName}详情`}>
                    <View className="event-modal__date"><Text>{Number(event.peakDate.slice(5, 7))}月</Text><Text>{eventDayLabel(event.peakDate)}</Text><Text>{eventDatePresentation(event).ticket}</Text></View>
                    <View className="event-modal__row-copy"><Text className="event-modal__row-title">{event.displayName}</Text><Text>{eventKindLabel(event)}{mode === "select-one" && draftSelection === event.occurrenceId ? " · 已选" : ""}</Text><Text>{eventDatePresentation(event).range} {event.activeStartDate.slice(5).replace("-", ".")} — {event.activeEndDate.slice(5).replace("-", ".")}</Text></View>
                    <SemanticIcon name="chevron-right" />
                  </Button>
                  {mode === "select-one" ? <Button className={`event-modal__radio${draftSelection === event.occurrenceId ? " is-selected" : ""}`}
                    ariaLabel={`${draftSelection === event.occurrenceId ? "已选择" : "选择"}${event.displayName}`}
                    aria-pressed={draftSelection === event.occurrenceId}
                    onClick={() => setDraftSelection(event.occurrenceId)}><View /></Button> : null}
                </View>)}
              </View>)}
              {catalog.data ? <Text className="event-modal__source">{productSourceNames(catalog.data.data.sources) ? `来源：${productSourceNames(catalog.data.data.sources)}。` : ""}目录日期不等于所在地可见性预报；日食必须使用合格太阳观测防护。</Text> : null}
            </View>
          </ScrollView>
          <ScrollView scrollY enhanced showScrollbar={false} className="event-modal__page event-modal__detail" ariaLabel="天文事件详情">
            <View className="event-modal__content">
              {eventRecord.isPending ? <StatusPanel state="LOADING" detail="正在读取事件资料。" /> : null}
              {recordFailed ? <StatusPanel state={record ? "STALE" : "ERROR"} detail="事件资料暂未更新；可以返回列表或重试。" recoveryLabel="重试事件资料" onRecover={() => void eventRecord.refetch()} /> : null}
              {selectedDetail ? <EventModalDetail event={selectedDetail} visibility={context ? matchingGeometry : record?.localVisibility ?? null} mode={mode}
                locationName={context ? (context.location.kind === "FORMAL_SPOT" ? "已选观星点" : context.location.displayName) : null} pending={Boolean(context && previewDate) && detail.isPending}
                timezone={context?.timezone ?? "Asia/Shanghai"} source={record?.source ?? catalog.data?.data.sources.find(source => source.id === selectedDetail.sourceId)}
                catalogVersion={record?.catalogVersion ?? catalog.data?.data.catalogVersion}
                articleSource={record?.articleSource}
                failed={geometryFailed} onRetry={() => { void eventRecord.refetch(); if (context && previewDate) void detail.refetch(); }}
                previewDate={previewDate ?? selectedDetail.peakDate}
                canPreviewDate={Boolean(context)}
                onPreviewDate={(date) => setPreviewSelection({ occurrenceId: selectedDetail.occurrenceId, date })} /> : null}
              {mode === "select-one" && selectedDetail ? <Button className="event-modal-detail__select" disabled={phase === "closing"}
                onClick={() => { setDraftSelection(selectedDetail.occurrenceId); setDetailId(null); }}>选择此事件</Button> : null}
            </View>
          </ScrollView>
        </View>
        {mode === "select-one" ? <View className="event-modal__footer">
          <Button className="event-modal__clear" disabled={phase === "closing"} onClick={() => setDraftSelection(null)}>清除选择</Button>
          <Button className="event-modal__confirm" disabled={phase === "closing"} onClick={confirm}>{draftSelection ? "确认选择" : "确认不关联"}</Button>
        </View> : null}
      </View>
    </View>;
  return <>
    {nativeBackBoundary ? <NativeBackBoundary active onBack={requestClose} /> : null}
    {portal ? <RootPortal>{surface}</RootPortal> : surface}
  </>;
});

function EventModalDetail({ event, visibility, mode, previewDate, canPreviewDate, onPreviewDate, locationName, pending, timezone, source, articleSource, catalogVersion, failed, onRetry }: {
  event: AstronomicalEventOccurrence;
  visibility: AstronomicalEventLocalVisibility | null;
  mode: ModalMode;
  previewDate: string;
  canPreviewDate?: boolean;
  onPreviewDate: (date: string) => void;
  locationName: string | null;
  pending: boolean;
  timezone: string;
  source?: SourceSummary | undefined;
  articleSource?: SourceSummary | undefined;
  catalogVersion?: string | undefined;
  failed?: boolean;
  onRetry?: () => void;
}) {
  const shortDate = (value: string) => value.slice(5).replace("-", ".");
  const presentation = eventDatePresentation(event);
  const previewDays = useMemo(() => eventPreviewDays(event), [event.activeStartDate, event.activeEndDate]);
  const hasLocalContext = Boolean(locationName || visibility?.locationName);
  const eclipseDate = hasLocalContext && event.kind !== "METEOR_SHOWER" && event.peakAtUtc
    ? visibility?.localDate ?? calendarDateInTimezone(new Date(event.peakAtUtc), timezone) : null;
  return <View className="event-modal-detail">
    <View className="event-modal-detail__hero"><SemanticIcon name={event.kind === "METEOR_SHOWER" ? "meteor" : "moon"} /><View><Text>{eventKindLabel(event)} · {event.peakDate.slice(0, 4)}</Text><Text>{event.displayName}</Text></View></View>
    <View className="event-modal-detail__facts"><View><Text>{presentation.range}</Text><Text>{shortDate(event.activeStartDate)} — {shortDate(event.activeEndDate)}</Text></View><View><Text>{presentation.date}</Text><Text>{shortDate(event.peakDate)}</Text></View></View>
    <Text className="event-modal-detail__precision">{presentation.precision}</Text>
    {event.kind === "SOLAR_ECLIPSE" ? <Text className="event-modal-detail__constraint">日食观测必须使用合格太阳观测防护；普通太阳镜不能保护眼睛。</Text> : null}
    <View className="event-modal-detail__axis"><Text>{shortDate(event.activeStartDate)} 开始</Text><Text>{shortDate(event.peakDate)} {presentation.ticket}</Text><Text>{shortDate(event.activeEndDate)} 结束</Text></View>
    <View className="event-modal-detail__section"><Text className="type-section">当地观测条件</Text>
      <View className="event-modal-detail__context-row"><Text>观星点</Text><Text>{visibility?.locationName ?? locationName ?? "尚未选择地点"}</Text></View>
      <View className="event-modal-detail__context-row"><Text>{eclipseDate ? "事件当地日期" : hasLocalContext ? "观测日期" : presentation.date}</Text><Text>{(eclipseDate ?? previewDate).replaceAll("-", "/")}</Text></View>
      {hasLocalContext ? <Text className="type-caption">以下时刻采用 {visibility?.timezone ?? timezone} 时区。</Text> : null}
      {eclipseDate ? <Text className="type-caption">按这次日月食实际发生时刻计算；{mode === "select-one" ? "计划" : "地图"}日期仍为 {previewDate.replaceAll("-", "/")}，不会随事件改变。</Text> : null}
      {mode === "browse" && event.kind === "METEOR_SHOWER" && canPreviewDate ? <ScrollView scrollX enhanced showScrollbar={false} className="event-modal-detail__days" ariaLabel="弹窗内预览日期">
        <View className="event-modal-detail__day-strip" role="group">
        {previewDays.map((day) => <Button key={day.value} className={previewDate === day.value ? "is-selected" : ""}
          ariaLabel={`${day.value}${day.value === event.peakDate ? `，${presentation.date}` : ""}`}
          aria-pressed={previewDate === day.value} onClick={() => onPreviewDate(day.value)}><Text>{day.weekday}</Text><Text>{day.day}</Text></Button>)}
        </View>
      </ScrollView> : mode === "browse" && event.kind === "METEOR_SHOWER" ? <Text className="type-caption">取得观测位置后可逐夜查看当地条件。</Text> : mode === "select-one" ? <Text className="type-caption">地点和日期沿用当前计划；关联事件不改变计划安排。</Text> : null}
      {failed && visibility && visibility.state !== "UNAVAILABLE" ? <StatusPanel state="STALE" detail="当地条件尚未确认最新状态，以下保留上次结果。" recoveryLabel="重试事件详情" onRecover={onRetry} /> : null}
      {pending ? <StatusPanel state="LOADING" detail="正在计算当地观测条件。" /> : !visibility || visibility.state === "UNAVAILABLE"
        ? <StatusPanel state={failed ? "ERROR" : "PARTIAL"} detail={visibility?.reason ?? (locationName ? "当地观测条件暂不可用。" : "选择地点后可计算当地几何条件。")} recoveryLabel={failed ? "重试事件详情" : undefined} onRecover={onRetry} />
        : <>
          <Text className="type-caption">{visibility.reason}</Text>
          {visibility.state === "AVAILABLE" ? <>
            <View className="event-modal-detail__context-row"><Text>几何观测时段</Text><Text>{visibility.bestWindowStartLocal ?? "暂无数据"} — {visibility.bestWindowEndLocal ?? "暂无数据"}</Text></View>
            <View className="event-modal-detail__context-row"><Text>{event.kind === "SOLAR_ECLIPSE" ? "本地食甚" : "最佳几何时刻"}</Text><Text>{visibility.bestAtLocal ?? "暂无数据"}</Text></View>
            <Text className="type-caption">{visibility.bestAzimuthDeg == null ? "方位暂无数据" : `方位 ${Math.round(visibility.bestAzimuthDeg)}°`} · {visibility.bestAltitudeDeg == null ? "高度暂无数据" : `高度 ${Math.round(visibility.bestAltitudeDeg)}°`}</Text>
            {event.kind === "METEOR_SHOWER" ? <View className="event-modal-detail__context-row"><Text>该时刻月面照明</Text><Text>{visibility.moonIllumination == null ? "暂无数据" : `${Math.round(visibility.moonIllumination * 100)}%`}</Text></View> : null}
          </> : null}
        </>}
      {visibility?.phases?.length ? <View className="event-modal-detail__phases"><Text className="type-section">各食相时刻与高度</Text>{visibility.phases.map(phase => <View key={phase.key} className="event-modal-detail__phase"><Text>{phaseLabel(phase.key)}</Text><View><Text>{phase.localDateTime}</Text><Text>高度 {Math.round(phase.altitudeDeg)}°{phase.altitudeDeg <= 0 ? " · 地平线以下" : ""}</Text></View></View>)}</View> : null}
      {visibility?.constraints?.map((item) => <Text key={item} className="event-modal-detail__constraint">{item}</Text>)}
    </View>
    {event.kind === "METEOR_SHOWER" ? <View className="event-modal-detail__section event-modal-detail__catalogue"><Text className="type-section">数据来源与日期精度</Text>
      <Text className="type-body">{event.nominalPeakZhr === null ? "流量参考：暂无数据" : `参考峰值 ZHR ${event.nominalPeakZhr}`} · {event.velocityKmPerSecond === null ? "速度：暂无数据" : `速度 ${event.velocityKmPerSecond} km/s`}</Text>
      <Text className="type-caption">{event.nominalPeakZhr === null ? "现有资料不提供可用流量值，不能据此估算现场可见数量。" : "ZHR 是理想条件下的目录参考率，不是现场每小时可见数量。"}</Text></View> : null}
    {source && isProductSource(source) ? <View className="event-modal-detail__section"><Text className="type-section">资料来源</Text><Provenance source={source} />{catalogVersion ? <Text className="event-modal-detail__version type-caption">目录版本：{catalogVersion}</Text> : null}</View> : null}
    {event.article ? <View className="event-modal-detail__section event-modal-detail__article"><Text className="type-section">{event.article.title}</Text>
      {event.article.authorName ? <Text className="type-caption">作者：{event.article.authorName}</Text> : null}
      {event.article.publishedTime ? <Text className="type-caption">原文日期：{event.article.publishedTime}</Text> : null}
      {event.article.paragraphs.map((paragraph, index) => <Text key={index} className="type-article" selectable>{paragraph}</Text>)}
      {articleSource && isProductSource(articleSource) ? <Provenance source={articleSource} /> : null}
    </View> : null}
  </View>;
}
