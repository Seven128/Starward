import Taro from "@tarojs/taro";
import {
  EMPTY_FILTER_STATE,
  DEFAULT_USER_PREFERENCES,
  cloneFilterState,
  type DisplayMode,
  type FilterState,
  type ObservationContext,
  type ObservationPlan,
  type SpotId,
  type UserPreferences,
  type UserPreferencesRecord,
} from "@starward/miniapp-contracts";
import { create } from "zustand";
import {
  addBoundedSearchHistory,
  applyFilterDraft,
  beginFilterDraft,
  cancelFilterDraft,
  clearFilterDraft,
  enterObservationMode,
  exitObservationMode,
  restorePriorMode,
  restoreStartupMode,
  revertFilterDraft,
  setDisplayMode,
  toggleFavoriteRelation,
  toggleFilterDraft,
} from "./app-transitions";
import {
  dismissNotification as removeNotification,
  enqueueNotification,
  type NotificationIntent,
  type NotificationRecord,
} from "./notification";
import { currentNotificationPageRoute } from "./notification-page-route";
import acceptanceBootstrapJson from "./acceptance-bootstrap.json";

const STORAGE_KEY = "starward.wechat-miniapp.state.current";
const ACCOUNT_STORAGE_PREFIX = "starward.wechat-miniapp.state.account.";
const UNCLAIMED_STORAGE_KEY = "starward.wechat-miniapp.state.unclaimed";
const AUTH_STORAGE_KEY = "starward.wechat-miniapp.auth.current";

export interface MapViewportState {
  center: { latitude: number; longitude: number };
  zoom: number;
  layer: "NORMAL" | "LIGHT_POLLUTION" | "CLOUD" | "OPPORTUNITY";
  loadedViewport: string;
  cardIndex: number;
}

export type AnalysisOverlay = "NONE" | "LIGHT" | "TOTAL_CLOUD" | "OPPORTUNITY";
export type SourceLiftOwner = "FINDER" | "CONDITIONS";
export type SourceLiftPhase =
  "IDLE" | "LIFTING" | "FOCUSED" | "RESTORING" | "CANCELLED";

export interface SourceLiftRuntimeState {
  owner: SourceLiftOwner | null;
  phase: SourceLiftPhase;
  variant: "panelOnly" | "mapCoupled" | null;
  origin: {
    viewport: MapViewportState;
    selectedSpotId: SpotId | null;
    finderQuery: string;
    observationContext: ObservationContext | null;
    analysisOverlay: AnalysisOverlay;
  } | null;
  finishOptions: {
    restoreMap: boolean;
    discardFilterDraft: boolean;
  };
}

export interface PersistedState {
  accountOwnerId?: string | null;
  mode: DisplayMode;
  priorMode: Exclude<DisplayMode, "OBSERVATION">;
  preferences: UserPreferences;
  preferencesRevision: number;
  preferencesDirty: boolean;
  preferencesUpdatedAt: string | null;
  viewport: MapViewportState;
  finderQuery: string;
  observationContext: ObservationContext | null;
  analysisOverlay: AnalysisOverlay;
  terrainEnabled: boolean;
  committedFilters: FilterState;
  selectedSpotId: SpotId | null;
  searchHistory: string[];
  favoriteIds: SpotId[];
  plans: ObservationPlan[];
}

export type LocationState =
  "DEFAULT_REGION" | "REQUESTING" | "GRANTED" | "DENIED" | "UNAVAILABLE";

interface AppState extends PersistedState {
  accountOwnerId: string | null;
  priorMode: Exclude<DisplayMode, "OBSERVATION">;
  draftFilters: FilterState;
  filterSnapshot: FilterState;
  filterSheetOpen: boolean;
  locationState: LocationState;
  mapResetVersion: number;
  spotOpenRequestVersion: number;
  notifications: NotificationRecord[];
  sourceLift: SourceLiftRuntimeState;
  hydrate(): void;
  bindAccount(ownerId: string | null): void;
  notify(intent: NotificationIntent): void;
  dismissNotification(id: string): void;
  clearNotifications(owner?: string): void;
  setMode(mode: DisplayMode): void;
  enterObservation(): void;
  exitObservation(): void;
  setPreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ): void;
  applyServerPreferences(record: UserPreferencesRecord): void;
  rebasePreferencesAfterConflict(record: UserPreferencesRecord): void;
  markPreferencesSynced(record: UserPreferencesRecord): void;
  setViewport(patch: Partial<MapViewportState>): void;
  resetMapToDefaultRegion(): void;
  setFinderQuery(query: string): void;
  setObservationContext(context: ObservationContext | null): void;
  setAnalysisOverlay(overlay: AnalysisOverlay): void;
  setTerrainEnabled(enabled: boolean): void;
  openSourceLift(owner: SourceLiftOwner): void;
  focusSourceLift(owner: SourceLiftOwner): void;
  closeSourceLift(
    owner: SourceLiftOwner,
    options?: { restoreMap?: boolean; discardFilterDraft?: boolean },
  ): void;
  finishSourceLift(
    owner: SourceLiftOwner,
    options?: { restoreMap?: boolean; discardFilterDraft?: boolean },
  ): void;
  selectSpot(spotId: SpotId | null): void;
  requestSpotOpen(spotId: SpotId): void;
  openFilters(): void;
  toggleDraftFilter(optionId: string): void;
  clearDraftFilters(): void;
  revertFilters(): void;
  cancelFilters(): void;
  applyFilters(): void;
  setLocationState(state: AppState["locationState"]): void;
  addSearchHistory(query: string): void;
  clearSearchHistory(): void;
  toggleFavorite(spotId: SpotId): boolean;
  replaceFavoriteIds(spotIds: readonly SpotId[]): void;
  savePlan(plan: ObservationPlan): void;
  replacePlans(plans: readonly ObservationPlan[]): void;
  deletePlan(planId: string): void;
  clearLocalCache(): Promise<boolean>;
  resetAfterAccountDeletion(): boolean;
}

const DEFAULT_VIEWPORT: MapViewportState = {
  center: { latitude: 22.5431, longitude: 114.0579 },
  zoom: 8,
  layer: "NORMAL",
  loadedViewport: "greater-bay-area-current",
  cardIndex: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadStoredState(key: string): Partial<PersistedState> {
  try {
    const stored = Taro.getStorageSync(key) as unknown;
    const value = typeof stored === "string" ? JSON.parse(stored) : stored;
    return isRecord(value) ? (value as Partial<PersistedState>) : {};
  } catch {
    return {};
  }
}

function storedSessionIdentity(): { userId: string; active: boolean } | null {
  try {
    const value = Taro.getStorageSync(AUTH_STORAGE_KEY) as unknown;
    if (!isRecord(value) || typeof value.userId !== "string" ||
      typeof value.accessToken !== "string" || typeof value.expiresAt !== "string") return null;
    const expiry = Date.parse(value.expiresAt);
    return { userId: value.userId, active: Number.isFinite(expiry) && expiry > Date.now() + 60_000 };
  } catch { return null; }
}

const freshlyStashedOwners = new Set<string>();
let persistedOwnerSeen: string | null = null;

function loadPersisted(ownerId: string | null): Partial<PersistedState> {
  if (!ownerId) return {};
  const current = loadStoredState(STORAGE_KEY);
  if (current.accountOwnerId === ownerId) return current;
  const previous = loadStoredState(ACCOUNT_STORAGE_PREFIX + ownerId);
  return previous.accountOwnerId === ownerId ? previous : { accountOwnerId: ownerId };
}

function preserveDisplacedCurrent(nextOwnerId: string) {
  if (persistedOwnerSeen === nextOwnerId) return;
  const current = loadStoredState(STORAGE_KEY);
  if (!Object.keys(current).length) return;
  const previousOwner = current.accountOwnerId;
  if (!previousOwner) {
    if (!Object.keys(loadStoredState(UNCLAIMED_STORAGE_KEY)).length)
      Taro.setStorageSync(UNCLAIMED_STORAGE_KEY, current);
    return;
  }
  if (previousOwner === nextOwnerId) return;
  if (freshlyStashedOwners.has(previousOwner)) return;
  Taro.setStorageSync(ACCOUNT_STORAGE_PREFIX + previousOwner,
    { ...current, accountOwnerId: previousOwner });
}

function persisted(state: AppState): PersistedState {
  const durableMode = restoreStartupMode(state.mode, state.priorMode);
  const durableContext =
    state.observationContext?.privacyClass === "SESSION_PRECISE"
      ? null
      : state.observationContext;
  return {
    accountOwnerId: state.accountOwnerId,
    mode: durableMode,
    priorMode: state.priorMode,
    preferences: { ...state.preferences, displayMode: durableMode },
    preferencesRevision: state.preferencesRevision,
    preferencesDirty: state.preferencesDirty,
    preferencesUpdatedAt: state.preferencesUpdatedAt,
    viewport: state.viewport,
    finderQuery: state.finderQuery,
    observationContext: durableContext,
    analysisOverlay: state.analysisOverlay,
    terrainEnabled: state.terrainEnabled,
    committedFilters: state.committedFilters,
    selectedSpotId: state.selectedSpotId,
    searchHistory: state.searchHistory,
    favoriteIds: state.favoriteIds,
    plans: state.plans,
  };
}

function saveOwnedCurrent(state: AppState): boolean {
  const ownerId = state.accountOwnerId;
  if (!ownerId) return false;
  preserveDisplacedCurrent(ownerId);
  Taro.setStorageSync(STORAGE_KEY, persisted(state));
  persistedOwnerSeen = ownerId;
  freshlyStashedOwners.clear();
  return true;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isWgs84Point(value: unknown) {
  if (!isRecord(value)) return false;
  const latitude = value.latitude;
  const longitude = value.longitude;
  return (
    value.system === "WGS84" &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isObservationLocation(value: unknown) {
  if (!isRecord(value)) return false;
  if (value.kind === "FORMAL_SPOT")
    return (
      isNonEmptyString(value.spotId) &&
      Number.isInteger(value.locationVersion) &&
      (value.locationVersion as number) >= 0
    );
  return (
    value.kind === "MAP_POINT" &&
    isNonEmptyString(value.displayName) &&
    isWgs84Point(value.wgs84) &&
    (value.source === "MAP_VIEWPORT" || value.source === "USER_LOCATION")
  );
}

function isRouteOrigin(value: unknown) {
  return (
    value === null ||
    (isRecord(value) &&
      isNonEmptyString(value.contextId) &&
      isNonEmptyString(value.displayName) &&
      isWgs84Point(value.wgs84) &&
      (value.source === "MAP_VIEWPORT" || value.source === "USER_LOCATION"))
  );
}

function usableObservationContext(value: unknown): ObservationContext | null {
  if (!isRecord(value) || value.schemaVersion !== "observation-context-v2")
    return null;
  const weatherView = value.weatherView;
  const algorithmVersions = value.algorithmVersions;
  if (!isRecord(weatherView) || !isRecord(algorithmVersions)) return null;
  const valid =
    isNonEmptyString(value.contextId) &&
    isNonEmptyString(value.contextFingerprint) &&
    Number.isInteger(value.revision) &&
    (value.revision as number) >= 0 &&
    isObservationLocation(value.location) &&
    isRouteOrigin(value.routeOrigin) &&
    isNonEmptyString(value.timezone) &&
    typeof value.localDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/u.test(value.localDate) &&
    isTimestamp(value.nightStartUtc) &&
    isTimestamp(value.nightEndUtc) &&
    isTimestamp(value.selectedAtUtc) &&
    (value.eventInstanceId === null || isNonEmptyString(value.eventInstanceId)) &&
    ["DAILY", "METEOR", "MILKY_WAY", "PLANET", "CUSTOM"].includes(
      String(value.targetProfile),
    ) &&
    isNonEmptyString(weatherView.primaryPolicy) &&
    Array.isArray(weatherView.comparisonModels) &&
    weatherView.comparisonModels.every(isNonEmptyString) &&
    (weatherView.selectedModel === null ||
      isNonEmptyString(weatherView.selectedModel)) &&
    ["TOTAL", "LOW", "MID", "HIGH"].includes(String(weatherView.cloudLayer)) &&
    ["astronomy", "opportunity", "tripDecision", "darkSky", "eventCatalog"].every(
      (key) => isNonEmptyString(algorithmVersions[key]),
    ) &&
    value.privacyClass === "PUBLIC_REFERENCE" &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.expiresAt) &&
    Date.parse(value.expiresAt) > Date.now();
  // A persisted Context remains a recovery hint until the server restores it.
  // Keep its location/time/identity, but never restore retired display selections.
  return valid ? { ...(value as unknown as ObservationContext), weatherView: {
    primaryPolicy: "QWEATHER", comparisonModels: [], selectedModel: null, cloudLayer: "TOTAL",
  } } : null;
}

const BOOTSTRAP_SESSION = storedSessionIdentity();
const BOOTSTRAP_STATE = loadPersisted(BOOTSTRAP_SESSION?.active ? BOOTSTRAP_SESSION.userId : null);
const BOOTSTRAP_MODE = restoreStartupMode(
  BOOTSTRAP_STATE.mode,
  BOOTSTRAP_STATE.priorMode,
);
const BOOTSTRAP_FILTERS = cloneFilterState(
  BOOTSTRAP_STATE.committedFilters ?? EMPTY_FILTER_STATE,
);
let runtimeHydrated = false;

export const useAppStore = create<AppState>((set, get) => {
  const commit = (
    patch: Partial<AppState> | ((state: AppState) => Partial<AppState>),
  ) => {
    set(patch as Partial<AppState>);
    queueMicrotask(() => {
      try {
        saveOwnedCurrent(get());
      } catch {
        /* storage denial is surfaced by callers where material */
      }
    });
  };
  return {
    accountOwnerId: BOOTSTRAP_STATE.accountOwnerId ?? null,
    mode: BOOTSTRAP_MODE,
    priorMode: restorePriorMode(
      BOOTSTRAP_STATE.mode,
      BOOTSTRAP_STATE.priorMode,
    ),
    preferences: {
      ...DEFAULT_USER_PREFERENCES,
      ...BOOTSTRAP_STATE.preferences,
      displayMode: BOOTSTRAP_MODE,
    },
    preferencesRevision: BOOTSTRAP_STATE.preferencesRevision ?? 0,
    preferencesDirty: BOOTSTRAP_STATE.preferencesDirty ?? false,
    preferencesUpdatedAt: BOOTSTRAP_STATE.preferencesUpdatedAt ?? null,
    viewport: { ...DEFAULT_VIEWPORT, ...BOOTSTRAP_STATE.viewport },
    finderQuery: BOOTSTRAP_STATE.finderQuery ?? "",
    observationContext: usableObservationContext(
      BOOTSTRAP_STATE.observationContext,
    ),
    analysisOverlay: BOOTSTRAP_STATE.analysisOverlay ?? "NONE",
    terrainEnabled: BOOTSTRAP_STATE.terrainEnabled ?? false,
    committedFilters: BOOTSTRAP_FILTERS,
    draftFilters: cloneFilterState(BOOTSTRAP_FILTERS),
    filterSnapshot: cloneFilterState(BOOTSTRAP_FILTERS),
    selectedSpotId: BOOTSTRAP_STATE.selectedSpotId ?? null,
    searchHistory: BOOTSTRAP_STATE.searchHistory ?? [],
    favoriteIds: BOOTSTRAP_STATE.favoriteIds ?? [],
    plans: Array.isArray(BOOTSTRAP_STATE.plans) ? BOOTSTRAP_STATE.plans : [],
    filterSheetOpen: false,
    locationState: "DEFAULT_REGION",
    mapResetVersion: 0,
    spotOpenRequestVersion: 0,
    notifications: [],
    sourceLift: {
      owner: null,
      phase: "IDLE",
      variant: null,
      origin: null,
      finishOptions: { restoreMap: true, discardFilterDraft: true },
    },
    hydrate() {
      if (runtimeHydrated) return;
      runtimeHydrated = true;
      const session = storedSessionIdentity();
      const saved = loadPersisted(session?.active ? session.userId : null);
      const startupMode = restoreStartupMode(saved.mode, saved.priorMode);
      set({
        ...saved,
        accountOwnerId: saved.accountOwnerId ?? null,
        mode: startupMode,
        preferences: {
          ...DEFAULT_USER_PREFERENCES,
          ...saved.preferences,
          displayMode: startupMode,
        },
        preferencesRevision: saved.preferencesRevision ?? 0,
        preferencesDirty: saved.preferencesDirty ?? false,
        preferencesUpdatedAt: saved.preferencesUpdatedAt ?? null,
        viewport: { ...DEFAULT_VIEWPORT, ...saved.viewport },
        finderQuery: saved.finderQuery ?? "",
        observationContext: usableObservationContext(
          saved.observationContext,
        ),
        analysisOverlay: saved.analysisOverlay ?? "NONE",
        terrainEnabled: saved.terrainEnabled ?? false,
        committedFilters: cloneFilterState(
          saved.committedFilters ?? EMPTY_FILTER_STATE,
        ),
        draftFilters: cloneFilterState(
          saved.committedFilters ?? EMPTY_FILTER_STATE,
        ),
        filterSnapshot: cloneFilterState(
          saved.committedFilters ?? EMPTY_FILTER_STATE,
        ),
        priorMode: restorePriorMode(saved.mode, saved.priorMode),
        selectedSpotId: saved.selectedSpotId ?? null,
        searchHistory: saved.searchHistory ?? [],
        favoriteIds: saved.favoriteIds ?? [],
        plans: Array.isArray(saved.plans) ? saved.plans : [],
      });
    },
    notify(intent) {
      const pageRoute = intent.placement === "floating" ? intent.pageRoute ?? currentNotificationPageRoute() : undefined;
      set((state) => ({
        notifications: enqueueNotification(state.notifications, pageRoute ? { ...intent, pageRoute } : intent),
      }));
    },
    dismissNotification(id) {
      set((state) => ({
        notifications: removeNotification(state.notifications, id),
      }));
    },
    clearNotifications(owner) {
      set((state) => ({
        notifications: owner
          ? state.notifications.filter((item) => item.owner !== owner)
          : [],
      }));
    },
    setMode(mode) {
      commit((state) => ({
        ...setDisplayMode(mode, state.priorMode, state.preferences),
        preferencesDirty: true,
      }));
    },
    enterObservation() {
      commit((state) => enterObservationMode(state.mode));
    },
    exitObservation() {
      commit((state) =>
        exitObservationMode(state.priorMode, state.preferences),
      );
    },
    setPreference(key, value) {
      commit((state) => ({
        preferences: { ...state.preferences, [key]: value },
        preferencesDirty: true,
      }));
    },
    applyServerPreferences(record) {
      commit((state) =>
        record.revision < state.preferencesRevision
          ? {}
          : state.preferencesDirty
          ? {
              preferencesRevision: record.revision,
              preferencesUpdatedAt: record.updatedAt,
            }
          : {
              preferences: record.preferences,
              preferencesRevision: record.revision,
              preferencesDirty: false,
              preferencesUpdatedAt: record.updatedAt,
            },
      );
    },
    rebasePreferencesAfterConflict(record) {
      commit((state) => state.preferencesDirty ? {
        preferencesRevision: record.revision,
        preferencesUpdatedAt: record.updatedAt,
      } : {
        preferences: record.preferences,
        preferencesRevision: record.revision,
        preferencesDirty: false,
        preferencesUpdatedAt: record.updatedAt,
      });
    },
    markPreferencesSynced(record) {
      commit({
        preferences: record.preferences,
        preferencesRevision: record.revision,
        preferencesDirty: false,
        preferencesUpdatedAt: record.updatedAt,
      });
    },
    setViewport(patch) {
      commit((state) => ({ viewport: { ...state.viewport, ...patch } }));
    },
    resetMapToDefaultRegion() {
      commit((state) => ({
        viewport: { ...DEFAULT_VIEWPORT, center: { ...DEFAULT_VIEWPORT.center } },
        finderQuery: "",
        observationContext: null,
        analysisOverlay: "NONE",
        terrainEnabled: false,
        selectedSpotId: null,
        locationState: "DEFAULT_REGION",
        mapResetVersion: state.mapResetVersion + 1,
        filterSheetOpen: false,
        draftFilters: cloneFilterState(state.committedFilters),
        filterSnapshot: cloneFilterState(state.committedFilters),
        notifications: state.notifications.filter((item) => item.owner !== "map"),
        sourceLift: {
          owner: null, phase: "IDLE", variant: null, origin: null,
          finishOptions: { restoreMap: true, discardFilterDraft: true },
        },
      }));
    },
    setFinderQuery(finderQuery) {
      commit({ finderQuery });
    },
    setObservationContext(observationContext) {
      set({ observationContext });
      if (!get().accountOwnerId) return;
      try {
        // Observation Context binds every downstream request and route. Persist
        // this rare transition before navigation so a background page cannot
        // leave storage one context behind the in-memory owner.
        saveOwnedCurrent(get());
      } catch {
        // The active session still remains correct in memory. Restart recovery
        // fails closed when storage is unavailable.
      }
    },
    setAnalysisOverlay(analysisOverlay) {
      commit({ analysisOverlay });
    },
    setTerrainEnabled(terrainEnabled) {
      commit({ terrainEnabled });
    },
    openSourceLift(owner) {
      set((state) => ({
        sourceLift: {
          owner,
          phase: "LIFTING",
          variant: owner === "FINDER" ? "panelOnly" : "mapCoupled",
          origin: {
            viewport: {
              ...state.viewport,
              center: { ...state.viewport.center },
            },
            selectedSpotId: state.selectedSpotId,
            finderQuery: state.finderQuery,
            observationContext: state.observationContext,
            analysisOverlay: state.analysisOverlay,
          },
          finishOptions: { restoreMap: true, discardFilterDraft: true },
        },
      }));
    },
    focusSourceLift(owner) {
      set((state) =>
        state.sourceLift.owner === owner
          ? { sourceLift: { ...state.sourceLift, phase: "FOCUSED" } }
          : {},
      );
    },
    closeSourceLift(owner, options) {
      set((state) =>
        state.sourceLift.owner === owner
          ? {
              sourceLift: {
                ...state.sourceLift,
                phase: "RESTORING",
                finishOptions: {
                  restoreMap: options?.restoreMap ?? true,
                  discardFilterDraft: options?.discardFilterDraft ?? true,
                },
              },
            }
          : {},
      );
    },
    finishSourceLift(owner, options) {
      set((state) => {
        if (state.sourceLift.owner !== owner) return {};
        const origin = state.sourceLift.origin;
        const finishOptions = options ?? state.sourceLift.finishOptions;
        return {
          ...(finishOptions.restoreMap !== false && origin
            ? {
                viewport: origin.viewport,
                selectedSpotId: origin.selectedSpotId,
                observationContext: origin.observationContext,
                analysisOverlay: origin.analysisOverlay,
              }
            : {}),
          ...(finishOptions.discardFilterDraft !== false
            ? cancelFilterDraft(state.committedFilters)
            : {}),
          sourceLift: {
            owner: null,
            phase: "IDLE" as const,
            variant: null,
            origin: null,
            finishOptions: { restoreMap: true, discardFilterDraft: true },
          },
        };
      });
    },
    selectSpot(spotId) {
      commit({ selectedSpotId: spotId });
    },
    requestSpotOpen(spotId) {
      commit((state) => ({
        selectedSpotId: spotId,
        spotOpenRequestVersion: state.spotOpenRequestVersion + 1,
      }));
    },
    openFilters() {
      set((state) => beginFilterDraft(state.committedFilters));
    },
    toggleDraftFilter(optionId) {
      set((state) => toggleFilterDraft(state.draftFilters, optionId));
    },
    clearDraftFilters() {
      set((state) => clearFilterDraft(state.draftFilters));
    },
    revertFilters() {
      set((state) => revertFilterDraft(state.filterSnapshot));
    },
    cancelFilters() {
      set((state) => cancelFilterDraft(state.committedFilters));
    },
    applyFilters() {
      commit((state) => applyFilterDraft(state.draftFilters));
    },
    setLocationState(locationState) {
      set({ locationState });
    },
    addSearchHistory(query) {
      commit((state) => ({
        searchHistory: addBoundedSearchHistory(state.searchHistory, query),
      }));
    },
    clearSearchHistory() {
      commit({ searchHistory: [] });
    },
    toggleFavorite(spotId) {
      const transition = toggleFavoriteRelation(get().favoriteIds, spotId);
      commit({ favoriteIds: transition.favoriteIds });
      return transition.favorite;
    },
    replaceFavoriteIds(favoriteIds) {
      commit({ favoriteIds: [...favoriteIds] });
    },
    savePlan(plan) {
      commit((state) => ({
        plans: [
          ...state.plans.filter((item) => item.planId !== plan.planId),
          plan,
        ],
      }));
    },
    replacePlans(plans) {
      commit({ plans: [...plans] });
    },
    deletePlan(planId) {
      commit((state) => ({
        plans: state.plans.filter((item) => item.planId !== planId),
      }));
    },
    clearLocalCache() {
      const ownerId = get().accountOwnerId;
      if (!ownerId) return Promise.resolve(false);
      try {
        Taro.removeStorageSync(STORAGE_KEY);
        persistedOwnerSeen = null;
      } catch {
        /* The replacement below can still remove the old recovery fields. */
      }
      set({
        viewport: DEFAULT_VIEWPORT,
        finderQuery: "",
        observationContext: null,
        analysisOverlay: "NONE",
        terrainEnabled: false,
        committedFilters: EMPTY_FILTER_STATE,
        draftFilters: EMPTY_FILTER_STATE,
        filterSnapshot: EMPTY_FILTER_STATE,
        selectedSpotId: null,
        searchHistory: [],
      });
      return new Promise<boolean>((resolve) => queueMicrotask(() => {
        if (get().accountOwnerId !== ownerId) { resolve(false); return; }
        try {
          resolve(saveOwnedCurrent(get()));
        } catch {
          resolve(false);
        }
      }));
    },
    bindAccount(ownerId) {
      if (get().accountOwnerId === ownerId) return;
      const previous = get();
      if (previous.accountOwnerId) {
        try {
          Taro.setStorageSync(ACCOUNT_STORAGE_PREFIX + previous.accountOwnerId, persisted(previous));
          freshlyStashedOwners.add(previous.accountOwnerId);
        } catch { /* Current identity still changes in memory; old disk state remains owner-tagged. */ }
      }
      const saved = loadPersisted(ownerId);
      const mode = restoreStartupMode(saved.mode, saved.priorMode);
      const retainAnonymousMap = !previous.accountOwnerId && Boolean(ownerId) && (
        previous.selectedSpotId !== null || previous.observationContext !== null ||
        previous.finderQuery.length > 0 ||
        previous.viewport.center.latitude !== DEFAULT_VIEWPORT.center.latitude ||
        previous.viewport.center.longitude !== DEFAULT_VIEWPORT.center.longitude ||
        previous.viewport.zoom !== DEFAULT_VIEWPORT.zoom
      );
      const filters = cloneFilterState(retainAnonymousMap
        ? previous.committedFilters : saved.committedFilters ?? EMPTY_FILTER_STATE);
      set({
        accountOwnerId: ownerId,
        mode,
        priorMode: restorePriorMode(saved.mode, saved.priorMode),
        preferences: { ...DEFAULT_USER_PREFERENCES, ...saved.preferences, displayMode: mode },
        preferencesRevision: saved.preferencesRevision ?? 0,
        preferencesDirty: saved.preferencesDirty ?? false,
        preferencesUpdatedAt: saved.preferencesUpdatedAt ?? null,
        viewport: retainAnonymousMap ? previous.viewport : { ...DEFAULT_VIEWPORT, ...saved.viewport },
        finderQuery: retainAnonymousMap ? previous.finderQuery : saved.finderQuery ?? "",
        observationContext: retainAnonymousMap ? previous.observationContext : usableObservationContext(saved.observationContext),
        analysisOverlay: retainAnonymousMap ? previous.analysisOverlay : saved.analysisOverlay ?? "NONE",
        terrainEnabled: retainAnonymousMap ? previous.terrainEnabled : saved.terrainEnabled ?? false,
        committedFilters: filters,
        draftFilters: cloneFilterState(filters),
        filterSnapshot: cloneFilterState(filters),
        selectedSpotId: retainAnonymousMap ? previous.selectedSpotId : saved.selectedSpotId ?? null,
        searchHistory: retainAnonymousMap ? previous.searchHistory : [],
        favoriteIds: saved.favoriteIds ?? [],
        plans: Array.isArray(saved.plans) ? saved.plans : [],
        filterSheetOpen: false,
        locationState: "DEFAULT_REGION",
        mapResetVersion: previous.mapResetVersion + 1,
        spotOpenRequestVersion: previous.spotOpenRequestVersion + 1,
        notifications: [],
        sourceLift: { owner: null, phase: "IDLE", variant: null, origin: null,
          finishOptions: { restoreMap: true, discardFilterDraft: true } },
      });
      if (!ownerId) return;
      try {
        saveOwnedCurrent(get());
      }
      catch { /* In-memory account isolation remains in force. */ }
    },
    resetAfterAccountDeletion() {
      let removed = true;
      try {
        Taro.removeStorageSync(STORAGE_KEY);
        persistedOwnerSeen = null;
        if (get().accountOwnerId)
          Taro.removeStorageSync(ACCOUNT_STORAGE_PREFIX + get().accountOwnerId);
      } catch {
        // The server receipt remains authoritative; in-memory state is still reset.
        removed = false;
      }
      set({
        accountOwnerId: null,
        mode: "DAY",
        priorMode: "DAY",
        preferences: { ...DEFAULT_USER_PREFERENCES },
        preferencesRevision: 0,
        preferencesDirty: false,
        preferencesUpdatedAt: null,
        viewport: { ...DEFAULT_VIEWPORT },
        finderQuery: "",
        observationContext: null,
        analysisOverlay: "NONE",
        terrainEnabled: false,
        committedFilters: cloneFilterState(EMPTY_FILTER_STATE),
        draftFilters: cloneFilterState(EMPTY_FILTER_STATE),
        filterSnapshot: cloneFilterState(EMPTY_FILTER_STATE),
        selectedSpotId: null,
        searchHistory: [],
        favoriteIds: [],
        plans: [],
        filterSheetOpen: false,
        locationState: "DEFAULT_REGION",
        spotOpenRequestVersion: 0,
        notifications: [],
        sourceLift: {
          owner: null,
          phase: "IDLE",
          variant: null,
          origin: null,
          finishOptions: { restoreMap: true, discardFilterDraft: true },
        },
      });
      return removed;
    },
  };
});

export function resetAppStoreForAcceptance(): PersistedState {
  if (!__MINIAPP_ACCEPTANCE_DIAGNOSTICS__)
    throw new Error("acceptance_state_reset_unavailable");
  const next = JSON.parse(
    JSON.stringify(acceptanceBootstrapJson),
  ) as PersistedState;
  useAppStore.setState({
    ...next,
    draftFilters: cloneFilterState(next.committedFilters),
    filterSnapshot: cloneFilterState(next.committedFilters),
    filterSheetOpen: false,
    locationState: "DEFAULT_REGION",
    spotOpenRequestVersion: 0,
    notifications: [],
    sourceLift: {
      owner: null,
      phase: "IDLE",
      variant: null,
      origin: null,
      finishOptions: { restoreMap: true, discardFilterDraft: true },
    },
  });
  const snapshot = persisted(useAppStore.getState());
  Taro.setStorageSync(STORAGE_KEY, snapshot);
  return snapshot;
}
