import { FloatingNotificationHost } from "@/components/notification";
import { MyNickname } from "./my-nickname";
import { MyAvatar } from "./my-avatar";
import { useDidShow, useDidHide } from "@tarojs/taro";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import { MyPlanCard } from "./my-plan-card";
import { CustomNav } from "@/components/custom-nav";
import { SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { useAccountResourceQuery } from "@/hooks/use-account-resource-query";
import { useAccountNavigation } from "@/hooks/use-account-navigation";
import { useMotionThemeClass as useThemeClass } from "@/hooks/use-theme";
import {
  errorMessage,
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
export function MyLibraryPage() {
  const themeClass = useThemeClass();
  const [now, setNow] = useState(() => new Date());
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopClock = () => {
    if (clock.current !== null) clearInterval(clock.current);
    clock.current = null;
  };
  useDidShow(() => {
    stopClock();
    setNow(new Date());
    clock.current = setInterval(() => setNow(new Date()), 1000);
  });
  useDidHide(stopClock);
  useEffect(() => stopClock, []);
  const { notify, replacePlans, applyServerPreferences } = useAppStore.getState();
  const { owner: libraryOwner, query: library } = useAccountResourceQuery("user-library", getUserLibrary);
  const navigation = useAccountNavigation(libraryOwner);
  useDidShow(() => {
    const owner = currentDraftUserId();
    if (!owner) return;
    // Tab pages stay mounted: returning to My must refresh expired summaries.
    void miniappQueryClient.refetchQueries({
      queryKey: ["user-library", owner], exact: true, type: "active", stale: true,
    });
  });
  const plans = library.data?.data.plans ?? [];
  const unavailable = library.isError || !!library.refreshError;

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

  const openPage = (url: string, label: string, entry: string) => {
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
    });
  };
  const openSettings = () =>
    openPage("/content/settings/index", "设置", "settings");
  const openPlan = () => openPage("/content/plan/list/index", "观星计划", "plan");
  const openAchievements = () => openPage("/content/achievement/index", "个人行程成就", "achievements");
  const openContribution = () =>
    openPage("/content/contribution/index?manage=1", "观星点创建与反馈", "contribution");
  return (
    <View
      className={themeClass + " my-page"}
      data-route="my-account-center"
      data-od-id="my-account-center"
    >
      <FloatingNotificationHost />
      <View data-control="my-account-header">
        <CustomNav title="" odId="my-account-header" />
      </View>
      <ScrollView
        scrollY
        className="my-page__scroll"
        enhanced
        showScrollbar={false}
      >
        <View className="my-content page-inset safe-bottom">
          {navigation.navigationError ? <StatusPanel state="ERROR" title="页面暂未打开"
            detail="请稍后重试当前入口。" /> : null}
          {unavailable || library.data?.dataState === "STALE_USABLE" ? (
            <StatusPanel
              state={library.data ? "STALE" : "ERROR"}
              detail={library.data ? "账户资料尚未确认最新状态，暂时显示上次记录。" : `账户资料暂不可用：${errorMessage(library.error)}。计划与偏好尚未同步。`}
              recoveryLabel="重试同步"
              onRecover={() => void library.refetch()}
            />
          ) : null}
          <View
            className="profile-summary"
            data-od-id="my-profile-summary"
            data-control="my-profile-summary"
            role="group"
            aria-label="个人资料摘要"
          >
            <View className="profile-summary__header">
              <MyAvatar owner={libraryOwner} />
              <MyNickname owner={libraryOwner} />
              <Button className="my-settings-gear focus-ring" data-od-id="my-settings-action" data-control="my-settings-action" aria-label="打开设置" onClick={openSettings}><SemanticIcon name="settings" /></Button>
            </View>
            <View className="my-focus-actions" data-od-id="my-focus-actions">
              <MyPlanCard plans={plans} spots={library.data?.data.planSpots ?? []} now={now}
                loading={library.isPending} unavailable={unavailable}
                onOpenAll={openPlan}
                onOpen={(plan) => void openPage("/content/plan/detail/index?planId=" + encodeURIComponent(plan.planId), "观星计划", "plan")} />
              <Button className="routine-entry routine-entry--achievements focus-ring" ariaLabel="打开个人行程成就" onClick={openAchievements}>
                <View className="routine-entry__icon" aria-hidden="true"><SemanticIcon name="telescope" /></View>
                <View className="account-row__copy"><Text className="type-section">个人行程成就</Text><Text className="type-caption">回顾每一份已结束的计划</Text></View>
                <View className="account-row__chevron" aria-hidden="true"><SemanticIcon name="chevron-right" /></View>
              </Button>
              <Button
                className="routine-entry routine-entry--contribution focus-ring"
                data-od-id="my-contribution-entry"
                data-control="my-contribution-entry"
                ariaLabel="打开观星点创建与反馈"
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
          {library.isPending ? (
            <StatusPanel
              state="LOADING"
              detail="正在回读计划与偏好；账户摘要保持可用。"
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
