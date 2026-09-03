import { View, Text } from "@tarojs/components";
import type { PageState } from "@starward/miniapp-contracts";
import { SoftButton } from "./soft-button";
import "./status-panel.scss";

const TITLES: Record<PageState, string> = {
  INITIAL: "准备加载",
  LOADING: "正在加载",
  READY: "数据已就绪",
  EMPTY: "暂无结果",
  PARTIAL: "部分数据可用",
  STALE: "正在使用过期数据",
  ERROR: "暂时无法加载",
  PERMISSION_DENIED: "权限未授予",
};

export function StatusPanel({
  state,
  detail,
  recoveryLabel,
  onRecover,
  live = true,
}: {
  state: PageState;
  detail: string;
  recoveryLabel?: string | undefined;
  onRecover?: (() => void) | undefined;
  live?: boolean | undefined;
}) {
  return (
    <View
      className={`status-panel status-panel--${state.toLowerCase()}`}
      data-control="notification-feedback page-state-recovery"
      role={state === "ERROR" ? "alert" : "status"}
      aria-live={live ? "polite" : undefined}
    >
      <Text className="type-label">{TITLES[state]}</Text>
      <Text className="type-caption">{detail}</Text>
      {recoveryLabel && onRecover ? (
        <SoftButton
          className="status-panel__recovery"
          label={recoveryLabel}
          onClick={onRecover}
        >
          {recoveryLabel}
        </SoftButton>
      ) : null}
    </View>
  );
}
