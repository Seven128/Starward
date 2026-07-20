import { create } from "zustand";
import type { MapSpotSummary, RouteMode } from "@starward/contracts/map";
import type { MapSelectionRole } from "./index";

interface MapSelectionState {
  selectedSpot: MapSpotSummary | null;
  roles: Record<string, MapSelectionRole>;
  routeMode: RouteMode;
  routeRevision: number;
  selectSpot: (spot: MapSpotSummary) => void;
  assignRole: (spot: MapSpotSummary, role: MapSelectionRole) => void;
  setRouteMode: (mode: RouteMode) => void;
}

export const useMapSelectionStore = create<MapSelectionState>((set) => ({
  selectedSpot: null, roles: {}, routeMode: "drive", routeRevision: 0,
  selectSpot: (selectedSpot) => set({ selectedSpot }),
  assignRole: (selectedSpot, role) => set((state) => ({ selectedSpot, roles: { ...state.roles, [selectedSpot.id]: role }, routeRevision: state.routeRevision + 1 })),
  setRouteMode: (routeMode) => set((state) => ({ routeMode, routeRevision: state.routeRevision + 1 })),
}));
