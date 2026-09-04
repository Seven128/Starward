import Taro from "@tarojs/taro";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useMemo } from "react";
import { CustomNav } from "@/components/custom-nav";
import { SemanticAsset, SemanticIcon } from "@/components/semantic-asset";
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
  const openPlan = () =>
    Taro.navigateTo({
      url: tonightPlan
        ? `/content/plan/detail/index?planId=${encodeURIComponent(tonightPlan.planId)}`
        : "/content/plan/detail/index",
    });
  const openContribution = () =>
    Taro.navigateTo({ url: "/content/contribution/index" });
  const openProfileLinks = () =>
    Taro.navigateTo({ url: "/content/profile/links/index" });
  const openImport = () => Taro.navigateTo({ url: "/content/import/index" });

  return (
    <View
      className={`${themeClass} my-page`}
      data-route="my-account-center"
      data-od-id="my-account-center"
    >
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
                    ? `${library.data.data.profileLinks.length} 条已保存关系`
                    : "服务端回读中"}
                </Text>
              </View>
              <View>
                <Text className="type-section">待审核内容</Text>
                <Text className="type-caption">
                  {contributions.isError
                    ? "状态暂不可用"
                    : `${pendingContributionCount} 条待处理`}
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
                  <Text className="type-section">今晚计划</Text>
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
                aria-label="打开现场反馈与纠错"
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
                    显示模式、权限、提醒与本地数据动作
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
                    管理公开或私有的外部主页；打开受平台能力限制时仍可复制
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
                    先确认权利，再编辑草稿、关联点位并提交人工审核
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
