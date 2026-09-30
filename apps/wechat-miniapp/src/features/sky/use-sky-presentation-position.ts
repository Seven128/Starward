import { useCelestialPosition } from "@/hooks/use-celestial-position";
import type { CelestialPositionBinding } from "@/services/celestial-position-response";
import type { ApiEnvelope, CelestialObjectPositionData } from "@starward/miniapp-contracts";
import { skyPresentationPosition, type SkyPositionPresentation } from "./sky-presentation-position";
import { useMemo } from "react";

/** Selection, explicit location and tracking share one local projection plus
 * the existing cancellable lazy query. Its anchor key stays fixed while time
 * runs; source/Context/catalogue changes fence old factors through binding. */
export function useSkyPresentationPosition(binding: CelestialPositionBinding,
  catalog: { catalogVersion: string; catalogHash: string } | null, enabled = true,
  presentation?: SkyPositionPresentation) {
  const identity = [binding.reference, binding.spotId, binding.contextId, binding.contextRevision,
    binding.contextFingerprint, binding.dataRevision, binding.algorithmVersion, binding.at,
    catalog?.catalogVersion, catalog?.catalogHash].join("|");
  const direct = useMemo(() => enabled ? skyPresentationPosition(binding, catalog, presentation) : null,
    [identity, presentation, enabled]);
  const anchorBinding = { ...binding, at: presentation?.anchorAt ?? binding.at };
  const remote = useCelestialPosition(anchorBinding, catalog, enabled && !direct);
  const local = useMemo(() => enabled && presentation
    ? direct ?? skyPresentationPosition(binding, catalog, presentation, remote.data) : null,
    [direct, identity, presentation, remote.data, enabled]);
  const data = useMemo<ApiEnvelope<CelestialObjectPositionData> | undefined>(() => {
    if (!enabled || !presentation) return remote.data;
    if (local) return { ...presentation.source, data: local, validAt: binding.at,
      dataState: presentation.source.dataState === "STALE_USABLE" || remote.data?.dataState === "STALE_USABLE" ? "STALE_USABLE" : "FRESH" };
    if (remote.data && remote.data.data.at !== binding.at) return { ...remote.data, validAt: binding.at, dataState: "UNAVAILABLE",
      data: { ...binding, position: null, unavailableReason: "OBJECT_GEOMETRY_UNAVAILABLE" } };
    return remote.data;
  }, [identity, local, presentation, remote.data, enabled]);
  if (local) return { ...remote, data, isPending: false, isError: false };
  if (data !== remote.data) return { ...remote, data };
  return remote;
}
