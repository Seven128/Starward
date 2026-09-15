import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidHide, useDidShow, useRouter } from "@tarojs/taro";
import { Button, Image, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import type {
  ObservationContext,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { NotificationRegion } from "@/components/notification";
import { Provenance } from "@/components/provenance";
import { SemanticIcon } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { StatusPanel } from "@/components/status-panel";
import { FavoriteStar } from "@/components/selected-card-star";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useFavoriteMutation } from "@/hooks/use-favorite-mutation";
import { useThemeClass } from "@/hooks/use-theme";
import {
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
import { guideThumbnail } from "./guide-media";
import { FacilityEvidenceDetails } from "@/components/facility-evidence";

export type SpotSegment = "GUIDES" | "SITE";
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
      hourCycle: "h23",
    }).format(new Date(value));
  } catch {
    return "当前时刻";
  }
}

function isCancelledAction(error: unknown) {
  const message =
    error instanceof Error ? error.message
      : error && typeof error === "object" && "errMsg" in error
        ? String(error.errMsg)
        : String(error ?? "");
  return message.toLowerCase().includes("cancel");
}

export function SpotDetailPage({
  initialSegment,
  observationContextOverride,
  contextRefreshError = false,
  onContextRefresh,
}: {
  initialSegment: SpotSegment;
  observationContextOverride?: ObservationContext;
  contextRefreshError?: boolean;
  onContextRefresh?: () => void;
}) {
  const router = useRouter();
  const spotId = safeParam(router.params.spotId);
  const routeContextId = safeParam(router.params.contextId);
  const themeClass = useThemeClass();
  const segment = initialSegment;
  const [mapReturnFailed, setMapReturnFailed] = useState(false);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const { toggleFavorite } = useFavoriteMutation();
  const notify = useAppStore((state) => state.notify);
  const storedObservationContext = useAppStore(
    (state) => state.observationContext,
  );
  const observationContext = observationContextOverride ?? storedObservationContext;
  const navigationEpoch = useRef(0);
  const [pageVisible, setPageVisible] = useState(true);
  const detailPagePending = useRef(false);
  const navigationScope = useRef("");
  const scope = JSON.stringify([spotId, routeContextId, observationContext?.contextFingerprint, observationContext?.revision]);
  if (navigationScope.current !== scope) {
    navigationScope.current = scope;
    navigationEpoch.current += 1;
  }
  useDidShow(() => setPageVisible(true));
  useDidHide(() => { navigationEpoch.current += 1; setPageVisible(false); });
  useEffect(() => () => { navigationEpoch.current += 1; }, []);
  const contextComplete = Boolean(
    routeContextId &&
      observationContext &&
      observationContext.contextId === routeContextId &&
      observationContext.location.kind === "FORMAL_SPOT" &&
      observationContext.location.spotId === spotId,
  );
  const validRoute = spotId.startsWith("spot:") && contextComplete;
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
    enabled: validRoute && pageVisible,
  });
  const guides = useResourceQuery({
    queryKey: ["spot-guides", spotId],
    queryFn: (signal) => getSpotGuides(spotId, signal),
    enabled: validRoute && pageVisible && segment === "GUIDES" && overview.data?.data.spot.spotId === spotId,
  });
  const site = useResourceQuery({
    queryKey: ["spot-site", spotId],
    queryFn: (signal) => getSpotSite(spotId, signal),
    enabled: validRoute && pageVisible && segment === "SITE" && overview.data?.data.spot.spotId === spotId,
  });
  const detail = validRoute && overview.data?.data.spot.spotId === spotId ? overview.data.data : undefined;
  const favorite = favoriteIds.includes(spotId as (typeof favoriteIds)[number]);
  const facilities =
    site.data?.data.facilities ?? detail?.spot.facilities ?? [];
  const sharedFacilitySource = facilities.length > 1 && facilities.every(item =>
    JSON.stringify(item.source) === JSON.stringify(facilities[0]!.source)) ? facilities[0]!.source : null;
  const sharedFacilityVerification = facilities.length > 1 && facilities[0]!.verifiedAt &&
    facilities.every(item => item.verifiedAt === facilities[0]!.verifiedAt)
    ? facilities[0]!.verifiedAt : null;
  const accessAndSafety =
    site.data?.data.accessAndSafety ?? detail?.accessAndSafety;
  const siteMediaState =
    site.data?.data.siteMediaState ?? detail?.siteMediaState;
  useEffect(() => {
    const failed = overview.isError
      ? ["地点资料数据异常", "地点资料暂时无法读取，可在页面中重试。", `overview:${spotId}`]
      : segment === "GUIDES" && guides.isError
        ? ["攻略数据异常", "本地点的攻略暂时无法读取，可在页面中重试。", `guides:${spotId}`]
        : segment === "SITE" && site.isError
          ? ["场地数据异常", "场地与设施资料暂时无法读取，可在页面中重试。", `site:${spotId}`]
          : null;
    if (!pageVisible || !failed) return;
    notify({ owner: "spot-detail", placement: "floating", tone: "info",
      title: failed[0]!, body: failed[1]!, dedupeKey: `spot-detail-resource-failed:${failed[2]}` });
  }, [guides.isError, notify, overview.isError, pageVisible, segment, site.isError, spotId]);
  const effectiveRoute = detail?.route;
  const routeHeadline = effectiveRoute?.kind === "STRAIGHT_LINE_ONLY" && effectiveRoute.distanceKm != null
    ? `直线距离约 ${effectiveRoute.distanceKm} km` : "暂无数据";

  const returnToMap = async () => {
    if (detailPagePending.current) return;
    detailPagePending.current = true;
    try {
      await Taro.switchTab({ url: "/pages/map/index" });
      setMapReturnFailed(false);
    } catch { setMapReturnFailed(true); }
    finally { detailPagePending.current = false; }
  };

  if (!validRoute || !observationContext)
    return (
      <View className={themeClass}>
      <FloatingNotificationHost />
        <CustomNav title="观星点详情" back />
        <View className="page-inset">
          <StatusPanel
            state="EMPTY"
            detail={mapReturnFailed ? "地图暂未打开，请重试。" : "无法确认当前观星点，请返回地图重新选择。"}
            recoveryLabel={mapReturnFailed ? "重试返回地图" : "返回地图"}
            onRecover={() => void returnToMap()}
          />
        </View>
      </View>
    );

  const openDetailPage = async (url: string, label: string) => {
    if (detailPagePending.current) return;
    detailPagePending.current = true;
    const epoch = navigationEpoch.current;
    const dedupeKey = "spot-detail-page-navigation-failed";
    try {
      await Taro.navigateTo({ url });
      const state = useAppStore.getState();
      for (const notification of state.notifications) {
        if (notification.owner === "spot-detail" && notification.dedupeKey === dedupeKey)
          state.dismissNotification(notification.id);
      }
    } catch {
      if (epoch !== navigationEpoch.current) return;
      notify({ owner: "spot-detail", placement: "inline", tone: "error",
        title: `${label}暂未打开`, body: "当前内容已保留，请再次点击入口重试。",
        dismissible: true, dedupeKey });
    } finally { detailPagePending.current = false; }
  };

  const openNavigation = async () => {
    if (!detail) return;
    const operation = ++navigationEpoch.current;
    const current = () => operation === navigationEpoch.current && navigationScope.current === scope;

    try {
    const canCopyExact = detail.spot.visibilityPolicy === "PUBLIC_EXACT";
    if (!canCopyExact) {
      notify({ owner: "spot-detail", placement: "inline", tone: "warning", title: "坐标不对外开放", body: "该点位不允许向外部地图发送精确坐标；请查看公开的到达说明。", dismissible: true, dedupeKey: `spot-navigation-restricted:${detail.spot.spotId}` });
      return;
    }
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
      if (!current() || !warning.confirm) return;
    }

    let tapIndex: number;
    try {
      const choice = await Taro.showActionSheet({
        itemList: canCopyExact
          ? ["在微信地图查看位置", "复制坐标"]
          : ["在微信地图查看位置"],
      });
      if (!current()) return;
      tapIndex = choice.tapIndex;
    } catch (error) {
      if (!current() || isCancelledAction(error)) return;
      notify({ owner: "spot-detail", placement: "inline", tone: "warning", title: "导航选项暂未打开", body: "请重试并选择查看位置或复制坐标。", dismissible: true, dedupeKey: "spot-navigation-choice-failed" });
      return;
    }

    try {
      if (tapIndex === 0) {
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
      if (!current() || isCancelledAction(error)) return;
      if (tapIndex === 1) {
        notify({ owner: "spot-detail", placement: "inline", tone: "warning", title: "坐标未能复制", body: "请重试复制坐标；本次没有打开外部地图。", dismissible: true, dedupeKey: "spot-coordinate-copy-failed" });
        return;
      }
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
      if (current() && result.confirm) {
        await Taro.setClipboardData({
          data: `${detail.spot.wgs84.latitude},${detail.spot.wgs84.longitude}`,
        });
      }
    }
    } catch (error) {
      if (!current() || isCancelledAction(error)) return;
      notify({ owner: "spot-detail", placement: "inline", tone: "warning", title: "本次导航操作未完成", body: "提示或复制操作暂不可用，请返回页面重试。", dismissible: true, dedupeKey: "spot-navigation-native-failed" });
    }
  };

  return (
    <View
      className={`${themeClass} spot-detail`}
      data-route="spot-detail"
      data-spot-id={spotId}
    >
      <FloatingNotificationHost />
      <CustomNav
        title={segment === "GUIDES" ? "观星攻略" : segment === "SITE" ? "场地资料" : "地点概览"}
        back
        right={
          detail ? (
            <Button
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
        {contextRefreshError ? <StatusPanel state="STALE" detail="计划中的地点上下文尚未确认最新状态，以下保留上次资料。"
          recoveryLabel="重试计划地点" onRecover={onContextRefresh} /> : null}
      </View>
      {overview.isPending ? (
        <View className="page-inset">
          <StatusPanel
            state="LOADING"
            detail="正在加载观星点资料。"
          />
        </View>
      ) : overview.isError || !detail ? (
        <View className="page-inset">
          <StatusPanel
            state="EMPTY"
            detail="地点资料暂时无法加载，请重试。"
            recoveryLabel="重试概览"
            onRecover={() => void overview.refetch()}
          />
        </View>
      ) : (
        <ScrollView
          scrollY
          className="spot-detail__scroll"
          data-od-id="spot-detail-panel"
          enhanced
          showScrollbar={false}
        >
          {overview.refreshError || overview.data?.dataState === "STALE_USABLE" ? <View className="page-inset"><StatusPanel
            state="STALE"
            detail="地点资料尚未确认最新状态，暂时显示上次结果。"
            recoveryLabel="重试更新"
            onRecover={() => void overview.refetch()}
          /></View> : null}
          <View className="spot-identity page-inset" data-od-id="spot-detail">
            <View className="spot-identity__copy">
              <Text className="spot-identity__eyebrow type-caption">
                {detail.spot.region}
              </Text>
              <Text className="type-page-title">{detail.spot.name}</Text>
              {detail.spot.address ? <Text className="type-caption">{detail.spot.address}</Text> : null}
              <Text className="type-caption">
                最近核验{" "}
                {detail.spot.lastVerifiedAt?.slice(0, 10) ?? "暂无"}
              </Text>
            </View>
          </View>
          {segment === "SITE" ? <View className="spot-detail-lead page-inset">
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
                onClick={openNavigation}
              >
                <Text>去这里 →</Text>
              </Button>
            </View>
            {effectiveRoute?.lastRoad ? <Text className="type-secondary">末段道路：{effectiveRoute.lastRoad}</Text> : null}
            {effectiveRoute?.parkingGuidance ? <Text className="type-secondary">停车：{effectiveRoute.parkingGuidance}</Text> : null}
          </View> : null}
            <View className="spot-content page-inset safe-bottom">
              {segment === "GUIDES" ? (
                <View
                  className="section-stack segment-panel"
                  data-segment="guides"
                  id="spot-detail-panel-guides"
                  role="region"
                  aria-label="观星攻略"
                >
                  {guides.refreshError || guides.data?.dataState === "STALE_USABLE" ? <StatusPanel
                    state="STALE"
                    detail="攻略尚未确认最新状态，暂时显示上次内容。"
                    recoveryLabel="重试攻略"
                    onRecover={() => void guides.refetch()}
                  /> : null}
                  {guides.isPending ? (
                    <StatusPanel state="LOADING" detail="正在加载攻略。" />
                  ) : guides.isError ? (
                    <StatusPanel
                      state="EMPTY"
                      detail="攻略暂时无法加载，请重试。"
                      recoveryLabel="重试攻略"
                      onRecover={() => void guides.refetch()}
                    />
                  ) : !guides.data?.data.guides.length ? (
                    <StatusPanel state="EMPTY" detail="暂无本地点的攻略；可继续查看场地与来源资料。" />
                  ) : (
                    guides.data.data.guides.map((guide) => {
                      const thumbnail = guideThumbnail(guide, detail.spot.media);
                      return <View className={`guide-card card${thumbnail ? " guide-card--with-media" : ""}`} key={guide.articleId}>
                        {thumbnail ? (
                          <Image
                            className="guide-card__media"
                            src={thumbnail.thumbnailPath}
                            mode="aspectFill"
                            aria-label={thumbnail.alt}
                          />
                        ) : null}
                        <View className="guide-card__body">
                          <Text className="type-section">{guide.title}</Text>
                          <Text className="type-body">{guide.summary}</Text>
                        </View>
                        <View className="guide-card__footer">
                          <Text className="type-caption">
                            {GUIDE_AUTHOR_LABELS[guide.authorType]} ·{" "}
                            {guide.authorName} · 更新{" "}
                            {formatDisplayDate(guide.updatedAt)} ·{" "}
                            {guide.verified ? "已核验" : "来源待核验"}
                          </Text>
                          <SoftButton
                            label={`阅读攻略 ${guide.title}`}
                            onClick={() =>
                              openDetailPage(
                                  "/content/article/detail/index?spotId=" +
                                  encodeURIComponent(spotId) +
                                  "&contextId=" +
                                  encodeURIComponent(
                                    observationContext.contextId,
                                  ) +
                                  "&articleId=" +
                                  encodeURIComponent(guide.articleId),
                                "攻略",
                              )
                            }
                          >
                            阅读攻略
                          </SoftButton>
                        </View>
                      </View>;
                    })
                  )}
                </View>
              ) : null}
              {segment === "SITE" ? (
                <View
                  className="section-stack segment-panel"
                  data-segment="site"
                  data-od-id="spot-detail-site"
                  id="spot-detail-panel-site"
                  role="region"
                  aria-label="场地条件"
                >
                  <View className="segment-panel__heading">
                    <Text className="type-section">场地条件</Text>
                  </View>
                  {site.refreshError || site.data?.dataState === "STALE_USABLE" ? <StatusPanel
                    state="STALE"
                    detail="场地资料尚未确认最新状态，开放与设施信息可能已变化。"
                    recoveryLabel="重试场地"
                    onRecover={() => void site.refetch()}
                  /> : null}
                  {site.isPending ? (
                    <StatusPanel
                      state="LOADING"
                      detail="正在加载场地信息。"
                    />
                  ) : site.isError ? (
                    <StatusPanel
                      state="EMPTY"
                      detail="场地信息暂时无法加载，请重试。"
                      recoveryLabel="重试场地"
                      onRecover={() => void site.refetch()}
                    />
                  ) : (
                    <>
                      {facilities.map((item) => (
                        <View className="facility-row" key={item.type}>
                          <FacilityEvidenceDetails evidence={item} title={FACILITY_LABEL[item.type]} showSource={!sharedFacilitySource} showVerification={!sharedFacilityVerification} />
                        </View>
                      ))}
                      {!facilities.length ? <Text className="type-secondary">设施资料待核验</Text> : null}
                      {sharedFacilityVerification ? <Text className="type-caption">以上设施最近核验：{formatDisplayDate(sharedFacilityVerification)}</Text> : null}
                      {sharedFacilitySource ? <View>
                        <Text className="type-secondary">以上设施来源</Text>
                        <Provenance source={sharedFacilitySource} compact />
                      </View> : null}
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
                            {accessAndSafety.restrictions.map((item) => (
                              <Text className="type-body" key={item}>
                                ! {item}
                              </Text>
                            ))}
                            {accessAndSafety.guidance.map((item) => (
                              <Text className="type-body" key={item}>{item}</Text>
                            ))}
                          </>
                        ) : <Text className="type-secondary">开放与夜间安全资料待核验</Text>}
                        {siteMediaState === "NO_SITE_MEDIA_VERIFIED" ? (
                          <Text className="type-caption">
                            现场照片尚未核验
                          </Text>
                        ) : null}
                      </View>
                    </>
                  )}
                  <Button
                    className="sources-link contribution-link card"
                    data-od-id="spot-contribution-entry"
                    onClick={() =>
                      openDetailPage(
                          "/content/spot-feedback/index?spotId=" +
                          encodeURIComponent(spotId) +
                          "&spotName=" +
                          encodeURIComponent(detail.spot.name),
                        "反馈表单",
                      )
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
      )}
    </View>
  );
}
