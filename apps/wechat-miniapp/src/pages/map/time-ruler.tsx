import { createRulerScrollPosition } from "@/components/ruler-scroll-position";
import { createScrollSettlement } from "@/components/scroll-settlement";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { MapSceneTimeFrame } from "@starward/miniapp-contracts";
import { nearestMapTimeFrameIndex } from "./map-time-frame";
import { useDidHide, useDidShow } from "@tarojs/taro";
import type { MoonPhaseKey } from "@starward/miniapp-contracts";
import { MoonPhaseImage, moonPhaseLabel } from "@/components/moon-phase";
import { calendarDateInTimezone, clockTimeInTimezone } from "@/utils/zoned-date";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

function formatTime(value: string, timezone: string, compact = false) {
  try {
    const instant = new Date(value);
    const clock = clockTimeInTimezone(instant, timezone);
    if (compact) return clock;
    const date = calendarDateInTimezone(instant, timezone);
    return `${date.slice(5, 7)}/${date.slice(8, 10)} ${clock}`;
  } catch {
    return "时间暂无数据";
  }
}

// The adopted shared ruler uses a 66px visual cadence. This is wider than
// the 44px minimum hit target and leaves five primary slices visible at 390px.
const RULER_STEP = 66;

function rulerPosition(distance: number) {
  const d = Math.abs(distance);
  return {
    opacity: Math.max(.25, 1 - d * .22),
    offset: Math.min(12, d * d * 3),
  };
}

/**
 * The map analysis time owner. It is deliberately a horizontal enhanced
 * ScrollView: native map panning remains map-owned and the time axis owns
 * only horizontal slices. Each slice is also a keyboard/assistive equivalent
 * of the gesture.
 */
export function MapTimeRuler({
  frames,
  selectedAt,
  timezone,
  disabled,
  emptyMessage,
  onPreview,
  onCommit,
  onCancel,
  moonPhases,
  nightLabel,
  control = "map-time-control",
}: {
  frames: readonly MapSceneTimeFrame[];
  selectedAt: string;
  timezone: string;
  disabled: boolean;
  emptyMessage: string;
  onPreview: (index: number) => void;
  onCommit: (index: number) => void;
  onCancel: () => void;
  moonPhases?: readonly (MoonPhaseKey | null)[];
  nightLabel?: string | undefined;
  control?: "map-time-control" | "sky-time-scrubber";
}) {
  const initialIndex = frames.length
    ? nearestMapTimeFrameIndex(frames, selectedAt)
    : 0;
  const [index, setIndex] = useState(initialIndex);
  const [presented, setPresented] = useState(initialIndex);
  const [scrollLeft, setScrollLeft] = useState(initialIndex * RULER_STEP);
  const liveLeft = useRef(initialIndex * RULER_STEP);
  const userScrolled = useRef(false);
  const target = useRef<{ at: string; from: string; frames: string } | null>(null);
  const reducedMotion = useReducedMotion();
  const settleCallback = useRef<(offset: number) => void>(() => {});
  const settlementRef = useRef<ReturnType<typeof createScrollSettlement> | null>(null);
  if (!settlementRef.current) settlementRef.current = createScrollSettlement(offset => settleCallback.current(offset));
  const settlement = settlementRef.current;
  const nativePosition = useRef(createRulerScrollPosition(`${control}-scroll`)).current;
  const cancelCallback = useRef(onCancel);
  cancelCallback.current = onCancel;
  const frameIdentity = frames.map((frame) => frame.atUtc).join("|");

  const cancelInteraction = () => {
    const pending = settlement.active;
    settlement.cancel();
    target.current = null;
    setIndex(initialIndex);
    setPresented(initialIndex);
    liveLeft.current = initialIndex * RULER_STEP;
    setScrollLeft(initialIndex * RULER_STEP);
    nativePosition.move(initialIndex * RULER_STEP);
    if (pending) cancelCallback.current();
  };
  useDidHide(() => { cancelInteraction(); nativePosition.cancel(); });
  useDidShow(() => nativePosition.move(initialIndex * RULER_STEP));
  useEffect(() => () => {
    nativePosition.cancel();
    if (settlement.active) {
      settlement.cancel();
      cancelCallback.current();
    }
  }, []);

  useEffect(() => {
    const own = target.current;
    // The owner's busy state and confirmation of this exact command are not
    // external selections. Keep their visual settling independent of HTTP.
    if (own && own.frames === frameIdentity &&
        (selectedAt === own.at || (disabled && selectedAt === own.from))) return;
    cancelInteraction();
  }, [initialIndex, selectedAt, frameIdentity, disabled]);
  useEffect(() => {
    if (reducedMotion) {
      const next = target.current ? frames.findIndex(frame => frame.atUtc === target.current!.at) : initialIndex;
      if (next >= 0) {
        nativePosition.move(next * RULER_STEP);
        liveLeft.current = next * RULER_STEP;
        setPresented(next);
      }
    }
  }, [reducedMotion]);

  const clamp = (value: number) =>
    Math.min(Math.max(0, value), Math.max(0, frames.length - 1));
  const updatePreview = (value: number) => {
    if (disabled) return;
    const next = clamp(value);
    setIndex(next);
    onPreview(next);
  };
  const commit = (next: number, from: number) => {
    target.current = { at: frames[next]!.atUtc, from: selectedAt, frames: frameIdentity };
    updatePreview(next);
    nativePosition.settle(from, next * RULER_STEP, reducedMotion, left => {
      liveLeft.current = left;
      setPresented(clamp(left / RULER_STEP));
    });
    onCommit(next);
  };
  const release = () => {
    if (!userScrolled.current && target.current) {
      const next = frames.findIndex(frame => frame.atUtc === target.current!.at);
      if (next >= 0) nativePosition.settle(liveLeft.current, next * RULER_STEP, reducedMotion, left => {
        liveLeft.current = left;
        setPresented(clamp(left / RULER_STEP));
      });
    }
    settlement.release();
  };

  settleCallback.current = offset => {
    if (disabled) return;
    const next = clamp(Math.round(offset / RULER_STEP));
    commit(next, offset);
  };

  if (!frames.length) {
    return (
      <View
        className="map-time-ruler map-time-ruler--empty"
        data-control={control}
        role="status"
      >
        <View className="map-time-ruler__heading">
          <Text className="type-label">观测时间</Text>
          <Text className="type-caption">
            {selectedAt ? formatTime(selectedAt, timezone) : "尚未确定观测时间"}
          </Text>
        </View>
        <Text className="type-caption">{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View
      className={`map-time-ruler${moonPhases !== undefined ? " map-time-ruler--with-moon" : ""}`}
      data-control={control}
    >
      <ScrollView
        id={`${control}-scroll`}
        className="map-time-ruler__scroll"
        scrollX={!disabled}
        enhanced
        showScrollbar={false}
        scrollLeft={scrollLeft}
        scrollWithAnimation
        ariaLabel={`观测时间切片；当前${formatTime(selectedAt, timezone)}；点击切片可直接选择时间`}
        onTouchStart={(event) => {
          if (disabled || (event as unknown as { touches?: readonly unknown[] }).touches?.length !== 1) {
            cancelInteraction();
            return;
          }
          nativePosition.cancel();
          userScrolled.current = false;
          settlement.begin();
        }}
        onTouchMove={(event) => {
          if ((event as unknown as { touches?: readonly unknown[] }).touches?.length !== 1) cancelInteraction();
        }}
        onTouchEnd={release}
        onDragEnd={release}
        onTouchCancel={cancelInteraction}
        onScroll={(event) => {
          const left = Number(event.detail.scrollLeft);
          if (!Number.isFinite(left)) return;
          liveLeft.current = left;
          setPresented(clamp(left / RULER_STEP));
          if (disabled || !settlement.active) return;
          userScrolled.current = true;
          target.current = null;
          settlement.update(left);
          updatePreview(clamp(Math.round(left / RULER_STEP)));
        }}
        onScrollEnd={() => {
          if (disabled || !settlement.active) return;
          settlement.end();
        }}
      >
        <View className="map-time-ruler__track">
          {frames.map((frame, frameIndex) => {
            const selected = settlement.active || target.current ? frameIndex === index : Date.parse(frame.atUtc) === Date.parse(selectedAt);
            const position = rulerPosition(frameIndex - presented);
            const phase = moonPhases?.[frameIndex] ?? null;
            const style = {
              "--ruler-opacity": String(position.opacity),
              "--ruler-offset": `${position.offset}px`,
            } as CSSProperties;
            return (
              <Button
                key={frame.atUtc}
                className={`map-time-ruler__slice${selected ? " map-time-ruler__slice--active" : ""}`}
                style={style}
                data-time-index={frameIndex}
                disabled={disabled}
                ariaLabel={`${formatTime(frame.atUtc, timezone)}${moonPhases !== undefined ? `，${moonPhaseLabel(phase)}` : ""}${selected ? "，已选择" : ""}`}
                onClick={() => {
                  if (disabled) return;
                  settlement.cancel();
                  commit(frameIndex, liveLeft.current);
                }}
              >
                <View className="map-time-ruler__tick" aria-hidden="true" />
                <Text>{formatTime(frame.atUtc, timezone, true)}</Text>
                {moonPhases !== undefined ? (
                  <MoonPhaseImage phase={phase} className="map-time-ruler__moon" decorative />
                ) : null}
              </Button>
            );
          })}
        </View>
      </ScrollView>
      <View className="map-time-ruler__center" aria-hidden="true" />
      {nightLabel ? <Text className="map-time-ruler__night" aria-live="polite">{nightLabel}</Text> : null}
    </View>
  );
}
