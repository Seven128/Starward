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
import acceptanceBootstrapJson from "./acceptance-bootstrap.json";

const STORAGE_KEY = "starward.wechat-miniapp.state.current";

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
  committedFilters: FilterState;
  selectedSpotId: SpotId | null;
  searchHistory: string[];
  favoriteIds: SpotId[];
  plans: ObservationPlan[];
}

export type LocationState =
  "DEFAULT_REGION" | "REQUESTING" | "GRANTED" | "DENIED" | "UNAVAILABLE";

interface AppState extends PersistedState {
  priorMode: Exclude<DisplayMode, "OBSERVATION">;
  draftFilters: FilterState;
  filterSnapshot: FilterState;
  filterSheetOpen: boolean;
  locationState: LocationState;
  notifications: NotificationRecord[];
  sourceLift: SourceLiftRuntimeState;
  hydrate(): void;
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
  markPreferencesSynced(record: UserPreferencesRecord): void;
  setViewport(patch: Partial<MapViewportState>): void;
  setFinderQuery(query: string): void;
  setObservationContext(context: ObservationContext | null): void;
  setAnalysisOverlay(overlay: AnalysisOverlay): void;
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
  openFilters(): void;
  toggleDraftFilter(optionId: string): void;
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
  clearLocalCache(): void;
}

const DEFAULT_VIEWPORT: MapViewportState = {
  center: { latitude: 22.5431, longitude: 114.0579 },
  zoom: 8,
  layer: "NORMAL",
  loadedViewport: "greater-bay-area-current",
  cardIndex: 0,
};

function loadPersisted(): Partial<PersistedState> {
  try {
    const value = Taro.getStorageSync(STORAGE_KEY) as
      Partial<PersistedState> | string;
    return typeof value === "string"
      ? (JSON.parse(value) as Partial<PersistedState>)
      : value || {};
  } catch {
    return {};
  }
}

function persisted(state: AppState): PersistedState {
  const durableMode = restoreStartupMode(state.mode, state.priorMode);
  const durableContext =
    state.observationContext?.privacyClass === "SESSION_PRECISE"
      ? null
      : state.observationContext;
  return {
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
    committedFilters: state.committedFilters,
    selectedSpotId: state.selectedSpotId,
    searchHistory: state.searchHistory,
    favoriteIds: state.favoriteIds,
    plans: state.plans,
  };
}

function usableObservationContext(
  value: ObservationContext | null | undefined,
) {
  return value?.schemaVersion === "observation-context-v2" &&
    Number.isFinite(Date.parse(value.expiresAt)) &&
    Date.parse(value.expiresAt) > Date.now()
    ? value
    : null;
}

const BOOTSTRAP_STATE = loadPersisted();
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
        Taro.setStorageSync(STORAGE_KEY, persisted(get()));
      } catch {
        /* storage denial is surfaced by callers where material */
      }
    });
  };
  return {
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
    committedFilters: BOOTSTRAP_FILTERS,
    draftFilters: cloneFilterState(BOOTSTRAP_FILTERS),
    filterSnapshot: cloneFilterState(BOOTSTRAP_FILTERS),
    selectedSpotId: BOOTSTRAP_STATE.selectedSpotId ?? null,
    searchHistory: BOOTSTRAP_STATE.searchHistory ?? [],
    favoriteIds: BOOTSTRAP_STATE.favoriteIds ?? [],
    plans: BOOTSTRAP_STATE.plans ?? [],
    filterSheetOpen: false,
    locationState: "DEFAULT_REGION",
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
      const saved = loadPersisted();
      const startupMode = restoreStartupMode(saved.mode, saved.priorMode);
      set({
        ...saved,
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
      });
    },
    notify(intent) {
      set((state) => ({
        notifications: enqueueNotification(state.notifications, intent),
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
        state.preferencesDirty
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
    setFinderQuery(finderQuery) {
      commit({ finderQuery });
    },
    setObservationContext(observationContext) {
      set({ observationContext });
      try {
        // Observation Context binds every downstream request and route. Persist
        // this rare transition before navigation so a background page cannot
        // leave storage one context behind the in-memory owner.
        Taro.setStorageSync(STORAGE_KEY, persisted(get()));
      } catch {
        // The active session still remains correct in memory. Restart recovery
        // fails closed when storage is unavailable.
      }
    },
    setAnalysisOverlay(analysisOverlay) {
      commit({ analysisOverlay });
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
    openFilters() {
      set((state) => beginFilterDraft(state.committedFilters));
    },
    toggleDraftFilter(optionId) {
      set((state) => toggleFilterDraft(state.draftFilters, optionId));
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
      const message =
        "本地地图、筛选、搜索与夜空临时缓存已清除；持久化收藏、计划、主页链接和导入草稿保持不变。";
      try {
        Taro.removeStorageSync(STORAGE_KEY);
      } catch {
        /* visible success below still resets in-memory state */
      }
      set({
        viewport: DEFAULT_VIEWPORT,
        finderQuery: "",
        observationContext: null,
        analysisOverlay: "NONE",
        committedFilters: EMPTY_FILTER_STATE,
        draftFilters: EMPTY_FILTER_STATE,
        filterSnapshot: EMPTY_FILTER_STATE,
        selectedSpotId: null,
        searchHistory: [],
        notifications: enqueueNotification(get().notifications, {
          owner: "settings",
          placement: "floating",
          tone: "success",
          title: "临时缓存已清除",
          body: message,
          dismissible: true,
          dedupeKey: "settings-cache-cleared",
        }),
      });
      queueMicrotask(() => {
        try {
          Taro.setStorageSync(STORAGE_KEY, persisted(get()));
        } catch {
          /* cache clear already completed in memory */
        }
      });
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
