import { ToggleField } from "@/components/toggle-field";
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
  return <Button id={id} className="settings-entry-row focus-ring"
    aria-label={`${label}${description ? `；${description}` : ""}${value ? `；${value}` : ""}`}
    disabled={disabled} onClick={onClick}>
    <View className={`settings-icon-well settings-icon-well--${tone}`} aria-hidden="true">
      <SemanticIcon name={icon} />
    </View>
    <View className="settings-entry-copy">
      <Text className="type-label">{label}</Text>
      {description ? <Text className="type-caption">{description}</Text> : null}
    </View>
    <View className="settings-entry-meta">
      {pendingLabel ? <Text>{pendingLabel}</Text> : <>
        {value ? <Text>{value}</Text> : null}
        <SemanticIcon name="chevron-right" />
      </>}
    </View>
  </Button>;
}

export function SettingsControls({
  preferences, mode, updatePreference, selectDisplayMode, onModeGestureCapture, openSheet,
}: SettingsControlsProps) {
  return <>
    <View className="settings-mode-panel">
      <DisplayModeControl mode={mode} onSelect={selectDisplayMode} onGestureCapture={onModeGestureCapture} />
    </View>

    <View id="settings-permissions" className="settings-section" data-od-id="settings-permissions">
      <Text className="settings-section-title">位置与隐私</Text>
      <View className="settings-card settings-card--group">
        <SettingsEntryRow id="nearby-location-preference" label="附近地点" icon="location"
          value={preferences.locationPreference === "ASK_ONCE" ? "使用时询问" : "始终手动选择"}
          onClick={() => openSheet("LOCATION")} />
        <SettingsEntryRow id="settings-direction" label="方位天空" icon="compass" value="按页使用"
          onClick={() => openSheet("DIRECTION")} />
        <SettingsEntryRow id="settings-precise-location" label="精确位置" icon="info" value="每次确认"
          onClick={() => openSheet("PRECISE")} />
      </View>
    </View>

    <View id="settings-reminders" className="settings-section" data-od-id="settings-reminders">
      <Text className="settings-section-title">提醒</Text>
      <View className="settings-card settings-card--group">
        <ToggleField id="departure-condition-reminder" label="观星计划提醒"
          description="清单与时间在计划中设置" icon="conditions" iconTone="gold"
          checked={preferences.departureConditionReminder}
          onChange={(checked) => updatePreference("departureConditionReminder", checked)} />
        <ToggleField id="contribution-status-reminder" label="审核结果提醒"
          description="观星点创建与反馈" icon="check" iconTone="lilac"
          checked={preferences.contributionStatusReminder}
          onChange={(checked) => updatePreference("contributionStatusReminder", checked)} />
      </View>
      {(preferences.departureConditionReminder || preferences.contributionStatusReminder) ?
        <Text className="type-caption settings-capability-note">提醒意向已保存；微信通知仅在取得订阅授权并有发送回执后生效。</Text> : null}
    </View>
  </>;
}

export function SettingsDataActions({ dataAction, openSheet }: {
  dataAction: "CACHE" | "EXPORT" | "DELETE" | null;
  openSheet: (kind: SettingsSheetKind) => void;
}) {
  return <View id="settings-data-actions" className="settings-section" data-od-id="settings-data-actions">
    <Text className="settings-section-title">数据</Text>
    <View className="settings-card settings-card--group">
      <SettingsEntryRow id="settings-cache-cleanup" label="清理本机缓存" icon="refresh"
        disabled={dataAction !== null} pendingLabel={dataAction === "CACHE" ? "清理中…" : undefined}
        onClick={() => openSheet("CACHE")} />
      <SettingsEntryRow id="account-data-export" label="下载我的数据" icon="download"
        disabled={dataAction !== null} pendingLabel={dataAction === "EXPORT" ? "生成中…" : undefined}
        onClick={() => openSheet("EXPORT")} />
      <SettingsEntryRow id="account-delete" label="删除账户" icon="trash" tone="coral"
        disabled={dataAction !== null} pendingLabel={dataAction === "DELETE" ? "处理中…" : undefined}
        onClick={() => openSheet("DELETE")} />
    </View>
  </View>;
}
