import { Button, ScrollView, Text, View } from "@tarojs/components";
import type { BaseEventOrig, ScrollViewProps } from "@tarojs/components";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { MapSceneTimeFrame } from "@starward/miniapp-contracts";
import { nearestMapTimeFrameIndex } from "./map-time-frame";

function formatTime(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "时间暂无数据";
  }
}

const RULER_STEP = 34;

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
  control = "map-time-control",
}: {
  frames: readonly MapSceneTimeFrame[];
  selectedAt: string;
  timezone: string;
  disabled: boolean;
  onPreview: (index: number) => void;
  onCommit: (index: number) => void;
  control?: "map-time-control" | "sky-time-scrubber";
}) {
  const initialIndex = frames.length
    ? nearestMapTimeFrameIndex(frames, selectedAt)
    : 0;
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const clamp = (value: number) =>
    Math.min(Math.max(0, value), Math.max(0, frames.length - 1));
  const updatePreview = (value: number) => {
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
          {frames[index]
            ? formatTime(frames[index]!.atUtc, timezone)
            : selectedAt
              ? formatTime(selectedAt, timezone)
              : "时间暂无数据"}
        </Text>
      </View>
      <ScrollView
        className="map-time-ruler__scroll"
        scrollX
        enhanced
        showScrollbar={false}
        scrollLeft={index * RULER_STEP}
        scrollWithAnimation
        ariaLabel="观测时间切片；点击切片可直接选择时间"
        onScroll={(event) => updatePreview(readIndex(event))}
        onScrollEnd={(event) => {
          const next = readIndex(event);
          updatePreview(next);
          onCommit(next);
        }}
      >
        <View className="map-time-ruler__track">
          {frames.map((frame, frameIndex) => {
            const position = rulerPosition(frameIndex - index);
            const labelled = frameIndex === index || frameIndex % 4 === 0;
            const style = {
              "--ruler-scale": String(position.scale),
              "--ruler-opacity": String(position.opacity),
              "--ruler-offset": `${position.offset}rpx`,
            } as CSSProperties;
            return (
              <Button
                key={frame.atUtc}
                className={`map-time-ruler__slice${frameIndex === index ? " map-time-ruler__slice--active" : ""}`}
                style={style}
                data-time-index={frameIndex}
                disabled={disabled}
                ariaLabel={`${formatTime(frame.atUtc, timezone)}${frameIndex === index ? "，已选择" : ""}`}
                onClick={() => {
                  updatePreview(frameIndex);
                  onCommit(frameIndex);
                }}
              >
                <View className="map-time-ruler__tick" aria-hidden="true" />
                {labelled ? <Text>{formatTime(frame.atUtc, timezone)}</Text> : null}
              </Button>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
