import type {
  ApiEnvelope,
  ObservationContext,
  ObservationContextResolveRequest,
  ObservationContextUpdateRequest,
  Wgs84Point,
} from "@starward/miniapp-contracts";
import { observationNightBounds } from "@starward/miniapp-contracts";

function samePoint(left: Wgs84Point | undefined, right: Wgs84Point | undefined) {
  return Boolean(left && right && left.system === right.system &&
    left.latitude === right.latitude && left.longitude === right.longitude);
}

function sameLocation(left: ObservationContext["location"], right: ObservationContext["location"] | undefined) {
  if (!right || left.kind !== right.kind) return false;
  if (left.kind === "FORMAL_SPOT" && right.kind === "FORMAL_SPOT")
    return left.spotId === right.spotId && left.locationVersion === right.locationVersion;
  return left.kind === "MAP_POINT" && right.kind === "MAP_POINT" &&
    left.displayName === right.displayName && left.source === right.source && samePoint(left.wgs84, right.wgs84);
}

/** Normal replies and fresh readback must establish the complete requested
 * state. This does not prove receipt of this write or authorize its replay. */
export function confirmedObservationContextEdit(
  current: ObservationContext,
  input: Omit<ObservationContextUpdateRequest, "expectedRevision">,
  response: ApiEnvelope<ObservationContext>,
) {
  const latest = response?.data;
  if (response?.dataState !== "FRESH" || !latest || latest.schemaVersion !== current.schemaVersion ||
    typeof latest.contextFingerprint !== "string" || !latest.contextFingerprint.trim() ||
    latest.contextId !== current.contextId || !Number.isInteger(latest.revision) || latest.revision <= current.revision ||
    !sameLocation(current.location, latest.location) || latest.timezone !== current.timezone ||
    latest.targetProfile !== current.targetProfile || latest.privacyClass !== current.privacyClass ||
    latest.createdAt !== current.createdAt || latest.expiresAt !== current.expiresAt) return false;
  // Existing envelopes may omit the optional revision or have no validAt.
  // When supplied, those bindings cannot contradict the Context payload.
  if ((response.contextRevision !== undefined && response.contextRevision !== latest.revision) ||
    (response.validAt != null && (typeof response.validAt !== "string" ||
      Date.parse(response.validAt) !== Date.parse(latest.selectedAtUtc)))) return false;
  const origin = current.routeOrigin, nextOrigin = latest.routeOrigin;
  if (origin === null ? nextOrigin !== null : !nextOrigin || origin.contextId !== nextOrigin.contextId ||
    origin.displayName !== nextOrigin.displayName || origin.source !== nextOrigin.source || !samePoint(origin.wgs84, nextOrigin.wgs84)) return false;
  const localDate = input.localDate ?? current.localDate;
  const instant = Date.parse(input.selectedAt ?? current.selectedAtUtc);
  if (latest.localDate !== localDate || !Number.isFinite(instant) || Date.parse(latest.selectedAtUtc) !== instant ||
    latest.eventInstanceId !== (input.eventInstanceId === undefined ? current.eventInstanceId : input.eventInstanceId)) return false;
  try {
    const bounds = observationNightBounds({ localDate, timezone: current.timezone });
    if (latest.nightStartUtc !== bounds.nightStartUtc || latest.nightEndUtc !== bounds.nightEndUtc ||
      instant < Date.parse(bounds.nightStartUtc) || instant >= Date.parse(bounds.nightEndUtc)) return false;
  } catch { return false; }
  const algorithms = ["astronomy", "opportunity", "tripDecision", "darkSky", "eventCatalog"] as const;
  if (!latest.algorithmVersions || algorithms.some(key => latest.algorithmVersions[key] !== current.algorithmVersions[key])) return false;
  // Current Context updates normalize retired weather-view fields. A legacy
  // cloudLayer edit cannot acknowledge or revive a retired supplier/layer.
  const weather = latest.weatherView;
  return Boolean(weather && weather.primaryPolicy === "QWEATHER" && weather.cloudLayer === "TOTAL" &&
    weather.selectedModel === null && Array.isArray(weather.comparisonModels) && weather.comparisonModels.length === 0);
}

export function observationContextRecoveryInput(
  context: ObservationContext,
  routeOriginContextId: string | null =
    context.routeOrigin?.contextId ?? null,
): ObservationContextResolveRequest {
  return {
    location:
      context.location.kind === "FORMAL_SPOT"
        ? { kind: "FORMAL_SPOT", spotId: context.location.spotId }
        : {
            kind: "MAP_POINT",
            displayName: context.location.displayName,
            wgs84: context.location.wgs84,
            source: context.location.source,
            ...(context.timezone === "Asia/Hong_Kong" ||
            context.timezone === "Asia/Shanghai"
              ? { timezoneHint: context.timezone }
              : {}),
          },
    ...(routeOriginContextId
      ? { routeOriginContextId }
      : {}),
    localDate: context.localDate,
    selectedAt: context.selectedAtUtc,
    eventInstanceId: context.eventInstanceId,
    targetProfile: context.targetProfile,
  };
}
