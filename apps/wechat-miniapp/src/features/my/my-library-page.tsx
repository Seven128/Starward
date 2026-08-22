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
 * part of the V2.1.1 surface contract.
 */
export function MyLibraryPage() {
  const themeClass = useThemeClass();
  const mode = useAppStore((state) => state.mode);
  const profileLinks = useAppStore((state) => state.profileLinks);
  const plans = useAppStore((state) => state.plans);
  const importDraft = useAppStore((state) => state.importDraft);
  const replacePlans = useAppStore((state) => state.replacePlans);
  const replaceProfileLinks = useAppStore((state) => state.replaceProfileLinks);
  const applyServerPreferences = useAppStore(
    (state) => state.applyServerPreferences,
  );
  const setImportDraft = useAppStore((state) => state.setImportDraft);
  const library = useResourceQuery({
    queryKey: ["user-library"],
    queryFn: (signal) => getUserLibrary(signal),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!library.data) return;
    replacePlans(library.data.data.plans);
    replaceProfileLinks(library.data.data.profileLinks);
    applyServerPreferences(library.data.data.preferences);
    const remoteDraft = library.data.data.latestImportDraft;
    if (
      remoteDraft &&
      (!importDraft || remoteDraft.revision > importDraft.revision)
    ) {
      setImportDraft(remoteDraft);
    }
  }, [
    applyServerPreferences,
    importDraft,
    library.data,
    replacePlans,
    replaceProfileLinks,
    setImportDraft,
  ]);

  const openSettings = () =>
    Taro.navigateTo({ url: "/content/settings/index" });
  const openPlan = () => Taro.navigateTo({ url: "/content/plan/detail/index" });
  const openLinks = () =>
    Taro.navigateTo({ url: "/content/profile/links/index" });
  const openImport = () => Taro.navigateTo({ url: "/content/import/index" });

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
              <Text className="type-section">访客浏览</Text>
              <Text className="type-caption">
                公开地图、点位详情与文章无需登录；本人内容和偏好仍按当前能力门禁处理。
              </Text>
            </View>
          </View>
          {library.isPending ? (
            <StatusPanel
              state="LOADING"
              detail="正在回读计划、主页链接与可恢复草稿；账户摘要保持可用。"
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
              className="account-row focus-ring"
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
              className="account-row focus-ring"
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
            <Button
              className="account-row focus-ring"
              aria-label={`管理外部主页链接${profileLinks.length ? `，已有 ${profileLinks.length} 条` : ""}`}
              onClick={openLinks}
            >
              <View className="account-row__copy">
                <Text className="type-section">外部主页链接</Text>
                <Text className="type-caption">
                  {profileLinks.length
                    ? `${profileLinks.length} 条用户声明链接 · 复制回退可用`
                    : "中性标识、严格校验与复制回退"}
                </Text>
              </View>
              <Text className="account-row__chevron" aria-hidden="true">
                ›
              </Text>
            </Button>
            <Button
              className="account-row focus-ring"
              aria-label="导入我的观星帖"
              onClick={openImport}
            >
              <View className="account-row__copy">
                <Text className="type-section">导入我的观星帖</Text>
                <Text className="type-caption">
                  {importDraft
                    ? `草稿：${importDraft.stage} · 来源与审核状态可恢复`
                    : "来源、权利声明、可编辑草稿与审核预览"}
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
              detail="本页不会因服务端失败伪造新的计划、链接或导入状态；进入对应子页面可继续使用本机可恢复副本并重试。"
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
