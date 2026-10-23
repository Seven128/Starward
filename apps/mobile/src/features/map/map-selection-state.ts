import type { MapSpotSummary, RouteMode } from "@starward/contracts/map";
import type { MapSelectionRole } from "./index";

export interface MapSelectionState {
  selectedSpot: MapSpotSummary | null;
  roles: Record<string, MapSelectionRole>;
  routeMode: RouteMode;
  routeRevision: number;
}

export const initialMapSelection: MapSelectionState = { selectedSpot: null, roles: {}, routeMode: "drive", routeRevision: 0 };
export function selectMapSpot(state: MapSelectionState, selectedSpot: MapSpotSummary): MapSelectionState {
  return state.selectedSpot === selectedSpot ? state : { ...state, selectedSpot, routeRevision: state.routeRevision + 1 };
}
export function assignMapRole(state: MapSelectionState, selectedSpot: MapSpotSummary, role: MapSelectionRole): MapSelectionState {
  return { ...state, selectedSpot, roles: { ...state.roles, [selectedSpot.id]: role }, routeRevision: state.routeRevision + 1 };
}
export function selectRouteMode(state: MapSelectionState, routeMode: RouteMode): MapSelectionState {
  return state.routeMode === routeMode ? state : { ...state, routeMode, routeRevision: state.routeRevision + 1 };
}
