import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import {
  Button,
  Map,
  Text,
  View,
} from "@tarojs/components";
import type { BaseEventOrig, MapProps } from "@tarojs/components";
import { useEffect, useMemo, useRef, useState } from "react";
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

const MAP_MARKER_PALETTE: Record<
  DisplayMode,
  { selected: string; text: string; surface: string; border: string }
> = {
  DAY: {
    selected: "#536DFE",
    text: "#111827",
    surface: "#FFFFFF",
    border: "#536DFE",
  },
  NIGHT: {
    selected: "#7E8FFF",
    text: "#EEF2FF",
    surface: "#0B1222",
    border: "#7E8FFF",
  },
  OBSERVATION: {
    selected: "#FF3B30",
    text: "#FF6A58",
    surface: "#120000",
    border: "#FF3B30",
  },
};

const MAP_MARKER_ICONS: Record<
  DisplayMode,
  { regular: string; selected: string }
> = {
  DAY: {
    regular: "/assets/icons/spot-marker.png",
    selected: "/assets/icons/spot-marker-selected.png",
  },
  NIGHT: {
    regular: "/assets/icons/spot-marker-night.png",
    selected: "/assets/icons/spot-marker-selected-night.png",
  },
  OBSERVATION: {
    regular: "/assets/icons/spot-marker-observation.png",
    selected: "/assets/icons/spot-marker-selected-observation.png",
  },
};

interface MarkerGroup {
  id: number;
  latitude: number;
  longitude: number;
  spots: readonly SpotSummary[];
}

function markerGroups(
  spots: readonly SpotSummary[],
  zoom: number,
): MarkerGroup[] {
  if (zoom >= 9) {
    return spots.map((spot, index) => ({
      id: index + 1,
      latitude: spot.gcj02.latitude,
      longitude: spot.gcj02.longitude,
      spots: [spot],
    }));
  }
  const cellSize = zoom <= 7 ? 1.2 : 0.55;
  const cells = new globalThis.Map<string, SpotSummary[]>();
  for (const spot of spots) {
    const key =
      String(Math.round(spot.gcj02.latitude / cellSize)) +
      ":" +
      String(Math.round(spot.gcj02.longitude / cellSize));
    const cell = cells.get(key) ?? [];
    cell.push(spot);
    cells.set(key, cell);
  }
  return [...cells.values()].map((items, index) => ({
    id: index + 1,
    latitude:
      items.reduce((sum, spot) => sum + spot.gcj02.latitude, 0) / items.length,
    longitude:
      items.reduce((sum, spot) => sum + spot.gcj02.longitude, 0) / items.length,
    spots: items,
  }));
}

function markerItems(
  groups: readonly MarkerGroup[],
  selectedSpotId: string | null,
  mode: DisplayMode,
) {
  const palette = MAP_MARKER_PALETTE[mode];
  const icons = MAP_MARKER_ICONS[mode];
  return groups.map((group) => {
    const spot = group.spots[0]!;
    const clustered = group.spots.length > 1;
    const selected = group.spots.some((item) => item.spotId === selectedSpotId);
    return {
      id: group.id,
      latitude: group.latitude,
      longitude: group.longitude,
      iconPath: selected ? icons.selected : icons.regular,
      width: selected || clustered ? 38 : 30,
      height: selected || clustered ? 42 : 34,
      anchor: { x: 0.5, y: 1 },
      alpha: 0.96,
      label: {
        content: clustered
          ? String(group.spots.length)
          : String(group.id).padStart(2, "0"),
        color: selected ? palette.selected : palette.text,
        fontSize: selected || clustered ? 13 : 18,
        bgColor: palette.surface,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: 12,
        padding: 5,
        anchorX: 0,
        anchorY: selected ? -48 : -40,
        textAlign: "center" as const,
      },
      ...(clustered
        ? {
            callout: {
              content: String(group.spots.length) + " 个正式观星点，点击放大",
              color: palette.text,
              fontSize: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: palette.border,
              bgColor: palette.surface,
              padding: 6,
              anchorX: 0,
              anchorY: 0,
              display: "BYCLICK" as const,
              textAlign: "center" as const,
            },
          }
        : {}),
      ariaLabel: clustered
        ? String(group.spots.length) + " 个正式观星点的聚合标记，点击放大"
        : spot.name + "，" + (selected ? "已选择" : "未选择") + "，正式观星点",
    };
  });
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
  const [pageVisible, setPageVisible] = useState(true);
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
  const [selectedFallback, setSelectedFallback] =
    useState<SpotSummary | null>(null);
  const [panelPreviewFrameIndex, setPanelPreviewFrameIndex] = useState(0);
  const [timePreviewing, setTimePreviewing] = useState(false);
  const panelCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markerTapAt = useRef(0);
  const panelDrag = useRef<{
    startY: number;
    extent: SpotPanelExtent;
    moved: boolean;
    offset: number;
  } | null>(null);
  const lastHandledSelectedId = useRef<string | null>(null);
  const extentBeforeLayer = useRef<{
    extent: SpotPanelExtent;
    selectedSpotId: string | null;
  } | null>(null);

  useDidShow(() => setPageVisible(true));
  useDidHide(() => setPageVisible(false));

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
    const currentContext = useAppStore.getState().observationContext;
    if (
      pageVisible &&
      bootstrapContext.data?.data &&
      (currentContext?.contextId !== bootstrapContext.data.data.contextId ||
        currentContext.revision !== bootstrapContext.data.data.revision ||
        currentContext.contextFingerprint !==
          bootstrapContext.data.data.contextFingerprint)
    )
      setObservationContext(bootstrapContext.data.data);
  }, [
    bootstrapContext.data?.data,
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
  const projectedFrame = timeFrames.length
    ? (timeFrames[nearestMapTimeFrameIndex(timeFrames, projectedAt)] ?? null)
    : null;
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
    () => markerItems(groupedMarkers, selectedSpotId, mode),
    [groupedMarkers, mode, selectedSpotId],
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
  const selectedEvaluation = selected
    ? projectedEvaluations[selected.spotId] ?? null
    : null;
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
  const spotDetail = spotOverview.data?.data ?? null;
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
      if (
        useAppStore.getState().selectedSpotId !== spot.spotId ||
        useAppStore.getState().mapResetVersion !== mapResetVersion
      )
        return;
      setObservationContext(response.data);
      setAnnouncement(`已选择${spot.name}；正在加载同一观测时刻的点位信息。`);
    } catch (error) {
      if (isMiniappRequestCancelled(error)) return;
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: "点位上下文未更新",
        body: `${errorMessage(error)}。已保留正式点位摘要，动态条件不会被伪造。`,
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

  const onHandleTouchStart = (event: unknown) => {
    if (bottomPresentation !== "spot-panel") return;
    if (!event || typeof event !== "object") return;
    const value = event as {
      touches?: readonly { clientY?: number; pageY?: number }[];
      changedTouches?: readonly { clientY?: number; pageY?: number }[];
    };
    const touch = value.touches?.[0] ?? value.changedTouches?.[0];
    const startY = touch?.clientY ?? touch?.pageY;
    if (typeof startY !== "number" || !Number.isFinite(startY)) return;
    panelDrag.current = { startY, extent: panelExtent, moved: false, offset: 0 };
    setPanelDragOffset(0);
  };

  const onHandleTouchMove = (event: unknown) => {
    const drag = panelDrag.current;
    if (!drag || !event || typeof event !== "object") return;
    const value = event as {
      touches?: readonly { clientY?: number; pageY?: number }[];
      changedTouches?: readonly { clientY?: number; pageY?: number }[];
    };
    const touch = value.touches?.[0] ?? value.changedTouches?.[0];
    const y = touch?.clientY ?? touch?.pageY;
    if (typeof y !== "number" || !Number.isFinite(y)) return;
    const offset = y - drag.startY;
    if (Math.abs(offset) > 6) drag.moved = true;
    drag.offset = Math.max(-120, Math.min(120, offset));
    setPanelDragOffset(drag.offset);
  };

  const onHandleTouchEnd = () => {
    const drag = panelDrag.current;
    panelDrag.current = null;
    if (!drag) return;
    const offset = drag.offset;
    setPanelDragOffset(0);
    if (!drag.moved || Math.abs(offset) < 8) return;
    const extents: readonly SpotPanelExtent[] = ["small", "medium", "large"];
    const current = extents.indexOf(drag.extent);
    const next =
      offset < 0
        ? Math.min(current + 1, extents.length - 1)
        : Math.max(current - 1, 0);
    setPanelExtent(extents[next]!);
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
              "。当前地图仍可浏览，但动态条件保持上一份上下文。",
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
      locationNotice("已获取位置，正在更新观测上下文", "地图已移动到本次位置；天气和天文结果尚未确认。", "info");
      try {
        const context = await resolveMapPoint(result.center, "USER_LOCATION");
        if (useAppStore.getState().mapResetVersion !== resetVersion) return;
        if (context === null) {
          locationNotice("位置已获取，本次上下文更新已停止", "不再等待本次更新；请以当前地图地点和各项加载状态为准。", "info");
          return;
        }
        locationNotice("位置与观测上下文已更新", "已更新地图位置和观测地点；天气、天文以各自加载状态为准。", "success");
        setAnnouncement("已获取本次位置并更新观测上下文，天气和天文以各自加载状态为准。");
      } catch (error) {
        if (useAppStore.getState().mapResetVersion !== resetVersion) return;
        locationNotice("位置已获取，动态条件未更新",
          errorMessage(error) + "。地图仍可浏览，但旧观测上下文不能作为当前位置结果。", "warning");
      }
    } finally {
      locationRequestBusy.current = false;
      setLocationBusy(false);
    }
  };

  const refreshMap = async () => {
    setAnnouncement("正在刷新当前区域；地图中心、筛选和选点保持不变。");
    try {
      const refreshed = activeContext
        ? await scene.refetch()
        : await bootstrapContext.refetch();
      if (!refreshed) throw new Error("map_refresh_unavailable");
      setAnnouncement("当前区域已刷新；地图任务状态保持不变。");
    } catch {
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: "刷新未完成",
        body: "已保留缓存点位、地图中心、筛选和当前选点。",
        dismissible: true,
        dedupeKey: "map-refresh-failed",
      });
    }
  };

  const commitMapTime = async (frameIndex: number) => {
    const nextTime = timeFrames[frameIndex]?.atUtc;
    if (!activeContext || !nextTime || timeSaving) return;
    setPanelPreviewFrameIndex(frameIndex);
    setTimePreviewing(false);
    if (Date.parse(nextTime) === Date.parse(activeContext.selectedAtUtc)) return;
    setTimeSaving(true);
    try {
      const response = await updateObservationContext(activeContext, {
        selectedAt: nextTime,
      });
      setObservationContext(response.data);
      setPanelPreviewFrameIndex(
        nearestMapTimeFrameIndex(timeFrames, response.data.selectedAtUtc),
      );
      setAnnouncement(
        `已提交观测时间${formatContextTime(
          response.data.selectedAtUtc,
          response.data.timezone,
        )}；动态图层与面板使用同一上下文。`,
      );
    } catch (error) {
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
        title: "已启用系统分享",
        body: "请使用微信系统菜单分享当前正式观星点。",
        dismissible: true,
        dedupeKey: "map-share-ready",
      });
    } catch (error) {
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: "系统分享暂不可用",
        body: `${errorMessage(error)}。点位选择和地图状态不受影响。`,
        dismissible: true,
        dedupeKey: "map-share-failed",
      });
    }
  };

  const onPanelNavigate = async () => {
    if (!selected) return;
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
        body: "没有发送未经确认的坐标。",
        dismissible: true,
        dedupeKey: "map-navigation-no-coordinate",
      });
      return;
    }
    try {
      await Taro.openLocation({
        latitude: selected.gcj02.latitude,
        longitude: selected.gcj02.longitude,
        name: selected.name,
        address: selected.address,
        scale: 14,
      });
    } catch (error) {
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: "外部地图未打开",
        body: `${errorMessage(error)}。没有把直线距离当作路线。`,
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
        title: "云观星上下文未就绪",
        body: "需要同一正式点位的观测上下文；请稍后重试。",
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
    void Taro.navigateTo({ url: `/sky/detail/index?${params}` });
  };

  const onPanelContribution = () => {
    if (!selected) return;
    void Taro.navigateTo({
      url: `/content/contribution/index?spotId=${encodeURIComponent(
        selected.spotId,
      )}&spotName=${encodeURIComponent(selected.name)}`,
    });
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

  const panelMediaVisible = Boolean(
    bottomPresentation === "spot-panel" &&
      panelExtent === "large" &&
      selected?.media.some(
        (media) =>
          media.state !== "EXPIRED" &&
          media.state !== "UNAVAILABLE" &&
          media.state !== "SAMPLE_DATA" &&
          Boolean(media.license.trim()) &&
          Boolean(media.thumbnailPath.trim() || media.localPath.trim()),
      ),
  );

  return (
    <View
      className={
        themeClass +
        " map-page location-" +
        locationState.toLowerCase().replace("_", "-") +
        (bottomPresentation === "spot-panel"
          ? ` map-page--panel-${panelExtent}`
          : "") +
        (panelMediaVisible ? " map-page--panel-media-visible" : "")
      }
      data-miniapp-production-root
      data-route="map"
      data-delivery-target={__DELIVERY_TARGET__}
    >
      <View className="map-workspace">
        <View
          className="map-stage"
          data-control="map-marker-panel-coordinator"
        >
          <Map
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
                body: "原生地图当前无法渲染；搜索、正式点位状态和恢复路径仍保留。",
                dismissible: true,
                dedupeKey: "map-native-render-error",
              });
            }}
            aria-label="正式观星点地图；搜索提供等价可访问结果"
          />
          <View
            className="map-map-canvas-marker"
            data-control="sky-map-canvas"
            aria-hidden="true"
          />

          <View className="map-search-anchor">
            <Button
              className="map-search-entry focus-ring"
              data-control="map-search-entry"
              aria-label={
                finderQuery
                  ? `搜索地点、区域或正式观星点，当前输入${finderQuery}`
                  : "搜索地点、区域或正式观星点"
              }
              onClick={(event) => {
                event.stopPropagation();
                void Taro.navigateTo({ url: "/spot/search/index" });
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
                detail="原生地图当前无法渲染；地图搜索与正式点位状态仍可使用。"
                recoveryLabel="重试地图"
                onRecover={() => setMapRuntimeError(false)}
              />
            ) : null}
            {pageState !== "READY" ? (
              <StatusPanel
                state={pageState}
                detail={
                  (bootstrapContext.isError
                    ? isOfflineError(bootstrapContext.error)
                      ? "当前网络不可用；保留地图中心和现有选点，不把旧数据当作当前条件。"
                      : errorMessage(bootstrapContext.error)
                    : scene.isError
                      ? isOfflineError(scene.error)
                        ? "当前网络不可用；保留已返回的正式点位和地图状态。"
                        : errorMessage(scene.error)
                      : (scene.data?.warnings ?? []).join(" ")) ||
                  (pageState === "EMPTY"
                    ? "当前区域暂无正式观星点；可以移动地图或使用搜索。"
                    : pageState === "PARTIAL"
                      ? "部分正式点位或动态条件已返回，缺失值会明确标注。"
                      : "正在解析地图上下文并加载正式点位与来源。")
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
                      ? () => void Taro.navigateTo({ url: "/pages/auth/index" })
                    : undefined
                }
              />
            ) : null}
          </View>

          {bottomPresentation === "spot-panel" && selected ? (
            <View
              className="map-panel-layer"
              style={
                {
                  "--panel-drag-offset": `${panelDragOffset}px`,
                } as unknown as Record<string, string>
              }
              onClick={(event) => event.stopPropagation()}
            >
              <SpotInformationPanel
                spot={selected}
                detail={spotDetail}
                detailPending={spotOverview.isPending}
                detailError={spotOverview.error}
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
                onHandleTouchStart={onHandleTouchStart}
                onHandleTouchMove={onHandleTouchMove}
                onHandleTouchEnd={onHandleTouchEnd}
                onExtent={setPanelExtent}
                onClose={closeSpotPanel}
                onRecover={() => void spotOverview.refetch()}
                onFavorite={() => void toggleFavorite(selected.spotId)}
                onShare={() => void onPanelShare()}
                onCloud={onPanelCloud}
                onNavigate={() => void onPanelNavigate()}
                onContribution={onPanelContribution}
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
                            `已选择${overlayLabels[overlay]}；地图底图与正式点位保持不变。`,
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
