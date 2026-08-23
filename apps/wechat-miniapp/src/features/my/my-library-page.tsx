import Taro from "@tarojs/taro";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import { useEffect } from "react";
import { CustomNav } from "@/components/custom-nav";
import { SemanticAsset } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { errorMessage, getUserLibrary } from "@/services/api-client";
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
          <View
            className="account-entry-list"
            data-od-id="my-grouped-entry-list"
            role="group"
            aria-label="账户与偏好"
          >
            <Text className="type-label account-entry-list__label">
              账户与偏好
            </Text>
            <Button
              className="account-row account-row--plan focus-ring"
              data-od-id="my-plan-entry"
              aria-label={`打开观星计划${plans.length ? `，已有 ${plans.length} 个计划` : ""}`}
              onClick={openPlan}
            >
              <View className="account-row__copy">
                <Text className="type-section">观星计划</Text>
                <Text className="type-caption">
                  {plans.length
                    ? `${plans.length} 个计划 · 正式点位与当地时间`
                    : "新建、编辑或恢复正式点位观测计划"}
                </Text>
              </View>
              <Text className="account-row__chevron" aria-hidden="true">
                ›
              </Text>
            </Button>
            <Button
              className="account-row account-row--contribution focus-ring"
              data-od-id="my-contribution-entry"
              aria-label="打开现场反馈与纠错"
              onClick={openContribution}
            >
              <View className="account-row__copy">
                <Text className="type-section">现场反馈与纠错</Text>
                <Text className="type-caption">
                  提交地点建议，或查看草稿与人工审核状态
                </Text>
              </View>
              <Text className="account-row__chevron" aria-hidden="true">
                ›
              </Text>
            </Button>
            <Button
              className="account-row account-row--settings focus-ring"
              aria-label="打开设置"
              onClick={openSettings}
            >
              <View className="account-row__copy">
                <Text className="type-section">设置</Text>
                <Text className="type-caption">
                  地点、显示模式、隐私、缓存与账户能力
                </Text>
              </View>
              <Text className="account-row__chevron" aria-hidden="true">
                ›
              </Text>
            </Button>
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
