import { ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import type { SpotSummary } from "@starward/miniapp-contracts";
import { SharedButton as Button } from "@/components/shared-button-press";
import { SpotIdentityCard } from "@/components/spot-identity-card";
import { StatusPanel } from "@/components/status-panel";
import { createViewportSpotPresentation, viewportSpotPage, viewportSpotPageCount,
  viewportSpotAnimationDelay, type ViewportSpotResult } from "./viewport-spot-list-state";
import "./viewport-spot-list.scss";

export interface ViewportSpotListProps {
  /** Must change with the active Map query/viewport intent, before its reply. */
  requestKey: string;
  result: ViewportSpotResult | null;
  active: boolean;
  reducedMotion: boolean;
  loading: boolean;
  failed: boolean;
  onSelect: (spot: SpotSummary) => void;
  onRetry?: () => void;
}

type TouchPoint = { identifier: number; clientX: number; clientY: number };
type TouchInput = { touches?: readonly TouchPoint[]; changedTouches?: readonly TouchPoint[] };
let nextPresentationId = 0;

/** Four rendered cards share Search's card and Map's accepted result. No
 * parallel search, twenty-card hidden carousel, or historical result cache. */
export function ViewportSpotList({ requestKey, result, active, reducedMotion, loading, failed, onSelect, onRetry }: ViewportSpotListProps) {
  const ownerRef = useRef<ReturnType<typeof createViewportSpotPresentation> | null>(null);
  const presentationId = useRef(0);
  if (!presentationId.current) presentationId.current = ++nextPresentationId;
  if (!ownerRef.current) ownerRef.current = createViewportSpotPresentation();
  const owner = ownerRef.current;
  const state = useSyncExternalStore(owner.subscribe, owner.getSnapshot, owner.getSnapshot);
  const touch = useRef<{ point: TouchPoint; axis: "pending" | "horizontal" | "vertical" } | null>(null);
  const suppressSelection = useRef(false);

  useLayoutEffect(() => {
    owner.configure(requestKey, active, reducedMotion);
    owner.receive(result);
    if (!active) { touch.current = null; suppressSelection.current = false; }
  }, [owner, requestKey, result, active, reducedMotion]);
  useEffect(() => {
    owner.presentationCommitted(state.transition, state.phase);
  }, [owner, state.transition, state.phase]);
  useEffect(() => () => { owner.dispose(); touch.current = null; }, [owner]);

  if (!active) return null;
  const cards = viewportSpotPage(state);
  const showCards = cards.length > 0 && state.phase !== "waiting";
  const pages = viewportSpotPageCount(state.result);
  const current = state.result?.requestKey === requestKey;
  const selectable = current && state.phase === "idle";
  const ready = current && state.phase !== "leaving" && state.phase !== "waiting";
  const status = failed ? "更新失败" : loading || !current ? "更新中" : `${state.result?.total ?? 0} 个`;
  const cancelTouch = () => { touch.current = null; suppressSelection.current = true; };
  const trackTouch = (point: TouchPoint, gesture: NonNullable<typeof touch.current>) => {
    const dx = point.clientX - gesture.point.clientX, dy = point.clientY - gesture.point.clientY;
    if (Math.hypot(dx, dy) > 12) {
      suppressSelection.current = true;
      if (gesture.axis === "pending") gesture.axis = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    return { dx, dy };
  };
  const select = (spotId: string) => {
    if (suppressSelection.current) return;
    const spot = owner.selectedSpot(spotId);
    if (spot) onSelect(spot);
  };

  return <View className="map-viewport-spots" data-control="map-viewport-spots" data-phase={state.phase}
    data-page={state.page + 1} catchMove
    onTouchStart={event => {
      const points = (event as unknown as TouchInput).touches;
      suppressSelection.current = false;
      if (points?.length !== 1) { cancelTouch(); return; }
      touch.current = { point: points[0]!, axis: "pending" };
    }}
    onTouchMove={event => {
      const points = (event as unknown as TouchInput).touches, gesture = touch.current;
      if (!gesture || points?.length !== 1 || points[0]!.identifier !== gesture.point.identifier) { cancelTouch(); return; }
      trackTouch(points[0]!, gesture);
    }}
    onTouchEnd={event => {
      const input = event as unknown as TouchInput, gesture = touch.current;
      touch.current = null;
      if (!gesture || input.touches?.length) { suppressSelection.current = true; return; }
      const end = input.changedTouches?.find(point => point.identifier === gesture.point.identifier);
      if (!end) { suppressSelection.current = true; return; }
      const { dx } = trackTouch(end, gesture);
      if (gesture.axis === "horizontal" && Math.abs(dx) > 35) owner.goToPage(owner.getSnapshot().page + (dx < 0 ? 1 : -1));
    }} onTouchCancel={cancelTouch}>
    <View className="map-viewport-spots__heading">
      <Text>{current || !showCards ? "当前视野" : "上次视野"}</Text>
      {failed && onRetry ? <Button className="map-viewport-spots__retry" onClick={onRetry}>更新失败 · 重试</Button> : <Text>{status}</Text>}
    </View>
    <ScrollView className={`map-viewport-spots__scroller${cards.length ? " map-viewport-spots__scroller--cards" : ""}`}
      key={`${state.result?.requestKey ?? ""}/${state.result?.revision ?? ""}/${state.page}`}
      scrollY={cards.length > 0} enhanced showScrollbar={false}>
    {showCards ? <View className="map-viewport-spots__cards">
      {cards.map((spot, index) => {
        const phase = state.phase;
        const id = `map-viewport-${presentationId.current}-card-${state.transition}-${index}`;
        const animationName = `viewport-spot-${phase}-${state.transition % 2}`;
        const style: CSSProperties = phase === "idle" ? {} : {
          animationName,
          animationDuration: phase === "paging" ? "180ms" : "160ms",
          animationDelay: `${viewportSpotAnimationDelay(phase, index, cards.length)}ms`,
          animationTimingFunction: phase === "leaving" ? "cubic-bezier(.4,0,1,1)" : "cubic-bezier(.2,.7,.2,1)",
          animationFillMode: "both",
          "--viewport-page-from": state.direction > 0 ? "24px" : "-24px",
        } as CSSProperties;
        return <View id={id} className="map-viewport-spots__card" key={spot.spotId} style={style}
          onAnimationStart={event => {
            const name = (event.detail as { animationName?: unknown }).animationName;
            if (event.target.id === id && event.currentTarget.id === id && name === animationName)
              owner.animationStarted(state.transition, phase, index);
          }} onAnimationEnd={event => {
            const name = (event.detail as { animationName?: unknown }).animationName;
            if (event.target.id === id && event.currentTarget.id === id && name === animationName)
              owner.animationEnded(state.transition, phase, index);
          }}>
          <SpotIdentityCard spot={spot} control="map-viewport-spot-card" label={`查看${spot.name}`} disabled={!selectable} onSelect={() => select(spot.spotId)} />
        </View>;
      })}
    </View> : <View className={`map-viewport-spots__state${state.phase === "waiting" ? " map-viewport-spots__state--waiting" : ""}`}>
      <StatusPanel state={failed ? "ERROR" : ready ? "EMPTY" : "LOADING"}
        title={failed ? "观星点未能加载" : "当前视野暂无观星点"}
        detail={failed ? "稍后重试，或移动地图查看其他区域。" : ready ? "移动地图，查看其他区域。" : "正在读取当前视野。"} />
    </View>}
    </ScrollView>
    {pages > 0 ? <View className="map-viewport-spots__pagination" data-control="map-viewport-spot-pagination">
      {Array.from({ length: pages }, (_, page) => <Button key={page}
        className={`map-viewport-spots__page${page === state.page ? " map-viewport-spots__page--current" : ""}`}
        ariaLabel={`第${page + 1}页`} disabled={!current || state.phase !== "idle"}
        onClick={() => { if (!suppressSelection.current) owner.goToPage(page); }}>
        <View className="map-viewport-spots__dot" />
      </Button>)}
    </View> : null}
  </View>;
}
