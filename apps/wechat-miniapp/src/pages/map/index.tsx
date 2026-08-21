import Taro from "@tarojs/taro";
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
import {
  countAppliedFilters,
  type DisplayMode,
  type SpotSummary,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { FilterSheet } from "@/components/filter-sheet";
import { NotificationRegion } from "@/components/notification";
import { SoftButton } from "@/components/soft-button";
import { SourceLiftFocusLayer } from "@/components/source-lift-focus-layer";
import { SpotCard } from "@/components/spot-card";
import { StatusPanel } from "@/components/status-panel";
import { useFavoriteMutation } from "@/hooks/use-favorite-mutation";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import { getMapScene } from "@/services/api-client";
import { useAppStore, type AnalysisOverlay } from "@/state/app-store";
import "./index.scss";

const isH5Proxy = process.env.TARO_ENV === "h5";

function currentLocalSelectedAt() {
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const offsetRemainder = String(absoluteOffset % 60).padStart(2, "0");
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 19);
  return local + sign + offsetHours + ":" + offsetRemainder;
}

function selectedHour(value: string) {
  const match = /^\d{4}-\d{2}-\d{2}T(\d{2}):/u.exec(value);
  return match ? Number(match[1]) : new Date().getHours();
}

function withSelectedHour(value: string, hour: number) {
  const base = /^\d{4}-\d{2}-\d{2}T\d{2}:/u.test(value)
    ? value
    : currentLocalSelectedAt();
  return base.replace(/T\d{2}:/u, "T" + String(hour).padStart(2, "0") + ":");
}

const MAP_MARKER_PALETTE: Record<
  DisplayMode,
  { selected: string; text: string; surface: string; border: string }
> = {
  DAY: {
    selected: "#1769D2",
    text: "#10233F",
    surface: "#EEF4FA",
    border: "#1769D2",
  },
  NIGHT: {
    selected: "#5AA7FF",
    text: "#EEF5FF",
    surface: "#102238",
    border: "#5AA7FF",
  },
  OBSERVATION: {
    selected: "#FF514A",
    text: "#F4554E",
    surface: "#150303",
    border: "#4D1716",
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
          : selected
            ? "★ " + spot.name
            : "✦",
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
      callout: {
        content: clustered
          ? String(group.spots.length) + " 个正式观星点，点击放大"
          : spot.name,
        color: palette.text,
        fontSize: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: palette.border,
        bgColor: palette.surface,
        padding: 6,
        anchorX: 0,
        anchorY: 0,
        display: selected ? ("ALWAYS" as const) : ("BYCLICK" as const),
        textAlign: "center" as const,
      },
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
  NONE: "无分析图层",
  LIGHT: "光害",
  TOTAL_CLOUD: "总云量",
  OPPORTUNITY: "机会",
};

export default function MapPage() {
  const themeClass = useThemeClass();
  const mode = useAppStore((state) => state.mode);
  const committedFilters = useAppStore((state) => state.committedFilters);
  const filterSheetOpen = useAppStore((state) => state.filterSheetOpen);
  const finderQuery = useAppStore((state) => state.finderQuery);
  const selectedAt = useAppStore((state) => state.selectedAt);
  const analysisOverlay = useAppStore((state) => state.analysisOverlay);
  const preferences = useAppStore((state) => state.preferences);
  const viewport = useAppStore((state) => state.viewport);
  const selectedSpotId = useAppStore((state) => state.selectedSpotId);
  const locationState = useAppStore((state) => state.locationState);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const searchHistory = useAppStore((state) => state.searchHistory);
  const sourceLift = useAppStore((state) => state.sourceLift);
  const setFinderQuery = useAppStore((state) => state.setFinderQuery);
  const setSelectedAt = useAppStore((state) => state.setSelectedAt);
  const setAnalysisOverlay = useAppStore((state) => state.setAnalysisOverlay);
  const setViewport = useAppStore((state) => state.setViewport);
  const selectSpot = useAppStore((state) => state.selectSpot);
  const setLocationState = useAppStore((state) => state.setLocationState);
  const openSourceLift = useAppStore((state) => state.openSourceLift);
  const closeSourceLift = useAppStore((state) => state.closeSourceLift);
  const openFilters = useAppStore((state) => state.openFilters);
  const cancelFilters = useAppStore((state) => state.cancelFilters);
  const addSearchHistory = useAppStore((state) => state.addSearchHistory);
  const clearSearchHistory = useAppStore((state) => state.clearSearchHistory);
  const notify = useAppStore((state) => state.notify);
  const { toggleFavorite } = useFavoriteMutation();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [wantedOpen, setWantedOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);
  const [mapRuntimeError, setMapRuntimeError] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [conditionDraftAt, setConditionDraftAt] = useState("");
  const [conditionDraftHour, setConditionDraftHour] = useState(0);
  const [conditionDraftOverlay, setConditionDraftOverlay] =
    useState<AnalysisOverlay>("NONE");
  const regionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scene = useResourceQuery({
    queryKey: [
      "map-scene-v2-1-1",
      committedFilters,
      finderQuery,
      Number(viewport.center.latitude.toFixed(4)),
      Number(viewport.center.longitude.toFixed(4)),
      viewport.zoom,
      preferences.defaultPlace,
      preferences.experience,
      preferences.maxDriveMinutes,
      preferences.requiredFacilities,
      preferences.equipment,
      preferences.capturePreference,
    ],
    queryFn: (signal) =>
      getMapScene(
        committedFilters,
        finderQuery,
        viewport,
        {
          defaultPlace: preferences.defaultPlace,
          experience: preferences.experience,
          maxDriveMinutes: preferences.maxDriveMinutes,
          requiredFacilities: preferences.requiredFacilities,
          equipment: preferences.equipment,
          capturePreference: preferences.capturePreference,
        },
        signal,
      ),
    staleTime: 60_000,
  });

  useEffect(() => {
    const ids = scene.data?.data.favoriteSpotIds;
    if (ids) useAppStore.getState().replaceFavoriteIds(ids);
  }, [scene.data?.data.favoriteSpotIds]);

  useEffect(() => {
    if (sourceLift.owner === "CONDITIONS" && sourceLift.phase === "LIFTING") {
      const next = selectedAt || currentLocalSelectedAt();
      setConditionDraftAt(next);
      setConditionDraftHour(selectedHour(next));
      setConditionDraftOverlay(analysisOverlay);
    }
  }, [analysisOverlay, selectedAt, sourceLift.owner, sourceLift.phase]);

  useEffect(
    () => () => {
      if (regionTimer.current) clearTimeout(regionTimer.current);
    },
    [],
  );

  const spots = scene.data?.data.spots ?? [];
  const selected = spots.find((spot) => spot.spotId === selectedSpotId) ?? null;
  const groupedMarkers = useMemo(
    () => markerGroups(spots, viewport.zoom),
    [spots, viewport.zoom],
  );
  const markerList = useMemo(
    () => markerItems(groupedMarkers, selectedSpotId, mode),
    [groupedMarkers, mode, selectedSpotId],
  );
  const wanted = spots.filter((spot) => favoriteIds.includes(spot.spotId));
  const other = spots.filter((spot) => !favoriteIds.includes(spot.spotId));
  const suggestions = spots
    .filter(
      (spot) =>
        finderQuery.length > 0 &&
        (spot.name + spot.region + spot.address).includes(finderQuery),
    )
    .slice(0, 5);
  const pageState = scene.isPending
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

  const openFinder = () => {
    if (sourceLift.owner === "FINDER") {
      cancelFilters();
      setSuggestionsOpen(false);
      closeSourceLift("FINDER");
      return;
    }
    if (sourceLift.owner) return;
    openSourceLift("FINDER");
    setSuggestionsOpen(true);
  };

  const selectFinderResult = (spot: SpotSummary) => {
    selectSpot(spot.spotId);
    setViewport({ center: spot.gcj02, zoom: Math.max(10, viewport.zoom) });
    if (finderQuery.trim()) addSearchHistory(finderQuery);
    setSuggestionsOpen(false);
    closeSourceLift("FINDER", {
      restoreMap: false,
      discardFilterDraft: true,
    });
    setAnnouncement("已选择 " + spot.name + "；地图已回到同一正式点位。");
  };

  const openDetail = (spot: SpotSummary) => {
    void Taro.navigateTo({
      url: "/spot/detail/index?spotId=" + encodeURIComponent(spot.spotId),
    });
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
      "已选择 " + spot.name + "；下方紧凑 Callout 提供详情入口。",
    );
  };

  const onRegionChange = (
    event: BaseEventOrig<MapProps.onRegionEventDetail>,
  ) => {
    if (event.detail.type !== "end") return;
    if (regionTimer.current) clearTimeout(regionTimer.current);
    regionTimer.current = setTimeout(() => {
      const detail = event.detail.detail;
      if (!detail?.centerLocation) return;
      setViewport({
        center: detail.centerLocation,
        ...(detail.scale ? { zoom: detail.scale } : {}),
        loadedViewport: "viewport:" + String(Date.now()),
      });
    }, 250);
  };

  const locateMap = () => {
    if (isH5Proxy) {
      notify({
        owner: "map",
        placement: "inline",
        tone: "info",
        title: "浏览器诊断边界",
        body: "H5 诊断面不请求真实位置；原生小程序可在你点击时使用一次性定位。",
        dismissible: true,
        dedupeKey: "map-location-h5-boundary",
      });
      return;
    }
    setLocationState("REQUESTING");
    void Taro.getLocation({
      type: "gcj02",
      isHighAccuracy: false,
      highAccuracyExpireTime: 2500,
    })
      .then((location) => {
        setLocationState("GRANTED");
        setViewport({
          center: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          zoom: 10,
        });
        setAnnouncement("已按本次授权定位并更新地图中心。");
      })
      .catch(() => {
        setLocationState("DENIED");
        notify({
          owner: "map",
          placement: "inline",
          tone: "warning",
          title: "定位未授权",
          body: "核心地图和正式点位仍可用；你可以搜索城市或继续使用深圳试点区域。",
          dismissible: true,
          action: { label: "查看权限说明", route: "/pages/auth/index" },
          dedupeKey: "map-location-denied",
        });
      });
  };

  const refreshMap = () => {
    setAnnouncement("正在刷新当前区域；地图中心、筛选和选点保持不变。");
    void scene.refetch().then(
      () => setAnnouncement("当前区域已刷新；地图任务状态保持不变。"),
      () =>
        notify({
          owner: "map",
          placement: "inline",
          tone: "warning",
          title: "刷新未完成",
          body: "已保留缓存点位、地图中心、筛选和当前选点。",
          dismissible: true,
          dedupeKey: "map-refresh-failed",
        }),
    );
  };

  const openConditions = () => {
    if (sourceLift.owner === "CONDITIONS") {
      closeSourceLift("CONDITIONS");
      return;
    }
    if (sourceLift.owner) return;
    const next = selectedAt || currentLocalSelectedAt();
    setConditionDraftAt(next);
    setConditionDraftHour(selectedHour(next));
    setConditionDraftOverlay(analysisOverlay);
    openSourceLift("CONDITIONS");
  };

  const commitConditions = () => {
    const nextTime = conditionDraftAt.trim() || currentLocalSelectedAt();
    setSelectedAt(nextTime);
    setAnalysisOverlay(conditionDraftOverlay);
    closeSourceLift("CONDITIONS", {
      restoreMap: false,
      discardFilterDraft: false,
    });
    notify({
      owner: "map",
      placement: "inline",
      tone: "success",
      title: "观测条件已更新",
      body:
        overlayLabels[conditionDraftOverlay] +
        " · " +
        nextTime +
        "；地图与正式标记保持不变。",
      dismissible: true,
      dedupeKey: "map-conditions:" + conditionDraftOverlay + ":" + nextTime,
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
        locationState.toLowerCase().replace("_", "-") +
        (isH5Proxy ? " map-page--h5" : "")
      }
      data-miniapp-production-root
      data-route="map"
      data-delivery-target={__DELIVERY_TARGET__}
    >
      <CustomNav title="今晚去观星" subtitle="地图 · 正式观星点" />
      <View className="map-workspace">
        <View className="map-finder-anchor" data-od-id="map-search-trigger">
          <SourceLiftFocusLayer
            variant="panelOnly"
            owner="FINDER"
            ariaLabel="查找观星点"
            onClose={() => {
              setSuggestionsOpen(false);
              cancelFilters();
            }}
            source={
              <View
                className="map-finder-trigger"
                data-od-id="map-search-summary"
                role="button"
                aria-label={
                  "查找观星点" +
                  (finderQuery ? "，当前输入 " + finderQuery : "") +
                  "，已应用 " +
                  String(countAppliedFilters(committedFilters)) +
                  " 项筛选"
                }
                onClick={openFinder}
              >
                <Text className="map-finder-trigger__icon" aria-hidden="true">
                  ⌕
                </Text>
                <View
                  className="map-finder-trigger__copy"
                  data-od-id="spot-finder-title-toggle"
                >
                  <Text className="type-label">
                    {finderQuery || "查找观星点"}
                  </Text>
                  <Text className="type-caption">
                    {countAppliedFilters(committedFilters)
                      ? String(countAppliedFilters(committedFilters)) +
                        " 项筛选"
                      : "搜索城市、正式点位或普通地点"}
                  </Text>
                </View>
                <Text
                  className="map-finder-trigger__chevron"
                  data-od-id="spot-finder-title-chevron"
                  aria-hidden="true"
                >
                  ›
                </Text>
              </View>
            }
          >
            <View className="finder-panel" data-od-id="spot-finder-sheet">
              <View
                className="finder-field-row"
                data-od-id="spot-finder-search-field"
              >
                <Text
                  className="finder-search-icon"
                  data-od-id="spot-finder-search-icon"
                  aria-hidden="true"
                >
                  ⌕
                </Text>
                <Input
                  className="finder-input"
                  data-od-id="spot-finder-search-input"
                  value={finderQuery}
                  placeholder="搜索正式观星点、城市或普通地点"
                  confirmType="search"
                  aria-label="搜索正式观星点、城市或普通地点"
                  onInput={(event) => {
                    setFinderQuery(event.detail.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  onConfirm={() => {
                    if (finderQuery.trim()) addSearchHistory(finderQuery);
                    setSuggestionsOpen(false);
                  }}
                />
                <View data-od-id="spot-finder-filter-disclosure">
                  <SoftButton
                    variant="ghost"
                    label={
                      "打开筛选，当前 " +
                      String(countAppliedFilters(committedFilters)) +
                      " 项"
                    }
                    onClick={() => {
                      setSuggestionsOpen(false);
                      openFilters();
                    }}
                  >
                    筛选 {countAppliedFilters(committedFilters)}
                  </SoftButton>
                </View>
              </View>
              {suggestionsOpen && !filterSheetOpen ? (
                <View
                  className="finder-query-overlay"
                  data-od-id="spot-finder-query-overlay"
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
                          <Text>{spot.name}</Text>
                          <Text className="type-caption">{spot.region}</Text>
                        </Button>
                      ))}
                    </View>
                  ) : null}
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
                      <Text className="type-caption">暂无本地搜索记录</Text>
                    )}
                  </View>
                  <View className="finder-ordinary-note">
                    <Text className="type-label">普通地点</Text>
                    <Text className="type-caption">
                      只能移动地图或查找附近正式点位，不创建 spot_id，也不能进入
                      Night。
                    </Text>
                  </View>
                </View>
              ) : null}
              {filterSheetOpen ? (
                <FilterSheet onClose={() => setSuggestionsOpen(false)} />
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
                      {String(spots.length)} 个正式点位 · 结果选择会回到同一地图
                      Callout
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
                      <Text className="type-section">Wanted</Text>
                      <Text className="type-caption">
                        {String(wanted.length)}
                      </Text>
                      <Text
                        data-od-id="spot-finder-section-chevron"
                        aria-hidden="true"
                      >
                        {wantedOpen ? "⌃" : "⌄"}
                      </Text>
                    </Button>
                    {wantedOpen
                      ? renderFinderResults(
                          wanted,
                          "暂无已保存的正式点位；保存关系只在 Finder Wanted 与详情收藏之间共享。",
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
                      <Text className="type-section">Other</Text>
                      <Text className="type-caption">
                        {String(other.length)}
                      </Text>
                      <Text
                        data-od-id="spot-finder-section-chevron"
                        aria-hidden="true"
                      >
                        {otherOpen ? "⌃" : "⌄"}
                      </Text>
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
                      只有带稳定 spot_id 的正式点位 Callout 才能进入
                      Detail；资料不足会在 Detail
                      内继续失败关闭动态结论，普通地点不能进入。
                    </Text>
                  </View>
                </ScrollView>
              )}
              <NotificationRegion owner="finder" placement="inline" />
            </View>
          </SourceLiftFocusLayer>
        </View>

        <View className="map-stage" data-od-id="map-base">
          {isH5Proxy ? (
            <View
              className="map-proxy"
              aria-label="浏览器诊断代理地图；正式点位由 Finder 提供等价内容"
            >
              <View className="map-proxy__water" aria-hidden="true" />
              <View
                className="map-proxy__road map-proxy__road--one"
                aria-hidden="true"
              />
              <View
                className="map-proxy__road map-proxy__road--two"
                aria-hidden="true"
              />
              <View
                className="map-proxy__road map-proxy__road--three"
                aria-hidden="true"
              />
              <Text className="map-proxy__region" aria-hidden="true">
                试点区域
              </Text>
              <View className="map-proxy__notice">
                <Text className="map-proxy__eyebrow">H5 诊断代理</Text>
                <Text className="type-caption">
                  不连接第三方底图、不请求真实位置
                </Text>
                <SoftButton
                  variant="ghost"
                  label="打开 Finder 结果"
                  onClick={openFinder}
                >
                  查看正式点位
                </SoftButton>
              </View>
            </View>
          ) : (
            <Map
              id="spot-map"
              className="native-map"
              data-od-id="default-formal-markers"
              latitude={viewport.center.latitude}
              longitude={viewport.center.longitude}
              scale={viewport.zoom}
              markers={markerList}
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
          )}

          <View className="map-conditions-anchor">
            <View data-od-id="map-analysis-focus-layer">
              <SourceLiftFocusLayer
                variant="mapCoupled"
                owner="CONDITIONS"
                ariaLabel="观测条件"
                source={
                  <View
                    className="map-conditions-bar"
                    data-od-id="map-analysis-time-bar"
                    role="button"
                    aria-label={
                      "观测条件，" +
                      overlayLabels[analysisOverlay] +
                      "，" +
                      (selectedAt || "默认时刻")
                    }
                    onClick={openConditions}
                  >
                    <Text
                      data-od-id="map-observing-conditions-icon"
                      aria-hidden="true"
                    >
                      ◷
                    </Text>
                    <View className="map-conditions-bar__copy">
                      <Text className="type-label">观测条件</Text>
                      <Text className="type-caption">
                        {overlayLabels[analysisOverlay]} ·{" "}
                        {selectedAt || "默认时刻"}
                      </Text>
                    </View>
                    <Text aria-hidden="true">›</Text>
                  </View>
                }
              >
                <View
                  className="conditions-panel"
                  data-od-id="map-analysis-focus-panel"
                >
                  <View className="conditions-panel__head">
                    <Text className="type-label">观测条件</Text>
                    <Text className="type-caption">
                      预览后应用；地图与正式标记始终保留
                    </Text>
                  </View>
                  <View
                    className="conditions-time"
                    data-od-id="map-time-control"
                  >
                    <Text className="type-caption">调整观测时间</Text>
                    <View data-od-id="map-analysis-time-scrubber">
                      <Slider
                        className="conditions-time__slider"
                        min={0}
                        max={23}
                        step={1}
                        value={conditionDraftHour}
                        aria-label="调整观测时间"
                        onChanging={(event) => {
                          const hour = Number(event.detail.value);
                          setConditionDraftHour(hour);
                          setConditionDraftAt(
                            withSelectedHour(conditionDraftAt, hour),
                          );
                        }}
                        onChange={(event) => {
                          const hour = Number(event.detail.value);
                          setConditionDraftHour(hour);
                          setConditionDraftAt(
                            withSelectedHour(conditionDraftAt, hour),
                          );
                        }}
                      />
                    </View>
                    <Text
                      className="conditions-time__value"
                      data-od-id="map-analysis-time-value"
                    >
                      {conditionDraftAt || currentLocalSelectedAt()}
                    </Text>
                  </View>
                  <View
                    className="conditions-overlays"
                    data-od-id="map-analysis-layer-control"
                    role="group"
                    aria-label="分析图层"
                  >
                    <View className="conditions-overlays__choices">
                      {(
                        ["NONE", "LIGHT", "TOTAL_CLOUD", "OPPORTUNITY"] as const
                      ).map((overlay) => (
                        <Button
                          key={overlay}
                          data-od-id="map-analysis-layer-choice"
                          className={
                            "conditions-overlay-option focus-ring" +
                            (conditionDraftOverlay === overlay
                              ? " conditions-overlay-option--selected"
                              : "")
                          }
                          aria-pressed={conditionDraftOverlay === overlay}
                          onClick={() => setConditionDraftOverlay(overlay)}
                        >
                          {conditionDraftOverlay === overlay ? (
                            <View
                              className="conditions-overlay-option__star"
                              data-od-id="selected-card-star"
                              aria-hidden="true"
                            >
                              <Text>★</Text>
                            </View>
                          ) : null}
                          <Text>{overlayLabels[overlay]}</Text>
                        </Button>
                      ))}
                    </View>
                  </View>
                  <Text className="type-caption conditions-disclosure">
                    {conditionDraftOverlay === "LIGHT"
                      ? "光害为来源周期内的静态粗粒度估算，不代表现场 Bortle 实测。"
                      : conditionDraftOverlay === "NONE"
                        ? "仅显示底图与正式点位标记。"
                        : "当前实时供应商事实需在原生环境确认；未接入时不显示虚构数值。"}
                  </Text>
                  <View className="conditions-panel__actions">
                    <View data-od-id="map-analysis-close">
                      <SoftButton
                        variant="ghost"
                        label="取消观测条件修改"
                        onClick={() => closeSourceLift("CONDITIONS")}
                      >
                        取消
                      </SoftButton>
                    </View>
                    <SoftButton
                      variant="primary"
                      label="应用观测条件"
                      onClick={commitConditions}
                    >
                      应用
                    </SoftButton>
                  </View>
                </View>
              </SourceLiftFocusLayer>
            </View>
          </View>

          {analysisOverlay !== "NONE" ? (
            <View
              className="map-analysis-ribbon"
              data-od-id="map-analysis-state"
              role="status"
            >
              <Text className="type-label">
                {overlayLabels[analysisOverlay]}
              </Text>
              <Text className="type-caption">
                {analysisOverlay === "LIGHT" ? "静态估算" : "需原生供应商确认"}
              </Text>
            </View>
          ) : null}

          <View className="map-floating-tools" aria-label="地图工具">
            <View data-od-id="map-permission-state">
              <SoftButton
                label={
                  locationState === "DENIED"
                    ? "重新请求一次性定位"
                    : "请求一次性定位（仅在你点击定位时请求一次位置权限）"
                }
                onClick={locateMap}
              >
                ◎
              </SoftButton>
            </View>
            <SoftButton
              className="map-refresh-control"
              label="刷新当前区域"
              onClick={refreshMap}
            >
              ↻
            </SoftButton>
          </View>

          {selected ? (
            <View className="selected-callout-wrap safe-bottom">
              <SpotCard
                density="callout"
                spot={selected}
                favorite={favoriteIds.includes(selected.spotId)}
                onFavorite={() => void toggleFavorite(selected.spotId)}
                onOpen={() => openDetail(selected)}
              />
            </View>
          ) : null}
        </View>

        <View className="map-status compact-inset">
          <NotificationRegion owner="map" placement="inline" />
          {mapRuntimeError ? (
            <View data-od-id="map-provider-failure">
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
                (scene.data?.warnings ?? []).join(" ") ||
                "正在加载正式点位与来源。"
              }
              recoveryLabel={pageState === "ERROR" ? "重试" : undefined}
              onRecover={
                pageState === "ERROR" ? () => void scene.refetch() : undefined
              }
            />
          ) : null}
        </View>
      </View>
      <View className="sr-live" role="status" aria-live="polite">
        <Text>{announcement}</Text>
      </View>
    </View>
  );
}
