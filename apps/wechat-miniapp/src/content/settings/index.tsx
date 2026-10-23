import { openPrimaryPage } from "@/navigation/primary-page-navigation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { SystemMotionProbe } from "@/components/system-motion-probe";
import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { ScrollView, View } from "@tarojs/components";
import type { DisplayMode } from "@starward/miniapp-contracts";
import { useEffect, useRef, useState } from "react";
import { CustomNav } from "@/components/custom-nav";
import { NotificationRegion } from "@/components/notification";
import { StatusPanel } from "@/components/status-panel";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import { usePreferencesSync } from "@/hooks/use-preferences-sync";
import { useWechatLogin } from "@/hooks/use-wechat-login";
import { usePageNavigation } from "@/hooks/use-page-navigation";
import { useMotionThemeClass as useThemeClass } from "@/hooks/use-theme";
import {
  deleteAccount as deleteAccountThroughApi,
  clearTemporaryApiCache,
  currentDraftUserId,
  errorMessage,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import {
  SettingsControls,
  SettingsDataActions,
  type SettingsSheetKind,
} from "./settings-sections";
import { SettingsSheet, type OpenSettingsSheet } from "./settings-sheet";
import { useAccountExport } from "./use-account-export";
import { useSettingsPreferences } from "./use-settings-preferences";
import "./index.scss";

export default function SettingsPage() {
  const login = useWechatLogin({ nativeBack: false });
  const navigation = usePageNavigation();
  const themeClass = useThemeClass();
  const reducedMotion = useReducedMotion();
  const preferences = useAppStore((state) => state.preferences);
  const locationState = useAppStore((state) => state.locationState);
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const enterObservation = useAppStore((state) => state.enterObservation);
  const clearLocalCache = useAppStore((state) => state.clearLocalCache);
  const notify = useAppStore((state) => state.notify);
  const [dataAction, setDataAction] = useState<"CACHE" | "EXPORT" | "DELETE" | null>(null);
  const [sheet, setSheet] = useState<OpenSettingsSheet | null>(null);
  const [sheetClosing, setSheetClosing] = useState(false);
  const sheetCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountActionPending = useRef(false);
  const deletionCleanup = useRef<{ userId: string; retry: () => Promise<boolean> } | null>(null);
  const [deletionCleanupPending, setDeletionCleanupPending] = useState(false);
  const pageAlive = useRef(true);
  const pageVisible = useRef(true);
  const cacheAttempt = useRef<{ owner: string | null; active: boolean } | null>(null);
  const deletionAttempt = useRef<{
    owner: string | null;
    active: boolean;
    requesting: boolean;
    clearingOwnAccount: boolean;
    clearedOwnAccount: boolean;
  } | null>(null);
  const [modeGestureCaptured, setModeGestureCaptured] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const {
    updatePreference,
    syncNow,
    status: preferenceSyncStatus,
  } = usePreferencesSync();
  const accountExport = useAccountExport(busy => {
    accountActionPending.current = busy;
    if (pageAlive.current) setDataAction(busy ? "EXPORT" : null);
  });
  const settingsPreferences = useSettingsPreferences();
  const needsAccountRecovery = preferenceSyncStatus.startsWith("账户尚未恢复");
  const canRetryPreferenceSync = preferenceSyncStatus.includes("仅保存在本机") ||
    preferenceSyncStatus.includes("等待重试");

  useEffect(() => {
    pageAlive.current = true;
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (state.accountOwnerId !== previous.accountOwnerId || state.mapResetVersion !== previous.mapResetVersion)
        navigation.retire();
      if (cacheAttempt.current && state.accountOwnerId !== previous.accountOwnerId)
        cacheAttempt.current.active = false;
      if (deletionCleanup.current && state.accountOwnerId !== null &&
        state.accountOwnerId !== deletionCleanup.current.userId) {
        deletionCleanup.current = null;
        setDeletionCleanupPending(false);
        setSheet(null);
      }
      const deletion = deletionAttempt.current;
      if (deletion?.active && state.accountOwnerId !== previous.accountOwnerId) {
        if (deletion.clearingOwnAccount && !deletion.clearedOwnAccount &&
          previous.accountOwnerId === deletion.owner && state.accountOwnerId === null) {
          deletion.clearedOwnAccount = true;
        } else if (deletion.requesting && previous.accountOwnerId === null &&
          state.accountOwnerId !== null && deletion.owner === null) {
          deletion.owner = state.accountOwnerId;
        } else deletion.active = false;
      }
    });
    return () => {
      pageAlive.current = false;
      pageVisible.current = false;
      if (cacheAttempt.current) cacheAttempt.current.active = false;
      if (deletionAttempt.current) deletionAttempt.current.active = false;
      unsubscribe();
      if (sheetCloseTimer.current) clearTimeout(sheetCloseTimer.current);
    };
  }, []);
  useDidShow(() => {
    pageVisible.current = true;
    if (deletionCleanup.current && useAppStore.getState().accountOwnerId === null) setSheet("DELETE_CLEANUP");
  });
  useDidHide(() => {
    pageVisible.current = false;
    if (cacheAttempt.current) cacheAttempt.current.active = false;
    if (deletionAttempt.current) deletionAttempt.current.active = false;
    if (accountExport.handingOff()) return;
    accountExport.close();
    if (sheetCloseTimer.current) clearTimeout(sheetCloseTimer.current);
    sheetCloseTimer.current = null;
    setSheetClosing(false);
    setSheet(null);
  });

  const selectDisplayMode = (next: DisplayMode) => {
    if (next === mode) return;
    if (next === "OBSERVATION") {
      enterObservation();
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
    if (accountActionPending.current || deletionCleanup.current || !pageAlive.current || !pageVisible.current) return;
    await accountExport.prepare();
  };

  const clearCache = async () => {
    if (accountActionPending.current || deletionCleanup.current || !pageAlive.current || !pageVisible.current) return;
    const attempt = { owner: currentDraftUserId(), active: true };
    cacheAttempt.current = attempt;
    const canApply = () => {
      if (!pageAlive.current || !pageVisible.current || !attempt.active || cacheAttempt.current !== attempt) return false;
      const owner = currentDraftUserId();
      return pageAlive.current && pageVisible.current && attempt.active && cacheAttempt.current === attempt &&
        owner === attempt.owner;
    };
    accountActionPending.current = true;
    setDataAction("CACHE");
    const currentState = useAppStore.getState();
    for (const notification of currentState.notifications) {
      if (notification.owner === "settings" && ["settings-cache-cleared", "settings-cache-cleanup-incomplete"].includes(notification.dedupeKey ?? ""))
        currentState.dismissNotification(notification.id);
    }
    try {
      const [responseResult, stateResult] = await Promise.allSettled([clearTemporaryApiCache(), clearLocalCache()]);
      if (!canApply()) return;
      const responseCleared = responseResult.status === "fulfilled";
      const stateSaved = stateResult.status === "fulfilled" && stateResult.value;
      if (responseCleared && stateSaved) {
        notify({ owner: "settings", placement: "floating", tone: "success",
          title: "临时缓存已清除",
          body: "远端数据和草稿保持不变。",
          dismissible: true, dedupeKey: "settings-cache-cleared" });
      } else {
        notify({ owner: "settings", placement: "inline", tone: "warning",
          title: stateSaved ? "响应缓存尚未清完" : responseCleared ? "本机状态尚未清完" : "临时缓存尚未清完",
          body: stateSaved
            ? "本机地图状态已重置，部分响应缓存可能仍有残留。请在下方重新点击清理本机缓存，或通过微信清理本小程序的数据。"
            : responseCleared
              ? "响应缓存已清除，本机状态未能完整保存清理结果。请在下方重新点击清理本机缓存，或通过微信清理本小程序的数据。"
              : "本机状态与响应缓存可能仍有残留。请在下方重新点击清理本机缓存，或通过微信清理本小程序的数据。",
          dismissible: true, dedupeKey: "settings-cache-cleanup-incomplete" });
        setScrollTop(0);
      }
    } catch {
      if (!canApply()) return;
      notify({ owner: "settings", placement: "inline", tone: "warning",
        title: "临时缓存尚未清完",
        body: "本机状态与响应缓存可能仍有残留。请在下方重新点击清理本机缓存，或通过微信清理本小程序的数据。",
        dismissible: true, dedupeKey: "settings-cache-cleanup-incomplete" });
      setScrollTop(0);
    } finally {
      attempt.active = false;
      if (cacheAttempt.current === attempt) {
        cacheAttempt.current = null;
        accountActionPending.current = false;
        if (pageAlive.current) { setDataAction(null); setSheet(null); }
      }
    }
  };

  const deleteAccount = async () => {
    if (accountActionPending.current || deletionCleanup.current || !pageAlive.current || !pageVisible.current) return;
    const attempt = { owner: currentDraftUserId(), active: true, requesting: true,
      clearingOwnAccount: false, clearedOwnAccount: false };
    deletionAttempt.current = attempt;
    const canApply = () => {
      if (!pageAlive.current || !pageVisible.current || !attempt.active || deletionAttempt.current !== attempt) return false;
      const owner = currentDraftUserId();
      return pageAlive.current && pageVisible.current && attempt.active && deletionAttempt.current === attempt &&
        owner === (attempt.clearedOwnAccount ? null : attempt.owner);
    };
    accountActionPending.current = true;
    setDataAction("DELETE");
    let accountDeleted = false;
    let localCleanupComplete = true;
    try {
      const response = await deleteAccountThroughApi((owner) => {
        if (canApply() && owner === attempt.owner) attempt.clearingOwnAccount = true;
      });
      attempt.requesting = false;
      accountDeleted = true;
      localCleanupComplete = response.localCleanupComplete;
      if (!canApply() || !response.localAccountReset || !attempt.clearedOwnAccount) return;
      if (!localCleanupComplete) {
        deletionCleanup.current = { userId: response.data.userId, retry: response.retryLocalCleanup };
        setDeletionCleanupPending(true);
        setSheet("DELETE_CLEANUP");
        return;
      }
      await Taro.showModal({
        title: "账户已删除",
        content:
          !localCleanupComplete
            ? "账户和会话已在服务端撤销，本机清理尚未全部确认。重新进入后若仍显示旧账户内容，可通过微信清理本小程序的数据。"
            : response.data.mediaCleanupState === "QUEUED"
            ? "身份和会话已撤销；投稿媒体清理已进入可靠队列。"
            : "身份、会话和可删除账户数据已移除。",
        showCancel: false,
        confirmText: "完成",
      });
      if (!canApply()) return;
      await Taro.reLaunch({ url: "/pages/auth/index?accountDeleted=1" });
    } catch (error) {
      if (!canApply()) return;
      notify({
        owner: "settings",
        placement: "inline",
        tone: "error",
        title: accountDeleted ? "账户已删除，页面尚未关闭" : "账户未删除",
        body: accountDeleted
          ? localCleanupComplete
            ? "账户删除已完成，本机会话已清除。请退出小程序后重新进入。"
            : "账户和会话已在服务端撤销，本机清理尚未全部确认。重新进入后若仍显示旧账户内容，可通过微信清理本小程序的数据。"
          : `${errorMessage(error)}；本机状态和登录会话保持不变，可重试。`,
        dismissible: true,
        dedupeKey: "settings-account-delete-failed",
      });
    } finally {
      attempt.active = false;
      if (deletionAttempt.current === attempt) {
        deletionAttempt.current = null;
        accountActionPending.current = false;
        if (pageAlive.current) { setDataAction(null); if (!deletionCleanup.current) setSheet(null); }
      }
    }
  };

  const retryDeletionCleanup = async () => {
    const cleanup = deletionCleanup.current;
    if (!cleanup || accountActionPending.current || !pageAlive.current || !pageVisible.current) return;
    const intent = navigation.begin({ valid: () => useAppStore.getState().accountOwnerId === null && currentDraftUserId() === null });
    if (!intent) return;
    const canApply = () => intent.active() && deletionCleanup.current === cleanup && pageAlive.current && pageVisible.current;
    accountActionPending.current = true;
    setDataAction("DELETE");
    try {
      const complete = await cleanup.retry();
      if (!canApply() || !complete) return;
      deletionCleanup.current = null;
      setDeletionCleanupPending(false);
      setSheet(null);
      try { await Taro.reLaunch({ url: "/pages/auth/index?accountDeleted=1" }); }
      catch { if (intent.active()) notify({ owner: "settings", placement: "inline", tone: "warning", title: "账户已删除，本机清理已完成",
        body: "页面尚未关闭，请退出小程序后重新进入。", dismissible: true, dedupeKey: "settings-account-delete-failed" }); }
    } catch { /* The authoritative server deletion and retry sheet remain in place. */ }
    finally {
      accountActionPending.current = false;
      if (pageAlive.current) setDataAction(null);
      intent.release();
    }
  };

  const openSheet = (kind: SettingsSheetKind) => {
    if (accountActionPending.current || deletionCleanup.current) return;
    if ((kind === "EXPORT" || kind === "DELETE") && !currentDraftUserId()) {
      login.requireAccount(() => openSheet(kind));
      return;
    }
    if (sheetCloseTimer.current) clearTimeout(sheetCloseTimer.current);
    sheetCloseTimer.current = null;
    accountExport.close();
    if (kind === "EXPORT") accountExport.open();
    setSheetClosing(false);
    setSheet(kind);
  };
  const closeSheet = () => {
    if (!sheet || sheet === "DELETE_CLEANUP" || sheetClosing || (accountActionPending.current &&
      !(sheet === "EXPORT" && accountExport.state.phase === "PREPARING"))) return;
    if (sheet === "EXPORT") accountExport.close();
    setSheetClosing(true);
    sheetCloseTimer.current = setTimeout(() => {
      sheetCloseTimer.current = null;
      setSheet(null);
      setSheetClosing(false);
    }, reducedMotion ? 0 : 180);
  };
  const openLocation = async () => {
    const owner = currentDraftUserId();
    const reset = useAppStore.getState().mapResetVersion;
    const attempt = navigation.begin({ valid: () => {
      const identity = currentDraftUserId();
      const state = useAppStore.getState();
      return identity === owner && state.accountOwnerId === owner && state.mapResetVersion === reset;
    } });
    if (!attempt) return;
    try {
      const action = locationState === "DENIED" ? "settings" : "locate";
      await Taro.navigateTo({ url: "/pages/auth/index", success: result => {
        if (attempt.completed()) result.eventChannel.emit("locationIntent", action);
      } });
    } catch {
      if (attempt.active()) notify({ owner: "settings", placement: "floating", tone: "warning",
        title: "定位与隐私暂未打开，请重试", body: "", dismissible: true, dedupeKey: "settings-location-navigation" });
    } finally { attempt.release(); }
  };

  return (
    <><SystemMotionProbe /><View
      className={`${themeClass} settings-page`}
      data-route="my-settings"
      data-od-id="my-settings"
    >
      <FloatingNotificationHost />
      {login.dialog}
      <NativeBackBoundary active={login.open || Boolean(sheet)} onBack={login.open ? login.back : closeSheet} />
      <CustomNav
        title="设置"
        back
        backOdId="my-settings-back-action"
        backFallbackTab="/pages/my/index"
        beforeBack={() => {
          if (login.open) { login.back(); return false; }
          if (!sheet) return !accountActionPending.current;
          closeSheet();
          return false;
        }}
      />
      <ScrollView
        scrollY={!modeGestureCaptured}
        scrollTop={scrollTop}
        onScroll={event => setScrollTop(event.detail.scrollTop)}
        enhanced
        bounces={false}
        showScrollbar={false}
        className="settings-page__scroll hide-scrollbar"
      >
        <View className="settings-content page-inset safe-bottom">
          <NotificationRegion owner="settings" placement="inline" />
          {settingsPreferences.state === "LOADING" || settingsPreferences.state === "ERROR" || settingsPreferences.state === "STALE" ?
            <StatusPanel state={settingsPreferences.state === "LOADING" ? "LOADING" : settingsPreferences.state === "STALE" ? "STALE" : "ERROR"}
              title={settingsPreferences.state === "LOADING" ? "正在同步偏好" : settingsPreferences.state === "STALE" ? "更新失败，保留上次设置" : "账户偏好暂未取得"}
              detail={settingsPreferences.confirmed ? "上次设置仍可使用。" : "位置与隐私、提醒设置尚待确认。"}
              recoveryLabel={settingsPreferences.state === "LOADING" ? undefined : "重试"}
              onRecover={settingsPreferences.state === "LOADING" ? undefined : settingsPreferences.retry} /> : null}
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
                ? () => void openPrimaryPage("/pages/my/index")
                : canRetryPreferenceSync ? () => void syncNow() : undefined}
            />
          ) : null}

          <SettingsControls
            blocked={deletionCleanupPending}
            preferencesConfirmed={settingsPreferences.confirmed}
            preferences={preferences}
            mode={mode}
            updatePreference={(key, value) => {
              if (deletionCleanup.current || !settingsPreferences.confirmed) return;
              if (key === "departureConditionReminder" || key === "contributionStatusReminder")
                login.requireAccount(() => updatePreference(key, value));
              else updatePreference(key, value);
            }}
            selectDisplayMode={selectDisplayMode}
            onModeGestureCapture={setModeGestureCaptured}
            openSheet={openSheet}
          />

          <SettingsDataActions dataAction={dataAction} blocked={deletionCleanupPending} openSheet={openSheet} />
        </View>
      </ScrollView>
      {sheet ? <SettingsSheet sheet={sheet} mode={mode} locationPreference={preferences.locationPreference} locationState={locationState}
        closing={sheetClosing}
        busy={dataAction !== null}
        close={closeSheet}
        selectLocation={(value) => { updatePreference("locationPreference", value); closeSheet(); }}
        openLocation={() => void openLocation()}
        advanceDelete={() => setSheet("DELETE_FINAL")}
        confirmCache={() => void clearCache()}
        exportState={accountExport.state}
        confirmExport={() => void downloadAccountData()}
        shareExport={() => void accountExport.share()}
        retryExportCleanup={() => void accountExport.retryCleanup()}
        retryDeletionCleanup={() => void retryDeletionCleanup()}
        confirmDelete={() => void deleteAccount()} /> : null}
    </View></>
  );
}
