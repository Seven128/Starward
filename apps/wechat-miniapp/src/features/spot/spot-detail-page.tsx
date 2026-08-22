import Taro, { useRouter } from "@tarojs/taro";
import { Button, Image, ScrollView, Text, View } from "@tarojs/components";
import { useMemo, useState } from "react";
import type { FacilityStatus } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { DataStateBadge } from "@/components/data-state-badge";
import { NotificationRegion } from "@/components/notification";
import { Provenance } from "@/components/provenance";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useFavoriteMutation } from "@/hooks/use-favorite-mutation";
import { useThemeClass } from "@/hooks/use-theme";
import {
  getSpotGuides,
  getSpotOverview,
  getSpotSite,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./spot-detail-page.scss";

export type SpotSegment = "OVERVIEW" | "GUIDES" | "SITE";
const SEGMENTS: ReadonlyArray<{ key: SpotSegment; label: string }> = [
  { key: "OVERVIEW", label: "概览" },
  { key: "GUIDES", label: "攻略" },
  { key: "SITE", label: "场地" },
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
  const selectedAt = useAppStore((state) => state.selectedAt);
  const setSelectedAt = useAppStore((state) => state.setSelectedAt);
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
  const segmentIndex = Math.max(
    0,
    SEGMENTS.findIndex((item) => item.key === segment),
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
    const fallbackDate = today();
    const storedAt = Date.parse(selectedAt);
    const nightSelectedAt = Number.isFinite(storedAt)
      ? selectedAt
      : `${fallbackDate}T20:00:00+08:00`;
    const localDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: detail.spot.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.parse(nightSelectedAt) - 12 * 60 * 60 * 1000));
    if (nightSelectedAt !== selectedAt) setSelectedAt(nightSelectedAt);
    selectSpot(detail.spot.spotId);
    const params = [
      ["spotId", detail.spot.spotId],
      ["date", localDate],
      ["selectedAt", nightSelectedAt],
      ["timezone", detail.spot.timezone],
      ["dataRevision", detail.decision.inputDigest],
    ]
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join("&");
    void Taro.navigateTo({
      url: `/spot/sky/index?${params.toString()}`,
    });
  };

  return (
    <View
      className={`${themeClass} spot-detail`}
      data-route="spot-detail"
      data-spot-id={spotId}
    >
      <CustomNav title="观星点详情" back />
      <View className="page-inset">
        <NotificationRegion owner="spot-detail" />
      </View>
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
          <View className="spot-identity page-inset" data-od-id="spot-detail">
            <View className="spot-identity__name-row">
              <Text className="type-page-title">{detail.spot.name}</Text>
              <Button
                className={`spot-favorite-action focus-ring${favorite ? " spot-favorite-action--active" : ""}`}
                data-od-id="spot-detail-favorite"
                aria-label={`${favorite ? "取消收藏" : "收藏"}${detail.spot.name}`}
                aria-pressed={favorite}
                onClick={() => void toggleFavorite(detail.spot.spotId)}
              >
                <Text aria-hidden="true">{favorite ? "★" : "☆"}</Text>
                <Text className="native-accessibility-label">
                  {favorite ? "取消收藏" : "收藏"}
                  {detail.spot.name}
                </Text>
              </Button>
            </View>
            <Text className="type-caption">
              {detail.spot.region} · {detail.spot.address}
            </Text>
            <View className="spot-identity__actions">
              <Text className="type-caption">
                正式点位 · {detail.spot.timezone} · WGS84
              </Text>
              <Button
                className="spot-night-entry focus-ring"
                data-od-id="spot-detail-night-entry"
                aria-label={`查看${detail.spot.name}此处夜空`}
                onClick={openNight}
              >
                <Text>查看此处夜空 →</Text>
              </Button>
            </View>
          </View>
          <View
            className="segment-nav page-inset"
            data-od-id="spot-detail-tabs"
            role="tablist"
            aria-label="观星点详情分段"
          >
            {SEGMENTS.map((item, index) => (
              <Button
                key={item.key}
                id={`spot-segment-tab-${item.key.toLowerCase()}`}
                className={`segment-tab focus-ring${segment === item.key ? " segment-tab--active" : ""}`}
                aria-selected={segment === item.key}
                aria-controls={`spot-detail-panel-${item.key.toLowerCase()}`}
                aria-role="tab"
                onClick={() => setSegment(item.key)}
              >
                <Text>{item.label}</Text>
              </Button>
            ))}
            <View
              className="segment-indicator"
              data-od-id="spot-detail-tab-indicator"
              aria-hidden="true"
              style={{ transform: `translateX(${segmentIndex * 100}%)` }}
            />
          </View>
          <ScrollView
            scrollY
            className="spot-detail__scroll"
            data-od-id="spot-detail-panel"
            enhanced
            showScrollbar={false}
          >
            <View className="spot-content page-inset safe-bottom">
              {segment === "OVERVIEW" ? (
                <View
                  className="section-stack segment-panel"
                  data-segment="overview"
                  data-od-id="spot-detail-overview"
                  id="spot-detail-panel-overview"
                  role="tabpanel"
                  aria-labelledby="spot-segment-tab-overview"
                >
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
                    <Button
                      className="quiet-route-action focus-ring"
                      data-od-id="spot-detail-route-action"
                      aria-label={`去这里，打开${detail.spot.name}外部地图`}
                      onClick={openNavigation}
                    >
                      <Text>去这里 →</Text>
                    </Button>
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
                    data-od-id="spot-source-evidence"
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
                <View
                  className="section-stack segment-panel"
                  data-segment="guides"
                  id="spot-detail-panel-guides"
                  role="tabpanel"
                  aria-labelledby="spot-segment-tab-guides"
                >
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
                        {detail.spot.media[0] ? (
                          <Image
                            className="guide-card__media"
                            src={detail.spot.media[0].thumbnailPath}
                            mode="aspectFill"
                            aria-label={detail.spot.media[0].alt}
                          />
                        ) : (
                          <View className="guide-card__media guide-card__media--empty">
                            <Text className="type-caption">暂无授权媒体</Text>
                          </View>
                        )}
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
                <View
                  className="section-stack segment-panel"
                  data-segment="site"
                  data-od-id="spot-detail-site"
                  id="spot-detail-panel-site"
                  role="tabpanel"
                  aria-labelledby="spot-segment-tab-site"
                >
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
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}
