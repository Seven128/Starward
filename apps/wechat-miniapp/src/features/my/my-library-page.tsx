import Taro from "@tarojs/taro";
import {
  Button,
  Input,
  Picker,
  ScrollView,
  Slider,
  Switch,
  Text,
  View,
} from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";
import {
  DEMO_SPOTS,
  type DisplayMode,
  type FacilityType,
  type MyTab,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { SemanticAsset } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { SpotCard } from "@/components/spot-card";
import { StatusPanel } from "@/components/status-panel";
import { useThemeClass } from "@/hooks/use-theme";
import { useFavoriteMutation } from "@/hooks/use-favorite-mutation";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { usePreferencesSync } from "@/hooks/use-preferences-sync";
import {
  deleteObservationPlan,
  errorMessage,
  getUserLibrary,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./my-library-page.scss";

const TABS: ReadonlyArray<{ key: MyTab; label: string }> = [
  { key: "MY", label: "我的" },
  { key: "FAVORITES", label: "收藏" },
  { key: "PLAN", label: "计划" },
  { key: "SETTINGS", label: "设置" },
];
const MODES: DisplayMode[] = ["DAY", "NIGHT", "OBSERVATION"];
const MODE_LABEL: Record<DisplayMode, string> = {
  DAY: "日间",
  NIGHT: "夜间",
  OBSERVATION: "观测",
};
const FACILITY_PREFERENCES: ReadonlyArray<{
  key: FacilityType;
  label: string;
}> = [
  { key: "PARKING", label: "停车" },
  { key: "TOILET", label: "厕所" },
  { key: "PLATFORM", label: "平台" },
  { key: "CHARGING", label: "充电" },
  { key: "SIGNAL", label: "信号" },
];

export function MyLibraryPage({ initialTab }: { initialTab?: MyTab }) {
  const themeClass = useThemeClass();
  const tab = useAppStore((state) => state.myTab);
  const setTab = useAppStore((state) => state.setMyTab);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const { toggleFavorite } = useFavoriteMutation();
  const plans = useAppStore((state) => state.plans);
  const preferences = useAppStore((state) => state.preferences);
  const applyServerPreferences = useAppStore(
    (state) => state.applyServerPreferences,
  );
  const {
    updatePreference: setPreference,
    syncNow: syncPreferences,
    status: preferenceSyncStatus,
  } = usePreferencesSync();
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const profileLinks = useAppStore((state) => state.profileLinks);
  const replaceFavoriteIds = useAppStore((state) => state.replaceFavoriteIds);
  const replacePlans = useAppStore((state) => state.replacePlans);
  const replaceProfileLinks = useAppStore((state) => state.replaceProfileLinks);
  const importDraft = useAppStore((state) => state.importDraft);
  const setImportDraft = useAppStore((state) => state.setImportDraft);
  const clearLocalCache = useAppStore((state) => state.clearLocalCache);
  const toast = useAppStore((state) => state.toast);
  const setToast = useAppStore((state) => state.setToast);
  const [favoriteSort, setFavoriteSort] = useState<
    "FAVORITED_AT" | "DISTANCE" | "RECENT_CONDITION"
  >("FAVORITED_AT");
  const library = useResourceQuery({
    queryKey: ["user-library"],
    queryFn: (signal) => getUserLibrary(signal),
    staleTime: 30_000,
  });
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab, setTab]);
  useEffect(() => {
    if (!library.data) return;
    replaceFavoriteIds(
      library.data.data.favoriteSpots.map((spot) => spot.spotId),
    );
    replacePlans(library.data.data.plans);
    replaceProfileLinks(library.data.data.profileLinks);
    applyServerPreferences(library.data.data.preferences);
    const remoteDraft = library.data.data.latestImportDraft;
    if (
      remoteDraft &&
      (!importDraft || remoteDraft.revision > importDraft.revision)
    )
      setImportDraft(remoteDraft);
  }, [
    applyServerPreferences,
    library.data,
    importDraft,
    replaceFavoriteIds,
    replacePlans,
    replaceProfileLinks,
    setImportDraft,
  ]);
  const favorites = useMemo(
    () => DEMO_SPOTS.filter((spot) => favoriteIds.includes(spot.spotId)),
    [favoriteIds],
  );
  const openSpot = (spotId: string) =>
    Taro.navigateTo({
      url: `/spot/detail/index?spotId=${encodeURIComponent(spotId)}`,
    });
  const removePlan = async (planId: string) => {
    const confirmation = await Taro.showModal({
      title: "删除计划？",
      content: "将删除持久化计划；失败时原计划保持不变。",
      confirmColor: "#B53A3A",
    });
    if (!confirmation.confirm) return;
    try {
      const result = await deleteObservationPlan(planId);
      replacePlans(result.data.plans);
      setToast("计划已删除并从服务端回读。");
    } catch (error) {
      setToast(`删除失败，计划保持不变：${errorMessage(error)}。`);
    }
  };
  return (
    <View className={`${themeClass} my-page`} data-route="my-library">
      <CustomNav title="我的" subtitle="Demo · 访客" />
      <View
        className="my-tabs page-inset"
        role="tablist"
        aria-label="我的模块页面"
      >
        <View className="my-tabs__grid">
          {TABS.map((item) => (
            <Button
              key={item.key}
              className={`my-tab focus-ring${tab === item.key ? " my-tab--active" : ""}`}
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
            >
              <Text>{item.label}</Text>
            </Button>
          ))}
        </View>
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
              detail={`服务端资料暂未刷新，继续显示本机最后一次可用关系：${errorMessage(library.error)}。`}
              recoveryLabel="重试同步"
              onRecover={() => void library.refetch()}
            />
          ) : null}
          {tab === "MY" ? (
            <View className="section-stack" data-my-tab="my">
              <View className="profile-card card">
                <View className="avatar" aria-label="访客资料主题资产">
                  <SemanticAsset
                    subject="neutral-avatar"
                    mode={mode}
                    label="访客资料"
                    className="avatar__asset"
                  />
                </View>
                <View className="profile-card__copy">
                  <Text className="type-section">访客浏览</Text>
                  <Text className="type-caption">
                    公开地图、点位详情与文章无需登录
                  </Text>
                </View>
                <SoftButton
                  variant="ghost"
                  label="查看登录能力说明"
                  onClick={() => Taro.navigateTo({ url: "/pages/auth/index" })}
                >
                  登录说明
                </SoftButton>
              </View>
              <View className="entry-grid">
                <Button
                  className="entry-card focus-ring"
                  aria-label={`查看收藏，当前 ${favoriteIds.length} 个`}
                  onClick={() => setTab("FAVORITES")}
                >
                  <Text className="entry-card__icon" aria-hidden="true">☆</Text>
                  <Text className="type-label">收藏</Text>
                  <Text className="type-caption">
                    {favoriteIds.length} 个 · 服务端关系可离线回读
                  </Text>
                </Button>
                <Button
                  className="entry-card focus-ring"
                  aria-label="打开设置页签"
                  onClick={() => setTab("SETTINGS")}
                >
                  <Text className="entry-card__icon" aria-hidden="true">⚙</Text>
                  <Text className="type-label">设置</Text>
                  <Text className="type-caption">
                    模式、权限、来源与本地账户
                  </Text>
                </Button>
                <Button
                  className="entry-card focus-ring"
                  aria-label="管理外部主页链接"
                  onClick={() =>
                    Taro.navigateTo({ url: "/content/profile/links/index" })
                  }
                >
                  <Text className="entry-card__icon" aria-hidden="true">↗</Text>
                  <Text className="type-label">主页链接</Text>
                  <Text className="type-caption">
                    {profileLinks.length} 条 · 复制、视频号或其他平台
                  </Text>
                </Button>
                <Button
                  className="entry-card focus-ring"
                  aria-label="导入我的观星帖"
                  onClick={() =>
                    Taro.navigateTo({ url: "/content/import/index" })
                  }
                >
                  <Text className="entry-card__icon" aria-hidden="true">入</Text>
                  <Text className="type-label">导入我的观星帖</Text>
                  <Text className="type-caption">
                    {importDraft ? "有 1 份本地草稿" : "跨平台来源、可编辑草稿、关联审核"}
                  </Text>
                </Button>
              </View>
              <View className="demo-boundary card">
                <View className="demo-boundary__heading">
                  <View>
                    <Text className="type-section">Demo 内容边界</Text>
                    <Text className="type-caption">
                      公开内容与本人内容分开；外链打开、账号与发布受能力门禁约束。
                    </Text>
                  </View>
                  <Text className="status-tag">○ Demo</Text>
                </View>
                <View className="demo-boundary__actions">
                  <SoftButton
                    label="打开计划页签"
                    onClick={() => setTab("PLAN")}
                  >
                    计划与审核
                  </SoftButton>
                  <SoftButton
                    label="导入本人观星帖"
                    onClick={() =>
                      Taro.navigateTo({ url: "/content/import/index" })
                    }
                  >
                    导入观星帖
                  </SoftButton>
                </View>
              </View>
            </View>
          ) : null}
          {tab === "FAVORITES" ? (
            <View className="section-stack" data-my-tab="favorites">
              <View className="library-header">
                <View>
                  <Text className="type-page-title">收藏夹</Text>
                  <Text className="type-caption">
                    收藏关系不会因动态供应商失败而消失
                  </Text>
                </View>
                <Picker
                  mode="selector"
                  range={["收藏时间", "距离", "近期条件"]}
                  value={[
                    "FAVORITED_AT",
                    "DISTANCE",
                    "RECENT_CONDITION",
                  ].indexOf(favoriteSort)}
                  onChange={(event) =>
                    setFavoriteSort(
                      (
                        [
                          "FAVORITED_AT",
                          "DISTANCE",
                          "RECENT_CONDITION",
                        ] as const
                      )[Number(event.detail.value)] ?? "FAVORITED_AT",
                    )
                  }
                >
                  <View
                    className="sort-control focus-ring"
                    role="button"
                    aria-label="收藏排序方式"
                  >
                    <Text>
                      {favoriteSort === "FAVORITED_AT"
                        ? "收藏时间"
                        : favoriteSort === "DISTANCE"
                          ? "距离"
                          : "近期条件"}
                    </Text>
                  </View>
                </Picker>
              </View>
              {favorites.length ? (
                favorites.map((spot) => (
                  <SpotCard
                    key={spot.spotId}
                    spot={spot}
                    density="favorite"
                    favorite
                    onFavorite={() => void toggleFavorite(spot.spotId)}
                    onOpen={() => openSpot(spot.spotId)}
                  />
                ))
              ) : (
                <StatusPanel
                  state="EMPTY"
                  detail="还没有收藏观星点。地图点位卡和统一详情页都可以收藏。"
                  recoveryLabel="去地图选点"
                  onRecover={() => Taro.switchTab({ url: "/pages/map/index" })}
                />
              )}
            </View>
          ) : null}
          {tab === "PLAN" ? (
            <View className="section-stack" data-my-tab="plan">
              <View className="library-header">
                <View>
                  <Text className="type-page-title">观测计划</Text>
                  <Text className="type-caption">
                    正式点位 + 当地日期时间 + 备注
                  </Text>
                </View>
                <SoftButton
                  variant="primary"
                  label="新建观测计划"
                  onClick={() =>
                    Taro.navigateTo({ url: "/content/plan/detail/index" })
                  }
                >
                  新建
                </SoftButton>
              </View>
              {plans.length ? (
                plans.map((plan) => {
                  const spot = DEMO_SPOTS.find(
                    (item) => item.spotId === plan.spotId,
                  );
                  return (
                    <View className="plan-card card" key={plan.planId}>
                      <View>
                        <Text className="type-section">
                          {spot?.name ?? plan.spotId}
                        </Text>
                        <Text className="type-data">
                          {plan.localDate} {plan.localTime}
                        </Text>
                        <Text className="type-body">
                          {plan.notes || "无备注"}
                        </Text>
                        <Text className="type-caption">
                          修订 {plan.revision} · {plan.updatedAt}
                        </Text>
                      </View>
                      <View className="plan-card__actions">
                        <SoftButton
                          label={`编辑${spot?.name ?? "观测"}计划`}
                          onClick={() =>
                            Taro.navigateTo({
                              url: `/content/plan/detail/index?planId=${encodeURIComponent(plan.planId)}`,
                            })
                          }
                        >
                          编辑
                        </SoftButton>
                        <SoftButton
                          variant="danger"
                          label={`删除${spot?.name ?? "观测"}计划`}
                          onClick={() => void removePlan(plan.planId)}
                        >
                          删除
                        </SoftButton>
                      </View>
                    </View>
                  );
                })
              ) : (
                <StatusPanel
                  state="EMPTY"
                  detail="暂无观测计划。计划能力位于独立页签，不出现在“我的”首页摘要。"
                  recoveryLabel="新建计划"
                  onRecover={() =>
                    Taro.navigateTo({ url: "/content/plan/detail/index" })
                  }
                />
              )}
            </View>
          ) : null}
          {tab === "SETTINGS" ? (
            <View className="section-stack" data-my-tab="settings">
              <Text className="type-page-title">设置</Text>
              {preferenceSyncStatus ? (
                <StatusPanel
                  state={
                    preferenceSyncStatus.includes("仅保存在本机") ||
                    preferenceSyncStatus.includes("已有新修订")
                      ? "STALE"
                      : "READY"
                  }
                  detail={preferenceSyncStatus}
                  recoveryLabel={
                    preferenceSyncStatus.includes("仅保存在本机") ||
                    preferenceSyncStatus.includes("等待重试")
                      ? "重试同步"
                      : undefined
                  }
                  onRecover={
                    preferenceSyncStatus.includes("仅保存在本机") ||
                    preferenceSyncStatus.includes("等待重试")
                      ? () => void syncPreferences()
                      : undefined
                  }
                />
              ) : null}
              <View className="settings-card card">
                <Text className="type-section">选点与观测偏好</Text>
                <View className="form-group">
                  <Text className="type-label">默认城市或地点</Text>
                  <Input
                    className="field"
                    value={preferences.defaultPlace}
                    maxlength={80}
                    aria-label="默认城市或地点"
                    placeholder="例如：深圳"
                    onInput={(event) =>
                      setPreference("defaultPlace", event.detail.value)
                    }
                  />
                </View>
                <View className="form-group">
                  <Text className="type-label">经验水平</Text>
                  <View className="settings-choice-grid">
                    {(["BEGINNER", "ADVANCED"] as const).map((level) => (
                      <Button
                        key={level}
                        className={`chip focus-ring${preferences.experience === level ? " chip--selected" : ""}`}
                        aria-pressed={preferences.experience === level}
                        onClick={() => setPreference("experience", level)}
                      >
                        <Text>{level === "BEGINNER" ? "入门" : "进阶"}</Text>
                      </Button>
                    ))}
                  </View>
                </View>
                <View className="form-group">
                  <View className="summary-row">
                    <Text className="type-label">最长驾车时间</Text>
                    <Text className="type-data">
                      {preferences.maxDriveMinutes} 分钟
                    </Text>
                  </View>
                  <Slider
                    min={30}
                    max={360}
                    step={30}
                    value={preferences.maxDriveMinutes}
                    activeColor="var(--primary)"
                    backgroundColor="var(--border)"
                    blockColor="var(--primary)"
                    blockSize={24}
                    aria-label="最长驾车时间"
                    onChange={(event) =>
                      setPreference("maxDriveMinutes", event.detail.value)
                    }
                  />
                  <Text className="type-caption">
                    没有路线供应商时仅保留偏好，不把直线距离换算成驾车时间。
                  </Text>
                </View>
                <View className="form-group">
                  <Text className="type-label">必须设施</Text>
                  <View className="facility-choice-grid">
                    {FACILITY_PREFERENCES.map(({ key, label }) => {
                      const selected = preferences.requiredFacilities.includes(key);
                      return (
                        <Button
                          key={key}
                          className={`chip focus-ring${selected ? " chip--selected" : ""}`}
                          aria-pressed={selected}
                          onClick={() =>
                            setPreference(
                              "requiredFacilities",
                              selected
                                ? preferences.requiredFacilities.filter(
                                    (facility) => facility !== key,
                                  )
                                : [...preferences.requiredFacilities, key],
                            )
                          }
                        >
                          <Text>{selected ? "✓ " : "○ "}{label}</Text>
                        </Button>
                      );
                    })}
                  </View>
                </View>
                <View className="form-grid">
                  <View className="form-group">
                    <Text className="type-label">设备</Text>
                    <Input
                      className="field"
                      value={preferences.equipment}
                      maxlength={120}
                      aria-label="观测或摄影设备"
                      onInput={(event) =>
                        setPreference("equipment", event.detail.value)
                      }
                    />
                  </View>
                  <View className="form-group">
                    <Text className="type-label">拍摄偏好</Text>
                    <Input
                      className="field"
                      value={preferences.capturePreference}
                      maxlength={120}
                      aria-label="拍摄偏好"
                      onInput={(event) =>
                        setPreference("capturePreference", event.detail.value)
                      }
                    />
                  </View>
                </View>
                <Text className="type-caption">
                  偏好只影响候选排序与解释，不会改写天气、天文、开放状态或安全硬阻断。
                </Text>
              </View>
              <View className="settings-card card">
                <Text className="type-section">显示模式</Text>
                <View className="mode-grid">
                  {MODES.map((mode) => (
                    <Button
                      key={mode}
                      className={`chip focus-ring${preferences.displayMode === mode ? " chip--selected" : ""}`}
                      aria-pressed={preferences.displayMode === mode}
                      onClick={() => {
                        setPreference("displayMode", mode);
                        setMode(mode);
                      }}
                    >
                      <Text>{MODE_LABEL[mode]}</Text>
                    </Button>
                  ))}
                </View>
                <Text className="type-caption">
                  观测模式只在现场主动进入；此处用于预览令牌，离开专用观测页仍恢复先前上下文。
                </Text>
              </View>
              <View className="settings-card card">
                <View className="setting-row">
                  <View>
                    <Text className="type-label">大字模式</Text>
                    <Text className="type-caption">
                      四页签将重排为 2×2，无水平滚动
                    </Text>
                  </View>
                  <Switch
                    checked={preferences.largeText}
                    color="var(--primary)"
                    aria-label="大字模式"
                    onChange={(event) =>
                      setPreference("largeText", event.detail.value)
                    }
                  />
                </View>
                <View className="setting-row">
                  <View>
                    <Text className="type-label">减少动态</Text>
                    <Text className="type-caption">
                      状态反馈改为即时或不超过 100ms 透明度
                    </Text>
                  </View>
                  <Switch
                    checked={preferences.reducedMotion}
                    color="var(--primary)"
                    aria-label="减少动态"
                    onChange={(event) =>
                      setPreference("reducedMotion", event.detail.value)
                    }
                  />
                </View>
                <View className="setting-row">
                  <View>
                    <Text className="type-label">通知与订阅</Text>
                    <Text className="type-caption">
                      Demo 能力关闭；不会伪装已订阅
                    </Text>
                  </View>
                  <Switch
                    checked={false}
                    disabled
                    aria-label="通知能力当前不可用"
                  />
                </View>
              </View>
              <View className="settings-card card">
                <Text className="type-section">位置、隐私与数据</Text>
                <View className="form-group">
                  <Text className="type-label">定位偏好</Text>
                  <View className="settings-choice-grid">
                    {(["ASK_ONCE", "MANUAL_ONLY"] as const).map((choice) => (
                      <Button
                        key={choice}
                        className={`chip focus-ring${preferences.locationPreference === choice ? " chip--selected" : ""}`}
                        aria-pressed={preferences.locationPreference === choice}
                        onClick={() =>
                          setPreference("locationPreference", choice)
                        }
                      >
                        <Text>
                          {choice === "ASK_ONCE" ? "需要时询问一次" : "仅手动位置"}
                        </Text>
                      </Button>
                    ))}
                  </View>
                </View>
                <SoftButton
                  label="打开定位权限说明"
                  onClick={() => Taro.navigateTo({ url: "/pages/auth/index" })}
                >
                  定位与手动回退
                </SoftButton>
                <SoftButton
                  label="查看数据来源说明"
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/spot/data-source/index?spotId=${encodeURIComponent(DEMO_SPOTS[0]!.spotId)}`,
                    })
                  }
                >
                  数据来源与更新时间
                </SoftButton>
                <SoftButton
                  variant="danger"
                  label="清除本地地图、筛选、搜索和夜空缓存"
                  onClick={() =>
                    void Taro.showModal({
                      title: "清除本地数据？",
                      content:
                        "将清除本机地图视口、筛选、搜索记录与夜空临时缓存；服务端收藏、计划、主页链接和导入草稿不会被删除。",
                      confirmText: "清除",
                      confirmColor: "#B53A3A",
                    }).then((result) => result.confirm && clearLocalCache())
                  }
                >
                  清除临时缓存
                </SoftButton>
              </View>
              <View className="settings-card card">
                <Text className="type-section">账号与协议</Text>
                <Text className="type-caption">
                  Demo
                  未接入真实账号；注销与云端数据删除属于能力门禁。仍保留明确入口和演进接口。
                </Text>
                <SoftButton disabled label="账号注销能力当前未接入">
                  账号注销 · 未接入
                </SoftButton>
                <SoftButton disabled label="云端数据删除能力当前未接入">
                  云端数据删除 · 未接入
                </SoftButton>
                <SoftButton
                  label="关于、协议与反馈"
                  onClick={() =>
                    Taro.showModal({
                      title: "关于今晚去观星",
                      content:
                        "Demo 基线：地图选点、详情判断、点位夜空、收藏计划、外链与本人帖子导入。当前未公开运营。",
                      showCancel: false,
                    })
                  }
                >
                  关于与反馈
                </SoftButton>
              </View>
              {toast ? <StatusPanel state="READY" detail={toast} /> : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
