import { Button, Label, Switch, Text, View } from "@tarojs/components";
import type { DisplayMode, UserPreferences } from "@starward/miniapp-contracts";
import type { usePreferencesSync } from "@/hooks/use-preferences-sync";
import { SemanticIcon } from "@/components/semantic-asset";

const DISPLAY_MODES: readonly DisplayMode[] = [
  "DAY",
  "NIGHT",
  "OBSERVATION",
];
export const DISPLAY_MODE_LABEL: Record<DisplayMode, string> = {
  DAY: "日间",
  NIGHT: "夜间",
  OBSERVATION: "观测红光",
};

type SettingsControlsProps = {
  preferences: UserPreferences;
  mode: DisplayMode;
  updatePreference: ReturnType<typeof usePreferencesSync>["updatePreference"];
  selectDisplayMode: (mode: DisplayMode) => void;
};

export function SettingsControls({
  preferences,
  mode,
  updatePreference,
  selectDisplayMode,
}: SettingsControlsProps) {
  return (
    <>
      <View
        className="settings-section"
        data-od-id="display-mode-switcher"
        data-control="display-mode-switcher"
        role="radiogroup"
        aria-label="显示模式"
      >
        <Text className="type-section">显示模式</Text>
        <View
          className="settings-display-mode-track"
          data-selected-mode={mode.toLowerCase()}
        >
          <View className="settings-display-mode-thumb" aria-hidden="true" />
            {DISPLAY_MODES.map((item) => (
              <Button
                key={item}
                className={`settings-display-mode-choice focus-ring${mode === item ? " settings-display-mode-choice--selected" : ""}`}
                data-mode={item.toLowerCase()}
                aria-pressed={mode === item}
                aria-label={`切换为${DISPLAY_MODE_LABEL[item]}模式`}
                onClick={() => selectDisplayMode(item)}
              >
                <SemanticIcon
                  name={item === "DAY" ? "sun" : item === "NIGHT" ? "moon" : "star"}
                />
                <Text>{DISPLAY_MODE_LABEL[item]}</Text>
              </Button>
            ))}
        </View>
      </View>

      <View
        id="settings-permissions"
        className="settings-section"
        data-od-id="settings-permissions"
      >
        <Text className="type-section">权限与隐私</Text>
        <View className="settings-card settings-card--group card">
          <Label
            id="nearby-location-preference"
            className="setting-row"
            data-od-id="nearby-location-preference"
          >
            <View>
              <Text className="type-label">附近地点</Text>
              <Text className="type-caption">
                仅在地图需要定位时询问，可随时改为手动位置
              </Text>
            </View>
            <Switch
              checked={preferences.locationPreference === "ASK_ONCE"}
              color="var(--positive)"
              aria-label="允许地图在需要时询问一次位置"
              onChange={(event) =>
                updatePreference(
                  "locationPreference",
                  event.detail.value ? "ASK_ONCE" : "MANUAL_ONLY",
                )
              }
            />
          </Label>
          <View className="setting-row">
            <View>
              <Text className="type-label">方位天空</Text>
              <Text className="type-caption">
                只在方位页前台读取方向，不上传传感器流
              </Text>
            </View>
            <Text className="settings-state-pill">按页使用</Text>
          </View>
          <View className="setting-row">
            <View>
              <Text className="type-label">精确位置投稿</Text>
              <Text className="type-caption">
                仅新增地点逐次确认，不与地图定位共用许可
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
        <Text className="type-section">提醒</Text>
        <View className="settings-card settings-card--group card">
          <Label
            id="departure-condition-reminder"
            className="setting-row"
            data-od-id="departure-condition-reminder"
          >
            <View>
              <Text className="type-label">出发前条件复核</Text>
              <Text className="type-caption">
                保存提醒意愿；仅针对已创建的今晚计划
              </Text>
            </View>
            <Switch
              checked={preferences.departureConditionReminder}
              color="var(--positive)"
              aria-label="出发前条件复核提醒"
              onChange={(event) =>
                updatePreference(
                  "departureConditionReminder",
                  event.detail.value,
                )
              }
            />
          </Label>
          <Label
            id="contribution-status-reminder"
            className="setting-row"
            data-od-id="contribution-status-reminder"
          >
            <View>
              <Text className="type-label">投稿状态变化</Text>
              <Text className="type-caption">
                保存退回补充、接收与拒绝的提醒意愿
              </Text>
            </View>
            <Switch
              checked={preferences.contributionStatusReminder}
              color="var(--positive)"
              aria-label="投稿状态变化提醒"
              onChange={(event) =>
                updatePreference(
                  "contributionStatusReminder",
                  event.detail.value,
                )
              }
            />
          </Label>
        </View>
        <Text className="type-caption settings-capability-note">
          保存意愿不等于微信订阅成功；平台能力接入后仍以授权回执为准。
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
          aria-label="删除账户；先说明影响，再进行身份确认"
          disabled={dataAction !== null}
          onClick={() => void deleteAccount()}
        >
          <View className="settings-icon-well settings-icon-well--coral">
            <SemanticIcon name="trash" />
          </View>
          <View className="settings-entry-copy">
            <Text className="type-label">删除账户</Text>
            <Text className="type-caption">
              先说明影响，再进行身份确认
            </Text>
          </View>
          <View className="settings-entry-meta">
            {dataAction === "DELETE" ? (
              <Text>删除中…</Text>
            ) : (
              <SemanticIcon name="chevron-right" />
            )}
          </View>
        </Button>
      </View>
    </View>
  );
}
