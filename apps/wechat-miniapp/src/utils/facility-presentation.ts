import type { FacilityStatus, FacilityType } from "@starward/miniapp-contracts";

export const FACILITY_LABEL: Readonly<Record<FacilityType, string>> = {
  PARKING: "停车", TOILET: "洗手间", PLATFORM: "观测平台", CHARGING: "充电",
  CAMPING: "露营", ROAD: "末段道路", WALKING: "徒步", SIGNAL: "通信信号",
};

const STATUS_LABEL: Readonly<Record<FacilityStatus, string>> = {
  AVAILABLE: "可用", UNAVAILABLE: "不可用", UNKNOWN: "暂无数据", SEASONAL: "季节性",
};

export function facilityStatusLabel(status: string): string {
  return STATUS_LABEL[status as FacilityStatus] ?? "暂无数据";
}
