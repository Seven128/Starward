import { Button, Image, Text, View, type ButtonProps, type CommonEvent } from "@tarojs/components";
import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { ObservationPlan, SpotSummary } from "@starward/miniapp-contracts";
import { SemanticIcon } from "@/components/semantic-asset";
import { myPlanTimeLabel, selectPlanEntry } from "./plan-entry";
import "./my-plan-card.scss";
import { useAppStore } from "@/state/app-store";

type PressPoint = { identifier: number; clientX: number; clientY: number };
type PressRect = { left: number; top: number; width: number; height: number };
function singlePress(event: unknown): PressPoint | null {
  if (!event || typeof event !== "object" || !("touches" in event) ||
      !Array.isArray(event.touches) || event.touches.length !== 1) return null;
  const point = event.touches[0];
  return point && typeof point === "object" && [point.identifier, point.clientX, point.clientY].every(Number.isFinite)
    ? { identifier: point.identifier, clientX: point.clientX, clientY: point.clientY } : null;
}
function inside(rect: PressRect, point: PressPoint) {
  return point.clientX >= rect.left && point.clientX <= rect.left + rect.width &&
    point.clientY >= rect.top && point.clientY <= rect.top + rect.height;
}

export function MyPlanCard({ plans, spots, now, loading, unavailable, onOpen, onOpenAll }: {
  plans: readonly ObservationPlan[];
  spots: readonly Pick<SpotSummary, "spotId" | "name">[];
  now: Date;
  loading: boolean;
  unavailable: boolean;
  onOpen(plan: ObservationPlan): void;
  onOpenAll(): void;
}) {
  const { entries, hasMore } = selectPlanEntry(plans, now);
  const rows = entries.map(({ plan, ongoing }) => ({ plan, ongoing,
    name: spots.find(spot => spot.spotId === plan.spotId)?.name,
    time: myPlanTimeLabel(plan, now, ongoing) }));
  const emptyLabel = loading ? "正在读取观星计划" : unavailable ? "计划暂不可用，请重试同步" : "未来24小时暂无观星计划";
  const pressLayout = JSON.stringify([hasMore,
    rows.map(({ plan, ongoing, name, time }) => [plan.planId, ongoing, name, time]), rows.length ? null : emptyLabel]);
  const mode = useAppStore((state) => state.mode);
  const owner = useAppStore((state) => state.accountOwnerId);
  const reset = useAppStore((state) => state.mapResetVersion);
  const largeText = useAppStore((state) => state.preferences.largeText);
  const buttonFeedback: Pick<ButtonProps, "hoverClass" | "hoverStartTime" | "hoverStayTime"> = mode === "DAY"
    ? { hoverClass: "my-plan-card__button--pressed", hoverStartTime: 0, hoverStayTime: 0 } : {};
  const id = `my-plan-press-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [press, setPress] = useState({ x: 50, y: 40, active: false });
  const gesture = useRef<{ origin: PressPoint; latest: PressPoint; rect: PressRect | null } | null>(null);
  const alive = useRef(true), visible = useRef(true);
  const cancel = () => {
    gesture.current = null;
    if (alive.current) setPress(current => current.active ? { ...current, active: false } : current);
  };
  useDidHide(() => { visible.current = false; cancel(); });
  useDidShow(() => { visible.current = true; });
  useLayoutEffect(cancel, [mode, owner, reset, largeText, plans, pressLayout]);
  useEffect(() => {
    alive.current = true;
    Taro.onWindowResize(cancel);
    return () => { alive.current = false; gesture.current = null; Taro.offWindowResize(cancel); };
  }, []);
  const start = (event: CommonEvent) => {
    cancel();
    const point = singlePress(event);
    if (!point || !alive.current || !visible.current || mode !== "DAY") return;
    const current = { origin: point, latest: point, rect: null as PressRect | null };
    gesture.current = current;
    // Query each accepted press: the retained tab and ScrollView may have moved.
    try {
      Taro.createSelectorQuery().select(`#${id}`).boundingClientRect().exec(rows => {
        if (!alive.current || !visible.current || gesture.current !== current) return;
        const rect = rows?.[0] as PressRect | null;
        if (!rect || ![rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) ||
            rect.width <= 0 || rect.height <= 0 || !inside(rect, current.origin) || !inside(rect, current.latest)) {
          cancel(); return;
        }
        current.rect = rect;
        setPress({ x: (current.origin.clientX - rect.left) / rect.width * 100,
          y: (current.origin.clientY - rect.top) / rect.height * 100, active: true });
      });
    } catch { if (gesture.current === current) cancel(); }
  };
  const move = (event: CommonEvent) => {
    const current = gesture.current;
    if (!current) return;
    const point = singlePress(event);
    if (!point || point.identifier !== current.origin.identifier) { cancel(); return; }
    current.latest = point;
    if (current.rect && !inside(current.rect, point)) cancel();
  };
  return <View id={id} className={`liquid-glass-surface my-plan-card${press.active ? " my-plan-card--pressed" : ""}`} role="group" aria-label="观星计划" data-material="liquid-glass"
    onTouchStart={start} onTouchMove={move} onTouchEnd={cancel} onTouchCancel={cancel}>
    <View className="my-plan-card__touch" aria-hidden style={{ "--touch-x": `${press.x}%`, "--touch-y": `${press.y}%` } as CSSProperties} />
    <Button {...buttonFeedback} className="my-plan-card__header focus-ring" onClick={onOpenAll}
      aria-label="打开全部观星计划" data-control="my-plan-entry" data-od-id="my-plan-entry">
      <View className="my-plan-card__title">{mode === "DAY" ? <Image src="/assets/b-icons/plan-suv--day--default.png" className="my-plan-card__suv" mode="aspectFit" aria-hidden /> : <SemanticIcon name="star" className="my-plan-card__suv" />}<Text>观星计划</Text></View>
      <View className="my-plan-card__header-chevron" aria-hidden><SemanticIcon name="plan-header-chevron" /></View>
    </Button>
    {rows.map(({ plan, ongoing, name, time }, index) => <Button {...buttonFeedback} className={`my-plan-card__row focus-ring${index === rows.length - 1 ? " my-plan-card__row--last" : ""}`} key={plan.planId}
      onClick={() => onOpen(plan)} aria-label={`打开${name ?? "观星点"}的计划`}>
      <View className="my-plan-card__dot" aria-hidden="true" />
      <View className="my-plan-card__copy">
        <Text className="my-plan-card__name">{name ?? "点位资料暂不可用"}</Text>
        <View className={`my-plan-card__time${ongoing ? " my-plan-card__time--ongoing" : ""}`}>
          {ongoing ? <Text className="my-plan-card__ongoing">进行中</Text> : null}
          <Text className="my-plan-card__when">{time.when}</Text>
          {!ongoing ? <Text className="my-plan-card__relative">{time.relative}</Text> : null}
        </View>
      </View>
      <SemanticIcon name="plan-row-chevron" />
    </Button>)}
    {!rows.length ? <Text className="my-plan-card__empty">{emptyLabel}</Text> : null}
    {hasMore ? <Button {...buttonFeedback} className="my-plan-card__more focus-ring" onClick={onOpenAll} aria-label="查看其余观星计划">
      {mode === "DAY" ? <SemanticIcon name="more" /> : <><View aria-hidden="true" /><View aria-hidden="true" /><View aria-hidden="true" /></>}
    </Button> : null}
  </View>;
}
