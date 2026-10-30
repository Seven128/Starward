import { Text, View, type ITouchEvent } from "@tarojs/components";
import Taro, { useResize } from "@tarojs/taro";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAstronomicalEventCatalog } from "@/hooks/use-astronomical-event-catalog";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { nativeNavigationInsets } from "@/theme/native-metrics";
import { SharedButton as Button } from "./shared-button-press";
import { SemanticIcon } from "./semantic-asset";
import { EVENT_BANNER_INTERVAL_MS, eventBannerCaption, initialBannerIndex, orderedBannerEvents } from "./astronomical-event-banner-model";
import { createEventBannerMotion, type EventBannerMotion } from "./astronomical-event-banner-motion";
import "./astronomical-event-banner.scss";

type Props = { visible: boolean; localDate: string; onOpen: (month?: string) => void; onHeight?: (height: number) => void };

/** Removing the foreground consumer also retires its query subscription, autoplay and transition. */
export function AstronomicalEventBanner({ visible, ...props }: Props) {
  return visible ? <VisibleEventBanner {...props} /> : null;
}

function VisibleEventBanner({ localDate, onOpen, onHeight }: Omit<Props, "visible">) {
  const catalog = useAstronomicalEventCatalog(true);
  const reducedMotion = useReducedMotion();
  const [touching, setTouching] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  useResize(() => setLayoutVersion(value => value + 1));
  const touch = useRef<{ identifier: number; x: number; y: number; endX: number; endY: number;
    moved: boolean; active: boolean; cancelled: boolean } | null>(null);
  const { safeTop } = nativeNavigationInsets();
  const usable = catalog.data?.dataState !== "UNAVAILABLE";
  const events = useMemo(() => orderedBannerEvents(usable ? catalog.data?.data.events ?? [] : []), [usable, catalog.data?.data.events]);
  const ids = events.map(event => event.occurrenceId), identity = ids.join("\u0000");
  const initialId = events[initialBannerIndex(events, localDate)]?.occurrenceId ?? null;
  const [motion, setMotion] = useState<EventBannerMotion>({ occurrenceId: initialId, phase: "idle", direction: 1 });
  const owner = useRef<ReturnType<typeof createEventBannerMotion> | null>(null);
  if (!owner.current) owner.current = createEventBannerMotion(ids, initialId, setMotion);
  const controller = owner.current;
  useEffect(() => { controller.replace(ids, initialId); }, [identity, initialId]);
  useEffect(() => {
    if (touching || reducedMotion || events.length < 2) return;
    const timer = setInterval(() => { if (!touch.current?.active) controller.advance(1); }, EVENT_BANNER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [identity, touching, reducedMotion]);
  useEffect(() => { if (reducedMotion) controller.settle(); }, [reducedMotion]);
  useEffect(() => () => controller.dispose(), []);
  const selectedIndex = events.findIndex(event => event.occurrenceId === motion.occurrenceId);
  const current = selectedIndex >= 0 ? selectedIndex : initialBannerIndex(events, localDate);
  const selected = events[current];
  const failed = catalog.isError || Boolean(catalog.refreshError) || catalog.data?.dataState === "STALE_USABLE" || !usable;
  useEffect(() => {
    if (!onHeight) return;
    let current = true;
    // One actual layout read when copy/geometry changes. The receipt, not
    // nextTick itself, keeps long titles clear of the bounded viewport list.
    Taro.nextTick(() => {
      if (!current) return;
      Taro.createSelectorQuery().select("#map-event-banner").boundingClientRect().exec(results => {
        const height = (results?.[0] as { height?: number } | null)?.height;
        if (current && typeof height === "number" && Number.isFinite(height) && height >= 70) onHeight(height);
      });
    });
    return () => { current = false; };
  }, [onHeight, selected?.displayName, selected?.peakDate, localDate, failed, events.length, layoutVersion]);
  const stop = (event: ITouchEvent) => event.stopPropagation();
  const start = (event: ITouchEvent) => {
    stop(event);
    const point = event.touches[0];
    const cancelled = event.touches.length !== 1;
    touch.current = point ? { identifier: point.identifier, x: point.clientX, y: point.clientY,
      endX: point.clientX, endY: point.clientY, moved: cancelled, active: true, cancelled } : null;
    setTouching(event.touches.length > 0);
  };
  const cancel = (event: ITouchEvent) => {
    stop(event);
    const active = event.touches.length > 0;
    if (touch.current) { touch.current.cancelled = true; touch.current.moved = true; touch.current.active = active; }
    setTouching(active);
  };
  const move = (event: ITouchEvent) => {
    stop(event);
    const initial = touch.current;
    const point = event.touches.find(value => value.identifier === initial?.identifier);
    if (event.touches.length !== 1 || !point) { cancel(event); return; }
    if (initial && !initial.cancelled) {
      initial.endX = point.clientX; initial.endY = point.clientY;
      if (Math.hypot(point.clientX - initial.x, point.clientY - initial.y) > 8) initial.moved = true;
    }
  };
  const end = (event: ITouchEvent) => {
    stop(event);
    if (event.touches.length > 0) { cancel(event); return; }
    setTouching(false);
    const initial = touch.current;
    if (!initial) return;
    initial.active = false;
    const point = event.changedTouches?.find(value => value.identifier === initial.identifier);
    if (initial.cancelled || !point) { initial.moved = true; return; }
    initial.endX = point.clientX; initial.endY = point.clientY;
    if (Math.hypot(point.clientX - initial.x, point.clientY - initial.y) > 8) initial.moved = true;
    const dx = initial.endX - initial.x, dy = initial.endY - initial.y;
    if (Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy)) controller.advance(dx < 0 ? 1 : -1, reducedMotion);
  };
  const open = () => { if (!touch.current?.moved && !touch.current?.active) onOpen(selected?.peakDate.slice(0, 7)); };
  return <Button id="map-event-banner" className="event-banner" data-control="map-astronomical-event-banner" ariaLabel="浏览天文事件" onClick={event => { event.stopPropagation(); open(); }}
    style={(safeTop === undefined ? {} : { "--event-banner-top": `${safeTop + 72}px` }) as CSSProperties}
    onTouchStart={start} onTouchMove={move} onTouchEnd={end}
    onTouchCancel={cancel}>
    <View className="event-banner__open">
      <SemanticIcon name={selected?.kind === "SOLAR_ECLIPSE" ? "sun" : selected?.kind === "LUNAR_ECLIPSE" ? "moon" : "meteor"} />
    </View>
    <View className="event-banner__body">
      {selected ? <View className={`event-banner__copy event-banner__copy--${motion.phase}`}
        style={{ transform: `translateX(${motion.phase === "out" ? -motion.direction * 28 : motion.phase === "in-start" ? motion.direction * 28 : 0}px)` }}>
        <Text className="event-banner__title">{selected.displayName}</Text>
        <Text className="event-banner__date">{eventBannerCaption(selected, localDate)}</Text>
      </View> : <View className="event-banner__copy">
        <Text className="event-banner__title">天文事件</Text><Text className="event-banner__date">{failed ? "目录暂不可用，点击查看" : catalog.isPending ? "正在读取事件目录" : "当前目录暂无事件"}</Text>
      </View>}
      {failed && events.length ? <Text className="event-banner__retained">资料待更新</Text> :
        <View className="event-banner__dots">{events.map((event, index) => <View key={event.occurrenceId} className={index === current ? "is-current" : ""} />)}</View>}
    </View>
    <View className="event-banner__chevron"><SemanticIcon name="chevron-right" /></View>
  </Button>;
}
