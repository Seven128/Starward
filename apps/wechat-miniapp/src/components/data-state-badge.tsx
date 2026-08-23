import { Text } from "@tarojs/components";
import type { DataState } from "@starward/miniapp-contracts";

export const DATA_STATE_LABELS: Readonly<Record<DataState, string>> = {
  FRESH: "当前数据",
  STALE_USABLE: "过期可用",
  PARTIAL: "部分数据",
  EXPIRED: "已过期",
  UNAVAILABLE: "不可用",
  ESTIMATED: "估算",
  SAMPLE_DATA: "资料不足",
};
export function DataStateBadge({ state }: { state: DataState }) {
  return (
    <Text
      className={`status-tag${state === "EXPIRED" || state === "UNAVAILABLE" ? " status-tag--danger" : state !== "FRESH" ? " status-tag--warning" : ""}`}
    >
      {DATA_STATE_LABELS[state]}
    </Text>
  );
}
