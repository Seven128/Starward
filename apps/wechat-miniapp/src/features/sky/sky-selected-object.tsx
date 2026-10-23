import { Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import { useEffect } from "react";
import type { CelestialObjectPositionData, SpotSkyContext } from "@starward/miniapp-contracts";
import { useSkyPresentationPosition as useCelestialPosition } from "./use-sky-presentation-position";
import type { SkyPositionPresentation } from "./sky-presentation-position";
import type { SkyObjectIdentity } from "./sky-object-picking";
import { skyObjectPositionIsCurrent } from "./sky-object-location";
import { projectSkySelectionMarker } from "./sky-selection-marker";
import type { SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";

export interface SkySelectionPosition {
  readonly data: CelestialObjectPositionData;
  readonly catalog: { readonly catalogVersion: string; readonly catalogHash: string };
  readonly report: SkyPositionPresentation["rendered"] | undefined;
}

/** Selection, disclosure and tracking subscribe to the same identity-bound
 * cancellable query. Zoom is presentation only and never changes its key. */
export function SkySelectedObject({ object, context, at, catalog, view,
  angularDiameterDeg, discIsItsMarker, landscapeCovered,
  suspended, presentation, visualName = true, onPosition, onSelect, onRetrySky }: {
  object: SkyObjectIdentity;
  context: SpotSkyContext;
  at: string;
  catalog: { catalogVersion: string; catalogHash: string } | null;
  view: { basis: SkyViewBasis; width: number; height: number; verticalFovDeg: number;
    center: SkyProjectionCenter };
  angularDiameterDeg: number | null;
  discIsItsMarker: boolean;
  landscapeCovered: (x: number, y: number) => boolean;
  suspended: boolean;
  presentation?: SkyPositionPresentation;
  /** Ordinary names/hits are drawn by the accepted Canvas frame. The query and
   * unavailable-position recovery still belong to this component. */
  visualName?: boolean;
  onPosition: (position: SkySelectionPosition | null) => void;
  onSelect: (object: SkyObjectIdentity) => void;
  onRetrySky: () => void;
}) {
  const result = useCelestialPosition({ reference: object.reference,
    spotId: context.spotId, contextId: context.contextId,
    contextRevision: context.contextRevision, contextFingerprint: context.contextFingerprint,
    dataRevision: context.dataRevision, algorithmVersion: context.algorithmVersion, at },
  catalog, !suspended, presentation);
  const data = result.data?.data;
  const positionCurrent = Boolean(!suspended && data && data.reference === object.reference &&
    skyObjectPositionIsCurrent(data, context, at, catalog));
  useEffect(() => {
    onPosition(positionCurrent && data && catalog ? { data, catalog, report: presentation?.rendered } : null);
    return () => onPosition(null);
  }, [onPosition, positionCurrent, data, object, catalog?.catalogVersion, catalog?.catalogHash, presentation?.rendered]);
  if (!positionCurrent) {
    if (suspended || result.isPending && catalog) return null;
    return <View className="sky-selection-status" role="status">
      <Text>{object.displayName}的位置暂不可用</Text>
      <Button className="sky-view-mode__button" ariaLabel={`重试${object.displayName}的位置`}
        onClick={() => { onRetrySky(); if (catalog) void result.refetch(); }}>重试位置</Button>
    </View>;
  }
  if (!visualName) return null;
  const marker = projectSkySelectionMarker(object, data!.position!, view, angularDiameterDeg);
  if (!marker) return null;
  const locationLabel = data!.position!.altitudeDeg < 0 ? "地平线以下"
    : landscapeCovered(marker.x, marker.y) ? "图中地面遮挡" : null;
  return <Button className={`sky-selected-object sky-selected-object--${marker.shape}${discIsItsMarker ? " sky-selected-object--disc" : ""}`}
    style={{ left: `${marker.x}px`, top: `${marker.y}px` }}
    ariaLabel={`${object.displayName}已选中${locationLabel ? `，${locationLabel}` : ""}，查看资料`}
    onClick={() => onSelect(object)}>
    <Text className="sky-selected-object__name" style={{ opacity: marker.nameOpacity,
      top: `calc(50% - ${marker.radiusPx + 24}px)` }}>
      {object.displayName}{locationLabel ? ` · ${locationLabel}` : ""}
    </Text>
  </Button>;
}
