import { Button, ScrollView, Text, View } from "@tarojs/components";
import type { BaseEventOrig, ScrollViewProps } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { MapSceneTimeFrame } from "@starward/miniapp-contracts";
import { nearestMapTimeFrameIndex } from "./map-time-frame";
import { MINIAPP_DESIGN } from "../../theme/design-tokens";
import { useDidHide } from "@tarojs/taro";

function formatTime(value: string, timezone: string, compact = false) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      ...(compact ? {} : { month: "2-digit" as const, day: "2-digit" as const }),
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(value));
  } catch {
    return "时间暂无数据";
  }
}

const RULER_STEP = MINIAPP_DESIGN.geometry["target-min"];

function rulerPosition(distance: number) {
  // Keep the projection deterministic while the native ScrollView supplies
  // the horizontal physics.  The centre slice remains full-size; distant
  // real slices form the shallow raised arc from the selected design.
  const u = Math.min(1, Math.abs(distance) / 10);
  return {
    scale: 1 - 0.56 * Math.pow(u, 1.2),
    opacity: 1 - 0.84 * Math.pow(u, 1.15),
    offset: 22 * Math.pow(u, 1.55),
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
  onPreview,
  onCommit,
  onCancel,
  control = "map-time-control",
}: {
  frames: readonly MapSceneTimeFrame[];
  selectedAt: string;
  timezone: string;
  disabled: boolean;
  onPreview: (index: number) => void;
  onCommit: (index: number) => void;
  onCancel: () => void;
  control?: "map-time-control" | "sky-time-scrubber";
}) {
  const initialIndex = frames.length
    ? nearestMapTimeFrameIndex(frames, selectedAt)
    : 0;
  const [index, setIndex] = useState(initialIndex);
  const interacting = useRef(false);
  const cancelCallback = useRef(onCancel);
  cancelCallback.current = onCancel;
  const frameIdentity = frames.map((frame) => frame.atUtc).join("|");

  const cancelInteraction = () => {
    const pending = interacting.current;
    interacting.current = false;
    setIndex(initialIndex);
    if (pending) cancelCallback.current();
  };
  useDidHide(cancelInteraction);
  useEffect(() => () => {
    if (interacting.current) {
      interacting.current = false;
      cancelCallback.current();
    }
  }, []);

  useEffect(() => {
    cancelInteraction();
  }, [initialIndex, selectedAt, frameIdentity, disabled]);

  const clamp = (value: number) =>
    Math.min(Math.max(0, value), Math.max(0, frames.length - 1));
  const updatePreview = (value: number) => {
    if (disabled) return;
    const next = clamp(value);
    setIndex(next);
    onPreview(next);
  };
  const readIndex = (
    event: BaseEventOrig<ScrollViewProps.onScrollDetail>,
  ) => {
    // WeChat exposes scrollLeft on the native detail even though the Taro
    // declaration only lists the vertical fields for onScroll.
    const left = Number(
      (event.detail as unknown as { scrollLeft?: number }).scrollLeft ?? 0,
    );
    return clamp(Math.round(left / RULER_STEP));
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
            {selectedAt ? formatTime(selectedAt, timezone) : "时间暂无数据"}
          </Text>
        </View>
        <Text className="type-caption">当前没有可用时间切片</Text>
      </View>
    );
  }

  return (
    <View className="map-time-ruler" data-control={control}>
      <View className="map-time-ruler__heading">
        <Text className="type-label">观测时间</Text>
        <Text className="type-caption">
          {interacting.current && frames[index]
            ? formatTime(frames[index]!.atUtc, timezone)
            : selectedAt
              ? formatTime(selectedAt, timezone)
              : "时间暂无数据"}
        </Text>
      </View>
      <ScrollView
        className="map-time-ruler__scroll"
        scrollX={!disabled}
        enhanced
        showScrollbar={false}
        scrollLeft={index * RULER_STEP}
        scrollWithAnimation
        ariaLabel="观测时间切片；点击切片可直接选择时间"
        onTouchStart={(event) => {
          if (disabled || (event as unknown as { touches?: readonly unknown[] }).touches?.length !== 1) {
            cancelInteraction();
            return;
          }
          interacting.current = true;
        }}
        onTouchMove={(event) => {
          if ((event as unknown as { touches?: readonly unknown[] }).touches?.length !== 1) cancelInteraction();
        }}
        onTouchCancel={cancelInteraction}
        onScroll={(event) => {
          if (interacting.current) updatePreview(readIndex(event));
        }}
        onScrollEnd={(event) => {
          if (disabled || !interacting.current) return;
          interacting.current = false;
          const next = readIndex(event);
          updatePreview(next);
          onCommit(next);
        }}
      >
        <View className="map-time-ruler__track">
          {frames.map((frame, frameIndex) => {
            const selected = interacting.current ? frameIndex === index : Date.parse(frame.atUtc) === Date.parse(selectedAt);
            const position = rulerPosition(frameIndex - index);
            const labelled = frameIndex === index || (frameIndex % 4 === 0 && Math.abs(frameIndex - index) >= 3);
            const style = {
              "--ruler-scale": String(position.scale),
              "--ruler-opacity": String(position.opacity),
              "--ruler-offset": `${position.offset}rpx`,
            } as CSSProperties;
            return (
              <Button
                key={frame.atUtc}
                className={`map-time-ruler__slice${selected ? " map-time-ruler__slice--active" : ""}`}
                style={style}
                data-time-index={frameIndex}
                disabled={disabled}
                ariaLabel={`${formatTime(frame.atUtc, timezone)}${selected ? "，已选择" : ""}`}
                onClick={() => {
                  if (disabled) return;
                  interacting.current = false;
                  updatePreview(frameIndex);
                  onCommit(frameIndex);
                }}
              >
                <View className="map-time-ruler__tick" aria-hidden="true" />
                {labelled ? <Text>{formatTime(frame.atUtc, timezone, true)}</Text> : null}
              </Button>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
