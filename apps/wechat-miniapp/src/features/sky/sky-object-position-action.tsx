import { Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import type { CelestialObjectPositionData } from "@starward/miniapp-contracts";
import { SemanticIcon } from "@/components/semantic-asset";
import { SkyStatusPanel as StatusPanel } from "@/features/sky/sky-status-panel";
import { useSkyPresentationPosition as useCelestialPosition } from "./use-sky-presentation-position";
import type { SkyPositionPresentation } from "./sky-presentation-position";
import type { CelestialPositionBinding } from "@/services/celestial-position-response";
import { skyDirectionLabel, skyHeightLabel } from "./sky-position-label";

export function SkyObjectPositionAction({ binding, catalog, suspended, presentation, onLocate, onTrack, onRetrySky }: {
  binding: CelestialPositionBinding;
  catalog: { catalogVersion: string; catalogHash: string } | null;
  suspended: boolean;
  presentation?: SkyPositionPresentation;
  onLocate: (data: CelestialObjectPositionData) => void;
  onTrack: (data: CelestialObjectPositionData) => void;
  onRetrySky: () => void;
}) {
  const result = useCelestialPosition(binding, catalog, !suspended, presentation);
  const stale = Boolean(result.refreshError || result.data?.dataState === "STALE_USABLE");
  const retry = () => {
    // A new position publication can expose an old Infinity-cached catalogue.
    // Refresh its existing owner too, instead of repeating the rejected pair.
    onRetrySky();
    void result.refetch();
  };
  if (suspended) return <StatusPanel state="LOADING" detail="正在更新地点与时间" />;
  if (!catalog) return <StatusPanel state="PARTIAL" detail="星图还未加载，暂时无法定位"
    recoveryLabel="重试天空" onRecover={onRetrySky} />;
  if (result.isPending) return <StatusPanel state="LOADING" detail="正在计算位置…" />;
  if (result.isError || !result.data?.data.position) return <StatusPanel state="PARTIAL" detail="此刻的位置暂不可用"
    recoveryLabel="重试位置" onRecover={retry} />;
  const data = result.data.data;
  const point = data.position!;
  return <View className="sky-object-position-action">
    <View className="sky-object-position-action__buttons">
      <Button pressVariant="icon" className="sky-object-locate" ariaLabel="在星图中查看位置" onClick={() => onLocate(data)}><SemanticIcon name="sky-target" /></Button>
      <Button pressVariant="icon" className="sky-object-track" ariaLabel="随时间跟踪此天体" onClick={() => onTrack(data)}><SemanticIcon name="sky-follow" /></Button>
    </View>
    <View className="sky-object-position-action__facts">
      <View><Text>方向</Text><Text>{skyDirectionLabel(point.azimuthDeg, 1)}</Text></View>
      <View><Text>高度</Text><Text>{skyHeightLabel(point.altitudeDeg, 1)}</Text></View>
    </View>
    <Text className="sky-object-modal__hint">{point.altitudeDeg < 0 ? "位于地平线下" : "是否可见，还受天气与现场遮挡影响"}</Text>
    {stale ? <StatusPanel state="STALE"
      detail="更新失败，保留此刻的已算位置" recoveryLabel="重试位置" onRecover={retry} /> : null}
  </View>;
}
