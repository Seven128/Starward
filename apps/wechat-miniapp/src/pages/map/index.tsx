import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import {
  Button,
  CoverView,
  Input,
  Map,
  ScrollView,
  Text,
  View,
} from "@tarojs/components";
import type { BaseEventOrig, MapProps } from "@tarojs/components";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  countAppliedFilters,
  FILTER_OPTIONS,
  type DisplayMode,
  type FilterGroupKey,
  type FilterState,
  type SpotId,
  type SpotSummary,
} from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { FilterSheet } from "@/components/filter-sheet";
import { SoftButton } from "@/components/soft-button";
import { SpotCard } from "@/components/spot-card";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useFavoriteMutation } from "@/hooks/use-favorite-mutation";
import { useThemeClass } from "@/hooks/use-theme";
import { getMapScene, getSpotOverview } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import "./index.scss";

const isH5Proxy = process.env.TARO_ENV === "h5";
const QUICK_FILTER_GROUPS: readonly (readonly [FilterGroupKey, string])[] = [
  ["LIGHT", "光害等级"],
  ["DRIVE_TIME", "驾车时间"],
  ["FACILITY", "场地信息"],
];

function quickFilterSummary(
  filters: FilterState,
  group: FilterGroupKey,
  emptyLabel: string,
) {
  const labels = filters[group]
    .map((id) => FILTER_OPTIONS.find((option) => option.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  if (labels.length === 0) return emptyLabel;
  if (labels.length === 1) return `${emptyLabel} · ${labels[0]}`;
  return `${emptyLabel} · ${labels.length} 项`;
}

const MAP_MARKER_PALETTE: Record<
  DisplayMode,
  {
    selected: string;
    text: string;
    surface: string;
    border: string;
  }
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

function markerGroups(spots: readonly SpotSummary[], zoom: number): MarkerGroup[] {
  if (zoom >= 9)
    return spots.map((spot, index) => ({
      id: index + 1,
      latitude: spot.gcj02.latitude,
      longitude: spot.gcj02.longitude,
      spots: [spot],
    }));
  const cellSize = zoom <= 7 ? 1.2 : 0.55;
  const cells = new globalThis.Map<string, SpotSummary[]>();
  for (const spot of spots) {
    const key = `${Math.round(spot.gcj02.latitude / cellSize)}:${Math.round(spot.gcj02.longitude / cellSize)}`;
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

function markers(
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
    iconPath:
      selected ? icons.selected : icons.regular,
    width: selected || clustered ? 38 : 30,
    height: selected || clustered ? 42 : 34,
    anchor: { x: 0.5, y: 1 },
    alpha: 0.96,
    label: {
      content: clustered
        ? `${group.spots.length}`
        : selected
          ? `★ ${spot.name}`
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
        ? `${group.spots.length} 个正式观星点，点击放大`
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
      display:
        selected
          ? ("ALWAYS" as const)
          : ("BYCLICK" as const),
      textAlign: "center" as const,
    },
    ariaLabel: clustered
      ? `${group.spots.length} 个正式观星点的聚合标记，点击放大`
      : `${spot.name}，${selected ? "已选择" : "未选择"}，正式观星点`,
  };
  });
}

export default function MapPage() {
  const themeClass = useThemeClass();
  const mode = useAppStore((state) => state.mode);
  const committedFilters = useAppStore((state) => state.committedFilters);
  const preferences = useAppStore((state) => state.preferences);
  const filterSheetOpen = useAppStore((state) => state.filterSheetOpen);
  const openFilters = useAppStore((state) => state.openFilters);
  const selectedSpotId = useAppStore((state) => state.selectedSpotId);
  const selectSpot = useAppStore((state) => state.selectSpot);
  const viewport = useAppStore((state) => state.viewport);
  const setViewport = useAppStore((state) => state.setViewport);
  const locationState = useAppStore((state) => state.locationState);
  const setLocationState = useAppStore((state) => state.setLocationState);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const replaceFavoriteIds = useAppStore((state) => state.replaceFavoriteIds);
  const { toggleFavorite } = useFavoriteMutation();
  const searchHistory = useAppStore((state) => state.searchHistory);
  const addSearchHistory = useAppStore((state) => state.addSearchHistory);
  const clearSearchHistory = useAppStore((state) => state.clearSearchHistory);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [mapRuntimeError, setMapRuntimeError] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const regionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scene = useResourceQuery({
    queryKey: [
      "map-scene",
      committedFilters,
      query,
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
      getMapScene(committedFilters, query, viewport, {
        defaultPlace: preferences.defaultPlace,
        experience: preferences.experience,
        maxDriveMinutes: preferences.maxDriveMinutes,
        requiredFacilities: preferences.requiredFacilities,
        equipment: preferences.equipment,
        capturePreference: preferences.capturePreference,
      }, signal),
    staleTime: 60_000,
  });
  useEffect(() => {
    const ids = scene.data?.data.favoriteSpotIds;
    if (ids) replaceFavoriteIds(ids);
  }, [replaceFavoriteIds, scene.data?.data.favoriteSpotIds]);
  const spots = scene.data?.data.spots ?? [];
  const selected =
    spots.find((spot) => spot.spotId === selectedSpotId) ?? spots[0] ?? null;
  const selectedOverview = useResourceQuery({
    queryKey: ["map-card-overview", selected?.spotId ?? "none"],
    queryFn: (signal) => {
      if (!selected) return Promise.reject(new Error("map_card_spot_missing"));
      return getSpotOverview(selected.spotId, signal);
    },
    enabled: Boolean(selected),
    staleTime: 60_000,
  });
  const groupedMarkers = useMemo(
    () => markerGroups(spots, viewport.zoom),
    [spots, viewport.zoom],
  );
  const markerItems = useMemo(
    () => markers(groupedMarkers, selected?.spotId ?? null, mode),
    [groupedMarkers, mode, selected?.spotId],
  );

  useDidShow(() => {
    if (selectedSpotId)
      setAnnouncement(
        `已恢复地图选择：${spots.find((spot) => spot.spotId === selectedSpotId)?.name ?? "已选观星点"}`,
      );
  });
  useDidHide(() => {
    if (regionTimer.current) clearTimeout(regionTimer.current);
  });
  useEffect(() => {
    if (!selectedSpotId && spots[0]) selectSpot(spots[0].spotId);
  }, [selectedSpotId, selectSpot, spots]);

  const openDetail = (spot: SpotSummary) => {
    selectSpot(spot.spotId);
    setAnnouncement(`已选择 ${spot.name}`);
    void Taro.navigateTo({
      url: `/spot/detail/index?spotId=${encodeURIComponent(spot.spotId)}`,
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
      setAnnouncement(`已放大 ${group.spots.length} 个正式观星点的聚合区域。`);
    } else {
      const spot = group.spots[0]!;
      selectSpot(spot.spotId);
      setAnnouncement(`已选择 ${spot.name}`);
    }
  };
  const onRegionChange = (
    event: BaseEventOrig<MapProps.onRegionEventDetail>,
  ) => {
    if (event.detail.type !== "end") return;
    if (regionTimer.current) clearTimeout(regionTimer.current);
    regionTimer.current = setTimeout(() => {
      const runtimeDetail = event.detail.detail;
      if (!runtimeDetail?.centerLocation) return;
      const center = runtimeDetail.centerLocation;
      const scale = runtimeDetail.scale;
      setViewport({
        center,
        ...(scale ? { zoom: scale } : {}),
        loadedViewport: `viewport:${Date.now()}`,
      });
    }, 250);
  };
  const runSearch = () => {
    const value = query.trim();
    if (value) addSearchHistory(value);
    setSearchOpen(true);
  };
  const locateMap = () => {
    if (isH5Proxy) {
      setAnnouncement("浏览器诊断面不请求真实位置；原生小程序可使用一次性定位。");
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
        setViewport({
          center: { latitude: 22.5431, longitude: 114.0579 },
          zoom: 8,
          loadedViewport: "shenzhen-trial-region-v1",
        });
        setAnnouncement("定位未授权；仍可搜索城市或使用深圳试点区域。");
      });
  };
  const refreshMap = () => {
    setAnnouncement("正在刷新当前区域；地图中心、筛选和选点保持不变。");
    void scene.refetch().then(
      () => setAnnouncement("当前区域已刷新；地图任务状态保持不变。"),
      () =>
        setAnnouncement(
          "刷新未完成；已保留缓存点位、地图中心、筛选和当前选点。",
        ),
    );
  };
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

  return (
    <View
      className={`${themeClass} map-page location-${locationState.toLowerCase().replace("_", "-")}${isH5Proxy ? " map-page--h5" : ""}`}
      data-miniapp-production-root
      data-route="map"
      data-delivery-target={__DELIVERY_TARGET__}
    >
      <CustomNav title="今晚去观星" subtitle="深圳试点 · 正式点位" />
      <View className="map-workspace">
      <View className="map-toolbar compact-inset">
        <View className="search-box">
          <Text aria-hidden="true">⌕</Text>
          <Input
            className="search-box__input"
            value={query}
            placeholder="搜索观星点、城市或普通地点"
            confirmType="search"
            aria-label="搜索观星点、城市或普通地点"
            onInput={(event) => setQuery(event.detail.value)}
            onConfirm={runSearch}
            onFocus={() => setSearchOpen(true)}
          />
          <SoftButton variant="ghost" label="执行搜索" onClick={runSearch}>
            ⌕
          </SoftButton>
        </View>
        <ScrollView
          className="quick-filter-scroll"
          scrollX
          enhanced
          showScrollbar={false}
          aria-label="快捷筛选摘要"
        >
          <View className="quick-filter-track">
            <Button
              className={`chip quick-filter focus-ring${countAppliedFilters(committedFilters) > 0 ? " chip--selected" : ""}`}
              aria-label={`筛选观星点，已应用 ${countAppliedFilters(committedFilters)} 项`}
              aria-pressed={countAppliedFilters(committedFilters) > 0}
              onClick={openFilters}
            >
              <Text>⚙ 筛选 · {countAppliedFilters(committedFilters)}</Text>
            </Button>
            {QUICK_FILTER_GROUPS.map(([group, label]) => (
              <Button
                key={group}
                className={`chip quick-filter focus-ring${committedFilters[group].length > 0 ? " chip--selected" : ""}`}
                aria-label={`打开筛选并调整${label}`}
                aria-pressed={committedFilters[group].length > 0}
                onClick={openFilters}
              >
                <Text>
                  {quickFilterSummary(
                    committedFilters,
                    group,
                    label,
                  )}
                </Text>
              </Button>
            ))}
          </View>
        </ScrollView>
      </View>
      {locationState === "DEFAULT_REGION" || locationState === "DENIED" ? (
        <View className="map-banner compact-inset">
          <View className="map-banner__compact card" role="status">
            <Text className="map-banner__icon" aria-hidden="true">
              !
            </Text>
            <View className="map-banner__copy">
              <Text className="type-label">
                {locationState === "DENIED"
                  ? "定位未授权 · 已显示深圳试点区域"
                  : "已显示深圳试点区域"}
              </Text>
              <Text className="type-caption">
                {locationState === "DENIED"
                  ? "核心功能仍可用，也可手动搜索地点"
                  : "仅在你点击定位时请求一次位置权限"}
              </Text>
            </View>
            <SoftButton
              variant="ghost"
              className="map-banner__action"
              label="打开定位权限说明"
              onClick={() => Taro.navigateTo({ url: "/pages/auth/index" })}
            >
              说明
            </SoftButton>
          </View>
        </View>
      ) : null}
      <View className={`map-stage${isH5Proxy ? " map-stage--proxy" : ""}`}>
        {!filterSheetOpen && !searchOpen && !listOpen ? (
          isH5Proxy ? (
            <View
              className="map-proxy"
              aria-label="浏览器诊断代理不加载第三方底图；正式点位由下方卡片和列表提供"
            >
              <View className="map-proxy__water" aria-hidden="true" />
              <View className="map-proxy__road map-proxy__road--one" aria-hidden="true" />
              <View className="map-proxy__road map-proxy__road--two" aria-hidden="true" />
              <View className="map-proxy__road map-proxy__road--three" aria-hidden="true" />
              <Text className="map-proxy__region" aria-hidden="true">试点区域</Text>
              <View className="map-proxy__pin map-proxy__pin--one" aria-hidden="true">•</View>
              <View className="map-proxy__pin map-proxy__pin--two" aria-hidden="true">•</View>
              <View className="map-proxy__notice">
                <Text className="map-proxy__eyebrow">H5 诊断代理</Text>
                <Text className="type-caption">
                  不连接第三方底图、不请求真实位置
                </Text>
                <SoftButton
                  variant="ghost"
                  label="打开地图内容的无障碍列表"
                  onClick={() => setListOpen(true)}
                >
                  查看 {spots.length} 个正式点位
                </SoftButton>
              </View>
            </View>
          ) : (
            <Map
              id="spot-map"
              className="native-map"
              latitude={viewport.center.latitude}
              longitude={viewport.center.longitude}
              scale={viewport.zoom}
              markers={markerItems}
              showLocation={locationState === "GRANTED"}
              enableZoom
              enableScroll
              enableRotate={false}
              enableOverlooking={false}
              onMarkerTap={onMarkerTap}
              onRegionChange={onRegionChange}
              onError={() => {
                setMapRuntimeError(true);
                setAnnouncement("原生地图渲染失败；正式点位列表仍可使用。");
              }}
              aria-label="观星点地图；下方和列表按钮提供等价可访问内容"
            />
          )
        ) : (
          <View className="map-paused">
            <Text className="type-label">地图已暂停交互</Text>
            <Text className="type-caption">
              正在使用可访问的筛选、搜索或列表面板；关闭后恢复原视口。
            </Text>
          </View>
        )}
        {viewport.layer === "LIGHT_POLLUTION" &&
        !filterSheetOpen &&
        !searchOpen &&
        !listOpen ? (
          <CoverView className="light-legend">
            <CoverView>粗粒度光害候选</CoverView>
            <CoverView>约 3–6 级以下 · ESTIMATED</CoverView>
            <CoverView>数据日 2026-08-06 · 非 Bortle 实测</CoverView>
          </CoverView>
        ) : null}
        {!filterSheetOpen && !searchOpen && !listOpen ? (
          <View className="map-floating-tools" aria-label="地图浮动工具">
            <SoftButton
              label={locationState === "DENIED" ? "重新请求一次性定位" : "请求一次性定位"}
              onClick={locateMap}
            >
              ◎
            </SoftButton>
            <SoftButton
              label={
                viewport.layer === "LIGHT_POLLUTION"
                  ? "关闭光害估算图层"
                  : "打开光害估算图层"
              }
              onClick={() =>
                setViewport({
                  layer:
                    viewport.layer === "LIGHT_POLLUTION"
                      ? "NORMAL"
                      : "LIGHT_POLLUTION",
                })
              }
            >
              {viewport.layer === "LIGHT_POLLUTION" ? "▣" : "▱"}
            </SoftButton>
            <SoftButton
              className="map-refresh-control"
              label="刷新当前区域"
              onClick={refreshMap}
            >
              ↻
            </SoftButton>
            <SoftButton
              label="打开地图内容的无障碍列表"
              onClick={() => setListOpen(true)}
            >
              ≡
            </SoftButton>
          </View>
        ) : null}
      </View>
      {mapRuntimeError || pageState !== "READY" ? (
      <View className="map-status compact-inset">
        {mapRuntimeError ? (
          <StatusPanel
            state="ERROR"
            detail="原生地图当前无法渲染；地图内容列表、筛选、收藏和详情路径仍可使用。"
            recoveryLabel="重试地图"
            onRecover={() => setMapRuntimeError(false)}
          />
        ) : null}
        {pageState !== "READY" ? <StatusPanel
          state={pageState}
          detail={scene.data?.warnings.join(" ") ?? "正在加载正式点位与来源。"}
          recoveryLabel={pageState === "ERROR" ? "重试" : undefined}
          onRecover={
            pageState === "ERROR" ? () => void scene.refetch() : undefined
          }
        /> : null}
      </View>
      ) : null}
      {selected ? (
        <View className="selected-card-wrap compact-inset safe-bottom">
          <ScrollView
            className="selected-card-scroll"
            scrollY
            enhanced
            showScrollbar={false}
            aria-label={`${selected.name}选点摘要`}
          >
            <SpotCard
              spot={selected}
              route={selectedOverview.data?.data.route ?? null}
              favorite={favoriteIds.includes(selected.spotId)}
              onFavorite={() => void toggleFavorite(selected.spotId)}
              onRecenter={() => {
                setViewport({ center: selected.gcj02, zoom: 12 });
                setAnnouncement(`地图中心已回到 ${selected.name}。`);
              }}
              onRoute={() =>
                void Taro.showModal({
                  title: "路线能力边界",
                  content:
                    selectedOverview.data?.data.route.kind ===
                    "ROUTE_ESTIMATE"
                      ? selectedOverview.data.data.route.lastRoad
                      : "当前未接入具备许可的驾车路线供应商。直线距离会明确标注，且不会冒充驾车距离或预计用时；可进入详情继续核验末段道路和停车。",
                  showCancel: false,
                  confirmText: "知道了",
                })
              }
              onOpen={() => openDetail(selected)}
            />
          </ScrollView>
        </View>
      ) : null}
      </View>
      <View className="sr-live" role="status" aria-live="polite">
        <Text>{announcement}</Text>
      </View>
      {filterSheetOpen ? <FilterSheet avoidSystemTabBar={isH5Proxy} /> : null}
      {searchOpen ? (
        <View className={`panel-backdrop${isH5Proxy ? " panel-backdrop--avoid-tabbar" : ""}`}>
          <View
            className="search-panel theme-day safe-bottom"
            role="dialog"
            aria-modal="true"
            aria-label="搜索结果"
          >
            <View className="panel-header">
              <Text className="type-page-title">搜索</Text>
              <SoftButton
                variant="ghost"
                label="关闭搜索"
                onClick={() => setSearchOpen(false)}
              >
                关闭
              </SoftButton>
            </View>
            <ScrollView scrollY className="panel-scroll">
              <View className="section-stack">
                <Text className="type-section">正式观星点</Text>
                {spots.length ? (
                  spots
                    .slice(0, 12)
                    .map((spot) => (
                      <SpotCard
                        key={spot.spotId}
                        spot={spot}
                        favorite={favoriteIds.includes(spot.spotId)}
                        onFavorite={() => void toggleFavorite(spot.spotId)}
                        onOpen={() => openDetail(spot)}
                      />
                    ))
                ) : (
                  <StatusPanel
                    state="EMPTY"
                    detail="没有匹配的正式点位。可调整筛选或把普通地点用于移动地图；普通地点不会创建 spot_id。"
                  />
                )}
                <View className="history-header">
                  <Text className="type-section">最近搜索</Text>
                  <SoftButton
                    variant="ghost"
                    label="清除最近搜索"
                    onClick={clearSearchHistory}
                  >
                    清除
                  </SoftButton>
                </View>
                {searchHistory.map((item) => (
                  <Button
                    className="history-row"
                    key={item}
                    onClick={() => setQuery(item)}
                    aria-label={`使用最近搜索：${item}`}
                  >
                    <Text>{item}</Text>
                    <Text className="type-caption">可清除的本地记录</Text>
                  </Button>
                ))}
                <View className="ordinary-place card">
                  <Text className="type-label">普通地点边界</Text>
                  <Text className="type-caption">
                    普通地点只能移动地图、查找附近正式点位或创建独立点位提案；不能进入夜空，也不会合成
                    spot_id。
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      ) : null}
      {listOpen ? (
        <View className={`panel-backdrop${isH5Proxy ? " panel-backdrop--avoid-tabbar" : ""}`}>
          <View
            className="search-panel theme-day safe-bottom"
            role="dialog"
            aria-modal="true"
            aria-label="地图观星点列表"
          >
            <View className="panel-header">
              <View>
                <Text className="type-page-title">地图内容列表</Text>
                <Text className="type-caption">
                  与原生地图 marker 共用同一选择状态
                </Text>
              </View>
              <SoftButton
                variant="ghost"
                label="关闭观星点列表"
                onClick={() => setListOpen(false)}
              >
                关闭
              </SoftButton>
            </View>
            <ScrollView scrollY className="panel-scroll">
              <View className="section-stack">
                {spots.map((spot) => (
                  <SpotCard
                    key={spot.spotId}
                    spot={spot}
                    favorite={favoriteIds.includes(spot.spotId)}
                    onFavorite={() => void toggleFavorite(spot.spotId)}
                    onOpen={() => openDetail(spot)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}
