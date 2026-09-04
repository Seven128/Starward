import Taro from "@tarojs/taro";
import { ScrollView, Text, View } from "@tarojs/components";
import type { DisplayMode } from "@starward/miniapp-contracts";
import { useState } from "react";
import { CustomNav } from "@/components/custom-nav";
import { NotificationRegion } from "@/components/notification";
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
import {
  SettingsControls,
  SettingsAccountActions,
} from "./settings-sections";
import { PreferenceFields } from "./preference-fields";
import "./index.scss";

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

  const selectDisplayMode = (next: DisplayMode) => {
    if (next === "OBSERVATION") {
      if (mode !== "OBSERVATION") enterObservation();
      return;
    }
    setMode(next);
    updatePreference("displayMode", next);
    const currentState = useAppStore.getState();
    for (const notification of currentState.notifications) {
      if (
        notification.owner === "settings" &&
        notification.dedupeKey === "settings-observation-mode"
      )
        currentState.dismissNotification(notification.id);
    }
  };

  // Kept as page-local aliases for older callback probes; the rendered
  // control exposes only the single three-state selector above.
  const chooseDisplayMode = (next: Exclude<DisplayMode, "OBSERVATION">) => {
    updatePreference("displayMode", next);
    setMode(next);
    const currentState = useAppStore.getState();
    for (const notification of currentState.notifications) {
      if (
        notification.owner === "settings" &&
        notification.dedupeKey === "settings-observation-mode"
      )
        currentState.dismissNotification(notification.id);
    }
  };
  const toggleObservation = () => {
    if (mode === "OBSERVATION") {
      exitObservation();
      return;
    }
    enterObservation();
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
        back
        backOdId="my-settings-back-action"
        backFallbackTab="/pages/my/index"
      />
      <ScrollView
        scrollY
        enhanced
        bounces={false}
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

          <SettingsControls
            preferences={preferences}
            mode={mode}
            updatePreference={updatePreference}
            selectDisplayMode={selectDisplayMode}
          />

          <SettingsAccountActions
            dataAction={dataAction}
            downloadAccountData={downloadAccountData}
            deleteAccount={deleteAccount}
          />

          <PreferenceFields
            preferences={preferences}
            updatePreference={updatePreference}
          />

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
