import { StatusPanel } from "@/components/status-panel";

export interface MapTemporalFailure {
  kind: "time" | "date";
  target: string;
  detail: string;
}

export function MapTemporalFeedback({
  failure,
  onRetry,
}: {
  failure: MapTemporalFailure | null;
  onRetry: () => void;
}) {
  if (!failure) return null;
  return (
    <StatusPanel
      state="ERROR"
      title={failure.kind === "time" ? "观测时间未保存" : "观测日期未保存"}
      detail={failure.detail}
      recoveryLabel={failure.kind === "time" ? "重试该时刻" : "重试该日期"}
      onRecover={onRetry}
    />
  );
}
