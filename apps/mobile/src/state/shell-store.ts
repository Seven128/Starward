import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createUnrestrictedProfile, type PreferenceProfile } from "@starward/domain/preferences";

export type PrimaryDestination = "tonight" | "map" | "itinerary" | "sky" | "profile";
export type LocationSource = "unset" | "device" | "manual";

interface ShellState {
  guest: true;
  activeDestination: PrimaryDestination;
  location: { source: LocationSource; label: string; latitude?: number; longitude?: number };
  profiles: PreferenceProfile[];
  activeProfileId: string;
  recommendationState: "ready" | "stale" | "recomputing";
  setDestination: (destination: PrimaryDestination) => void;
  setManualLocation: (label: string) => void;
  setDeviceLocation: (label: string, latitude: number, longitude: number) => void;
  saveProfile: (profile: PreferenceProfile) => void;
  activateProfile: (profileId: string) => void;
}

const baseProfile = createUnrestrictedProfile();

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      guest: true,
      activeDestination: "tonight",
      location: { source: "unset", label: "尚未选择位置" },
      profiles: [baseProfile],
      activeProfileId: baseProfile.id,
      recommendationState: "ready",
      setDestination: (activeDestination) => set({ activeDestination }),
      setManualLocation: (label) => set({ location: { source: "manual", label } }),
      setDeviceLocation: (label, latitude, longitude) => set({ location: { source: "device", label, latitude, longitude } }),
      saveProfile: (profile) => set((state) => {
        const exists = state.profiles.some((item) => item.id === profile.id);
        return {
          profiles: exists ? state.profiles.map((item) => item.id === profile.id ? profile : item) : [...state.profiles, profile],
          activeProfileId: profile.id,
          recommendationState: "stale",
        };
      }),
      activateProfile: (activeProfileId) => set((state) => state.profiles.some((item) => item.id === activeProfileId)
        ? { activeProfileId, recommendationState: "stale" }
        : state),
    }),
    {
      name: "starward-shell-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ activeDestination, location, profiles, activeProfileId }) => ({ activeDestination, location, profiles, activeProfileId }),
    },
  ),
);
