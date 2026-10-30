import { FloatingNotificationHost } from "@/components/notification";
import { MyNickname } from "./my-nickname";
import { MyAvatar } from "./my-avatar";
import { ScrollView, Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import { useEffect, useRef, useState } from "react";
import { MyPlanCard } from "./my-plan-card";
import { CustomNav } from "@/components/custom-nav";
import { PrimaryBookmark } from "@/components/primary-bookmark";
import { SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { useAccountResourceQuery } from "@/hooks/use-account-resource-query";
import { useAccountNavigation } from "@/hooks/use-account-navigation";
import { useWechatLogin } from "@/hooks/use-wechat-login";
import { useMotionThemeClass as useThemeClass } from "@/hooks/use-theme";
import { usePresentedPageLifecycle } from "@/navigation/page-presentation";
import { openPrimaryPage } from "@/navigation/primary-page-navigation";
import {
  currentDraftUserId,
  getUserLibrary,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { recordAcceptanceDiagnostic } from "@/services/acceptance-diagnostics";
import { miniappQueryClient } from "@/services/query-client";
import "./my-library-page.scss";

/**
 * The My root is intentionally small. Finder owns saved places and Spot Detail
 * owns the quiet favorite toggle; keeping those relations out of this route is
 * part of the current surface contract.
 */
export function MyLibraryPage({ onReturnMap = () => openPrimaryPage("/pages/map/index") }: {
  onReturnMap?: () => void | Promise<void>;
} = {}) {
  const themeClass = useThemeClass();
  const [now, setNow] = useState(() => new Date());
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopClock = () => {
    if (clock.current !== null) clearInterval(clock.current);
    clock.current = null;
  };
  const page = usePresentedPageLifecycle({
    show: () => {
      stopClock();
      setNow(new Date());
      clock.current = setInterval(() => setNow(new Date()), 1000);
      const owner = currentDraftUserId();
      if (!owner) return;
      // The retained My content refreshes expired summaries on each foreground.
      void miniappQueryClient.refetchQueries({
        queryKey: ["user-library", owner], exact: true, type: "active", stale: true,
      });
    },
    hide: stopClock,
  });
  useEffect(() => stopClock, []);
  const { notify, replacePlans, applyServerPreferences } = useAppStore.getState();
  const { owner: libraryOwner, query: library } = useAccountResourceQuery("user-library", getUserLibrary, { enabled: page.visible });
  const navigation = useAccountNavigation(libraryOwner);
  const login = useWechatLogin();
  const plans = library.data?.data.plans ?? [];
  const unavailable = library.isError || !!library.refreshError || library.data?.dataState === "STALE_USABLE";

  useEffect(() => {
    if (!library.data || !libraryOwner || currentDraftUserId() !== libraryOwner ||
        useAppStore.getState().accountOwnerId !== libraryOwner) return;
    replacePlans(library.data.data.plans);
    applyServerPreferences(library.data.data.preferences);
  }, [
    applyServerPreferences,
    library.data,
    libraryOwner,
    replacePlans,
  ]);

  const navigatePage = (url: string, label: string, entry: string, authenticatedOwner?: string) => {
    if (!page.isCurrent()) return;
    const diagnostic = "my-" + entry + "-navigation";
    const dedupeKey = diagnostic + "-failed";
    const prior = useAppStore.getState().notifications.filter(
      notice => notice.owner === "my" && notice.dedupeKey === dedupeKey,
    );
    return navigation.open(url, phase => {
      recordAcceptanceDiagnostic(diagnostic, phase,
        { start: "entry_click", success: "route_opened", failure: "route_rejected" }[phase]);
      if (phase === "success") {
        const state = useAppStore.getState();
        for (const notification of prior) {
          if (state.notifications.includes(notification)) state.dismissNotification(notification.id);
        }
      } else if (phase === "failure") {
        notify({ owner: "my", placement: "floating", tone: "warning",
          title: label + "暂未打开", body: "请稍后重试，当前内容已保留。", dismissible: true, dedupeKey });
      }
    }, authenticatedOwner);
  };
  const openPage = (url: string, label: string, entry: string) => {
    if (!page.isCurrent()) return;
    login.requireAccount(owner => { if (page.isCurrent()) void navigatePage(url, label, entry, owner); });
  };
  const openSettings = () =>
    navigatePage("/content/settings/index", "设置", "settings");
  const openPlan = () => openPage("/content/plan/list/index", "观星计划", "plan");
  const openAchievements = () => openPage("/content/achievement/index", "计划回顾", "achievements");
  const openContribution = () =>
    openPage("/content/contribution/index?manage=1", "观星点创建与反馈", "contribution");
  const returnMap = () => { if (page.isCurrent()) return onReturnMap(); };
  return (
    <View
      className={themeClass + " my-page"}
      data-route="my-account-center"
      data-od-id="my-account-center"
    >
      <FloatingNotificationHost />
      {login.dialog}
      <View data-control="my-account-header">
        <CustomNav title="" odId="my-account-header" />
      </View>
      <PrimaryBookmark destination="map" disabled={!page.visible} onClick={() => {
        void Promise.resolve().then(returnMap).catch(() => notify({ owner: "my", placement: "floating", tone: "warning",
          title: "地图暂未打开", body: "请重试，当前内容已保留。", dedupeKey: "my-map-navigation-failed" }));
      }} />
      <ScrollView
        scrollY
        className="my-page__scroll"
        enhanced
        showScrollbar={false}
      >
        <View className="my-content page-inset">
          {navigation.navigationError ? <StatusPanel state="ERROR" title="页面暂未打开"
            detail="请稍后重试当前入口。" /> : null}
          <View
            className="profile-summary"
            data-od-id="my-profile-summary"
            data-control="my-profile-summary"
            role="group"
            aria-label="个人资料摘要"
          >
            <View className="profile-summary__header">
              <MyAvatar owner={libraryOwner} onLogin={() => login.requireAccount()} />
              <MyNickname owner={libraryOwner} onLogin={() => login.requireAccount()} />
              <Button pressVariant="icon" className="my-settings-gear focus-ring" data-od-id="my-settings-action" data-control="my-settings-action" aria-label="打开设置" disabled={!page.visible} onClick={openSettings}><SemanticIcon name="settings" /></Button>
            </View>
            <View className="my-focus-actions" data-od-id="my-focus-actions">
              <MyPlanCard plans={plans} spots={library.data?.data.planSpots ?? []} now={now}
                guest={!libraryOwner} loading={Boolean(libraryOwner && library.isPending)} unavailable={unavailable}
                onRetry={() => { if (page.isCurrent()) void library.refetch(); }}
                onOpenAll={openPlan}
                onOpen={(plan) => void openPage("/content/plan/detail/index?planId=" + encodeURIComponent(plan.planId), "观星计划", "plan")} />
              <Button className="routine-entry routine-entry--achievements focus-ring" ariaLabel="打开计划回顾" disabled={!page.visible} onClick={openAchievements}>
                <View className="routine-entry__icon" aria-hidden="true"><SemanticIcon name="telescope" /></View>
                <View className="account-row__copy"><Text className="type-section">计划回顾</Text><Text className="type-caption">查看已结束的观星计划</Text></View>
                <View className="account-row__chevron" aria-hidden="true"><SemanticIcon name="chevron-right" /></View>
              </Button>
              <Button
                className="routine-entry routine-entry--contribution focus-ring"
                data-od-id="my-contribution-entry"
                data-control="my-contribution-entry"
                ariaLabel="打开观星点创建与反馈"
                disabled={!page.visible}
                onClick={openContribution}
              >
                <View className="routine-entry__icon" aria-hidden="true">
                  <SemanticIcon name="pencil" />
                </View>
                <View className="account-row__copy">
                  <Text className="type-section">观星点创建与反馈</Text>
                  <Text className="type-caption">
                    草稿与审核进度
                  </Text>
                </View>
                <View className="account-row__chevron" aria-hidden="true">
                  <SemanticIcon name="chevron-right" />
                </View>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
