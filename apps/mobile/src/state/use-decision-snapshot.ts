import { useMemo } from "react";
import { useShellStore } from "./shell-store";
import { resolveShellOrigin } from "./shell-location";

export function useDecisionSnapshot() {
  // One external-store snapshot owns every decision-bearing input. Query keys
  // and functions receive the same derived object; no mount effect commits it.
  const { decisionContext, location, profiles, activeProfileId, selectedSpot } = useShellStore();
  return useMemo(() => {
    const origin = resolveShellOrigin(location);
    const observer = selectedSpot ? {
      latitude: selectedSpot.coordinate.lat, longitude: selectedSpot.coordinate.lon,
      label: selectedSpot.name, locationId: selectedSpot.id, source: "selected-spot" as const,
    } : origin;
    return { ...decisionContext, origin, observer, profile: profiles.find((profile) => profile.id === activeProfileId) };
  }, [decisionContext, location, profiles, activeProfileId, selectedSpot]);
}
