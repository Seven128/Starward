import type { MapSpotPage, MapSpotSummary, RouteMode } from "@starward/contracts/map";
import type { MapSelectionRole } from "./index";

export interface MapSelectionState {
  selectedSpot: MapSpotSummary | null;
  roles: Record<string, MapSelectionRole>;
  routeMode: RouteMode;
  routeRevision: number;
  selectionGeneration: number;
}

export const initialMapSelection: MapSelectionState = { selectedSpot: null, roles: {}, routeMode: "drive", routeRevision: 0, selectionGeneration: 0 };
export function selectMapSpot(state: MapSelectionState, selectedSpot: MapSpotSummary): MapSelectionState {
  return state.selectedSpot === selectedSpot ? state : { ...state, selectedSpot, routeRevision: state.routeRevision + 1, selectionGeneration: state.selectionGeneration + 1 };
}
export function assignMapRole(state: MapSelectionState, selectedSpot: MapSpotSummary, role: MapSelectionRole): MapSelectionState {
  return { ...state, selectedSpot, roles: { ...state.roles, [selectedSpot.id]: role }, routeRevision: state.routeRevision + 1, selectionGeneration: state.selectionGeneration + Number(state.selectedSpot !== selectedSpot) };
}
export function selectRouteMode(state: MapSelectionState, routeMode: RouteMode): MapSelectionState {
  return state.routeMode === routeMode ? state : { ...state, routeMode, routeRevision: state.routeRevision + 1 };
}

export interface MapSelectionRefresh {
  page: MapSpotPage;
  center: { lat: number; lon: number };
  selectedSpot: MapSpotSummary | null;
  selectionGeneration: number;
}

function sameSpotFacts(left: MapSpotSummary, right: MapSpotSummary) {
  return left.id === right.id && left.name === right.name
    && left.coordinate.lat === right.coordinate.lat && left.coordinate.lon === right.coordinate.lon
    && left.coordinate.system === right.coordinate.system && left.distanceMeters === right.distanceMeters
    && left.status === right.status && left.mapState === right.mapState && left.verificationAt === right.verificationAt
    && left.imageUrl === right.imageUrl && left.factsBoundary === right.factsBoundary
    && left.facilities.length === right.facilities.length && left.facilities.every((item, index) => item === right.facilities[index])
    && left.source.label === right.source.label && left.source.url === right.source.url
    && left.source.licenseId === right.source.licenseId && left.source.fetchedAt === right.source.fetchedAt;
}

// A list refresh supplies facts for the existing choice; it never makes a new
// choice or imports the detail endpoint's potentially restricted coordinate.
export function refreshMapSelection(state: MapSelectionState, refresh: MapSelectionRefresh): MapSelectionState {
  const selected = state.selectedSpot;
  if (!selected || selected !== refresh.selectedSpot || state.selectionGeneration !== refresh.selectionGeneration) return state;
  const { page, center } = refresh;
  if (page.context?.center?.system !== "WGS84" || page.context.center.lat !== center.lat || page.context.center.lon !== center.lon
    || !Number.isFinite(Date.parse(page.generatedAt))) return state;
  const candidate = page.items.find((spot) => spot.id === selected.id);
  if (!candidate || candidate.coordinate?.system !== "WGS84"
    || !Number.isFinite(candidate.coordinate.lat) || Math.abs(candidate.coordinate.lat) > 90
    || !Number.isFinite(candidate.coordinate.lon) || Math.abs(candidate.coordinate.lon) > 180
    || !candidate.source?.label || !candidate.source.licenseId || !candidate.source.url
    || !Number.isFinite(Date.parse(candidate.source.fetchedAt))) return state;
  // fetchedAt is the supplied provenance time, not an invented source version.
  // A later HTTP completion cannot promote older source facts over this choice.
  if (Date.parse(candidate.source.fetchedAt) < Date.parse(selected.source.fetchedAt) || sameSpotFacts(selected, candidate)) return state;
  return { ...state, selectedSpot: candidate, routeRevision: state.routeRevision + 1, selectionGeneration: state.selectionGeneration + 1 };
}
