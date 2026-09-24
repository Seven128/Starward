import { isProductSource, productSourceNames } from "@/utils/source-presentation";
import type { PanelCssMotion } from "./panel-spring-style";
import { Block, Button, Image, ScrollView, Text, View } from "@tarojs/components";
import type {
  MapSceneTimeFrame,
  ObservationContext,
  PageState,
  SkyReport,
  SpotDetail,
  SpotSummary,
} from "@starward/miniapp-contracts";
import { useEffect, useRef, useState } from "react";
import Taro, { useResize } from "@tarojs/taro";
import { useAppStore } from "@/state/app-store";
import { WeatherAlerts } from "@/components/weather-alerts";
import { RecentWeather } from "@/components/recent-weather";
import { SourceAttribution } from "@/components/source-attribution";
import { AirQuality } from "@/components/air-quality";
import { DataStateBadge } from "@/components/data-state-badge";
import { FavoriteStar } from "@/components/selected-card-star";
import { SpotAdditionalInformation } from "./spot-additional-information";
import { SemanticIcon } from "@/components/semantic-asset";
import { SelectionTabs } from "@/components/selection-tabs";
import { EMPTY_FIELD_VALUE, StatusPanel } from "@/components/status-panel";
import { MapTimeRuler } from "./time-ruler";
import { ObservationDateControl } from "@/components/observation-date-control";
import { MoonPhaseImage, moonPhaseLabel } from "@/components/moon-phase";
import {
  darknessLabel,
  exactSkyRow,
  formatMetric,
  windDirectionLabel,
} from "./spot-panel-astronomy";
import { mediaIsRenderable } from "./spot-panel-media";
import { spotRouteSummary } from "./spot-panel-route-summary";
import { SpotTerrainOverview } from "./spot-terrain-overview";
import { ForecastCoverageNote } from "@/components/forecast-coverage-note";
import { SpotPlanEntry } from "@/features/spot/spot-plan-entry";
import { SpotImageViewer } from "@/components/spot-image-viewer";
import { useSpotMediaGalleryPosition } from "@/components/spot-media-gallery-position";
import { useHiddenNativeScrollbar } from "@/components/use-hidden-native-scrollbar";

export type SpotPanelExtent = "small" | "medium" | "large";
export type SpotPanelPhase = "idle" | "closing";

const PANEL_SECTIONS = [
  { id: "spot-panel-overview", label: "基本信息" },
  { id: "spot-panel-terrain", label: "地形" },
  { id: "spot-panel-astronomy", label: "天文" },
] as const;
const SECTION_NAV_REVEAL_PX = 44;

function isPermissionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "PERMISSION_DENIED"
  );
}

function isOfflineError(error: unknown) {
  const value = error instanceof Error ? error.message : String(error ?? "");
  return /network|offline|timeout|超时|网络/i.test(value);
}

function statusLabel(status: SpotSummary["status"]) {
  return {
    PUBLISHED: "已核验发布",
    TEMPORARILY_CLOSED: "暂时关闭",
    DATA_INSUFFICIENT: "资料不足",
    UNPUBLISHED: "未发布",
    RETIRED: "已下线",
  }[status];
}

function facilityLabel(type: string) {
  return (
    {
      PARKING: "停车",
      TOILET: "厕所",
      PLATFORM: "观测平台",
      CHARGING: "充电",
      CAMPING: "露营",
      ROAD: "末段道路",
      WALKING: "徒步",
      SIGNAL: "通信信号",
    } as Record<string, string>
  )[type] ?? type;
}

function facilityStatusLabel(status: string) {
  return (
    {
      AVAILABLE: "可用",
      UNAVAILABLE: "不可用",
      UNKNOWN: "待核验",
      SEASONAL: "季节性",
    } as Record<string, string>
  )[status] ?? "状态暂无数据";
}

function opennessLabel(value: SpotDetail["accessAndSafety"]["openness"] | undefined) {
  return value === "OPEN" ? "当前开放" : value === "CONDITIONAL" ? "有条件开放" : value === "CLOSED" ? "暂时关闭" : "待核验";
}

function legalAccessLabel(value: SpotDetail["accessAndSafety"]["legalAccess"] | undefined) {
  return value === "PERMITTED" ? "允许进入" : value === "CONDITIONAL" ? "有条件进入" : value === "PROHIBITED" ? "禁止进入" : "待核验";
}

function nightSafetyLabel(value: SpotDetail["accessAndSafety"]["nightSafety"] | undefined) {
  return value === "NO_KNOWN_HAZARD" ? "未发现危险" : value === "CAUTION" ? "需要留意" : value === "DANGER" ? "存在危险" : "待核验";
}

function formatLunarEvent(value: string | null, timezone: string, empty: string) {
  if (!value) return empty;
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(value));
  } catch {
    return "暂无数据";
  }
}

function formatSourceTime(value: string | null | undefined, timezone: string) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

export function SpotInformationPanel({
  spot,
  visible = true,
  settling = false,
  springMotion,
  detail,
  detailPending,
  detailError,
  detailStale = false,
  extent,
  phase,
  favorite,
  context,
  astronomyAt,
  skyReport,
  skyPending,
  skyRefreshing = false,
  skyError,
  skyStale = false,
  timeFrames,
  timeSaving,
  dateOptions,
  selectedDate,
  todayDate,
  onDateCommit,
  onTimePreview,
  onTimeCommit,
  onTimeCancel,
  onHandleTouchStart,
  onHandleTouchMove,
  onHandleTouchEnd,
  onHandleTouchCancel,
  onExtent,
  onClose,
  onRecover,
  onSkyRecover,
  onFavorite,
  onShare,
  onCloud,
  onNavigate,
  onContribution,
  onEvidence,
  onViewerBackHandlerChange,
}: {
  spot: SpotSummary;
  visible?: boolean;
  settling?: boolean;
  springMotion?: PanelCssMotion | null;
  detail: SpotDetail | null;
  detailPending: boolean;
  detailError: unknown;
  detailStale?: boolean;
  extent: SpotPanelExtent;
  phase: SpotPanelPhase;
  favorite: boolean;
  context: ObservationContext | null;
  astronomyAt: string;
  skyReport: SkyReport | null;
  skyPending: boolean;
  skyRefreshing?: boolean;
  skyError: unknown;
  skyStale?: boolean;
  timeFrames: readonly MapSceneTimeFrame[];
  timeSaving: boolean;
  dateOptions: readonly string[];
  selectedDate: string;
  todayDate: string;
  onDateCommit: (date: string) => void;
  onTimePreview: (index: number) => void;
  onTimeCommit: (index: number) => void;
  onTimeCancel: () => void;
  onHandleTouchStart: (event: unknown) => void;
  onHandleTouchMove: (event: unknown) => void;
  onHandleTouchEnd: (event?: unknown) => void;
  onHandleTouchCancel: () => void;
  onExtent: (extent: SpotPanelExtent) => void;
  onClose: () => void;
  onRecover: () => void;
  onSkyRecover: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onCloud: () => void;
  onNavigate: () => void;
  onContribution: () => void;
  onEvidence: (kind: "guides" | "field" | "sources", articleId?: string) => void;
  onViewerBackHandlerChange?: (handler: (() => void) | null) => void;
}) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [section, setSection] = useState<
    (typeof PANEL_SECTIONS)[number]["id"]
  >(PANEL_SECTIONS[0]!.id);
  const [sectionRequest, setSectionRequest] = useState<{ id: string; spotId: string } | null>(null);
  const handledSectionRequest = useRef<typeof sectionRequest>(null);
  const [scrollAnchor, setScrollAnchor] = useState("");
  const terrainOffset = useRef<number | null>(null);
  const astronomyOffset = useRef<number | null>(null);
  const lastScroll = useRef({ spotId: spot.spotId, top: 0 });
  const wasVisible = useRef(visible);
  const [restoredScrollTop, setRestoredScrollTop] = useState<number | undefined>(undefined);
  useEffect(() => {
    const returning = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (!visible) {
      setScrollAnchor("");
      setRestoredScrollTop(undefined);
      return;
    }
    if (!returning || lastScroll.current.spotId !== spot.spotId) return;
    const top = lastScroll.current.top;
    const timer = setTimeout(() => setRestoredScrollTop(top), 200);
    return () => clearTimeout(timer);
  }, [visible, spot.spotId]);
  useEffect(() => {
    if (visible) return;
    setViewerIndex(null);
  }, [visible]);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const scrollMeasureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (scrollMeasureTimer.current !== null) clearTimeout(scrollMeasureTimer.current);
    scrollMeasureTimer.current = null;
  }, [visible, spot.spotId, extent]);
  const largeText = useAppStore(state => state.preferences.largeText);
  useResize(() => setLayoutVersion(value => value + 1));
  useEffect(() => {
    lastScroll.current = { spotId: spot.spotId, top: 0 };
    setViewerIndex(null);
    setRestoredScrollTop(undefined);
    setSection("spot-panel-overview");
    setSectionRequest({ id: "spot-panel-document-start", spotId: spot.spotId });
  }, [spot.spotId]);
  useEffect(() => {
    terrainOffset.current = null;
    astronomyOffset.current = null;
    if (extent === "small" || settling) return;
    let cancelled = false;
    // Wait for native settling to finish before measuring final scroll boundaries.
    const measurementTimer = setTimeout(() => {
      if (cancelled) return;
      const query = Taro.createSelectorQuery();
      query.select("#spot-panel-scroll").boundingClientRect();
      query.select("#spot-panel-terrain").boundingClientRect();
      query.select("#spot-panel-astronomy").boundingClientRect();
      query.select("#spot-panel-scroll").scrollOffset();
      query.exec(results => {
        if (cancelled) return;
        const [viewport, terrain, astronomy, scroll] = results as [{ top?: number; height?: number }?, { top?: number }?, { top?: number }?, { scrollTop?: number }?];
        if (!Number.isFinite(viewport?.top) || !Number.isFinite(terrain?.top) || !Number.isFinite(astronomy?.top) || !Number.isFinite(scroll?.scrollTop)) return;
        terrainOffset.current = terrain!.top! - viewport!.top! + scroll!.scrollTop!;
        astronomyOffset.current = astronomy!.top! - viewport!.top! + scroll!.scrollTop!;
        setSection(scroll!.scrollTop! >= astronomyOffset.current - SECTION_NAV_REVEAL_PX ? "spot-panel-astronomy" : scroll!.scrollTop! >= terrainOffset.current - SECTION_NAV_REVEAL_PX ? "spot-panel-terrain" : "spot-panel-overview");
      });
    }, 200);
    return () => { clearTimeout(measurementTimer); cancelled = true; terrainOffset.current = null; astronomyOffset.current = null; };
  }, [spot.spotId, detail, extent, settling, largeText, layoutVersion]);
  useEffect(() => {
    setScrollAnchor("");
    if (settling || !sectionRequest || sectionRequest.spotId !== spot.spotId || handledSectionRequest.current === sectionRequest) return;
    if (sectionRequest.id !== "spot-panel-document-start" && extent === "small") return;
    setRestoredScrollTop(undefined);
    const timer = setTimeout(() => {
      handledSectionRequest.current = sectionRequest;
      setScrollAnchor(sectionRequest.id);
    }, settling ? 200 : 80);
    return () => clearTimeout(timer);
  }, [sectionRequest, extent, spot.spotId, settling]);
  const effectiveSpot = detail?.spot ?? spot;
  const media = effectiveSpot.media.filter((item) =>
    mediaIsRenderable(item, __MINIAPP_DEVELOPMENT_FIXTURE_MODE__),
  );
  const galleryPosition = useSpotMediaGalleryPosition(`${effectiveSpot.spotId}:${media.map(item => item.id).join("|")}`);
  useHiddenNativeScrollbar("spot-panel-scroll", extent !== "small", `${effectiveSpot.spotId}:${extent}`);
  useHiddenNativeScrollbar("spot-panel-media-strip", extent === "large" && media.length > 1, effectiveSpot.spotId);
  const route = detail?.route;
  const facilities = detail?.spot.facilities ?? effectiveSpot.facilities;
  const prominentFacilities = facilities.filter((facility) => facility.type === "PARKING" || facility.type === "TOILET");
  const visibleFacilities = prominentFacilities.length ? prominentFacilities : facilities.slice(0, 2);
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const formalFacts = detail?.formalFacts;
  const detailLoading = !detail && detailPending;
  const detailUnavailable = !detail && Boolean(detailError);
  const detailFieldFallback = detailLoading ? "正在加载" : detailUnavailable ? "暂未获取" : null;
  const detailMissingFallback = detailFieldFallback ?? "待核验";
  const address = formalFacts?.address ?? effectiveSpot.address;
  const openingHours = formalFacts?.hours?.trim() || `开放时间${detailMissingFallback}`;
  const source = effectiveSpot.source;
  const sourceTime = isProductSource(source) ? formatSourceTime(source.retrievedAt, context?.timezone ?? "Asia/Shanghai") : null;
  const skyRow = skyReport ? exactSkyRow(skyReport.hourly, astronomyAt) : null;
  const targetFrame = skyReport && skyRow
    ? skyReport.targetFrames.find((frame) => Date.parse(frame.at) === Date.parse(skyRow.at)) ?? null
    : null;
  const visibleWeatherRuns = skyReport?.weatherEvidence.modelRuns.filter((run) => run.state !== "SAMPLE_DATA") ?? [];
  const weatherProviders = [...new Set(visibleWeatherRuns.map((run) => run.provider).filter(Boolean))];
  const latestWeatherFetch = visibleWeatherRuns.reduce<string | null>((latest, run) => {
    if (!latest || Date.parse(run.fetchedAt) > Date.parse(latest)) return run.fetchedAt;
    return latest;
  }, null) ?? null;
  const cloudReady = Boolean(
    detail &&
      context?.location.kind === "FORMAL_SPOT" &&
      context.location.spotId === effectiveSpot.spotId,
  );
  const detailPageState: PageState = isPermissionError(detailError)
    ? "PERMISSION_DENIED"
    : "ERROR";
  const handleInDocument = extent === "large" && media.length > 0;
  const panelHandle = (
    <View className={`spot-panel__handle-band${handleInDocument ? " spot-panel__handle-band--document" : ""}`}>
      <Button
        className="spot-panel__handle focus-ring"
        data-control="map-spot-panel-handle"
        ariaLabel="拖动调整观星点信息面板大小"
        onTouchStart={onHandleTouchStart}
        onTouchMove={onHandleTouchMove}
        onTouchEnd={onHandleTouchEnd}
        onTouchCancel={onHandleTouchCancel}
      >
        <View className="spot-panel__handle-bar" aria-hidden="true" />
      </Button>
      <View className="spot-panel__extent-actions" role="group" ariaLabel={`面板大小，当前${extent === "small" ? "小" : extent === "medium" ? "中" : "大"}档`}>
        <Button
          className="spot-panel__extent-button"
          ariaLabel={extent === "large" ? "收起为中档面板" : "收起为小档面板"}
          disabled={extent === "small"}
          onClick={() => onExtent(extent === "large" ? "medium" : "small")}
        >
          <SemanticIcon name="chevron-down" />
        </Button>
        <Button
          className="spot-panel__extent-button"
          ariaLabel={extent === "small" ? "展开为中档面板" : "展开为大档面板"}
          disabled={extent === "large"}
          onClick={() => onExtent(extent === "small" ? "medium" : "large")}
        >
          <SemanticIcon name="chevron-up" />
        </Button>
        <Button
          className="spot-panel__extent-button spot-panel__extent-button--close"
          ariaLabel="关闭观星点信息面板"
          onClick={onClose}
        >
          <SemanticIcon name="close" />
        </Button>
      </View>
    </View>
  );

  return (
    <View
      id="spot-information-panel"
      className={`spot-panel${springMotion ? " spot-panel--spring" : ""} spot-panel--${extent}${phase === "closing" ? " spot-panel--closing" : ""}${media.length ? " spot-panel--with-media" : ""}`}
      data-control="map-spot-information-panel"
      data-extent={extent}
      data-phase={phase}
      role="region"
      ariaLabel={`${effectiveSpot.name}观星点信息面板`}
    >
      <View className="spot-panel__snap-measures" aria-hidden="true">
        <View className="spot-panel__snap-small" />
        <View className="spot-panel__snap-medium" />
        <View className="spot-panel__snap-large" />
      </View>
      {!handleInDocument ? panelHandle : null}

      <View className="spot-panel__scroll-frame">
        <ScrollView
          className="spot-panel__scroll spot-panel__scroll--full-bleed-plan"
          id="spot-panel-scroll"
          scrollY={extent !== "small"}
          {...(restoredScrollTop === undefined ? {} : { scrollTop: restoredScrollTop })}
          scrollIntoView={scrollAnchor}
          scrollWithAnimation={false}
          onScroll={event => {
            const top = event.detail.scrollTop;
            if (!visible || !Number.isFinite(top)) return;
            lastScroll.current = { spotId: spot.spotId, top };
            // Native anchor scrolling can finish after the extent layout measurement.
            // Reconcile once after scrolling rests, never query geometry per frame.
            if (extent !== "small") {
              if (scrollMeasureTimer.current !== null) clearTimeout(scrollMeasureTimer.current);
              scrollMeasureTimer.current = setTimeout(() => {
                scrollMeasureTimer.current = null;
                setLayoutVersion(value => value + 1);
              }, 80);
            }
            if (extent === "small" || terrainOffset.current === null || astronomyOffset.current === null) return;
            setSection(top >= astronomyOffset.current - SECTION_NAV_REVEAL_PX ? "spot-panel-astronomy" : top >= terrainOffset.current - SECTION_NAV_REVEAL_PX ? "spot-panel-terrain" : "spot-panel-overview");
          }}
          type="custom"
          enhanced
          showScrollbar={false}
          ariaLabel="观星点信息"
        >
          <Block>
          <View id="spot-panel-document-start" className="spot-panel__document-start" aria-hidden="true" />
          {media.length ? (
            <View className="spot-panel__media" data-control="spot-media-gallery">
              <ScrollView id="spot-panel-media-strip" className="spot-panel__media-strip" scrollX={media.length > 1} scrollLeft={galleryPosition.returnLeft}
                onScroll={galleryPosition.onScroll} enhanced showScrollbar={false} ariaLabel={`${effectiveSpot.name}现场照片`}>
                <View className="spot-panel__media-track">
                  {media.map((item, index) => <Button id={`spot-media-source-${index}`} className="spot-panel__media-slide" key={item.id} ariaLabel={`查看现场照片 ${index + 1}，共 ${media.length} 张`} onClick={() => { galleryPosition.remember(); setViewerIndex(index); }}>
                    <Image
                      className="spot-panel__media-image"
                      src={item.thumbnailPath || item.localPath}
                      mode="aspectFill"
                      lazyLoad
                      ariaLabel={item.alt || `${effectiveSpot.name}现场照片`}
                    />
                    <Text className="spot-panel__media-caption">{index + 1} / {media.length}</Text>
                  </Button>)}
                </View>
              </ScrollView>
            </View>
          ) : null}
          {handleInDocument ? panelHandle : null}

          <View id="spot-panel-overview" className="spot-panel__identity" ariaLabel="地点概览">
            <View className="spot-panel__identity-heading">
              <Text className="spot-panel__title">{formalFacts?.name?.trim() || effectiveSpot.name}</Text>
              {effectiveSpot.region ? <Text className="spot-panel__region">{effectiveSpot.region}</Text> : null}
            </View>
            <View className="spot-panel__identity-meta">
              {effectiveSpot.status !== "PUBLISHED" ? <Text className="type-caption">{statusLabel(effectiveSpot.status)}</Text> : null}
              <DataStateBadge state={effectiveSpot.source.state} />
            </View>
            <View className="spot-panel__location-facts">
              <Text>{address || "地址待核验"}</Text>
              <Text>{effectiveSpot.altitudeM === null ? "海拔待核验" : `海拔 ${Math.round(effectiveSpot.altitudeM)}m`}</Text>
            </View>
          </View>

          <SpotPlanEntry spotId={effectiveSpot.spotId} />

          <View className="spot-panel__section" ariaLabel="场地资料">
            {detailPending ? <StatusPanel state="LOADING" detail="正在加载地点信息" /> : null}
            {detailError || detailStale ? (
              <StatusPanel
                state={detailError ? detailPageState : "STALE"}
                detail={detailError ? detail ? "更新失败，暂时显示上次资料，请重试。" : isOfflineError(detailError) ? "网络不可用，请连接网络后重试。" : "地点信息暂时无法加载，请重试。" : "地点资料尚未确认最新状态，暂时显示上次结果。"}
                recoveryLabel="重试概览"
                onRecover={onRecover}
              />
            ) : null}

            <View className="spot-panel__block spot-panel__block--route" data-control="spot-route-summary">
              <View className="spot-panel__block-heading">
              <View className="spot-panel__route-copy">
              <Text className="spot-panel__value">
                {spotRouteSummary(route, detailLoading, detailUnavailable)}
              </Text>
              <Text className="spot-panel__route-note">{route?.parkingGuidance || route?.lastRoad || formalFacts?.parkingNote || `停车与末段道路信息${detailMissingFallback}`}</Text>
              </View>
                <Button className="spot-panel__text-action" data-control="spot-navigation-action" ariaLabel={`查看${effectiveSpot.name}路线`} onClick={onNavigate}>
                  <SemanticIcon name="compass" />
                </Button>
              </View>
            </View>

            <View className="spot-panel__hours-row">
              <View><SemanticIcon name="clock" /><Text>开放时间</Text></View>
              <Text>{openingHours}</Text>
            </View>

            <View className="spot-panel__access-compact" ariaLabel="进入与安全">
              <View className="spot-panel__safety-facts">
                <View className="spot-panel__metric">
                  <Text className="type-secondary">开放状态</Text>
                  <Text className="type-body">{formalFacts?.openness?.trim() || detailFieldFallback || opennessLabel(detail?.accessAndSafety?.openness)}</Text>
                </View>
                <View className="spot-panel__metric">
                  <Text className="type-secondary">合法进入</Text>
                  <Text className="type-body">{formalFacts?.access?.trim() || detailFieldFallback || legalAccessLabel(detail?.accessAndSafety?.legalAccess)}</Text>
                </View>
                <View className="spot-panel__metric">
                  <Text className="type-secondary">夜间安全</Text>
                  <Text className="type-body">{formalFacts?.safety?.trim() || detailFieldFallback || nightSafetyLabel(detail?.accessAndSafety?.nightSafety)}</Text>
                </View>
              </View>
              {(formalFacts?.accessNote?.trim() || detail?.accessAndSafety?.guidance[0]) ? <Text className="spot-panel__access-guidance">{formalFacts?.accessNote?.trim() || detail?.accessAndSafety?.guidance[0]}</Text> : null}
            </View>

            <View className="spot-panel__block spot-panel__block--facility" data-control="spot-facility-evidence">
              <View className="spot-panel__facilities">
              {visibleFacilities.length ? visibleFacilities.map((facility) => {
                const mediaKind = facility.type === "PARKING" ? "parking" : facility.type === "TOILET" ? "toilet" : null;
                const facilityMedia = mediaKind ? detail?.formalMedia?.[mediaKind]?.map((id) => mediaById.get(id)).find(Boolean) : undefined;
                return <View className={`spot-panel__facility${facilityMedia ? " spot-panel__facility--with-media" : ""}`} key={`${facility.type}-${facility.summary}`}>
                  {facilityMedia ? <Image className="spot-panel__facility-image" src={facilityMedia.thumbnailPath || facilityMedia.localPath} mode="aspectFill" aria-hidden="true" /> : null}
                  {facilityMedia ? <View className="spot-panel__facility-shade" aria-hidden="true" /> : null}
                  <View className="spot-panel__facility-content">
                    <View className="spot-panel__facility-heading">
                      <Text className="spot-panel__facility-name">{facilityLabel(facility.type)}</Text>
                      <Text className="spot-panel__facility-status">{facilityStatusLabel(facility.status)}{facility.distanceM === null ? "" : ` · ${facility.distanceM}m`}</Text>
                    </View>
                    {facility.summary ? <Text className="spot-panel__facility-summary">{facility.summary}</Text> : null}
                  </View>
                </View>;
              }) : <Text className="type-caption">{`设施信息${detailMissingFallback}`}</Text>}
              </View>
              {formalFacts?.contact?.trim() ? <View className="spot-panel__contact-row">
                <Text>门禁 / 负责人电话</Text><Text>{formalFacts.contact.trim()}</Text>
              </View> : <View className="spot-panel__contact-row">
                <Text>门禁 / 负责人电话</Text><Text>{detailFieldFallback ?? EMPTY_FIELD_VALUE}</Text>
              </View>}
              <View className="spot-panel__source-row">
                <Text>{productSourceNames([source]) ? `资料：${productSourceNames([source])}` : "资料暂无数据"}{sourceTime ? ` · ${sourceTime.slice(0, 5)}核验` : ""}</Text>
                <Button className="spot-panel__text-action spot-panel__text-action--contribution" data-control="spot-contribution-entry" onClick={onContribution}>
                  <Text>我要反馈 ↗</Text>
                </Button>
              </View>
              {cloudReady ? <View className="spot-panel__guide-row">
                <Text>观星攻略</Text>
                <Button className="spot-panel__text-action" data-control="spot-guide-entry" onClick={() => onEvidence("guides")}>查看攻略 ↗</Button>
              </View> : null}
              <SpotAdditionalInformation spotId={effectiveSpot.spotId} detail={detail} facilities={facilities}
                facilityLabel={facilityLabel} onLayoutChange={() => setLayoutVersion(value => value + 1)} />
            </View>
            <RecentWeather spotId={effectiveSpot.spotId} timezone={effectiveSpot.timezone} visible={visible} />
          </View>
          <View id="spot-panel-terrain" className="spot-panel__section spot-panel__section--terrain" ariaLabel="地形">
            <Text className="type-section">地形</Text>
            <SpotTerrainOverview spot={effectiveSpot} visible={visible} />
          </View>
          <View id="spot-panel-astronomy-anchor" className="spot-panel__astronomy-anchor" aria-hidden="true" />
          <View id="spot-panel-astronomy" className="spot-panel__section" ariaLabel="天文">
            <View className="spot-panel__astronomy-heading">
              <Text className="type-section">天文</Text>
            </View>
            {skyPending ? <StatusPanel state="LOADING" detail="正在加载所选观测夜的天文与天气资料" /> : null}
            {skyError || skyStale ? (
              <StatusPanel
                state={skyError ? "ERROR" : "STALE"}
                detail={skyError ? skyReport ? "更新失败，暂时显示上次天文资料。" : isOfflineError(skyError) ? "网络不可用，请连接网络后重试。" : "天文资料暂时无法加载，请重试。" : "天文资料尚未确认最新状态，暂时显示上次结果。"}
                recoveryLabel="重试天文资料"
                onRecover={onSkyRecover}
              />
            ) : null}
            <WeatherAlerts evidence={skyReport?.weatherEvidence} timezone={context?.timezone ?? effectiveSpot.timezone}
              active={visible} refreshing={skyRefreshing} scopeKey={effectiveSpot.spotId} refreshFailed={Boolean(skyError || skyStale)} onRecover={onSkyRecover} />
            <View className="spot-panel__block spot-panel__block--astronomy-card">
              <ObservationDateControl
                dates={dateOptions}
                selectedDate={selectedDate}
                today={todayDate}
                open={datePickerOpen}
                busy={!context || timeSaving}
                onOpenChange={setDatePickerOpen}
                onSelect={(date) => {
                  setDatePickerOpen(false);
                  onTimeCancel();
                  onDateCommit(date);
                }}
              />
              <MapTimeRuler
                frames={timeFrames}
                moonPhases={timeFrames.map((frame) => frame.moonPhase)}
                selectedAt={context?.selectedAtUtc ?? ""}
                timezone={context?.timezone ?? "Asia/Shanghai"}
                disabled={!context || !timeFrames.length || timeSaving}
                emptyMessage={skyPending && !skyReport ? "正在读取天文时间切片。" : skyError || skyStale ? "天文时间切片暂不可用，请重试天文资料。" : "本观测夜没有可用的时间切片。"}
                onPreview={onTimePreview}
                onCommit={onTimeCommit}
                onCancel={onTimeCancel}
                control="sky-time-scrubber"
              />
            </View>
            {skyReport ? (
            <View className="spot-panel__block spot-panel__block--astronomy-card spot-panel__block--moon" data-control="sky-lunar-facts">
              <Text className="type-label">月相</Text>
              <View className="spot-panel__moon-inset">
                <View className="spot-panel__moon-summary">
                  <MoonPhaseImage phase={skyRow?.moonPhase ?? null} className="spot-panel__moon-image" />
                  <View className="spot-panel__moon-copy">
                    <Text className="spot-panel__moon-name">{moonPhaseLabel(skyRow?.moonPhase ?? null)}</Text>
                    <Text className="type-caption">{skyRow?.moonIllumination === null || skyRow?.moonIllumination === undefined ? "月面照明暂无数据" : `月面照明 ${Math.round(skyRow.moonIllumination * 1000) / 10}%`}</Text>
                  </View>
                </View>
                <View className="spot-panel__moon-events">
                  <View>
                    <Text className="type-caption">月出</Text>
                    <Text className="type-body">{skyReport ? formatLunarEvent(skyReport.lunarFacts.moonriseAt, context?.timezone ?? "Asia/Shanghai", "本观测夜无月出") : "暂无数据"}</Text>
                  </View>
                  <View>
                    <Text className="type-caption">月落</Text>
                    <Text className="type-body">{skyReport ? formatLunarEvent(skyReport.lunarFacts.moonsetAt, context?.timezone ?? "Asia/Shanghai", "本观测夜无月落") : "暂无数据"}</Text>
                  </View>
                </View>
                <View className="spot-panel__metric-grid">
                  <View className="spot-panel__metric"><Text className="type-secondary">月亮高度</Text><Text className="type-body">{formatMetric(skyRow?.moonAltitudeDeg, "°", 1)}</Text></View>
                  <View className="spot-panel__metric"><Text className="type-secondary">夜间阶段</Text><Text className="type-body">{darknessLabel(skyRow?.darkness)}</Text></View>
                </View>
              </View>
            </View>
            ) : null}
            <View className="spot-panel__block spot-panel__block--astronomy-card spot-panel__block--professional-matrix" data-control="sky-professional-matrix">
              {skyReport ? <>
              <Text className="type-label spot-panel__weather-heading">气象条件</Text>
              {skyRow?.weatherAt ? <SourceAttribution sources={skyReport?.sources.filter(source => source.kind === "THIRD_PARTY_FORECAST") ?? []} /> : null}
              <ForecastCoverageNote starts={skyReport?.hourly.flatMap(row => row.weatherAt ? [row.weatherAt] : []) ?? []} stale={Boolean(skyError || skyStale)}
                timezone={context?.timezone ?? "Asia/Shanghai"} scopeKey={`${effectiveSpot.spotId}:${context?.localDate}`} />
              {skyRow?.weatherAt ? <Text className="type-caption">对应小时预报：{formatSourceTime(skyRow.weatherAt, context?.timezone ?? "Asia/Shanghai")}</Text> : null}
              <View className="spot-panel__evidence-group" ariaLabel="总云量">
                <View className="spot-panel__evidence-title"><SemanticIcon name="conditions" /><Text className="type-label">总云量</Text></View>
                <Text className="type-data">{formatMetric(skyRow?.cloudPercent, "%")}</Text>
              </View>
              <View className="spot-panel__evidence-group" ariaLabel="温湿">
                <View className="spot-panel__evidence-title"><SemanticIcon name="sun" /><Text className="type-label">温湿</Text></View>
                <View className="spot-panel__metric-grid">
                  <View className="spot-panel__metric"><Text className="type-secondary">气温</Text><Text className="type-data">{formatMetric(skyRow?.temperatureC, "°C", 1)}</Text></View>
                  <View className="spot-panel__metric"><Text className="type-secondary">湿度</Text><Text className="type-data">{formatMetric(skyRow?.relativeHumidityPercent, "%")}</Text></View>
                  <View className="spot-panel__metric"><Text className="type-secondary">露点</Text><Text className="type-data">{formatMetric(skyRow?.dewPointC, "°C", 1)}</Text></View>
                </View>
              </View>
              <View className="spot-panel__evidence-group" ariaLabel="风与能见度">
                <View className="spot-panel__evidence-title"><SemanticIcon name="horizon" /><Text className="type-label">风与能见度</Text></View>
                <View className="spot-panel__metric-grid">
                  <View className="spot-panel__metric"><Text className="type-secondary">{windDirectionLabel(skyRow?.windDirectionDeg)}</Text><Text className="type-data">{formatMetric(skyRow?.windKph, " km/h", 1)}</Text></View>
                  <View className="spot-panel__metric"><Text className="type-secondary">阵风</Text><Text className="type-data">{formatMetric(skyRow?.windGustKph, " km/h", 1)}</Text></View>
                  <View className="spot-panel__metric"><Text className="type-secondary">能见度</Text><Text className="type-data">{formatMetric(skyRow?.visibilityKm, " km", 1)}</Text></View>
                </View>
              </View>
              <View className="spot-panel__evidence-group" ariaLabel="降水">
                <View className="spot-panel__evidence-title"><SemanticIcon name="conditions" /><Text className="type-label">降水</Text></View>
                <View className="spot-panel__metric-grid spot-panel__metric-grid--two">
                  <View className="spot-panel__metric"><Text className="type-secondary">降水量</Text><Text className="type-data">{formatMetric(skyRow?.precipitationMm, " mm", 1)}</Text></View>
                  <View className="spot-panel__metric"><Text className="type-secondary">降水概率</Text><Text className="type-data">{formatMetric(skyRow?.precipitationProbabilityPercent, "%")}</Text></View>
                </View>
              </View>
              <Text className="spot-panel__measurement-note type-caption">透明度、视宁度暂无独立数据</Text>
              </> : null}
              <AirQuality spotId={effectiveSpot.spotId} selectedAt={astronomyAt} timezone={effectiveSpot.timezone} visible={visible} />
            </View>
            <View className="spot-panel__night-light" data-control="sky-light-pollution">
              <View className="spot-panel__evidence-title"><SemanticIcon name="horizon" /><Text className="type-label">卫星夜光估算</Text></View>
              <Text className="spot-panel__night-light-label">{effectiveSpot.lightPollution.state === "ESTIMATED" ? effectiveSpot.lightPollution.label : "暂无数据"}</Text>
              <Text className="type-caption">{effectiveSpot.lightPollution.radiance ? `${effectiveSpot.lightPollution.radiance.median} ${effectiveSpot.lightPollution.radiance.unit}` : "辐亮度暂无数据"}</Text>
            </View>
            {skyReport ? <>
            <View className="spot-panel__block spot-panel__block--astronomy-card spot-panel__block--target-list" data-control="sky-target-list">
              <View className="spot-panel__evidence-title"><SemanticIcon name="star" /><Text className="type-label">当前目标</Text></View>
              {targetFrame ? targetFrame.targets.length ? targetFrame.targets.map((target) => (
                <View className="spot-panel__target-row" key={target.targetId} ariaLabel={`${target.displayName}，${target.direction}，${target.altitudeDeg === null ? "高度暂无数据" : `高度 ${Math.round(target.altitudeDeg)} 度`}`}>
                  <Text className="type-body">{target.displayName}</Text>
                  <Text className="type-caption">{target.direction}</Text>
                  <Text className="type-data">{formatMetric(target.altitudeDeg, "°")}</Text>
                </View>
              )) : <Text className="type-caption">所选时刻暂无可见目标</Text> : <Text className="type-caption">所选时刻的目标数据不可用</Text>}
            </View>
            <View className="spot-panel__astronomy-source" data-control="sky-weather-source">
              <Text className="type-caption">
                {weatherProviders.length ? `预报：${weatherProviders.join("、")}` : "预报来源暂无数据"}
                {formatSourceTime(latestWeatherFetch, context?.timezone ?? "Asia/Shanghai") ? ` · 更新 ${formatSourceTime(latestWeatherFetch, context?.timezone ?? "Asia/Shanghai")}` : ""}
              </Text>
              <Text className="type-caption">天体位置按所选时刻计算</Text>
            </View>
            </> : null}
          </View>

          <View className="spot-panel__disclosure" data-control="data-source-disclosure">
            <Button className="spot-panel__text-action" ariaLabel="查看完整来源与更新时间" onClick={() => onEvidence("sources")}>来源与更新时间</Button>
          </View>
          </Block>
        </ScrollView>
        <SelectionTabs
          className={`spot-panel__section-rail${section !== "spot-panel-overview" ? " spot-panel__section-rail--visible" : ""}`}
          items={PANEL_SECTIONS}
          activeId={section}
          label="定位点位信息章节"
          controlId="map-spot-panel-section-nav"
          itemClassName="spot-panel__section-tab"
          activeItemClassName="spot-panel__section-tab--active"
          onSelect={(id) => {
            setSection(id);
            setSectionRequest({
              id: id === "spot-panel-astronomy" ? "spot-panel-astronomy-anchor" : id,
              spotId: spot.spotId,
            });
            onExtent("large");
          }}
        />
      </View>

      {viewerIndex !== null && media[viewerIndex] ? <SpotImageViewer
        name={effectiveSpot.name}
        media={media.map(item => ({
          id: item.id,
          src: item.localPath || item.thumbnailPath,
          alt: item.alt || `${effectiveSpot.name}现场照片`,
          caption: item.caption || item.alt || "现场资料",
          attribution: `${item.photographer || "来源未注明"} · ${item.license}`,
          state: "ready" as const,
        }))}
        index={viewerIndex}
        onIndexChange={(index) => { galleryPosition.reveal(index, media.length, Taro.getWindowInfo().windowWidth); setViewerIndex(index); }}
        onClose={() => setViewerIndex(null)}
        {...(onViewerBackHandlerChange ? { onBackHandlerChange: onViewerBackHandlerChange } : {})}
      /> : null}
      <View className="spot-panel__action-lane">
        <View
          className="spot-panel__action-bar"
          data-control="map-spot-panel-action-bar"
          role="toolbar"
          ariaLabel="点位动作"
        >
          <Button className={`spot-panel__action spot-panel__action--favorite${favorite ? " spot-panel__action--active" : ""}`} data-control="spot-favorite-action" ariaLabel={`${favorite ? "取消收藏" : "收藏"}${effectiveSpot.name}`} onClick={onFavorite}>
            <FavoriteStar active={favorite} />
            <Text>{favorite ? "已想去" : "想去"}</Text>
          </Button>
          <Button className="spot-panel__action spot-panel__action--cloud" data-control="spot-cloud-stargazing-action" ariaLabel={`${cloudReady ? "打开" : "等待正式点位上下文后打开"}${effectiveSpot.name}云观星`} disabled={!cloudReady} onClick={onCloud}>
            <SemanticIcon name="eye" />
            <Text>云观星</Text>
          </Button>
          <Button className="spot-panel__action spot-panel__action--share" data-control="spot-share-action" ariaLabel={`分享${effectiveSpot.name}`} onClick={onShare}>
            <SemanticIcon name="share" />
            <Text>分享</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
