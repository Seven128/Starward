import { mediaSource } from "@/utils/media-source";
import { calendarDateInTimezone, clockTimeInTimezone } from "@/utils/zoned-date";
import { isProductSource, productSourceNames } from "@/utils/source-presentation";
import { FACILITY_LABEL } from "@/utils/facility-presentation";
import { FacilityCard } from "@/components/facility-card";
import { facilityPhotos as associatedFacilityPhotos, sitePhotoContext } from "@/utils/spot-media";
import { Block, Image, ScrollView, Text, View } from "@tarojs/components";
import { SharedButton as Button } from "@/components/shared-button-press";
import type {
  MapSceneTimeFrame,
  ObservationContext,
  PageState,
  SkyReport,
  SpotDetail,
  SpotSummary,
} from "@starward/miniapp-contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Taro, { useResize } from "@tarojs/taro";
import { useAppStore } from "@/state/app-store";
import type { ResourceFailureEpisode } from "@/services/resource-failure-episode";
import { WeatherAlerts } from "@/components/weather-alerts";
import { RecentWeather } from "@/components/recent-weather";
import { SourceAttribution } from "@/components/source-attribution";
import { SourceEntry } from "@/components/source-entry";
import { SourceButton, SourceNavigationPreparation } from "@/components/source-button";
import { hasIndependentTotalCloud, selectedTotalCloud, totalCloudCoverage, totalCloudMissingLabel, weatherCreditSources, weatherSourceSections } from "@/components/weather-source-presentation";
import { AirQuality } from "@/components/air-quality";
import { DataStateBadge } from "@/components/data-state-badge";
import { SpotPanelActions } from "./spot-panel-actions";
import { SpotAdditionalInformation } from "./spot-additional-information";
import { SemanticIcon } from "@/components/semantic-asset";
import { SelectionTabs } from "@/components/selection-tabs";
import { EMPTY_FIELD_VALUE, StatusPanel } from "@/components/status-panel";
import { MapTimeRuler } from "./time-ruler";
import { MapTemporalFeedback, type MapTemporalFailure } from "./map-temporal-feedback";
import { ObservationDateControl } from "@/components/observation-date-control";
import { observationNightLabel } from "@/components/observation-date";
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
import { SpotPlanEntry } from "@/features/spot/spot-plan-entry";
import { SpotImageViewer } from "@/components/spot-image-viewer";
import { usePanelReturnPosition } from "./use-panel-return-position";
import type { MapPanelReturnPosition } from "./sky-return-state";
import { useHiddenNativeScrollbar } from "@/components/use-hidden-native-scrollbar";
import "./spot-panel-compact-information.scss";

export type SpotPanelExtent = "small" | "medium" | "large";
export type SpotPanelPhase = "idle" | "closing";

const PANEL_SECTIONS = [
  { id: "spot-panel-overview", label: "基本信息" },
  { id: "spot-panel-terrain", label: "地形" },
  { id: "spot-panel-astronomy", label: "天文" },
] as const;
const SECTION_NAV_REVEAL_PX = 48;
// Native anchor alignment rounds subpixel scroll positions. Keep its reached
// chapter within one logical pixel, while real reverse scrolling still wins.
const SECTION_NAV_ALIGNMENT_EPSILON_PX = 1;

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
  return FACILITY_LABEL[type as keyof typeof FACILITY_LABEL] ?? type;
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
  return formatSourceTime(value, timezone) ?? "暂无数据";
}

function formatSourceTime(value: string | null | undefined, timezone: string) {
  if (!value) return null;
  try {
    const date = new Date(value);
    return `${calendarDateInTimezone(date, timezone).slice(5).replace("-", "/")} ${clockTimeInTimezone(date, timezone)}`;
  } catch {
    return null;
  }
}

export function SpotInformationPanel({
  spot,
  visible = true,
  weatherFailureEpisodes,
  settling = false,
  detail,
  detailPending,
  detailError,
  detailStale = false,
  onLayoutChange,
  contextPending,
  contextError,
  onContextRecover,
  extent,
  documentScrollEnabled,
  phase,
  favorite,
  favoritePending,
  context,
  timeContext,
  timeContextPending,
  astronomyAt,
  skyReport,
  forecastClockOffsetMs = 0,
  skyPending,
  skyRefreshing = false,
  skyError,
  skyStale = false,
  timeFrames,
  timeFramesPending,
  timeFramesFailed,
  onTimeFramesRecover,
  timeRulerIdentity,
  timeSaving,
  temporalFailure,
  onTemporalRetry,
  dateOptions,
  selectedDate,
  todayDate,
  datePickerOpen,
  onDatePickerOpenChange,
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
  onLoadingCancel = onClose,
  onRecover,
  onSkyRecover,
  onFavorite,
  requireAccount,
  onShare,
  onCloud,
  onNavigate,
  onContribution,
  onEvidence,
  onViewerBackHandlerChange,
  onPhotoIntent,
  restorePosition,
  onPositionChange,
}: {
  spot: SpotSummary;
  visible?: boolean;
  weatherFailureEpisodes?: {
    recentWeather: ResourceFailureEpisode;
    airQuality: ResourceFailureEpisode;
    weatherAlerts: ResourceFailureEpisode;
  };
  settling?: boolean;
  detail: SpotDetail | null;
  detailPending: boolean;
  detailError: unknown;
  detailStale?: boolean;
  onLayoutChange?: (() => void) | undefined;
  contextPending: boolean;
  contextError: unknown;
  onContextRecover: () => void;
  extent: SpotPanelExtent;
  documentScrollEnabled: boolean;
  phase: SpotPanelPhase;
  favorite: boolean;
  favoritePending: boolean;
  context: ObservationContext | null;
  timeContext: ObservationContext | null;
  timeContextPending: boolean;
  astronomyAt: string;
  skyReport: SkyReport | null;
  forecastClockOffsetMs?: number;
  skyPending: boolean;
  skyRefreshing?: boolean;
  skyError: unknown;
  skyStale?: boolean;
  timeFrames: readonly MapSceneTimeFrame[];
  timeFramesPending: boolean;
  timeFramesFailed: boolean;
  onTimeFramesRecover: () => void;
  timeRulerIdentity: string;
  timeSaving: boolean;
  temporalFailure: MapTemporalFailure | null;
  onTemporalRetry: () => void;
  dateOptions: readonly string[];
  selectedDate: string;
  todayDate: string;
  datePickerOpen: boolean;
  onDatePickerOpenChange: (open: boolean) => void;
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
  onLoadingCancel?: () => void;
  onRecover: () => void;
  onSkyRecover: () => boolean | void;
  onFavorite: () => void;
  requireAccount: ReturnType<typeof import("@/hooks/use-wechat-login").useWechatLogin>["requireAccount"];
  onShare: () => void;
  onCloud: () => void;
  onNavigate: () => void;
  onContribution: () => void;
  onEvidence: (kind: "guides" | "field" | "sources", articleId?: string) => void;
  onViewerBackHandlerChange?: (handler: (() => void) | null) => void;
  onPhotoIntent: () => Promise<boolean>;
  restorePosition?: MapPanelReturnPosition | null;
  onPositionChange?: (position: MapPanelReturnPosition) => void;
}) {
  const [viewerKind, setViewerKind] = useState<"parking" | "toilet" | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [section, setSection] = useState<
    (typeof PANEL_SECTIONS)[number]["id"]
  >(PANEL_SECTIONS[0]!.id);
  const [sectionRequest, setSectionRequest] = useState<{ id: string; spotId: string } | null>(null);
  const handledSectionRequest = useRef<typeof sectionRequest>(null);
  const sectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollAnchor, setScrollAnchor] = useState("");
  const retireSectionRequest = () => {
    if (sectionTimer.current !== null) clearTimeout(sectionTimer.current);
    sectionTimer.current = null;
    handledSectionRequest.current = sectionRequest;
    setSectionRequest(null);
    setScrollAnchor("");
  };
  const restoreInitialScroll = useRef(restorePosition?.identity === spot.spotId);
  const terrainOffset = useRef<number | null>(null);
  const astronomyOffset = useRef<number | null>(null);
  const effectiveSpot = detail?.spot ?? spot;
  const media = effectiveSpot.media.filter((item) =>
    mediaIsRenderable(item, __MINIAPP_DEVELOPMENT_FIXTURE_MODE__),
  );
  const [layoutVersion, setLayoutVersion] = useState(0);
  const largeText = useAppStore(state => state.preferences.largeText);
  const dayMode = useAppStore(state => state.mode === "DAY");
  const onReadingLayoutChange = useCallback(() => setLayoutVersion(value => value + 1), []);
  const parentLayoutChange = useRef(onLayoutChange); parentLayoutChange.current = onLayoutChange;
  const onPlanLayoutChange = useCallback(() => { onReadingLayoutChange(); parentLayoutChange.current?.(); }, [onReadingLayoutChange]);
  const readingLayout = useMemo(() => ({ scrollId: "spot-panel-scroll", inset: SECTION_NAV_REVEAL_PX, revision: {} }),
    [layoutVersion, detail, skyReport, extent, largeText, dayMode]);
  const { document: documentPosition, gallery: galleryPosition } = usePanelReturnPosition(spot.spotId,
    `${effectiveSpot.spotId}:${media.map(item => item.id).join("|")}`, {
      restorePosition, onPositionChange, visible, ready: !detailPending && !settling && extent !== "small", layout: readingLayout,
    });
  const { returnTop: restoredScrollTop, setReturnTop: setRestoredScrollTop } = documentPosition;
  const prepareSourceNavigation = async (anchorId?: string) => {
    retireSectionRequest();
    return documentPosition.prepareSourceNavigation(anchorId);
  };
  useEffect(() => {
    if (!visible) retireSectionRequest();
  }, [visible, spot.spotId]);
  useEffect(() => {
    if (visible) return;
    setViewerIndex(null);
  }, [visible]);
  function renderMetricValue(value: number | null | undefined, unit: string, digits = 0, className = "type-data", empty = EMPTY_FIELD_VALUE) {
    const formatted = formatMetric(value, "", digits);
    const missing = formatted === EMPTY_FIELD_VALUE;
    return <Text className={`${className} spot-panel__metric-value${missing ? " spot-panel__metric-value--missing" : ""}`}>
      {missing ? empty : formatted}{missing ? null : dayMode ? <Text className="spot-panel__metric-unit">{unit.trim()}</Text> : unit}
    </Text>;
  }
  // The report reference only invalidates geometry; no previous evidence is rendered.
  const [warningPresentation, setWarningPresentation] = useState<{ identity: string; height: number; report: SkyReport } | null>(null);
  const onWarningLayoutChange = useCallback(() => setLayoutVersion(value => value + 1), []);
  useEffect(() => {
    if (!visible || !skyReport || skyRefreshing || settling || extent === "small") return;
    let cancelled = false;
    const timer = setTimeout(() => {
      Taro.createSelectorQuery().select("#spot-panel-astronomy .weather-alerts").boundingClientRect().exec(results => {
        if (cancelled) return;
        const height = (results[0] as { height?: number } | null)?.height ?? 0;
        if (Number.isFinite(height) && height >= 0) setWarningPresentation(previous =>
          previous?.identity === timeRulerIdentity && previous.height === height && previous.report === skyReport
            ? previous : { identity: timeRulerIdentity, height, report: skyReport });
      });
    }, 80);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [visible, spot.spotId, timeRulerIdentity, skyReport, skyRefreshing, settling, extent, largeText, layoutVersion]);
  const scrollMeasureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (scrollMeasureTimer.current !== null) clearTimeout(scrollMeasureTimer.current);
    scrollMeasureTimer.current = null;
  }, [visible, spot.spotId, extent]);
  useResize(() => setLayoutVersion(value => value + 1));
  useEffect(() => {
    setViewerIndex(null);
    if (restoreInitialScroll.current) { restoreInitialScroll.current = false; return; }
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
        setSection(scroll!.scrollTop! + SECTION_NAV_ALIGNMENT_EPSILON_PX >= astronomyOffset.current - SECTION_NAV_REVEAL_PX ? "spot-panel-astronomy" : scroll!.scrollTop! + SECTION_NAV_ALIGNMENT_EPSILON_PX >= terrainOffset.current - SECTION_NAV_REVEAL_PX ? "spot-panel-terrain" : "spot-panel-overview");
      });
    }, 200);
    return () => { clearTimeout(measurementTimer); cancelled = true; terrainOffset.current = null; astronomyOffset.current = null; };
  }, [spot.spotId, detail, extent, settling, largeText, layoutVersion]);
  useEffect(() => {
    setScrollAnchor("");
    if (!visible || settling || !sectionRequest || sectionRequest.spotId !== spot.spotId || handledSectionRequest.current === sectionRequest) return;
    if (sectionRequest.id !== "spot-panel-document-start" && extent === "small") return;
    documentPosition.takeOver();
    setRestoredScrollTop(undefined);
    const timer = setTimeout(() => {
      sectionTimer.current = null;
      handledSectionRequest.current = sectionRequest;
      setScrollAnchor(sectionRequest.id);
    }, settling ? 200 : 80);
    sectionTimer.current = timer;
    return () => { clearTimeout(timer); if (sectionTimer.current === timer) sectionTimer.current = null; };
  }, [sectionRequest, extent, spot.spotId, settling, visible]);
  const photoScope = JSON.stringify([effectiveSpot.spotId, media.map(item => item.id), detail?.formalMedia]);
  const currentPhotoScope = useRef(photoScope);
  currentPhotoScope.current = photoScope;
  const openPhoto = (kind: typeof viewerKind, index: number) => {
    const requestedScope = currentPhotoScope.current;
    documentPosition.remember();
    galleryPosition.remember();
    void onPhotoIntent().then(accepted => {
      if (!accepted || currentPhotoScope.current !== requestedScope) return;
      setSectionRequest(null);
      setScrollAnchor("");
      setViewerKind(kind);
      setViewerIndex(index);
    });
  };
  useHiddenNativeScrollbar("spot-panel-scroll", extent !== "small", `${effectiveSpot.spotId}:${extent}`);
  useHiddenNativeScrollbar("spot-panel-media-strip", extent === "large" && media.length > 1, effectiveSpot.spotId);
  const route = detail?.route;
  const facilities = detail?.spot.facilities ?? effectiveSpot.facilities;
  const prominentFacilities = facilities.filter((facility) => facility.type === "PARKING" || facility.type === "TOILET");
  const visibleFacilities = prominentFacilities.length ? prominentFacilities : facilities.slice(0, 2);
  const facilityPhotos = (kind: "parking" | "toilet") => associatedFacilityPhotos(kind === "parking" ? "PARKING" : "TOILET", media, detail?.formalMedia, __MINIAPP_DEVELOPMENT_FIXTURE_MODE__);
  const viewerItems = viewerKind ? facilityPhotos(viewerKind) : media;
  const formalFacts = detail?.formalFacts;
  const detailLoading = !detail && (detailPending || contextPending);
  const detailUnavailable = !detail && Boolean(detailError || contextError);
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
  const weatherStale = Boolean(skyError || skyStale || visibleWeatherRuns.some(run => run.state === "STALE_USABLE"));
  const weatherTimezone = context?.timezone ?? effectiveSpot.timezone;
  const independentCloud = Boolean(skyReport && hasIndependentTotalCloud(skyReport));
  const cloudIntervals = useMemo(() => skyReport ? totalCloudCoverage(skyReport, Date.now() + forecastClockOffsetMs) : undefined,
    [skyReport, forecastClockOffsetMs]);
  const selectedCloud = useMemo(() => skyReport ? selectedTotalCloud(skyReport, astronomyAt, Date.now() + forecastClockOffsetMs) : null,
    [skyReport, astronomyAt, forecastClockOffsetMs]);
  const weatherSections = useMemo(() => skyReport
    ? weatherSourceSections(skyReport, astronomyAt, weatherTimezone, weatherStale, Date.now() + forecastClockOffsetMs, cloudIntervals) : [],
    [skyReport, astronomyAt, weatherTimezone, weatherStale, cloudIntervals, forecastClockOffsetMs]);
  const weatherCredits = skyReport ? weatherCreditSources(skyReport, Boolean(skyRow?.weatherAt), Boolean(selectedCloud)) : [];
  const weatherTime = formatSourceTime(skyRow?.weatherAt, weatherTimezone);
  const weatherUpdated = formatSourceTime(latestWeatherFetch, weatherTimezone);
  const weatherMissing = skyRow?.state === "EXPIRED" ? "已过期" : "暂无覆盖";
  const cloudMissing = skyReport ? totalCloudMissingLabel(skyReport, Date.now() + forecastClockOffsetMs) : "暂无覆盖";
  const cloudPercent = independentCloud ? selectedCloud?.cloudPercent ?? null : skyRow?.cloudPercent;
  const renderWeatherValue = (value: number | null | undefined, unit: string, digits = 0, fallback?: string) =>
    renderMetricValue(value, unit, digits, "type-data", fallback ?? (skyRow?.weatherAt ? EMPTY_FIELD_VALUE : weatherMissing));
  const weatherCells = [
    { label: "总云量", value: cloudPercent, unit: "%", fallback: independentCloud ? cloudMissing : undefined },
    { label: "气温", value: skyRow?.temperatureC, unit: "°C", digits: 1 },
    { label: "湿度", value: skyRow?.relativeHumidityPercent, unit: "%" },
    { label: "露点", value: skyRow?.dewPointC, unit: "°C", digits: 1 },
    { label: windDirectionLabel(skyRow?.windDirectionDeg), value: skyRow?.windKph, unit: " km/h", digits: 1 },
    { label: "阵风", value: skyRow?.windGustKph, unit: " km/h", digits: 1 },
    { label: "能见度", value: skyRow?.visibilityKm, unit: " km", digits: 1 },
    { label: "降水量", value: skyRow?.precipitationMm, unit: " mm", digits: 1 },
    { label: "降水概率", value: skyRow?.precipitationProbabilityPercent, unit: "%" },
  ].map(field => <View className="spot-panel__metric" key={field.label}>
    <Text className="type-secondary">{field.label}</Text>{renderWeatherValue(field.value, field.unit, field.digits, field.fallback)}
  </View>);
  const cloudReady = Boolean(
    detail && !timeSaving &&
      context?.location.kind === "FORMAL_SPOT" &&
      context.location.spotId === effectiveSpot.spotId,
  );
  const retainWarningSpace = Boolean(timeContext && !contextError && !skyError &&
    (skyPending || timeContextPending || skyRefreshing || (skyReport && warningPresentation?.report !== skyReport)) &&
    warningPresentation?.identity === timeRulerIdentity && warningPresentation.height > 0);
  const detailPageState: PageState = isPermissionError(detailError)
    ? "PERMISSION_DENIED"
    : "ERROR";
  const panelHandle = (
    <View className="spot-panel__handle-band spot-panel__handle-band--document" catchMove>
      <Button
        className="spot-panel__handle focus-ring"
        pressVariant="none"
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
    <SourceNavigationPreparation.Provider value={prepareSourceNavigation}>
    <View
      id="spot-information-panel"
      className={`spot-panel spot-panel--formal spot-panel--${extent}${phase === "closing" ? " spot-panel--closing" : ""}${media.length ? " spot-panel--with-media" : ""}`}
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

      <View className="spot-panel__scroll-frame">
        <ScrollView
          className="spot-panel__scroll spot-panel__scroll--full-bleed-plan"
          id="spot-panel-scroll"
          scrollY={documentScrollEnabled}
          {...(restoredScrollTop === undefined ? {} : { scrollTop: restoredScrollTop })}
          scrollIntoView={scrollAnchor}
          scrollWithAnimation={false}
          onTouchStart={documentPosition.takeOver}
          onScroll={event => {
            const top = event.detail.scrollTop;
            if (!visible || !Number.isFinite(top)) return;
            if (!documentPosition.record(top)) return;
            // Keep an explicit return command stable. Withdrawing this native
            // optional prop resets to zero; unrelated renders must not replay events.
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
            setSection(top + SECTION_NAV_ALIGNMENT_EPSILON_PX >= astronomyOffset.current - SECTION_NAV_REVEAL_PX ? "spot-panel-astronomy" : top + SECTION_NAV_ALIGNMENT_EPSILON_PX >= terrainOffset.current - SECTION_NAV_REVEAL_PX ? "spot-panel-terrain" : "spot-panel-overview");
          }}
          type="custom"
          enhanced
          showScrollbar={false}
          ariaLabel="观星点信息"
        >
          <Block>
          <View id="spot-panel-document-start" className="spot-panel__document-start" aria-hidden="true" />
          {media.length ? (
            <View id="spot-panel-reading-media" className="spot-panel__media panel-reading-anchor" data-control="spot-media-gallery">
              <ScrollView id="spot-panel-media-strip" className="spot-panel__media-strip" scrollX={media.length > 1}
                {...(galleryPosition.returnLeft === undefined ? {} : { scrollLeft: galleryPosition.returnLeft })} onTouchStart={galleryPosition.takeOver}
                onScroll={galleryPosition.onScroll} enhanced showScrollbar={false} ariaLabel={`${effectiveSpot.name}现场照片`}>
                <View className="spot-panel__media-track">
                  {media.map((item, index) => <Button id={`spot-media-source-${index}`} className="spot-panel__media-slide" key={item.id} ariaLabel={`查看现场照片 ${index + 1}，共 ${media.length} 张`} onClick={() => openPhoto(null, index)}>
                    <Image
                      className="spot-panel__media-image"
                      src={mediaSource(item.thumbnailPath || item.localPath)}
                      mode="aspectFill"
                      lazyLoad
                      ariaLabel={item.alt || `${effectiveSpot.name}现场照片`}
                    />
                    <Text className="spot-panel__red-photo-label" aria-hidden="true">现场照片</Text>
                    <Text className="spot-panel__media-caption">{index + 1} / {media.length}</Text>
                  </Button>)}
                </View>
              </ScrollView>
            </View>
          ) : null}
          {panelHandle}

          <View id="spot-panel-overview" className="spot-panel__identity panel-reading-anchor" ariaLabel="地点概览">
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

          <SpotPlanEntry spotId={effectiveSpot.spotId} onLayoutChange={onPlanLayoutChange} requireAccount={requireAccount} />

          {contextPending ? <StatusPanel state="LOADING" detail="正在读取地点资料" recoveryLabel="取消" onRecover={onLoadingCancel} /> : null}
          {contextError ? <StatusPanel
            state="ERROR"
            title="观测条件未更新"
            detail="地点的观测条件暂未确认；当前仅显示已确认的地图摘要，详情和天文时间暂不可用。"
            recoveryLabel="重试观测条件"
            onRecover={onContextRecover}
          /> : null}

          <View className="spot-panel__section" ariaLabel="场地资料">
            {detailPending && !contextPending ? <StatusPanel state="LOADING" detail="正在读取地点资料" recoveryLabel="取消" onRecover={onLoadingCancel} /> : null}
            {detailError || detailStale ? (
              <StatusPanel
                state={detailError ? detailPageState : "STALE"}
                detail={detailError ? detail ? "更新失败，暂时显示上次资料，请重试。" : isOfflineError(detailError) ? "网络不可用，请连接网络后重试。" : "地点信息暂时无法加载，请重试。" : "地点资料尚未确认最新状态，暂时显示上次结果。"}
                recoveryLabel="重试概览"
                onRecover={onRecover}
              />
            ) : null}

            <View id="spot-panel-reading-route" className="spot-panel__block spot-panel__block--route panel-reading-anchor" data-control="spot-route-summary">
              <View className="spot-panel__block-heading">
              <View className="spot-panel__route-copy">
              <Text className="spot-panel__value">
                {spotRouteSummary(route, detailLoading, detailUnavailable)}
              </Text>
              <Text className="spot-panel__route-note">{route?.parkingGuidance || route?.lastRoad || formalFacts?.parkingNote || `停车与末段道路信息${detailMissingFallback}`}</Text>
              </View>
                <Button pressVariant="icon" className="spot-panel__text-action" data-control="spot-navigation-action" ariaLabel={`查看${effectiveSpot.name}路线`} onClick={onNavigate}>
                  <SemanticIcon name="navigation" />
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

            <View id="spot-panel-reading-facilities" className="spot-panel__block spot-panel__block--facility panel-reading-anchor" data-control="spot-facility-evidence">
              <View className="spot-panel__facilities">
              {visibleFacilities.length ? visibleFacilities.map((facility) => {
                const mediaKind = facility.type === "PARKING" ? "parking" : facility.type === "TOILET" ? "toilet" : null;
                const facilityImages = mediaKind ? facilityPhotos(mediaKind) : [];
                return <FacilityCard id={`spot-facility-source-${mediaKind ?? facility.type}`} key={facility.type}
                  evidence={facility} photos={facilityImages} onOpenPhotos={mediaKind ? () => openPhoto(mediaKind, 0) : undefined} />;
              }) : <Text className="type-caption">{`设施信息${detailMissingFallback}`}</Text>}
              </View>
              {formalFacts?.contact?.trim() ? <View className="spot-panel__contact-row">
                <Text>门禁 / 负责人电话</Text><Text>{formalFacts.contact.trim()}</Text>
              </View> : <View className="spot-panel__contact-row">
                <Text>门禁 / 负责人电话</Text><Text className="spot-panel__contact-unavailable">{detailFieldFallback ?? EMPTY_FIELD_VALUE}</Text>
              </View>}
              <View className="spot-panel__source-row">
                <Text>{productSourceNames([source]) ? `资料：${productSourceNames([source])}` : "资料暂无数据"}{sourceTime ? ` · ${sourceTime.slice(0, 5)}核验` : ""}</Text>
                <Button className="spot-panel__text-action spot-panel__text-action--contribution" data-control="spot-contribution-entry" onClick={onContribution}>
                  <Text>我要反馈 ↗</Text>
                </Button>
              </View>
              {effectiveSpot.status === "PUBLISHED" || effectiveSpot.status === "TEMPORARILY_CLOSED" ? <View className="spot-panel__guide-row">
                <Text>观星攻略</Text>
                <Button className="spot-panel__text-action" data-control="spot-guide-entry" disabled={!cloudReady} onClick={() => onEvidence("guides")}>查看攻略 ↗</Button>
              </View> : null}
              <SpotAdditionalInformation spotId={effectiveSpot.spotId} detail={detail} facilities={facilities}
                facilityLabel={facilityLabel} onLayoutChange={() => setLayoutVersion(value => value + 1)} />
            </View>
            <RecentWeather id="spot-panel-reading-recent-weather" spotId={effectiveSpot.spotId} timezone={effectiveSpot.timezone} visible={visible} onLayoutChange={onReadingLayoutChange}
              failureEpisode={weatherFailureEpisodes?.recentWeather} />
          </View>
          <View id="spot-panel-terrain-anchor" className="spot-panel__chapter-anchor" aria-hidden="true" />
          <View id="spot-panel-terrain" className="spot-panel__section spot-panel__section--terrain" ariaLabel="地形">
            <Text className="type-section">地形</Text>
            <SpotTerrainOverview spot={effectiveSpot} visible={visible} onLayoutChange={onReadingLayoutChange} />
          </View>
          <View id="spot-panel-astronomy-anchor" className="spot-panel__chapter-anchor" aria-hidden="true" />
          <View id="spot-panel-astronomy" className="spot-panel__section" ariaLabel="天文">
            <View className="spot-panel__astronomy-heading">
              <Text className="type-section">天文</Text>
            </View>
            {!skyReport && (skyError || skyStale) ? (
              <StatusPanel
                state={skyError ? "ERROR" : "STALE"}
                detail={isOfflineError(skyError) ? "网络不可用，请连接网络后重试。" : "天气与天文资料暂未获取，请重试。"}
                recoveryLabel="重试天文资料"
                onRecover={onSkyRecover}
              />
            ) : null}
            <View {...(retainWarningSpace && !skyReport ? { role: "status", ariaLabel: "正在更新官方预警" } : {})}
              {...(retainWarningSpace ? { style: { minHeight: `${warningPresentation!.height}px`, flexShrink: 0 } } : {})}>
              <WeatherAlerts compact evidence={skyReport?.weatherEvidence} timezone={context?.timezone ?? effectiveSpot.timezone}
                active={visible} refreshing={skyRefreshing} scopeKey={effectiveSpot.spotId} refreshFailed={Boolean(skyError || skyStale)}
                failureEpisode={weatherFailureEpisodes?.weatherAlerts}
                onRecover={onSkyRecover} onContentChange={onWarningLayoutChange} />
            </View>
            <View id="spot-panel-reading-time" className="spot-panel__block spot-panel__block--astronomy-card panel-reading-anchor">
              {timeContext ? <><ObservationDateControl
                dates={dateOptions}
                selectedDate={selectedDate}
                today={todayDate}
                nativeBackBoundary={false}
                open={datePickerOpen}
                busy={!context || timeSaving}
                onOpenChange={onDatePickerOpenChange}
                onSelect={(date) => {
                  onDatePickerOpenChange(false);
                  onTimeCancel();
                  onDateCommit(date);
                }}
              />
              {timeFramesFailed && !timeFrames.length ? <StatusPanel
                state="ERROR"
                detail="暂时无法选择观测时刻。"
                recoveryLabel="重试可选时刻"
                onRecover={onTimeFramesRecover}
              /> : null}
              <MapTimeRuler
                nightLabel={observationNightLabel(timeContext.localDate, astronomyAt, timeContext.timezone, todayDate)}
                frames={timeFrames}
                pending={timeFramesPending}
                identity={timeRulerIdentity}
                moonPhases={timeFrames.map((frame) => frame.moonPhase)}
                selectedAt={timeContext.selectedAtUtc}
                timezone={timeContext.timezone}
                disabled={!context || !timeFrames.length || timeSaving}
                emptyMessage={timeFramesPending ? "正在加载可选时刻。" : timeFramesFailed ? "可选时刻暂不可用，请重试。" : "本观测夜暂无可选时刻。"}
                onPreview={onTimePreview}
                onCommit={onTimeCommit}
                onCancel={onTimeCancel}
                control="sky-time-scrubber"
              /></> : <Text className="type-caption">观测条件尚未确认；请回基本信息重试后选择日期与时间。</Text>}
              <MapTemporalFeedback failure={temporalFailure} onRetry={onTemporalRetry} />
            </View>
            {skyPending ? <StatusPanel state="LOADING" detail="正在加载所选观测夜的天文与天气资料" /> : null}
            {skyReport ? (
            <View id="spot-panel-reading-moon" className="spot-panel__block spot-panel__block--astronomy-card spot-panel__block--moon panel-reading-anchor" data-control="sky-lunar-facts">
              <View className="spot-panel__compact-heading"><Text className="type-label">月相</Text>
                <SourceEntry key={effectiveSpot.spotId} id="moon-data-source" label="月相计算来源"
                  sources={skyReport.sources.filter(source => source.kind === "PRODUCT_CALCULATION")} />
              </View>
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
                    <Text className="type-body">{skyReport ? formatLunarEvent(skyReport.lunarFacts.moonriseAt, context?.timezone ?? "Asia/Shanghai", "搜索时段内无月出") : "暂无数据"}</Text>
                  </View>
                  <View>
                    <Text className="type-caption">月落</Text>
                    <Text className="type-body">{skyReport ? formatLunarEvent(skyReport.lunarFacts.moonsetAt, context?.timezone ?? "Asia/Shanghai", "搜索时段内无月落") : "暂无数据"}</Text>
                  </View>
                </View>
                <View className="spot-panel__metric-grid">
                  <View className="spot-panel__metric"><Text className="type-secondary">月亮高度</Text>{renderMetricValue(skyRow?.moonAltitudeDeg, "°", 1, "type-body")}</View>
                  <View className="spot-panel__metric"><Text className="type-secondary">夜间阶段</Text><Text className="type-body">{darknessLabel(skyRow?.darkness)}</Text></View>
                </View>
              </View>
            </View>
            ) : null}
            {skyReport ? <View id="spot-panel-reading-weather" className="spot-panel__block spot-panel__block--astronomy-card spot-panel__block--professional-matrix panel-reading-anchor" data-control="sky-professional-matrix">
              <View className="spot-panel__compact-heading"><Text className="type-label spot-panel__weather-heading">气象条件</Text>
                <SourceEntry key={effectiveSpot.spotId} id="weather-data-source" label="气象来源与有效时间"
                  sources={skyReport.sources.filter(source => source.kind === "THIRD_PARTY_FORECAST")} sections={weatherSections} />
              </View>
              {weatherStale ? <StatusPanel state="STALE" detail={skyRow?.weatherAt || selectedCloud ? "更新未完成，保留仍有效的预报。" : "更新未完成，所选时刻暂无有效预报。"}
                recoveryLabel="重试天气与天文" onRecover={onSkyRecover} /> : null}
              <Text className="type-caption">{formatSourceTime(astronomyAt, weatherTimezone)} · {weatherTime ? `${independentCloud ? "其他天气" : ""}对应小时 ${weatherTime}` : `${independentCloud ? "其他天气" : ""}${weatherMissing}`}
                {weatherTime && weatherUpdated ? ` · ${weatherStale ? "上次获取" : "获取"} ${weatherUpdated}` : ""}</Text>
              {dayMode ? <View className="spot-panel__weather-matrix">{weatherCells}</View> : <View className="spot-panel__forecast-groups">
                <View className="spot-panel__evidence-group" ariaLabel="总云量">
                  <View className="spot-panel__evidence-title"><SemanticIcon name="conditions" presentation="forecast" /><Text className="type-label">{dayMode ? "云量" : "总云量"}</Text></View>
                  {renderWeatherValue(cloudPercent, "%", 0, independentCloud ? cloudMissing : undefined)}
                </View>
                <View className="spot-panel__evidence-group" ariaLabel="温湿">
                  <View className="spot-panel__evidence-title"><SemanticIcon name={dayMode ? "temperature" : "sun"} presentation="forecast" /><Text className="type-label">温湿</Text></View>
                  <View className="spot-panel__metric-grid">
                    {weatherCells.slice(1, 4)}
                  </View>
                </View>
                <View className="spot-panel__evidence-group" ariaLabel="风与能见度">
                  <View className="spot-panel__evidence-title"><SemanticIcon name={dayMode ? "wind" : "horizon"} presentation="forecast" /><Text className="type-label">风与能见度</Text></View>
                  <View className="spot-panel__metric-grid">
                    {weatherCells.slice(4, 7)}
                  </View>
                </View>
                <View className="spot-panel__evidence-group" ariaLabel="降水">
                  <View className="spot-panel__evidence-title"><SemanticIcon name={dayMode ? "droplet" : "conditions"} presentation="forecast" /><Text className="type-label">降水</Text></View>
                  <View className="spot-panel__metric-grid spot-panel__metric-grid--two">
                    {weatherCells.slice(7)}
                  </View>
                </View>
              </View>}
              <Text className="spot-panel__measurement-note type-caption">透明度、视宁度暂无独立数据</Text>
            </View> : null}
            <View id="spot-panel-reading-night-light" className="spot-panel__night-light panel-reading-anchor" data-control="sky-light-pollution">
              <View className="spot-panel__evidence-title"><SemanticIcon name={dayMode ? "bulb" : "horizon"} /><Text className="type-label">卫星夜光估算</Text></View>
              <Text className="spot-panel__night-light-label">{effectiveSpot.lightPollution.state === "ESTIMATED" || effectiveSpot.lightPollution.quality ? effectiveSpot.lightPollution.label : "暂无数据"}</Text>
              <Text className="type-caption">{/^\d{4}(?:$|-)/u.test(effectiveSpot.lightPollution.dataDate) ? `${effectiveSpot.lightPollution.dataDate.slice(0, 4)} 年 · ` : ""}{effectiveSpot.lightPollution.radiance ? `约 ${Number(effectiveSpot.lightPollution.radiance.median.toPrecision(6))} ${effectiveSpot.lightPollution.radiance.unit}` : "辐亮度暂无数据"}</Text>
              {effectiveSpot.lightPollution.quality?.state === "PARTIAL" ? <Text className="type-caption">周边样本有效面积约 {Math.round(effectiveSpot.lightPollution.quality.validAreaFraction * 100)}%，其余范围未作估算。</Text> : null}
              <View className="spot-panel__compact-credit">
                <SourceAttribution presentation="credit" sources={[effectiveSpot.lightPollution.source]} />
                <SourceEntry key={effectiveSpot.spotId} id="night-light-source" label="年度夜光来源" sources={[effectiveSpot.lightPollution.source]} />
              </View>
            </View>
            {skyReport ? <>
            <View id="spot-panel-reading-targets" className={`spot-panel__block spot-panel__block--astronomy-card spot-panel__block--target-list panel-reading-anchor${targetFrame?.targets.some((target) => target.altitudeDeg === null) ? " spot-panel__block--target-list--missing-altitude" : ""}`} data-control="sky-target-list">
              <View className="spot-panel__evidence-title"><SemanticIcon name={dayMode ? "telescope" : "star"} /><Text className="type-label">当前目标</Text></View>
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
                {weatherProviders.length || independentCloud && skyReport.weatherEvidence?.totalCloud?.source.provider ? `预报：${[...new Set([...weatherProviders,
                  ...(independentCloud && skyReport.weatherEvidence?.totalCloud?.source.provider ? [skyReport.weatherEvidence.totalCloud.source.provider] : [])])].join("、")}` : "预报来源暂无数据"}
              </Text>
              <Text className="type-caption">天体位置按所选时刻计算</Text>
            </View>
            <View className="spot-panel__sky-source-reading">
              {weatherCredits.length ? <SourceAttribution presentation="credit" sources={weatherCredits} /> : null}
              <SourceEntry key={effectiveSpot.spotId} id="sky-data-source" label="天文气象来源与有效时间" sources={skyReport.sources} sections={weatherSections} />
            </View>
            </> : null}
            <AirQuality id="spot-panel-reading-air-quality" spotId={effectiveSpot.spotId} selectedAt={astronomyAt} timezone={effectiveSpot.timezone} visible={visible} onLayoutChange={onReadingLayoutChange}
              failureEpisode={weatherFailureEpisodes?.airQuality} />
          </View>

          <View className={`spot-panel__disclosure${skyReport ? " spot-panel__disclosure--with-astronomy-source" : ""}`} data-control="data-source-disclosure">
            <SourceButton id="spot-all-sources" label="完整来源与更新时间" onOpen={() => onEvidence("sources")} />
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
            documentPosition.takeOver();
            retireSectionRequest();
            setSection(id);
            setSectionRequest({
              id: id === "spot-panel-overview" ? id : `${id}-anchor`,
              spotId: spot.spotId,
            });
            onExtent("large");
          }}
        />
      </View>

      {viewerIndex !== null && viewerItems[viewerIndex] ? <SpotImageViewer
        name={effectiveSpot.name}
        {...(viewerKind ? { sourceSelector: `#spot-facility-source-${viewerKind}` } : {})}
        media={viewerItems.map(item => ({
          id: item.id,
          src: mediaSource(item.localPath || item.thumbnailPath),
          alt: item.alt || `${effectiveSpot.name}现场照片`,
          caption: item.caption || item.alt || "现场资料",
          metadata: sitePhotoContext(item),
          attribution: `${item.photographer || "来源未注明"} · ${item.license}`,
          state: "ready" as const,
        }))}
        index={viewerIndex}
        onIndexChange={(index) => { if (!viewerKind) galleryPosition.reveal(index, media.length, Taro.getWindowInfo().windowWidth); setViewerIndex(index); }}
        onClose={() => setViewerIndex(null)}
        {...(onViewerBackHandlerChange ? { onBackHandlerChange: onViewerBackHandlerChange } : {})}
      /> : null}
      <View className="spot-panel__action-lane">
        <SpotPanelActions key={effectiveSpot.spotId} spotName={effectiveSpot.name}
          favorite={favorite} favoritePending={favoritePending} cloudReady={cloudReady}
          visible={visible && phase !== "closing" && viewerIndex === null}
          onFavorite={onFavorite} onCloud={onCloud} onShare={onShare} />
      </View>
    </View>
    </SourceNavigationPreparation.Provider>
  );
}
