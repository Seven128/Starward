import Taro from "@tarojs/taro";
import {
  Button,
  Input,
  Label,
  ScrollView,
  Slider,
  Switch,
  Text,
  View,
} from "@tarojs/components";
import type { DisplayMode, FacilityType } from "@starward/miniapp-contracts";
import { useState } from "react";
import { CustomNav } from "@/components/custom-nav";
import { NotificationRegion } from "@/components/notification";
import { SemanticIcon } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { usePreferencesSync } from "@/hooks/use-preferences-sync";
import { useThemeClass } from "@/hooks/use-theme";
import {
  deleteAccount as deleteAccountThroughApi,
  errorMessage,
  exportAccountData,
} from "@/services/api-client";
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

function writeJsonFile(filePath: string, data: string) {
  return new Promise<void>((resolve, reject) => {
    Taro.getFileSystemManager().writeFile({
      filePath,
      data,
      encoding: "utf8",
      success: () => resolve(),
      fail: (result) => reject(new Error(result.errMsg)),
    });
  });
}

export default function SettingsPage() {
  const themeClass = useThemeClass();
  const preferences = useAppStore((state) => state.preferences);
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const enterObservation = useAppStore((state) => state.enterObservation);
  const exitObservation = useAppStore((state) => state.exitObservation);
  const clearLocalCache = useAppStore((state) => state.clearLocalCache);
  const resetAfterAccountDeletion = useAppStore(
    (state) => state.resetAfterAccountDeletion,
  );
  const notify = useAppStore((state) => state.notify);
  const [dataAction, setDataAction] = useState<"EXPORT" | "DELETE" | null>(null);
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

  const downloadAccountData = async () => {
    if (dataAction) return;
    setDataAction("EXPORT");
    let filePath: string | null = null;
    try {
      const response = await exportAccountData();
      const root = Taro.env.USER_DATA_PATH;
      if (!root) throw new Error("user_data_path_unavailable");
      const fileName = `starward-account-${response.data.generatedAt
        .replace(/[:.]/gu, "-")}.json`;
      filePath = `${root}/${fileName}`;
      await writeJsonFile(filePath, JSON.stringify(response.data, null, 2));
      await Taro.shareFileMessage({ filePath, fileName });
      notify({
        owner: "settings",
        placement: "floating",
        tone: "success",
        title: "账户数据已生成",
        body: "已通过微信文件分享交付当前服务端数据快照。",
        dismissible: true,
        dedupeKey: "settings-account-exported",
      });
    } catch (error) {
      notify({
        owner: "settings",
        placement: "inline",
        tone: filePath ? "warning" : "error",
        title: filePath ? "文件已生成，尚未分享" : "账户数据导出失败",
        body: filePath
          ? "微信文件分享未完成；可再次点击下载并重试。"
          : `${errorMessage(error)}；没有用本地缓存拼接替代导出。`,
        dismissible: true,
        dedupeKey: "settings-account-export-failed",
      });
    } finally {
      setDataAction(null);
    }
  };

  const deleteAccount = async () => {
    if (dataAction) return;
    const first = await Taro.showModal({
      title: "删除账户？",
      content:
        "将撤销微信身份关联和全部会话，并删除偏好、收藏、计划、主页链接、导入草稿与投稿媒体。去身份化审核、合并、发布和审计证据会按完整性要求保留。",
      confirmText: "继续",
      confirmColor: "#B53A3A",
    });
    if (!first.confirm) return;
    const final = await Taro.showModal({
      title: "最后确认",
      content: "此操作不可撤销。删除后再次使用会创建一个全新账户。",
      confirmText: "删除账户",
      confirmColor: "#B53A3A",
    });
    if (!final.confirm) return;
    setDataAction("DELETE");
    try {
      const response = await deleteAccountThroughApi();
      await Taro.showModal({
        title: "账户已删除",
        content:
          response.data.mediaCleanupState === "QUEUED"
            ? "身份和会话已撤销；投稿媒体清理已进入可靠队列。"
            : "身份、会话和可删除账户数据已移除。",
        showCancel: false,
        confirmText: "完成",
      });
      resetAfterAccountDeletion();
      await Taro.reLaunch({ url: "/pages/auth/index?accountDeleted=1" });
    } catch (error) {
      notify({
        owner: "settings",
        placement: "inline",
        tone: "error",
        title: "账户未删除",
        body: `${errorMessage(error)}；本机状态和登录会话保持不变，可重试。`,
        dismissible: true,
        dedupeKey: "settings-account-delete-failed",
      });
    } finally {
      setDataAction(null);
    }
  };

  return (
    <View
      className={`${themeClass} settings-page`}
      data-route="my-settings"
      data-od-id="my-settings"
    >
      <CustomNav
        title="设置"
        subtitle="显示、权限与数据"
        back
        backOdId="my-settings-back-action"
        backFallbackTab="/pages/my/index"
      />
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
            className="settings-section"
            data-od-id="display-mode-switcher"
          >
            <Text className="type-section">显示模式</Text>
            <View className="settings-card card">
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
                <Button
                  className={`chip observation-mode-entry focus-ring${mode === "OBSERVATION" ? " chip--selected" : ""}`}
                  data-od-id="observation-mode-entry"
                  aria-pressed={mode === "OBSERVATION"}
                  aria-label={
                    mode === "OBSERVATION" ? "退出观测红模式" : "进入观测红模式"
                  }
                  onClick={toggleObservation}
                >
                  <Text>{mode === "OBSERVATION" ? "退出红光" : "观测红光"}</Text>
                </Button>
              </View>
              <Text className="type-caption">
                观测红光是封闭显示模式；退出后精确恢复此前日间/夜间与任务上下文。
              </Text>
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
                <SoftButton
                  label="查看方位与定位权限说明"
                  onClick={() => Taro.navigateTo({ url: "/pages/auth/index" })}
                >
                  按页使用
                </SoftButton>
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

          <View
            id="settings-form"
            className="settings-card card"
            data-od-id="settings-form"
          >
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
          </View>

          <View className="settings-card settings-maintenance card">
            <Text className="type-section">本机维护</Text>
            <View className="settings-card--actions">
              <SoftButton
                label="立即同步当前账户偏好"
                onClick={() => void syncNow()}
              >
                同步账户偏好
              </SoftButton>
              <SoftButton
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
        </View>
      </ScrollView>
    </View>
  );
}
