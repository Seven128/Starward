import Taro from "@tarojs/taro";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useMemo } from "react";
import { CustomNav } from "@/components/custom-nav";
import { SemanticAsset } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  errorMessage,
  getContributions,
  getUserLibrary,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./my-library-page.scss";

/**
 * The My root is intentionally small. Finder owns saved places and Spot Detail
 * owns the quiet favorite toggle; keeping those relations out of this route is
 * part of the current surface contract.
 */
export function MyLibraryPage() {
  const themeClass = useThemeClass();
  const mode = useAppStore((state) => state.mode);
  const plans = useAppStore((state) => state.plans);
  const replacePlans = useAppStore((state) => state.replacePlans);
  const applyServerPreferences = useAppStore(
    (state) => state.applyServerPreferences,
  );
  const library = useResourceQuery({
    queryKey: ["user-library"],
    queryFn: (signal) => getUserLibrary(signal),
    staleTime: 30_000,
  });
  const contributions = useResourceQuery({
    queryKey: ["contributions"],
    queryFn: (signal) => getContributions(signal),
    staleTime: 15_000,
  });

  const tonightPlan = useMemo(
    () =>
      [...plans].sort((left, right) =>
        `${left.localDate}T${left.localTime}`.localeCompare(
          `${right.localDate}T${right.localTime}`,
        ),
      )[0] ?? null,
    [plans],
  );
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
    if (!library.data) return;
    replacePlans(library.data.data.plans);
    applyServerPreferences(library.data.data.preferences);
  }, [
    applyServerPreferences,
    library.data,
    replacePlans,
  ]);

  const openSettings = () =>
    Taro.navigateTo({ url: "/content/settings/index" });
  const openPlan = () => Taro.navigateTo({ url: "/content/plan/detail/index" });
  const openContribution = () =>
    Taro.navigateTo({ url: "/content/contribution/index" });

  return (
    <View
      className={`${themeClass} my-page`}
      data-route="my-account-center"
      data-od-id="my-account-center"
    >
      <CustomNav
        title="我的"
        odId="my-account-header"
        right={
          <View data-od-id="my-settings-action">
            <SoftButton
              label="打开设置"
              variant="ghost"
              onClick={openSettings}
            >
              ⚙
            </SoftButton>
          </View>
        }
      />
      <ScrollView
        scrollY
        className="my-page__scroll"
        enhanced
        showScrollbar={false}
      >
        <View className="my-content page-inset safe-bottom">
          {library.isError ? (
            <StatusPanel
              state="STALE"
              detail={`账户资料暂未刷新，继续显示本机最后一次可用关系：${errorMessage(library.error)}。`}
              recoveryLabel="重试同步"
              onRecover={() => void library.refetch()}
            />
          ) : null}
          <View
            className="profile-summary card"
            data-od-id="my-profile-summary"
            role="group"
            aria-label="个人资料摘要"
          >
            <View className="profile-summary__avatar" aria-hidden="true">
              <SemanticAsset
                subject="neutral-avatar"
                mode={mode}
                label=""
                className="profile-summary__asset"
              />
            </View>
            <View className="profile-summary__copy">
              <Text className="type-section">我的观星空间</Text>
              <Text className="type-caption">
                计划与偏好按当前微信身份隔离；公开地图与点位详情无需额外授权。
              </Text>
            </View>
          </View>
          {library.isPending ? (
            <StatusPanel
              state="LOADING"
              detail="正在回读计划与偏好；账户摘要保持可用。"
            />
          ) : null}
          <View className="my-section" data-od-id="my-tonight-plan">
            <View className="my-section__heading">
              <Text className="type-section">今晚</Text>
              <Text className="type-caption">
                {tonightPlan?.localDate ?? "还没有已保存计划"}
              </Text>
            </View>
            <Button
              className="tonight-plan card focus-ring"
              aria-label={
                tonightPlan
                  ? `打开今晚计划，${tonightPlan.localDate} ${tonightPlan.localTime}`
                  : "创建今晚观测计划"
              }
              onClick={openPlan}
            >
              <Text className="tonight-plan__eyebrow">
                {tonightPlan
                  ? `${tonightPlan.localTime} · 正式点位计划`
                  : "还没有今晚计划"}
              </Text>
              <Text className="tonight-plan__title">
                {tonightPlan ? "打开今晚计划" : "创建一个观测计划"}
              </Text>
              <Text className="type-caption">
                出发前复核路线、准备事项和最新动态条件；地点事实仍由地图与详情负责。
              </Text>
              <View className="tonight-plan__facts" aria-hidden="true">
                <View>
                  <Text className="type-data">
                    {tonightPlan?.localDate ?? "—"}
                  </Text>
                  <Text className="type-caption">观测日期</Text>
                </View>
                <View>
                  <Text className="type-data">
                    {tonightPlan ? `rev.${tonightPlan.revision}` : "—"}
                  </Text>
                  <Text className="type-caption">计划版本</Text>
                </View>
              </View>
            </Button>
          </View>

          <View
            className="my-section"
            data-od-id="my-routine-entries"
            role="group"
            aria-label="日常入口"
          >
            <View className="my-section__heading">
              <Text className="type-section">日常</Text>
            </View>
            <View className="routine-entry-list">
              <Button
                className="routine-entry routine-entry--plan focus-ring"
                data-od-id="my-plan-entry"
                aria-label="打开观星计划"
                onClick={openPlan}
              >
                <View className="routine-entry__icon" aria-hidden="true">
                  ◷
                </View>
                <View className="account-row__copy">
                  <Text className="type-section">观星计划</Text>
                  <Text className="type-caption">
                    {plans.length
                      ? `${plans.length} 个已保存计划 · 可恢复检查项`
                      : "新建、编辑或恢复正式点位观测计划"}
                  </Text>
                </View>
                <Text className="account-row__chevron" aria-hidden="true">
                  ›
                </Text>
              </Button>
              <Button
                className="routine-entry routine-entry--contribution focus-ring"
                data-od-id="my-contribution-entry"
                aria-label="打开现场反馈与纠错"
                onClick={openContribution}
              >
                <View className="routine-entry__icon routine-entry__icon--moon" aria-hidden="true">
                  ◌
                </View>
                <View className="account-row__copy">
                  <Text className="type-section">现场反馈与纠错</Text>
                  <Text className="type-caption">
                    {contributions.isError
                      ? "查看草稿与审核状态"
                      : `${draftContributionCount ? `${draftContributionCount} 条草稿` : "无草稿"} · ${pendingContributionCount ? `${pendingContributionCount} 条待处理` : "暂无待处理"}`}
                  </Text>
                </View>
                <Text className="account-row__chevron" aria-hidden="true">
                  ›
                </Text>
              </Button>
              <Button
                className="routine-entry routine-entry--settings focus-ring"
                data-od-id="my-settings-entry"
                aria-label="打开设置"
                onClick={openSettings}
              >
                <View className="routine-entry__icon" aria-hidden="true">
                  ⚙
                </View>
                <View className="account-row__copy">
                  <Text className="type-section">设置</Text>
                  <Text className="type-caption">
                    显示模式、权限、提醒与本地数据动作
                  </Text>
                </View>
                <Text className="account-row__chevron" aria-hidden="true">
                  ›
                </Text>
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
