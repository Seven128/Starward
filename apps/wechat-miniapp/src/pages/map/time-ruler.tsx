import { Button, ScrollView, Text, View } from "@tarojs/components";
import type { BaseEventOrig, ScrollViewProps } from "@tarojs/components";
import { useEffect, useState } from "react";
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
    return clamp(Math.round(left / 68));
  };

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
        scrollLeft={index * 68}
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
          {frames.map((frame, frameIndex) => (
            <Button
              key={frame.atUtc}
              className={`map-time-ruler__slice${frameIndex === index ? " map-time-ruler__slice--active" : ""}`}
              disabled={disabled}
              ariaLabel={`${formatTime(frame.atUtc, timezone)}${frameIndex === index ? "，已选择" : ""}`}
              onClick={() => {
                updatePreview(frameIndex);
                onCommit(frameIndex);
              }}
            >
              <View className="map-time-ruler__tick" aria-hidden="true" />
              <Text>{formatTime(frame.atUtc, timezone)}</Text>
            </Button>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
