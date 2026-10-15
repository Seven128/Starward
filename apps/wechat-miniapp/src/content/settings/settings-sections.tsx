import { ToggleField } from "@/components/toggle-field";
import { LoadingIndicator } from "@/components/loading-indicator";
import { SemanticIcon, type SemanticIconName } from "@/components/semantic-asset";
import type { usePreferencesSync } from "@/hooks/use-preferences-sync";
import type { DisplayMode, UserPreferences } from "@starward/miniapp-contracts";
import { Button, Text, View } from "@tarojs/components";

import { DisplayModeControl } from "./display-mode-control";

export type SettingsSheetKind =
  | "LOCATION"
  | "DIRECTION"
  | "PRECISE"
  | "CACHE"
  | "EXPORT"
  | "DELETE";

type SettingsControlsProps = {
  preferences: UserPreferences;
  mode: DisplayMode;
  updatePreference: ReturnType<typeof usePreferencesSync>["updatePreference"];
  selectDisplayMode: (mode: DisplayMode) => void;
  onModeGestureCapture: (captured: boolean) => void;
  openSheet: (kind: SettingsSheetKind) => void;
  blocked?: boolean;
  preferencesConfirmed?: boolean;
};

function SettingsEntryRow({
  id, label, description, value, icon, tone = "plain", disabled = false, pendingLabel, onClick,
}: {
  id: string;
  label: string;
  description?: string;
  value?: string;
  icon: SemanticIconName;
  tone?: "plain" | "gold" | "lilac" | "coral";
  disabled?: boolean;
  pendingLabel?: string | undefined;
  onClick: () => void;
}) {
  return <Button id={id} className={`settings-entry-row focus-ring${disabled ? " settings-entry-row--disabled" : ""}`}
    ariaLabel={`${label}${description ? `；${description}` : ""}${value ? `；${value}` : ""}`}
    disabled={disabled} onClick={onClick}>
    <View className={`settings-icon-well settings-icon-well--${tone}`} aria-hidden="true">
      <SemanticIcon name={icon} />
    </View>
    <View className="settings-entry-copy">
      <Text className="type-label">{label}</Text>
      {description ? <Text className="type-caption">{description}</Text> : null}
    </View>
    <View className="settings-entry-meta">
      {pendingLabel ? <><LoadingIndicator kind="arc" /><Text>{pendingLabel}</Text></> : <>
        {value ? <Text>{value}</Text> : null}
        <View className="settings-entry-chevron" aria-hidden="true"><SemanticIcon name="chevron-right" /></View>
      </>}
    </View>
  </Button>;
}

export function SettingsControls({
  preferences, mode, updatePreference, selectDisplayMode, onModeGestureCapture, openSheet,
  blocked = false, preferencesConfirmed = true,
}: SettingsControlsProps) {
  return <>
    <View className="settings-mode-panel">
      <DisplayModeControl mode={mode} disabled={blocked} onSelect={selectDisplayMode} onGestureCapture={onModeGestureCapture} />
    </View>

    <View id="settings-permissions" className="settings-section" data-od-id="settings-permissions">
      <Text className="settings-section-title">位置与隐私</Text>
      <View className="settings-card settings-card--group">
        <SettingsEntryRow id="nearby-location-preference" label="附近地点" icon={mode === "DAY" ? "place-pin" : "location"}
          disabled={blocked || !preferencesConfirmed}
          value={!preferencesConfirmed ? "待确认" : preferences.locationPreference === "ASK_ONCE" ? "使用时询问" : mode === "DAY" ? "手动选择" : "始终手动选择"}
          onClick={() => openSheet("LOCATION")} />
        <SettingsEntryRow id="settings-direction" label="方位天空" icon="compass" disabled={blocked || !preferencesConfirmed} value={preferencesConfirmed ? "按页使用" : "待确认"}
          onClick={() => openSheet("DIRECTION")} />
        <SettingsEntryRow id="settings-precise-location" label="精确位置" icon={mode === "DAY" ? "location" : "info"} disabled={blocked || !preferencesConfirmed} value={preferencesConfirmed ? "每次确认" : "待确认"}
          onClick={() => openSheet("PRECISE")} />
      </View>
    </View>

    <View id="settings-reminders" className="settings-section" data-od-id="settings-reminders">
      <Text className="settings-section-title">提醒</Text>
      <View className="settings-card settings-card--group">
        <ToggleField id="departure-condition-reminder" label="观星计划提醒"
          description="清单与时间在计划中设置" icon="bell" iconTone="gold"
          checked={preferences.departureConditionReminder}
          disabled={blocked || !preferencesConfirmed}
          {...(!preferencesConfirmed ? { stateLabels: { checked: "待确认", unchecked: "待确认" } } : {})}
          onChange={(checked) => updatePreference("departureConditionReminder", checked)} />
        <ToggleField id="contribution-status-reminder" label="审核结果提醒"
          description="观星点创建与反馈" icon={mode === "DAY" ? "checklist" : "check"} iconTone={mode === "DAY" ? "plain" : "lilac"}
          checked={preferences.contributionStatusReminder}
          disabled={blocked || !preferencesConfirmed}
          {...(!preferencesConfirmed ? { stateLabels: { checked: "待确认", unchecked: "待确认" } } : {})}
          onChange={(checked) => updatePreference("contributionStatusReminder", checked)} />
      </View>
      {preferencesConfirmed && (preferences.departureConditionReminder || preferences.contributionStatusReminder) ?
        <Text className="type-caption settings-capability-note">微信通知需另行订阅；发送情况请查看具体提醒状态。</Text> : null}
    </View>
  </>;
}

export function SettingsDataActions({ dataAction, openSheet, blocked = false }: {
  dataAction: "CACHE" | "EXPORT" | "DELETE" | null;
  openSheet: (kind: SettingsSheetKind) => void;
  blocked?: boolean;
}) {
  return <View id="settings-data-actions" className="settings-section" data-od-id="settings-data-actions">
    <Text className="settings-section-title">数据</Text>
    <View className="settings-card settings-card--group">
      <SettingsEntryRow id="settings-cache-cleanup" label="清理本机缓存" icon="refresh"
        disabled={blocked || dataAction !== null} pendingLabel={dataAction === "CACHE" ? "清理中…" : undefined}
        onClick={() => openSheet("CACHE")} />
      <SettingsEntryRow id="account-data-export" label="导出数据" icon="download"
        disabled={blocked || dataAction !== null} pendingLabel={dataAction === "EXPORT" ? "生成中…" : undefined}
        onClick={() => openSheet("EXPORT")} />
      <SettingsEntryRow id="account-delete" label="删除账户" icon="trash" tone="coral"
        disabled={blocked || dataAction !== null} pendingLabel={dataAction === "DELETE" ? "处理中…" : undefined}
        onClick={() => openSheet("DELETE")} />
    </View>
  </View>;
}
