import Taro, { useRouter } from "@tarojs/taro";
import { Button, Image, ScrollView, Text, View } from "@tarojs/components";
import { useMemo, useState } from "react";
import type { FacilityStatus } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { DataStateBadge } from "@/components/data-state-badge";
import { Provenance } from "@/components/provenance";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useFavoriteMutation } from "@/hooks/use-favorite-mutation";
import { useThemeClass } from "@/hooks/use-theme";
import {
  getSkyReport,
  getSpotGuides,
  getSpotOverview,
  getSpotSite,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./spot-detail-page.scss";

export type SpotSegment = "OVERVIEW" | "GUIDES" | "SITE" | "SKY";
const SEGMENTS: ReadonlyArray<{ key: SpotSegment; label: string }> = [
  { key: "OVERVIEW", label: "概览" },
  { key: "GUIDES", label: "攻略" },
  { key: "SITE", label: "场地" },
  { key: "SKY", label: "夜空" },
];
const FACILITY_LABEL = {
  PARKING: "停车",
  TOILET: "厕所",
  PLATFORM: "观测平台",
  CHARGING: "充电",
  CAMPING: "露营",
  ROAD: "末段道路",
  WALKING: "徒步",
  SIGNAL: "通信信号",
} as const;
const STATUS_LABEL: Record<FacilityStatus, string> = {
  AVAILABLE: "可用",
  UNAVAILABLE: "不可用",
  UNKNOWN: "待核验",
  SEASONAL: "季节性",
};

function today() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function safeParam(value: string | undefined) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}

export function SpotDetailPage({
  initialSegment = "OVERVIEW",
}: {
  initialSegment?: SpotSegment;
}) {
  const router = useRouter();
  const spotId = safeParam(router.params.spotId);
  const themeClass = useThemeClass();
  const [segment, setSegment] = useState<SpotSegment>(initialSegment);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const { toggleFavorite } = useFavoriteMutation();
  const selectSpot = useAppStore((state) => state.selectSpot);
  const overview = useResourceQuery({
    queryKey: ["spot-overview", spotId],
    queryFn: (signal) => getSpotOverview(spotId, signal),
    enabled: spotId.startsWith("spot:"),
  });
  const guides = useResourceQuery({
    queryKey: ["spot-guides", spotId],
    queryFn: (signal) => getSpotGuides(spotId, signal),
    enabled: segment === "GUIDES" && Boolean(overview.data),
  });
  const site = useResourceQuery({
    queryKey: ["spot-site", spotId],
    queryFn: (signal) => getSpotSite(spotId, signal),
    enabled: segment === "SITE" && Boolean(overview.data),
  });
  const sky = useResourceQuery({
    queryKey: ["spot-sky-preview", spotId, today()],
    queryFn: (signal) => getSkyReport(spotId, today(), signal),
    enabled: segment === "SKY" && Boolean(overview.data),
  });
  const detail = overview.data?.data;
  const favorite = favoriteIds.includes(spotId as (typeof favoriteIds)[number]);
  const media = detail?.spot.media ?? [];
  const facilities =
    site.data?.data.facilities ?? detail?.spot.facilities ?? [];
  const sources = useMemo(
    () =>
      detail
        ? [
            ...new Map(
              detail.dataDisclosure.map((source) => [source.id, source]),
            ).values(),
          ]
        : [],
    [detail],
  );

  if (!spotId.startsWith("spot:"))
    return (
      <View className={themeClass}>
        <CustomNav title="观星点详情" back />
        <View className="page-inset">
          <StatusPanel
            state="ERROR"
            detail="缺少正式 spot_id。普通地点和当前位置不能进入观星点详情或夜空。"
            recoveryLabel="返回地图"
            onRecover={() => Taro.switchTab({ url: "/pages/map/index" })}
          />
        </View>
      </View>
    );

  const openNavigation = async () => {
    if (!detail) return;
    try {
      const choice = await Taro.showActionSheet({
        itemList: ["在微信地图查看位置", "复制 WGS84 坐标"],
      });
      if (choice.tapIndex === 0)
        await Taro.openLocation({
          latitude: detail.spot.gcj02.latitude,
          longitude: detail.spot.gcj02.longitude,
          name: detail.spot.name,
          address: `${detail.spot.address}（地点/开放/道路需核验）`,
          scale: 14,
        });
      else
        await Taro.setClipboardData({
          data: `${detail.spot.wgs84.latitude},${detail.spot.wgs84.longitude}`,
        });
    } catch (error) {
      const result = await Taro.showModal({
        title: "无法打开地图",
        content:
          "没有声称小程序内提供逐向导航。你仍可复制正式点位坐标，或稍后重试外部地图。",
        confirmText: "复制坐标",
        cancelText: "取消",
      });
      if (result.confirm) {
        await Taro.setClipboardData({
          data: `${detail.spot.wgs84.latitude},${detail.spot.wgs84.longitude}`,
        });
      }
    }
  };
  const openNight = () => {
    if (!detail) return;
    selectSpot(detail.spot.spotId);
    void Taro.navigateTo({
      url: `/spot/sky/index?spotId=${encodeURIComponent(detail.spot.spotId)}`,
    });
  };

  return (
    <View
      className={`${themeClass} spot-detail`}
      data-route="spot-detail"
      data-spot-id={spotId}
    >
      <CustomNav
        title={detail?.spot.name ?? "观星点详情"}
        subtitle={detail?.spot.region}
        back
        right={
          detail ? (
            <SoftButton
              variant="ghost"
              label={`${favorite ? "取消收藏" : "收藏"}${detail.spot.name}`}
              onClick={() => void toggleFavorite(detail.spot.spotId)}
            >
              {favorite ? "★" : "☆"}
            </SoftButton>
          ) : null
        }
      />
      {overview.isPending ? (
        <View className="page-inset">
          <StatusPanel
            state="LOADING"
            detail="首个聚合请求只加载固定头部与概览。"
          />
        </View>
      ) : overview.isError || !detail ? (
        <View className="page-inset">
          <StatusPanel
            state="ERROR"
            detail="详情概览无法加载；地图选择与返回路径仍保留。"
            recoveryLabel="重试概览"
            onRecover={() => void overview.refetch()}
          />
        </View>
      ) : (
        <>
          <View
            className="segment-nav page-inset"
            role="tablist"
            aria-label="观星点详情分段"
          >
            {SEGMENTS.map((item) => (
              <Button
                key={item.key}
                className={`segment-tab focus-ring${segment === item.key ? " segment-tab--active" : ""}`}
                aria-selected={segment === item.key}
                onClick={() => setSegment(item.key)}
              >
                <Text>{item.label}</Text>
              </Button>
            ))}
          </View>
          <ScrollView
            scrollY
            className="spot-detail__scroll"
            enhanced
            showScrollbar={false}
          >
            <View className="spot-content page-inset safe-bottom">
              {segment === "OVERVIEW" ? (
                <View className="section-stack" data-segment="overview">
                  <View>
                    <Text className="type-section">代表媒体</Text>
                    <Text className="type-caption">
                      真实星空照片优先展示；“非本点位”不会被用来证明现场条件。
                    </Text>
                  </View>
                  <ScrollView
                    scrollX
                    className="media-rail"
                    enhanced
                    showScrollbar={false}
                    aria-label="代表媒体图库"
                  >
                    {media.map((item) => (
                      <View className="media-card card" key={item.id}>
                        <Image
                          className="media-card__image"
                          src={item.localPath}
                          mode="aspectFill"
                          lazyLoad
                          aria-label={item.alt}
                        />
                        <View className="media-card__caption">
                          <Text className="type-label">{item.caption}</Text>
                          <Text className="type-caption">
                            {item.photographer} · {item.license}
                          </Text>
                          <Text className="status-tag status-tag--warning">
                            {item.isSiteSpecific
                              ? "本点位现场"
                              : "非本点位代表媒体"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                  <View className="decision-card card">
                    <View className="decision-card__top">
                      <View>
                        <Text className="type-section">今晚结论</Text>
                        <Text className="type-page-title">
                          {detail.decision.label}
                        </Text>
                      </View>
                      <DataStateBadge state={detail.decision.freshness} />
                    </View>
                    {detail.decision.bestWindow ? (
                      <Text className="type-data">
                        最佳时段 {detail.decision.bestWindow.start}—
                        {detail.decision.bestWindow.end}
                      </Text>
                    ) : (
                      <Text className="type-data">
                        最佳时段：暂无当前有效数据
                      </Text>
                    )}
                    {detail.decision.factors.map((factor) => (
                      <View
                        className={`factor factor--${factor.severity.toLowerCase()}`}
                        key={factor.code}
                      >
                        <Text className="type-label">
                          {factor.severity === "BLOCKER" ? "! " : ""}
                          {factor.label}
                        </Text>
                        <Text className="type-caption">{factor.detail}</Text>
                      </View>
                    ))}
                    <SoftButton label="查看当前点位夜空" onClick={openNight}>
                      查看夜空详情
                    </SoftButton>
                  </View>
                  <View className="route-card card">
                    <View className="route-card__top">
                      <View>
                        <Text className="type-section">路线摘要</Text>
                        <Text className="type-caption">
                          {detail.spot.address}
                        </Text>
                      </View>
                      <DataStateBadge state={detail.route.state} />
                    </View>
                    <Text className="type-data">
                      {detail.route.kind === "STRAIGHT_LINE_ONLY"
                        ? `直线距离约 ${detail.route.distanceKm ?? "暂无"} km`
                        : detail.route.driveMinutes
                          ? `驾车约 ${detail.route.driveMinutes} 分钟`
                          : "路线暂无数据"}
                    </Text>
                    <Text className="type-caption">
                      {detail.route.kind === "STRAIGHT_LINE_ONLY"
                        ? "直线距离不会标成路线；驾车时间仅在用户明确请求供应商后计算。"
                        : detail.route.lastRoad}
                    </Text>
                    <Text className="type-caption">
                      {detail.route.parkingGuidance}
                    </Text>
                    <SoftButton
                      variant="primary"
                      label="去这里，打开外部地图"
                      onClick={openNavigation}
                    >
                      去这里
                    </SoftButton>
                  </View>
                  <View className="facility-grid">
                    <Text className="type-section facility-grid__title">
                      核心设施
                    </Text>
                    {detail.spot.facilities.slice(0, 4).map((item) => (
                      <View className="facility-tile card" key={item.type}>
                        <Text className="type-label">
                          {FACILITY_LABEL[item.type]}
                        </Text>
                        <Text
                          className={`status-tag${item.status === "UNKNOWN" ? " status-tag--warning" : ""}`}
                        >
                          {STATUS_LABEL[item.status]}
                        </Text>
                        <Text className="type-caption">{item.summary}</Text>
                      </View>
                    ))}
                  </View>
                  <Button
                    className="sources-link card"
                    onClick={() =>
                      Taro.navigateTo({
                        url: `/spot/data-source/index?spotId=${encodeURIComponent(spotId)}`,
                      })
                    }
                    aria-label="查看全部数据来源与更新时间"
                  >
                    <View>
                      <Text className="type-section">数据来源与更新时间</Text>
                      <Text className="type-caption">
                        {sources.length} 个去重来源 · 缺失不显示为 0
                      </Text>
                    </View>
                    <Text aria-hidden="true">→</Text>
                  </Button>
                  {overview.data.warnings.length ? (
                    <StatusPanel
                      state={
                        overview.data.dataState === "STALE_USABLE"
                          ? "STALE"
                          : "PARTIAL"
                      }
                      detail={overview.data.warnings.join(" ")}
                      recoveryLabel={
                        overview.data.dataState === "STALE_USABLE"
                          ? "重试概览"
                          : undefined
                      }
                      onRecover={
                        overview.data.dataState === "STALE_USABLE"
                          ? () => void overview.refetch()
                          : undefined
                      }
                    />
                  ) : null}
                </View>
              ) : null}
              {segment === "GUIDES" ? (
                <View className="section-stack" data-segment="guides">
                  <View>
                    <Text className="type-section">官方与白名单攻略</Text>
                    <Text className="type-caption">
                      首次进入本分段才加载；结构化块不会执行任意 HTML。
                    </Text>
                  </View>
                  {guides.isPending ? (
                    <StatusPanel state="LOADING" detail="正在按需加载攻略。" />
                  ) : guides.isError ? (
                    <StatusPanel
                      state="ERROR"
                      detail="攻略失败不隐藏可用概览。"
                      recoveryLabel="重试攻略"
                      onRecover={() => void guides.refetch()}
                    />
                  ) : (
                    guides.data?.data.guides.map((guide) => (
                      <View className="guide-card card" key={guide.articleId}>
                        <Image
                          className="guide-card__media"
                          src={detail.spot.media[0]!.thumbnailPath}
                          mode="aspectFill"
                          aria-label={detail.spot.media[0]!.alt}
                        />
                        <View className="guide-card__body">
                          <Text className="type-section">{guide.title}</Text>
                          <Text className="type-body">{guide.summary}</Text>
                          <Text className="type-caption">
                            {guide.authorType} · {guide.authorName} · 更新{" "}
                            {guide.updatedAt} ·{" "}
                            {guide.verified ? "已核验" : "通用 Demo 清单"}
                          </Text>
                          <SoftButton
                            label={`阅读攻略 ${guide.title}`}
                            onClick={() =>
                              Taro.navigateTo({
                                url: `/content/article/detail/index?spotId=${encodeURIComponent(spotId)}&articleId=${encodeURIComponent(guide.articleId)}`,
                              })
                            }
                          >
                            阅读攻略
                          </SoftButton>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
              {segment === "SITE" ? (
                <View className="section-stack" data-segment="site">
                  <View>
                    <Text className="type-section">按真实出行顺序核验场地</Text>
                    <Text className="type-caption">
                      到达 → 停车与驻留 → 基础设施 → 观测环境 → 安全
                    </Text>
                  </View>
                  {site.isPending ? (
                    <StatusPanel
                      state="LOADING"
                      detail="正在按需加载场地信息。"
                    />
                  ) : site.isError ? (
                    <StatusPanel
                      state="ERROR"
                      detail="场地加载失败；概览和攻略仍保留。"
                      recoveryLabel="重试场地"
                      onRecover={() => void site.refetch()}
                    />
                  ) : (
                    <>
                      {facilities.map((item) => (
                        <View className="facility-row card" key={item.type}>
                          <View className="facility-row__top">
                            <Text className="type-section">
                              {FACILITY_LABEL[item.type]}
                            </Text>
                            <Text
                              className={`status-tag${item.status === "UNKNOWN" ? " status-tag--warning" : ""}`}
                            >
                              {STATUS_LABEL[item.status]}
                            </Text>
                          </View>
                          <Text className="type-body">{item.detail}</Text>
                          <Provenance source={item.source} compact />
                        </View>
                      ))}
                      <View className="safety-card card">
                        <Text className="type-section">夜间安全与限制</Text>
                        {(site.data?.data.siteSafety ?? detail.siteSafety).map(
                          (item) => (
                            <Text className="type-body" key={item}>
                              ! {item}
                            </Text>
                          ),
                        )}
                      </View>
                    </>
                  )}
                </View>
              ) : null}
              {segment === "SKY" ? (
                <View className="section-stack" data-segment="sky">
                  <View>
                    <Text className="type-section">
                      {detail.spot.name} · 夜空
                    </Text>
                    <Text className="type-caption">
                      正式 spot_id + 当地日期 + 时区；不能切换为普通地点。
                    </Text>
                  </View>
                  {sky.isPending ? (
                    <StatusPanel
                      state="LOADING"
                      detail="正在按需加载夜空摘要。"
                    />
                  ) : sky.isError ? (
                    <StatusPanel
                      state="ERROR"
                      detail="夜空计算失败；静态场地和攻略仍可用。"
                      recoveryLabel="重试夜空"
                      onRecover={() => void sky.refetch()}
                    />
                  ) : sky.data ? (
                    <>
                      <View className="decision-card card">
                        <View className="decision-card__top">
                          <Text className="type-section">今晚结论</Text>
                          <DataStateBadge state={sky.data.dataState} />
                        </View>
                        <Text className="type-page-title">
                          {sky.data.data.decision.label}
                        </Text>
                        <Text className="type-body">
                          月亮：{sky.data.data.moonSummary}
                        </Text>
                        <Text className="type-body">
                          银河：{sky.data.data.milkyWayDirection}
                        </Text>
                      </View>
                      <View className="targets-card card">
                        <Text className="type-section">今晚推荐观测目标</Text>
                        {sky.data.data.targets.length ? (
                          sky.data.data.targets.map((target) => (
                            <View className="target-row" key={target.targetId}>
                              <View>
                                <Text className="type-label">
                                  {target.displayName}
                                </Text>
                                <Text className="type-caption">
                                  {target.window
                                    ? `${target.window.start}—${target.window.end}`
                                    : "窗口不足"}{" "}
                                  · {target.direction} ·{" "}
                                  {target.altitudeDeg ?? "?"}°
                                </Text>
                              </View>
                              <Text className="type-caption">
                                {target.reason}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <StatusPanel
                            state="EMPTY"
                            detail="没有把猎户座、木星、金星、流星雨或伴月设计示例冒充当前可见目标。启动计算 BFF 后按当前点位/日期生成。"
                          />
                        )}
                      </View>
                      <SoftButton
                        variant="primary"
                        label="打开完整夜空页面"
                        onClick={openNight}
                      >
                        完整夜空与观测模式
                      </SoftButton>
                      {sky.data.warnings.length ? (
                        <StatusPanel
                          state="PARTIAL"
                          detail={sky.data.warnings.join(" ")}
                        />
                      ) : null}
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          </ScrollView>
          <View className="detail-actions safe-bottom">
            <SoftButton
              label={`${favorite ? "取消收藏" : "收藏"}${detail.spot.name}`}
              onClick={() => void toggleFavorite(detail.spot.spotId)}
            >
              {favorite ? "★ 已收藏" : "☆ 收藏"}
            </SoftButton>
            <SoftButton label="查看当前点位夜空" onClick={openNight}>
              查看夜空
            </SoftButton>
            <SoftButton
              variant="primary"
              label="去这里，打开外部地图"
              onClick={openNavigation}
            >
              去这里
            </SoftButton>
          </View>
        </>
      )}
    </View>
  );
}
