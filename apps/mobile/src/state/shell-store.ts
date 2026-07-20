import { create } from "zustand";
import { createUnrestrictedProfile, type PreferenceProfile } from "@starward/domain/preferences";
import { hydratePreferenceRuntime, persistActiveProfile, persistPreferenceProfile, persistShellDestination, persistShellLocation } from "./preferences-runtime";

export type PrimaryDestination = "tonight" | "map" | "itinerary" | "sky" | "profile";
export type LocationSource = "unset" | "device" | "manual";

interface ShellState {
  guest: true;
  activeDestination: PrimaryDestination;
  location: { source: LocationSource; label: string; latitude?: number; longitude?: number };
  profiles: PreferenceProfile[];
  activeProfileId: string;
  recommendationState: "ready" | "stale" | "recomputing";
  persistenceState: "loading" | "ready" | "saving" | "error";
  persistenceError: string | null;
  hydrateFromRuntime: () => Promise<void>;
  setDestination: (destination: PrimaryDestination) => Promise<void>;
  setManualLocation: (label: string) => Promise<void>;
  setDeviceLocation: (label: string, latitude: number, longitude: number) => Promise<void>;
  saveProfile: (profile: PreferenceProfile) => Promise<void>;
  activateProfile: (profileId: string) => Promise<void>;
}

const baseProfile = createUnrestrictedProfile();

export const useShellStore = create<ShellState>()((set, get) => ({
  guest: true,
  activeDestination: "tonight",
  location: { source: "unset", label: "尚未选择位置" },
  profiles: [baseProfile],
  activeProfileId: baseProfile.id,
  recommendationState: "ready",
  persistenceState: "loading",
  persistenceError: null,
  hydrateFromRuntime: async () => {
    if (get().persistenceState === "ready") return;
    set({ persistenceState: "loading", persistenceError: null });
    try {
      const hydrated = await hydratePreferenceRuntime();
      set((state) => ({
        profiles: hydrated.profiles.length ? hydrated.profiles : state.profiles,
        activeProfileId: hydrated.activeProfileId && (hydrated.profiles.some((item) => item.id === hydrated.activeProfileId) || state.profiles.some((item) => item.id === hydrated.activeProfileId)) ? hydrated.activeProfileId : state.activeProfileId,
        location: hydrated.location ?? state.location,
        activeDestination: hydrated.activeDestination ?? state.activeDestination,
        persistenceState: "ready",
        persistenceError: null,
      }));
    } catch {
      set({ persistenceState: "error", persistenceError: "本机偏好数据库读取失败；当前更改不会冒充已保存。" });
    }
  },
  setDestination: async (activeDestination) => {
    set({ persistenceState: "saving", persistenceError: null });
    try {
      await persistShellDestination(activeDestination);
      set({ activeDestination, persistenceState: "ready" });
    } catch (error) {
      set({ persistenceState: "error", persistenceError: "页面位置未保存，请重试。" });
      throw error;
    }
  },
  setManualLocation: async (label) => {
    const location = { source: "manual" as const, label };
    set({ persistenceState: "saving", persistenceError: null });
    try {
      await persistShellLocation(location);
      set({ location, persistenceState: "ready" });
    } catch (error) {
      set({ persistenceState: "error", persistenceError: "手动位置未保存，请重试。" });
      throw error;
    }
  },
  setDeviceLocation: async (label, latitude, longitude) => {
    const location = { source: "device" as const, label, latitude, longitude };
    set({ persistenceState: "saving", persistenceError: null });
    try {
      await persistShellLocation(location);
      set({ location, persistenceState: "ready" });
    } catch (error) {
      set({ persistenceState: "error", persistenceError: "设备位置未保存，请重试。" });
      throw error;
    }
  },
  saveProfile: async (profile) => {
    set({ persistenceState: "saving", persistenceError: null });
    try {
      await persistPreferenceProfile(profile);
      set((state) => {
        const exists = state.profiles.some((item) => item.id === profile.id);
        return {
          profiles: exists ? state.profiles.map((item) => item.id === profile.id ? profile : item) : [...state.profiles, profile],
          activeProfileId: profile.id,
          recommendationState: "stale",
          persistenceState: "ready",
        };
      });
    } catch (error) {
      set({ persistenceState: "error", persistenceError: "偏好预设未写入本机数据库，请重试。" });
      throw error;
    }
  },
  activateProfile: async (activeProfileId) => {
    if (!get().profiles.some((item) => item.id === activeProfileId)) return;
    set({ persistenceState: "saving", persistenceError: null });
    try {
      await persistActiveProfile(activeProfileId);
      set({ activeProfileId, recommendationState: "stale", persistenceState: "ready" });
    } catch (error) {
      set({ persistenceState: "error", persistenceError: "当前预设未切换，请重试。" });
      throw error;
    }
  },
}));
