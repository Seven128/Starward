import { panelSpringStyle, type PanelCssMotion } from "./panel-spring-style";
import { createPanelAnimation, type PanelAnimationHost } from "./panel-animation";
import { panelSpringFrames } from "./panel-spring";
import { markerGroups, markerItems } from "./map-markers";
import { panelReleaseVelocity, releasePanelExtent, panelHeightProgress, readPanelSnapGeometry, type PanelMotionSample, type PanelSnapGeometry } from "./panel-snap";
import { nativeNavigationInsets } from "@/theme/native-metrics";
import { canApplyContextRestore } from "./context-restore";
import { FloatingNotificationHost } from "@/components/notification";
import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import {
  Button,
  Map,
  Text,
  View,
} from "@tarojs/components";
import type { BaseEventOrig, MapProps } from "@tarojs/components";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { gcj02ToWgs84 } from "@starward/coordinate-system";
import {
  type DisplayMode,
  type MapLayerKind,
  type SpotSummary,
} from "@starward/miniapp-contracts";
import { NotificationRegion } from "@/components/notification";
import { SemanticIcon } from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { useFavoriteMutation } from "@/hooks/use-favorite-mutation";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  errorMessage,
  getMapScene,
  getSpotOverview,
  resolveObservationContext,
  restoreObservationContext,
  updateObservationContext,
} from "@/services/api-client";
import { useAppStore, type AnalysisOverlay } from "@/state/app-store";
import {
  nearestMapTimeFrameIndex,
  mapTimeFrameAt,
  projectedLayerPolygons,
  projectMapEvaluations,
} from "./map-time-frame";
import "./index.scss";
import { calendarDateInTimezone } from "@/utils/zoned-date";
import { requestOneShotLocation } from "@/services/one-shot-location";
import { isMiniappRequestCancelled } from "@/services/request-lifecycle";
import { userMapRegionEnd } from "./map-region-event";
import { MapTimeRuler } from "./time-ruler";
import {
  SpotInformationPanel,
  type SpotPanelExtent,
} from "./spot-panel";

function localDateForNow(timezone = "Asia/Shanghai") {
  return calendarDateInTimezone(new Date(), timezone);
}

function currentTimezoneHint(): "Asia/Shanghai" | "Asia/Hong_Kong" {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone === "Asia/Hong_Kong" ? timezone : "Asia/Shanghai";
}

function formatContextTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

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

function layerForOverlay(overlay: AnalysisOverlay): MapLayerKind {
  if (overlay === "LIGHT") return "LIGHT_POLLUTION";
  if (overlay === "TOTAL_CLOUD") return "CLOUD";
  if (overlay === "OPPORTUNITY") return "OPPORTUNITY";
  return "NORMAL";
}

interface NativeLayerPolygon {
  points: readonly { latitude: number; longitude: number }[];
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  zIndex: number;
}

type BottomPresentation = "none" | "spot-panel" | "layer-sheet";

const PANEL_POSITION: Record<SpotPanelExtent, number> = {
  small: 0,
  medium: 0.5,
  large: 1,
};

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

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
  LIGHT: "光害",
  TOTAL_CLOUD: "总云量",
  OPPORTUNITY: "今晚观测条件",
};

export default function MapPage() {
  const themeClass = useThemeClass();
  const mode = useAppStore((state) => state.mode);
  const committedFilters = useAppStore((state) => state.committedFilters);
  const finderQuery = useAppStore((state) => state.finderQuery);
  const observationContext = useAppStore(
    (state) => state.observationContext,
  );
  const analysisOverlay = useAppStore((state) => state.analysisOverlay);
  const preferences = useAppStore((state) => state.preferences);
  const viewport = useAppStore((state) => state.viewport);
  const selectedSpotId = useAppStore((state) => state.selectedSpotId);
  const locationState = useAppStore((state) => state.locationState);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const setObservationContext = useAppStore(
    (state) => state.setObservationContext,
  );
  const setAnalysisOverlay = useAppStore((state) => state.setAnalysisOverlay);
  const setViewport = useAppStore((state) => state.setViewport);
  const mapResetVersion = useAppStore((state) => state.mapResetVersion);
  const selectSpot = useAppStore((state) => state.selectSpot);
  const setLocationState = useAppStore((state) => state.setLocationState);
  const notify = useAppStore((state) => state.notify);
  const { toggleFavorite } = useFavoriteMutation();
  const [debouncedFinderQuery, setDebouncedFinderQuery] = useState("");
  const [mapRuntimeError, setMapRuntimeError] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [timeSaving, setTimeSaving] = useState(false);
  const timeRequestBusy = useRef(false);
  const [pageVisible, setPageVisible] = useState(true);
  const navigationEpoch = useRef(0);
  const [locationBusy, setLocationBusy] = useState(false);
  const locationRequestBusy = useRef(false);
  const regionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Packet A owns one bottom presentation coordinator. Panel extent and layer
  // sheet are mutually exclusive derived modes, never parallel booleans.
  const [bottomPresentation, setBottomPresentation] =
    useState<BottomPresentation>("none");
  const [panelExtent, setPanelExtent] = useState<SpotPanelExtent>("medium");
  const [panelPhase, setPanelPhase] = useState<"idle" | "closing">("idle");
  const [panelDragOffset, setPanelDragOffset] = useState(0);
  const [panelDragging, setPanelDragging] = useState(false);
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
    geometry: PanelSnapGeometry | null;
    released: boolean;
  } | null>(null);
  const lastHandledSelectedId = useRef<string | null>(null);
  const detailRequestGeneration = useRef(0);
  useEffect(() => () => { detailRequestGeneration.current += 1; }, []);
  const extentBeforeLayer = useRef<{
    extent: SpotPanelExtent;
    selectedSpotId: string | null;
  } | null>(null);

  useDidShow(() => setPageVisible(true));
  useDidHide(() => { stopPanelSpring(); navigationEpoch.current += 1; setPageVisible(false); panelDrag.current = null; setPanelDragOffset(0); setPanelDragging(false); });

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedFinderQuery(finderQuery.trim()),
      250,
    );
    return () => clearTimeout(timer);
  }, [finderQuery]);

  const bootstrapContext = useResourceQuery({
    queryKey: [
      "map-observation-context",
      mapResetVersion,
      observationContext?.contextId,
      observationContext?.contextFingerprint,
      observationContext?.revision,
      Number(viewport.center.latitude.toFixed(5)),
      Number(viewport.center.longitude.toFixed(5)),
    ],
    queryFn: (signal) => {
      if (observationContext)
        return restoreObservationContext(observationContext, signal);
      const point = gcj02ToWgs84({
        lat: viewport.center.latitude,
        lon: viewport.center.longitude,
        system: "GCJ-02",
      });
      return resolveObservationContext(
        {
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
          localDate: localDateForNow(),
          targetProfile: "DAILY",
        },
        signal,
      );
    },
    enabled: pageVisible,
    staleTime: 60_000,
  });
  const activeContext = bootstrapContext.data?.data ?? null;
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
      currentState.mapResetVersion === mapResetVersion &&
      currentState.selectedSpotId === selectedSpotId &&
      canApplyContextRestore(observationContext, currentContext, bootstrapContext.data.data) &&
      (currentContext?.contextId !== bootstrapContext.data.data.contextId ||
        currentContext.revision !== bootstrapContext.data.data.revision ||
        currentContext.contextFingerprint !==
          bootstrapContext.data.data.contextFingerprint)
    )
      setObservationContext(bootstrapContext.data.data);
  }, [
    bootstrapContext.data?.data,
    observationContext,
    mapResetVersion,
    selectedSpotId,
    pageVisible,
    setObservationContext,
  ]);

  const scene = useResourceQuery({
    queryKey: [
      "map-scene",
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
      committedFilters,
      debouncedFinderQuery,
      Number(viewport.center.latitude.toFixed(4)),
      Number(viewport.center.longitude.toFixed(4)),
      viewport.zoom,
      preferences.defaultPlace,
      preferences.experience,
      preferences.maxDriveMinutes,
      preferences.requiredFacilities,
      preferences.equipment,
      preferences.capturePreference,
      analysisOverlay,
    ],
    queryFn: (signal) =>
      getMapScene(
        activeContext!.contextId,
        committedFilters,
        debouncedFinderQuery,
        viewport,
        {
          defaultPlace: preferences.defaultPlace,
          experience: preferences.experience,
          maxDriveMinutes: preferences.maxDriveMinutes,
          requiredFacilities: preferences.requiredFacilities,
          equipment: preferences.equipment,
          capturePreference: preferences.capturePreference,
        },
        layerForOverlay(analysisOverlay),
        activeContext!.weatherView.cloudLayer,
        signal,
      ),
    enabled: pageVisible && Boolean(activeContext),
    staleTime: 60_000,
  });

  useEffect(() => {
    const ids = scene.data?.data.favoriteSpotIds;
    if (ids) useAppStore.getState().replaceFavoriteIds(ids);
  }, [scene.data?.data.favoriteSpotIds]);

  useEffect(
    () => () => {
      if (regionTimer.current) clearTimeout(regionTimer.current);
      if (panelCloseTimer.current) clearTimeout(panelCloseTimer.current);
    },
    [],
  );

  const spots = scene.data?.data.spots ?? [];
  const selectedFromScene =
    spots.find((spot) => spot.spotId === selectedSpotId) ?? null;
  const selected =
    selectedFromScene ??
    (selectedFallback?.spotId === selectedSpotId ? selectedFallback : null);
  const timeFrames = scene.data?.data.timeFrames ?? [];
  const projectedAt = timePreviewing
    ? timeFrames[panelPreviewFrameIndex]?.atUtc ?? activeContext?.selectedAtUtc ?? ""
    : activeContext?.selectedAtUtc ?? "";
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
  const markerList = useMemo(
    () => markerItems(groupedMarkers, selectedSpotId, mode, preferences.largeText),
    [groupedMarkers, mode, selectedSpotId, preferences.largeText],
  );
  const projectedPolygonSource = useMemo(
    () =>
      scene.data?.data.layer
        ? projectedLayerPolygons(scene.data.data.layer, projectedFrame)
        : [],
    [projectedFrame, scene.data?.data.layer],
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
    enabled: bottomPresentation === "spot-panel" && detailContextReady,
    staleTime: 60_000,
  });
  const spotDetail = detailContextReady && selected && spotOverview.data && spotOverview.data.data.spot.spotId === selected.spotId ? spotOverview.data.data : null;
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
  const contextTimeLabel = activeContext
    ? formatContextTime(activeContext.selectedAtUtc, activeContext.timezone)
    : bootstrapContext.isError ? "解析失败" : "正在解析";
  const layerObjectiveValue =
    analysisOverlay === "LIGHT"
      ? selected?.lightPollution.state === "ESTIMATED"
        ? selected.lightPollution.label
        : "暂无数据"
      : analysisOverlay === "TOTAL_CLOUD"
        ? selectedEvaluation?.cloudPercent === null || !selectedEvaluation
          ? "暂无数据"
          : `总云 ${selectedEvaluation.cloudPercent}%`
        : analysisOverlay === "OPPORTUNITY"
          ? selectedEvaluation?.opportunityScore === null || !selectedEvaluation
            ? "暂无数据"
            : selectedEvaluation.opportunityLabel || "暂无数据"
          : "暂无数据";

  const resolveMapPoint = async (
    center: { latitude: number; longitude: number },
    source: "MAP_VIEWPORT" | "USER_LOCATION",
    displayName?: string,
  ) => {
    const resetVersion = useAppStore.getState().mapResetVersion;
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
      localDate: activeContext?.localDate ?? localDateForNow(),
      selectedAt: activeContext?.selectedAtUtc ?? null,
      eventInstanceId: activeContext?.eventInstanceId ?? null,
      targetProfile: activeContext?.targetProfile ?? "DAILY",
    }).catch((error: unknown) => {
      if (useAppStore.getState().mapResetVersion !== resetVersion || isMiniappRequestCancelled(error)) return null;
      throw error;
    });
    if (!response || useAppStore.getState().mapResetVersion !== resetVersion) return null;
    setObservationContext(response.data);
    return response.data;
  };

  const openDetail = async (spot: SpotSummary) => {
    const requestGeneration = ++detailRequestGeneration.current;
    const isCurrentRequest = () =>
      requestGeneration === detailRequestGeneration.current &&
      useAppStore.getState().selectedSpotId === spot.spotId &&
      useAppStore.getState().mapResetVersion === mapResetVersion;
    lastHandledSelectedId.current = spot.spotId;
    if (panelCloseTimer.current) clearTimeout(panelCloseTimer.current);
    extentBeforeLayer.current = null;
    setPanelPhase("idle");
    setPanelExtent("medium");
    setPanelDragOffset(0);
    setSelectedFallback(spot);
    selectSpot(spot.spotId);
    setBottomPresentation("spot-panel");
    markerTapAt.current = Date.now();
    const current = useAppStore.getState().observationContext;
    if (
      current?.location.kind === "FORMAL_SPOT" &&
      current.location.spotId === spot.spotId
    ) {
      setAnnouncement(`已选择${spot.name}；正在加载同一观测时刻的点位信息。`);
      return;
    }
    try {
      const response = await resolveObservationContext({
        location: { kind: "FORMAL_SPOT", spotId: spot.spotId },
        routeOriginContextId:
          current?.location.kind === "MAP_POINT"
            ? current.contextId
            : current?.routeOrigin?.contextId ?? null,
        localDate: current?.localDate ?? localDateForNow(spot.timezone),
        selectedAt: current?.selectedAtUtc ?? null,
        eventInstanceId: current?.eventInstanceId ?? null,
        targetProfile: current?.targetProfile ?? "DAILY",
      });
      if (!isCurrentRequest()) return;
      setObservationContext(response.data);
      setAnnouncement(`已选择${spot.name}；正在加载同一观测时刻的点位信息。`);
    } catch (error) {
      if (!isCurrentRequest() || isMiniappRequestCancelled(error)) return;
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: "观测条件未更新",
        body: `${errorMessage(error)}。地点资料仍可查看，请稍后重试观测条件。`,
        dismissible: true,
        dedupeKey: `map-formal-context:${spot.spotId}`,
      });
    }
  };

  const onMarkerTap = (
    event: BaseEventOrig<MapProps.onMarkerTapEventDetail>,
  ) => {
    const markerId = Number(event.detail.markerId);
    const group = Number.isInteger(markerId)
      ? groupedMarkers.find((item) => item.id === markerId)
      : undefined;
    if (!group) return;
    markerTapAt.current = Date.now();
    if (group.spots.length > 1) {
      setViewport({
        center: { latitude: group.latitude, longitude: group.longitude },
        zoom: Math.max(9, viewport.zoom + 2),
      });
      setAnnouncement(
        "已放大 " + String(group.spots.length) + " 个正式观星点的聚合区域。",
      );
      return;
    }
    const spot = group.spots[0]!;
    void openDetail(spot);
  };

  const openLayerSheet = () => {
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
    }, 220);
  };

  const onMapTap = () => {
    if (Date.now() - markerTapAt.current < 120) return;
    if (bottomPresentation === "layer-sheet") {
      closeLayerSheet();
      return;
    }
    if (bottomPresentation === "spot-panel") closeSpotPanel();
  };

  const onHandleTouchCancel = () => {
    stopPanelSpring();
    panelDrag.current = null;
    setPanelDragOffset(0);
    setPanelDragging(false);
  };

  useEffect(() => {
    panelDrag.current = null;
    setPanelDragOffset(0);
    setPanelDragging(false);
  }, [bottomPresentation, selectedSpotId, panelExtent]);

  useEffect(() => {
    stopPanelSpring();
  }, [bottomPresentation, selectedSpotId]);
  useEffect(() => {
    if (springTarget.current && springTarget.current !== panelExtent) stopPanelSpring();
  }, [panelExtent]);
  useEffect(() => {
    if (preferences.reducedMotion) stopPanelSpring();
  }, [preferences.reducedMotion]);

  const onHandleTouchStart = (event: unknown) => {
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
    springRequest.current += 1;
    const startX = touch?.clientX ?? touch?.pageX;
    const drag = { startY, startX: typeof startX === "number" && Number.isFinite(startX) ? startX : undefined, identifier: touch?.identifier, extent: panelExtent, samples: [{ y: startY, at: Date.now() }], releasedAt: 0, moved: false, offset: 0, pointerOffset: 0, geometry: null as PanelSnapGeometry | null, released: false };
    panelDrag.current = drag;
    setPanelDragOffset(0);
    setPanelDragging(false);
    const query = Taro.createSelectorQuery();
    for (const selector of [".spot-panel", ".spot-panel__snap-small", ".spot-panel__snap-medium", ".spot-panel__snap-large"]) query.select(selector).boundingClientRect();
    query.exec(rows => {
      if (panelDrag.current !== drag) return;
      drag.geometry = readPanelSnapGeometry(rows);
      stopPanelSpring();
      if (!drag.geometry) { onHandleTouchCancel(); return; }
      if (drag.released) { onHandleTouchEnd(); return; }
      drag.offset = drag.geometry[drag.extent] - drag.geometry.startHeight + drag.pointerOffset;
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
      drag.offset = drag.geometry[drag.extent] - drag.geometry.startHeight + offset;
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
        drag.samples = [...drag.samples, { y, at: drag.releasedAt }].slice(-12);
        drag.pointerOffset = y - drag.startY;
        if (Math.abs(drag.pointerOffset) >= 8) drag.moved = true;
      }
    }
    setPanelDragging(false);
    if (!drag.geometry) { drag.released = true; return; }
    panelDrag.current = null;
    setPanelDragOffset(0);
    if (!drag.moved || !drag.geometry || Math.abs(drag.pointerOffset) < 8) return;
    const velocity = panelReleaseVelocity(drag.samples, drag.releasedAt);
    const from = drag.geometry.startHeight - drag.pointerOffset;
    const target = releasePanelExtent(drag.geometry, from, drag.extent, velocity);
    animatePanelExtent(target, drag.geometry, from, -velocity);
  };

  const animatePanelExtent = (target: SpotPanelExtent, geometry: PanelSnapGeometry, from: number, velocity = 0) => {
    const frames = panelSpringFrames({ from, to: geometry[target], velocity,
      min: geometry.small, max: geometry.large,
      reducedMotion: useAppStore.getState().preferences.reducedMotion });
    const host: PanelAnimationHost = {
      animate: (_selector, keyframes, duration) => {
        const style = panelSpringStyle(keyframes, duration, ++panelCssSequence.current);
        setPanelCssMotion({ style });
      },
      clearAnimation: (_selector, complete) => { setPanelCssMotion(null); complete(); },
    };
    setPanelExtent(target);
    if (host && typeof host.animate === "function" && typeof host.clearAnimation === "function" && frames.length > 1) {
      springTarget.current = target;
      setPanelSettling(true);
      const request = ++springRequest.current;
      Taro.nextTick(() => {
        if (springRequest.current !== request || springTarget.current !== target) return;
        panelSpring.current.start(host, frames, () => { springTarget.current = null; setPanelSettling(false); });
      });
    }

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
    const region = userMapRegionEnd(event);
    if (!region) return;
    if (regionTimer.current) clearTimeout(regionTimer.current);
    const resetVersion = useAppStore.getState().mapResetVersion;
    regionTimer.current = setTimeout(() => {
      if (useAppStore.getState().mapResetVersion !== resetVersion) return;
      setViewport({
        center: region.center,
        ...(region.zoom === undefined ? {} : { zoom: region.zoom }),
        loadedViewport: "viewport:" + String(Date.now()),
      });
      void resolveMapPoint(region.center, "MAP_VIEWPORT").catch(
        (error) =>
          notify({
            owner: "map",
            placement: "inline",
            tone: "warning",
            title: "地图条件未更新",
            body:
              errorMessage(error) +
              "。当前显示的是上次观测条件，请刷新后再判断。",
            dismissible: true,
            dedupeKey: "map-context-region-failed",
          }),
      );
    }, 250);
  };

  const locateMap = async () => {
    if (locationRequestBusy.current) return;
    locationRequestBusy.current = true;
    const resetVersion = useAppStore.getState().mapResetVersion;
    setLocationBusy(true);
    setLocationState("REQUESTING");
    const locationNotice = (title: string, body: string, tone: "info" | "success" | "warning") =>
      notify({ owner: "map", placement: "inline", tone, title, body,
        action: undefined, dismissible: true, dedupeKey: "map-location-request" });
    locationNotice("正在获取一次位置", "只请求本次位置；地图仍可手动浏览。", "info");
    try {
      const result = await requestOneShotLocation(Taro);
      if (useAppStore.getState().mapResetVersion !== resetVersion) return;
      setLocationState(result.state);
      if (result.state !== "GRANTED") {
        notify({ owner: "map", placement: "inline", tone: "warning",
          title: result.state === "DENIED" ? "定位未授权" : "暂时无法获取位置",
          body: result.state === "DENIED"
            ? "地图位置未改动；你可以查看权限说明，或继续手动搜索。"
            : "地图位置未改动；请检查系统定位服务后重试，也可继续手动搜索。",
          action: { label: "查看权限说明", route: "/pages/auth/index" },
          dismissible: true, dedupeKey: "map-location-request" });
        return;
      }
      setViewport({ center: result.center, zoom: 10 });
      locationNotice("已定位，正在更新观测条件", "地图已移动到本次位置；天气和天文结果尚未确认。", "info");
      try {
        const context = await resolveMapPoint(result.center, "USER_LOCATION");
        if (useAppStore.getState().mapResetVersion !== resetVersion) return;
        if (context === null) {
          locationNotice("已定位，观测条件更新已取消", "请查看当前地点的条件，或重新定位。", "info");
          return;
        }
        locationNotice("观测位置已更新", "已更新地图位置和观测地点；天气、天文以各自加载状态为准。", "success");
        setAnnouncement("观测位置已更新。");
      } catch (error) {
        if (useAppStore.getState().mapResetVersion !== resetVersion) return;
        locationNotice("位置已获取，动态条件未更新",
          errorMessage(error) + "。上次观测条件不适用于当前位置，请重试。", "warning");
      }
    } finally {
      locationRequestBusy.current = false;
      setLocationBusy(false);
    }
  };

  const refreshMap = async () => {
    setAnnouncement("正在刷新当前区域");
    try {
      const refreshed = activeContext
        ? await scene.refetch()
        : await bootstrapContext.refetch();
      if (!refreshed) throw new Error("map_refresh_unavailable");
      const notificationState = useAppStore.getState();
      for (const item of notificationState.notifications) {
        if (item.owner === "map" && item.dedupeKey === "map-refresh-failed") {
          notificationState.dismissNotification(item.id);
        }
      }
      setAnnouncement(refreshed.dataState === "STALE_USABLE"
        ? "当前仍显示上次结果，尚未获取到更新。"
        : "当前区域已刷新");
    } catch {
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: "刷新未完成",
        body: "正在显示上次结果，请稍后重试。",
        dismissible: true,
        dedupeKey: "map-refresh-failed",
      });
    }
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
        current.observationContext.revision === activeContext.revision &&
        current.observationContext.contextFingerprint === activeContext.contextFingerprint;
    };
    if (!isCurrentTimeRequest()) return;
    setPanelPreviewFrameIndex(frameIndex);
    setTimePreviewing(false);
    if (Date.parse(nextTime) === Date.parse(activeContext.selectedAtUtc)) return;
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
      notify({
        owner: "map",
        placement: "inline",
        tone: "error",
        title: "观测时间未保存",
        body: `${errorMessage(error)}。仍使用已确认的观测时刻。`,
        dismissible: true,
        dedupeKey: "map-time-update-failed",
      });
    } finally {
      timeRequestBusy.current = false;
      setTimeSaving(false);
    }
  };

  const onPanelShare = async () => {
    try {
      await Taro.showShareMenu({ withShareTicket: true });
      notify({
        owner: "map",
        placement: "inline",
        tone: "success",
        title: "请从微信菜单分享",
        body: "点击右上角“…”分享此观星点。",
        dismissible: true,
        dedupeKey: "map-share-ready",
      });
    } catch (error) {
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: "系统分享暂不可用",
        body: `${errorMessage(error)}。请稍后重试。`,
        dismissible: true,
        dedupeKey: "map-share-failed",
      });
    }
  };

  const openMapPage = async (url: string, title: string, entry: string) => {
    const dedupeKey = `map-${entry}-navigation-failed`;
    try {
      await Taro.navigateTo({ url });
      const state = useAppStore.getState();
      for (const item of state.notifications) {
        if (item.owner === "map" && item.dedupeKey === dedupeKey) {
          state.dismissNotification(item.id);
        }
      }
    } catch {
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: `${title}暂未打开`,
        body: "请稍后重试，当前地点和时间已保留。",
        dismissible: true,
        dedupeKey,
      });
    }
  };

  const onPanelEvidence = (kind: "guides" | "field" | "sources", articleId?: string) => {
    if (!selected || !activeContext || !detailContextReady || !spotDetail) {
      notify({ owner: "map", placement: "inline", tone: "warning", title: "地点资料尚未就绪", body: "请稍后重试；当前地点和时间会保留。", dismissible: true, dedupeKey: "map-evidence-not-ready" });
      return;
    }
    if (articleId && !spotDetail.guides.some(guide => guide.articleId === articleId && guide.spotId === selected.spotId)) return;
    const route = articleId ? "/content/article/detail/index" : kind === "sources" ? "/spot/data-source/index" : `/spot/${kind}/index`;
    const query = `spotId=${encodeURIComponent(selected.spotId)}&contextId=${encodeURIComponent(activeContext.contextId)}`;
    void openMapPage(`${route}?${query}${articleId ? `&articleId=${encodeURIComponent(articleId)}` : ""}`, "资料页面", "evidence");
  };

  const onPanelNavigate = async () => {
    if (!selected) return;
    const operation = ++navigationEpoch.current;
    const current = () => operation === navigationEpoch.current && useAppStore.getState().selectedSpotId === selected.spotId;
    if (selected.visibilityPolicy !== "PUBLIC_EXACT") {
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: "坐标不对外开放",
        body: "该点位不允许向外部地图发送精确坐标；请查看公开的到达说明。",
        dismissible: true,
        dedupeKey: `map-navigation-restricted:${selected.spotId}`,
      });
      return;
    }
    if (
      !Number.isFinite(selected.gcj02.latitude) ||
      !Number.isFinite(selected.gcj02.longitude)
    ) {
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: "坐标暂不可用",
        body: "请先查看到达说明。",
        dismissible: true,
        dedupeKey: "map-navigation-no-coordinate",
      });
      return;
    }
    try {
      const safety = spotDetail?.accessAndSafety;
      if (safety && (safety.explicitDanger || safety.openness === "CLOSED" || safety.legalAccess === "PROHIBITED" || safety.nightSafety === "DANGER")) {
        const warning = await Taro.showModal({
          title: "当前存在出行阻断",
          content: [...safety.restrictions, ...safety.guidance].join("；") || "当前开放、进入或夜间安全状态不支持直接前往。",
          confirmText: "仍要查看",
          cancelText: "暂不前往",
        });
        if (!current() || !warning.confirm) return;
      }
      await Taro.openLocation({
        latitude: selected.gcj02.latitude,
        longitude: selected.gcj02.longitude,
        name: selected.name,
        address: selected.address,
        scale: 14,
      });
    } catch (error) {
      if (!current()) return;
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: "外部地图未打开",
        body: `${errorMessage(error)}。请稍后重试，或查看到达说明。`,
        dismissible: true,
        dedupeKey: "map-navigation-failed",
      });
    }
  };

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
        placement: "inline",
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
    void openMapPage(`/sky/detail/index?${params}`, "云观星", "sky");
  };

  const onPanelContribution = () => {
    if (!selected) return;
    void openMapPage(
      `/content/contribution/index?spotId=${encodeURIComponent(selected.spotId)}&spotName=${encodeURIComponent(selected.name)}`,
      "反馈页面",
      "contribution",
    );
  };

  useEffect(() => {
    if (!selectedSpotId) {
      lastHandledSelectedId.current = null;
      if (!pageVisible && bottomPresentation === "spot-panel") {
        setBottomPresentation("none");
      }
      return;
    }
    if (lastHandledSelectedId.current === selectedSpotId || !selected) return;
    lastHandledSelectedId.current = selectedSpotId;
    if (
      bottomPresentation !== "spot-panel" ||
      !detailContextReady ||
      activeContext?.location.kind !== "FORMAL_SPOT" ||
      activeContext.location.spotId !== selectedSpotId
    ) {
      setPanelExtent("medium");
      setPanelPhase("idle");
      setBottomPresentation("spot-panel");
      void openDetail(selected);
    }
  }, [
    activeContext,
    bottomPresentation,
    detailContextReady,
    pageVisible,
    selected,
    selectedSpotId,
  ]);

  const panelHasMedia = Boolean(
    bottomPresentation === "spot-panel" &&
      selected?.media.some(
        (media) =>
          media.state !== "EXPIRED" &&
          media.state !== "UNAVAILABLE" &&
          media.state !== "SAMPLE_DATA" &&
          Boolean(media.license.trim()) &&
          Boolean(media.thumbnailPath.trim() || media.localPath.trim()),
      ),
  );
  const panelPosition =
    bottomPresentation === "spot-panel"
      ? panelDrag.current?.geometry
        ? panelHeightProgress(panelDrag.current.geometry, panelDrag.current.geometry[panelExtent] - panelDragOffset)
        : PANEL_POSITION[panelExtent]
      : 0;
  const panelMediaReveal = panelHasMedia
    ? clampUnit((panelPosition - 0.5) / 0.28)
    : 0;
  const panelChromeOpacity =
    bottomPresentation === "spot-panel"
      ? clampUnit(1 - clampUnit((panelPosition - 0.82) / 0.12))
      : 1;
  const panelChromeHidden =
    bottomPresentation === "spot-panel" && panelChromeOpacity <= 0.08;
  let panelMediaMaxHeightRpx = 420;
  try {
    const windowInfo = Taro.getWindowInfo();
    if (
      Number.isFinite(windowInfo.windowWidth) &&
      windowInfo.windowWidth > 0 &&
      Number.isFinite(windowInfo.windowHeight) &&
      windowInfo.windowHeight > 0
    ) {
      panelMediaMaxHeightRpx = Math.min(
        420,
        Math.max(
          300,
          (27 * windowInfo.windowHeight * 750) /
            (100 * windowInfo.windowWidth),
        ),
      );
    }
  } catch {
    // The CSS fallback remains bounded when native window metrics are absent.
  }
  const panelMediaHeightRpx = Math.round(
    panelMediaMaxHeightRpx * panelMediaReveal,
  );
  const panelHandleBandHeightRpx = Math.round(40 * (1 - panelMediaReveal));
  const { safeTop: mapSafeTop } = nativeNavigationInsets();
  const mapPresentationStyle = {
    ...(mapSafeTop === undefined ? {} : { "--map-search-top": `${mapSafeTop}px` }),
    "--map-chrome-opacity": String(panelChromeOpacity),
    "--panel-media-reveal": String(panelMediaReveal),
    "--panel-media-height": `${panelMediaHeightRpx}rpx`,
    "--panel-media-margin-top": panelMediaReveal ? "-40rpx" : "0rpx",
    "--panel-handle-band-height": `${panelHandleBandHeightRpx}rpx`,
    "--panel-media-image-offset": `${Math.round(-18 * (1 - panelMediaReveal))}rpx`,
    "--panel-media-image-scale": String(1.02 - 0.02 * panelMediaReveal),
  } as CSSProperties;

  return (
    <View
      className={
        themeClass +
        " map-page location-" +
        locationState.toLowerCase().replace("_", "-") +
        (bottomPresentation === "spot-panel"
          ? ` map-page--panel-${panelExtent}`
          : "") +
        (panelMediaReveal > 0 ? " map-page--panel-media-visible" : "") +
        (panelChromeHidden ? " map-page--panel-chrome-hidden" : "")
      }
      style={mapPresentationStyle}
      data-miniapp-production-root
      data-route="map"
      data-delivery-target={__DELIVERY_TARGET__}
    >
      <FloatingNotificationHost />
      <View className="map-workspace">
        <View
          className="map-stage"
          data-control="map-marker-panel-coordinator"
        >
          <Map
            compileMode
            id="spot-map"
            className="native-map"
            latitude={viewport.center.latitude}
            longitude={viewport.center.longitude}
            scale={viewport.zoom}
            markers={markerList}
            polygons={layerPolygons}
            showLocation={locationState === "GRANTED"}
            enableZoom
            enableScroll
            enableRotate={false}
            enableOverlooking={false}
            onTap={onMapTap}
            onMarkerTap={onMarkerTap}
            onRegionChange={onRegionChange}
            onError={() => {
              setMapRuntimeError(true);
              notify({
                owner: "map",
                placement: "inline",
                tone: "error",
                title: "地图渲染失败",
                body: "地图暂时无法显示，可继续搜索观星点。",
                dismissible: true,
                dedupeKey: "map-native-render-error",
              });
            }}
            aria-label="正式观星点地图；搜索提供等价可访问结果"
          />

          <View className="map-search-anchor">
            <Button
              compileMode
              className="map-search-entry focus-ring"
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
              <Text>{finderQuery || "搜地点 / 区域 / 观星点"}</Text>
            </Button>
          </View>

          <View className="map-top-tools" aria-label="地图工具">
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
              className="map-tool focus-ring"
              aria-label="刷新当前区域"
              onClick={(event) => {
                event.stopPropagation();
                void refreshMap();
              }}
            >
              <SemanticIcon name="refresh" />
            </Button>
          </View>

          <Button
            className={
              "map-analysis-trigger focus-ring" +
              (bottomPresentation === "layer-sheet"
                ? " map-analysis-trigger--active"
                : "")
            }
            data-control="map-analysis-focus-layer"
            aria-label={`打开地图分析图层，当前${overlayLabels[analysisOverlay]}`}
            aria-pressed={bottomPresentation === "layer-sheet"}
            onClick={(event) => {
              event.stopPropagation();
              openLayerSheet();
            }}
          >
            <SemanticIcon name="conditions" />
            <Text>{overlayLabels[analysisOverlay]}</Text>
          </Button>

          <View className="map-feedback-column">
            <NotificationRegion owner="map" placement="inline" />
            {mapRuntimeError ? (
              <StatusPanel
                state="ERROR"
                detail="地图暂时无法显示，可继续搜索观星点。"
                recoveryLabel="重试地图"
                onRecover={() => setMapRuntimeError(false)}
              />
            ) : null}
            {scene.refreshError ? <StatusPanel
              state="STALE"
              detail="更新失败，暂时显示上次结果。"
              recoveryLabel="重试"
              onRecover={() => void refreshMap()}
            /> : null}
            {pageState !== "READY" &&
            pageState !== "PARTIAL" &&
            pageState !== "STALE" ? (
              <StatusPanel
                state={pageState}
                detail={
                  (bootstrapContext.isError
                    ? isOfflineError(bootstrapContext.error)
                      ? "网络不可用，已显示的数据可能过期。"
                      : errorMessage(bootstrapContext.error)
                    : scene.isError
                      ? isOfflineError(scene.error)
                        ? "网络不可用，已显示的数据可能过期。"
                        : errorMessage(scene.error)
                      : (scene.data?.warnings ?? []).join(" ")) ||
                  (pageState === "EMPTY"
                    ? "当前区域暂无正式观星点；可以移动地图或使用搜索。"
                    : "正在加载观星点。")
                }
                recoveryLabel={
                  pageState === "ERROR"
                    ? "重试"
                    : pageState === "PERMISSION_DENIED"
                      ? "查看权限说明"
                      : undefined
                }
                onRecover={
                  pageState === "ERROR"
                    ? () =>
                        void (activeContext
                          ? scene.refetch()
                          : bootstrapContext.refetch())
                    : pageState === "PERMISSION_DENIED"
                      ? () => void openMapPage("/pages/auth/index", "登录页面", "auth")
                    : undefined
                }
              />
            ) : null}
          </View>

          {bottomPresentation === "spot-panel" && selected ? (
            <View
              className={`map-panel-layer${panelSettling ? " map-panel-layer--settling" : ""}${panelDragging ? " map-panel-layer--dragging" : ""}`}
              style={
                {
                  "--panel-drag-offset": `${panelDragOffset}px`,
                  ...panelCssMotion?.style,
                } as unknown as Record<string, string>
              }
              onClick={(event) => event.stopPropagation()}
            >
              <SpotInformationPanel
                settling={panelSettling}
                springMotion={panelCssMotion}
                visible={pageVisible}
                spot={selected}
                detail={spotDetail}
                detailPending={spotOverview.isPending}
                detailError={spotOverview.error ?? spotOverview.refreshError}
                detailStale={spotOverview.data?.dataState === "STALE_USABLE"}
                extent={panelExtent}
                phase={panelPhase}
                favorite={favoriteIds.includes(selected.spotId)}
                context={activeContext}
                evaluation={selectedEvaluation}
                timeFrames={timeFrames}
                timeSaving={timeSaving}
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
                onExtent={onPanelExtent}
                onClose={closeSpotPanel}
                onRecover={() => void spotOverview.refetch()}
                onFavorite={() => void toggleFavorite(selected.spotId)}
                onShare={() => void onPanelShare()}
                onCloud={onPanelCloud}
                onNavigate={() => void onPanelNavigate()}
                onContribution={onPanelContribution}
                onEvidence={onPanelEvidence}
              />
            </View>
          ) : null}

          {bottomPresentation === "layer-sheet" ? (
            <View
              className="map-layer-layer"
              onClick={(event) => event.stopPropagation()}
            >
              <View
                className="map-layer-sheet"
                data-control="map-layer-selector"
                role="dialog"
                aria-label="地图分析图层"
              >
                <View className="map-layer-sheet__summary">
                  <Text className="type-label">地图分析</Text>
                  <Text className="type-caption">
                    {contextTimeLabel} · {overlayLabels[analysisOverlay]} · {layerObjectiveValue}
                  </Text>
                </View>
                <View
                  className="map-layer-sheet__choices"
                  role="radiogroup"
                  aria-label="分析图层选择"
                >
                  {(["LIGHT", "TOTAL_CLOUD", "OPPORTUNITY"] as const).map(
                    (overlay) => (
                      <Button
                        key={overlay}
                        className={
                          "map-layer-sheet__choice" +
                          (analysisOverlay === overlay
                            ? " map-layer-sheet__choice--active"
                            : "")
                        }
                        disabled={
                          !activeContext || scene.isPending || timeSaving
                        }
                        aria-checked={analysisOverlay === overlay}
                        aria-pressed={analysisOverlay === overlay}
                        aria-label={
                          overlayLabels[overlay] +
                          (analysisOverlay === overlay ? "，已选择" : "")
                        }
                        onClick={() => {
                          setAnalysisOverlay(overlay);
                          setAnnouncement(
                            `已选择${overlayLabels[overlay]}。`,
                          );
                        }}
                      >
                        <Text>{overlayLabels[overlay]}</Text>
                        <Text className="type-caption">
                          {overlay === "LIGHT"
                            ? "版本化夜光估算"
                            : overlay === "TOTAL_CLOUD"
                              ? "当前观测时刻"
                              : "当前观测窗口"}
                        </Text>
                      </Button>
                    ),
                  )}
                </View>
                {analysisOverlay !== "NONE" && scene.data?.data.layer?.legend.length ? (
                  <View className="map-layer-sheet__legend" aria-label="当前图层图例">
                    {scene.data.data.layer.legend.slice(0, 4).map((item) => (
                      <View className="map-layer-sheet__legend-item" key={`${item.label}-${item.range}`}>
                        <View
                          className="map-layer-sheet__legend-swatch"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        <Text className="type-caption">{item.label} · {item.range}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <MapTimeRuler
                  frames={timeFrames}
                  selectedAt={activeContext?.selectedAtUtc ?? ""}
                  timezone={activeContext?.timezone ?? "Asia/Shanghai"}
                  disabled={
                    !activeContext || !timeFrames.length || timeSaving
                  }
                  onPreview={(index) => {
                    setPanelPreviewFrameIndex(index);
                    setTimePreviewing(true);
                  }}
                  onCommit={(index) => void commitMapTime(index)}
                  onCancel={() => setTimePreviewing(false)}
                />
              </View>
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
        <Text>{contextTimeLabel}</Text>
      </View>
    </View>
  );
}
