import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { Button, Image, Input, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useMemo, useState } from "react";
import { gcj02ToWgs84 } from "@starward/coordinate-system";
import {
  FILTER_GROUPS,
  FILTER_OPTIONS,
  type DarkSkyCandidateRef,
  type FilterOptionId,
  type OrdinaryPlaceRef,
  type PageState,
  type SpotSummary,
} from "@starward/miniapp-contracts";
import { NotificationRegion } from "@/components/notification";
import { SelectedCardStar } from "@/components/selected-card-star";
import {
  SemanticIcon,
  type SemanticIconName,
} from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useThemeClass } from "@/hooks/use-theme";
import {
  errorMessage,
  getMapScene,
  resolveObservationContext,
  restoreObservationContext,
  searchPlaces,
} from "@/services/api-client";
import { isMiniappRequestCancelled } from "@/services/request-lifecycle";
import { useAppStore } from "@/state/app-store";
import { calendarDateInTimezone } from "@/utils/zoned-date";
import "./search-page.scss";

function localDateForNow(timezone = "Asia/Shanghai") {
  return calendarDateInTimezone(new Date(), timezone);
}

function currentTimezoneHint(): "Asia/Shanghai" | "Asia/Hong_Kong" {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone === "Asia/Hong_Kong" ? timezone : "Asia/Shanghai";
}

function isRenderableMedia(media: SpotSummary["media"][number]) {
  return Boolean(
    media.state !== "EXPIRED" &&
      media.state !== "UNAVAILABLE" &&
      media.state !== "SAMPLE_DATA" &&
      media.license.trim() &&
      (media.thumbnailPath.trim() || media.localPath.trim()),
  );
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

function layerForOverlay(overlay: "NONE" | "LIGHT" | "TOTAL_CLOUD" | "OPPORTUNITY") {
  if (overlay === "LIGHT") return "LIGHT_POLLUTION" as const;
  if (overlay === "TOTAL_CLOUD") return "CLOUD" as const;
  if (overlay === "OPPORTUNITY") return "OPPORTUNITY" as const;
  return "NORMAL" as const;
}

function optionIsSelected(
  committedFilters: ReturnType<typeof useAppStore.getState>["committedFilters"],
  optionId: FilterOptionId,
  group: (typeof FILTER_GROUPS)[number]["key"],
) {
  return committedFilters[group].includes(optionId);
}

const FILTER_ICON_BY_ID: Record<FilterOptionId, SemanticIconName> = {
  tonightRecommended: "conditions",
  bestWindowDuration: "conditions",
  distanceDriveTime: "location",
  lightPollution: "horizon",
  lessCloud: "conditions",
  parking: "location",
  restroom: "info",
  driveUpAccess: "compass",
  photoForeground: "images",
  campingOvernightParking: "location",
  specificCelestialEvent: "horizon",
  lowCloudThreshold: "conditions",
  moonImpact: "conditions",
  hikingDifficulty: "compass",
  signal: "wifi-off",
  charging: "info",
  openSkyDirection: "horizon",
  lastVerifiedAt: "info",
};

export function MapSearchSurface() {
  const themeClass = useThemeClass();
  const finderQuery = useAppStore((state) => state.finderQuery);
  const committedFilters = useAppStore((state) => state.committedFilters);
  const observationContext = useAppStore((state) => state.observationContext);
  const analysisOverlay = useAppStore((state) => state.analysisOverlay);
  const preferences = useAppStore((state) => state.preferences);
  const viewport = useAppStore((state) => state.viewport);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const searchHistory = useAppStore((state) => state.searchHistory);
  const mapResetVersion = useAppStore((state) => state.mapResetVersion);
  const setFinderQuery = useAppStore((state) => state.setFinderQuery);
  const setViewport = useAppStore((state) => state.setViewport);
  const setObservationContext = useAppStore((state) => state.setObservationContext);
  const selectSpot = useAppStore((state) => state.selectSpot);
  const addSearchHistory = useAppStore((state) => state.addSearchHistory);
  const clearSearchHistory = useAppStore((state) => state.clearSearchHistory);
  const cancelFilters = useAppStore((state) => state.cancelFilters);
  const toggleDraftFilter = useAppStore((state) => state.toggleDraftFilter);
  const applyFilters = useAppStore((state) => state.applyFilters);
  const notify = useAppStore((state) => state.notify);
  const [focused, setFocused] = useState(true);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [wantedOpen, setWantedOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState(finderQuery.trim());
  const [announcement, setAnnouncement] = useState("");

  useDidShow(() => setPageVisible(true));
  useDidHide(() => setPageVisible(false));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(finderQuery.trim()), 220);
    return () => clearTimeout(timer);
  }, [finderQuery]);

  const contextQuery = useResourceQuery({
    queryKey: [
      "search-observation-context",
      mapResetVersion,
      observationContext?.contextId,
      observationContext?.contextFingerprint,
      observationContext?.revision,
      Number(viewport.center.latitude.toFixed(5)),
      Number(viewport.center.longitude.toFixed(5)),
    ],
    queryFn: (signal) => {
      if (observationContext) return restoreObservationContext(observationContext, signal);
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
  const activeContext = contextQuery.data?.data ?? null;

  useEffect(() => {
    const incoming = contextQuery.data?.data;
    const current = useAppStore.getState().observationContext;
    if (
      pageVisible &&
      incoming &&
      (current?.contextId !== incoming.contextId ||
        current.revision !== incoming.revision ||
        current.contextFingerprint !== incoming.contextFingerprint)
    ) {
      setObservationContext(incoming);
    }
  }, [contextQuery.data?.data, pageVisible, setObservationContext]);

  const scene = useResourceQuery({
    queryKey: [
      "search-scene",
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
      committedFilters,
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
        "",
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
    queryKey: ["spot-search", debouncedQuery],
    queryFn: (signal) => searchPlaces(debouncedQuery, signal),
    enabled: pageVisible && debouncedQuery.length > 0,
    staleTime: 5 * 60_000,
  });

  const sceneSpots = scene.data?.data.spots ?? [];
  const formalSpots = debouncedQuery
    ? placeSearch.data?.data.formalSpots ?? []
    : sceneSpots;
  const wanted = formalSpots.filter((spot) => favoriteIds.includes(spot.spotId));
  const other = formalSpots.filter((spot) => !favoriteIds.includes(spot.spotId));
  const candidates = placeSearch.data?.data.candidates ?? [];
  const ordinaryPlaces = placeSearch.data?.data.ordinaryPlaces ?? [];
  const searchState: PageState = contextQuery.isError
    ? isPermissionError(contextQuery.error)
      ? "PERMISSION_DENIED"
      : "ERROR"
    : !activeContext || scene.isPending || (debouncedQuery.length > 0 && placeSearch.isPending)
      ? "LOADING"
      : scene.isError || placeSearch.isError
        ? isPermissionError(scene.error ?? placeSearch.error)
          ? "PERMISSION_DENIED"
          : "ERROR"
        : formalSpots.length === 0 && candidates.length === 0 && ordinaryPlaces.length === 0
          ? "EMPTY"
          : scene.data?.dataState === "STALE_USABLE" || placeSearch.data?.dataState === "STALE_USABLE"
            ? "STALE"
            : scene.data?.dataState === "PARTIAL" || placeSearch.data?.dataState === "PARTIAL"
              ? "PARTIAL"
              : "READY";

  const blurSearch = () => {
    setFocused(false);
    setSuggestionsOpen(false);
  };

  const leaveSearch = async () => {
    try {
      await Taro.navigateBack({ delta: 1 });
    } catch {
      await Taro.switchTab({ url: "/pages/map/index" });
    }
  };

  const selectFormal = async (spot: SpotSummary) => {
    // Keep the shared query in the retained Map instance so its next scene
    // response contains the same formal object before the panel opens.
    setFinderQuery(spot.name);
    selectSpot(spot.spotId);
    setViewport({ center: spot.gcj02, zoom: Math.max(12, viewport.zoom) });
    if (finderQuery.trim()) addSearchHistory(finderQuery);
    setSuggestionsOpen(false);
    setAnnouncement(`已选择${spot.name}；返回同一地图并打开中面板。`);
    await leaveSearch();
  };

  const moveMapReference = async (
    result: OrdinaryPlaceRef | DarkSkyCandidateRef,
  ) => {
    const center = {
      latitude: result.location.latitude,
      longitude: result.location.longitude,
    };
    selectSpot(null);
    setViewport({ center, zoom: Math.max(12, viewport.zoom) });
    if (finderQuery.trim()) addSearchHistory(finderQuery);
    try {
      if (activeContext) {
        const point = gcj02ToWgs84({
          lat: center.latitude,
          lon: center.longitude,
          system: "GCJ-02",
        });
        const response = await resolveObservationContext({
          location: {
            kind: "MAP_POINT",
            displayName: result.label,
            wgs84: {
              system: "WGS84",
              latitude: point.lat,
              longitude: point.lon,
            },
            source: "MAP_VIEWPORT",
            timezoneHint: currentTimezoneHint(),
          },
          localDate: activeContext.localDate,
          selectedAt: activeContext.selectedAtUtc,
          eventInstanceId: activeContext.eventInstanceId,
          targetProfile: activeContext.targetProfile,
        });
        setObservationContext(response.data);
      }
      setAnnouncement(`地图已移动到${result.label}；正在查找附近正式观星点。`);
      await leaveSearch();
    } catch (error) {
      if (isMiniappRequestCancelled(error)) return;
      notify({ owner: "search", placement: "inline", tone: "warning", title: "地图已移动，动态条件未更新", body: `${errorMessage(error)}。当前地点不会被当作正式观星点或生成今晚结论。`, dismissible: true, dedupeKey: "search-map-reference-context-failed" });
    }
  };

  const commitFilter = (optionId: FilterOptionId) => {
    const option = FILTER_OPTIONS.find((item) => item.id === optionId);
    if (!option) return;
    cancelFilters();
    toggleDraftFilter(option.id);
    applyFilters();
    setAnnouncement(`${option.label}已立即提交。`);
  };

  const historyRows = searchHistory.length
    ? searchHistory
    : placeSearch.data?.data.history.map((item) => item.label) ?? [];

  return (
    <View
      className={`${themeClass} spot-search-page`}
      data-miniapp-production-root
      data-route="spot-search"
      data-delivery-target={__DELIVERY_TARGET__}
      onClick={blurSearch}
    >
      <View className="spot-search-shell" data-control="spot-search-shell">
        <View
          className="spot-search-field"
          data-control="spot-search-field"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            className="spot-search-field__leading focus-ring"
            aria-label={focused ? "返回地图" : "聚焦搜索"}
            onClick={() => {
              if (focused) void leaveSearch();
              else {
                setFocused(true);
                setSuggestionsOpen(true);
              }
            }}
          >
            <SemanticIcon name={focused ? "arrow-left" : "search"} />
          </Button>
          <Input
            className="spot-search-field__input"
            value={finderQuery}
            focus={focused}
            placeholder="搜地点 / 区域 / 观星点"
            confirmType="search"
            aria-label="搜索正式观星点、城市或普通地点"
            onInput={(event) => {
              setFinderQuery(event.detail.value);
              setFocused(true);
              setSuggestionsOpen(true);
            }}
            onFocus={() => {
              setFocused(true);
              setSuggestionsOpen(true);
            }}
            onBlur={blurSearch}
            onConfirm={() => setSuggestionsOpen(false)}
          />
        </View>

        {focused && suggestionsOpen ? (
          <ScrollView
            className="spot-search-query-overlay"
            data-control="spot-search-query-overlay"
            scrollY
            enhanced
            showScrollbar={false}
            aria-label="搜索历史与地点结果"
            onClick={(event) => event.stopPropagation()}
          >
            {debouncedQuery ? (
              <View className="spot-search-suggestions">
                {placeSearch.data?.data.formalSpots.map((spot) => (
                  <Button key={spot.spotId} className="spot-search-suggestion" onClick={() => void selectFormal(spot)}>
                    <Text>{spot.name}</Text>
                    <Text className="type-caption">{spot.region || "正式观星点"}</Text>
                  </Button>
                ))}
                {candidates.map((result) => (
                  <Button key={result.candidateId} className="spot-search-suggestion" onClick={() => void moveMapReference(result)}>
                    <Text>{result.label}</Text>
                    <Text className="type-caption">{result.region || result.address || "资料待核验 · 只移动地图"}</Text>
                  </Button>
                ))}
                {ordinaryPlaces.map((result) => (
                  <Button key={result.placeId} className="spot-search-suggestion" onClick={() => void moveMapReference(result)}>
                    <Text>{result.label}</Text>
                    <Text className="type-caption">{result.region || result.address || "普通地点 · 只移动地图"}</Text>
                  </Button>
                ))}
                {!placeSearch.isPending && !placeSearch.isError && !placeSearch.data?.data.formalSpots.length && !candidates.length && !ordinaryPlaces.length ? (
                  <Text className="type-caption spot-search-query-status">没有匹配结果；可以换一个名称或城市。</Text>
                ) : null}
              </View>
            ) : (
              <View className="spot-search-history">
                <View className="spot-search-history__heading">
                  <Text className="type-caption">最近搜索</Text>
                  {historyRows.length ? <Button className="spot-search-history__clear" onClick={clearSearchHistory}>清除</Button> : null}
                </View>
                {historyRows.length ? historyRows.map((item) => (
                  <Button key={item} className="spot-search-history__row" onClick={() => { setFinderQuery(item); setFocused(true); setSuggestionsOpen(true); }}>
                    <Text>{item}</Text>
                  </Button>
                )) : <Text className="type-caption">暂无本地搜索记录</Text>}
              </View>
            )}
            <Text className="type-caption spot-search-boundary">普通地点和待核验候选只用于移动地图或查找附近正式观星点，不能直接进入点位详情或今晚观星。</Text>
          </ScrollView>
        ) : null}

        <View
          className="spot-search-filter-scroll"
          aria-label="可立即提交的筛选选项"
          onClick={(event) => event.stopPropagation()}
        >
          <View className="spot-search-filter-group" data-control="spot-search-filter-group" role="radiogroup" aria-label="地图筛选">
            {FILTER_OPTIONS.map((option) => {
              const capability = scene.data?.data.filterCapabilities.byGroup[option.group];
              const disabled = capability?.state === "UNAVAILABLE";
              const selected = optionIsSelected(committedFilters, option.id, option.group);
              return (
                <Button
                  key={option.id}
                  className={`spot-search-filter-choice${selected ? " spot-search-filter-choice--selected" : ""}`}
                  data-control="spot-search-filter-choice"
                  disabled={disabled}
                  aria-checked={selected}
                  aria-pressed={selected}
                  aria-label={`${option.label}${disabled ? "，当前不可用" : selected ? "，已应用" : ""}`}
                  onClick={() => commitFilter(option.id)}
                >
                  <SemanticIcon
                    name={FILTER_ICON_BY_ID[option.id]}
                    className="spot-search-filter-choice__prefix"
                  />
                  {option.label}
                  {selected ? (
                    <SelectedCardStar className="spot-search-filter-choice__selected-ornament" />
                  ) : null}
                </Button>
              );
            })}
          </View>
        </View>

        <View className="spot-search-feedback" onClick={(event) => event.stopPropagation()}>
          <NotificationRegion owner="search" placement="inline" />
          {searchState !== "READY" ? (
            <StatusPanel
              state={searchState}
              detail={
                (contextQuery.isError ? errorMessage(contextQuery.error) : scene.isError ? errorMessage(scene.error) : placeSearch.isError ? errorMessage(placeSearch.error) : "") ||
                (isOfflineError(contextQuery.error ?? scene.error ?? placeSearch.error)
                  ? "当前网络不可用；不会把普通地点或旧数据伪装成正式点位。"
                  : searchState === "EMPTY"
                    ? "没有匹配的正式观星点；可移动地图或换一个名称。"
                    : searchState === "PARTIAL"
                      ? "部分搜索结果可用，缺失资料会明确标注。"
                      : "正在解析观测上下文和搜索结果。")
              }
              recoveryLabel={searchState === "ERROR" || searchState === "PERMISSION_DENIED" ? "返回地图重试" : undefined}
              onRecover={() => void leaveSearch()}
            />
          ) : null}
        </View>

        <ScrollView className="spot-search-result-list" data-control="spot-search-result-list" scrollY enhanced showScrollbar={false} aria-label="正式观星点结果" onClick={(event) => event.stopPropagation()}>
          <View className="spot-search-result-summary">
            <Text className="type-caption">{formalSpots.length} 个正式观星点 · 选择卡片会返回同一地图并打开中面板</Text>
          </View>
          <View className="spot-search-partition">
            <Button className="spot-search-partition__toggle" aria-expanded={wantedOpen} onClick={() => setWantedOpen((value) => !value)}>
              <Text className="type-section">想去</Text>
              <Text className="type-caption">{wanted.length}</Text>
              <SemanticIcon name={wantedOpen ? "chevron-up" : "chevron-down"} />
            </Button>
            {wantedOpen ? (
              wanted.length ? wanted.map((spot) => <SearchResultCard key={spot.spotId} spot={spot} onSelect={() => void selectFormal(spot)} />) : <Text className="type-caption spot-search-empty">暂无已保存的正式点位。</Text>
            ) : null}
          </View>
          <View className="spot-search-partition">
            <Button className="spot-search-partition__toggle" aria-expanded={otherOpen} onClick={() => setOtherOpen((value) => !value)}>
              <Text className="type-section">其他观星点</Text>
              <Text className="type-caption">{other.length}</Text>
              <SemanticIcon name={otherOpen ? "chevron-up" : "chevron-down"} />
            </Button>
            {otherOpen ? (
              other.length ? other.map((spot) => <SearchResultCard key={spot.spotId} spot={spot} onSelect={() => void selectFormal(spot)} />) : <Text className="type-caption spot-search-empty">没有匹配的正式点位。</Text>
            ) : null}
          </View>
        </ScrollView>
      </View>
      <View className="sr-live" role="status" aria-live="polite"><Text>{announcement}</Text></View>
    </View>
  );
}

function SearchResultCard({ spot, onSelect }: { spot: SpotSummary; onSelect: () => void }) {
  const media = spot.media.filter(isRenderableMedia)[0];
  return (
    <Button className={`spot-search-result-card${media ? " spot-search-result-card--with-media" : ""}`} data-control="spot-search-result-card" onClick={onSelect} aria-label={`选择${spot.name}`}>
      {media ? <Image className="spot-search-result-card__media" src={media.thumbnailPath || media.localPath} mode="aspectFill" lazyLoad ariaLabel={media.alt || `${spot.name}现场照片`} /> : null}
      <View className="spot-search-result-card__copy">
        <Text className="spot-search-result-card__title">{spot.name}</Text>
        <Text className="type-caption">{spot.region || "区域暂无数据"}</Text>
        <Text className="type-caption">{spot.address || "地址暂无数据"}</Text>
      </View>
    </Button>
  );
}
