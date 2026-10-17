import { getReducedMotion, useReducedMotion } from "@/hooks/use-reduced-motion";
import { SystemMotionProbe } from "@/components/system-motion-probe";
import { FINDER_FIELD_PLACEHOLDER } from "./finder-field";
import { useMapForecastQuery, useSkyForecastQuery } from "@/hooks/use-forecast-query";
import { WEATHER_ALERT_REFRESH_MS } from "@/components/weather-alert-state";
import { MapLayerSheet } from "./map-layer-sheet";
import { createSpotEditorPresentation, SPOT_EDITOR_ENTER_MS, SPOT_EDITOR_EXIT_MS, type SpotEditorPhase } from "./spot-editor-presentation";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import { panelSpringStyle, panelChromeTimeline, type PanelCssMotion } from "./panel-spring-style";
import { MapPanelPresentation, MapPanelChrome, type MapPanelPresentationHandle } from "./panel-presentation";
import { createPanelAnimation, type PanelAnimationHost } from "./panel-animation";
import { panelDragHeight, panelDragOriginHeight, panelSpringFrames } from "./panel-spring";
import { elasticVelocityFactor } from "@/components/elastic-motion";
import { markerGroups, markerItems } from "./map-markers";
import { privateContributionMarkerItems, privateContributionMarkers } from "./private-contribution-markers";
import { ContributionEditor, type ContributionCandidatePreview, type ContributionLeaveGuard } from "@/content/contribution/contribution-editor";
import { panelIdentityMinimumHeight, panelReleaseStartHeight, panelReleaseVelocity, previousPanelExtent, releasePanelExtent, readPanelSnapGeometry, type PanelMotionSample, type PanelSnapGeometry } from "./panel-snap";
import { nativeNavigationInsets } from "@/theme/native-metrics";
import { usePrimaryNavigation } from "@/hooks/use-primary-navigation";
import { useSpotNavigationCommand } from "@/hooks/use-spot-navigation";
import { currentNavigationResource } from "@/navigation/spot-navigation-controller";
import { primaryNavigationLayout } from "@/navigation/primary-navigation";
import { restoreMapBootstrapContext, retryObservationScene, spotSelectionAllowsContextRestore } from "./context-restore";
import { canApplyContextRestore, sameContextVersion } from "@/services/observation-context-version";
import { FloatingNotificationHost } from "@/components/notification";
import { PHOTO_VIEWER_HANDOFF, useRedLightHandoff } from "@/components/red-light-handoff";
import Taro, { useDidHide, useDidShow, useResize } from "@tarojs/taro";
import {
  Button,
  Map,
  Text,
  View,
} from "@tarojs/components";
import type { BaseEventOrig, MapProps } from "@tarojs/components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { gcj02ToWgs84, wgs84ToGcj02 } from "@starward/coordinate-system";
import {
  type DisplayMode,
  type ContributionSubmission,
  type SpotSummary,
  type TerrainOverlayData,
} from "@starward/miniapp-contracts";
import { NotificationRegion } from "@/components/notification";
import { SemanticIcon } from "@/components/semantic-asset";
import { AstronomicalEventModal, type AstronomicalEventModalHandle } from "@/components/astronomical-event-modal";
import { StatusPanel } from "@/components/status-panel";
import { SoftButton } from "@/components/soft-button";
import { useMapRasterInstallation } from "./use-map-raster-installation";
import { useNativeMapRecovery } from "./native-map-recovery";
import { reconcileFavoriteSnapshot, useFavoriteMutation } from "@/hooks/use-favorite-mutation";
import { useWechatLogin } from "@/hooks/use-wechat-login";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { SourceAttribution } from "@/components/source-attribution";
import { Provenance } from "@/components/provenance";
import { useMotionThemeClass as useThemeClass } from "@/hooks/use-theme";
import {
  errorMessage,
  MiniappApiError,
  currentDraftUserId,
  getMapScene,
  getSkyReport,
  getSpotOverview,
  resolveObservationContext,
  restoreObservationContext,
  replaceRetiredObservationContext,
  updateObservationContext,
} from "@/services/api-client";
import { useAppStore, type AnalysisOverlay, type LocationState } from "@/state/app-store";
import { useContributionHistory } from "@/hooks/use-contribution-history";
import { useTerrainOverlay } from "@/hooks/use-terrain-overlay";
import { useRasterImage } from "@/hooks/use-raster-image";
import { terrainLayerAvailability } from "./terrain-layer-availability";
import { bufferTerrainBounds } from "./terrain-geometry";
import { useNativeMapRegion } from "./use-native-map-region";
import {
  nearestMapTimeFrameIndex,
  cloudTimeFrameChoices,
  cloudForecastStarts,
  mapTimeFrameAt,
  projectedLayerPolygons,
  projectMapEvaluations,
} from "./map-time-frame";
import { ForecastCoverageNote } from "@/components/forecast-coverage-note";
import "./index.scss";
import { calendarDateInTimezone, clockTimeInTimezone } from "@/utils/zoned-date";
import { requestOneShotLocation } from "@/services/one-shot-location";
import { isMiniappRequestCancelled } from "@/services/request-lifecycle";
import { userMapRegionEnd, userMapRegionStarted, mapRegionEnded } from "./map-region-event";
import { MapTimeRuler } from "./time-ruler";
import { MapTemporalFeedback, type MapTemporalFailure } from "./map-temporal-feedback";
import { ObservationDateControl } from "@/components/observation-date-control";
import {
  civilDateForInstant,
  instantForCivilDate,
  observationDateOptions,
  observationNightLabel,
} from "@/components/observation-date";
import {
  SpotInformationPanel,
  type SpotPanelExtent,
} from "./spot-panel";
import { projectSpotPanelResource } from "./spot-panel-resource-projection";
import { shouldOpenSpotForSelection } from "./spot-open-intent";
import { mediaIsRenderable } from "./spot-panel-media";
import { PendingProposalPanel } from "./pending-proposal-panel";
import { privateContributionSelectionTransition, pendingProposalContextLocation, samePendingProposalIntent } from "./private-contribution-transition";
import {
  layerSheetOverlay,
  layerSheetOwnsSceneRecovery,
  lightLayerContentState,
  mapLayerKindForOverlay,
} from "./map-layer-selection";
import { useMapSpotFocus, type MeasuredSpotFocusFrame } from "./use-map-spot-focus";
import { spotNeighborhoodCamera } from "./map-camera";
import { mapRasterFiles } from "@/services/map-raster-files";
import { currentTimezoneHint } from "@/utils/current-timezone-hint";
import { createSkyEntryTransition, SKY_ENTRY_FADE_MS } from "./sky-entry-transition";
import { reportRuntimeError } from "@/services/runtime-error";

function panelViewportSize(): { width: number; height: number } | null {
  try {
    const { windowWidth, windowHeight } = Taro.getWindowInfo();
    return Number.isFinite(windowWidth) && windowWidth > 0 && Number.isFinite(windowHeight) && windowHeight > 0
      ? { width: windowWidth, height: windowHeight }
      : null;
  } catch { return null; }
}

function localDateForNow(timezone = "Asia/Shanghai") {
  return calendarDateInTimezone(new Date(), timezone);
}

function formatContextTime(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    const date = calendarDateInTimezone(new Date(value), timezone);
    return `${date.slice(5, 7)}月${date.slice(8, 10)}日 ${clockTimeInTimezone(new Date(value), timezone)}`;
  }
}

const TERRAIN_GROUND_OVERLAY_ID = 91301;
const NIGHT_LIGHT_GROUND_OVERLAY_ID = 91303;

function isPermissionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "PERMISSION_DENIED"
  );
}

interface NativeLayerPolygon {
  points: readonly { latitude: number; longitude: number }[];
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  zIndex: number;
}

type BottomPresentation = "none" | "spot-panel" | "layer-sheet" | "spot-editor";
const SPOT_EDITOR_TOP_PX = 230;

function layerProjectionFingerprint(polygons: readonly NativeLayerPolygon[]) {
  let fingerprint = 2_166_136_261;
  const input = polygons
    .map(
      (polygon) =>
        `${polygon.points.map((point) => `${point.latitude},${point.longitude}`).join(";")}:${polygon.strokeColor}:${polygon.fillColor}:${polygon.strokeWidth}:${polygon.zIndex}`,
    )
    .join("|");
  for (let index = 0; index < input.length; index += 1) {
    fingerprint ^= input.charCodeAt(index);
    fingerprint = Math.imul(fingerprint, 16_777_619);
  }
  return polygons.length ? (fingerprint >>> 0).toString(16) : "empty";
}

const overlayLabels: Record<AnalysisOverlay, string> = {
  NONE: "无叠加",
  LIGHT: "光污染",
  TOTAL_CLOUD: "云量",
  OPPORTUNITY: "云量",
};

export default function MapPage() {
  const themeClass = useThemeClass();
  const primaryNavigation = usePrimaryNavigation("pages/map/index");
  const reducedMotion = useReducedMotion();
  const navigationHandoff = useRedLightHandoff({ nativeBackBoundary: false });
  const photoHandoff = useRedLightHandoff({ nativeBackBoundary: false, title: PHOTO_VIEWER_HANDOFF.title });
  const [coverageExpanded, setCoverageExpanded] = useState(false);
  const [terrainSourceId, setTerrainSourceId] = useState<string | null>(null);
  const mode = useAppStore((state) => state.mode);
  const committedFilters = useAppStore((state) => state.committedFilters);
  const finderQuery = useAppStore((state) => state.finderQuery);
  const observationContext = useAppStore(
    (state) => state.observationContext,
  );
  const retiredObservationContextId = useAppStore((state) => state.retiredObservationContextId);
  const analysisOverlay = useAppStore((state) => state.analysisOverlay);
  const terrainEnabled = useAppStore((state) => state.terrainEnabled);
  const preferences = useAppStore((state) => state.preferences);
  const viewport = useAppStore((state) => state.viewport);
  const selectedSpotId = useAppStore((state) => state.selectedSpotId);
  const spotOpenRequestVersion = useAppStore((state) => state.spotOpenRequestVersion);
  const locationState = useAppStore((state) => state.locationState);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const accountOwnerId = useAppStore((state) => state.accountOwnerId);
  const setObservationContext = useAppStore(
    (state) => state.setObservationContext,
  );
  const setAnalysisOverlay = useAppStore((state) => state.setAnalysisOverlay);
  const setTerrainEnabled = useAppStore((state) => state.setTerrainEnabled);
  const setViewport = useAppStore((state) => state.setViewport);
  const mapResetVersion = useAppStore((state) => state.mapResetVersion);
  const selectSpot = useAppStore((state) => state.selectSpot);
  const setLocationState = useAppStore((state) => state.setLocationState);
  const notify = useAppStore((state) => state.notify);
  const { toggleFavorite, isPending: favoritePending } = useFavoriteMutation();
  const login = useWechatLogin({ nativeBack: false });
  const [debouncedFinderQuery, setDebouncedFinderQuery] = useState("");
  const nativeMap = useNativeMapRecovery();
  const currentNativeMapRef = useRef(nativeMap);
  currentNativeMapRef.current = nativeMap;
  const mapRuntimeError = nativeMap.error;
  const [announcement, setAnnouncement] = useState("");
  const [timeSaving, setTimeSaving] = useState(false);
  const [spotContextAttempt, setSpotContextAttempt] = useState<{
    spotId: string;
    pending: boolean;
    error: unknown;
  } | null>(null);
  const [temporalFailure, setTemporalFailure] = useState<(MapTemporalFailure & {
    contextId: string;
    revision: number;
    contextFingerprint: string;
    selectedSpotId: string | null;
    requestGeneration: number;
    mapResetVersion: number;
  }) | null>(null);
  const [calendarOwner, setCalendarOwner] = useState<string | null>(null);
  const [calendarBounds, setCalendarBounds] = useState<{ identity: string; top: number } | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventModalPresent, setEventModalPresent] = useState(false);
  const eventModalOpenRef = useRef(false);
  const eventModalRef = useRef<AstronomicalEventModalHandle | null>(null);
  eventModalOpenRef.current = eventModalOpen || eventModalPresent;
  const timeRequestBusy = useRef(false);
  const [pageVisible, setPageVisible] = useState(true);
  const navigationEpoch = useRef(0);
  const [locationBusy, setLocationBusy] = useState(false);
  const locationRequestBusy = useRef<{ intent: number; previous: LocationState } | null>(null);
  const [locationCandidate, setLocationCandidate] = useState<{
    center: { latitude: number; longitude: number }; intent: number; owner: string | null; reset: number;
  } | null>(null);
  const regionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapPointIntent = useRef(0);
  const failedMapRegion = useRef<{
    center: { latitude: number; longitude: number };
    intent: number;
    owner: string | null;
    resetVersion: number;
  } | null>(null);
  const invalidateMapPointIntent = (preserveFailure = false) => {
    if (regionTimer.current) clearTimeout(regionTimer.current);
    regionTimer.current = null;
    setSpotContextAttempt(attempt => attempt?.pending
      ? { ...attempt, pending: false, error: new Error("观测条件更新已中断，请重试。") }
      : attempt);
    const intent = ++mapPointIntent.current;
    if (failedMapRegion.current) {
      if (preserveFailure && failedMapRegion.current.owner === currentDraftUserId() &&
        failedMapRegion.current.resetVersion === useAppStore.getState().mapResetVersion)
        failedMapRegion.current = { ...failedMapRegion.current, intent };
      else dismissMapRegionFailure();
    }
    return intent;
  };
  const dismissMapRegionFailure = () => {
    failedMapRegion.current = null;
    const state = useAppStore.getState();
    for (const item of state.notifications) {
      if (item.owner === "map" && item.dedupeKey === "map-context-region-failed") state.dismissNotification(item.id);
    }
  };
  // Packet A owns one bottom presentation coordinator. Panel extent and layer
  // sheet are mutually exclusive derived modes, never parallel booleans.
  const [bottomPresentation, setBottomPresentationState] =
    useState<BottomPresentation>("none");
  const cancelSpotMapFocus = useRef<() => void>(() => {});
  const bottomPresentationRef = useRef<BottomPresentation>("none");
  bottomPresentationRef.current = bottomPresentation;
  const [spotEditorPhase, setSpotEditorPhase] = useState<SpotEditorPhase>("open");
  const editorPresentationScope = useRef<string | null>(null);
  const editorPresentationRef = useRef<ReturnType<typeof createSpotEditorPresentation> | null>(null);
  if (!editorPresentationRef.current) editorPresentationRef.current = createSpotEditorPresentation({
    getScope: () => editorPresentationScope.current === null ? null :
      JSON.stringify([editorPresentationScope.current, currentDraftUserId(), useAppStore.getState().mapResetVersion]),
    onPhase: setSpotEditorPhase,
  });
  const editorPresentation = editorPresentationRef.current;
  editorPresentationScope.current = pageVisible
    ? JSON.stringify([currentDraftUserId(), nativeMap.mapId, mapResetVersion, navigationEpoch.current])
    : null;
  const setBottomPresentation = useCallback((presentation: BottomPresentation) => {
    if (presentation !== bottomPresentationRef.current || (presentation !== "spot-panel" && presentation !== "spot-editor")) cancelSpotMapFocus.current();
    setCalendarOwner(null);
    if (presentation !== "spot-editor") editorPresentation.cancel();
    else if (bottomPresentationRef.current !== "spot-editor") editorPresentation.enter(getReducedMotion());
    bottomPresentationRef.current = presentation;
    setBottomPresentationState(presentation);
  }, [editorPresentation]);
  const editorHandoffBack = useRef<(() => void) | null>(null);
  const registerEditorHandoffBack = useCallback((handler: (() => void) | null) => {editorHandoffBack.current = handler;}, []);
  useEffect(() => () => editorPresentation.dispose(), [editorPresentation]);
  const imageViewerBack = useRef<(() => void) | null>(null);
  const registerImageViewerBack = useCallback((handler: (() => void) | null) => { imageViewerBack.current = handler; }, []);
  const [spotEditorTarget, setSpotEditorTarget] = useState<{ forceNew: boolean; submissionId?: string }>({ forceNew: true });
  const [candidatePreview, setCandidatePreview] = useState<ContributionCandidatePreview | null>(null);
  const candidatePreviewRef = useRef<ContributionCandidatePreview | null>(null);
  const candidateSelectionVersion = useRef<number | null>(null);
  const editorLeaveGuard = useRef<ContributionLeaveGuard | null>(null);
  const editorLeaveRequest = useRef<Promise<boolean> | null>(null);
  const [panelExtent, setPanelExtent] = useState<SpotPanelExtent>("medium");
  const panelExtentRef = useRef<SpotPanelExtent>("medium");
  panelExtentRef.current = panelExtent;
  const [panelPhase, setPanelPhase] = useState<"idle" | "closing">("idle");
  const panelPresentation = useRef<MapPanelPresentationHandle>(null);
  const setPanelDragOffset = (offset: number) => {
    const drag = panelDrag.current;
    panelPresentation.current?.setDragFrame(drag?.geometry
      ? { extent: drag.extent, geometry: drag.geometry, offset } : null);
  };
  const [panelDragging, setPanelDragging] = useState(false);
  const panelDocumentScrollEnabled = panelExtent !== "small" && !panelDragging;
  const [panelSettling, setPanelSettling] = useState(false);
  const [panelCssMotion, setPanelCssMotion] = useState<PanelCssMotion | null>(null);
  const panelCssSequence = useRef(0);
  const panelSpring = useRef(createPanelAnimation(() => console.warn("panel_animation_render_failed")));
  const springTarget = useRef<SpotPanelExtent | null>(null);
  const springRequest = useRef(0);
  const stopPanelSpring = () => { springRequest.current += 1; panelSpring.current.cancel(); springTarget.current = null; setPanelSettling(false); };
  useEffect(() => () => { springRequest.current += 1; panelSpring.current.cancel(); }, []);
  const [selectedFallback, setSelectedFallback] =
    useState<SpotSummary | null>(null);
  const currentContributionOwner = currentDraftUserId();
  const [selectedProposalState, setSelectedProposalState] = useState<{
    owner: string;
    submission: ContributionSubmission;
  } | null>(null);
  const selectedProposal = selectedProposalState?.owner === currentContributionOwner
    ? selectedProposalState.submission
    : null;
  const panelGeometryIdentity = selectedProposal
    ? `proposal:${currentContributionOwner}:${selectedProposal.submissionId}`
    : `formal:${selectedSpotId ?? ""}`;
  const [panelIdentityLayout, setPanelIdentityLayout] = useState<{ identity: string; height: number } | null>(null);
  const panelIdentityHeight = panelIdentityLayout?.identity === panelGeometryIdentity ? panelIdentityLayout.height : 0;
  const [panelLayoutVersion, setPanelLayoutVersion] = useState(0);
  const [spotFocusFrame, setSpotFocusFrame] = useState<MeasuredSpotFocusFrame | null>(null);
  const getSpotFocusScope = () => JSON.stringify([currentDraftUserId(), nativeMap.mapId, useAppStore.getState().mapResetVersion]);
  const spotFocusScope = getSpotFocusScope();
  const spotFocusIdentity = bottomPresentation === "spot-editor" ? `candidate:${candidatePreview?.selectionVersion ?? 0}` : panelGeometryIdentity;
  const nativeViewport = useNativeMapRegion(nativeMap, pageVisible && (terrainEnabled || mapLayerKindForOverlay(analysisOverlay) !== "NORMAL" || bottomPresentation === "layer-sheet" || bottomPresentation === "spot-panel" || bottomPresentation === "spot-editor"),
    viewport, panelLayoutVersion, primaryNavigation.pageHeight,
    ((bottomPresentation === "spot-editor" && candidatePreview) || bottomPresentation === "spot-panel") ? viewport.zoom : null);
  const mapTerrainBounds = useMemo(() => nativeViewport.bounds ? bufferTerrainBounds(nativeViewport.bounds) : null, [nativeViewport.bounds]);
  const terrainViewportError = nativeViewport.error;
  const readTerrainViewport = nativeViewport.read;
  const readNativeViewportRef = useRef(nativeViewport.read);
  readNativeViewportRef.current = nativeViewport.read;
  const terrainReadEnabled = pageVisible && (terrainEnabled || bottomPresentation === "layer-sheet");
  const onPanelContentLayoutChange = useCallback(() => setPanelLayoutVersion(value => value + 1), []);
  useResize(() => { invalidatePanelGeometry(); setPanelLayoutVersion(value => value + 1); });
  const setSelectedProposal = useCallback((submission: ContributionSubmission | null) => {
    const owner = currentDraftUserId();
    setSelectedProposalState(submission && owner ? { owner, submission } : null);
  }, []);
  const selectedProposalRef = useRef<typeof selectedProposal>(null);
  useEffect(() => { selectedProposalRef.current = selectedProposal; }, [selectedProposal]);
  const [skyEntryPresentation, setSkyEntryPresentation] = useState<number | null>(null);
  const skyEntryScope = useRef<() => string | null>(() => null);
  const skyEntryRef = useRef<ReturnType<typeof createSkyEntryTransition> | null>(null);
  if (!skyEntryRef.current) skyEntryRef.current = createSkyEntryTransition({
    getScope: () => skyEntryScope.current(), onPresentation: setSkyEntryPresentation,
  });
  const skyEntry = skyEntryRef.current;
  skyEntryScope.current = () => {
    if (!nativeMap.isCurrent()) return null;
    const state = useAppStore.getState(), context = state.observationContext;
    const proposal = selectedProposalRef.current;
    return JSON.stringify([currentDraftUserId(), state.mapResetVersion, state.selectedSpotId,
      proposal?.submissionId, proposal?.revision, context?.contextId, context?.revision, context?.contextFingerprint]);
  };
  useEffect(() => {
    if (skyEntryPresentation !== null) skyEntry.presented(skyEntryPresentation);
  }, [skyEntry, skyEntryPresentation]);
  useEffect(() => {
    const hide = () => skyEntry.hide();
    Taro.onAppHide(hide);
    return () => { Taro.offAppHide(hide); skyEntry.dispose(); };
  }, [skyEntry]);
  useEffect(() => {
    if (!selectedProposalState || selectedProposal) return;
    setSelectedProposalState(null);
    if (bottomPresentation === "spot-panel") setBottomPresentation("none");
    selectSpot(null);
    setSelectedFallback(null);
  }, [currentContributionOwner]);
  const [panelPreviewFrameIndex, setPanelPreviewFrameIndex] = useState(0);
  const [timePreviewing, setTimePreviewing] = useState(false);
  const panelCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markerTapAt = useRef(0);
  const panelDrag = useRef<{
    startY: number;
    startX: number | undefined;
    samples: PanelMotionSample[];
    releasedAt: number;
    identifier: number | undefined;
    extent: SpotPanelExtent;
    moved: boolean;
    offset: number;
    pointerOffset: number;
    rawStartHeight: number;
    geometry: PanelSnapGeometry | null;
    released: boolean;
  } | null>(null);
  const panelSnapCache = useRef<{
    identity: string;
    width: number;
    height: number;
    geometry: PanelSnapGeometry;
  } | null>(null);
  const lastHandledSelectedId = useRef<string | null>(null);
  const lastHandledSpotOpenVersion = useRef(0);
  const detailRequestGeneration = useRef(0);
  const privateTransitionGeneration = useRef(0);
  useEffect(() => { photoHandoff.cancel(); }, [panelGeometryIdentity, pageVisible, bottomPresentation]);
  const onPanelPhotoIntent = async () => {
    if (!pageVisible || bottomPresentationRef.current !== "spot-panel") return false;
    const generation = privateTransitionGeneration.current;
    const epoch = navigationEpoch.current;
    const owner = currentDraftUserId();
    const spotId = useAppStore.getState().selectedSpotId;
    const resetVersion = useAppStore.getState().mapResetVersion;
    const submissionId = selectedProposalRef.current?.submissionId;
    const accepted = await photoHandoff.confirm(PHOTO_VIEWER_HANDOFF.detail);
    return accepted && generation === privateTransitionGeneration.current && epoch === navigationEpoch.current &&
      owner === currentDraftUserId() && spotId === useAppStore.getState().selectedSpotId &&
      resetVersion === useAppStore.getState().mapResetVersion &&
      submissionId === selectedProposalRef.current?.submissionId && bottomPresentationRef.current === "spot-panel";
  };
  useEffect(() => () => {
    useAppStore.getState().retireObservationContextEdit();
    detailRequestGeneration.current += 1;
  }, []);
  const extentBeforeLayer = useRef<{
    extent: SpotPanelExtent;
    selectedSpotId: string | null;
  } | null>(null);

  useDidShow(() => { skyEntry.show(); setPageVisible(true); });
  useDidHide(() => {
    skyEntry.hide();
    spotMapFocus.cancel();
    cancelLocation();
    setCalendarOwner(null);
    invalidateMapPointIntent(true); stopPanelSpring(); navigationEpoch.current += 1;
    editorPresentationScope.current = null;
    if (editorPresentation.isClosing()) setBottomPresentation("none");
    else editorPresentation.cancel();
    setPageVisible(false); panelDrag.current = null; setPanelDragOffset(0); setPanelDragging(false);
  });

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedFinderQuery(finderQuery.trim()),
      250,
    );
    return () => clearTimeout(timer);
  }, [finderQuery]);

  // A retained spot attempt owns its POST (including retry); bootstrap must not
  // cancel it through the shared resolve request key. Cold restoration has no
  // attempt/summary yet, so it remains owned by bootstrap.
  const bootstrapReplacementBlocked = Boolean(selectedSpotId &&
    lastHandledSpotOpenVersion.current === spotOpenRequestVersion &&
    (spotContextAttempt?.spotId === selectedSpotId || lastHandledSelectedId.current === selectedSpotId) &&
    (retiredObservationContextId || !spotSelectionAllowsContextRestore(observationContext, selectedSpotId)));
  // Store selection may render before the local attempt. Invalidate that
  // render's fetch as soon as explicit point resolution takes ownership.
  const bootstrapPointIntent = mapPointIntent.current;
  const bootstrapContext = useResourceQuery({
    queryKey: [
      "map-observation-context",
      accountOwnerId,
      mapResetVersion,
      observationContext?.contextId,
      observationContext?.contextFingerprint,
      observationContext?.revision,
      retiredObservationContextId,
      Number(viewport.center.latitude.toFixed(5)),
      Number(viewport.center.longitude.toFixed(5)),
    ],
    queryFn: (signal) => {
      const current = useAppStore.getState();
      if (bootstrapReplacementBlocked || bootstrapPointIntent !== mapPointIntent.current || current.selectedSpotId !== selectedSpotId ||
          current.mapResetVersion !== mapResetVersion || !sameContextVersion(observationContext, current.observationContext))
        throw new Error("context_selection_resolution_pending");
      const point = gcj02ToWgs84({
        lat: viewport.center.latitude,
        lon: viewport.center.longitude,
        system: "GCJ-02",
      });
      const fallback = {
          location: {
            kind: "MAP_POINT",
            displayName: "当前地图中心",
            wgs84: {
              system: "WGS84",
              latitude: point.lat,
              longitude: point.lon,
            },
            source: "MAP_VIEWPORT",
            timezoneHint: currentTimezoneHint(),
          },
          localDate: observationContext?.localDate ?? localDateForNow(),
          selectedAt: observationContext?.selectedAtUtc ?? null,
          eventInstanceId: observationContext?.eventInstanceId ?? null,
          targetProfile: observationContext?.targetProfile ?? "DAILY",
        } as const;
      return restoreMapBootstrapContext({
        storedContext: observationContext,
        retiredContextId: retiredObservationContextId,
        replaceRetired: replaceRetiredObservationContext,
        fallback,
        restore: restoreObservationContext,
        resolve: resolveObservationContext,
        shouldFallback: (error) => error instanceof MiniappApiError && (error.code === "NOT_FOUND" ||
          Boolean(observationContext?.privateProposal && error.code === "PERMISSION_DENIED")),
        ...(signal ? { signal } : {}),
      });
    },
    enabled: pageVisible && !bootstrapReplacementBlocked,
    staleTime: 60_000,
  });
  const bootstrapReference = bootstrapContext.data?.data ?? null;
  const restoredContext = (spotSelectionAllowsContextRestore(observationContext, selectedSpotId) ||
    Boolean(!bootstrapReplacementBlocked && (retiredObservationContextId ||
      (selectedSpotId && lastHandledSelectedId.current !== selectedSpotId && bootstrapReference && observationContext &&
        bootstrapReference.contextId !== observationContext.contextId &&
        bootstrapReference.localDate === observationContext.localDate &&
        Date.parse(bootstrapReference.selectedAtUtc) === Date.parse(observationContext.selectedAtUtc) &&
        bootstrapReference.eventInstanceId === observationContext.eventInstanceId &&
        bootstrapReference.targetProfile === observationContext.targetProfile))))
    ? bootstrapReference
    : observationContext;
  const activeContext = retiredObservationContextId && restoredContext?.contextId === retiredObservationContextId ? null : restoredContext;
  const timeReference = activeContext ?? observationContext;
  const timeRulerIdentity = JSON.stringify([accountOwnerId, timeReference?.contextId, timeReference?.localDate, timeReference?.timezone, timeReference?.weatherView, timeReference?.algorithmVersions]);
  useEffect(() => {
    navigationEpoch.current += 1;
    return () => { navigationEpoch.current += 1; };
  }, [selectedSpotId, activeContext?.contextId, activeContext?.contextFingerprint, activeContext?.revision]);

  useEffect(() => {
    const currentState = useAppStore.getState();
    const currentContext = currentState.observationContext;
    if (
      pageVisible &&
      bootstrapContext.data?.data &&
      bootstrapContext.data.data.contextId !== currentState.retiredObservationContextId &&
      currentState.mapResetVersion === mapResetVersion &&
      currentState.selectedSpotId === selectedSpotId &&
      spotSelectionAllowsContextRestore(observationContext, currentState.selectedSpotId) &&
      canApplyContextRestore(observationContext, currentContext, bootstrapContext.data.data) &&
      (currentContext?.contextId !== bootstrapContext.data.data.contextId ||
        currentContext.revision !== bootstrapContext.data.data.revision ||
        currentContext.contextFingerprint !==
          bootstrapContext.data.data.contextFingerprint)
    ) {
      const removedFormalSpot = observationContext?.location.kind === "FORMAL_SPOT" &&
        bootstrapContext.data.data.location.kind === "MAP_POINT";
      const removedPrivateSpot = Boolean(observationContext?.privateProposal && bootstrapContext.data.data.location.kind === "MAP_POINT");
      setObservationContext(bootstrapContext.data.data);
      if (removedFormalSpot || removedPrivateSpot) {
        selectSpot(null);
        setSelectedFallback(null);
        setSelectedProposal(null);
        setBottomPresentation("none");
        notify({ owner: "map", placement: "floating", tone: "warning",
          title: removedPrivateSpot ? "原待审点位已不可用" : "原观星点已失效", body: "已回到当前地图中心。", dismissible: true,
          dedupeKey: `map-removed-location:${observationContext!.contextId}` });
      }
    }
  }, [
    bootstrapContext.data?.data,
    observationContext,
    mapResetVersion,
    selectedSpotId,
    pageVisible,
    setObservationContext,
    selectSpot,
    notify,
  ]);

  const scene = useMapForecastQuery({
    queryKey: [
      "map-scene",
      accountOwnerId,
      (activeContext ?? observationContext)?.contextId,
      (activeContext ?? observationContext)?.contextFingerprint,
      (activeContext ?? observationContext)?.revision,
      committedFilters,
      debouncedFinderQuery,
      Number(viewport.center.latitude.toFixed(4)),
      Number(viewport.center.longitude.toFixed(4)),
      viewport.zoom,
      nativeViewport.bounds,
      preferences.defaultPlace,
      preferences.experience,
      preferences.maxDriveMinutes,
      preferences.requiredFacilities,
      preferences.equipment,
      preferences.capturePreference,
      analysisOverlay,
    ],
    queryFn: (signal) => {
      // Retain the confirmed cached markers while selection resolves, without
      // making requests against the retired server identity (even on refetch).
      if (!activeContext) throw new Error("context_selection_resolution_pending");
      return getMapScene(
        activeContext!.contextId,
        committedFilters,
        debouncedFinderQuery,
        { ...viewport, ...(nativeViewport.bounds ? { bounds: nativeViewport.bounds } : {}) },
        {
          defaultPlace: preferences.defaultPlace,
          experience: preferences.experience,
          maxDriveMinutes: preferences.maxDriveMinutes,
          requiredFacilities: preferences.requiredFacilities,
          equipment: preferences.equipment,
          capturePreference: preferences.capturePreference,
        },
        mapLayerKindForOverlay(analysisOverlay),
        activeContext!.weatherView.cloudLayer,
        signal,
      );
    },
    enabled: pageVisible && Boolean(activeContext) && (mapLayerKindForOverlay(analysisOverlay) === "NORMAL" || Boolean(nativeViewport.bounds || nativeViewport.error)),
    staleTime: value => value?.data.layer.failureCode ? 0 : 60_000,
  });

  useEffect(() => {
    if (accountOwnerId !== currentDraftUserId()) return;
    const ids = scene.data?.data.favoriteSpotIds;
    if (ids) useAppStore.getState().replaceFavoriteIds(reconcileFavoriteSnapshot(ids));
  }, [accountOwnerId, scene.data?.data.favoriteSpotIds]);

  useEffect(() => {
    if (analysisOverlay === "OPPORTUNITY") setAnalysisOverlay("TOTAL_CLOUD");
  }, [analysisOverlay, setAnalysisOverlay]);

  useEffect(
    () => () => {
      mapPointIntent.current += 1;
      if (regionTimer.current) clearTimeout(regionTimer.current);
      if (panelCloseTimer.current) clearTimeout(panelCloseTimer.current);
    },
    [],
  );
  useEffect(() => {
    invalidateMapPointIntent(true);
  }, [nativeMap.mapId]);

  const spots = scene.data?.data.spots ?? [];
  const contributionHistory = useContributionHistory(pageVisible);
  const privateMarkers = useMemo(
    () => privateContributionMarkers(contributionHistory.data?.data.submissions ?? []),
    [contributionHistory.data?.data.submissions],
  );
  const handleCandidateChange = useCallback((candidate: ContributionCandidatePreview | null) => {
    if (!candidate) {
      candidatePreviewRef.current = null; candidateSelectionVersion.current = null; setCandidatePreview(null);
      if (bottomPresentationRef.current === "spot-editor") spotMapFocus.cancel();
      return;
    }
    if (bottomPresentationRef.current !== "spot-editor" || editorPresentation.isClosing() || !currentNativeMapRef.current.isCurrent()) return;
    candidatePreviewRef.current = candidate;
    setCandidatePreview(candidate);
    if (candidateSelectionVersion.current !== null && candidate.selectionVersion <= candidateSelectionVersion.current) return;
    invalidateMapPointIntent();
    candidateSelectionVersion.current = candidate.selectionVersion;
    const point = wgs84ToGcj02({
      lat: candidate.latitude,
      lon: candidate.longitude,
      system: "WGS84",
    });
    const center = { latitude: point.lat, longitude: point.lon };
    setViewport(spotNeighborhoodCamera(center, useAppStore.getState().viewport.zoom));
    readNativeViewportRef.current(true);
    spotMapFocus.begin(`candidate:${candidate.selectionVersion}`, center);
  }, []);
  const candidateMarker = useMemo(() => {
    if (!candidatePreview) return null;
    const point = wgs84ToGcj02({
      lat: candidatePreview.latitude,
      lon: candidatePreview.longitude,
      system: "WGS84",
    });
    return {
      id: 99_999,
      latitude: point.lat,
      longitude: point.lon,
      iconPath: mode === "DAY" ? "/assets/b-icons/spot-marker--day--draft.png" : "/assets/icons/draft-marker.png",
      width: 32,
      height: 36,
      anchor: { x: 0.5, y: 1 },
      alpha: 0.96,
      label: {
        content: candidatePreview.name,
        color: "#30343a",
        fontSize: preferences.largeText ? 20 : 10,
        bgColor: "#ffffff",
        borderColor: "#9aa1a9",
        borderWidth: 1,
        borderRadius: 10,
        padding: 5,
        anchorX: 0,
        anchorY: -40,
        textAlign: "center" as const,
      },
      ariaLabel: `${candidatePreview.name}，当前候选位置`,
    };
  }, [candidatePreview, mode, preferences.largeText]);
  const selectedFromScene =
    spots.find((spot) => spot.spotId === selectedSpotId) ?? null;
  const selected =
    selectedFromScene ??
    (selectedFallback?.spotId === selectedSpotId ? selectedFallback : null);
  const timeFrames = scene.data?.data.timeFrames ?? [];
  const cloudTimeChoices = cloudTimeFrameChoices(timeFrames);
  const projectedAt = timePreviewing
    ? timeFrames[panelPreviewFrameIndex]?.atUtc ?? timeReference?.selectedAtUtc ?? ""
    : timeReference?.selectedAtUtc ?? "";
  const projectedFrame = useMemo(
    () => mapTimeFrameAt(scene.data?.data.timeFrames ?? [], projectedAt),
    [scene.data?.data.timeFrames, projectedAt],
  );
  const projectedEvaluations = useMemo(
    () =>
      projectMapEvaluations(
        scene.data?.data.evaluations ?? {},
        projectedFrame,
      ),
    [projectedFrame, scene.data?.data.evaluations],
  );
  const groupedMarkers = useMemo(
    () => markerGroups(spots, viewport.zoom),
    [spots, viewport.zoom],
  );
  const markerList = useMemo(() => [
    ...markerItems(groupedMarkers, selectedSpotId, mode, preferences.largeText),
    ...privateContributionMarkerItems(privateMarkers, 100_000, mode, preferences.largeText),
    ...(bottomPresentation === "spot-editor" && candidateMarker ? [candidateMarker] : []),
  ], [bottomPresentation, candidateMarker, groupedMarkers, mode, preferences.largeText, privateMarkers, selectedSpotId]);
  const projectedPolygonSource = useMemo(
    () =>
      scene.data?.data.layer.kind === mapLayerKindForOverlay(analysisOverlay)
        ? projectedLayerPolygons(scene.data.data.layer, projectedFrame)
        : [],
    [projectedFrame, scene.data?.data.layer, analysisOverlay],
  );
  const layerPolygons = useMemo(
    () =>
      projectedPolygonSource.map((polygon) => ({
        points: polygon.points.map((point) => ({ ...point })),
        strokeColor: polygon.strokeColor,
        fillColor: polygon.fillColor,
        strokeWidth: polygon.strokeWidth,
        zIndex: 1,
      })),
    [projectedPolygonSource],
  );
  const layerProjectionProbe = useMemo(
    () => layerProjectionFingerprint(layerPolygons),
    [layerPolygons],
  );
  const selectedReading = selected
    ? projectedEvaluations[selected.spotId] ?? null
    : null;
  const selectedEvaluation = selectedReading && (scene.refreshError || scene.data?.dataState === "STALE_USABLE") && selectedReading.state !== "UNAVAILABLE"
    ? { ...selectedReading, state: "STALE_USABLE" as const }
    : selectedReading;
  const detailContextReady = Boolean(
    selected &&
      activeContext?.location.kind === "FORMAL_SPOT" &&
      activeContext.location.spotId === selected.spotId,
  );
  // The last confirmed clock is presentation only while its request Context restores.
  const spotTimeContext = selected && timeReference?.location.kind === "FORMAL_SPOT" &&
    timeReference.location.spotId === selected.spotId && timeReference.contextId !== retiredObservationContextId
    ? timeReference : null;
  const visibleSpotContextAttempt = !detailContextReady && selected &&
    spotContextAttempt?.spotId === selected.spotId ? spotContextAttempt : null;
  useEffect(() => {
    if (detailContextReady) setSpotContextAttempt(null);
  }, [detailContextReady]);
  const spotOverview = useResourceQuery({
    queryKey: [
      "spot-overview",
      selected?.spotId,
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
    ],
    queryFn: (signal) =>
      getSpotOverview(selected!.spotId, activeContext!.contextId, signal),
    enabled: pageVisible && bottomPresentation === "spot-panel" && detailContextReady,
    // Canonical facts may be published while the retained map is hidden.
    staleTime: 0,
  });
  const terrain = useTerrainOverlay({
    purpose: "MAP",
    center: {
      system: "GCJ02",
      latitude: viewport.center.latitude,
      longitude: viewport.center.longitude,
    },
    // No invented frame: the request remains disabled until a real logical Map
    // window is available. Its valid centre is only a disabled-hook placeholder.
    viewportBounds: mapTerrainBounds ?? { west: -180, south: -85.05112878, east: 180, north: 85.05112878 },
  }, terrainReadEnabled && Boolean(mapTerrainBounds), pageVisible && terrainEnabled);
  const [terrainNativeRetry, setTerrainNativeRetry] = useState(0);
  const mapTerrainAvailability = terrainLayerAvailability(
    terrain.data?.data.state, terrain.data?.data.failureCode, Boolean(terrain.isError || terrain.refreshError),
  );
  const mapTerrainMissing = mapTerrainAvailability === "EMPTY";
  const terrainInstallation = useMapRasterInstallation({
    id: TERRAIN_GROUND_OVERLAY_ID, label: "地形", nativeMap, visible: pageVisible, enabled: terrainEnabled,
    unavailable: terrain.data?.data.state === "UNAVAILABLE" && !terrain.data?.data.failureCode,
    identity: terrain.identity, runtimeError: mapRuntimeError, retry: terrainNativeRetry,
    src: terrain.imagePath, bounds: terrain.data?.data.imageBoundsGcj02, data: terrain.data?.data ?? null,
    opacity: terrain.data?.data.imageStyle === "RELIEF_OVERLAY" ? 1 : .62, zIndex: 0,
    reportImageFailure: terrain.reportImageFailure,
    onFailure: () => setAnnouncement("地形叠加未能显示，可在图层中重试。"),
  });
  const terrainNativeError = terrainInstallation.error;
  const mapTerrainFailed = mapTerrainAvailability === "ERROR" || Boolean(terrain.imageError || terrainNativeError || terrainViewportError);
  const terrainRequiresMapRecovery = terrainInstallation.requiresMapRecovery || Boolean(terrainViewportError);
  useEffect(() => {
    if (!pageVisible || (!terrainEnabled && !terrainNativeError) || !mapTerrainFailed) return;
    notify({ owner: "map-terrain", placement: "floating", tone: "info", title: "地形数据异常",
      body: "地形暂时无法显示，可在图层中重试。", dedupeKey: "map-terrain-failed" });
  }, [pageVisible, terrainEnabled, terrainNativeError, mapTerrainFailed, notify]);
  const presentedTerrainData = terrainInstallation.presentedData;
  const terrainDisclosure = presentedTerrainData ?? (!terrainEnabled ? terrain.data?.data ?? null : null);
  const mapTerrainLoading = pageVisible && terrainEnabled && !nativeMap.pending && !mapRuntimeError
    && (!mapTerrainBounds ? !terrainViewportError : terrain.isPending || terrain.isFetching || terrain.imagePending
      || (!mapTerrainMissing && !mapTerrainFailed && terrainInstallation.pending));
  const nightLayer = scene.data?.data.layer.kind === "LIGHT_POLLUTION" ? scene.data.data.layer : null;
  const nightRaster = nightLayer?.raster ?? null;
  const [lightNativeRetry, setLightNativeRetry] = useState(0);
  const lightImage = useRasterImage(nightRaster ? { key: `${nightRaster.publicationId}:${nightRaster.imageUrl}`,
    url: nightRaster.imageUrl, expectedBytes: nightRaster.imageBytes, expectedSha256: nightRaster.imageSha256 } : null,
  pageVisible && analysisOverlay === "LIGHT" && Boolean(nightRaster?.validPixelCount));
  const lightUnavailable = nightLayer?.state === "UNAVAILABLE" || Boolean(nightRaster && nightRaster.validPixelCount === 0);
  const lightInstallation = useMapRasterInstallation({
    id: NIGHT_LIGHT_GROUND_OVERLAY_ID, label: "光污染", nativeMap, visible: pageVisible, enabled: analysisOverlay === "LIGHT",
    unavailable: lightUnavailable && !nightLayer?.failureCode,
    identity: nightRaster?.publicationId ?? nightLayer?.datasetVersion ?? "", runtimeError: mapRuntimeError, retry: lightNativeRetry,
    src: lightImage.imagePath, bounds: nightRaster?.boundsGcj02, data: nightLayer,
    opacity: 1, zIndex: 1, reportImageFailure: lightImage.reportImageFailure,
    onFailure: () => setAnnouncement("光污染叠加未能显示，可在图层中重试。"),
  });
  const displayedLightLayer = lightInstallation.presentedData ?? (!nightRaster ? nightLayer : null);
  const lightReadFailed = Boolean(nightLayer?.failureCode || lightImage.imageError || lightInstallation.error
    || (analysisOverlay === "LIGHT" && nativeViewport.error));
  useEffect(() => {
    if (!pageVisible || (analysisOverlay !== "LIGHT" && !lightInstallation.error) || !lightReadFailed) return;
    notify({ owner: "map-light", placement: "floating", tone: "info", title: "光污染数据异常",
      body: "年度夜光叠加尚未完成，可在图层中重试或重新加载地图。", dedupeKey: "map-light-failed" });
  }, [pageVisible, analysisOverlay, lightReadFailed, lightInstallation.error, notify]);
  const spotSky = useSkyForecastQuery({
    queryKey: [
      "spot-sky",
      selected?.spotId,
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
      activeContext?.localDate,
    ],
    queryFn: (signal) =>
      getSkyReport(selected!.spotId, activeContext!.contextId, signal),
    enabled: pageVisible && bottomPresentation === "spot-panel" && detailContextReady,
    staleTime: 0,
    refetchInterval: WEATHER_ALERT_REFRESH_MS,
  });
  const spotDetail = detailContextReady && selected && spotOverview.data && spotOverview.data.data.spot.spotId === selected.spotId ? spotOverview.data.data : null;
  const spotNavigation = useSpotNavigationCommand({
    readSnapshot: () => {
      const current = useAppStore.getState();
      const resource = spotOverview.readCurrent();
      const detail = resource.data?.data.spot.spotId === current.selectedSpotId ? resource.data.data : null;
      return {
        scope: JSON.stringify([currentDraftUserId(), current.mode, current.mapResetVersion, current.selectedSpotId,
          current.observationContext?.contextId, current.observationContext?.contextFingerprint, current.observationContext?.revision]),
        version: JSON.stringify([resource.updatedAt, resource.data?.etag, resource.data?.generatedAt]),
        spot: detail?.spot ?? null,
        safety: detail?.accessAndSafety ?? null,
        available: Boolean(pageVisible && bottomPresentation === "spot-panel" && selected
          && current.selectedSpotId === selected.spotId && detailContextReady && detail
          && current.observationContext?.contextId === activeContext?.contextId
          && current.observationContext?.contextFingerprint === activeContext?.contextFingerprint
          && current.observationContext?.revision === activeContext?.revision
          && currentNavigationResource(resource)),
      };
    },
    confirmHandoff: () => navigationHandoff.confirm("微信导航界面可能较亮，无法跟随红光模式。"),
    feedback: { owner: "map", placement: "floating", dedupeKeyPrefix: "map-navigation:" },
  });
  const spotOverviewProjection = projectSpotPanelResource(detailContextReady, {
    isPending: spotOverview.isPending,
    error: spotOverview.error,
    refreshError: spotOverview.refreshError,
    dataState: spotOverview.data?.dataState,
  });
  // Loading/recovery cards before the route change the medium panel's floor.
  // Focus consumes only a freshly measured terminal layout, including a failed
  // first load. Private panels and address previews do not own these resources.
  const spotFocusContentReady = bottomPresentation === "spot-editor" || Boolean(selectedProposal) ||
    (detailContextReady ? !spotOverviewProjection.pending && !spotOverview.isFetching : Boolean(visibleSpotContextAttempt?.error));
  const spotFocusLayout = JSON.stringify([spotFocusScope, spotFocusIdentity, bottomPresentation, spotEditorPhase, panelIdentityHeight, panelLayoutVersion,
    primaryNavigation.pageHeight, mode, preferences.largeText,
    bottomPresentation === "spot-panel" && !selectedProposal ? [detailContextReady, spotFocusContentReady,
      detailContextReady ? [activeContext?.contextId, activeContext?.contextFingerprint, activeContext?.revision] : null,
      Boolean(visibleSpotContextAttempt?.pending), Boolean(visibleSpotContextAttempt?.error),
      Boolean(spotOverviewProjection.error), spotOverviewProjection.stale, spotOverview.readCurrent().updatedAt] : null]);
  const spotMapFocus = useMapSpotFocus({
    mapId: nativeMap.mapId, identity: spotFocusIdentity, scope: spotFocusScope, layout: spotFocusLayout,
    visible: pageVisible && (bottomPresentation === "spot-editor" ? spotEditorPhase !== "closing" : bottomPresentation === "spot-panel" && panelPhase === "idle"),
    presentationReady: bottomPresentation === "spot-editor" ? spotEditorPhase === "open" : panelExtent === "medium",
    contentReady: spotFocusContentReady,
    interacting: bottomPresentation === "spot-editor" ? false : panelDragging || panelSettling,
    isCurrent: nativeMap.isCurrent, getCamera: () => useAppStore.getState().viewport,
    getScope: getSpotFocusScope,
    getSelectionIdentity: () => bottomPresentationRef.current === "spot-editor" ? `candidate:${candidatePreviewRef.current?.selectionVersion ?? 0}` : selectedProposalRef.current
      ? `proposal:${currentDraftUserId()}:${selectedProposalRef.current.submissionId}`
      : `formal:${useAppStore.getState().selectedSpotId ?? ""}`,
    frame: spotFocusFrame, bounds: nativeViewport.bounds, viewportError: nativeViewport.error,
    move: (center, zoom) => setViewport({ center, ...(zoom === undefined ? {} : { zoom }) }),
    onFailure: () => notify({ owner: "map", placement: "floating", tone: "warning", title: "地图位置未能调整",
      body: bottomPresentationRef.current === "spot-editor" ? "所选地址已保留，可重新选择地址重试地图定位。" : "点位信息已保留，可重新点选该点重试地图定位。", dismissible: true, dedupeKey: "spot-map-focus-failed" }),
  });
  cancelSpotMapFocus.current = spotMapFocus.cancel;
  const spotSkyProjection = projectSpotPanelResource(detailContextReady, {
    isPending: spotSky.isPending,
    error: spotSky.error,
    refreshError: spotSky.refreshError,
    dataState: spotSky.data?.dataState,
  });
  useEffect(() => {
    if (!pageVisible || bottomPresentation !== "spot-panel" || !selected ||
        (!spotOverviewProjection.error && !spotOverviewProjection.stale)) return;
    notify({
      owner: "map",
      placement: "floating",
      tone: "info",
      title: "观星点资料数据异常",
      body: "部分地点资料暂时无法读取，可在观星点面板中重试。",
      dedupeKey: `spot-overview-failed:${selected.spotId}`,
    });
  }, [bottomPresentation, notify, pageVisible, selected, spotOverviewProjection.error, spotOverviewProjection.stale]);
  useEffect(() => {
    if (!pageVisible || bottomPresentation !== "spot-panel" || !selected ||
        (!spotSkyProjection.error && !spotSkyProjection.stale)) return;
    notify({
      owner: "map",
      placement: "floating",
      tone: "info",
      title: "云观星数据异常",
      body: "当前地点的星空资料暂时无法读取，可在观星点面板中重试。",
      dedupeKey: `spot-sky-failed:${selected.spotId}`,
    });
  }, [bottomPresentation, notify, pageVisible, selected, spotSkyProjection.error, spotSkyProjection.stale]);
  const spotSkyReport = detailContextReady && selected && activeContext && spotSky.data &&
    spotSky.data.data.context.spotId === selected.spotId &&
    spotSky.data.data.context.contextId === activeContext.contextId &&
    spotSky.data.data.context.contextFingerprint === activeContext.contextFingerprint &&
    spotSky.data.data.context.contextRevision === activeContext.revision &&
    spotSky.data.data.context.localDate === activeContext.localDate &&
    spotSky.data.data.context.timezone === activeContext.timezone
      ? spotSky.data.data
      : null;
  const pageState = bootstrapContext.isError
    ? isPermissionError(bootstrapContext.error)
      ? "PERMISSION_DENIED"
      : "ERROR"
    : !activeContext || scene.isPending
    ? "LOADING"
    : scene.isError
      ? isPermissionError(scene.error)
        ? "PERMISSION_DENIED"
        : "ERROR"
      : spots.length === 0
        ? "EMPTY"
        : scene.data?.dataState === "STALE_USABLE"
          ? "STALE"
          : scene.data?.dataState === "PARTIAL"
            ? "PARTIAL"
            : "READY";
  const mapContextFailed = Boolean(bootstrapContext.isError || bootstrapContext.refreshError ||
    bootstrapContext.data?.dataState === "STALE_USABLE");
  const mapSceneFailed = Boolean(scene.isError || scene.refreshError ||
    scene.data?.dataState === "STALE_USABLE");
  const mapDataStale = Boolean(
    (mapContextFailed && bootstrapContext.data) || (mapSceneFailed && scene.data),
  );
  const visibleLayer = layerSheetOverlay(analysisOverlay);
  const visibleLayerUnavailable = visibleLayer === "LIGHT" ? lightUnavailable && !lightReadFailed : Boolean(
    scene.data?.data.layer.kind === mapLayerKindForOverlay(analysisOverlay) &&
      scene.data.data.layer.state === "UNAVAILABLE",
  );
  const lightLayerState = lightLayerContentState({
    pending: scene.isPending || !nightLayer || lightImage.imagePending || lightInstallation.pending,
    failed: Boolean(scene.isError || scene.refreshError || scene.data?.dataState === "STALE_USABLE" || lightReadFailed),
    hasData: Boolean(nightLayer || lightInstallation.presentedData),
    unavailable: visibleLayerUnavailable,
  });
  const displayedLayer = visibleLayer === "LIGHT" ? displayedLightLayer : scene.data?.data.layer;
  const hasGeographicLayer = layerPolygons.length > 0 || (analysisOverlay === "LIGHT" && Boolean(lightInstallation.presentedData?.raster));
  const layerSheetOwnsSceneFailure = layerSheetOwnsSceneRecovery({
    open: bottomPresentation === "layer-sheet", overlay: visibleLayer,
    contextFailed: mapContextFailed, sceneFailed: mapSceneFailed,
    lightState: lightLayerState, cloudTimeChoiceCount: cloudTimeChoices.length,
  });
  // Availability is transient; real failures keep recovery with their owner.
  const ordinaryMapNotice = !pageVisible || mapRuntimeError || mapContextFailed || mapSceneFailed || scene.isPending || scene.isFetching
    || (analysisOverlay === "LIGHT" && (lightReadFailed || lightLayerState === "LOADING"))
    ? null
    : bottomPresentation === "layer-sheet" && visibleLayerUnavailable
      ? visibleLayer === "LIGHT" ? "当前范围暂无光污染数据" : "当前范围暂无云量预报"
      : bottomPresentation === "none" && pageState === "EMPTY" && !hasGeographicLayer
        ? "当前区域暂无观星点" : null;
  useEffect(() => {
    if (!ordinaryMapNotice) return;
    notify({ owner: "map", placement: "floating", tone: "info", title: ordinaryMapNotice,
      body: "", dedupeKey: "map-availability" });
    return () => {
      const state = useAppStore.getState();
      for (const item of state.notifications) {
        if (item.owner === "map" && item.dedupeKey === "map-availability") state.dismissNotification(item.id);
      }
    };
  }, [ordinaryMapNotice, notify]);
  useEffect(() => {
    if (pageVisible && layerSheetOwnsSceneFailure) {
      const state = useAppStore.getState();
      for (const item of state.notifications) {
        if (item.owner === "map" && item.dedupeKey === "map-scene-failed") state.dismissNotification(item.id);
      }
    }
    if (!pageVisible || pageState === "PERMISSION_DENIED" || (!mapContextFailed && (!mapSceneFailed || layerSheetOwnsSceneFailure))) return;
    notify({
      owner: "map",
      placement: "floating",
      tone: "info",
      title: "地图数据异常",
      body: mapContextFailed
        ? "地图上下文暂时无法更新，可在页面中重试。"
        : "观星点数据暂时无法更新，可在页面中重试。",
      dedupeKey: mapContextFailed ? "map-context-failed" : "map-scene-failed",
    });
  }, [mapContextFailed, mapSceneFailed, layerSheetOwnsSceneFailure, notify, pageState, pageVisible]);
  useEffect(() => {
    if (!pageVisible || !mapRuntimeError) return;
    notify({ owner: "map", placement: "floating", tone: "info", title: "地图显示异常",
      body: "地图暂时无法显示，可继续搜索观星点或重试。", dedupeKey: "map-runtime-failed" });
  }, [mapRuntimeError, notify, pageVisible]);
  const contextTimeLabel = timeReference
    ? formatContextTime(timeReference.selectedAtUtc, timeReference.timezone)
    : bootstrapContext.isError ? "解析失败" : "正在解析";
  const mapDateOptions = useMemo(
    () => observationDateOptions(new Date(), timeReference?.timezone ?? currentTimezoneHint()),
    [timeReference?.timezone],
  );
  const selectedMapCivilDate = timeReference
    ? civilDateForInstant(timeReference.selectedAtUtc, timeReference.timezone)
    : localDateForNow();
  const mapTodayCivilDate = mapDateOptions[7] ?? selectedMapCivilDate;
  const presentedMapCivilDate = timeReference
    ? civilDateForInstant(projectedAt, timeReference.timezone)
    : selectedMapCivilDate;
  // Both date consumers belong to the current page/presentation and confirmed
  // Context. A replacement cannot render a previous owner's open calendar.
  const calendarScope = JSON.stringify([accountOwnerId, mapResetVersion, bottomPresentation,
    panelGeometryIdentity, timeReference?.contextId, timeReference?.revision,
    timeReference?.contextFingerprint, retiredObservationContextId]);
  const setDatePickerOpen = (open: boolean) => setCalendarOwner(open ? calendarScope : null);
  const datePickerVisible = pageVisible && calendarOwner === calendarScope &&
    ((bottomPresentation === "layer-sheet" && visibleLayer === "TOTAL_CLOUD") ||
      (bottomPresentation === "spot-panel" && !selectedProposal && Boolean(spotTimeContext)));
  const calendarLayoutIdentity = datePickerVisible
    ? JSON.stringify([calendarScope, panelLayoutVersion, mapDateOptions]) : null;
  useEffect(() => {
    if (!calendarLayoutIdentity) { setCalendarBounds(null); return; }
    let disposed = false;
    Taro.nextTick(() => {
      if (disposed) return;
      try {
        Taro.createSelectorQuery().select(".observation-calendar__sheet").boundingClientRect().exec(results => {
          const top = (results?.[0] as { top?: number } | null)?.top;
          if (!disposed && typeof top === "number" && Number.isFinite(top) && top >= 0)
            setCalendarBounds({ identity: calendarLayoutIdentity, top });
        });
      } catch {
        // Unmeasured space has no floating hit area. Notices stay queued and
        // their original inline recovery remains available after closing.
      }
    });
    return () => { disposed = true; };
  }, [calendarLayoutIdentity]);
  const visibleTemporalFailure = temporalFailure && activeContext &&
    temporalFailure.contextId === activeContext.contextId &&
    temporalFailure.revision === activeContext.revision &&
    temporalFailure.contextFingerprint === activeContext.contextFingerprint &&
    temporalFailure.selectedSpotId === selectedSpotId &&
    temporalFailure.requestGeneration === detailRequestGeneration.current &&
    temporalFailure.mapResetVersion === mapResetVersion &&
    (temporalFailure.kind === "date"
      ? mapDateOptions.includes(temporalFailure.target)
      : timeFrames.some(frame => frame.atUtc === temporalFailure.target))
    ? temporalFailure : null;


  const leaveSelectedLocationForMapPoint = () => {
    extentBeforeLayer.current = null;
    if (bottomPresentationRef.current === "spot-panel") {
      closeSpotPanel();
      return;
    }
    detailRequestGeneration.current += 1;
    privateTransitionGeneration.current += 1;
    selectSpot(null);
    setSelectedFallback(null);
    setSelectedProposal(null);
  };

  const resolveMapPoint = async (
    center: { latitude: number; longitude: number },
    source: "MAP_VIEWPORT" | "USER_LOCATION",
    displayName?: string,
    intent = invalidateMapPointIntent(),
  ) => {
    const resetVersion = useAppStore.getState().mapResetVersion;
    const owner = currentDraftUserId();
    const selection = useAppStore.getState().selectedSpotId;
    const isCurrent = () => intent === mapPointIntent.current && nativeMap.isCurrent() &&
      useAppStore.getState().mapResetVersion === resetVersion && currentDraftUserId() === owner &&
      useAppStore.getState().selectedSpotId === selection;
    if (!isCurrent()) return null;
    const point = gcj02ToWgs84({
      lat: center.latitude,
      lon: center.longitude,
      system: "GCJ-02",
    });
    const response = await resolveObservationContext({
      location: {
        kind: "MAP_POINT",
        displayName:
          displayName ??
          (source === "USER_LOCATION" ? "本次授权位置" : "当前地图中心"),
        wgs84: {
          system: "WGS84",
          latitude: point.lat,
          longitude: point.lon,
        },
        source,
        timezoneHint: currentTimezoneHint(),
      },
      localDate: timeReference?.localDate ?? localDateForNow(),
      selectedAt: timeReference?.selectedAtUtc ?? null,
      eventInstanceId: timeReference?.eventInstanceId ?? null,
      targetProfile: timeReference?.targetProfile ?? "DAILY",
    }).catch((error: unknown) => {
      if (!isCurrent() || isMiniappRequestCancelled(error)) return null;
      throw error;
    });
    if (!response || !isCurrent()) return null;
    setObservationContext(response.data);
    dismissMapRegionFailure();
    leaveSelectedLocationForMapPoint();
    return response.data;
  };

  const confirmEditorLeave = async () => {
    if (bottomPresentationRef.current !== "spot-editor") return true;
    if (editorPresentation.isClosing()) return false;
    if (editorLeaveRequest.current) return editorLeaveRequest.current;
    const guard = editorLeaveGuard.current;
    if (!guard) return false;
    const scope = editorPresentationScope.current;
    const owner = currentDraftUserId(), resetVersion = useAppStore.getState().mapResetVersion;
    const request = Promise.resolve().then(guard).then(accepted => accepted && scope !== null &&
      scope === editorPresentationScope.current && bottomPresentationRef.current === "spot-editor" &&
      owner === currentDraftUserId() && resetVersion === useAppStore.getState().mapResetVersion &&
      !editorPresentation.isClosing()).catch(() => false);
    editorLeaveRequest.current = request;
    try {
      return await request;
    } finally {
      if (editorLeaveRequest.current === request) editorLeaveRequest.current = null;
    }
  };

  const finishSpotEditorPresentation = (afterExit?: () => void) => {
    if (bottomPresentationRef.current !== "spot-editor") {afterExit?.(); return;}
    spotMapFocus.cancel();
    editorPresentation.close(() => {
      editorLeaveGuard.current = null;
      editorHandoffBack.current = null;
      candidatePreviewRef.current = null; candidateSelectionVersion.current = null;
      setCandidatePreview(null);
      setBottomPresentation("none");
      afterExit?.();
    }, getReducedMotion());
  };
  const closeSpotEditor = () => finishSpotEditorPresentation();
  const requestSpotEditorClose = async () => {if (await confirmEditorLeave()) closeSpotEditor();};

  const resolveSpotContext = async (spot: SpotSummary) => {
    const intent = invalidateMapPointIntent();
    useAppStore.getState().retireObservationContextEdit();
    const requestGeneration = ++detailRequestGeneration.current;
    const current = useAppStore.getState().observationContext;
    const retired = current?.contextId === useAppStore.getState().retiredObservationContextId;
    const isCurrentRequest = () =>
      intent === mapPointIntent.current &&
      requestGeneration === detailRequestGeneration.current &&
      useAppStore.getState().selectedSpotId === spot.spotId &&
      useAppStore.getState().mapResetVersion === mapResetVersion &&
      sameContextVersion(current, useAppStore.getState().observationContext);
    if (
      current?.location.kind === "FORMAL_SPOT" &&
      !retired &&
      current.location.spotId === spot.spotId
    ) {
      setSpotContextAttempt(null);
      dismissMapRegionFailure();
      setAnnouncement(`已选择${spot.name}；正在加载同一观测时刻的点位信息。`);
      return;
    }
    setSpotContextAttempt({ spotId: spot.spotId, pending: true, error: null });
    try {
      // Revalidate a used route reference; its ID may be gone after restart.
      // A different place without an origin supplies only the confirmed clock.
      const replacement = current && (retired ||
        current.location.kind === "MAP_POINT" || current.routeOrigin) ? await (retired
        ? replaceRetiredObservationContext(current) : restoreObservationContext(current)) : null;
      if (!isCurrentRequest()) return;
      const reference = replacement?.data ?? current;
      const sameOriginalSpot = current?.location.kind === "FORMAL_SPOT" && current.location.spotId === spot.spotId;
      const response = replacement && ((reference?.location.kind === "FORMAL_SPOT" && reference.location.spotId === spot.spotId) ||
        (sameOriginalSpot && reference?.location.kind === "MAP_POINT")) ? replacement : await resolveObservationContext({
        location: { kind: "FORMAL_SPOT", spotId: spot.spotId },
        routeOriginContextId:
          reference?.location.kind === "MAP_POINT"
            ? reference.contextId
            : reference?.routeOrigin?.contextId ?? null,
        localDate: current?.localDate ?? localDateForNow(spot.timezone),
        selectedAt: current?.selectedAtUtc ?? null,
        eventInstanceId: current?.eventInstanceId ?? null,
        targetProfile: current?.targetProfile ?? "DAILY",
      });
      if (!isCurrentRequest()) return;
      setObservationContext(response.data);
      if (sameOriginalSpot && response.data.location.kind === "MAP_POINT") {
        selectSpot(null);setSelectedFallback(null);setBottomPresentation("none");
        notify({ owner: "map", placement: "floating", tone: "warning", title: "原观星点已失效",
          body: "已回到原地图位置。", dismissible: true, dedupeKey: `map-removed-location:${current!.contextId}` });
        return;
      }
      dismissMapRegionFailure();
      setAnnouncement(`已选择${spot.name}；正在加载同一观测时刻的点位信息。`);
    } catch (error) {
      if (!isCurrentRequest()) return;
      setSpotContextAttempt({ spotId: spot.spotId, pending: false,
        error: isMiniappRequestCancelled(error) ? new Error("观测条件更新已中断，请重试。") : error });
    }
  };

  const openDetail = async (spot: SpotSummary) => {
    privateTransitionGeneration.current += 1;
    lastHandledSelectedId.current = spot.spotId;
    lastHandledSpotOpenVersion.current = useAppStore.getState().spotOpenRequestVersion;
    if (panelCloseTimer.current) clearTimeout(panelCloseTimer.current);
    extentBeforeLayer.current = null;
    setPanelPhase("idle");
    setPanelExtent("medium");
    setPanelDragOffset(0);
    setSelectedFallback(spot);
    setSelectedProposal(null);
    selectSpot(spot.spotId);
    setBottomPresentation("spot-panel");
    setViewport(spotNeighborhoodCamera(spot.gcj02, useAppStore.getState().viewport.zoom));
    spotMapFocus.begin(`formal:${spot.spotId}`, spot.gcj02);
    markerTapAt.current = Date.now();
    await resolveSpotContext(spot);
  };

  const onMarkerTap = async (
    event: BaseEventOrig<MapProps.onMarkerTapEventDetail>,
  ) => {
    if (editorPresentation.isClosing()) return;
    const markerId = Number(event.detail.markerId);
    if (Number.isInteger(markerId) && markerId >= 100_000) {
      const entry = privateMarkers[markerId - 100_000];
      if (!entry) return;
      if (!(await confirmEditorLeave()) || !nativeMap.isCurrent()) return;
      invalidateMapPointIntent();
      privateTransitionGeneration.current += 1;
      finishSpotEditorPresentation(() => {
        if (!nativeMap.isCurrent()) return;
        markerTapAt.current = Date.now();
        selectSpot(null);
        setSelectedFallback(null);
        setSelectedProposal(entry.submission);
        setPanelExtent("medium");
        setPanelPhase("idle");
        setViewport(spotNeighborhoodCamera({ latitude: entry.latitude, longitude: entry.longitude }, useAppStore.getState().viewport.zoom));
        setBottomPresentation("spot-panel");
        spotMapFocus.begin(`proposal:${currentDraftUserId()}:${entry.submission.submissionId}`, entry);
        setAnnouncement(`已选择${entry.submission.candidateProfile?.fields.name ?? entry.submission.candidateLocation?.displayName ?? (entry.state === "DRAFT" ? "草稿观星点" : "审核中观星点")}。`);
      });
      return;
    }
    const group = Number.isInteger(markerId)
      ? groupedMarkers.find((item) => item.id === markerId)
      : undefined;
    if (!group) return;
    if (!(await confirmEditorLeave()) || !nativeMap.isCurrent()) return;
    invalidateMapPointIntent();
    privateTransitionGeneration.current += 1;
    finishSpotEditorPresentation(() => {
      if (!nativeMap.isCurrent()) return;
      markerTapAt.current = Date.now();
      if (group.spots.length > 1) {
        setViewport({
          center: { latitude: group.latitude, longitude: group.longitude },
          zoom: Math.max(9, viewport.zoom + 2),
        });
        setAnnouncement("已放大 " + String(group.spots.length) + " 个正式观星点的聚合区域。");
        return;
      }
      void openDetail(group.spots[0]!);
    });
  };

  const openLayerSheet = () => {
    privateTransitionGeneration.current += 1;
    if (panelCloseTimer.current) {
      clearTimeout(panelCloseTimer.current);
      panelCloseTimer.current = null;
      setPanelPhase("idle");
      setPanelDragOffset(0);
    }
    if (bottomPresentation === "layer-sheet") {
      const previous = extentBeforeLayer.current;
      extentBeforeLayer.current = null;
      if (
        previous &&
        previous.selectedSpotId === useAppStore.getState().selectedSpotId
      ) {
        setPanelExtent(previous.extent);
        setBottomPresentation("spot-panel");
      } else {
        setBottomPresentation("none");
      }
      return;
    }
    extentBeforeLayer.current =
      bottomPresentation === "spot-panel"
        ? { extent: panelExtent, selectedSpotId }
        : null;
    if (analysisOverlay === "NONE" || analysisOverlay === "OPPORTUNITY") {
      setAnalysisOverlay("TOTAL_CLOUD");
    }
    setBottomPresentation("layer-sheet");
  };

  const closeLayerSheet = () => {
    const previous = extentBeforeLayer.current;
    extentBeforeLayer.current = null;
    if (
      previous &&
      previous.selectedSpotId === useAppStore.getState().selectedSpotId
    ) {
      setPanelExtent(previous.extent);
      setBottomPresentation("spot-panel");
    } else {
      setBottomPresentation("none");
    }
  };

  const closeSpotPanel = () => {
    privateTransitionGeneration.current += 1;
    if (panelCloseTimer.current) clearTimeout(panelCloseTimer.current);
    setPanelPhase("closing");
    panelCloseTimer.current = setTimeout(() => {
      detailRequestGeneration.current += 1;
      panelCloseTimer.current = null;
      setBottomPresentation("none");
      setPanelPhase("idle");
      setPanelDragOffset(0);
      selectSpot(null);
      setSelectedFallback(null);
      setSelectedProposal(null);
    }, 220);
  };

  const cancelSpotLoading = () => {
    invalidateMapPointIntent();
    detailRequestGeneration.current += 1;
    setSpotContextAttempt(null);
    closeSpotPanel();
  };

  const onMapTap = () => {
    if (Date.now() - markerTapAt.current < 120) return;
    if (bottomPresentation === "layer-sheet") {
      closeLayerSheet();
      return;
    }
    if (bottomPresentation === "spot-panel") closeSpotPanel();
  };

  useEffect(() => {
    panelSnapCache.current = null;
    if (bottomPresentation !== "spot-panel" || !pageVisible || panelPhase !== "idle") return;
    let cancelled = false;
    // The first move must not wait for native selector measurements.
    // Cache only snap rulers; an interrupted spring still measures its live height.
    Taro.nextTick(() => {
      if (cancelled) return;
      const query = Taro.createSelectorQuery();
      for (const selector of [".spot-panel", ".spot-panel__snap-small", ".spot-panel__snap-medium", ".spot-panel__snap-large"]) query.select(selector).boundingClientRect();
      for (const selector of [".spot-panel__handle-band--document", ".spot-panel__identity", ".spot-panel__action-lane"]) query.select(selector).boundingClientRect();
      if (!selectedProposal) query.select(".spot-panel__block--route").boundingClientRect();
      query.select(".native-map").boundingClientRect();
      query.exec(rows => {
        if (cancelled) return;
        const minimumHeight = panelIdentityMinimumHeight(rows.slice(4, -1));
        if (minimumHeight === null) return;
        if (minimumHeight !== panelIdentityHeight) {
          // Re-read rulers after the shared CSS floor has rendered. Never cache
          // anchors from the previous identity layout, including async detail.
          invalidatePanelGeometry();
          setPanelIdentityLayout({ identity: panelGeometryIdentity, height: minimumHeight });
          return;
        }
        const geometry = readPanelSnapGeometry(rows.slice(0, 4));
        const viewport = panelViewportSize();
        if (geometry && viewport) panelSnapCache.current = { identity: panelGeometryIdentity, ...viewport, geometry };
        const map = rows[rows.length - 1], panel = rows[0];
        if (geometry && map && panel && [map.top, map.height, panel.top, panel.height].every(Number.isFinite)) {
          setSpotFocusFrame({ version: spotMapFocus.version, layout: spotFocusLayout,
            top: map.top, height: map.height, visibleBottom: Math.min(map.top + map.height, panel.top + panel.height - geometry.medium) });
        }
      });
    });
    return () => { cancelled = true; panelSnapCache.current = null; };
  }, [bottomPresentation, panelGeometryIdentity, panelIdentityHeight, panelLayoutVersion, spotDetail, spotOverviewProjection.pending, spotOverviewProjection.error, spotOverviewProjection.stale, visibleSpotContextAttempt, selectedProposal, pageVisible, panelPhase, mode, preferences.largeText, spotMapFocus.version, spotFocusLayout]);

  useEffect(() => {
    if (bottomPresentation !== "spot-editor" || !pageVisible || spotEditorPhase !== "open") return;
    let cancelled = false;
    Taro.nextTick(() => {
      if (cancelled) return;
      const query = Taro.createSelectorQuery();
      for (const selector of [".native-map", ".map-spot-editor-focus-ruler"]) query.select(selector).boundingClientRect();
      query.exec(rows => {
        if (cancelled) return;
        const [map, ruler] = rows;
        if (!map || !ruler || ![map.top, map.height, ruler.top].every(Number.isFinite) || map.height <= 0 || ruler.top <= map.top) return;
        setSpotFocusFrame({ version: spotMapFocus.version, layout: spotFocusLayout, top: map.top, height: map.height,
          visibleBottom: Math.min(map.top + map.height, ruler.top) });
      });
    });
    return () => { cancelled = true; };
  }, [bottomPresentation, pageVisible, spotEditorPhase, spotMapFocus.version, spotFocusLayout]);

  const onHandleTouchCancel = () => {
    stopPanelSpring();
    panelDrag.current = null;
    setPanelDragOffset(0);
    setPanelDragging(false);
  };
  const invalidatePanelGeometry = () => {
    onHandleTouchCancel();
    panelSnapCache.current = null;
  };

  useEffect(() => {
    panelDrag.current = null;
    setPanelDragOffset(0);
    setPanelDragging(false);
  }, [bottomPresentation, panelGeometryIdentity, panelExtent]);

  useEffect(() => {
    stopPanelSpring();
  }, [bottomPresentation, panelGeometryIdentity]);
  useEffect(() => {
    if (springTarget.current && springTarget.current !== panelExtent) stopPanelSpring();
  }, [panelExtent]);
  useEffect(() => {
    if (reducedMotion) stopPanelSpring();
  }, [reducedMotion]);

  const onHandleTouchStart = (event: unknown) => {
    spotMapFocus.cancel();
    if (bottomPresentation !== "spot-panel") return;
    if (!event || typeof event !== "object") return;
    const value = event as {
      touches?: readonly { clientX?: number; pageX?: number; clientY?: number; pageY?: number; identifier?: number }[];
      changedTouches?: readonly { clientX?: number; pageX?: number; clientY?: number; pageY?: number; identifier?: number }[];
    };
    if (value.touches && value.touches.length !== 1) { onHandleTouchCancel(); return; }
    const touch = value.touches?.[0] ?? value.changedTouches?.[0];
    const startY = touch?.clientY ?? touch?.pageY;
    if (typeof startY !== "number" || !Number.isFinite(startY)) return;
    const previousDrag = panelDrag.current;
    springRequest.current += 1;
    const startX = touch?.clientX ?? touch?.pageX;
    const drag = { startY, startX: typeof startX === "number" && Number.isFinite(startX) ? startX : undefined, identifier: touch?.identifier, extent: panelExtent, samples: [{ y: startY, at: Date.now() }], releasedAt: 0, moved: false, offset: 0, pointerOffset: 0, rawStartHeight: 0, geometry: null as PanelSnapGeometry | null, released: false };
    panelDrag.current = drag;
    // Reserve the native document for this handle gesture before geometry
    // arrives; its existing release/cancel owner restores body scrolling.
    setPanelDragging(true);
    const viewport = panelViewportSize();
    const cached = panelSnapCache.current;
    // A pending release still owns a drawn frame different from the cached
    // resting anchor; let the native measurement path transfer that frame.
    if (!previousDrag && cached && viewport && cached.identity === panelGeometryIdentity && cached.width === viewport.width && cached.height === viewport.height && !panelSettling && !springTarget.current) {
      drag.geometry = { ...cached.geometry, startHeight: cached.geometry[panelExtent] };
      drag.rawStartHeight = drag.geometry.startHeight;
      stopPanelSpring();
      setPanelDragging(true);
      return;
    }
    // An interrupted release may still own the visible drag frame. Keep it
    // until native geometry is read, then hand that exact frame to this drag.
    const query = Taro.createSelectorQuery();
    for (const selector of [".spot-panel", ".spot-panel__snap-small", ".spot-panel__snap-medium", ".spot-panel__snap-large"]) query.select(selector).boundingClientRect();
    query.exec(rows => {
      if (panelDrag.current !== drag) return;
      drag.geometry = readPanelSnapGeometry(rows);
      stopPanelSpring();
      if (!drag.geometry) { onHandleTouchCancel(); return; }
      drag.rawStartHeight = panelDragOriginHeight(drag.geometry.startHeight, drag.geometry.small, drag.geometry.large);
      const measuredViewport = panelViewportSize();
      if (measuredViewport) panelSnapCache.current = { identity: panelGeometryIdentity, ...measuredViewport, geometry: drag.geometry };
      if (drag.released) {
        // Pointer moves while measurement was pending were never drawn.
        // Preserve the measured live frame for the release, including a
        // below-small spring interrupted before its geometry arrived.
        drag.offset = drag.geometry[drag.extent] - Math.min(drag.geometry.large, drag.geometry.startHeight);
        onHandleTouchEnd();
        return;
      }
      const visualHeight = panelDragHeight(
        drag.rawStartHeight - drag.pointerOffset,
        drag.geometry.small,
        drag.geometry.large,
      );
      drag.offset = drag.geometry[drag.extent] - visualHeight;
      setPanelDragOffset(drag.offset);
      setPanelDragging(true);
    });
  };

  const onHandleTouchMove = (event: unknown) => {
    const drag = panelDrag.current;
    if (!drag || drag.released || !event || typeof event !== "object") return;
    const value = event as {
      touches?: readonly { clientX?: number; pageX?: number; clientY?: number; pageY?: number; identifier?: number }[];
      changedTouches?: readonly { clientX?: number; pageX?: number; clientY?: number; pageY?: number; identifier?: number }[];
    };
    if (value.touches && value.touches.length !== 1) { onHandleTouchCancel(); return; }
    const touch = value.touches?.[0] ?? value.changedTouches?.[0];
    if (drag.identifier !== undefined && touch?.identifier !== drag.identifier) { onHandleTouchCancel(); return; }
    const y = touch?.clientY ?? touch?.pageY;
    if (typeof y !== "number" || !Number.isFinite(y)) return;
    const now = Date.now();
    drag.samples = [...drag.samples.filter(sample => now - sample.at <= 100), { y, at: now }].slice(-12);
    const offset = y - drag.startY;
    const x = touch?.clientX ?? touch?.pageX;
    if (!drag.moved && drag.startX !== undefined && typeof x === "number" && Number.isFinite(x)) {
      const horizontal = Math.abs(x - drag.startX);
      if (horizontal >= 8 && horizontal >= Math.abs(offset)) { onHandleTouchCancel(); return; }
    }
    if (!drag.moved && Math.abs(offset) < 8) return;
    if (!drag.moved) { drag.moved = true; setPanelDragging(true); }
    drag.pointerOffset = offset;
    if (drag.geometry) {
      const rawHeight = drag.rawStartHeight - offset;
      const visualHeight = panelDragHeight(rawHeight, drag.geometry.small, drag.geometry.large);
      drag.offset = drag.geometry[drag.extent] - visualHeight;
      setPanelDragOffset(drag.offset);
    }
  };

  const onHandleTouchEnd = (event?: unknown) => {
    const drag = panelDrag.current;
    if (!drag) return;
    if (!drag.released) drag.releasedAt = Date.now();
    if (!drag.released && event && typeof event === "object") {
      const value = event as { changedTouches?: readonly { clientX?: number; pageX?: number; clientY?: number; pageY?: number; identifier?: number }[] };
      const touch = drag.identifier === undefined
        ? value.changedTouches?.[0]
        : value.changedTouches?.find(item => item.identifier === drag.identifier);
      if (value.changedTouches && !touch) return;
      const y = touch?.clientY ?? touch?.pageY;
      if (typeof y === "number" && Number.isFinite(y)) {
        const x = touch?.clientX ?? touch?.pageX;
        if (!drag.moved && drag.startX !== undefined && typeof x === "number" && Number.isFinite(x)) {
          const horizontal = Math.abs(x - drag.startX);
          if (horizontal >= 8 && horizontal >= Math.abs(y - drag.startY)) { onHandleTouchCancel(); return; }
        }
        const lastRendered = drag.samples.at(-1);
        // A release event can report a default (0, 0) or a point that was
        // never drawn. It may inform velocity only if it is continuous with
        // the last move; the spring always starts at the rendered height.
        if (!lastRendered || Math.abs(y - lastRendered.y) <= Math.max(48, (drag.releasedAt - lastRendered.at) * 3)) {
          drag.samples = [...drag.samples, { y, at: drag.releasedAt }].slice(-12);
          drag.pointerOffset = y - drag.startY;
          if (Math.abs(drag.pointerOffset) >= 8) drag.moved = true;
        }
      }
    }
    drag.released = true;
    if (!drag.geometry) return;
    if (!drag.moved || Math.abs(drag.pointerOffset) < 8) {
      panelDrag.current = null;
      setPanelDragOffset(0);
      setPanelDragging(false);
      const from = drag.geometry[drag.extent] - drag.offset;
      if (Math.abs(from - drag.geometry[drag.extent]) >= 0.5)
        animatePanelExtent(drag.extent, drag.geometry, from);
      return;
    }
    const geometry = drag.geometry;
    const velocity = panelReleaseVelocity(drag.samples, drag.releasedAt);
    const request = ++springRequest.current;
    // Keep the dragged frame in place while checking native geometry; a late
    // selector result must not restart the spring above the visible top stop.
    Taro.createSelectorQuery().select(".spot-panel").boundingClientRect().exec(rows => {
      if (springRequest.current !== request || panelDrag.current !== drag) return;
      const measured = rows?.[0]?.height;
      const from = panelReleaseStartHeight(geometry, geometry[drag.extent] - drag.offset, measured);
      const target = releasePanelExtent(geometry, from, drag.extent, velocity);
      panelDrag.current = null;
      setPanelDragOffset(0);
      setPanelDragging(false);
      animatePanelExtent(target, geometry, from,
        -velocity * elasticVelocityFactor(panelDragOriginHeight(from, geometry.small, geometry.large), geometry.small, geometry.large));
    });
  };

  const animatePanelExtent = (target: SpotPanelExtent, geometry: PanelSnapGeometry, from: number, velocity = 0) => {
    const frames = panelSpringFrames({ from, to: geometry[target], velocity,
      min: geometry.small, max: geometry.large,
      reducedMotion: getReducedMotion() });
    const host: PanelAnimationHost = {
      reportsStart: true,
      animate: (_selector, keyframes, duration, _done, started) => {
        const sequence = ++panelCssSequence.current;
        const style = panelSpringStyle(keyframes, duration, sequence, { geometry, hasMedia: panelHasMedia });
        setPanelCssMotion({ style, duration, sequence, started, chrome: panelChromeTimeline(style, duration) });
      },
      clearAnimation: (_selector, complete) => { setPanelCssMotion(null); complete(); },
    };
    if (frames.length > 1) {
      springTarget.current = target;
      setPanelSettling(true);
      springRequest.current += 1;
      // Install the first CSS height in the same render as the new extent.
      // Waiting for nextTick exposes the target height for one frame first.
      panelSpring.current.start(host, frames, () => { springTarget.current = null; setPanelSettling(false); });
    }
    setPanelExtent(target);
  };

  const onPanelExtent = (target: SpotPanelExtent) => {
    const request = ++springRequest.current;
    if (target === panelExtent && !panelSettling) return;
    const query = Taro.createSelectorQuery();
    for (const selector of [".spot-panel", ".spot-panel__snap-small", ".spot-panel__snap-medium", ".spot-panel__snap-large"]) query.select(selector).boundingClientRect();
    query.exec(rows => {
      if (springRequest.current !== request) return;
      const geometry = readPanelSnapGeometry(rows);
      stopPanelSpring();
      panelDrag.current = null;
      setPanelDragging(false);
      setPanelDragOffset(0);
      if (!geometry) { setPanelExtent(target); return; }
      animatePanelExtent(target, geometry, geometry.startHeight);
    });
  };

  const onRegionChange = (
    event: BaseEventOrig<MapProps.onRegionEventDetail>,
  ) => {
    if (userMapRegionStarted(event)) spotMapFocus.cancel();
    const region = userMapRegionEnd(event);
    if (!region) { if (mapRegionEnded(event)) readTerrainViewport(true); return; }
    const intent = invalidateMapPointIntent();
    const resetVersion = useAppStore.getState().mapResetVersion;
    const selection = useAppStore.getState().selectedSpotId;
    const owner = currentDraftUserId();
    const isCurrentRegion = () => intent === mapPointIntent.current && nativeMap.isCurrent() &&
      useAppStore.getState().mapResetVersion === resetVersion &&
      useAppStore.getState().selectedSpotId === selection && currentDraftUserId() === owner;
    // The native gesture has already settled. Publish its camera now so a
    // selection during the conditions debounce keeps that actual finer view.
    setViewport({
      center: region.center,
      ...(region.zoom === undefined ? {} : { zoom: region.zoom }),
      loadedViewport: "viewport:" + String(Date.now()),
    });
    regionTimer.current = setTimeout(() => {
      if (!isCurrentRegion()) return;
      void resolveMapPoint(region.center, "MAP_VIEWPORT", undefined, intent).catch(
        (error) => {
          if (!isCurrentRegion()) return;
          failedMapRegion.current = { center: region.center, intent, owner, resetVersion };
          notify({
            owner: "map",
            placement: "inline",
            tone: "warning",
            title: "地图条件未更新",
            body:
              errorMessage(error) +
              "。当前显示的是上次观测条件，请刷新后再判断。",
            dismissible: true,
            action: { label: "重试此位置" },
            dedupeKey: "map-context-region-failed",
          });
        },
      );
    }, 250);
  };

  const cancelLocation = () => {
    const request = locationRequestBusy.current;
    locationRequestBusy.current = null;
    setLocationCandidate(null);
    setLocationBusy(false);
    if (!request) return;
    if (mapPointIntent.current === request.intent) invalidateMapPointIntent();
    if (useAppStore.getState().locationState === "REQUESTING") setLocationState(request.previous);
  };
  useEffect(() => () => { locationRequestBusy.current = null; }, []);
  const locationCandidateCurrent = (candidate: NonNullable<typeof locationCandidate>) =>
    candidate.intent === mapPointIntent.current && nativeMap.isCurrent() &&
    candidate.reset === useAppStore.getState().mapResetVersion && candidate.owner === currentDraftUserId();
  const locateMap = async () => {
    if (locationRequestBusy.current) return;
    const intent = invalidateMapPointIntent();
    const request = { intent, previous: useAppStore.getState().locationState };
    locationRequestBusy.current = request;
    setLocationCandidate(null);
    const resetVersion = useAppStore.getState().mapResetVersion;
    const owner = currentDraftUserId();
    const isCurrentLocation = () => locationRequestBusy.current === request && intent === mapPointIntent.current && nativeMap.isCurrent() &&
      useAppStore.getState().mapResetVersion === resetVersion && currentDraftUserId() === owner;
    setLocationBusy(true);
    setLocationState("REQUESTING");
    for (const item of useAppStore.getState().notifications)
      if (item.owner === "map" && item.dedupeKey === "map-location-request") useAppStore.getState().dismissNotification(item.id);
    try {
      const result = await requestOneShotLocation(Taro);
      if (!isCurrentLocation()) return;
      setLocationState(result.state);
      if (result.state !== "GRANTED") {
        notify({ owner: "map", placement: "floating", tone: "warning",
          title: result.state === "DENIED" ? "定位未授权" : "暂时无法获取位置",
          body: result.state === "DENIED"
            ? "地图位置未改动；你可以查看权限说明，或继续手动搜索。"
            : "地图位置未改动；请检查系统定位服务后重试，也可继续手动搜索。",
          action: { label: "查看权限说明", route: "/pages/auth/index" },
          dismissible: true, dedupeKey: "map-location-request" });
        return;
      }
      setLocationCandidate({ center: result.center, intent, owner, reset: resetVersion });
      setAnnouncement("已取得本次位置，地图未移动。");
    } finally {
      if (locationRequestBusy.current === request) {
        if (!isCurrentLocation() && useAppStore.getState().mapResetVersion === resetVersion && currentDraftUserId() === owner &&
          useAppStore.getState().locationState === "REQUESTING") setLocationState(request.previous);
        locationRequestBusy.current = null;
        setLocationBusy(false);
      }
    }
  };
  const moveToLocation = async () => {
    const candidate = locationCandidate;
    if (!candidate || !locationCandidateCurrent(candidate)) return;
    setLocationCandidate(null);
    setViewport({ center: candidate.center, zoom: 10 });
    try {
      const context = await resolveMapPoint(candidate.center, "USER_LOCATION", undefined, candidate.intent);
      if (!context || !locationCandidateCurrent(candidate)) return;
      setAnnouncement("观测位置已更新，天气和天文以各自加载状态为准。");
    } catch (error) {
      if (!locationCandidateCurrent(candidate)) return;
      notify({ owner: "map", placement: "inline", tone: "warning", title: "位置已获取，观测条件未更新",
        body: `${errorMessage(error)}。上次条件不适用于当前位置，请重试。`,
        action: { label: "重新获取位置" }, dismissible: true, dedupeKey: "map-location-request" });
    }
  };

  const refreshMap = async () => {
    setAnnouncement("正在刷新当前区域");
    try {
      if (selected && (bootstrapReplacementBlocked || visibleSpotContextAttempt?.error)) {
        await resolveSpotContext(selected);
        return;
      }
      let failedRegion = failedMapRegion.current;
      if (failedRegion && (failedRegion.owner !== currentDraftUserId() ||
        failedRegion.resetVersion !== useAppStore.getState().mapResetVersion)) {
        dismissMapRegionFailure();
        failedRegion = null;
      }
      if (failedRegion?.intent === mapPointIntent.current) {
        const intent = invalidateMapPointIntent(true);
        const retry = resolveMapPoint(failedRegion.center, "MAP_VIEWPORT", undefined, intent);
        try {
          if (await retry) setAnnouncement("地图观测位置已恢复，正在更新当前地点的资料。");
        } catch (error) {
          if (intent === mapPointIntent.current && failedRegion.owner === currentDraftUserId() &&
            failedRegion.resetVersion === useAppStore.getState().mapResetVersion)
            failedMapRegion.current = { ...failedRegion, intent };
          throw error;
        }
        // The restored Context drives its own scene query; do not refresh the
        // previous render's scene with the old location after this await.
        return;
      }
      // Retry each failed owner; a cached context must not hide its own failure.
      // A restored context triggers the scene query with its current identity.
      const retryEpoch = navigationEpoch.current;
      const retryOwner = useAppStore.getState().accountOwnerId;
      const retryReset = useAppStore.getState().mapResetVersion;
      const current = () => navigationEpoch.current === retryEpoch &&
        useAppStore.getState().accountOwnerId === retryOwner && useAppStore.getState().mapResetVersion === retryReset;
      const refreshed = await retryObservationScene({
        context: activeContext, retryContext: mapContextFailed, retryScene: true,
        sceneFailure: scene.error ?? scene.refreshError,
        current,
        refreshContext: bootstrapContext.refetch, refreshScene: scene.refetch,
      });
      if (!current()) return;
      if (!refreshed.result) throw new Error("map_refresh_unavailable");
      setAnnouncement(refreshed.contextChanged
        ? "观测上下文已恢复，正在更新当前区域。"
        : refreshed.result.dataState === "STALE_USABLE"
        ? "当前仍显示上次结果，尚未获取到更新。"
        : "当前区域已刷新");
    } catch {
      // Query state owns the floating notification and persistent retry surface.
      setAnnouncement("刷新未完成，请重试。");
    }
  };

  const retryLightLayer = async () => {
    if (lightInstallation.requiresMapRecovery || nativeViewport.error) { nativeMap.retry(); return; }
    lightImage.retryImage();
    setLightNativeRetry(value => value + 1);
    await refreshMap();
  };

  const commitMapTime = async (frameIndex: number) => {
    const nextTime = timeFrames[frameIndex]?.atUtc;
    if (!activeContext || !nextTime || timeRequestBusy.current) return;
    const requestSelection = useAppStore.getState().selectedSpotId;
    const requestGeneration = detailRequestGeneration.current;
    const isCurrentTimeRequest = () => {
      const current = useAppStore.getState();
      return current.mapResetVersion === mapResetVersion &&
        current.selectedSpotId === requestSelection &&
        detailRequestGeneration.current === requestGeneration &&
        current.observationContext?.contextId === activeContext.contextId &&
        current.observationContext.contextId !== current.retiredObservationContextId &&
        current.observationContext.revision === activeContext.revision &&
        current.observationContext.contextFingerprint === activeContext.contextFingerprint;
    };
    if (!isCurrentTimeRequest()) return;
    setTemporalFailure(null);
    setPanelPreviewFrameIndex(frameIndex);
    setTimePreviewing(false);
    if (Date.parse(nextTime) === Date.parse(activeContext.selectedAtUtc)) return;
    const edit = useAppStore.getState().beginObservationContextEdit(activeContext);
    if (!edit) return;
    timeRequestBusy.current = true;
    setTimeSaving(true);
    try {
      const response = await updateObservationContext(activeContext, {
        selectedAt: nextTime,
      });
      if (!isCurrentTimeRequest()) return;
      setObservationContext(response.data);
      setPanelPreviewFrameIndex(
        nearestMapTimeFrameIndex(timeFrames, response.data.selectedAtUtc),
      );
      setAnnouncement(
        `观测时间已更新为${formatContextTime(
          response.data.selectedAtUtc,
          response.data.timezone,
        )}。`,
      );
    } catch (error) {
      if (!isCurrentTimeRequest() || isMiniappRequestCancelled(error)) return;
      setPanelPreviewFrameIndex(
        nearestMapTimeFrameIndex(timeFrames, activeContext.selectedAtUtc),
      );
      setTemporalFailure({
        kind: "time",
        target: nextTime,
        detail: `${errorMessage(error)}。仍使用已确认的观测时刻。`,
        contextId: activeContext.contextId,
        revision: activeContext.revision,
        contextFingerprint: activeContext.contextFingerprint,
        selectedSpotId: requestSelection,
        requestGeneration,
        mapResetVersion,
      });
    } finally {
      useAppStore.getState().finishObservationContextEdit(edit);
      timeRequestBusy.current = false;
      setTimeSaving(false);
    }
  };

  const handleMapPresentationSystemBack = async () => {
    if (skyEntry.isActive()) { skyEntry.cancel(); return; }
    if (login.open) { login.back(); return; }
    if (photoHandoff.active) {
      photoHandoff.cancel();
      return;
    }
    if (navigationHandoff.active) {
      navigationHandoff.cancel();
      return;
    }
    if (eventModalOpenRef.current) {
      eventModalRef.current?.back();
      return;
    }
    if (imageViewerBack.current) {
      imageViewerBack.current();
      return;
    }
    if (datePickerVisible) {
      if (!timeSaving && activeContext && (bottomPresentation !== "spot-panel" || detailContextReady))
        setDatePickerOpen(false);
      return;
    }
    const presentation = bottomPresentationRef.current;
    if (presentation === "spot-editor") {
      if (editorHandoffBack.current) {editorHandoffBack.current(); return;}
      if (editorPresentation.isClosing()) return;
      if (await confirmEditorLeave()) closeSpotEditor();
      return;
    }
    if (presentation === "layer-sheet") {
      closeLayerSheet();
      return;
    }
    if (presentation !== "spot-panel") return;
    const previousExtent = previousPanelExtent(panelExtentRef.current);
    if (previousExtent) {
      setPanelExtent(previousExtent);
      return;
    }
    closeSpotPanel();
  };

  useEffect(() => {
    if (!selectedProposal || !contributionHistory.data) return;
    const transition = privateContributionSelectionTransition(
      selectedProposal,
      contributionHistory.data.data.submissions,
      activeContext,
      currentContributionOwner,
    );
    if (transition.kind === "PRIVATE") {
      if (transition.submission !== selectedProposal) setSelectedProposal(transition.submission);
      return;
    }
    if (transition.kind === "NONE") return;
    const generation = ++privateTransitionGeneration.current;
    const transitionOwner = currentDraftUserId();
    const transitionReset = useAppStore.getState().mapResetVersion;
    setSelectedProposal(null);
    if (transition.kind === "REMOVE") {
      setBottomPresentation("none");
      setAnnouncement("当前账号已无法查看这个私有观星点。");
      return;
    }
    void (async () => {
      const currentSpot = spots.find((spot) => spot.spotId === transition.spotId);
      const refreshed = currentSpot ? undefined : await scene.refetch().catch(() => undefined);
      if (generation !== privateTransitionGeneration.current || transitionOwner !== currentDraftUserId() ||
          transitionReset !== useAppStore.getState().mapResetVersion) return;
      const formal = currentSpot ?? refreshed?.data.spots.find((spot) => spot.spotId === transition.spotId);
      if (!formal) {
        setBottomPresentation("none");
        notify({ owner: "map", placement: "inline", tone: "warning", title: "正式观星点正在同步", body: "发布回执已确认，地图资料暂未刷新。请稍后重试。", dismissible: true, dedupeKey: `proposal-published:${transition.spotId}` });
        return;
      }
      await openDetail(formal);
    })();
  }, [contributionHistory.data, selectedProposal, activeContext, currentContributionOwner]);

  const commitMapDate = async (nextDate: string) => {
    if (!activeContext || timeRequestBusy.current || nextDate === selectedMapCivilDate) return;
    const requestSelection = useAppStore.getState().selectedSpotId;
    const requestGeneration = detailRequestGeneration.current;
    const isCurrentDateRequest = () => {
      const current = useAppStore.getState();
      return current.mapResetVersion === mapResetVersion &&
        current.selectedSpotId === requestSelection &&
        detailRequestGeneration.current === requestGeneration &&
        current.observationContext?.contextId === activeContext.contextId &&
        current.observationContext.contextId !== current.retiredObservationContextId &&
        current.observationContext.revision === activeContext.revision &&
        current.observationContext.contextFingerprint === activeContext.contextFingerprint;
    };
    if (!isCurrentDateRequest()) return;
    const edit = useAppStore.getState().beginObservationContextEdit(activeContext);
    if (!edit) return;
    setTemporalFailure(null);
    setTimePreviewing(false);
    timeRequestBusy.current = true;
    setTimeSaving(true);
    try {
      const next = instantForCivilDate(nextDate, activeContext.selectedAtUtc, activeContext.timezone);
      const response = await updateObservationContext(activeContext, {
        localDate: next.localDate,
        selectedAt: next.selectedAt,
        eventInstanceId: null,
      });
      if (!isCurrentDateRequest()) return;
      setObservationContext(response.data);
      setPanelPreviewFrameIndex(0);
      setAnnouncement(`观测日期已更新为${formatContextTime(response.data.selectedAtUtc, response.data.timezone)}。`);
    } catch (error) {
      if (!isCurrentDateRequest() || isMiniappRequestCancelled(error)) return;
      setTemporalFailure({
        kind: "date",
        target: nextDate,
        detail: `${errorMessage(error)}。仍使用已确认的日期和时间。`,
        contextId: activeContext.contextId,
        revision: activeContext.revision,
        contextFingerprint: activeContext.contextFingerprint,
        selectedSpotId: requestSelection,
        requestGeneration,
        mapResetVersion,
      });
    } finally {
      useAppStore.getState().finishObservationContextEdit(edit);
      timeRequestBusy.current = false;
      setTimeSaving(false);
    }
  };

  const retryTemporalFailure = () => {
    if (!visibleTemporalFailure || timeRequestBusy.current) return;
    if (visibleTemporalFailure.kind === "date") {
      void commitMapDate(visibleTemporalFailure.target);
      return;
    }
    const index = timeFrames.findIndex(frame => frame.atUtc === visibleTemporalFailure.target);
    if (index >= 0) void commitMapTime(index);
  };

  const onPanelShare = async () => {
    if (!selected || selected.status !== "PUBLISHED" && selected.status !== "TEMPORARILY_CLOSED") return;
    try {
      await Taro.navigateTo({ url: `/content/share/index?spotId=${encodeURIComponent(selected.spotId)}` });
    } catch (error) {
      notify({
        owner: "map",
        placement: "floating",
        tone: "warning",
        title: "系统分享暂不可用",
        body: `${errorMessage(error)}。请稍后重试。`,
        dismissible: true,
        dedupeKey: "map-share-failed",
      });
    }
  };

  const openMapPage = async (url: string, title: string, entry: string, isCurrent = () => true) => {
    const dedupeKey = `map-${entry}-navigation-failed`;
    try {
      if (!isCurrent()) return false;
      await Taro.navigateTo({ url });
      if (!isCurrent()) return false;
      const state = useAppStore.getState();
      for (const item of state.notifications) {
        if (item.owner === "map" && item.dedupeKey === dedupeKey) {
          state.dismissNotification(item.id);
        }
      }
      return true;
    } catch (error) {
      if (!isCurrent()) return false;
      if (entry === "sky" || entry === "proposal-sky") reportRuntimeError("native", "sky_entry_navigation_failed", error);
      notify({
        owner: "map",
        placement: "floating",
        tone: "warning",
        title: `${title}暂未打开`,
        body: "请稍后重试，当前地点和时间已保留。",
        dismissible: true,
        dedupeKey,
      });
      return false;
    }
  };

  const openSkyPage = (url: string, entry: "sky" | "proposal-sky",
    preparation = skyEntry.prepare(), acceptContext?: () => void) => preparation?.start({
    reducedMotion: useAppStore.getState().preferences.reducedMotion,
    navigate: current => openMapPage(url, "云观星", entry, current),
    onTimeout: () => {
      reportRuntimeError("native", "sky_entry_navigation_timeout");
      notify({ owner: "map", placement: "floating", tone: "warning", title: "云观星暂未打开",
        body: "请稍后重试，当前地点和时间已保留。", dismissible: true, dedupeKey: `map-${entry}-navigation-failed` });
    },
  }, acceptContext) ?? false;

  const onPanelEvidence = (kind: "guides" | "field" | "sources", articleId?: string) => {
    if (!selected || !activeContext || !detailContextReady || !spotDetail) {
      notify({ owner: "map", placement: "floating", tone: "warning", title: "地点资料尚未就绪", body: "请稍后重试；当前地点和时间会保留。", dismissible: true, dedupeKey: "map-evidence-not-ready" });
      return;
    }
    if (articleId && !spotDetail.guides.some(guide => guide.articleId === articleId && guide.spotId === selected.spotId)) return;
    const route = articleId ? "/content/article/detail/index" : kind === "sources" ? "/spot/data-source/index" : `/spot/${kind}/index`;
    const query = `spotId=${encodeURIComponent(selected.spotId)}&contextId=${encodeURIComponent(activeContext.contextId)}`;
    void openMapPage(`${route}?${query}${articleId ? `&articleId=${encodeURIComponent(articleId)}` : ""}`, "资料页面", "evidence");
  };

  const onPanelNavigate = () => spotNavigation.openDirect();

  const onPanelCloud = () => {
    if (
      !selected ||
      !activeContext ||
      !spotDetail ||
      activeContext.location.kind !== "FORMAL_SPOT" ||
      activeContext.location.spotId !== selected.spotId
    ) {
      notify({
        owner: "map",
        placement: "floating",
        tone: "warning",
        title: "观测信息尚未就绪",
        body: "地点观测信息正在加载，请稍后重试。",
        dismissible: true,
        dedupeKey: "map-cloud-context-not-ready",
      });
      return;
    }
    const params = [
      ["spotId", selected.spotId],
      ["contextId", activeContext.contextId],
      ["date", activeContext.localDate],
      ["selectedAt", activeContext.selectedAtUtc],
      ["timezone", activeContext.timezone],
      ["dataRevision", spotDetail.decision.inputDigest],
    ]
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join("&");
    openSkyPage(`/sky/detail/index?${params}`, "sky");
  };

  const onProposalCloud = async (submission: import("@starward/miniapp-contracts").ContributionSubmission) => {
    const location = pendingProposalContextLocation(submission);
    const owner = currentDraftUserId();
    if (!location || !owner) {
      notify({ owner: "map", placement: "floating", tone: "warning", title: "观测位置不可用", body: "该审核中点位没有可用于本账号云观星的精确坐标。", dismissible: true, dedupeKey: `proposal-cloud:${submission.submissionId}` });
      return;
    }
    const preparation = skyEntry.prepare();
    if (!preparation) return;
    const operation = ++navigationEpoch.current;
    try {
      const current = useAppStore.getState().observationContext;
      const response = await resolveObservationContext({
        location,
        localDate: current?.localDate ?? localDateForNow(),
        selectedAt: current?.selectedAtUtc ?? null,
        eventInstanceId: current?.eventInstanceId ?? null,
        targetProfile: current?.targetProfile ?? "DAILY",
      }, undefined, owner);
      if (!preparation.isCurrent() || operation !== navigationEpoch.current || !samePendingProposalIntent(submission, selectedProposalRef.current, owner, currentDraftUserId())) return;
      const binding = response.data.privateProposal;
      if (response.dataState !== "FRESH" || response.data.schemaVersion !== "observation-context-v3" || !binding ||
          binding.ownerId !== owner || binding.submissionId !== location.submissionId || binding.attemptId !== location.attemptId ||
          binding.attemptBaseRevision !== location.attemptBaseRevision) throw new Error("待审地点身份尚未确认");
      const params = [
        ["spotId", response.data.location.kind === "FORMAL_SPOT" ? response.data.location.spotId : submission.submissionId],
        ["locationName", response.data.location.kind === "PENDING_PROPOSAL" ? response.data.location.displayName : ""],
        ["contextId", response.data.contextId],
        ["date", response.data.localDate],
        ["selectedAt", response.data.selectedAtUtc],
        ["timezone", response.data.timezone],
        ["dataRevision", response.data.contextFingerprint],
        ["proposalAttemptId", location.attemptId],
        ["proposalAttemptBaseRevision", location.attemptBaseRevision],
      ].map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join("&");
      openSkyPage(`/sky/detail/index?${params}`, "proposal-sky", preparation, () => setObservationContext(response.data));
    } catch (error) {
      if (!preparation.isCurrent() || operation !== navigationEpoch.current || !samePendingProposalIntent(submission, selectedProposalRef.current, owner, currentDraftUserId()) || isMiniappRequestCancelled(error)) return;
      notify({ owner: "map", placement: "floating", tone: "warning", title: "观测信息暂不可用", body: `${errorMessage(error)}。提案和当前地图状态已保留。`, dismissible: true, dedupeKey: `proposal-cloud:${submission.submissionId}` });
    } finally {
      preparation.cancelPreparation();
    }
  };

  const onPanelContribution = () => {
    if (!selected) return;
    login.requireAccount(() => void openMapPage(
      `/content/spot-feedback/index?spotId=${encodeURIComponent(selected.spotId)}&spotName=${encodeURIComponent(selected.name)}`,
      "反馈页面",
      "contribution",
    ), () => useAppStore.getState().selectedSpotId === selected.spotId && nativeMap.isCurrent());
  };

  useEffect(() => {
    if (!selectedSpotId) {
      lastHandledSelectedId.current = null;
      // Private candidates have their own owner-scoped selection, without a
      // formal spot ID. Keep that panel through Sky navigation and Back.
      if (!pageVisible && bottomPresentation === "spot-panel" && !selectedProposal) {
        setBottomPresentation("none");
      }
      return;
    }
    const explicitOpenRequested =
      lastHandledSpotOpenVersion.current !== spotOpenRequestVersion;
    if ((!explicitOpenRequested && lastHandledSelectedId.current === selectedSpotId) || !selected) return;
    lastHandledSelectedId.current = selectedSpotId;
    lastHandledSpotOpenVersion.current = spotOpenRequestVersion;
    if (shouldOpenSpotForSelection({
      explicitOpenRequested,
      bottomPresentation,
      detailContextReady,
      contextKind: activeContext?.location.kind ?? null,
      contextSpotId: activeContext?.location.kind === "FORMAL_SPOT" ? activeContext.location.spotId : null,
      selectedSpotId,
    })) {
      void (async () => {
        if (!(await confirmEditorLeave())) return;
        finishSpotEditorPresentation(() => {if (nativeMap.isCurrent()) void openDetail(selected);});
      })();
    }
  }, [
    activeContext,
    bottomPresentation,
    detailContextReady,
    pageVisible,
    selected,
    selectedProposal,
    selectedSpotId,
    spotOpenRequestVersion,
  ]);

  const panelHasMedia = Boolean(
    bottomPresentation === "spot-panel" &&
      (selectedProposal
        ? (["parking", "toilet", "site"] as const).some(kind =>
            Boolean(selectedProposal.candidateProfile?.media[kind]?.length))
        : selected?.media.some((media) =>
            mediaIsRenderable(media, __MINIAPP_DEVELOPMENT_FIXTURE_MODE__))),
  );
  const {
    statusBarHeight: mapStatusBarHeight,
    capsuleBottom: mapCapsuleBottom,
    safeTop: mapSafeTop,
  } = nativeNavigationInsets();
  let embeddedEditorHeightPx: number | undefined;
  try {
    const windowInfo = Taro.getWindowInfo();
    if (
      Number.isFinite(windowInfo.windowWidth) &&
      windowInfo.windowWidth > 0 &&
      Number.isFinite(windowInfo.windowHeight) &&
      windowInfo.windowHeight > 0
    ) {
      embeddedEditorHeightPx = Math.max(
        320,
        (primaryNavigation.pageHeight ?? windowInfo.windowHeight) - SPOT_EDITOR_TOP_PX,
      );
    }
  } catch {
    // The CSS fallback remains bounded when native window metrics are absent.
  }
  const mapPresentationStyle = {
    ...primaryNavigation.style,
    ...(datePickerVisible ? {
      "--map-calendar-top": `${calendarBounds?.identity === calendarLayoutIdentity ? calendarBounds.top : 0}px`,
    } : {}),
    ...(mapStatusBarHeight === undefined ? {} : {
      "--map-title-top": `${mapStatusBarHeight + 4}px`,
    }),
    ...(mapCapsuleBottom === undefined && mapSafeTop === undefined ? {} : {
      // safeTop is the conservative maximum of capsule clearance and the
      // device-width navigation band. Using capsuleBottom alone lets older
      // simulator metrics place the search field inside the native capsule.
      "--map-search-top": `${mapSafeTop ?? mapCapsuleBottom! + 4}px`,
    }),
    "--spot-editor-motion-duration": `${spotEditorPhase === "closing" ? SPOT_EDITOR_EXIT_MS : SPOT_EDITOR_ENTER_MS}ms`,
    ...panelCssMotion?.style,
  } as CSSProperties;

  return (
    <><SystemMotionProbe /><MapPanelPresentation
      ref={panelPresentation}
      active={bottomPresentation === "spot-panel"}
      extent={panelExtent}
      hasMedia={panelHasMedia}
      motion={panelCssMotion}
      deliveryTarget={__DELIVERY_TARGET__}
      className={
        themeClass +
        " map-page location-" +
        locationState.toLowerCase().replace("_", "-") +
        (bottomPresentation === "spot-panel"
          ? ` map-page--panel-${panelExtent}`
          : "") +
        (panelDragging ? " map-page--panel-dragging" : "") +
        (panelSettling ? " map-page--panel-settling" : "") +
        (datePickerVisible ? " map-page--calendar-open" : "") +
        (bottomPresentation === "spot-editor" ? " map-page--spot-editor" : "")
      }
      style={mapPresentationStyle}
    >
      {!eventModalPresent ? <FloatingNotificationHost /> : null}
      {navigationHandoff.warning}
      {photoHandoff.warning}
      <NativeBackBoundary
        active={pageVisible && (skyEntryPresentation !== null || login.open || eventModalOpen || eventModalPresent || bottomPresentation === "spot-panel" || bottomPresentation === "layer-sheet" || bottomPresentation === "spot-editor")}
        onBack={handleMapPresentationSystemBack}
        nativeMapContent={<>{login.dialog}<AstronomicalEventModal ref={eventModalRef} open={eventModalOpen} mode="browse" onPresenceChange={setEventModalPresent}
          context={observationContext} onClose={() => setEventModalOpen(false)}
          nativeBackBoundary={false} portal={false} /></>}
      />
      <View className="map-workspace">
        <View
          className="map-stage"
          data-control="map-marker-panel-coordinator"
        >
          <Map
            id={nativeMap.mapId}
            key={nativeMap.mapId}
            className="native-map"
            latitude={viewport.center.latitude}
            longitude={viewport.center.longitude}
            scale={viewport.zoom}
            markers={markerList}
            polygons={layerPolygons}
            showLocation={locationState === "GRANTED"}
            enableZoom={spotEditorPhase !== "closing"}
            enableScroll={spotEditorPhase !== "closing"}
            enableRotate={false}
            enableOverlooking={false}
            onTap={() => { if (nativeMap.isCurrent()) onMapTap(); }}
            onMarkerTap={event => { if (nativeMap.isCurrent()) void onMarkerTap(event); }}
            onRegionChange={event => { if (nativeMap.isCurrent() && !editorPresentation.isClosing()) onRegionChange(event); }}
            onError={nativeMap.onError}
            onUpdated={() => { if (nativeMap.isCurrent()) { nativeMap.onUpdated(); readTerrainViewport(!mapTerrainBounds); } }}
            aria-label="正式观星点地图；搜索提供等价可访问结果"
          />

          {mode === "OBSERVATION" ? <View className="map-observation-cover" aria-label="红光模式已隐藏微信地图底图，可通过搜索查找观星点">
            <Text>红光模式已隐藏微信地图底图</Text>
            <Text>通过上方搜索查找观星点；在设置切回日间或夜间可查看地图。</Text>
          </View> : null}

          <View className="map-app-title" aria-hidden="true">
            <Text>今晚去观星</Text>
          </View>

          <MapPanelChrome className="map-search-anchor" motionId={panelCssMotion?.sequence ?? 0} onAnimationStart={name => panelPresentation.current?.startReleaseClock(name)}>
            <Button
              className={`map-search-entry focus-ring${!finderQuery ? " map-search-entry--placeholder" : ""}`}
              data-control="map-search-entry"
              ariaLabel={
                finderQuery
                  ? `搜索地点、区域或正式观星点，当前输入${finderQuery}`
                  : "搜索地点、区域或正式观星点"
              }
              onClick={(event) => {
                event.stopPropagation();
                void openMapPage("/spot/search/index", "地点搜索", "search");
              }}
            >
              <SemanticIcon name="search" />
              <Text>{finderQuery || FINDER_FIELD_PLACEHOLDER}</Text>
            </Button>
          </MapPanelChrome>

          <MapPanelChrome className="map-top-tools" label="地图工具">
            <Button
              className="map-tool map-tool--location focus-ring"
              data-control="map-location-control"
              disabled={locationBusy}
              aria-label={locationBusy ? "正在获取一次性定位" : "请求一次性定位"}
              onClick={(event) => {
                event.stopPropagation();
                void locateMap();
              }}
            >
              <SemanticIcon name="location" />
            </Button>
            <Button
              className={`map-tool map-tool--layer focus-ring${bottomPresentation === "layer-sheet" ? " map-tool--layer-active" : ""}`}
              data-control="map-layer-selector-trigger"
              aria-label={`打开地图图层，当前${terrainEnabled ? "地形开启，" : "地形关闭，"}${overlayLabels[analysisOverlay]}`}
              aria-pressed={bottomPresentation === "layer-sheet"}
              onClick={(event) => {
                event.stopPropagation();
                openLayerSheet();
              }}
            >
              <SemanticIcon name="layers" />
            </Button>
            <Button
              className="map-tool map-tool--add focus-ring"
              data-control="map-add-spot"
              aria-label="新增观星点"
              onClick={(event) => {
                event.stopPropagation();
                login.requireAccount(() => {
                  setSpotEditorTarget({ forceNew: true });
                  invalidateMapPointIntent();
                  setBottomPresentation("spot-editor");
                }, () => nativeMap.isCurrent());
              }}
            >
              <Text className="map-tool__plus" aria-hidden>＋</Text>
            </Button>
            {bottomPresentation === "none" ? <Button
              className="map-tool map-tool--event focus-ring"
              data-control="map-astronomical-event-entry"
              aria-label="浏览天文事件"
              onClick={(event) => {
                event.stopPropagation();
                setDatePickerOpen(false);
                setEventModalOpen(true);
              }}
            ><SemanticIcon name="meteor" /></Button> : null}
          </MapPanelChrome>

          <View className="map-source-attributions">
            {activeContext?.timezoneSource && bottomPresentation === "none" ?
              <View className="map-source-attribution"><SourceAttribution compact sources={[activeContext.timezoneSource]} /></View> : null}
            {analysisOverlay === "TOTAL_CLOUD" && layerPolygons.length > 0 && bottomPresentation !== "layer-sheet" ?
              <View className="map-source-attribution map-source-attribution--weather"><SourceAttribution sources={scene.data?.sources.filter(source => source.kind === "THIRD_PARTY_FORECAST") ?? []} /></View> : null}
            {(lightInstallation.presentedData?.raster || (analysisOverlay === "LIGHT" && layerPolygons.length > 0)) && bottomPresentation !== "layer-sheet" && displayedLightLayer?.source ?
              <View className="map-source-attribution"><SourceAttribution sources={[displayedLightLayer.source]} /></View> : null}
            {presentedTerrainData?.source && bottomPresentation === "none" ?
              <View className="map-source-attribution"><SoftButton variant="ghost" label="查看地形来源与许可" onClick={() => {
                setTerrainSourceId(presentedTerrainData.source!.id); openLayerSheet();
              }}><Text className="type-caption">地形 · {presentedTerrainData.source.provider}</Text></SoftButton></View> : null}
          </View>
          <View className={`map-feedback-column${locationBusy || pageState === "LOADING" || nativeMap.pending || mapTerrainLoading ? " map-feedback-column--loading" : locationCandidate || mapRuntimeError || pageState === "ERROR" ? " map-feedback-column--recovery" : ""}`}>
            <NotificationRegion owner="map" placement="inline" actionHandlers={{ "map-context-region-failed": () => void refreshMap(), "map-location-request": () => void locateMap() }} />
            {locationBusy ? <StatusPanel state="LOADING" detail="正在获取本次位置" recoveryLabel="取消" onRecover={cancelLocation} /> : null}
            {locationCandidate && locationCandidateCurrent(locationCandidate) ? <SoftButton label="移动到本次位置" onClick={() => void moveToLocation()} /> : null}
            {nativeMap.pending ? <StatusPanel state="LOADING" detail="正在重新加载地图" /> :
              mapRuntimeError ? <SoftButton label="重新加载地图" onClick={nativeMap.retry} /> : null}
            {mapTerrainLoading ? <StatusPanel state="LOADING" detail="正在加载地形" /> : null}
            {mapDataStale && !layerSheetOwnsSceneFailure ? <StatusPanel
              state="STALE"
              detail={spots.length > 0 ? "更新失败，暂时显示上次结果。" : "上次结果没有观星点；当前资料暂时无法更新。"}
              recoveryLabel="重试"
              onRecover={() => void refreshMap()}
            /> : null}
            {pageState !== "EMPTY" &&
            !(pageState === "LOADING" && mapTerrainLoading) &&
            !(pageState === "LOADING" && bottomPresentation === "spot-panel" && bootstrapReplacementBlocked && visibleSpotContextAttempt) &&
            pageState !== "READY" &&
            pageState !== "PARTIAL" &&
            pageState !== "STALE" && !(layerSheetOwnsSceneFailure && pageState === "ERROR") ? pageState === "ERROR" ? (
              <SoftButton label="刷新观星点" onClick={() => void refreshMap()} />
            ) : (
              <StatusPanel
                state={pageState}
                detail={
                  pageState === "PERMISSION_DENIED"
                      ? "请登录后重试。"
                      : "正在加载观星点"
                }
                recoveryLabel={
                  pageState === "PERMISSION_DENIED"
                      ? "查看权限说明"
                      : undefined
                }
                onRecover={
                  pageState === "PERMISSION_DENIED"
                      ? () => void openMapPage("/pages/auth/index", "登录页面", "auth")
                    : undefined
                }
              />
            ) : null}
          </View>

          {bottomPresentation === "spot-editor" ? <View className="map-spot-editor-focus-ruler" aria-hidden /> : null}
          {bottomPresentation === "spot-editor" ? (
            <View
              className={`map-spot-editor-layer map-spot-editor-layer--${spotEditorPhase}`}
              aria-hidden={spotEditorPhase === "closing"}
              onClick={(event) => event.stopPropagation()}
            >
              <ContributionEditor
                embedded
                {...(embeddedEditorHeightPx === undefined ? {} : { embeddedHeightPx: embeddedEditorHeightPx })}
                forceNew={spotEditorTarget.forceNew}
                {...(spotEditorTarget.submissionId
                  ? { submissionId: spotEditorTarget.submissionId }
                  : {})}
                onCandidateChange={handleCandidateChange}
                onLeaveGuardChange={(guard) => { editorLeaveGuard.current = guard; }}
                onHandoffBackChange={registerEditorHandoffBack}
                onClose={closeSpotEditor}
                onRequestClose={requestSpotEditorClose}
                onSubmitted={(submission) => {
                  invalidateMapPointIntent();
                  void contributionHistory.refetch().catch(() => undefined);
                  finishSpotEditorPresentation(() => {
                    const marker = privateContributionMarkers([submission])[0];
                    if (marker) setViewport(spotNeighborhoodCamera({ latitude: marker.latitude, longitude: marker.longitude }, useAppStore.getState().viewport.zoom));
                    selectSpot(null);
                    setSelectedFallback(null);
                    setSelectedProposal(submission);
                    setPanelExtent("medium");
                    setPanelPhase("idle");
                    setBottomPresentation("spot-panel");
                    if (marker) spotMapFocus.begin(`proposal:${currentDraftUserId()}:${submission.submissionId}`, marker);
                  });
                }}
              />
            </View>
          ) : null}
          {bottomPresentation === "spot-editor" && spotEditorPhase === "closing"
            ? <View className="map-editor-exit-shield" catchMove onClick={event => event.stopPropagation()} /> : null}

          {bottomPresentation === "spot-panel" && (selected || selectedProposal) ? (
            <View
              className={`map-panel-layer${panelSettling ? " map-panel-layer--settling" : ""}${panelDragging ? " map-panel-layer--dragging" : ""}`}
              style={
                {
                  "--panel-small-content-height": `${panelIdentityHeight}px`,
                } as unknown as Record<string, string>
              }
              onClick={(event) => event.stopPropagation()}
            >
              {selectedProposal ? <PendingProposalPanel
                submission={selectedProposal}
                variant={selectedProposal.submissionState === "PENDING_REVIEW" || selectedProposal.submissionState === "ACCEPTED" ? "PENDING" : "DRAFT"}
                extent={panelExtent}
                documentScrollEnabled={panelDocumentScrollEnabled}
                phase={panelPhase}
                onExtent={onPanelExtent}
                onClose={closeSpotPanel}
                onPhotoIntent={onPanelPhotoIntent}
                onCloud={() => void onProposalCloud(selectedProposal)}
                onEdit={() => {
                  invalidateMapPointIntent();
                  setSpotEditorTarget({ forceNew: false, submissionId: selectedProposal.submissionId });
                  setBottomPresentation("spot-editor");
                }}
                onHandleTouchStart={onHandleTouchStart}
                onHandleTouchMove={onHandleTouchMove}
                onHandleTouchEnd={onHandleTouchEnd}
                onHandleTouchCancel={onHandleTouchCancel}
                onViewerBackHandlerChange={registerImageViewerBack}
              /> : selected ? <SpotInformationPanel
                settling={panelSettling}
                visible={pageVisible && bottomPresentation === "spot-panel"}
                spot={selected}
                detail={spotDetail}
                detailPending={spotOverviewProjection.pending}
                detailError={spotOverviewProjection.error}
                detailStale={spotOverviewProjection.stale}
                onLayoutChange={onPanelContentLayoutChange}
                contextPending={Boolean(visibleSpotContextAttempt?.pending)}
                contextError={visibleSpotContextAttempt?.error ?? null}
                onContextRecover={() => { if (selected) void resolveSpotContext(selected); }}
                onLoadingCancel={cancelSpotLoading}
                extent={panelExtent}
                documentScrollEnabled={panelDocumentScrollEnabled}
                phase={panelPhase}
                favorite={favoriteIds.includes(selected.spotId)}
                favoritePending={favoritePending}
                context={detailContextReady ? activeContext : null}
                timeContext={spotTimeContext}
                timeContextPending={!detailContextReady && !mapContextFailed &&
                  Boolean(visibleSpotContextAttempt?.pending || bootstrapContext.isFetching)}
                astronomyAt={projectedAt}
                skyReport={spotSkyReport}
                skyPending={spotSkyProjection.pending}
                skyRefreshing={spotSky.isFetching}
                skyError={spotSkyProjection.error}
                skyStale={spotSkyProjection.stale}
                timeFrames={timeFrames}
                timeFramesPending={scene.isPending}
                timeFramesFailed={mapSceneFailed}
                onTimeFramesRecover={() => void refreshMap()}
                timeRulerIdentity={timeRulerIdentity}
                timeSaving={timeSaving}
                temporalFailure={visibleTemporalFailure}
                onTemporalRetry={retryTemporalFailure}
                dateOptions={mapDateOptions}
                selectedDate={presentedMapCivilDate}
                todayDate={mapTodayCivilDate}
                datePickerOpen={datePickerVisible}
                onDatePickerOpenChange={setDatePickerOpen}
                onDateCommit={(date) => void commitMapDate(date)}
                onTimePreview={(index) => {
                  setPanelPreviewFrameIndex(index);
                  setTimePreviewing(true);
                }}
                onTimeCommit={(index) => void commitMapTime(index)}
                onTimeCancel={() => setTimePreviewing(false)}
                onHandleTouchStart={onHandleTouchStart}
                onHandleTouchMove={onHandleTouchMove}
                onHandleTouchEnd={onHandleTouchEnd}
                onHandleTouchCancel={onHandleTouchCancel}
                onViewerBackHandlerChange={registerImageViewerBack}
                onExtent={onPanelExtent}
                onClose={closeSpotPanel}
                onPhotoIntent={onPanelPhotoIntent}
                onRecover={() => void spotOverview.refetch()}
            onSkyRecover={() => void spotSky.refetch()}
                onFavorite={() => login.requireAccount(() => void toggleFavorite(selected.spotId),
                  () => useAppStore.getState().selectedSpotId === selected.spotId && nativeMap.isCurrent())}
                requireAccount={login.requireAccount}
                onShare={() => void onPanelShare()}
                onCloud={onPanelCloud}
                onNavigate={() => void onPanelNavigate()}
                onContribution={onPanelContribution}
                onEvidence={onPanelEvidence}
              /> : null}
            </View>
          ) : null}

          {bottomPresentation === "layer-sheet" ? (
            <View
              className="map-layer-layer"
              onClick={(event) => event.stopPropagation()}
            >
              <MapLayerSheet cloud={visibleLayer === "TOTAL_CLOUD"} revision={String(coverageExpanded)} footer={<>
                <View className="map-layer-sheet__choices" role="radiogroup" aria-label="观测叠加选择">
                  {(["LIGHT", "TOTAL_CLOUD"] as const).map((overlay) => {
                    const selectedLayer = visibleLayer === overlay;
                    return (
                      <Button
                        key={overlay}
                        className={`map-layer-sheet__choice${selectedLayer ? " map-layer-sheet__choice--active" : ""}${activeContext && !scene.isPending && !timeSaving ? " map-layer-sheet__choice--ready" : ""}`}
                        disabled={!activeContext || scene.isPending || timeSaving}
                        aria-label={`${overlayLabels[overlay]}${selectedLayer ? "，已选择" : ""}`}
                        onClick={() => {
                          if (overlay === "LIGHT") setDatePickerOpen(false);
                          setAnalysisOverlay(overlay);
                          setAnnouncement(`已选择${overlayLabels[overlay]}。`);
                        }}
                      >
                        <SemanticIcon name={overlay === "LIGHT" ? "bulb" : "cloud"} />
                        <View className="map-layer-sheet__choice-copy">
                          <Text className="map-layer-sheet__choice-title">{overlayLabels[overlay]}</Text>
                          <Text className="type-caption">
                            {overlay === "LIGHT" ? "夜光年度估算" : "选定时刻气象"}
                          </Text>
                        </View>
                        {selectedLayer ? <SemanticIcon name="layer-choice-check" className="map-layer-sheet__choice-check" /> : <View className="map-layer-sheet__choice-unchecked" aria-hidden />}
                      </Button>
                    );
                  })}
                </View>
              </>}>
                <View className="map-layer-sheet__terrain-choice" aria-label="地形叠加选择">
                  <Button
                    className={`map-layer-sheet__terrain-row${terrainEnabled && !mapTerrainMissing ? " map-layer-sheet__terrain-row--active" : ""}${!mapTerrainMissing ? " map-layer-sheet__terrain-row--ready" : ""}`}
                    disabled={mapTerrainMissing}
                    aria-checked={terrainEnabled && !mapTerrainMissing}
                    aria-label={`地形${mapTerrainMissing ? "，当前地区暂无数据" : terrainEnabled ? "，已开启" : "，已关闭"}`}
                    onClick={() => {
                      const next = !terrainEnabled;
                      setTerrainEnabled(next);
                      setAnnouncement(next ? "正在加载有来源的地形叠加。" : "已关闭地形叠加。");
                    }}
                  >
                    <SemanticIcon name="terrain" />
                    <View className="map-layer-sheet__choice-copy">
                      <Text className="map-layer-sheet__choice-title">地形</Text>
                      <Text className="type-caption">显示地势起伏，可叠加其他图层</Text>
                    </View>

                    <View className="map-layer-sheet__terrain-check" aria-hidden>{terrainEnabled && !mapTerrainMissing ? <SemanticIcon name="check" /> : null}</View>
                  </Button>
                  {terrainEnabled || mapTerrainMissing ? <Text className="map-layer-sheet__terrain-state">
                    {mapTerrainLoading ? "正在加载地形…" : mapTerrainFailed ? "部分或全部地形暂时无法显示。" : mapTerrainMissing ? "当前地区暂无地形数据。" : terrain.data?.data.coverageLabel}
                  </Text> : null}
                  {mapTerrainFailed ? <SoftButton label={terrainRequiresMapRecovery ? "重新加载地图" : "重新读取地形"} onClick={() => {
                    if (terrainRequiresMapRecovery) { nativeMap.retry(); return; }
                    setTerrainNativeRetry(value => value + 1);
                    if (terrain.isError || terrain.refreshError || terrain.imageError || terrain.data?.data.failureCode) void terrain.refetch();
                  }}>{terrainRequiresMapRecovery ? "重新加载地图" : "重试"}</SoftButton> : null}
                </View>
                {terrainDisclosure?.source ? <View data-control="map-terrain-source">
                  <SoftButton label="展开或收起地形来源与许可"
                    onClick={() => setTerrainSourceId(value => value === terrainDisclosure.source!.id ? null : terrainDisclosure.source!.id)}>
                    {terrainSourceId === terrainDisclosure.source.id ? "收起地形来源与许可" : "地形来源与许可"}
                  </SoftButton>
                  {terrainSourceId === terrainDisclosure.source.id ? <>
                    <Text className="type-caption">{presentedTerrainData ? "当前显示的地形" : "未开启地形"} · 数据版本：{terrainDisclosure.datasetVersion}</Text>
                    <Provenance source={terrainDisclosure.source} showKind={false} />
                  </> : null}
                </View> : null}
                {visibleLayer === "TOTAL_CLOUD" ? (
                  <>
                    {mapSceneFailed && !cloudTimeChoices.length ? <StatusPanel
                      state={scene.data ? "STALE" : "ERROR"}
                      detail="云量预报暂不可用，暂时无法选时间。"
                      recoveryLabel="重试地图数据"
                      onRecover={() => void refreshMap()}
                    /> : null}
                    <ObservationDateControl
                      dates={mapDateOptions}
                      selectedDate={presentedMapCivilDate}
                      today={mapTodayCivilDate}
                      nativeBackBoundary={false}
                      open={datePickerVisible}
                      busy={!activeContext || timeSaving}
                      onOpenChange={(open) => {
                        if (open) setTimePreviewing(false);
                        setDatePickerOpen(open);
                      }}
                      onSelect={(date) => {
                        setDatePickerOpen(false);
                        setTimePreviewing(false);
                        void commitMapDate(date);
                      }}
                    />
                    <MapTimeRuler
                      nightLabel={timeReference ? observationNightLabel(timeReference.localDate, projectedAt, timeReference.timezone, mapTodayCivilDate) : undefined}
                      frames={cloudTimeChoices.map(choice => choice.frame)}
                      pending={scene.isPending}
                      identity={timeRulerIdentity}
                      selectedAt={timeReference?.selectedAtUtc ?? ""}
                      timezone={timeReference?.timezone ?? "Asia/Shanghai"}
                      disabled={!activeContext || !cloudTimeChoices.length || timeSaving}
                      emptyMessage={scene.isPending && !scene.data ? "正在加载云量预报。" : mapSceneFailed ? "云量预报暂不可用，请重试。" : "所选日期暂无云量预报。"}
                      onPreview={(index) => {
                        const choice = cloudTimeChoices[index];
                        if (!choice) return;
                        setPanelPreviewFrameIndex(choice.sourceIndex);
                        setTimePreviewing(true);
                      }}
                      onCommit={(index) => { const choice = cloudTimeChoices[index]; if (choice) void commitMapTime(choice.sourceIndex); }}
                      onCancel={() => setTimePreviewing(false)}
                    />
                    <MapTemporalFeedback failure={visibleTemporalFailure} onRetry={retryTemporalFailure} />
                    <Text className={`map-layer-sheet__source-note type-caption${!scene.isPending && !mapSceneFailed ? " map-layer-sheet__source-note--ready" : ""}`}>
                      云量预报 · 仅覆盖有效数据区域
                    </Text>
                    <SourceAttribution sources={scene.data?.sources.filter(source => source.kind === "THIRD_PARTY_FORECAST") ?? []} />
                    {(!scene.isPending || scene.data) && !(mapSceneFailed && !scene.data) ? <ForecastCoverageNote onExpandedChange={setCoverageExpanded} scope="map" stale={mapSceneFailed} starts={cloudForecastStarts(timeFrames)}
                      timezone={activeContext?.timezone ?? "Asia/Shanghai"} scopeKey={`${activeContext?.contextId}:${activeContext?.localDate}`} /> : null}
                  </>
                ) : lightLayerState === "LOADING" ? (
                  <View><StatusPanel state="LOADING" detail="正在确认当前地区的光污染覆盖。" live={false} />
                    {lightInstallation.presentedData?.source ? <SourceAttribution sources={[lightInstallation.presentedData.source]} /> : null}</View>
                ) : lightLayerState === "ERROR" || lightLayerState === "STALE" ? (
                  <View>
                    <StatusPanel
                      state={lightLayerState}
                      detail={lightLayerState === "STALE"
                        ? visibleLayerUnavailable ? "光污染资料更新失败，上次无覆盖结果尚未确认。" : "光污染资料更新失败，暂时保留上次结果。"
                        : "光污染资料暂时无法获取。"}
                      recoveryLabel={lightInstallation.requiresMapRecovery || nativeViewport.error ? "重新加载地图" : "重新获取"}
                      onRecover={() => void retryLightLayer()}
                      live={false}
                    />
                    {lightLayerState === "STALE" && !visibleLayerUnavailable && displayedLightLayer?.source ?
                      <SourceAttribution sources={[displayedLightLayer.source]} /> : null}
                  </View>
                ) : lightLayerState === "EMPTY" ? (
                  <StatusPanel
                    state="EMPTY"
                    emptyLevel="section"
                    title="暂无光污染数据"
                    detail={nightRaster?.validPixelCount === 0 ? nightLayer?.precision ?? "当前地区暂无可用的年度夜光估算。" : "当前地区尚无已发布的年度夜光资料。"}
                    live={false}
                  />
                ) : (
                  <View>
                  <Text className="map-layer-sheet__source-note type-caption">
                    {displayedLightLayer?.source?.validFrom?.slice(0, 4)} 年度夜光估算 · 不随观测时间变化
                  </Text>
                  {displayedLightLayer?.source ? <SourceAttribution sources={[displayedLightLayer.source]} /> : null}
                  {displayedLightLayer?.raster && displayedLightLayer.state === "PARTIAL" ? <Text className="type-caption">部分范围资料不足或尚未发布，空白不表示夜光为零。</Text> : null}
                  </View>
                )}
                {displayedLayer?.legend.length ? (
                  <View className="map-layer-sheet__legend" aria-label="当前图层图例">
                    {displayedLayer.legend.slice(0, visibleLayer === "LIGHT" ? 5 : 4).map((item) => (
                      <View className="map-layer-sheet__legend-item" key={`${item.label}-${item.range}`}>
                        <View
                          className="map-layer-sheet__legend-swatch"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        <Text className="type-caption">
                          {visibleLayer === "LIGHT"
                            ? displayedLayer.raster ? `${item.label} · ${item.range}` : item.label
                            : `${item.label} · ${item.range}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </MapLayerSheet>
            </View>
          ) : null}
        </View>
      </View>
      <View className="sr-live" role="status" aria-live="polite">
        <Text>{announcement}</Text>
      </View>
      <View
        className="sr-live"
        id={`map-layer-projection-${layerProjectionProbe}`}
        aria-hidden="true"
      >
        <Text className={timeReference ? "map-context-time-summary" : ""}>{contextTimeLabel}</Text>
      </View>
      {skyEntryPresentation !== null ? <View key={skyEntryPresentation} className="map-sky-entry-shield"
        style={{ animationDuration: `${SKY_ENTRY_FADE_MS}ms` }} catchMove
        onClick={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()}
        onAnimationEnd={() => skyEntry.finishFade(skyEntryPresentation)} /> : null}
    </MapPanelPresentation></>
  );
}
