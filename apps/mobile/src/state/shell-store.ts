import { create } from "zustand";
import { createUnrestrictedProfile, type PreferenceProfile } from "@starward/domain/preferences";
import type { DisplayMode } from "@starward/ui-system/tokens";
import { hydratePreferenceRuntime, persistActiveProfile, persistPreferenceProfile, persistShellDestination, persistShellLocation } from "./preferences-runtime";
import { advanceDecisionContext, createDecisionContext, type DecisionContextInput, type DecisionContextRevision } from "./decision-context";
import { assertDeviceLocationFix, type DeviceLocationFix } from "../native/permissions/location-fix";
import type { ShellLocation } from "./shell-location";

export type PrimaryDestination = "tonight" | "map" | "trips" | "sky" | "me";
export type { LocationSource } from "./shell-location";

interface ShellState {
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
      writeErrors.set(owner, message);
      throw error;
    }).finally(() => {
      pendingWrites -= 1;
      updateWriteState();
    });
  }

  return {
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
            return {
              profiles: [...profiles.values()],
              activeProfileId,
              location: locationSaved ? state.location : hydrated.location ?? state.location,
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
    setDestination: (activeDestination) => write("destination", "页面位置未保存，请重试。", async () => {
      await persistShellDestination(activeDestination);
      destinationSaved = true;
      set({ activeDestination });
    }),
    setManualLocation: (label) => write("location", "手动位置未保存，请重试。", async () => {
      const location = { source: "manual" as const, label };
      await persistShellLocation(location);
      locationSaved = true;
      set({ location });
    }),
    setDeviceLocation: (label, fix, signal) => write("location", "设备位置未保存，请重试。", async () => {
      if (signal?.aborted) return false;
      assertDeviceLocationFix(fix);
      const location: ShellLocation = { source: "device", label, ...fix };
      // Cancellation retires acquisition/queued intent. Once dispatched, an
      // actual durable commit is reflected; a later choice is the next write.
      await persistShellLocation(location);
      locationSaved = true;
      set({ location });
      return true;
    }),
    saveProfile: (profile) => write(`profile:${profile.id}`, "偏好预设未写入本机数据库，请重试。", async () => {
      await persistPreferenceProfile(profile);
      savedProfiles.add(profile.id);
      activeProfileSaved = true;
      set((state) => ({
        profiles: state.profiles.some((item) => item.id === profile.id)
          ? state.profiles.map((item) => item.id === profile.id ? profile : item)
          : [...state.profiles, profile],
        activeProfileId: profile.id,
        recommendationState: "stale",
      }));
    }),
    activateProfile: (activeProfileId) => write("active-profile", "当前预设未切换，请重试。", async () => {
      if (!get().profiles.some((item) => item.id === activeProfileId)) return;
      await persistActiveProfile(activeProfileId);
      activeProfileSaved = true;
      set({ activeProfileId, recommendationState: "stale" });
    }),
    commitDecisionContext: (input) => {
      set((state) => ({ decisionContext: advanceDecisionContext(state.decisionContext, input) }));
    },
  };
});
