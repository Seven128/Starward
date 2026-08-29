import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import {
  Button,
  Input,
  Map,
  ScrollView,
  Slider,
  Text,
  View,
} from "@tarojs/components";
import type { BaseEventOrig, MapProps } from "@tarojs/components";
import { useEffect, useMemo, useRef, useState } from "react";
import { gcj02ToWgs84 } from "@starward/coordinate-system";
import {
  FILTER_GROUPS,
  FILTER_OPTIONS,
  countAppliedFilters,
  type DarkSkyCandidateRef,
  type DisplayMode,
  type FilterOptionId,
  type MapLayerKind,
  type OrdinaryPlaceRef,
  type SpotSummary,
} from "@starward/miniapp-contracts";
import { NotificationRegion } from "@/components/notification";
import { SelectedCardStar } from "@/components/selected-card-star";
import { FilterSheet, QuickFilterChip } from "@/components/filter-sheet";
import { SemanticIcon } from "@/components/semantic-asset";
import { SoftButton } from "@/components/soft-button";
import { SourceLiftFocusLayer } from "@/components/source-lift-focus-layer";
import { SpotCard } from "@/components/spot-card";
import { StatusPanel } from "@/components/status-panel";
import { useFavoriteMutation } from "@/hooks/use-favorite-mutation";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  errorMessage,
  getMapScene,
  resolveObservationContext,
  restoreObservationContext,
  searchPlaces,
  updateObservationContext,
} from "@/services/api-client";
import { useAppStore, type AnalysisOverlay } from "@/state/app-store";
import {
  nearestMapTimeFrameIndex,
  projectedLayerPolygons,
  projectMapEvaluations,
} from "./map-time-frame";
import "./index.scss";
import { useMapChrome } from "./use-map-chrome";
import { calendarDateInTimezone } from "@/utils/zoned-date";
import { requestOneShotLocation } from "@/services/one-shot-location";
import { isMiniappRequestCancelled } from "@/services/request-lifecycle";
import { userMapRegionEnd } from "./map-region-event";

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

function groupByCity(spots: readonly SpotSummary[]) {
  const groups = new globalThis.Map<string, SpotSummary[]>();
  for (const spot of spots) {
    const list = groups.get(spot.region) ?? [];
    list.push(spot);
    groups.set(spot.region, list);
  }
  return [...groups.entries()];
}

const overlayLabels: Record<AnalysisOverlay, string> = {
  NONE: "无叠加",
  LIGHT: "光害",
  TOTAL_CLOUD: "总云量",
  OPPORTUNITY: "今晚观测条件",
};

const QUICK_FILTER_IDS: readonly FilterOptionId[] = [
  "tonightRecommended",
  "distanceDriveTime",
  "hikingDifficulty",
];

const QUICK_FILTER_LABELS: Readonly<Partial<Record<FilterOptionId, string>>> = {
  tonightRecommended: "今晚推荐",
  distanceDriveTime: "2 小时内",
  hikingDifficulty: "少步行",
};

export default function MapPage() {
  const themeClass = useThemeClass();
  const mode = useAppStore((state) => state.mode);
  const committedFilters = useAppStore((state) => state.committedFilters);
  const draftFilters = useAppStore((state) => state.draftFilters);
  const filterSnapshot = useAppStore((state) => state.filterSnapshot);
  const filterSheetOpen = useAppStore((state) => state.filterSheetOpen);
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
  const searchHistory = useAppStore((state) => state.searchHistory);
  const sourceLift = useAppStore((state) => state.sourceLift);
  const setFinderQuery = useAppStore((state) => state.setFinderQuery);
  const setObservationContext = useAppStore(
    (state) => state.setObservationContext,
  );
  const setAnalysisOverlay = useAppStore((state) => state.setAnalysisOverlay);
  const setViewport = useAppStore((state) => state.setViewport);
  const mapResetVersion = useAppStore((state) => state.mapResetVersion);
  const selectSpot = useAppStore((state) => state.selectSpot);
  const setLocationState = useAppStore((state) => state.setLocationState);
  const openSourceLift = useAppStore((state) => state.openSourceLift);
  const closeSourceLift = useAppStore((state) => state.closeSourceLift);
  const openFilters = useAppStore((state) => state.openFilters);
  const revertFilters = useAppStore((state) => state.revertFilters);
  const cancelFilters = useAppStore((state) => state.cancelFilters);
  const toggleDraftFilter = useAppStore((state) => state.toggleDraftFilter);
  const applyFilters = useAppStore((state) => state.applyFilters);
  const addSearchHistory = useAppStore((state) => state.addSearchHistory);
  const clearSearchHistory = useAppStore((state) => state.clearSearchHistory);
  const notify = useAppStore((state) => state.notify);
  const { toggleFavorite } = useFavoriteMutation();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [finderExtent, setFinderExtent] = useState<
    "closed" | "peek" | "expanded"
  >("closed");
  const [debouncedFinderQuery, setDebouncedFinderQuery] = useState("");
  const [wantedOpen, setWantedOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);
  const [mapRuntimeError, setMapRuntimeError] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [conditionDraftAt, setConditionDraftAt] = useState("");
  const [conditionDraftFrameIndex, setConditionDraftFrameIndex] = useState(0);
  const [conditionDraftOverlay, setConditionDraftOverlay] =
    useState<AnalysisOverlay>("NONE");
  const [conditionsSaving, setConditionsSaving] = useState(false);
  const [conditionPreviewing, setConditionPreviewing] = useState(false);
  const [conditionDisclosureOpen, setConditionDisclosureOpen] =
    useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [locationBusy, setLocationBusy] = useState(false);
  const locationRequestBusy = useRef(false);
  const regionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const placeSearch = useResourceQuery({
    queryKey: ["place-search", debouncedFinderQuery],
    queryFn: (signal) => searchPlaces(debouncedFinderQuery, signal),
    enabled:
      pageVisible &&
      suggestionsOpen &&
      !filterSheetOpen &&
      debouncedFinderQuery.length > 0,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const ids = scene.data?.data.favoriteSpotIds;
    if (ids) useAppStore.getState().replaceFavoriteIds(ids);
  }, [scene.data?.data.favoriteSpotIds]);

  useEffect(() => {
    if (sourceLift.owner === "CONDITIONS" && sourceLift.phase === "LIFTING") {
      if (!activeContext) return;
      const next = activeContext.selectedAtUtc;
      const frames = scene.data?.data.timeFrames ?? [];
      const frameIndex = nearestMapTimeFrameIndex(frames, next);
      setConditionDraftAt(frames[frameIndex]?.atUtc ?? next);
      setConditionDraftFrameIndex(frameIndex);
      setConditionDraftOverlay(analysisOverlay);
      setConditionPreviewing(false);
      setConditionDisclosureOpen(false);
    }
  }, [
    activeContext,
    analysisOverlay,
    scene.data?.data.timeFrames,
    sourceLift.owner,
    sourceLift.phase,
  ]);

  useEffect(
    () => () => {
      if (regionTimer.current) clearTimeout(regionTimer.current);
    },
    [],
  );

  const spots = scene.data?.data.spots ?? [];
  const selected = spots.find((spot) => spot.spotId === selectedSpotId) ?? null;
  const timeFrames = scene.data?.data.timeFrames ?? [];
  const projectedAt =
    sourceLift.owner === "CONDITIONS" && conditionDraftAt
      ? conditionDraftAt
      : (activeContext?.selectedAtUtc ?? "");
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
  const wanted = spots.filter((spot) => favoriteIds.includes(spot.spotId));
  const other = spots.filter((spot) => !favoriteIds.includes(spot.spotId));
  const suggestions = (
    placeSearch.data?.data.formalSpots ??
    spots.filter(
      (spot) =>
        debouncedFinderQuery.length > 0 &&
        (spot.name + spot.region + spot.address).includes(debouncedFinderQuery),
    )
  ).slice(0, 5);
  const candidateSuggestions = placeSearch.data?.data.candidates ?? [];
  const ordinarySuggestions = placeSearch.data?.data.ordinaryPlaces ?? [];
  const pageState = bootstrapContext.isError
    ? "ERROR"
    : !activeContext || scene.isPending
    ? "LOADING"
    : scene.isError
      ? "ERROR"
      : spots.length === 0
        ? "EMPTY"
        : scene.data?.dataState === "STALE_USABLE"
          ? "STALE"
          : scene.data?.dataState === "PARTIAL"
            ? "PARTIAL"
            : "READY";
  const finderActive = sourceLift.owner === "FINDER";
  const finderExpanded = finderActive && finderExtent === "expanded";
  const filterDraftDirty = FILTER_GROUPS.some(({ key }) => {
    const draft = draftFilters[key];
    const snapshot = filterSnapshot[key];
    return (
      draft.length !== snapshot.length ||
      draft.some((value, index) => value !== snapshot[index])
    );
  });
  const conditionsExpanded = sourceLift.owner === "CONDITIONS";
  const mapChromeStyle = useMapChrome(`${themeClass}:${sourceLift.phase}:${finderActive}:${conditionsExpanded}:${pageState}`);
  const contextTimeLabel = activeContext
    ? formatContextTime(activeContext.selectedAtUtc, activeContext.timezone)
    : bootstrapContext.isError ? "解析失败" : "正在解析";
  const sceneEvaluations = Object.values(projectedEvaluations);
  const representativeSpot = selected ?? spots[0] ?? null;
  const representativeEvaluation = representativeSpot
    ? (projectedEvaluations[representativeSpot.spotId] ?? null)
    : null;
  const cloudValues = sceneEvaluations
    .map((evaluation) => evaluation.cloudPercent)
    .filter((value): value is number => value !== null);
  const averageCloud = cloudValues.length
    ? Math.round(
        cloudValues.reduce((sum, value) => sum + value, 0) /
          cloudValues.length,
      )
    : null;
  const favorableCount = sceneEvaluations.filter(
    (evaluation) => evaluation.opportunityEligible,
  ).length;
  const moonImpact = representativeEvaluation?.moonImpact ?? "UNKNOWN";
  const moonImpactLabel = {
    LOW: "较低",
    MEDIUM: "中等",
    HIGH: "较高",
    UNKNOWN: "暂无数据",
  }[moonImpact];
  const moonImpactMeter = {
    LOW: 28,
    MEDIUM: 58,
    HIGH: 86,
    UNKNOWN: 0,
  }[moonImpact];
  const lightBand = representativeSpot?.lightPollution.productBand ?? null;
  const lightMeter = lightBand
    ? {
        VERY_LOW: 92,
        LOW: 76,
        MODERATE: 56,
        HIGH: 34,
        VERY_HIGH: 16,
      }[lightBand]
    : 0;
  const conditionMetrics = [
    {
      label: "光害估算 / 暗度",
      value:
        representativeSpot?.lightPollution.state === "ESTIMATED"
          ? representativeSpot.lightPollution.label
          : "暂无数据",
      meter: lightMeter,
    },
    {
      label: "总云",
      value: averageCloud === null ? "暂无数据" : `${averageCloud}%`,
      meter: averageCloud ?? 0,
    },
    {
      label: "月亮影响",
      value: moonImpactLabel,
      meter: moonImpactMeter,
    },
    {
      label: "今晚观测条件 / 稳定性",
      value: sceneEvaluations.length
        ? `可考虑 ${favorableCount}/${sceneEvaluations.length}`
        : "暂无数据",
      meter: sceneEvaluations.length
        ? Math.round((favorableCount / sceneEvaluations.length) * 100)
        : 0,
    },
  ];
  const conditionKeyMetric =
    analysisOverlay === "LIGHT"
      ? representativeSpot?.lightPollution.state === "ESTIMATED"
        ? representativeSpot.lightPollution.label
        : "光害暂无数据"
      : analysisOverlay === "TOTAL_CLOUD"
        ? averageCloud === null
          ? "总云暂不可用"
          : `总云 ${averageCloud}%`
        : analysisOverlay === "OPPORTUNITY"
          ? sceneEvaluations.length
            ? `可考虑 ${favorableCount}/${sceneEvaluations.length}`
            : "条件暂不可用"
          : `${spots.length} 个正式点 · 无叠加`;
  const conditionMaxFrameIndex = Math.max(0, timeFrames.length - 1);

  const openFinder = () => {
    if (finderActive) {
      if (finderExtent === "peek") {
        setFinderExtent("expanded");
        setSuggestionsOpen(false);
      }
      return;
    }
    if (sourceLift.owner) return;
    setFinderExtent("peek");
    openSourceLift("FINDER");
    setSuggestionsOpen(false);
  };

  const toggleFinderExtent = () => {
    if (!finderActive) return;
    if (finderExtent === "expanded") {
      setSuggestionsOpen(false);
      setFinderExtent("peek");
    } else {
      setFinderExtent("expanded");
    }
  };

  const applyQuickFilter = (optionId: FilterOptionId) => {
    const option = FILTER_OPTIONS.find((item) => item.id === optionId);
    if (!option || (sourceLift.owner && sourceLift.owner !== "FINDER")) return;
    if (!finderActive) {
      setFinderExtent("peek");
      openSourceLift("FINDER");
    }
    cancelFilters();
    openFilters();
    toggleDraftFilter(option.id);
    applyFilters();
    setSuggestionsOpen(false);
    setAnnouncement(`${option.label}已提交；Finder 保持在 peek。`);
  };

  const selectFinderResult = (spot: SpotSummary) => {
    selectSpot(spot.spotId);
    setViewport({ center: spot.gcj02, zoom: Math.max(12, viewport.zoom) });
    if (finderQuery.trim()) addSearchHistory(finderQuery);
    setSuggestionsOpen(false);
    setFinderExtent("closed");
    closeSourceLift("FINDER", {
      restoreMap: false,
      discardFilterDraft: true,
    });
    setAnnouncement("已选择 " + spot.name + "；地图已回到同一正式点位。");
  };

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

  const selectMapReference = async (
    result: OrdinaryPlaceRef | DarkSkyCandidateRef,
  ) => {
    const center = {
      latitude: result.location.latitude,
      longitude: result.location.longitude,
    };
    selectSpot(null);
    setViewport({ center, zoom: Math.max(12, viewport.zoom) });
    if (finderQuery.trim()) addSearchHistory(finderQuery);
    setSuggestionsOpen(false);
    setFinderExtent("closed");
    closeSourceLift("FINDER", {
      restoreMap: false,
      discardFilterDraft: true,
    });
    try {
      if (!await resolveMapPoint(center, "MAP_VIEWPORT", result.label)) return;
      setAnnouncement(
        "地图已移动到 " + result.label + "；正在显示附近正式观星点。",
      );
    } catch {
      notify({
        owner: "finder",
        placement: "inline",
        tone: "warning",
        title: "地图已移动，动态条件未更新",
        body: "仍可查看附近正式观星点；当前地点不会被当作正式观星点或生成今晚结论。",
        dismissible: true,
        dedupeKey: "finder-map-reference-context-failed",
      });
    }
  };

  const openDetail = async (spot: SpotSummary) => {
    try {
      const response = await resolveObservationContext({
        location: { kind: "FORMAL_SPOT", spotId: spot.spotId },
        routeOriginContextId:
          activeContext?.location.kind === "MAP_POINT"
            ? activeContext.contextId
            : activeContext?.routeOrigin?.contextId ?? null,
        localDate: activeContext?.localDate ?? localDateForNow(spot.timezone),
        selectedAt: activeContext?.selectedAtUtc ?? null,
        eventInstanceId: activeContext?.eventInstanceId ?? null,
        targetProfile: activeContext?.targetProfile ?? "DAILY",
      });
      setObservationContext(response.data);
      await Taro.navigateTo({
        url:
          "/spot/detail/index?spotId=" +
          encodeURIComponent(spot.spotId) +
          "&contextId=" +
          encodeURIComponent(response.data.contextId),
      });
    } catch (error) {
      notify({
        owner: "map",
        placement: "inline",
        tone: "error",
        title: "暂时无法打开详情",
        body:
          errorMessage(error) +
          "。地图选点和筛选保持不变，可稍后重试。",
        dismissible: true,
        dedupeKey: "map-open-detail:" + spot.spotId,
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
    selectSpot(spot.spotId);
    setAnnouncement(
      "已选择 " + spot.name + "；下方地图气泡提供详情入口。",
    );
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

  const openConditions = () => {
    if (sourceLift.owner === "CONDITIONS") {
      setConditionPreviewing(false);
      setConditionDisclosureOpen(false);
      closeSourceLift("CONDITIONS", {
        restoreMap: false,
        discardFilterDraft: false,
      });
      return;
    }
    if (sourceLift.owner) return;
    if (!activeContext) {
      notify({
        owner: "map",
        placement: "inline",
        tone: "warning",
        title: "观测条件尚未就绪",
        body: "正在解析地图位置、时区与观测夜，请稍后重试。",
        dismissible: true,
        dedupeKey: "map-context-not-ready",
      });
      return;
    }
    const next = activeContext.selectedAtUtc;
    const frameIndex = nearestMapTimeFrameIndex(timeFrames, next);
    setConditionDraftAt(timeFrames[frameIndex]?.atUtc ?? next);
    setConditionDraftFrameIndex(frameIndex);
    setConditionDraftOverlay(analysisOverlay);
    setConditionPreviewing(false);
    setConditionDisclosureOpen(false);
    openSourceLift("CONDITIONS");
  };

  const commitConditionTime = async (frameIndex: number) => {
    if (!activeContext || conditionsSaving) return;
    const nextTime = timeFrames[frameIndex]?.atUtc;
    if (!nextTime) return;
    setConditionDraftFrameIndex(frameIndex);
    setConditionDraftAt(nextTime);
    setConditionPreviewing(false);
    if (Date.parse(nextTime) === Date.parse(activeContext.selectedAtUtc)) return;
    setConditionsSaving(true);
    try {
      const response = await updateObservationContext(activeContext, {
        selectedAt: nextTime,
      });
      setObservationContext(response.data);
      const committedFrameIndex = nearestMapTimeFrameIndex(
        timeFrames,
        response.data.selectedAtUtc,
      );
      setConditionDraftAt(
        timeFrames[committedFrameIndex]?.atUtc ?? response.data.selectedAtUtc,
      );
      setConditionDraftFrameIndex(committedFrameIndex);
      setAnnouncement(
        "已提交观测时间 " +
          formatContextTime(
            response.data.selectedAtUtc,
            response.data.timezone,
          ) +
          "；动态图层与指标正在使用同一上下文刷新。",
      );
    } catch (error) {
      setConditionDraftAt(activeContext.selectedAtUtc);
      setConditionDraftFrameIndex(
        nearestMapTimeFrameIndex(timeFrames, activeContext.selectedAtUtc),
      );
      notify({
        owner: "map",
        placement: "inline",
        tone: "error",
        title: "观测条件未保存",
        body: errorMessage(error) + "。草稿保持不变，可重试。",
        dismissible: true,
        dedupeKey: "map-conditions-update-failed",
      });
    } finally {
      setConditionsSaving(false);
    }
  };

  const commitConditionOverlay = (overlay: AnalysisOverlay) => {
    setConditionDraftOverlay(overlay);
    setAnalysisOverlay(overlay);
    setAnnouncement(
      `已选择${overlayLabels[overlay]}；地图底图和正式点位保持不变。`,
    );
  };

  const closeConditions = () => {
    setConditionPreviewing(false);
    setConditionDisclosureOpen(false);
    closeSourceLift("CONDITIONS", {
      restoreMap: false,
      discardFilterDraft: false,
    });
  };

  const renderFinderResults = (
    items: readonly SpotSummary[],
    emptyLabel: string,
  ) =>
    items.length ? (
      <View className="finder-city-groups">
        {groupByCity(items).map(([city, citySpots]) => (
          <View className="finder-city-group" key={city}>
            <Text
              className="finder-city-heading type-caption"
              data-od-id="spot-finder-city-heading"
            >
              {city}
            </Text>
            {citySpots.map((spot) => (
              <SpotCard
                key={spot.spotId}
                density="finder"
                spot={spot}
                favorite={favoriteIds.includes(spot.spotId)}
                onFavorite={() => void toggleFavorite(spot.spotId)}
                onSelect={() => selectFinderResult(spot)}
              />
            ))}
          </View>
        ))}
      </View>
    ) : (
      <View className="finder-empty">
        <Text className="type-caption">{emptyLabel}</Text>
      </View>
    );

  return (
    <View
      className={
        themeClass +
        " map-page location-" +
        locationState.toLowerCase().replace("_", "-")
      }
      data-miniapp-production-root
      data-route="map"
      data-delivery-target={__DELIVERY_TARGET__}
    >
      <View className="map-workspace" style={mapChromeStyle}>
        <View className="map-finder-anchor" data-od-id="map-search-trigger">
          <SourceLiftFocusLayer
            variant="panelOnly"
            owner="FINDER"
            ariaLabel="查找观星点"
            className={`finder-layer finder-layer--${finderExtent}`}
            onClose={() => {
              setSuggestionsOpen(false);
              cancelFilters();
              setFinderExtent("closed");
            }}
            source={
              <View
                className={`map-finder-trigger${finderExpanded ? " map-finder-trigger--expanded" : ""}`}
                data-od-id="map-search-summary"
                role="group"
                aria-expanded={finderExpanded}
                aria-label={
                  "查找观星点" +
                  (finderQuery ? "，当前输入 " + finderQuery : "") +
                  "，已应用 " +
                  String(countAppliedFilters(committedFilters)) +
                  " 项筛选"
                }
                onClick={() => {
                  if (!finderActive) openFinder();
                }}
              >
                <SemanticIcon name="search" className="map-finder-trigger__icon" />
                <Input
                  className="map-finder-trigger__input"
                  data-od-id="spot-finder-search-input"
                  value={finderQuery}
                  focus={finderActive && sourceLift.phase === "FOCUSED"}
                  placeholder="搜地点 / 区域 / 观星点"
                  confirmType="search"
                  aria-label="搜索正式观星点、城市或普通地点"
                  onInput={(event) => {
                    setFinderQuery(event.detail.value);
                    setSuggestionsOpen(true);
                    if (!finderActive) openFinder();
                    else setFinderExtent("expanded");
                  }}
                  onFocus={() => {
                    if (!finderActive) openFinder();
                    setSuggestionsOpen(true);
                  }}
                  onConfirm={() => {
                    if (finderQuery.trim()) addSearchHistory(finderQuery);
                    setSuggestionsOpen(false);
                    setFinderExtent("peek");
                  }}
                />
                <SemanticIcon
                  name={finderExpanded ? "chevron-up" : "chevron-down"}
                  className="map-finder-trigger__chevron"
                />
              </View>
            }
          >
            <View className="finder-panel" data-od-id="spot-finder-sheet">
              <Button
                className="finder-sheet-handle focus-ring"
                data-od-id="spot-finder-sheet-handle"
                aria-label={
                  finderExtent === "expanded"
                    ? "收起查找面板"
                    : "展开查找面板"
                }
                onClick={toggleFinderExtent}
              >
                <View className="finder-sheet-handle__bar" aria-hidden="true" />
              </Button>
              <View className="finder-tools">
                <View className="finder-query-wrap">
                  {suggestionsOpen && !filterSheetOpen ? (
                    <ScrollView
                      className="finder-query-overlay"
                      data-od-id="spot-finder-query-overlay"
                      scrollY
                      enhanced
                      showScrollbar={false}
                      aria-label="搜索历史与地点结果"
                    >
                      {suggestions.length ? (
                        <View className="finder-suggestions">
                          <Text className="type-caption">匹配正式点位</Text>
                          {suggestions.map((spot) => (
                            <Button
                              key={spot.spotId}
                              className="finder-suggestion"
                              onClick={() => selectFinderResult(spot)}
                            >
                              <View className="finder-suggestion__copy">
                                <Text className="finder-suggestion__title">
                                  {spot.name}
                                </Text>
                                <Text className="type-caption">
                                  {spot.region}
                                </Text>
                              </View>
                              <Text className="finder-suggestion__action">
                                查看
                              </Text>
                            </Button>
                          ))}
                        </View>
                      ) : null}
                      {candidateSuggestions.length ? (
                        <View className="finder-suggestions">
                          <Text className="type-caption">待核验地点</Text>
                          {candidateSuggestions.map((result) => (
                            <Button
                              key={result.candidateId}
                              className="finder-suggestion"
                              onClick={() => void selectMapReference(result)}
                            >
                              <View className="finder-suggestion__copy">
                                <Text className="finder-suggestion__title">
                                  {result.label}
                                </Text>
                                <Text className="type-caption">
                                  {result.region ||
                                    result.address ||
                                    "资料待核验"}
                                </Text>
                              </View>
                              <Text className="finder-suggestion__action">
                                移图
                              </Text>
                            </Button>
                          ))}
                        </View>
                      ) : null}
                      {ordinarySuggestions.length ? (
                        <View className="finder-suggestions">
                          <Text className="type-caption">普通地点</Text>
                          {ordinarySuggestions.map((result) => (
                            <Button
                              key={result.placeId}
                              className="finder-suggestion"
                              onClick={() => void selectMapReference(result)}
                            >
                              <View className="finder-suggestion__copy">
                                <Text className="finder-suggestion__title">
                                  {result.label}
                                </Text>
                                <Text className="type-caption">
                                  {result.region ||
                                    result.address ||
                                    "地点搜索结果"}
                                </Text>
                              </View>
                              <Text className="finder-suggestion__action">
                                移图
                              </Text>
                            </Button>
                          ))}
                        </View>
                      ) : null}
                      {!debouncedFinderQuery ? (
                        <View className="finder-history">
                          <View className="finder-history__head">
                            <Text className="type-caption">最近搜索</Text>
                            {searchHistory.length ? (
                              <SoftButton
                                variant="ghost"
                                label="清除最近搜索"
                                onClick={clearSearchHistory}
                              >
                                清除
                              </SoftButton>
                            ) : null}
                          </View>
                          {searchHistory.length ? (
                            searchHistory.map((item) => (
                              <Button
                                key={item}
                                className="finder-history__row"
                                onClick={() => {
                                  setFinderQuery(item);
                                  setSuggestionsOpen(true);
                                }}
                              >
                                <Text>{item}</Text>
                              </Button>
                            ))
                          ) : (
                            <Text className="type-caption">
                              暂无本地搜索记录
                            </Text>
                          )}
                        </View>
                      ) : placeSearch.isPending ? (
                        <Text className="finder-query-status type-caption">
                          正在搜索地点…
                        </Text>
                      ) : placeSearch.isError ? (
                        <Text className="finder-query-status type-caption">
                          普通地点搜索暂不可用；正式点位结果仍可使用。
                        </Text>
                      ) : !suggestions.length &&
                        !candidateSuggestions.length &&
                        !ordinarySuggestions.length ? (
                        <Text className="finder-query-status type-caption">
                          没有匹配结果；可以换一个名称或城市。
                        </Text>
                      ) : null}
                      <View className="finder-ordinary-note">
                        <Text className="type-label">普通地点</Text>
                        <Text className="type-caption">
                          只用于移动地图或查找附近正式观星点，不能直接进入点位详情或今晚观星。
                        </Text>
                      </View>
                    </ScrollView>
                  ) : null}
                </View>
                <View className="finder-filter-row">
                  <Button
                    className="finder-filter-toggle focus-ring"
                    data-od-id="spot-finder-filter-disclosure"
                    aria-expanded={filterSheetOpen}
                    aria-label={`筛选条件，${countAppliedFilters(committedFilters) ? `${countAppliedFilters(committedFilters)} 项已应用` : "未筛选"}`}
                    onClick={() => {
                      setSuggestionsOpen(false);
                      if (filterSheetOpen) cancelFilters();
                      else openFilters();
                    }}
                  >
                    <Text>筛选条件</Text>
                    <Text className="type-caption">
                      {countAppliedFilters(committedFilters)
                        ? `${countAppliedFilters(committedFilters)} 项已应用`
                        : "未筛选"}
                    </Text>
                  </Button>
                  {filterDraftDirty ? (
                    <View
                      className="filter-dirty-actions"
                      aria-label="筛选草稿操作"
                    >
                      <Button
                        className="dirty-action dirty-action--revert focus-ring"
                        data-od-id="spot-finder-filter-revert"
                        aria-label="撤销本次筛选修改"
                        onClick={(event) => {
                          event.stopPropagation();
                          revertFilters();
                        }}
                      >
                        <View
                          className="dirty-action-icon dirty-action-icon--revert"
                          aria-hidden="true"
                        >
                          <View className="dirty-action-line dirty-action-line--revert-a" />
                          <View className="dirty-action-line dirty-action-line--revert-b" />
                        </View>
                      </Button>
                      <Button
                        className="dirty-action dirty-action--commit focus-ring"
                        data-od-id="spot-finder-filter-commit"
                        aria-label="应用筛选修改"
                        onClick={(event) => {
                          event.stopPropagation();
                          applyFilters();
                        }}
                      >
                        <View
                          className="dirty-action-icon dirty-action-icon--commit"
                          aria-hidden="true"
                        >
                          <View className="dirty-action-line dirty-action-line--commit-a" />
                          <View className="dirty-action-line dirty-action-line--commit-b" />
                        </View>
                      </Button>
                    </View>
                  ) : null}
                </View>
              </View>
              {filterSheetOpen ? (
                <FilterSheet
                  capabilities={scene.data?.data.filterCapabilities.byGroup}
                />
              ) : (
                <ScrollView
                  className="finder-results"
                  data-od-id="spot-finder-result-scroll"
                  scrollY
                  enhanced
                  showScrollbar={false}
                  aria-label="Finder 结果"
                >
                  <View className="finder-result-summary">
                    <Text className="type-caption">
                      {String(spots.length)} 个正式点位 · 选择结果会回到同一地图气泡
                    </Text>
                  </View>
                  <View
                    className="finder-partition"
                    data-od-id="spot-finder-wanted-section"
                  >
                    <Button
                      className="finder-partition__toggle focus-ring"
                      aria-expanded={wantedOpen}
                      onClick={() => setWantedOpen((value) => !value)}
                    >
                      <Text className="type-section">想去</Text>
                      <Text className="type-caption">
                        {String(wanted.length)}
                      </Text>
                      <SemanticIcon
                        name={wantedOpen ? "chevron-up" : "chevron-down"}
                      />
                    </Button>
                    {wantedOpen
                      ? renderFinderResults(
                          wanted,
                          "暂无已保存的正式点位；想去与详情收藏共享同一保存状态。",
                        )
                      : null}
                  </View>
                  <View
                    className="finder-partition"
                    data-od-id="spot-finder-other-section"
                  >
                    <Button
                      className="finder-partition__toggle focus-ring"
                      aria-expanded={otherOpen}
                      onClick={() => setOtherOpen((value) => !value)}
                    >
                      <Text className="type-section">其他观星点</Text>
                      <Text className="type-caption">
                        {String(other.length)}
                      </Text>
                      <SemanticIcon
                        name={otherOpen ? "chevron-up" : "chevron-down"}
                      />
                    </Button>
                    {otherOpen
                      ? renderFinderResults(
                          other,
                          "没有匹配的正式点位；可调整筛选或输入另一个城市。",
                        )
                      : null}
                  </View>
                  <View className="finder-result-boundary">
                    <Text className="type-caption">
                      只有已完成核验并正式发布的观星点才能进入详情；资料不足的地点会明确标注，也不能生成今晚结论。
                    </Text>
                  </View>
                </ScrollView>
              )}
              <NotificationRegion owner="finder" placement="inline" />
            </View>
          </SourceLiftFocusLayer>
          {!finderActive ? (
            <View className="map-finder-quick-filters" aria-label="快速筛选">
              {QUICK_FILTER_IDS.map((optionId) => {
                const option = FILTER_OPTIONS.find(
                  (item) => item.id === optionId,
                );
                if (!option) return null;
                return (
                  <QuickFilterChip
                    key={option.id}
                    option={{
                      id: option.id,
                      label: QUICK_FILTER_LABELS[option.id] ?? option.label,
                    }}
                    selected={committedFilters[option.group].includes(option.id)}
                    onClick={() => applyQuickFilter(option.id)}
                  />
                );
              })}
            </View>
          ) : null}
        </View>

        <SourceLiftFocusLayer
          variant="mapCoupled"
          owner="CONDITIONS"
          ariaLabel="观测条件"
          className="map-coupled-layer"
          onClose={() => {
            setConditionPreviewing(false);
            setConditionDisclosureOpen(false);
          }}
          closeOptions={{
            restoreMap: false,
            discardFilterDraft: false,
          }}
          source={
            <View
              className={`map-stage${conditionsExpanded ? " map-stage--analysis-focused" : ""}`}
              data-od-id="map-base"
            >
          <Map
            id="spot-map"
            className="native-map"
            data-od-id="default-formal-markers"
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
            onMarkerTap={onMarkerTap}
            onRegionChange={onRegionChange}
            onError={() => {
              setMapRuntimeError(true);
              notify({
                owner: "map",
                placement: "inline",
                tone: "error",
                title: "地图渲染失败",
                body: "原生地图当前无法渲染；Finder、正式点位状态和恢复路径仍保留。",
                dismissible: true,
                dedupeKey: "map-native-render-error",
              });
            }}
            aria-label="观星点地图；Finder 提供等价可访问结果"
          />

          <View className="map-conditions-anchor">
            <View
              className="map-conditions-bar"
              data-od-id="map-analysis-time-bar"
              role="button"
              aria-haspopup="dialog"
              aria-expanded={conditionsExpanded}
              aria-label={
                "观测条件，" +
                overlayLabels[analysisOverlay] +
                "，" +
                conditionKeyMetric +
                "，" +
                contextTimeLabel
              }
              onClick={openConditions}
            >
              <View
                className="map-conditions-bar__icon"
                data-od-id="map-observing-conditions-icon"
              >
                <SemanticIcon name="conditions" />
              </View>
              <View className="map-conditions-bar__copy">
                <Text className="type-label">观测条件</Text>
                <Text className="type-caption">{conditionKeyMetric}</Text>
              </View>
              <Text className="map-conditions-bar__time type-caption">
                {contextTimeLabel}
              </Text>
              <SemanticIcon name="chevron-right" />
            </View>
          </View>

          <View className="map-floating-tools" aria-label="地图工具">
            <View
              className={`map-floating-tool${locationBusy ? " map-floating-tool--disabled" : ""}`}
              data-od-id="map-permission-state"
            >
              <SoftButton
                disabled={locationBusy}
                label={
                  locationBusy ? "正在更新一次性定位" : locationState === "DEFAULT_REGION"
                    ? "请求一次性定位（仅在你点击定位时请求一次位置权限）"
                    : locationState === "DENIED"
                      ? "重新请求一次性定位"
                      : "更新一次性定位"
                }
                onClick={locateMap}
              >
                {""}
              </SoftButton>
              <SemanticIcon
                name="location"
                className="map-floating-tool__icon"
              />
            </View>
            <View className="map-floating-tool">
              <SoftButton
                className="map-refresh-control"
                label="刷新当前区域"
                onClick={() => void refreshMap()}
              >
                {""}
              </SoftButton>
              <SemanticIcon
                name="refresh"
                className="map-floating-tool__icon"
              />
            </View>
          </View>

          <View className="map-feedback-column">
            <View className="map-status compact-inset">
              <NotificationRegion owner="map" placement="inline" />
              {mapRuntimeError ? (
                <View
                  className="map-status__provider-failure"
                  data-od-id="map-provider-failure"
                >
                  <StatusPanel
                    state="ERROR"
                    detail="原生地图当前无法渲染；Finder 和正式点位状态仍可使用。"
                    recoveryLabel="重试地图"
                    onRecover={() => setMapRuntimeError(false)}
                  />
                </View>
              ) : null}
              {pageState !== "READY" ? (
                <StatusPanel
                  state={pageState}
                  detail={
                    (bootstrapContext.isError
                      ? errorMessage(bootstrapContext.error)
                      : scene.isError ? errorMessage(scene.error)
                      : (scene.data?.warnings ?? []).join(" ")) ||
                    (pageState === "EMPTY"
                      ? "当前区域暂无正式观星点。可以移动地图或使用搜索查找其他区域。"
                      : "正在解析地图上下文并加载正式点位与来源。")
                  }
                  recoveryLabel={pageState === "ERROR" ? "重试" : undefined}
                  onRecover={
                    pageState === "ERROR"
                      ? () =>
                          void (activeContext
                            ? scene.refetch()
                            : bootstrapContext.refetch())
                      : undefined
                  }
                />
              ) : null}
            </View>
            {selected ? (
              <View className="selected-callout-wrap safe-bottom">
                <SpotCard
                  density="callout"
                  spot={selected}
                  evaluation={
                    projectedEvaluations[selected.spotId] ?? null
                  }
                  favorite={favoriteIds.includes(selected.spotId)}
                  onFavorite={() => void toggleFavorite(selected.spotId)}
                  onOpen={() => openDetail(selected)}
                />
              </View>
            ) : null}
          </View>
            </View>
          }
        >
          <View
            className="conditions-panel"
            data-od-id="map-analysis-focus-panel"
          >
            <View className="conditions-panel__head">
              <View className="conditions-panel__title">
                <Text className="conditions-panel__eyebrow">地图分析</Text>
                <Text className="type-section">观测条件</Text>
              </View>
              <Button
                className="conditions-panel__close focus-ring"
                data-od-id="map-analysis-close"
                aria-label="关闭观测条件"
                onClick={closeConditions}
              >
                <SemanticIcon name="close" />
              </Button>
            </View>

            <View
              className="conditions-overlays"
              data-od-id="map-analysis-layer-control"
              role="radiogroup"
              aria-label="地图分析叠加"
            >
              <View className="conditions-overlays__choices">
                {(
                  ["NONE", "LIGHT", "TOTAL_CLOUD", "OPPORTUNITY"] as const
                ).map((overlay) => (
                  <Button
                    key={overlay}
                    data-od-id="map-analysis-layer-choice"
                    data-layer={overlay}
                    className={
                      `conditions-overlay-option conditions-overlay-option--${overlay.toLowerCase()} focus-ring` +
                      (conditionDraftOverlay === overlay
                        ? " conditions-overlay-option--selected"
                        : "")
                    }
                    aria-checked={conditionDraftOverlay === overlay}
                    aria-pressed={conditionDraftOverlay === overlay}
                    aria-label={`${overlayLabels[overlay]}，${conditionDraftOverlay === overlay ? "已选择" : "未选择"}`}
                    onClick={() => commitConditionOverlay(overlay)}
                  >
                    {conditionDraftOverlay === overlay ? (
                      <SelectedCardStar />
                    ) : null}
                    <Text>{overlayLabels[overlay]}</Text>
                  </Button>
                ))}
              </View>
            </View>

            <View
              className="conditions-time"
              data-od-id="map-time-control"
            >
              <Text
                id={`map-layer-projection-${layerProjectionProbe}`}
                className="conditions-time__value"
                data-od-id="map-analysis-time-value"
                data-layer-projection={layerProjectionProbe}
                aria-label="当前本地日期和时间"
              >
                {activeContext && conditionDraftAt
                  ? formatContextTime(
                      conditionDraftAt,
                      activeContext.timezone,
                    )
                  : "正在解析观测夜"}
              </Text>
              <Slider
                className="conditions-time__slider"
                data-od-id="map-analysis-time-scrubber"
                min={0}
                max={conditionMaxFrameIndex}
                step={1}
                value={Math.min(
                  conditionDraftFrameIndex,
                  conditionMaxFrameIndex,
                )}
                disabled={!activeContext || !timeFrames.length || conditionsSaving}
                aria-label="观测条件时间"
                onChanging={(event) => {
                  const frameIndex = Number(event.detail.value);
                  setConditionDraftFrameIndex(frameIndex);
                  setConditionPreviewing(true);
                  const frame = timeFrames[frameIndex];
                  if (frame) setConditionDraftAt(frame.atUtc);
                }}
                onChange={(event) => {
                  const frameIndex = Number(event.detail.value);
                  void commitConditionTime(frameIndex);
                }}
              />
            </View>

            <View className="conditions-metrics" aria-label="当前观测指标">
              {conditionMetrics.map((metric) => (
                <View className="conditions-metric" key={metric.label}>
                  <Text className="conditions-metric__label">
                    {metric.label}
                  </Text>
                  <Text className="conditions-metric__value">
                    {metric.value}
                  </Text>
                  <View className="conditions-metric__track" aria-hidden="true">
                    <View
                      className="conditions-metric__meter"
                      style={{ width: `${metric.meter}%` }}
                    />
                  </View>
                </View>
              ))}
            </View>

            <Button
              className="conditions-disclosure-toggle focus-ring"
              aria-expanded={conditionDisclosureOpen}
              onClick={() => setConditionDisclosureOpen((value) => !value)}
            >
              <Text>
                {conditionsSaving
                  ? "正在提交所选时间"
                  : conditionPreviewing
                    ? "拖动预览；释放后载入真实动态图层"
                    : conditionDraftOverlay === "LIGHT"
                      ? `来源周期 ${representativeSpot?.lightPollution.datasetVersion || "暂不可用"} · 静态`
                      : conditionDraftOverlay === "NONE"
                        ? "未启用分析叠加"
                        : "基于所选时刻更新"}
              </Text>
              <SemanticIcon name="info" />
            </Button>
            {conditionDisclosureOpen ? (
              <Text className="type-caption conditions-disclosure">
                {conditionDraftOverlay === "LIGHT"
                  ? "光害来自有版本的周期性卫星夜光估算，不等同于现场实测，也不会随小时伪变化。"
                  : conditionDraftOverlay === "NONE"
                    ? "仅显示原生底图和已正式发布的观星点。"
                    : "总云量与今晚观测条件只使用当前上下文返回的真实数据；缺失、过期或部分结果会明确标注。"}
              </Text>
            ) : null}
          </View>
        </SourceLiftFocusLayer>


      </View>
      <View className="sr-live" role="status" aria-live="polite">
        <Text>{announcement}</Text>
      </View>
    </View>
  );
}
