import { FloatingNotificationHost } from "@/components/notification";
import { choosePlatformLocation } from "@/services/platform-location";
import { nativeNavigationInsets } from "@/theme/native-metrics";
import type { CSSProperties } from "react";
import Taro, { useDidHide, useDidShow } from "@tarojs/taro";
import { Button, Input, ScrollView, Text, View } from "@tarojs/components";
import { useEffect, useMemo, useRef, useState } from "react";
import { gcj02ToWgs84 } from "@starward/coordinate-system";
import {
  FILTER_GROUPS,
  FILTER_OPTIONS,
  countAppliedFilters,
  type DarkSkyCandidateRef,
  type FilterCategoryId,
  type FilterGroupKey,
  type FilterOptionId,
  type OrdinaryPlaceRef,
  type PageState,
  type SpotSummary,
  type SpotFilterEvidence,
} from "@starward/miniapp-contracts";
import { NotificationRegion } from "@/components/notification";
import {
  SemanticIcon,
  type SemanticIconName,
} from "@/components/semantic-asset";
import { StatusPanel } from "@/components/status-panel";
import { SourceAttribution } from "@/components/source-attribution";
import { SelectedCardStar } from "@/components/selected-card-star";
import { SpotIdentityContent } from "@/components/spot-identity-content";
import { FilterSheet } from "@/components/filter-sheet";
import { NativeBackBoundary } from "@/components/native-back-boundary";
import { useRedLightHandoff } from "@/components/red-light-handoff";
import { useResourceQuery } from "@/hooks/use-resource-query";
import { useMapForecastQuery } from "@/hooks/use-forecast-query";
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
import { currentTimezoneHint } from "@/utils/current-timezone-hint";
import { canApplyContextRestore } from "@/services/observation-context-version";
import "./search-page.scss";

function localDateForNow(timezone = "Asia/Shanghai") {
  return calendarDateInTimezone(new Date(), timezone);
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
  lightPollution: "horizon",
  lessCloud: "conditions",
  parking: "location",
  restroom: "info",
  driveUpAccess: "compass",
  photoForeground: "images",
  campingOvernightParking: "location",
  specificCelestialEvent: "horizon",
  moonImpact: "conditions",
  hikingDifficulty: "compass",
  signal: "wifi-off",
  charging: "info",
  openSkyDirection: "horizon",
  lastVerifiedAt: "info",
};
const FILTER_LABEL_BY_GROUP = Object.fromEntries(
  FILTER_GROUPS.map((group) => [group.key, group.title]),
) as Readonly<Record<FilterGroupKey, string>>;

export function MapSearchSurface() {
  const { statusBarHeight, safeTop } = nativeNavigationInsets();
  const themeClass = useThemeClass();
  const handoff = useRedLightHandoff();
  const finderQuery = useAppStore((state) => state.finderQuery);
  const committedFilters = useAppStore((state) => state.committedFilters);
  const filterSheetOpen = useAppStore((state) => state.filterSheetOpen);
  const observationContext = useAppStore((state) => state.observationContext);
  const analysisOverlay = useAppStore((state) => state.analysisOverlay);
  const preferences = useAppStore((state) => state.preferences);
  const viewport = useAppStore((state) => state.viewport);
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const accountOwnerId = useAppStore((state) => state.accountOwnerId);
  const searchHistory = useAppStore((state) => state.searchHistory);
  const mapResetVersion = useAppStore((state) => state.mapResetVersion);
  const setFinderQuery = useAppStore((state) => state.setFinderQuery);
  const setViewport = useAppStore((state) => state.setViewport);
  const setObservationContext = useAppStore((state) => state.setObservationContext);
  const selectSpot = useAppStore((state) => state.selectSpot);
  const requestSpotOpen = useAppStore((state) => state.requestSpotOpen);
  const addSearchHistory = useAppStore((state) => state.addSearchHistory);
  const clearSearchHistory = useAppStore((state) => state.clearSearchHistory);
  const cancelFilters = useAppStore((state) => state.cancelFilters);
  const openFilters = useAppStore((state) => state.openFilters);
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
  const [filterCategory, setFilterCategory] = useState<FilterCategoryId>("OBSERVATION");
  const selectionVersion = useRef(0);
  const nativeSelectionPending = useRef<number | null>(null);

  useDidShow(() => setPageVisible(true));
  useDidHide(() => { if (!nativeSelectionPending.current) selectionVersion.current++; setPageVisible(false); });
  useEffect(() => () => { selectionVersion.current++; }, []);

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
      useAppStore.getState().mapResetVersion === mapResetVersion &&
      canApplyContextRestore(observationContext, current, incoming) &&
      (current?.contextId !== incoming.contextId ||
        current.revision !== incoming.revision ||
        current.contextFingerprint !== incoming.contextFingerprint)
    ) {
      setObservationContext(incoming);
    }
  }, [contextQuery.data?.data, pageVisible, observationContext, mapResetVersion, setObservationContext]);

  const scene = useMapForecastQuery({
    queryKey: [
      "search-scene",
      accountOwnerId,
      activeContext?.contextId,
      activeContext?.contextFingerprint,
      activeContext?.revision,
      committedFilters,
      debouncedQuery,
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
        debouncedQuery,
        debouncedQuery ? undefined : viewport,
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
    staleTime: debouncedQuery ? 0 : 60_000,
  });

  const placeSearch = useResourceQuery({
    queryKey: ["spot-search", debouncedQuery],
    queryFn: (signal) => searchPlaces(debouncedQuery, signal),
    enabled: pageVisible && debouncedQuery.length > 0,
    // Publication and moderation can change a formal result while this Mini
    // Program session stays alive. A newly opened search route must therefore
    // revalidate the query instead of presenting a five-minute-old formal
    // identity as current.
    staleTime: 0,
  });

  // The debounced request still belongs to the previous input for a short
  // interval. Its rows must not remain actionable under the new input.
  const queryPending = finderQuery.trim() !== debouncedQuery;
  const queryUnconfirmed = queryPending || Boolean(debouncedQuery && (scene.isFetching || placeSearch.isFetching));
  const visibleScene = queryUnconfirmed ? null : scene.data?.data;
  const visiblePlaces = queryUnconfirmed ? null : placeSearch.data?.data;
  const sceneSpots = visibleScene?.spots ?? [];
  const formalSpots = sceneSpots;
  const wanted = formalSpots.filter((spot) => favoriteIds.includes(spot.spotId));
  const other = formalSpots.filter((spot) => !favoriteIds.includes(spot.spotId));
  const candidates = visiblePlaces?.candidates ?? [];
  const ordinaryPlaces = visiblePlaces?.ordinaryPlaces ?? [];
  const activeFilterGroups = FILTER_GROUPS
    .map((group) => group.key)
    .filter((group) => committedFilters[group].length > 0);
  const incompleteActiveCoverage = activeFilterGroups
    .map((group) => ({ group, capability: visibleScene?.filterCapabilities.byGroup[group] }))
    .filter((item) => item.capability && item.capability.state !== "AVAILABLE");
  const hasUnknownIncludedSpot = formalSpots.some((spot) =>
    activeFilterGroups.some(
      (group) => visibleScene?.filterEvidence?.[spot.spotId]?.[group].state === "UNKNOWN",
    ),
  );
  const expiredEmptyFilter = !queryUnconfirmed && formalSpots.length === 0 && activeFilterGroups.includes("LESS_CLOUD") &&
    Date.parse(visibleScene?.forecastValidUntil ?? "") <= Date.now();
  const staleSearchResource = Boolean(
    contextQuery.refreshError || contextQuery.data?.dataState === "STALE_USABLE" ||
    (!queryUnconfirmed && (scene.refreshError || scene.data?.dataState === "STALE_USABLE" ||
      placeSearch.refreshError || placeSearch.data?.dataState === "STALE_USABLE")),
  );
  const searchState: PageState = contextQuery.isError
    ? isPermissionError(contextQuery.error)
      ? "PERMISSION_DENIED"
      : "ERROR"
    : queryUnconfirmed || !activeContext || scene.isPending || (debouncedQuery.length > 0 && placeSearch.isPending)
      ? "LOADING"
      : scene.isError || placeSearch.isError
        ? isPermissionError(scene.error ?? placeSearch.error)
          ? "PERMISSION_DENIED"
          : "ERROR"
        : expiredEmptyFilter ? "PARTIAL"
        : staleSearchResource
          ? "STALE"
          : formalSpots.length === 0 && candidates.length === 0 && ordinaryPlaces.length === 0
            ? "EMPTY"
            : scene.data?.dataState === "PARTIAL" || placeSearch.data?.dataState === "PARTIAL"
              ? "PARTIAL"
              : "READY";
  useEffect(() => {
    if (!pageVisible) return;
    const requestError = contextQuery.error ?? contextQuery.refreshError ??
      (queryUnconfirmed ? null : scene.error ?? scene.refreshError ?? placeSearch.error ?? placeSearch.refreshError);
    const staleFallback = contextQuery.data?.dataState === "STALE_USABLE" ||
      (!queryUnconfirmed && (scene.data?.dataState === "STALE_USABLE" || placeSearch.data?.dataState === "STALE_USABLE"));
    if ((!requestError && !staleFallback) || (requestError && isPermissionError(requestError))) return;
    notify({ owner: "search", placement: "floating", tone: "info",
      title: "搜索数据异常", body: "地点与观星点结果暂时无法更新，可在页面中重试。",
      dedupeKey: "search-resource-failed" });
  }, [contextQuery.data?.dataState, contextQuery.error, contextQuery.refreshError, notify, pageVisible, queryUnconfirmed,
    placeSearch.data?.dataState, placeSearch.error, placeSearch.refreshError, scene.data?.dataState,
    scene.error, scene.refreshError]);
  const retrySearchResources = () => {
    const requests: Promise<unknown>[] = [];
    if (contextQuery.isError || contextQuery.refreshError || contextQuery.data?.dataState === "STALE_USABLE")
      requests.push(contextQuery.refetch());
    if (activeContext && (scene.isError || scene.refreshError || scene.data?.dataState === "STALE_USABLE"))
      requests.push(scene.refetch());
    if (debouncedQuery && (placeSearch.isError || placeSearch.refreshError || placeSearch.data?.dataState === "STALE_USABLE"))
      requests.push(placeSearch.refetch());
    void Promise.all(requests).catch(() => {});
  };
  const showPartitionEmpty = !staleSearchResource && (searchState === "READY" || searchState === "PARTIAL");

  const blurSearch = () => {
    setFocused(false);
    setSuggestionsOpen(false);
  };

  const leaveSearch = async () => {
    selectionVersion.current++;
    try {
      await Taro.navigateBack({ delta: 1 });
    } catch {
      try {
        await Taro.switchTab({ url: "/pages/map/index" });
      } catch (error) {
        notify({ owner: "search", placement: "inline", tone: "warning", title: "暂时无法返回地图", body: `${errorMessage(error)}。搜索内容和选择已保留，请再次返回。`, dismissible: true, dedupeKey: "search-return-failed" });
        return;
      }
    }
    const state = useAppStore.getState();
    for (const item of state.notifications) {
      if (item.owner === "search" && item.dedupeKey === "search-return-failed") {
        state.dismissNotification(item.id);
      }
    }
  };

  const selectFormal = async (spot: SpotSummary) => {
    selectionVersion.current++;
    // Keep the shared query in the retained Map instance so its next scene
    // response contains the same formal object before the panel opens.
    setFinderQuery(spot.name);
    requestSpotOpen(spot.spotId);
    setViewport({ center: spot.gcj02, zoom: Math.max(12, viewport.zoom) });
    if (finderQuery.trim()) addSearchHistory(finderQuery);
    setSuggestionsOpen(false);
    setAnnouncement(`已选择${spot.name}`);
    await leaveSearch();
  };

  const moveMapReference = async (
    result: Pick<OrdinaryPlaceRef | DarkSkyCandidateRef, "location" | "label">,
  ) => {
    const version = ++selectionVersion.current;
    setSuggestionsOpen(false);
    const center = {
      latitude: result.location.latitude,
      longitude: result.location.longitude,
    };
    try {
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
          localDate: activeContext?.localDate ?? localDateForNow(currentTimezoneHint()),
          ...(activeContext ? {
            selectedAt: activeContext.selectedAtUtc,
            eventInstanceId: activeContext.eventInstanceId,
            targetProfile: activeContext.targetProfile,
          } : {}),
        });
        if (version !== selectionVersion.current) return;
        setObservationContext(response.data);
      if (version !== selectionVersion.current) return;
      selectSpot(null);
      setViewport({ center, zoom: Math.max(12, viewport.zoom) });
      if (finderQuery.trim()) addSearchHistory(finderQuery);
      setFinderQuery("");
      setAnnouncement(`地图已移动到${result.label}；正在查找附近正式观星点。`);
      await leaveSearch();
    } catch (error) {
      if (version !== selectionVersion.current) return;
      if (isMiniappRequestCancelled(error)) return;
      notify({ owner: "search", placement: "floating", tone: "warning", title: "地点未切换", body: "地点资料暂未更新，原地点与搜索结果已保留，请重试。", dismissible: true, dedupeKey: "search-map-reference-context-failed" });
    }
  };

  const chooseMapLocation = async () => {
    if (nativeSelectionPending.current) return;
    const version = ++selectionVersion.current;
    nativeSelectionPending.current = version;
    const ownerPage = Taro.getCurrentPages().at(-1);
    const current = () => version === selectionVersion.current && Taro.getCurrentPages().at(-1) === ownerPage;
    try {
      const allowed = await handoff.confirm("微信选点界面可能较亮，无法跟随红光模式。");
      if (!allowed || !current()) return;
      const selected = await choosePlatformLocation({ isCurrent: current, center: viewport.center, allowUnthemedHandoff: true });
      if (!selected || !current()) return;
      nativeSelectionPending.current = null;
      await moveMapReference({
        label: selected.label,
        location: selected.location,
      });
    } catch (error) {
      if (!current() || /cancel/iu.test(errorMessage(error))) return;
      notify({ owner: "search", placement: "floating", tone: "warning", title: "地点未选择",
        body: "微信选点暂不可用，请稍后重试。原有地点和搜索结果已保留。",
        dismissible: true, dedupeKey: "search-native-location-failed" });
    } finally { if (nativeSelectionPending.current === version) nativeSelectionPending.current = null; }
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
  const nativeLocationEntry = <Button className="spot-search-platform-location focus-ring" data-control="search-platform-location"
    ariaLabel="在微信地图选择地点并查找附近观星点" onClick={() => void chooseMapLocation()}>
    在微信地图选地点 <Text aria-hidden="true">→</Text>
  </Button>;

  return (
    <View
      className={`${themeClass} spot-search-page`}
      style={{
        ...(statusBarHeight === undefined ? {} : { "--search-title-top": `${statusBarHeight}px` }),
        ...(safeTop === undefined ? {} : { "--search-safe-top": `${safeTop}px` }),
      } as CSSProperties}
      data-miniapp-production-root
      data-route="spot-search"
      data-delivery-target={__DELIVERY_TARGET__}
      onClick={blurSearch}
    >
      <FloatingNotificationHost />
      {handoff.warning}
      <NativeBackBoundary active={filterSheetOpen} onBack={cancelFilters} />
      <View className="spot-search-shell" data-control="spot-search-shell">
        <View className="spot-search-title-row">
          <Text className="spot-search-title">今晚去观星</Text>
        </View>
        <View
          className="spot-search-field"
          data-control="spot-search-field"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            className="spot-search-field__leading focus-ring"
            ariaLabel="返回地图"
            onClick={() => void leaveSearch()}
          >
            <SemanticIcon name="arrow-left" />
          </Button>
          <Input
            className="spot-search-field__input"
            value={finderQuery}
            focus={focused}
            placeholder="搜观星点 / 所在区域"
            confirmType="search"
            aria-label="搜索自有观星点或所在区域"
            onInput={(event) => {
              setFinderQuery(event.detail.value);
              setFocused(true);
              setSuggestionsOpen(true);
            }}
            onFocus={() => {
              setFocused(true);
              setSuggestionsOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onConfirm={() => setSuggestionsOpen(false)}
          />
        </View>

        {!suggestionsOpen ? nativeLocationEntry : null}
        {suggestionsOpen ? (
          <ScrollView
            className="spot-search-query-overlay"
            data-control="spot-search-query-overlay"
            scrollY
            enhanced
            showScrollbar={false}
            aria-label="搜索历史与地点结果"
            onClick={(event) => event.stopPropagation()}
          >
            {nativeLocationEntry}
            {finderQuery.trim() ? (
              <View className="spot-search-suggestions">
                {queryUnconfirmed ? <Text className="type-caption spot-search-query-status">正在查找地点。</Text> : null}
                {visiblePlaces?.formalSpots.map((spot) => (
                  <Button key={spot.spotId} className="spot-search-suggestion" onClick={() => void selectFormal(spot)}>
                    <Text>{spot.name}</Text>
                    <Text className="type-caption">{spot.region || "正式观星点"}</Text>
                  </Button>
                ))}
                {candidates.map((result) => (
                  <Button key={result.candidateId} className="spot-search-suggestion" onClick={() => void moveMapReference(result)}>
                    <Text>{result.label}</Text>
                    <Text className="type-caption">资料待核验 · 只移动地图{result.region || result.address ? ` · ${result.region || result.address}` : ""}</Text>
                  </Button>
                ))}
                {ordinaryPlaces.map((result) => (
                  <Button key={result.placeId} className="spot-search-suggestion" onClick={() => void moveMapReference(result)}>
                    <Text>{result.label}</Text>
                    <Text className="type-caption">普通地点 · 只移动地图{result.region || result.address ? ` · ${result.region || result.address}` : ""}</Text>
                  </Button>
                ))}
                {!queryUnconfirmed && !placeSearch.isPending && !placeSearch.isError && !visiblePlaces?.formalSpots.length && !candidates.length && !ordinaryPlaces.length ? (
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
          </ScrollView>
        ) : null}

        <ScrollView className="spot-search-result-list" data-control="spot-search-result-list" scrollY enhanced showScrollbar={false} aria-label="筛选与正式观星点结果" onClick={(event) => { event.stopPropagation(); blurSearch(); }}>
        <View className="spot-search-filter-row">
        <ScrollView
          className="spot-search-filter-scroll"
          scrollX
          enhanced
          showScrollbar={false}
          aria-label="可立即提交的筛选选项"
          onClick={(event) => event.stopPropagation()}
        >
          <View className="spot-search-filter-group" data-control="spot-search-filter-group" role="group" aria-label="地图筛选，可多选">
            {FILTER_OPTIONS.map((option) => {
              const capability = scene.data?.data.filterCapabilities.byGroup[option.group];
              const disabled = capability?.state === "UNAVAILABLE";
              const selected = optionIsSelected(committedFilters, option.id, option.group);
              return (
                <Button
                  key={option.id}
                  className={`spot-search-filter-choice${selected ? " spot-search-filter-choice--selected" : ""}`}
                  data-control="spot-search-filter-choice"
                  disabled={disabled && !selected}
                  ariaLabel={`${option.label}${disabled ? "，当前不可用" : selected ? "，已应用" : ""}`}
                  onClick={() => commitFilter(option.id)}
                >
                  <SemanticIcon
                    name={FILTER_ICON_BY_ID[option.id]}
                    className="spot-search-filter-choice__prefix"
                  />
                  <Text>{option.label}</Text>
                  {selected ? (
                    <SelectedCardStar className="spot-search-filter-choice__selected-ornament" />
                  ) : null}
                </Button>
              );
            })}
          </View>
        </ScrollView>
        <Button className={`spot-search-filter-open${filterSheetOpen ? " spot-search-filter-open--active" : ""}`} data-control="spot-search-filter-open" ariaLabel={`打开全部筛选，已选${countAppliedFilters(committedFilters)}项`} onClick={() => { setFilterCategory("OBSERVATION"); openFilters(); }}>
          <View className="spot-search-filter-open__face"><SemanticIcon name="filter" /></View>
          {countAppliedFilters(committedFilters) ? <Text>{countAppliedFilters(committedFilters)}</Text> : null}
        </Button>
        </View>

        <View className="spot-search-feedback" onClick={(event) => event.stopPropagation()}>
          <NotificationRegion owner="search" placement="inline" />
          {staleSearchResource ? <StatusPanel state="STALE" detail="部分搜索资料尚未确认最新状态，当前结果仍会保留。"
            recoveryLabel="重新获取" onRecover={retrySearchResources} /> : null}
          {searchState !== "READY" && !(searchState === "STALE" && staleSearchResource)
            && (searchState !== "PARTIAL" || expiredEmptyFilter) ? (
            <StatusPanel
              state={searchState}
              detail={
                (contextQuery.isError ? errorMessage(contextQuery.error) : queryUnconfirmed ? "" : scene.isError ? errorMessage(scene.error) : placeSearch.isError ? errorMessage(placeSearch.error) : "") ||
                (isOfflineError(contextQuery.error ?? (queryUnconfirmed ? null : scene.error ?? placeSearch.error))
                  ? "网络不可用，请连接后重试。"
                  : expiredEmptyFilter
                    ? "少云筛选资料已到期，结果待核验；请刷新资料。"
                  : searchState === "EMPTY"
                    ? "没有匹配的正式观星点；可移动地图或换一个名称。"
                    : "正在搜索观星点。")
              }
              recoveryLabel={searchState === "ERROR" ? "重试搜索" : searchState === "PERMISSION_DENIED" ? "查看登录说明" : undefined}
              onRecover={searchState === "ERROR" ? retrySearchResources : searchState === "PERMISSION_DENIED"
                ? () => void Taro.navigateTo({ url: "/pages/auth/index" }) : undefined}
            />
          ) : null}
          {incompleteActiveCoverage.length ? (
            <View className="spot-search-filter-evidence" role="status" aria-live="polite">
              <Text className="type-caption">
                {incompleteActiveCoverage.map(({ group, capability }) => `${FILTER_LABEL_BY_GROUP[group]}：${capability!.reason}`).join("；")}
              </Text>
              <View className="spot-search-filter-evidence__actions">
                <Button onClick={() => { setFilterCategory("OBSERVATION"); openFilters(); }}>调整筛选</Button>
                <Button onClick={() => void scene.refetch()}>重试资料</Button>
              </View>
            </View>
          ) : null}
        </View>

          <View className="spot-search-result-summary">
            <Text className="type-caption">{queryUnconfirmed ? "搜索结果更新中"
              : expiredEmptyFilter ? "筛选结果待核验"
              : formalSpots.length === 0 && searchState === "STALE" ? "搜索结果待更新"
              : formalSpots.length === 0 && (searchState === "ERROR" || searchState === "PERMISSION_DENIED") ? "搜索结果暂不可用"
              : `${formalSpots.length} 个${hasUnknownIncludedSpot ? "符合或待核验的" : ""}正式观星点`}</Text>
          </View>
          <View className="spot-search-partition">
            <Button className="spot-search-partition__toggle" aria-expanded={wantedOpen} onClick={() => setWantedOpen((value) => !value)}>
              <Text className="type-section">想去</Text>
              <Text className="type-caption">{wanted.length}</Text>
              <SemanticIcon name={wantedOpen ? "chevron-up" : "chevron-down"} />
            </Button>
            {wantedOpen ? (
              wanted.length ? wanted.map((spot) => <SearchResultCard key={spot.spotId} spot={spot} evidence={visibleScene?.filterEvidence?.[spot.spotId]} activeGroups={activeFilterGroups} onSelect={() => void selectFormal(spot)} />)
                : showPartitionEmpty ? <Text className="type-caption spot-search-empty">还没有想去的观星点。</Text> : null
            ) : null}
          </View>
          <View className="spot-search-partition">
            <Button className="spot-search-partition__toggle" aria-expanded={otherOpen} onClick={() => setOtherOpen((value) => !value)}>
              <Text className="type-section">其他观星点</Text>
              <Text className="type-caption">{other.length}</Text>
              <SemanticIcon name={otherOpen ? "chevron-up" : "chevron-down"} />
            </Button>
            {otherOpen ? (
              other.length ? other.map((spot) => <SearchResultCard key={spot.spotId} spot={spot} evidence={visibleScene?.filterEvidence?.[spot.spotId]} activeGroups={activeFilterGroups} onSelect={() => void selectFormal(spot)} />)
                : showPartitionEmpty ? <Text className="type-caption spot-search-empty">{expiredEmptyFilter ? "刷新资料后重新核验候选点。" : "没有其他符合或待核验的观星点。"}</Text> : null
            ) : null}
          </View>
          {activeFilterGroups.includes("LESS_CLOUD") ? <SourceAttribution sources={scene.data?.sources.filter(source => source.kind === "THIRD_PARTY_FORECAST") ?? []} /> : null}
        </ScrollView>
      </View>
      {filterSheetOpen ? <FilterSheet {...(scene.data ? { capabilities: scene.data.data.filterCapabilities.byGroup } : {})} initialCategory={filterCategory} /> : null}
      <View className="sr-live" role="status" aria-live="polite"><Text>{announcement}</Text></View>
    </View>
  );
}

function SearchResultCard({ spot, evidence, activeGroups, onSelect }: { spot: SpotSummary; evidence: SpotFilterEvidence | undefined; activeGroups: readonly FilterGroupKey[]; onSelect: () => void }) {
  const media = spot.media.filter(isRenderableMedia)[0];
  const mediaSrc = media ? media.thumbnailPath || media.localPath : null;
  const address = spot.address;
  const unknown = activeGroups.filter((group) => evidence?.[group].state === "UNKNOWN");
  return <View className="spot-search-result-entry">
    <Button className={`spot-identity-card${mediaSrc ? " spot-identity-card--with-media" : ""}`} data-control="spot-search-result-card" onClick={onSelect} ariaLabel={`选择${spot.name}${unknown.length ? `，${unknown.map((group) => FILTER_LABEL_BY_GROUP[group]).join("、")}资料待核验` : ""}`}>
      <SpotIdentityContent region={spot.region || "区域暂无数据"} name={spot.name} address={address} mediaSrc={mediaSrc} mediaAlt={media?.alt || `${spot.name}现场照片`} />
    </Button>
    {unknown.length ? <Text className="spot-search-result-entry__evidence type-caption">待核验：{unknown.map((group) => FILTER_LABEL_BY_GROUP[group]).join("、")}</Text> : null}
  </View>;
}
