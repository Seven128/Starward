import type { MapSpotTimeSignal } from "@starward/miniapp-contracts";

const MOON_IMPACT: Record<MapSpotTimeSignal["moonImpact"], string> = {
  LOW: "较低", MEDIUM: "中等", HIGH: "较高", UNKNOWN: "暂无数据",
};
export function panelAstronomyFacts(signal: MapSpotTimeSignal | null) {
  const usable = signal?.state !== "UNAVAILABLE" ? signal : null;
  const percent = (value: number | null | undefined) => value !== null && value !== undefined && Number.isFinite(value) && value >= 0 && value <= 100 ? `${value}%` : "暂无数据";
  return [
    { label: "总云量", value: percent(usable?.cloudPercent) },
    { label: "低层云", value: percent(usable?.lowCloudPercent) },
    { label: "中层云", value: percent(usable?.midCloudPercent) },
    { label: "高层云", value: percent(usable?.highCloudPercent) },
    { label: "月光影响", value: MOON_IMPACT[usable?.moonImpact ?? "UNKNOWN"] },
  ];
}
