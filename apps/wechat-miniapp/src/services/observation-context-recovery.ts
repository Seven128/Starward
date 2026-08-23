import type {
  ObservationContext,
  ObservationContextResolveRequest,
} from "@starward/miniapp-contracts";

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
