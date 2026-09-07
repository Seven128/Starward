import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidShow } from "@tarojs/taro";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useId, useRef, useState } from "react";
import { selectPlanEntry } from "./plan-entry";
import { CustomNav } from "@/components/custom-nav";
import { SemanticAsset, SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useContributionHistory } from "@/hooks/use-contribution-history";
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
  const mode = useAppStore((state) => state.mode);
  const mountId = useId();
  const [, refreshIdentity] = useState(0);
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
  const contributions = useContributionHistory();
  useDidShow(() => {
    const owner = currentDraftUserId();
    if (!owner) return;
    // Tab pages stay mounted: returning to My must refresh expired summaries.
    for (const resource of ["user-library", "contributions"]) {
      void miniappQueryClient.refetchQueries({
        queryKey: [resource, owner],
        exact: true,
        type: "active",
        stale: true,
      });
    }
  });
  const plans = library.data?.data.plans ?? [];

  const { plan: tonightPlan, title: planEntryTitle } = selectPlanEntry(plans, new Date());
  const contributionItems = contributions.data?.data.submissions ?? [];
  const pendingContributionCount = contributionItems.filter(
    (item) =>
      item.submissionState === "PENDING_REVIEW" ||
      item.submissionState === "CHANGES_REQUESTED" ||
      item.state === "PENDING_REVIEW" ||
      item.state === "CHANGES_REQUESTED",
  ).length;
  const draftContributionCount = contributionItems.filter(
    (item) => item.submissionState === "DRAFT" || item.state === "DRAFT",
  ).length;

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
  const openPlan = () =>
    openPage(
      tonightPlan
        ? `/content/plan/detail/index?planId=${encodeURIComponent(tonightPlan.planId)}`
        : "/content/plan/detail/index",
      "今晚计划",
      "plan",
    );
  const openContribution = () =>
    openPage("/content/contribution/index", "反馈页面", "contribution");
  const openProfileLinks = () =>
    openPage("/content/profile/links/index", "主页链接", "profile-links");
  const openImport = () =>
    openPage("/content/import/index", "内容导入", "import");

  return (
    <View
      className={`${themeClass} my-page`}
      data-route="my-account-center"
      data-od-id="my-account-center"
    >
      <FloatingNotificationHost />
      <View data-control="my-account-header">
        <CustomNav title="我的" odId="my-account-header" />
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
          {contributions.isError || contributions.refreshError || contributions.data?.dataState === "STALE_USABLE" ? (
            <StatusPanel state={contributions.data ? "STALE" : "ERROR"}
              detail={contributions.data ? "反馈审核状态暂未更新，以下数量来自上次记录。" : "反馈审核状态暂不可用，暂时无法确认待处理数量。"}
              recoveryLabel="重试审核状态"
              onRecover={() => void contributions.refetch().catch(() => {})} />
          ) : null}
          <View
            className="profile-summary card"
            data-od-id="my-profile-summary"
            data-control="my-profile-summary"
            role="group"
            aria-label="个人资料摘要"
          >
            <View className="profile-summary__header">
              <View className="profile-summary__avatar" aria-hidden="true">
                <SemanticAsset
                  subject="neutral-avatar"
                  mode={mode}
                  label=""
                  className="profile-summary__asset"
                />
              </View>
              <View className="profile-summary__copy">
                <Text className="type-section">账户与内容</Text>
                <Text className="type-caption">当前微信身份</Text>
              </View>
            </View>
            <View className="profile-summary__band">
              <View>
                <Text className="type-section">个人链接</Text>
                <Text className="type-caption">
                  {library.data
                    ? `${library.refreshError || library.data.dataState === "STALE_USABLE" ? "上次 " : ""}${library.data.data.profileLinks.length} 条已保存`
                    : library.isError ? "暂不可用" : "正在加载"}
                </Text>
              </View>
              <View>
                <Text className="type-section">待审核内容</Text>
                <Text className="type-caption">
                  {contributions.isError
                    ? "状态暂不可用"
                    : !contributions.data ? "正在加载"
                    : `${contributions.refreshError || contributions.data.dataState === "STALE_USABLE" ? "上次 " : ""}${pendingContributionCount} 条待处理`}
                </Text>
              </View>
            </View>
            <View className="my-focus-actions" data-od-id="my-focus-actions">
              <Button
                className="routine-entry routine-entry--plan focus-ring"
                data-od-id="my-plan-entry"
                data-control="my-plan-entry"
                aria-label="打开观星计划"
                onClick={openPlan}
              >
                <View className="routine-entry__icon" aria-hidden="true">
                  <SemanticIcon name="conditions" />
                </View>
                <View className="account-row__copy">
                  <Text className="type-section">{planEntryTitle}</Text>
                  <Text className="type-caption">
                    {tonightPlan
                      ? `${tonightPlan.localDate} · 地点与出发准备`
                      : "地点与出发准备"}
                  </Text>
                </View>
                <View className="account-row__chevron" aria-hidden="true">
                  <SemanticIcon name="chevron-right" />
                </View>
              </Button>
              <Button
                className="routine-entry routine-entry--contribution focus-ring"
                data-od-id="my-contribution-entry"
                data-control="my-contribution-entry"
                ariaLabel="打开现场反馈与纠错"
                onClick={openContribution}
              >
                <View className="routine-entry__icon routine-entry__icon--moon" aria-hidden="true">
                  <SemanticIcon name="images" />
                </View>
                <View className="account-row__copy">
                  <Text className="type-section">现场反馈与纠错</Text>
                  <Text className="type-caption">
                    {draftContributionCount
                      ? `${draftContributionCount} 条草稿 · 草稿与审核状态`
                      : "草稿与审核状态"}
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
          <View
            className="my-section"
            data-od-id="my-grouped-entry-list"
            data-control="my-grouped-entry-list"
            role="group"
            aria-label="日常入口"
          >
            <View className="my-section__heading">
              <Text className="type-section">日常</Text>
            </View>
            <View className="routine-entry-list">
              <Button
                className="routine-entry routine-entry--settings focus-ring"
                data-od-id="my-settings-action"
                data-control="my-settings-action"
                aria-label="打开设置"
                onClick={openSettings}
              >
                <View className="routine-entry__icon" aria-hidden="true">
                  <SemanticIcon name="conditions" />
                </View>
                <View className="account-row__copy">
                  <Text className="type-section">设置</Text>
                  <Text className="type-caption">
                    显示、权限、提醒与数据管理
                  </Text>
                </View>
                <View className="account-row__chevron" aria-hidden="true">
                  <SemanticIcon name="chevron-right" />
                </View>
              </Button>
              <Button
                className="routine-entry routine-entry--profile-links focus-ring"
                data-od-id="my-profile-links-entry"
                data-control="my-profile-links-entry"
                aria-label="打开主页链接"
                onClick={openProfileLinks}
              >
                <View className="routine-entry__icon" aria-hidden="true">
                  <SemanticIcon name="horizon" />
                </View>
                <View className="account-row__copy">
                  <Text className="type-section">主页链接</Text>
                  <Text className="type-caption">
                    管理你的个人主页链接
                  </Text>
                </View>
                <View className="account-row__chevron" aria-hidden="true">
                  <SemanticIcon name="chevron-right" />
                </View>
              </Button>
              <Button
                className="routine-entry routine-entry--import focus-ring"
                data-od-id="my-import-entry"
                data-control="my-import-entry"
                aria-label="打开内容导入"
                onClick={openImport}
              >
                <View className="routine-entry__icon" aria-hidden="true">
                  <SemanticIcon name="download" />
                </View>
                <View className="account-row__copy">
                  <Text className="type-section">内容导入</Text>
                  <Text className="type-caption">
                    导入自己的帖子并提交审核
                  </Text>
                </View>
                <View className="account-row__chevron" aria-hidden="true">
                  <SemanticIcon name="chevron-right" />
                </View>
              </Button>
            </View>
          </View>
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
