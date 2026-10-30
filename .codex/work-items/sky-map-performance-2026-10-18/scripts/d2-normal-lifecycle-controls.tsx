// TASK ONLY menu addition. It arms observation, never product Play/Pause.
import Taro, { useDidHide } from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";
import { r17ConfigureNormalRetirementObservation } from "./r17-normal-observations";
import { createD2NormalOwner, mountD2NormalOwner, hideD2NormalOwner, endD2NormalOwner,
  armD2NormalOwner, exportD2NormalObservation, d2NormalObservationStatus, d2NormalOwnerCanInteract,
  d2NormalSurfaceReady, d2NormalSurfaceRetired, type D2NormalOwner } from "./d2-normal-lifecycle";

// This writer receives the original scalar-only receipt. It stores the same
// value once, and forwards only its already validated event/id to coordination.
r17ConfigureNormalRetirementObservation({ buildGeneration: __D2_BUILD_GENERATION__,
  buildSourceSha256: "__D2_BUILD_SOURCE_HASH__" }, (key, value) => {
  const receipt = value as { event?: unknown; surface?: { id?: unknown; outcome?: unknown } | null };
  const id = receipt.surface?.id;
  if (typeof id === "number" && Number.isSafeInteger(id) && id > 0 && id <= 1e12) {
    if (receipt.event === "ready") d2NormalSurfaceReady(id);
    else if (receipt.event === "retire-complete" && (receipt.surface?.outcome === "returned" || receipt.surface?.outcome === "threw")) d2NormalSurfaceRetired(id);
  }
  Taro.setStorageSync(key, value);
});

export function useD2NormalLifecycle(timeToken: object, binding: string, committedAt: string, visible: boolean, playing: boolean) {
  const owner = useMemo(() => createD2NormalOwner(timeToken, Boolean(binding && committedAt), playing), [timeToken, binding, committedAt]);
  owner.visible = visible;
  useEffect(() => { mountD2NormalOwner(owner); return () => endD2NormalOwner(owner); }, [owner]);
  useDidHide(() => hideD2NormalOwner(owner));
  return owner;
}

export function D2DecodeControls({ owner }: { owner: D2NormalOwner }) {
  const [, render] = useState(0);
  return <View className="d2-normal-resource-controls" style={{ padding: "8px", fontSize: "12px" }}>
    <Text>诊断：图片资源逻辑账</Text>
    <Text style={{ display: "block" }}>{d2NormalObservationStatus(owner)}</Text>
    <Button className="d2-normal-resource-arm" disabled={!owner.visible || !owner.bound || owner.playing || !owner.readySurfaceId}
      onClick={() => { armD2NormalOwner(owner); render(value => value + 1); }}>准备观察</Button>
    <Button className="d2-normal-resource-export" onClick={() => { if (!d2NormalOwnerCanInteract(owner)) return;
      void exportD2NormalObservation(owner); render(value => value + 1); }}>结束观察 / 重试保存</Button>
  </View>;
}
