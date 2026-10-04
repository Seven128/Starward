import { Button, Text, View } from "@tarojs/components";
import type { SpotSkyContext } from "@starward/miniapp-contracts";
import { useSkyPresentationPosition as useCelestialPosition } from "./use-sky-presentation-position";
import type { SkyPositionPresentation } from "./sky-presentation-position";
import type { SkyObjectIdentity } from "./sky-object-picking";
import { skyObjectPositionIsCurrent } from "./sky-object-location";
import { projectSkySelectionMarker } from "./sky-selection-marker";
import type { SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";

/** Selection, disclosure and tracking subscribe to the same identity-bound
 * cancellable query. Zoom is presentation only and never changes its key. */
export function SkySelectedObject({ object, context, at, catalog, view,
  angularDiameterDeg, discIsItsMarker, landscapeCovered, reducedMotion,
  suspended, presentation, onSelect, onRetrySky }: {
  object: SkyObjectIdentity;
  context: SpotSkyContext;
  at: string;
  catalog: { catalogVersion: string; catalogHash: string } | null;
  view: { basis: SkyViewBasis; width: number; height: number; verticalFovDeg: number;
    center: SkyProjectionCenter };
  angularDiameterDeg: number | null;
  discIsItsMarker: boolean;
  landscapeCovered: (x: number, y: number) => boolean;
  reducedMotion: boolean;
  suspended: boolean;
  presentation?: SkyPositionPresentation;
  onSelect: (object: SkyObjectIdentity) => void;
  onRetrySky: () => void;
}) {
  const result = useCelestialPosition({ reference: object.reference,
    spotId: context.spotId, contextId: context.contextId,
    contextRevision: context.contextRevision, contextFingerprint: context.contextFingerprint,
    dataRevision: context.dataRevision, algorithmVersion: context.algorithmVersion, at },
  catalog, !suspended, presentation);
  const data = result.data?.data;
  if (suspended || !data || data.reference !== object.reference ||
    !skyObjectPositionIsCurrent(data, context, at, catalog)) {
    if (suspended || result.isPending && catalog) return null;
    return <View className="sky-selection-status" role="status">
      <Text>{object.displayName}的位置暂不可用</Text>
      <Button className="sky-view-mode__button" ariaLabel={`重试${object.displayName}的位置`}
        onClick={() => { onRetrySky(); if (catalog) void result.refetch(); }}>重试位置</Button>
    </View>;
  }
  const marker = projectSkySelectionMarker(object, data.position!, view, angularDiameterDeg);
  if (!marker) return null;
  const locationLabel = data.position!.altitudeDeg < 0 ? "地平线以下"
    : landscapeCovered(marker.x, marker.y) ? "模拟地景遮挡" : null;
  return <Button className={`sky-selected-object sky-selected-object--${marker.shape}${reducedMotion ? " sky-selected-object--still" : ""}${discIsItsMarker ? " sky-selected-object--disc" : ""}`}
    style={{ left: `${marker.x}px`, top: `${marker.y}px` }}
    ariaLabel={`${object.displayName}已选中${locationLabel ? `，${locationLabel}` : ""}，查看资料`}
    onClick={() => onSelect(object)}>
    <View className="sky-selected-object__reticle" aria-hidden
      style={{ width: `${marker.radiusPx * 2}px`, height: `${marker.radiusPx * 2}px` }}>
      <View className="sky-selected-object__ring" />
      {(["top", "right", "bottom", "left"] as const).map(side =>
        <View key={side} className={`sky-selected-object__tick sky-selected-object__tick--${side}`} />)}
    </View>
    <Text className="sky-selected-object__name" style={{ opacity: marker.nameOpacity,
      top: `calc(50% - ${marker.radiusPx + 24}px)` }}>
      {object.displayName}{locationLabel ? ` · ${locationLabel}` : ""}
    </Text>
  </Button>;
}
