import { View, Text } from "@tarojs/components";
import type { PageState } from "@starward/miniapp-contracts";
import { SoftButton } from "./soft-button";
import { SemanticIcon, type SemanticIconName } from "./semantic-asset";

export const EMPTY_FIELD_VALUE = "暂无数据";

const TITLES: Record<PageState, string> = {
  INITIAL: "准备加载",
  LOADING: "正在加载",
  READY: "数据已就绪",
  EMPTY: EMPTY_FIELD_VALUE,
  PARTIAL: "部分数据可用",
  STALE: "正在使用过期数据",
  ERROR: "暂时无法获取数据",
  PERMISSION_DENIED: "权限未授予",
};

const TITLED_STATES = new Set<PageState>([
  "EMPTY",
  "ERROR",
  "PERMISSION_DENIED",
]);

export function StatusPanel({
  state,
  detail,
  recoveryLabel,
  onRecover,
  live = true,
  emptyLevel = "section",
  emptyIcon,
  title,
}: {
  state: PageState;
  detail: string;
  recoveryLabel?: string | undefined;
  onRecover?: (() => void) | undefined;
  live?: boolean | undefined;
  emptyLevel?: "field" | "section" | "page" | undefined;
  emptyIcon?: SemanticIconName | undefined;
  title?: string | undefined;
}) {
  return (
    <View
      className={`status-panel status-panel--${state.toLowerCase()}${state === "EMPTY" ? ` status-panel--empty-${emptyLevel}` : ""}`}
      data-control="notification-feedback page-state-recovery"
      role={state === "ERROR" ? "alert" : "status"}
      aria-live={live ? "polite" : undefined}
    >
      {state === "EMPTY" && emptyLevel !== "field" ? <SemanticIcon name={emptyIcon ?? (emptyLevel === "page" ? "star" : "info")} className="status-panel__empty-icon" /> : null}
      {state === "EMPTY" && emptyLevel === "field" ? <Text className="status-panel__field-value">{EMPTY_FIELD_VALUE}</Text> : null}
      {TITLED_STATES.has(state) && !(state === "EMPTY" && emptyLevel === "field") ? (
        <Text className="type-label">{title ?? TITLES[state]}</Text>
      ) : null}
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
