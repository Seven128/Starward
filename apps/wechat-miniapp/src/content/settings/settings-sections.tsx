import { ToggleField } from "@/components/toggle-field";
import { Button, Text, View } from "@tarojs/components";
import type { DisplayMode, UserPreferences } from "@starward/miniapp-contracts";
import type { usePreferencesSync } from "@/hooks/use-preferences-sync";
import { SemanticIcon } from "@/components/semantic-asset";

import { DisplayModeControl } from "./display-mode-control";

type SettingsControlsProps = {
  preferences: UserPreferences;
  mode: DisplayMode;
  updatePreference: ReturnType<typeof usePreferencesSync>["updatePreference"];
  selectDisplayMode: (mode: DisplayMode) => void;
  onModeGestureCapture: (captured: boolean) => void;
};

export function SettingsControls({
  preferences,
  mode,
  updatePreference,
  selectDisplayMode,
  onModeGestureCapture,
}: SettingsControlsProps) {
  return (
    <>
      <DisplayModeControl mode={mode} onSelect={selectDisplayMode} onGestureCapture={onModeGestureCapture} />

      <View
        id="settings-permissions"
        className="settings-section"
        data-od-id="settings-permissions"
      >
        <Text className="type-section">权限与隐私</Text>
        <View className="settings-card settings-card--group card">
          <ToggleField id="nearby-location-preference" label="附近地点"
            description="查找附近时询问定位，可改用手动位置"
            checked={preferences.locationPreference === "ASK_ONCE"}
            onChange={(checked) => updatePreference("locationPreference", checked ? "ASK_ONCE" : "MANUAL_ONLY")}
          />
          <View className="setting-row">
            <View>
              <Text className="type-label">方位天空</Text>
              <Text className="type-caption">
                仅在方位页使用，方向数据不上传
              </Text>
            </View>
            <Text className="settings-state-pill">按页使用</Text>
          </View>
          <View className="setting-row">
            <View>
              <Text className="type-label">精确位置投稿</Text>
              <Text className="type-caption">
                新增地点时单独授权位置
              </Text>
            </View>
            <Text className="settings-state-pill">每次确认</Text>
          </View>
        </View>
      </View>

      <View
        id="settings-reminders"
        className="settings-section"
        data-od-id="settings-reminders"
      >
        <Text className="type-section">提醒偏好</Text>
        <View className="settings-card settings-card--group card">
          <ToggleField id="departure-condition-reminder" label="出发前条件复核"
            description="针对已创建的今晚计划"
            checked={preferences.departureConditionReminder}
            onChange={(checked) => updatePreference("departureConditionReminder", checked)}
          />
          <ToggleField id="contribution-status-reminder" label="投稿状态变化"
            description="投稿被退回、接收或拒绝时"
            checked={preferences.contributionStatusReminder}
            onChange={(checked) => updatePreference("contributionStatusReminder", checked)}
          />
        </View>
        <Text className="type-caption settings-capability-note">
          当前仅保存偏好，暂不发送微信提醒。
        </Text>
      </View>
    </>
  );
}

type SettingsAccountActionsProps = {
  dataAction: "EXPORT" | "DELETE" | null;
  downloadAccountData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

export function SettingsAccountActions({
  dataAction,
  downloadAccountData,
  deleteAccount,
}: SettingsAccountActionsProps) {
  return (
    <View
      id="settings-data-actions"
      className="settings-section"
      data-od-id="settings-data-actions"
    >
      <Text className="type-section">数据</Text>
      <View className="settings-card settings-card--group card">
        <Button
          className="settings-entry-row focus-ring"
          aria-label="下载我的数据；计划、投稿与账户设置"
          disabled={dataAction !== null}
          onClick={() => void downloadAccountData()}
        >
          <View className="settings-icon-well settings-icon-well--violet">
            <SemanticIcon name="download" />
          </View>
          <View className="settings-entry-copy">
            <Text className="type-label">下载我的数据</Text>
            <Text className="type-caption">计划、投稿与账户设置</Text>
          </View>
          <View className="settings-entry-meta">
            {dataAction === "EXPORT" ? (
              <Text>生成中…</Text>
            ) : (
              <SemanticIcon name="chevron-right" />
            )}
          </View>
        </Button>
        <Button
          className="settings-entry-row focus-ring"
          aria-label="删除账户；删除后不可恢复"
          disabled={dataAction !== null}
          onClick={() => void deleteAccount()}
        >
          <View className="settings-icon-well settings-icon-well--coral">
            <SemanticIcon name="trash" />
          </View>
          <View className="settings-entry-copy">
            <Text className="type-label">删除账户</Text>
            <Text className="type-caption">
              删除后不可恢复
            </Text>
          </View>
          <View className="settings-entry-meta">
            {dataAction === "DELETE" ? (
              <Text>处理中…</Text>
            ) : (
              <SemanticIcon name="chevron-right" />
            )}
          </View>
        </Button>
      </View>
    </View>
  );
}
