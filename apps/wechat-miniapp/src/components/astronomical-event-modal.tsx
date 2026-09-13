import { Button, RootPortal, ScrollView, Text, View } from "@tarojs/components";
import type { AstronomicalEventLocalVisibility, AstronomicalEventOccurrence, ObservationContext } from "@starward/miniapp-contracts";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { eventDayLabel, eventKindLabel, groupEventsByPeakMonth } from "@/content/event/event-model";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { getAstronomicalEvent, getAstronomicalEvents } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { NativeBackBoundary } from "./native-back-boundary";
import { SemanticIcon } from "./semantic-asset";
import { StatusPanel } from "./status-panel";

type ModalMode = "browse" | "select-one";
type ModalPhase = "opening" | "open" | "closing";

export interface AstronomicalEventModalHandle {
  /** Returns true when Back moved from detail to list and still needs a native layer. */
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
}>(function AstronomicalEventModal({
  open, mode, context, initialOccurrenceIds = [], initialDetailId = null, onClose, onConfirm,
  nativeBackBoundary = true, portal = true,
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
}, ref) {
  const reducedMotion = useAppStore((state) => state.preferences.reducedMotion);
  const themeClass = useAppStore((state) => `theme-${state.mode.toLowerCase()}`);
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<ModalPhase>("opening");
  const [detailId, setDetailId] = useState<string | null>(initialDetailId);
  const [draftSelection, setDraftSelection] = useState<string | null>(
    initialOccurrenceIds.length === 1 ? initialOccurrenceIds[0]! : null,
  );
  const generation = useRef(0);
  const confirming = useRef(false);

  useEffect(() => {
    const current = ++generation.current;
    if (open) {
      confirming.current = false;
      setMounted(true);
      setPhase("opening");
      setDetailId(initialDetailId);
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

  const catalog = useResourceQuery({
    queryKey: ["astronomical-events"], queryFn: getAstronomicalEvents,
    enabled: mounted, staleTime: 6 * 60 * 60 * 1000,
  });
  const detail = useResourceQuery({
    queryKey: ["astronomical-event-modal-detail", detailId, context?.contextId, context?.contextFingerprint, context?.revision],
    queryFn: (signal) => getAstronomicalEvent(detailId!, signal, context?.contextId),
    enabled: mounted && Boolean(detailId), staleTime: 60_000,
  });
  const groups = useMemo(() => groupEventsByPeakMonth(catalog.data?.data.events ?? []), [catalog.data?.data.events]);
  const selectedDetail = detail.data?.data.event ?? catalog.data?.data.events.find((item) => item.occurrenceId === detailId);

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
      if (!mounted || phase === "closing") return false;
      const remainsOpen = Boolean(detailId);
      requestClose();
      return remainsOpen;
    },
  }), [detailId, mounted, onClose, phase]);

  if (!mounted) return null;

  const surface = <View className={`event-modal ${themeClass} event-modal--${phase}${reducedMotion ? " event-modal--reduced" : ""}`}
      role="dialog" aria-modal="true" ariaLabel={mode === "browse" ? "浏览天文事件" : "选择一个天文事件"}
      catchMove data-control="astronomical-event-modal">
      <View className="event-modal__backdrop" onClick={requestClose} />
      <View className="event-modal__shell">
        <View className="event-modal__header">
          {detailId ? <Button className="event-modal__icon-button" ariaLabel="返回事件列表" onClick={() => setDetailId(null)}><SemanticIcon name="arrow-left" /></Button> : <View className="event-modal__icon-spacer" />}
          <View><Text className="event-modal__kicker">2026 · 天象日历</Text><Text className="event-modal__title">{detailId ? selectedDetail?.displayName ?? "事件详情" : mode === "browse" ? "抬头见" : "选择一个事件"}</Text></View>
          <Button className="event-modal__icon-button" ariaLabel="关闭天文事件" onClick={onClose}><SemanticIcon name="close" /></Button>
        </View>
        <View className={`event-modal__pages${detailId ? " event-modal__pages--detail" : ""}`}>
          <ScrollView scrollY enhanced showScrollbar={false} className="event-modal__page event-modal__list" ariaLabel="天文事件列表">
            <View className="event-modal__content">
              {catalog.isPending ? <StatusPanel state="LOADING" detail="正在读取事件目录。" /> : null}
              {catalog.isError ? <StatusPanel state="ERROR" detail="事件目录暂不可用。" recoveryLabel="重试" onRecover={() => void catalog.refetch()} /> : null}
              {catalog.data && !catalog.data.data.events.length ? <StatusPanel state="EMPTY" detail="当前目录没有可显示的事件。" recoveryLabel="刷新" onRecover={() => void catalog.refetch()} /> : null}
              {mode === "select-one" && initialOccurrenceIds.length > 1 ? <StatusPanel state="PARTIAL" detail={`此历史计划保留了 ${initialOccurrenceIds.length} 个关联；只有确认新选择或清除时才会改为最多一个。`} /> : null}
              {groups.map((group) => <View key={group.month} className="event-modal__month">
                <Text className="event-modal__month-label">{group.label}</Text>
                {group.events.map((event) => <View key={event.occurrenceId} className="event-modal__row">
                  {mode === "select-one" ? <Button className={`event-modal__radio${draftSelection === event.occurrenceId ? " is-selected" : ""}`}
                    ariaLabel={`${draftSelection === event.occurrenceId ? "已选择" : "选择"}${event.displayName}`}
                    aria-pressed={draftSelection === event.occurrenceId}
                    onClick={() => setDraftSelection(event.occurrenceId)}><View /></Button> : null}
                  <Button className="event-modal__row-main" onClick={() => setDetailId(event.occurrenceId)} ariaLabel={`查看${event.displayName}详情`}>
                    <View className="event-modal__date"><Text>{eventDayLabel(event.peakDate)}</Text><Text>峰值</Text></View>
                    <View className="event-modal__row-copy"><Text className="event-modal__row-title">{event.displayName}</Text><Text>{eventKindLabel(event)}</Text><Text>{event.activeStartDate.slice(5)} — {event.activeEndDate.slice(5)}</Text></View>
                    <SemanticIcon name={event.kind === "METEOR_SHOWER" ? "star" : "moon"} />
                  </Button>
                </View>)}
              </View>)}
              {catalog.data ? <Text className="event-modal__source">来源：{catalog.data.data.sources.map((source) => source.provider).join(" · ")}。目录日期不等于所在地可见性预报；日食必须使用合格太阳观测防护。</Text> : null}
            </View>
          </ScrollView>
          <ScrollView scrollY enhanced showScrollbar={false} className="event-modal__page event-modal__detail" ariaLabel="天文事件详情">
            <View className="event-modal__content">
              {detail.isPending ? <StatusPanel state="LOADING" detail="正在读取当地事件资料。" /> : null}
              {detail.isError ? <StatusPanel state="ERROR" detail="事件详情暂不可用；可以返回列表或重试。" recoveryLabel="重试" onRecover={() => void detail.refetch()} /> : null}
              {selectedDetail ? <EventModalDetail event={selectedDetail} visibility={detail.data?.data.localVisibility ?? null} /> : null}
            </View>
          </ScrollView>
        </View>
        {mode === "select-one" ? <View className="event-modal__footer">
          <Button disabled={phase === "closing"} onClick={() => setDraftSelection(null)}>清除</Button>
          <Button className="event-modal__confirm" disabled={phase === "closing"} onClick={confirm}>确认选择</Button>
        </View> : null}
      </View>
    </View>;
  return <>
    {nativeBackBoundary ? <NativeBackBoundary active onBack={requestClose} /> : null}
    {portal ? <RootPortal>{surface}</RootPortal> : surface}
  </>;
});

function EventModalDetail({ event, visibility }: {
  event: AstronomicalEventOccurrence;
  visibility: AstronomicalEventLocalVisibility | null;
}) {
  return <View className="event-modal-detail">
    <View className="event-modal-detail__hero"><SemanticIcon name={event.kind === "METEOR_SHOWER" ? "meteor" : "moon"} /><View><Text>{eventKindLabel(event)}</Text><Text>{event.displayName}</Text></View></View>
    <View className="event-modal-detail__facts"><View><Text>峰值参考</Text><Text>{event.peakDate}</Text></View><View><Text>活动期</Text><Text>{event.activeStartDate} — {event.activeEndDate}</Text></View></View>
    <View className="event-modal-detail__section"><Text className="type-section">在这里怎么看</Text>
      <Text className="type-body">{visibility?.locationName ?? "当前没有可用于投影的地点"}</Text>
      <Text className="type-caption">{visibility?.state === "AVAILABLE" ? `${visibility.bestAtLocal ?? "时刻待定"}${visibility.bestAzimuthDeg == null ? "" : ` · 方位 ${Math.round(visibility.bestAzimuthDeg)}°`}${visibility.bestAltitudeDeg == null ? "" : ` · 高度 ${Math.round(visibility.bestAltitudeDeg)}°`}` : visibility?.reason ?? "选择地图地点后可计算当地几何条件。"}</Text>
      {visibility?.constraints?.map((item) => <Text key={item} className="event-modal-detail__constraint">{item}</Text>)}
    </View>
    {event.kind === "METEOR_SHOWER" ? <View className="event-modal-detail__section"><Text className="type-section">目录事实</Text><Text className="type-body">参考峰值 ZHR {event.nominalPeakZhr} · 速度 {event.velocityKmPerSecond} km/s</Text><Text className="type-caption">ZHR 是理想条件下的目录参考率，不是现场每小时可见数量。</Text></View> : null}
  </View>;
}
