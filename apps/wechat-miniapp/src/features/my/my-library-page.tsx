import { FloatingNotificationHost } from "@/components/notification";
import { MyNickname } from "./my-nickname";
import { MyAvatar } from "./my-avatar";
import Taro, { useDidShow, useDidHide } from "@tarojs/taro";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useId, useRef, useState } from "react";
import { MyPlanCard } from "./my-plan-card";
import { CustomNav } from "@/components/custom-nav";
import { SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
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
  const mountId = useId();
  const [, refreshIdentity] = useState(0);
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
  useDidShow(() => refreshIdentity((value) => value + 1));
  const libraryOwner = currentDraftUserId();
  const notify = useAppStore((state) => state.notify);
  const replacePlans = useAppStore((state) => state.replacePlans);
  const applyServerPreferences = useAppStore(
    (state) => state.applyServerPreferences,
  );
  const library = useResourceQuery({
    queryKey: ["user-library", libraryOwner ?? `unresolved:${mountId}`],
    queryFn: (signal) => getUserLibrary(signal, libraryOwner ?? undefined),
    staleTime: 30_000,
  });
  useDidShow(() => {
    const owner = currentDraftUserId();
    if (!owner) return;
    // Tab pages stay mounted: returning to My must refresh expired summaries.
    for (const resource of ["user-library"]) {
      void miniappQueryClient.refetchQueries({
        queryKey: [resource, owner],
        exact: true,
        type: "active",
        stale: true,
      });
    }
  });
  const plans = library.data?.data.plans ?? [];

  useEffect(() => {
    if (!library.data || !libraryOwner || currentDraftUserId() !== libraryOwner) return;
    replacePlans(library.data.data.plans);
    applyServerPreferences(library.data.data.preferences);
  }, [
    applyServerPreferences,
    library.data,
    libraryOwner,
    replacePlans,
  ]);

  const navigationPending = useRef(false);
  const openPage = async (url: string, label: string, entry: string) => {
    if (navigationPending.current) return;
    navigationPending.current = true;
    const diagnostic = `my-${entry}-navigation`;
    const dedupeKey = `${diagnostic}-failed`;
    recordAcceptanceDiagnostic(diagnostic, "start", "entry_click");
    try {
      await Taro.navigateTo({ url });
      recordAcceptanceDiagnostic(diagnostic, "success", "route_opened");
      const state = useAppStore.getState();
      for (const notification of state.notifications) {
        if (notification.owner === "my" && notification.dedupeKey === dedupeKey) {
          state.dismissNotification(notification.id);
        }
      }
    } catch {
      recordAcceptanceDiagnostic(diagnostic, "failure", "route_rejected");
      notify({
        owner: "my",
        placement: "floating",
        tone: "warning",
        title: `${label}暂未打开`,
        body: "请稍后重试，当前内容已保留。",
        dismissible: true,
        dedupeKey,
      });
    } finally {
      navigationPending.current = false;
    }
  };
  const openSettings = () =>
    openPage("/content/settings/index", "设置", "settings");
  const openPlan = () => openPage("/content/plan/list/index", "观星计划", "plan");
  const openAchievements = () => openPage("/content/achievement/index", "个人行程成就", "achievements");
  const openContribution = () =>
    openPage("/content/contribution/index?manage=1", "观星点创建与反馈", "contribution");
  return (
    <View
      className={`${themeClass} my-page`}
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
          {library.isError || library.refreshError || library.data?.dataState === "STALE_USABLE" ? (
            <StatusPanel
              state={library.data ? "STALE" : "ERROR"}
              detail={library.data ? "账户资料尚未确认最新状态，暂时显示上次记录。" : `账户资料暂不可用：${errorMessage(library.error)}。`}
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
              <MyAvatar key={`avatar:${libraryOwner ?? "unresolved"}`} owner={libraryOwner} />
              <MyNickname key={libraryOwner ?? "unresolved"} owner={libraryOwner} />
              <Button className="my-settings-gear focus-ring" data-od-id="my-settings-action" data-control="my-settings-action" aria-label="打开设置" onClick={openSettings}><SemanticIcon name="settings" /></Button>
            </View>
            <View className="my-focus-actions" data-od-id="my-focus-actions">
              <MyPlanCard plans={plans} spots={library.data?.data.planSpots ?? []} now={now}
                loading={library.isPending} unavailable={library.isError || Boolean(library.refreshError)}
                onOpenAll={openPlan}
                onOpen={(plan) => void openPage(`/content/plan/detail/index?planId=${encodeURIComponent(plan.planId)}`, "观星计划", "plan")} />
              <Button className="routine-entry focus-ring" ariaLabel="打开个人行程成就" onClick={openAchievements}>
                <View className="routine-entry__icon" aria-hidden="true"><SemanticIcon name="star" /></View>
                <View className="account-row__copy"><Text className="type-section">个人行程成就</Text><Text className="type-caption">按已结束的计划自动统计</Text></View>
                <View className="account-row__chevron" aria-hidden="true"><SemanticIcon name="chevron-right" /></View>
              </Button>
              <Button
                className="routine-entry routine-entry--contribution focus-ring"
                data-od-id="my-contribution-entry"
                data-control="my-contribution-entry"
                ariaLabel="打开观星点创建与反馈"
                onClick={openContribution}
              >
                <View className="routine-entry__icon routine-entry__icon--moon" aria-hidden="true">
                  <SemanticIcon name="images" />
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
          {library.isError ? (
            <StatusPanel
              state="PARTIAL"
              detail="本页不会因服务端失败伪造新的计划或偏好；现有本机投影保持只读，联网后可重试。"
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
