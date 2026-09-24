import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidHide } from "@tarojs/taro";
import { ScrollView, View } from "@tarojs/components";
import type { DisplayMode } from "@starward/miniapp-contracts";
import { useEffect, useRef, useState } from "react";
import { CustomNav } from "@/components/custom-nav";
import { NotificationRegion } from "@/components/notification";
import { StatusPanel } from "@/components/status-panel";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import { usePreferencesSync } from "@/hooks/use-preferences-sync";
import { useThemeClass } from "@/hooks/use-theme";
import {
  deleteAccount as deleteAccountThroughApi,
  clearTemporaryApiCache,
  errorMessage,
  exportAccountData,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import {
  SettingsControls,
  SettingsDataActions,
  type SettingsSheetKind,
} from "./settings-sections";
import { SettingsSheet, type OpenSettingsSheet } from "./settings-sheet";
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

function removeJsonFile(filePath: string) {
  return new Promise<void>((resolve, reject) => {
    Taro.getFileSystemManager().unlink({
      filePath,
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
  const clearLocalCache = useAppStore((state) => state.clearLocalCache);
  const resetAfterAccountDeletion = useAppStore(
    (state) => state.resetAfterAccountDeletion,
  );
  const notify = useAppStore((state) => state.notify);
  const [dataAction, setDataAction] = useState<"CACHE" | "EXPORT" | "DELETE" | null>(null);
  const [sheet, setSheet] = useState<OpenSettingsSheet | null>(null);
  const [sheetClosing, setSheetClosing] = useState(false);
  const sheetCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountActionPending = useRef(false);
  const [modeGestureCaptured, setModeGestureCaptured] = useState(false);
  const {
    updatePreference,
    syncNow,
    status: preferenceSyncStatus,
  } = usePreferencesSync();
  const needsAccountRecovery = preferenceSyncStatus.startsWith("账户尚未恢复");
  const canRetryPreferenceSync = preferenceSyncStatus.includes("仅保存在本机") ||
    preferenceSyncStatus.includes("等待重试");

  useEffect(() => () => { if (sheetCloseTimer.current) clearTimeout(sheetCloseTimer.current); }, []);
  useDidHide(() => {
    if (sheetCloseTimer.current) clearTimeout(sheetCloseTimer.current);
    sheetCloseTimer.current = null;
    setSheetClosing(false);
    setSheet(null);
  });

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

  const downloadAccountData = async () => {
    if (accountActionPending.current) return;
    accountActionPending.current = true;
    setDataAction("EXPORT");
    let filePath: string | null = null;
    let fileWritten = false;
    try {
      const response = await exportAccountData();
      const root = Taro.env.USER_DATA_PATH;
      if (!root) throw new Error("user_data_path_unavailable");
      const fileName = `starward-account-${response.data.generatedAt
        .replace(/[:.]/gu, "-")}.json`;
      const destination = `${root}/${fileName}`;
      filePath = destination;
      await writeJsonFile(destination, JSON.stringify(response.data, null, 2));
      fileWritten = true;
      await Taro.shareFileMessage({ filePath, fileName });
      const currentState = useAppStore.getState();
      for (const notification of currentState.notifications) {
        if (notification.owner === "settings" && notification.dedupeKey === "settings-account-export-failed")
          currentState.dismissNotification(notification.id);
      }
      notify({
        owner: "settings",
        placement: "floating",
        tone: "success",
        title: "账户数据已生成",
        body: "账户数据文件已分享。",
        dismissible: true,
        dedupeKey: "settings-account-exported",
      });
    } catch (error) {
      let cleanupFailed = false;
      if (filePath) {
        try { await removeJsonFile(filePath); }
        catch { cleanupFailed = true; }
      }
      notify({
        owner: "settings",
        placement: "inline",
        tone: fileWritten || cleanupFailed ? "warning" : "error",
        title: cleanupFailed ? "本机临时文件未清除" : fileWritten ? "文件分享未完成" : "账户数据导出失败",
        body: cleanupFailed
          ? "账户数据可能仍留在本机临时文件中；请通过微信清理本小程序的数据后重试。"
          : fileWritten
            ? "微信文件分享未完成；已清理本次临时文件，可重新下载。"
            : errorMessage(error),
        dismissible: true,
        dedupeKey: "settings-account-export-failed",
      });
    } finally {
      accountActionPending.current = false;
      setDataAction(null);
      setSheet(null);
    }
  };

  const clearCache = async () => {
    if (accountActionPending.current) return;
    accountActionPending.current = true;
    setDataAction("CACHE");
    try {
      const [, stateSaved] = await Promise.all([clearTemporaryApiCache(), clearLocalCache()]);
      if (!stateSaved) throw new Error("local_state_cleanup_incomplete");
      notify({ owner: "settings", placement: "floating", tone: "success",
        title: "临时缓存已清除",
        body: "本地地图、筛选、搜索与夜空临时缓存已清除；远端数据和草稿保持不变。",
        dismissible: true, dedupeKey: "settings-cache-cleared" });
    } catch {
      notify({ owner: "settings", placement: "inline", tone: "warning",
        title: "临时缓存尚未清完",
        body: "当前地图状态已重置，但本地存储清理失败。请稍后重试，或通过微信清理本小程序的数据。",
        dismissible: true, dedupeKey: "settings-cache-cleanup-incomplete" });
    } finally {
      accountActionPending.current = false;
      setDataAction(null);
      setSheet(null);
    }
  };

  const deleteAccount = async () => {
    if (accountActionPending.current) return;
    accountActionPending.current = true;
    setDataAction("DELETE");
    let accountDeleted = false;
    let localCleanupComplete = true;
    try {
      const response = await deleteAccountThroughApi();
      accountDeleted = true;
      localCleanupComplete = response.localCleanupComplete;
      if (!response.localAccountReset) {
        notify({ owner: "settings", placement: "inline", tone: localCleanupComplete ? "success" : "warning",
          title: "原账户已删除", body: localCleanupComplete
            ? "当前页面状态已保留。"
            : "当前账号已保留。原账户的本地数据未能全部清除，请通过微信清理本小程序的数据后重新进入。", dismissible: true,
          dedupeKey: "settings-account-deleted" });
        return;
      }
      localCleanupComplete = resetAfterAccountDeletion() && localCleanupComplete;
      await Taro.showModal({
        title: "账户已删除",
        content:
          !localCleanupComplete
            ? "账户和会话已在服务端撤销，本地数据未能全部清除。请通过微信清理本小程序的数据后重新进入。"
            : response.data.mediaCleanupState === "QUEUED"
            ? "身份和会话已撤销；投稿媒体清理已进入可靠队列。"
            : "身份、会话和可删除账户数据已移除。",
        showCancel: false,
        confirmText: "完成",
      });
      await Taro.reLaunch({ url: "/pages/auth/index?accountDeleted=1" });
    } catch (error) {
      notify({
        owner: "settings",
        placement: "inline",
        tone: "error",
        title: accountDeleted ? "账户已删除，页面尚未关闭" : "账户未删除",
        body: accountDeleted
          ? localCleanupComplete
            ? "账户删除已完成，本机会话已清除。请退出小程序后重新进入。"
            : "账户删除已完成，本地数据未能全部清除。请通过微信清理本小程序的数据后重新进入。"
          : `${errorMessage(error)}；本机状态和登录会话保持不变，可重试。`,
        dismissible: true,
        dedupeKey: "settings-account-delete-failed",
      });
    } finally {
      accountActionPending.current = false;
      setDataAction(null);
      setSheet(null);
    }
  };

  const openSheet = (kind: SettingsSheetKind) => {
    if (accountActionPending.current) return;
    if (sheetCloseTimer.current) clearTimeout(sheetCloseTimer.current);
    sheetCloseTimer.current = null;
    setSheetClosing(false);
    setSheet(kind);
  };
  const closeSheet = () => {
    if (accountActionPending.current || !sheet || sheetClosing) return;
    setSheetClosing(true);
    sheetCloseTimer.current = setTimeout(() => {
      sheetCloseTimer.current = null;
      setSheet(null);
      setSheetClosing(false);
    }, preferences.reducedMotion ? 0 : 180);
  };

  return (
    <View
      className={`${themeClass} settings-page`}
      data-route="my-settings"
      data-od-id="my-settings"
    >
      <FloatingNotificationHost />
      <NativeBackBoundary active={Boolean(sheet)} onBack={closeSheet} />
      <CustomNav
        title="设置"
        back
        backOdId="my-settings-back-action"
        backFallbackTab="/pages/my/index"
        beforeBack={() => {
          if (!sheet || accountActionPending.current) return !accountActionPending.current;
          closeSheet();
          return false;
        }}
      />
      <ScrollView
        scrollY={!modeGestureCaptured}
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
                needsAccountRecovery ||
                preferenceSyncStatus.includes("仅保存在本机") ||
                preferenceSyncStatus.includes("云端偏好已有更新")
                  ? "STALE"
                  : "READY"
              }
              detail={preferenceSyncStatus}
              recoveryLabel={needsAccountRecovery ? "返回我的" : canRetryPreferenceSync ? "重试同步" : undefined}
              onRecover={needsAccountRecovery
                ? () => void Taro.switchTab({ url: "/pages/my/index" })
                : canRetryPreferenceSync ? () => void syncNow() : undefined}
            />
          ) : null}

          <SettingsControls
            preferences={preferences}
            mode={mode}
            updatePreference={updatePreference}
            selectDisplayMode={selectDisplayMode}
            onModeGestureCapture={setModeGestureCaptured}
            openSheet={openSheet}
          />

          <SettingsDataActions dataAction={dataAction} openSheet={openSheet} />
        </View>
      </ScrollView>
      {sheet ? <SettingsSheet sheet={sheet} mode={mode} locationPreference={preferences.locationPreference}
        closing={sheetClosing}
        busy={dataAction !== null}
        close={closeSheet}
        selectLocation={(value) => { updatePreference("locationPreference", value); closeSheet(); }}
        advanceDelete={() => setSheet("DELETE_FINAL")}
        confirmCache={() => void clearCache()}
        confirmExport={() => void downloadAccountData()}
        confirmDelete={() => void deleteAccount()} /> : null}
    </View>
  );
}
