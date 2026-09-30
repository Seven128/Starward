import { Button, Text, View } from "@tarojs/components";
import { useEffect, useRef } from "react";
import type { CelestialObjectPositionData } from "@starward/miniapp-contracts";
import { useSkyPresentationPosition as useCelestialPosition } from "./use-sky-presentation-position";
import type { SkyPositionPresentation } from "./sky-presentation-position";
import type { CelestialPositionBinding } from "@/services/celestial-position-response";

/** Unmounted while hidden or after a user changes viewing intent. This keeps
 * subscription cancellation with Query and native cleanup with the transport. */
export function SkyObjectTrackingStatus({ name, binding, catalog, overview, suspended, presentation, onPosition, onStop, onRetrySky }: {
  name: string;
  binding: CelestialPositionBinding;
  catalog: { catalogVersion: string; catalogHash: string } | null;
  overview: boolean;
  suspended: boolean;
  presentation?: SkyPositionPresentation;
  onPosition: (data: CelestialObjectPositionData) => void;
  onStop: () => void;
  onRetrySky: () => void;
}) {
  const result = useCelestialPosition(binding, catalog, !suspended, presentation);
  const callback = useRef(onPosition);
  callback.current = onPosition;
  useEffect(() => {
    if (!suspended && catalog && result.data?.data.position) callback.current(result.data.data);
  }, [result.data, catalog?.catalogVersion, catalog?.catalogHash, suspended]);
  const usable = Boolean(catalog && result.data?.data.position);
  const failed = !catalog || !usable && (result.isError || Boolean(result.refreshError) || result.data?.dataState === "UNAVAILABLE");
  const pending = (suspended || result.isPending) && !failed;
  const stale = usable && (result.data?.dataState === "STALE_USABLE" || Boolean(result.refreshError));
  const state = failed ? "位置暂不可用" : stale ? "使用缓存位置" : pending ? "正在更新位置" : overview ? "全天总览中保留跟踪" : "跟踪中";
  return <View className="sky-object-tracking-status" role="group" aria-label={`${name}天体跟踪`}>
    <Text className="type-caption" aria-live="polite">{name} · {state}</Text>
    {failed || stale ? <Button className="sky-view-mode__button" onClick={() => {
      onRetrySky();
      if (catalog) void result.refetch();
    }}>{catalog ? "重试位置" : "重试星图"}</Button> : null}
    <Button className="sky-view-mode__button sky-object-tracking-stop" onClick={onStop}>停止跟踪</Button>
  </View>;
}
