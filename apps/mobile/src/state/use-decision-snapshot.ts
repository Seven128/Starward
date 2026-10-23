import { useMemo } from "react";
import { useShellStore } from "./shell-store";

export function useDecisionSnapshot() {
  // One external-store snapshot owns every decision-bearing input. Query keys
  // and functions receive the same derived object; no mount effect commits it.
  const { decisionContext, location, profiles, activeProfileId, selectedSpot } = useShellStore();
  return useMemo(() => {
    const hasCoordinates = Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
      && Math.abs(location.latitude!) <= 90 && Math.abs(location.longitude!) <= 180;
    const origin = {
      latitude: hasCoordinates ? location.latitude! : 22.529,
      longitude: hasCoordinates ? location.longitude! : 113.9468,
      label: hasCoordinates ? location.label : "深圳南山（默认范围，尚未定位）",
      locationId: hasCoordinates ? `origin:${location.latitude},${location.longitude}` : "poc-default:shenzhen-nanshan",
      source: hasCoordinates ? "origin" as const : "poc-default" as const,
    };
    const observer = selectedSpot ? {
      latitude: selectedSpot.coordinate.lat, longitude: selectedSpot.coordinate.lon,
      label: selectedSpot.name, locationId: selectedSpot.id, source: "selected-spot" as const,
    } : origin;
    return { ...decisionContext, origin, observer, profile: profiles.find((profile) => profile.id === activeProfileId) };
  }, [decisionContext, location, profiles, activeProfileId, selectedSpot]);
}
