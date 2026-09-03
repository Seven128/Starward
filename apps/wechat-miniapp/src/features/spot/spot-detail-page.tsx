import Taro, { useRouter } from "@tarojs/taro";
import { Button, Image, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";
import type {
  FacilityStatus,
  RouteOverview,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { DataStateBadge } from "@/components/data-state-badge";
import { NotificationRegion } from "@/components/notification";
import { Provenance } from "@/components/provenance";
import { FavoriteStar } from "@/components/selected-card-star";
import { SemanticIcon } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useFavoriteMutation } from "@/hooks/use-favorite-mutation";
import { useThemeClass } from "@/hooks/use-theme";
import {
  estimateSpotRoute,
  getSpotGuides,
  getSpotOverview,
  getSpotSite,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import {
  GUIDE_AUTHOR_LABELS,
  formatDisplayDate,
} from "@/utils/presentation";
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
const OPENNESS_LABEL = {
  OPEN: "开放",
  CONDITIONAL: "有条件开放",
  CLOSED: "暂时关闭",
  UNKNOWN: "开放状态待核验",
} as const;
const LEGAL_ACCESS_LABEL = {
  PERMITTED: "允许进入",
  CONDITIONAL: "需满足进入条件",
  PROHIBITED: "禁止进入",
  UNKNOWN: "进入规则待核验",
} as const;
const NIGHT_SAFETY_LABEL = {
  NO_KNOWN_HAZARD: "未发现明确夜间危险",
  CAUTION: "夜间需谨慎",
  DANGER: "存在明确危险",
  UNKNOWN: "夜间安全待核验",
} as const;

function safeParam(value: string | undefined) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}

function formatObservationTime(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return "当前时刻";
  }
}

function isCancelledAction(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return message.toLowerCase().includes("cancel");
}

export function SpotDetailPage({
  initialSegment = "OVERVIEW",
}: {
  initialSegment?: SpotSegment;
}) {
  const router = useRouter();
  const spotId = safeParam(router.params.spotId);
  const routeContextId = safeParam(router.params.contextId);
  const themeClass = useThemeClass();
  const [segment, setSegment] = useState<SpotSegment>(initialSegment);
  const [requestedRoute, setRequestedRoute] = useState<RouteOverview | null>(
    null,
  );
  const [routePending, setRoutePending] = useState(false);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const { toggleFavorite } = useFavoriteMutation();
  const selectSpot = useAppStore((state) => state.selectSpot);
  const notify = useAppStore((state) => state.notify);
  const observationContext = useAppStore(
    (state) => state.observationContext,
  );
  const contextComplete = Boolean(
    routeContextId &&
      observationContext &&
      observationContext.contextId === routeContextId &&
      observationContext.location.kind === "FORMAL_SPOT" &&
      observationContext.location.spotId === spotId,
  );
  const overview = useResourceQuery({
    queryKey: [
      "spot-overview",
      spotId,
      observationContext?.contextId,
      observationContext?.contextFingerprint,
      observationContext?.revision,
    ],
    queryFn: (signal) =>
      getSpotOverview(spotId, routeContextId, signal),
    enabled: spotId.startsWith("spot:") && contextComplete,
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
  const heroMedia = media.find((item) => item.isSiteSpecific);
  const facilities =
    site.data?.data.facilities ?? detail?.spot.facilities ?? [];
  const accessAndSafety =
    site.data?.data.accessAndSafety ?? detail?.accessAndSafety;
  const siteMediaState =
    site.data?.data.siteMediaState ?? detail?.siteMediaState;
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
  useEffect(() => {
    setRequestedRoute(null);
    setRoutePending(false);
  }, [spotId, routeContextId]);
  const segmentIndex = Math.max(
    0,
    SEGMENTS.findIndex((item) => item.key === segment),
  );

  const effectiveRoute = requestedRoute ?? detail?.route;
  const routeHeadline = effectiveRoute
    ? effectiveRoute.kind === "ROUTE_ESTIMATE"
      ? [
          effectiveRoute.originLabel ? `从${effectiveRoute.originLabel}` : null,
          effectiveRoute.driveMinutes !== null
            ? `驾车约 ${effectiveRoute.driveMinutes} 分钟`
            : null,
          effectiveRoute.distanceKm !== null
            ? `路线约 ${effectiveRoute.distanceKm} km`
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || "路线结果暂不完整"
      : effectiveRoute.kind === "STRAIGHT_LINE_ONLY"
        ? effectiveRoute.distanceKm !== null
          ? `直线距离约 ${effectiveRoute.distanceKm} km`
          : "直线距离暂不可用"
        : "路线服务暂不可用"
    : "";

  if (!spotId.startsWith("spot:") || !contextComplete || !observationContext)
    return (
      <View className={themeClass}>
        <CustomNav title="观星点详情" back />
        <View className="page-inset">
          <StatusPanel
            state="ERROR"
            detail="缺少由地图正式入口生成的观测上下文，或上下文与当前正式点位不一致。普通地点和当前位置不能进入观星点详情或夜空。"
            recoveryLabel="返回地图"
            onRecover={() => Taro.switchTab({ url: "/pages/map/index" })}
          />
        </View>
      </View>
    );

  const openNavigation = async () => {
    if (!detail) return;
    const canCopyExact = detail.spot.visibilityPolicy === "PUBLIC_EXACT";
    const hasTravelBlocker = Boolean(
      detail.accessAndSafety.explicitDanger ||
        detail.accessAndSafety.openness === "CLOSED" ||
        detail.accessAndSafety.legalAccess === "PROHIBITED" ||
        detail.accessAndSafety.nightSafety === "DANGER",
    );
    if (hasTravelBlocker) {
      const warning = await Taro.showModal({
        title: "当前存在出行阻断",
        content: [
          ...detail.accessAndSafety.restrictions,
          ...detail.accessAndSafety.guidance,
        ].join("；") || "当前开放、进入或夜间安全状态不支持直接前往。",
        confirmText: "仍要查看",
        cancelText: "暂不前往",
      });
      if (!warning.confirm) return;
    }

    let tapIndex: number;
    try {
      const choice = await Taro.showActionSheet({
        itemList: canCopyExact
          ? ["在微信地图查看位置", "复制坐标"]
          : ["在微信地图查看位置"],
      });
      tapIndex = choice.tapIndex;
    } catch (error) {
      if (isCancelledAction(error)) return;
      tapIndex = 0;
    }

    try {
      if (tapIndex === 0) {
        if (effectiveRoute?.originLabel) {
          setRoutePending(true);
          try {
            const response = await estimateSpotRoute(
              observationContext.contextId,
              detail.spot.spotId,
            );
            setRequestedRoute(response.data);
            if (response.dataState !== "FRESH")
              notify({
                owner: "spot-detail",
                placement: "inline",
                tone: "warning",
                title: "路线估算暂不可用",
                body: "已保留已核验的末段道路与停车信息，并继续使用微信外部地图。",
                dismissible: true,
                dedupeKey: "spot-route-unavailable",
              });
          } catch {
            notify({
              owner: "spot-detail",
              placement: "inline",
              tone: "warning",
              title: "路线估算暂不可用",
              body: "没有用直线距离冒充驾车路线；将继续使用微信外部地图。",
              dismissible: true,
              dedupeKey: "spot-route-request-failed",
            });
          } finally {
            setRoutePending(false);
          }
        }
        await Taro.openLocation({
          latitude: detail.spot.gcj02.latitude,
          longitude: detail.spot.gcj02.longitude,
          name: detail.spot.name,
          address: detail.spot.address,
          scale: 14,
        });
      } else if (canCopyExact) {
        await Taro.setClipboardData({
          data: `${detail.spot.wgs84.latitude},${detail.spot.wgs84.longitude}`,
        });
      }
    } catch (error) {
      if (isCancelledAction(error)) return;
      if (!canCopyExact) {
        await Taro.showModal({
          title: "无法打开地图",
          content: "外部地图暂未打开。此点位不公开精确坐标，请稍后重试。",
          showCancel: false,
          confirmText: "知道了",
        });
        return;
      }
      const result = await Taro.showModal({
        title: "无法打开地图",
        content: "外部地图暂未打开。你可以复制该公开点位坐标，或稍后重试。",
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
    const params = [
      ["spotId", detail.spot.spotId],
      ["contextId", observationContext.contextId],
      ["date", observationContext.localDate],
      ["selectedAt", observationContext.selectedAtUtc],
      ["timezone", observationContext.timezone],
      ["dataRevision", detail.decision.inputDigest],
    ]
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join("&");
    void Taro.navigateTo({
      url: `/sky/detail/index?${params.toString()}`,
    });
  };

  return (
    <View
      className={`${themeClass} spot-detail`}
      data-route="spot-detail"
      data-spot-id={spotId}
    >
      <CustomNav
        title={detail ? "" : "观星点详情"}
        back
        right={
          detail ? (
            <Button
              compileMode
              className={`spot-favorite-action focus-ring${favorite ? " spot-favorite-action--active" : ""}`}
              data-od-id="spot-detail-favorite"
              ariaLabel={`${favorite ? "取消收藏" : "收藏"}${detail.spot.name}`}
              onClick={() => void toggleFavorite(detail.spot.spotId)}
            >
              <FavoriteStar active={favorite} />
            </Button>
          ) : undefined
        }
      />
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
            {heroMedia ? (
              <Image
                className="spot-identity__media"
                src={heroMedia.localPath}
                mode="aspectFill"
                aria-label={heroMedia.alt}
              />
            ) : null}
            <View className="spot-identity__shade" aria-hidden="true" />
            <View className="spot-identity__copy">
              <Text className="spot-identity__eyebrow type-caption">
                {detail.spot.region}
              </Text>
              <Text className="type-page-title">{detail.spot.name}</Text>
              <Text className="type-caption">{detail.spot.address}</Text>
              <Text className="type-caption">
                正式观星点 · {detail.spot.lightPollution.label} · 最近核验{" "}
                {detail.spot.lastVerifiedAt?.slice(0, 10) ?? "暂无"}
              </Text>
            </View>
          </View>
          <View className="spot-detail-lead page-inset">
            <View className="detail-route-row">
              <View className="detail-route-row__copy">
                <Text className="type-data">{routeHeadline}</Text>
                <Text className="type-caption">
                  {effectiveRoute?.kind === "STRAIGHT_LINE_ONLY"
                    ? "这是直线距离，不代表实际道路里程。"
                    : "出发前请再次核验道路与开放状态。"}
                </Text>
              </View>
              <Button
                className="detail-route-action focus-ring"
                data-od-id="spot-detail-route-action"
                aria-label={`去这里，打开${detail.spot.name}外部地图`}
                {...(routePending ? { disabled: true } : {})}
                onClick={openNavigation}
              >
                <Text>{routePending ? "正在准备…" : "去这里 →"}</Text>
              </Button>
            </View>
            <View className="decision-card card spot-detail-lead__decision">
              <View className="decision-card__top">
                <Text className="decision-card__label">{detail.decision.label}</Text>
                <DataStateBadge state={detail.decision.freshness} />
              </View>
              {detail.decision.skyOpportunity.primaryWindow ? (
                <Text className="type-data">
                  {formatObservationTime(
                    detail.decision.skyOpportunity.primaryWindow.start,
                    detail.spot.timezone,
                  )}
                  —
                  {formatObservationTime(
                    detail.decision.skyOpportunity.primaryWindow.end,
                    detail.spot.timezone,
                  )}
                  （{detail.decision.skyOpportunity.primaryWindow.durationMinutes} 分钟）
                </Text>
              ) : (
                <Text className="type-data">当前没有可核验的观测窗口</Text>
              )}
              {detail.decision.factors.slice(0, 1).map((factor) => (
                <View
                  className={`factor factor--${factor.severity.toLowerCase()}`}
                  key={factor.code}
                >
                  <Text className="type-caption">{factor.detail}</Text>
                </View>
              ))}
            </View>
            <Button
              className="night-entry focus-ring"
              data-od-id="spot-detail-night-entry"
              aria-label={`查看${detail.spot.name}今晚夜空`}
              onClick={openNight}
            >
              <SemanticIcon name="horizon" className="night-entry__icon" />
              <View className="night-entry__copy">
                <Text className="type-label">今晚夜空</Text>
                <Text className="type-caption">
                  观测条件、天空方向与专业数据
                </Text>
              </View>
              <View className="night-entry__time">
                {formatObservationTime(
                  observationContext.selectedAtUtc,
                  observationContext.timezone,
                )} <SemanticIcon name="chevron-right" />
              </View>
            </Button>
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
              style={{
                transform: `translateX(${segmentIndex * 100}%)`,
              }}
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
                  <View className="route-card card">
                    <View className="route-card__top">
                      <View>
                        <Text className="type-section">路线摘要</Text>
                        <Text className="type-caption">
                          {detail.spot.address}
                        </Text>
                      </View>
                      <DataStateBadge state={effectiveRoute?.state ?? "UNAVAILABLE"} />
                    </View>
                    <Text className="type-data">{routeHeadline}</Text>
                    <Text className="type-caption">
                      {effectiveRoute?.kind === "STRAIGHT_LINE_ONLY"
                        ? "直线距离不会标成路线；仅在你明确请求时计算外部路线。"
                        : effectiveRoute?.kind === "UNAVAILABLE"
                          ? "路线供应方暂不可用，你仍可查看已核验的到达信息。"
                          : `路线数据来自 ${effectiveRoute?.source.provider ?? "当前路线供应方"}。`}
                    </Text>
                    <Text className="type-caption">
                      末段道路：{detail.route.lastRoad}
                    </Text>
                    <Text className="type-caption">
                      停车：{detail.route.parkingGuidance}
                    </Text>
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
                  <View className="media-section">
                    <View className="segment-panel__heading">
                      <Text className="type-section">代表媒体</Text>
                      <Text className="type-caption">
                        {__MINIAPP_DEVELOPMENT_FIXTURE_MODE__
                          ? "当前图片仅用于检查页面排版，不是这个地点的现场照片。"
                          : "只有已核验的本点位照片才作为现场证据。"}
                      </Text>
                    </View>
                    {media.length ? (
                      <View className="media-list" aria-label="代表媒体图库">
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
                              <Text
                                className={`status-tag${
                                  __MINIAPP_DEVELOPMENT_FIXTURE_MODE__ ||
                                  !item.isSiteSpecific
                                    ? " status-tag--warning"
                                    : ""
                                }`}
                              >
                                {__MINIAPP_DEVELOPMENT_FIXTURE_MODE__
                                  ? "排版测试图片 · 非现场照片"
                                  : item.isSiteSpecific
                                    ? "本点位现场"
                                    : "非本点位代表媒体"}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View className="media-empty card">
                        <Text className="type-label">暂无已核验现场照片</Text>
                        <Text className="type-caption">
                          地点、拍摄时间和授权确认后才会展示。
                        </Text>
                      </View>
                    )}
                  </View>
                  <Button
                    className="sources-link card"
                    data-od-id="spot-source-evidence"
                    onClick={() =>
                      Taro.navigateTo({
                        url:
                          "/spot/data-source/index?spotId=" +
                          encodeURIComponent(spotId) +
                          "&contextId=" +
                          encodeURIComponent(observationContext.contextId),
                      })
                    }
                    aria-label="查看全部数据来源与更新时间"
                  >
                    <View>
                      <Text className="type-section">数据来源与更新时间</Text>
                      <Text className="type-caption">
                        {sources.length} 项独立来源 · 缺失项不会显示为 0
                      </Text>
                    </View>
                    <SemanticIcon name="chevron-right" />
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
                  <View className="segment-panel__heading">
                    <Text className="type-section">官方与白名单攻略</Text>
                    <Text className="type-caption">
                      打开攻略时再加载内容；页面采用安全图文格式，不运行外部网页脚本。
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
                            {GUIDE_AUTHOR_LABELS[guide.authorType]} ·{" "}
                            {guide.authorName} · 更新{" "}
                            {formatDisplayDate(guide.updatedAt)} ·{" "}
                            {guide.verified ? "已核验" : "来源待核验"}
                          </Text>
                          <SoftButton
                            label={`阅读攻略 ${guide.title}`}
                            onClick={() =>
                              Taro.navigateTo({
                                url:
                                  "/content/article/detail/index?spotId=" +
                                  encodeURIComponent(spotId) +
                                  "&contextId=" +
                                  encodeURIComponent(
                                    observationContext.contextId,
                                  ) +
                                  "&articleId=" +
                                  encodeURIComponent(guide.articleId),
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
                  <View className="segment-panel__heading">
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
                        {accessAndSafety ? (
                          <>
                            <View className="safety-card__status-row">
                              <Text className="status-tag">
                                {OPENNESS_LABEL[accessAndSafety.openness]}
                              </Text>
                              <Text className="status-tag">
                                {LEGAL_ACCESS_LABEL[accessAndSafety.legalAccess]}
                              </Text>
                              <Text
                                className={`status-tag${accessAndSafety.nightSafety === "DANGER" || accessAndSafety.explicitDanger ? " status-tag--warning" : ""}`}
                              >
                                {NIGHT_SAFETY_LABEL[accessAndSafety.nightSafety]}
                              </Text>
                            </View>
                            {[
                              ...accessAndSafety.restrictions,
                              ...accessAndSafety.guidance,
                            ].map((item) => (
                              <Text className="type-body" key={item}>
                                ! {item}
                              </Text>
                            ))}
                          </>
                        ) : null}
                        {siteMediaState === "NO_SITE_MEDIA_VERIFIED" ? (
                          <Text className="type-caption">
                            当前没有已核验的本点位现场照片，页面媒体不会标作实景证据。
                          </Text>
                        ) : null}
                      </View>
                    </>
                  )}
                  <Button
                    className="sources-link contribution-link card"
                    data-od-id="spot-contribution-entry"
                    onClick={() =>
                      Taro.navigateTo({
                        url:
                          "/content/contribution/index?spotId=" +
                          encodeURIComponent(spotId) +
                          "&spotName=" +
                          encodeURIComponent(detail.spot.name),
                      })
                    }
                    aria-label={`反馈 ${detail.spot.name} 的现场情况或资料错误`}
                  >
                    <View>
                      <Text className="type-section">反馈现场情况</Text>
                      <Text className="type-caption">
                        上传道路、停车、开放、安全或地平遮挡等现场依据
                      </Text>
                    </View>
                    <SemanticIcon name="chevron-right" />
                  </Button>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}
