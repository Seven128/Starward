import { Text, View } from "@tarojs/components";
import type { CelestialObjectPositionData } from "@starward/miniapp-contracts";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useSkyPresentationPosition as useCelestialPosition } from "./use-sky-presentation-position";
import type { SkyPositionPresentation } from "./sky-presentation-position";
import type { CelestialPositionBinding } from "@/services/celestial-position-response";

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
  const retry = () => {
    // A new position publication can expose an old Infinity-cached catalogue.
    // Refresh its existing owner too, instead of repeating the rejected pair.
    onRetrySky();
    void result.refetch();
  };
  if (suspended) return <StatusPanel state="LOADING" detail="正在更新观测地点或时刻，完成后可定位或跟踪。" />;
  if (!catalog) return <StatusPanel state="PARTIAL" detail="当前目录或天空帧尚不可用，暂时无法定位。"
    recoveryLabel="重试天空" onRecover={onRetrySky} />;
  if (result.isPending) return <StatusPanel state="LOADING" detail="正在计算所选时刻的位置…" />;
  if (result.isError || !result.data?.data.position) return <StatusPanel state="PARTIAL" detail="当前地点与时刻的天体位置暂不可用。"
    recoveryLabel="重试位置" onRecover={retry} />;
  const data = result.data.data;
  const point = data.position!;
  return <View className="sky-object-position-action">
    <Text className="sky-object-modal__limitation">方位 {point.azimuthDeg.toFixed(1)}° · 高度 {point.altitudeDeg.toFixed(1)}°
      {point.altitudeDeg < 0 ? " · 地平线以下" : " · 几何位置不保证可见"}</Text>
    {result.refreshError || result.data!.dataState === "STALE_USABLE" ? <StatusPanel state="STALE"
      detail="位置尚未更新，当前显示同一地点与时刻的缓存计算。" recoveryLabel="重试位置" onRecover={retry} /> : null}
    <SoftButton className="sky-object-locate" label="将星空视角定位到此天体" onClick={() => onLocate(data)}>定位到星空</SoftButton>
    <SoftButton className="sky-object-track" label="随观测时刻变化跟踪此天体" onClick={() => onTrack(data)}>跟踪天体</SoftButton>
  </View>;
}
