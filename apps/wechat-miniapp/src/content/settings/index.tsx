import Taro from "@tarojs/taro";
import {
  Button,
  Input,
  ScrollView,
  Slider,
  Switch,
  Text,
  View,
} from "@tarojs/components";
import type { DisplayMode, FacilityType } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { NotificationRegion } from "@/components/notification";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { usePreferencesSync } from "@/hooks/use-preferences-sync";
import { useThemeClass } from "@/hooks/use-theme";
import { useAppStore } from "@/state/app-store";
import "./index.scss";

const DISPLAY_MODES: readonly Exclude<DisplayMode, "OBSERVATION">[] = [
  "DAY",
  "NIGHT",
];
const DISPLAY_MODE_LABEL = { DAY: "日间", NIGHT: "夜间" } as const;
const FACILITY_PREFERENCES: ReadonlyArray<{
  key: FacilityType;
  label: string;
}> = [
  { key: "PARKING", label: "停车" },
  { key: "TOILET", label: "厕所" },
  { key: "PLATFORM", label: "平台" },
  { key: "CHARGING", label: "充电" },
  { key: "SIGNAL", label: "信号" },
];

export default function SettingsPage() {
  const themeClass = useThemeClass();
  const preferences = useAppStore((state) => state.preferences);
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const enterObservation = useAppStore((state) => state.enterObservation);
  const exitObservation = useAppStore((state) => state.exitObservation);
  const clearLocalCache = useAppStore((state) => state.clearLocalCache);
  const notify = useAppStore((state) => state.notify);
  const {
    updatePreference,
    syncNow,
    status: preferenceSyncStatus,
  } = usePreferencesSync();

  const chooseDisplayMode = (next: Exclude<DisplayMode, "OBSERVATION">) => {
    updatePreference("displayMode", next);
    setMode(next);
    notify({
      owner: "settings",
      placement: "floating",
      tone: "success",
      title: `已切换为${DISPLAY_MODE_LABEL[next]}`,
      body: "当前路由、选中地点、筛选草稿和焦点上下文保持不变。",
      dismissible: true,
      dedupeKey: "settings-display-mode",
    });
  };

  const toggleObservation = () => {
    if (mode === "OBSERVATION") {
      exitObservation();
      notify({
        owner: "settings",
        placement: "inline",
        tone: "success",
        title: "已退出观测红模式",
        body: "已恢复进入前的日间或夜间模式，设置页与待处理上下文保持原位。",
        dismissible: true,
        dedupeKey: "settings-observation-exit",
      });
      return;
    }
    enterObservation();
    notify({
      owner: "settings",
      placement: "inline",
      tone: "warning",
      title: "观测红模式已开启",
      body: "界面保持纯黑与暖红；媒体默认不自动点亮，退出会恢复此前显示模式。",
      dismissible: true,
      dedupeKey: "settings-observation-enter",
    });
  };

  return (
    <View
      className={`${themeClass} settings-page`}
      data-route="my-settings"
      data-od-id="my-settings"
    >
      <CustomNav title="设置" back backOdId="my-settings-back-action" />
      <ScrollView
        scrollY
        enhanced
        showScrollbar={false}
        className="settings-page__scroll hide-scrollbar"
      >
        <View className="settings-content page-inset safe-bottom">
          <NotificationRegion owner="settings" placement="inline" />
          {preferenceSyncStatus ? (
            <StatusPanel
              state={
                preferenceSyncStatus.includes("仅保存在本机") ||
                preferenceSyncStatus.includes("已有新修订")
                  ? "STALE"
                  : "READY"
              }
              detail={preferenceSyncStatus}
              recoveryLabel={
                preferenceSyncStatus.includes("仅保存在本机") ||
                preferenceSyncStatus.includes("等待重试")
                  ? "重试同步"
                  : undefined
              }
              onRecover={
                preferenceSyncStatus.includes("仅保存在本机") ||
                preferenceSyncStatus.includes("等待重试")
                  ? () => void syncNow()
                  : undefined
              }
            />
          ) : null}

          <View
            className="settings-card card"
            data-od-id="display-mode-switcher"
          >
            <Text className="type-section">显示模式</Text>
            <View className="settings-choice-grid">
              {DISPLAY_MODES.map((item) => (
                <Button
                  key={item}
                  className={`chip focus-ring${mode === item ? " chip--selected" : ""}`}
                  aria-pressed={mode === item}
                  onClick={() => chooseDisplayMode(item)}
                >
                  <Text>{DISPLAY_MODE_LABEL[item]}</Text>
                </Button>
              ))}
            </View>
            <View
              className="observation-setting"
              data-od-id="observation-mode-entry"
            >
              <View>
                <Text className="type-label">观测红模式</Text>
                <Text className="type-caption">
                  唯一显式入口；退出精确恢复此前日间/夜间与任务上下文
                </Text>
              </View>
              <Button
                className={`chip focus-ring${mode === "OBSERVATION" ? " chip--selected" : ""}`}
                aria-pressed={mode === "OBSERVATION"}
                aria-label={
                  mode === "OBSERVATION" ? "退出观测红模式" : "进入观测红模式"
                }
                onClick={toggleObservation}
              >
                <Text>{mode === "OBSERVATION" ? "退出观测" : "进入观测"}</Text>
              </Button>
            </View>
          </View>

          <View className="settings-card card" data-od-id="settings-form">
            <Text className="type-section">选点偏好</Text>
            <View className="form-group">
              <Text className="type-label">默认城市或地点</Text>
              <Input
                className="field"
                value={preferences.defaultPlace}
                maxlength={80}
                aria-label="默认城市或地点"
                placeholder="例如：深圳"
                onInput={(event) =>
                  updatePreference("defaultPlace", event.detail.value)
                }
              />
            </View>
            <View className="form-group">
              <Text className="type-label">经验水平</Text>
              <View className="settings-choice-grid">
                {(["BEGINNER", "ADVANCED"] as const).map((level) => (
                  <Button
                    key={level}
                    className={`chip focus-ring${preferences.experience === level ? " chip--selected" : ""}`}
                    aria-pressed={preferences.experience === level}
                    onClick={() => updatePreference("experience", level)}
                  >
                    <Text>{level === "BEGINNER" ? "入门" : "进阶"}</Text>
                  </Button>
                ))}
              </View>
            </View>
            <View className="form-group">
              <View className="settings-summary-row">
                <Text className="type-label">最长驾车时间</Text>
                <Text className="type-data">
                  {preferences.maxDriveMinutes} 分钟
                </Text>
              </View>
              <Slider
                min={30}
                max={360}
                step={30}
                value={preferences.maxDriveMinutes}
                activeColor="var(--primary)"
                backgroundColor="var(--border)"
                blockColor="var(--primary)"
                blockSize={24}
                aria-label="最长驾车时间"
                onChange={(event) =>
                  updatePreference("maxDriveMinutes", event.detail.value)
                }
              />
              <Text className="type-caption">
                无许可路线供应商时只保留偏好，不把直线距离冒充驾车时间。
              </Text>
            </View>
            <View className="form-group">
              <Text className="type-label">必须设施</Text>
              <View className="facility-choice-grid">
                {FACILITY_PREFERENCES.map(({ key, label }) => {
                  const selected = preferences.requiredFacilities.includes(key);
                  return (
                    <Button
                      key={key}
                      className={`chip focus-ring${selected ? " chip--selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() =>
                        updatePreference(
                          "requiredFacilities",
                          selected
                            ? preferences.requiredFacilities.filter(
                                (facility) => facility !== key,
                              )
                            : [...preferences.requiredFacilities, key],
                        )
                      }
                    >
                      <Text>{label}</Text>
                    </Button>
                  );
                })}
              </View>
            </View>
          </View>

          <View className="settings-card card">
            <Text className="type-section">可访问性</Text>
            <View className="setting-row">
              <View>
                <Text className="type-label">大字模式</Text>
                <Text className="type-caption">
                  内容重排，不产生页面横向滚动
                </Text>
              </View>
              <Switch
                checked={preferences.largeText}
                color="var(--primary)"
                aria-label="大字模式"
                onChange={(event) =>
                  updatePreference("largeText", event.detail.value)
                }
              />
            </View>
            <View className="setting-row">
              <View>
                <Text className="type-label">减少动态</Text>
                <Text className="type-caption">
                  即时或不超过 100ms 的等价反馈
                </Text>
              </View>
              <Switch
                checked={preferences.reducedMotion}
                color="var(--primary)"
                aria-label="减少动态"
                onChange={(event) =>
                  updatePreference("reducedMotion", event.detail.value)
                }
              />
            </View>
            <View className="setting-row">
              <View>
                <Text className="type-label">通知与订阅</Text>
                <Text className="type-caption">能力未接入，不伪装已订阅</Text>
              </View>
              <Switch
                checked={false}
                disabled
                aria-label="通知能力当前不可用"
              />
            </View>
          </View>

          <View className="settings-card card">
            <Text className="type-section">位置、隐私与数据</Text>
            <View className="settings-choice-grid">
              {(["ASK_ONCE", "MANUAL_ONLY"] as const).map((choice) => (
                <Button
                  key={choice}
                  className={`chip focus-ring${preferences.locationPreference === choice ? " chip--selected" : ""}`}
                  aria-pressed={preferences.locationPreference === choice}
                  onClick={() => updatePreference("locationPreference", choice)}
                >
                  <Text>
                    {choice === "ASK_ONCE" ? "需要时询问一次" : "仅手动位置"}
                  </Text>
                </Button>
              ))}
            </View>
            <SoftButton
              label="打开定位权限说明"
              onClick={() => Taro.navigateTo({ url: "/pages/auth/index" })}
            >
              定位与手动回退
            </SoftButton>
            <SoftButton
              variant="danger"
              label="清除本地地图、筛选、搜索和夜空缓存"
              onClick={() =>
                void Taro.showModal({
                  title: "清除本地数据？",
                  content:
                    "将清除本机地图视口、筛选、搜索记录与夜空临时缓存；收藏、计划、主页链接和导入草稿不会被删除。",
                  confirmText: "清除",
                  confirmColor: "#B53A3A",
                }).then((result) => result.confirm && clearLocalCache())
              }
            >
              清除临时缓存
            </SoftButton>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
