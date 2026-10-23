import { create } from "zustand";
import { createUnrestrictedProfile, type PreferenceProfile } from "@starward/domain/preferences";
import type { DisplayMode } from "@starward/ui-system/tokens";
import { hydratePreferenceRuntime, persistActiveProfile, persistPreferenceProfile, persistShellDestination, persistShellLocation } from "./preferences-runtime";
import { advanceDecisionContext, createDecisionContext, type DecisionContextInput, type DecisionContextRevision } from "./decision-context";
import { assertDeviceLocationFix, type DeviceLocationFix } from "../native/permissions/location-fix";
import type { ShellLocation } from "./shell-location";
import type { PreferenceProjection } from "@starward/domain/preferences/runtime";
import { PreferenceProfileRevisionConflict } from "./preference-save-result";
import type { MapSpotSummary, RouteMode } from "@starward/contracts/map";
import type { MapSelectionRole } from "../features/map";
import { assignMapRole, initialMapSelection, selectMapSpot, selectRouteMode, type MapSelectionState } from "../features/map/map-selection-state";

export type PrimaryDestination = "tonight" | "map" | "trips" | "sky" | "me";
export type { LocationSource } from "./shell-location";

interface ShellState extends MapSelectionState {
  guest: true;
  displayMode: DisplayMode;
  activeDestination: PrimaryDestination;
  location: ShellLocation;
  profiles: PreferenceProfile[];
  activeProfileId: string;
  decisionContext: DecisionContextRevision;
  recommendationState: "ready" | "stale" | "recomputing";
  hydrationState: "idle" | "loading" | "ready" | "error";
  hydrationError: string | null;
  persistenceState: "ready" | "saving" | "error";
  persistenceError: string | null;
  hydrateFromRuntime: () => Promise<void>;
  setDisplayMode: (mode: DisplayMode) => void;
  setDestination: (destination: PrimaryDestination) => Promise<void>;
  setManualLocation: (label: string) => Promise<void>;
  setDeviceLocation: (label: string, fix: DeviceLocationFix, signal?: AbortSignal) => Promise<boolean>;
  saveProfile: (profile: PreferenceProfile) => Promise<void>;
  activateProfile: (profileId: string) => Promise<void>;
  commitDecisionContext: (input: DecisionContextInput) => void;
  selectSpot: (spot: MapSpotSummary) => void;
  assignRole: (spot: MapSpotSummary, role: MapSelectionRole) => void;
  setRouteMode: (mode: RouteMode) => void;
}

function decisionOwners(current: DecisionContextRevision, location: ShellLocation, profileId: string, profiles: readonly PreferenceProfile[]) {
  const origin = location.latitude !== undefined && location.longitude !== undefined
    ? `${location.latitude},${location.longitude}` : location.label;
  const profileRevision = profiles.find((profile) => profile.id === profileId)?.revision ?? 1;
  return current.origin === origin && current.profileId === profileId && current.profileRevision === profileRevision
    ? current : { ...current, origin, profileId, profileRevision, revision: current.revision + 1 };
}

export const useShellStore = create<ShellState>()((set, get) => {
  const baseProfile = createUnrestrictedProfile();
  let hydration: Promise<void> | null = null;
  // These marks include saves completed before startup read was even requested.
  const savedProfiles = new Set<string>();
  let locationSaved = false;
  let destinationSaved = false;
  let activeProfileSaved = false;
  let writes = Promise.resolve();
  let pendingWrites = 0;
  const writeErrors = new Map<string, string>();

  function updateWriteState() {
    set({
      persistenceState: pendingWrites ? "saving" : writeErrors.size ? "error" : "ready",
      persistenceError: writeErrors.values().next().value ?? null,
    });
  }

  function write<T>(owner: string, message: string, action: () => Promise<T>): Promise<T> {
    pendingWrites += 1;
    writeErrors.delete(owner);
    updateWriteState();
    // Keep the view's commit order aligned with durable commands, including a
    // newer manual choice made while an earlier device-location save is pending.
    const attempt = writes.then(async () => {
      const result = await action();
      writeErrors.delete(owner);
      return result;
    });
    writes = attempt.then(() => undefined, () => undefined);
    return attempt.catch((error) => {
      writeErrors.set(owner, error instanceof PreferenceProfileRevisionConflict
        ? "此预设已有新版本。输入已保留，请核对后再次保存。"
        : message);
      throw error;
    }).finally(() => {
      pendingWrites -= 1;
      updateWriteState();
    });
  }

  function applyProfileProjection(projection: Pick<PreferenceProjection, "profiles" | "activeProfileId">) {
    for (const profile of projection.profiles) savedProfiles.add(profile.id);
    activeProfileSaved = true;
    const profiles = [...projection.profiles];
    const activeProfileId = projection.activeProfileId ?? baseProfile.id;
    if (activeProfileId === baseProfile.id && !profiles.some((profile) => profile.id === baseProfile.id)) profiles.push(baseProfile);
    // Replaying a historical save proves that save, not that it is still the
    // active profile. Apply the authoritative present state returned with it.
    set((state) => ({ profiles, activeProfileId, recommendationState: "stale", decisionContext: decisionOwners(state.decisionContext, state.location, activeProfileId, profiles) }));
  }

  return {
    ...initialMapSelection,
    guest: true,
    displayMode: "planning",
    activeDestination: "tonight",
    location: { source: "unset", label: "尚未选择位置" },
    profiles: [baseProfile],
    activeProfileId: baseProfile.id,
    decisionContext: createDecisionContext(baseProfile.id),
    recommendationState: "ready",
    hydrationState: "idle",
    hydrationError: null,
    persistenceState: "ready",
    persistenceError: null,
    setDisplayMode: (displayMode) => set({ displayMode }),
    hydrateFromRuntime: () => {
      if (hydration) return hydration;
      if (get().hydrationState === "ready") return Promise.resolve();
      set({ hydrationState: "loading", hydrationError: null });
      const attempt = (async () => {
        try {
          const hydrated = await hydratePreferenceRuntime();
          set((state) => {
            const profiles = new Map((hydrated.profiles.length ? hydrated.profiles : state.profiles).map((profile) => [profile.id, profile]));
            for (const profile of state.profiles) {
              if (savedProfiles.has(profile.id) || (activeProfileSaved && profile.id === state.activeProfileId)) profiles.set(profile.id, profile);
            }
            const preferredId = activeProfileSaved ? state.activeProfileId : hydrated.activeProfileId ?? state.activeProfileId;
            if (preferredId === baseProfile.id && !profiles.has(baseProfile.id)) profiles.set(baseProfile.id, baseProfile);
            const activeProfileId = profiles.has(preferredId) ? preferredId : profiles.keys().next().value ?? baseProfile.id;
            const location = locationSaved ? state.location : hydrated.location ?? state.location;
            return {
              profiles: [...profiles.values()],
              activeProfileId,
              location,
              decisionContext: decisionOwners(state.decisionContext, location, activeProfileId, [...profiles.values()]),
              // A restoration hint never drives the Expo Router graph.
              activeDestination: destinationSaved ? state.activeDestination : hydrated.activeDestination ?? state.activeDestination,
              hydrationState: "ready",
              hydrationError: null,
            };
          });
        } catch {
          set({ hydrationState: "error", hydrationError: "本机偏好读取失败；当前状态尚未完整恢复，可重试。" });
        }
      })();
      hydration = attempt;
      void attempt.then(() => { if (hydration === attempt) hydration = null; });
      return attempt;
    },
    setDestination: (activeDestination) => write("destination", "页面位置保存未确认，请重试。", async () => {
      const result = await persistShellDestination(activeDestination);
      destinationSaved = true;
      if (result.projection.activeDestination) set({ activeDestination: result.projection.activeDestination });
    }),
    setManualLocation: (label) => write("location", "手动位置保存未确认，请重试。", async () => {
      const location = { source: "manual" as const, label };
      const result = await persistShellLocation(location);
      locationSaved = true;
      if (result.projection.location) set((state) => ({ location: result.projection.location!, decisionContext: decisionOwners(state.decisionContext, result.projection.location!, state.activeProfileId, state.profiles) }));
    }),
    setDeviceLocation: (label, fix, signal) => write("location", "设备位置保存未确认，请重试。", async () => {
      if (signal?.aborted) return false;
      assertDeviceLocationFix(fix);
      const location: ShellLocation = { source: "device", label, ...fix };
      // Cancellation retires acquisition/queued intent. Once dispatched, an
      // actual durable commit is reflected; a later choice is the next write.
      const result = await persistShellLocation(location);
      locationSaved = true;
      if (result.projection.location) set((state) => ({ location: result.projection.location!, decisionContext: decisionOwners(state.decisionContext, result.projection.location!, state.activeProfileId, state.profiles) }));
      return true;
    }),
    saveProfile: (profile) => write(`profile:${profile.id}`, "偏好预设保存未确认，输入已保留，请重试。", async () => {
      try {
        const result = await persistPreferenceProfile(profile);
        applyProfileProjection(result.projection);
      } catch (error) {
        if (error instanceof Error && error.message === "preference_runtime_profile_revision_conflict") {
          // This command is known not to have committed. Read current state for
          // an explicit, reviewable next save while leaving the editor's draft.
          const current = await hydratePreferenceRuntime();
          applyProfileProjection(current);
          const stored = current.profiles.find((item) => item.id === profile.id);
          if (stored) throw new PreferenceProfileRevisionConflict(profile.id, stored.revision);
        }
        throw error;
      }
    }),
    activateProfile: (activeProfileId) => write("active-profile", "当前预设切换未确认，请重试。", async () => {
      if (!get().profiles.some((item) => item.id === activeProfileId)) return;
      const result = await persistActiveProfile(activeProfileId);
      applyProfileProjection(result.projection);
    }),
    commitDecisionContext: (input) => {
      set((state) => {
        const decisionContext = advanceDecisionContext(state.decisionContext, input);
        return decisionContext === state.decisionContext ? state : { decisionContext, recommendationState: "stale" };
      });
    },
    selectSpot: (spot) => set((state) => {
      const selection = selectMapSpot(state, spot);
      return selection === state ? state : { ...selection, decisionContext: { ...state.decisionContext, revision: state.decisionContext.revision + 1 }, recommendationState: "stale" };
    }),
    assignRole: (spot, role) => set((state) => ({ ...assignMapRole(state, spot, role), decisionContext: { ...state.decisionContext, revision: state.decisionContext.revision + 1 }, recommendationState: "stale" })),
    setRouteMode: (mode) => set((state) => {
      const selection = selectRouteMode(state, mode);
      return selection === state ? state : { ...selection, decisionContext: { ...state.decisionContext, revision: state.decisionContext.revision + 1 }, recommendationState: "stale" };
    }),
  };
});
