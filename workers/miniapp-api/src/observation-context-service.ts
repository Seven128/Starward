import { localParts, observationNightBounds, zonedLocalToUtc } from "@starward/miniapp-contracts";
export { zonedLocalToUtc } from "@starward/miniapp-contracts";
import { createHash, randomUUID } from "node:crypto";
import type {
  ObservationContext,
  ObservationContextId,
  ObservationContextResolveRequest,
  ObservationContextUpdateRequest,
  SpotId,
} from "@starward/miniapp-contracts";
import { AstronomicalEventCatalogOwner } from "./astronomical-event-catalog-owner.ts";
import { isHongKongDistrictPoint } from "./hong-kong-boundary.ts";
import { isMacaoTimezonePoint, MACAO_TIMEZONE_SOURCE } from "./macao-boundary.ts";
import type { CachePort, MiniappRepositoryPort } from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

const CONTEXT_TTL_SECONDS = 48 * 60 * 60;
const PRECISE_CONTEXT_TTL_SECONDS = 2 * 60 * 60;

function timezoneForTrialPoint(
  latitude: number,
  longitude: number,
) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    throw new Error("observation_location_invalid");
  // The current product population is the Greater Bay Area. Fail closed
  // outside that declared timezone-resolution boundary instead of silently
  // assigning the device timezone to an arbitrary map point.
  const inTrialRegion =
    latitude >= 20 &&
    latitude <= 25.5 &&
    longitude >= 110 &&
    longitude <= 116.8;
  if (!inTrialRegion)
    throw new Error("observation_timezone_resolution_unavailable");
  if (isMacaoTimezonePoint(latitude, longitude))
    return "Asia/Macau" as const;
  const inHongKongLongitude = longitude >= 113.78 && longitude <= 114.52;
  if (inHongKongLongitude && latitude >= 22.12 && latitude <= 22.45)
    return "Asia/Hong_Kong" as const;
  if (!inHongKongLongitude || latitude >= 22.58)
    return "Asia/Shanghai" as const;
  // In the remaining border band, the published HKSAR district geometry
  // identifies its side. A client's timezone hint is not location evidence.
  return isHongKongDistrictPoint(latitude, longitude)
    ? "Asia/Hong_Kong" as const : "Asia/Shanghai" as const;
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertSelectedAt(
  selectedAt: string,
  nightStartUtc: string,
  nightEndUtc: string,
) {
  const value = Date.parse(selectedAt);
  if (
    !Number.isFinite(value) ||
    value < Date.parse(nightStartUtc) ||
    value >= Date.parse(nightEndUtc)
  )
    throw new Error("observation_selected_at_outside_night");
}

function assertEventSelection(
  eventInstanceId: string | null | undefined,
  localDate: string,
  catalog: AstronomicalEventCatalogOwner,
) {
  if (!eventInstanceId) return;
  const event = catalog.find(eventInstanceId);
  if (
    !event ||
    !catalog.active(localDate).some(
      (candidate) => candidate.occurrenceId === event.occurrenceId,
    )
  )
    throw new Error("observation_event_not_active");
}

export class ObservationContextService {
  constructor(
    private readonly repository: MiniappRepositoryPort,
    private readonly cache: CachePort,
    private readonly config: MiniappRuntimeConfig,
    private readonly eventCatalog: AstronomicalEventCatalogOwner = new AstronomicalEventCatalogOwner(),
  ) {}

  async resolve(input: ObservationContextResolveRequest) {
    const resolvedLocation =
      input.location.kind === "FORMAL_SPOT"
        ? await this.#formalLocation(input.location.spotId)
        : this.#mapLocation(input.location);
    if (input.location.kind === "MAP_POINT" && input.routeOriginContextId)
      throw new Error("observation_route_origin_invalid");
    const originContext = input.routeOriginContextId
      ? await this.get(input.routeOriginContextId)
      : null;
    if (originContext && originContext.location.kind !== "MAP_POINT")
      throw new Error("observation_route_origin_invalid");
    const routeOrigin =
      originContext?.location.kind === "MAP_POINT"
        ? {
            contextId: originContext.contextId,
            displayName: originContext.location.displayName,
            wgs84: { ...originContext.location.wgs84 },
            source: originContext.location.source,
          }
        : null;
    const privacyClass =
      originContext?.privacyClass === "SESSION_PRECISE"
        ? ("SESSION_PRECISE" as const)
        : resolvedLocation.privacyClass;
    const ttlSeconds = originContext
      ? Math.max(
          1,
          Math.min(
            resolvedLocation.ttlSeconds,
            Math.floor((Date.parse(originContext.expiresAt) - Date.now()) / 1_000),
          ),
        )
      : resolvedLocation.ttlSeconds;
    const { nightStartUtc, nightEndUtc } = observationNightBounds({
      localDate: input.localDate, timezone: resolvedLocation.timezone,
    });
    const selectedAtUtc = input.selectedAt
      ? new Date(input.selectedAt).toISOString()
      : zonedLocalToUtc({
          localDate: input.localDate,
          localTime: "21:00",
          timezone: resolvedLocation.timezone,
        });
    assertSelectedAt(selectedAtUtc, nightStartUtc, nightEndUtc);
    assertEventSelection(input.eventInstanceId, input.localDate, this.eventCatalog);
    const now = new Date();
    const fingerprintInput = {
      location: resolvedLocation.location,
      routeOrigin,
      timezone: resolvedLocation.timezone,
      localDate: input.localDate,
      eventInstanceId: input.eventInstanceId ?? null,
      targetProfile: input.targetProfile ?? "DAILY",
      weatherView: {
        primaryPolicy: this.config.weatherProvider,
        comparisonModels: [] as string[],
        selectedModel: null,
        cloudLayer: "TOTAL" as const,
      },
      algorithmVersions: {
        astronomy: this.config.astronomyAlgorithmVersion,
        opportunity: this.config.opportunityRuleVersion,
        tripDecision: this.config.tripDecisionRuleVersion,
        darkSky: this.config.darkSkyDatasetVersion,
        eventCatalog: this.eventCatalog.snapshot().catalogVersion,
      },
    };
    const context: ObservationContext = {
      schemaVersion: "observation-context-v2",
      contextId: `ctx:${randomUUID()}` as ObservationContextId,
      contextFingerprint: digest(fingerprintInput),
      revision: 1,
      ...fingerprintInput,
      ...(input.location.kind === "MAP_POINT" && resolvedLocation.timezone === "Asia/Macau"
        ? { timezoneSource: MACAO_TIMEZONE_SOURCE } : {}),
      nightStartUtc,
      nightEndUtc,
      selectedAtUtc,
      privacyClass,
      createdAt: now.toISOString(),
      expiresAt: new Date(
        now.getTime() + ttlSeconds * 1_000,
      ).toISOString(),
    };
    await this.cache.set(
      this.#key(context.contextId),
      context,
      ttlSeconds,
    );
    return context;
  }

  async get(contextId: string) {
    if (!/^ctx:[0-9a-f-]{36}$/iu.test(contextId))
      throw new Error("observation_context_not_found");
    const context = await this.cache.get<ObservationContext>(this.#key(contextId));
    if (!context) throw new Error("observation_context_not_found");
    if (Date.parse(context.expiresAt) <= Date.now()) {
      await this.cache.deleteByPrefix(this.#key(contextId));
      throw new Error("observation_context_expired");
    }
    if (context.weatherView.primaryPolicy !== "QWEATHER" || context.weatherView.cloudLayer !== "TOTAL" ||
        context.weatherView.comparisonModels.length || context.weatherView.selectedModel !== null) {
      // The established client recovery path rebuilds the same location, origin,
      // selected instant and event. Old supplier identities must not survive readback.
      await this.cache.deleteByPrefix(this.#key(contextId));
      throw new Error("observation_context_expired");
    }
    return context;
  }

  async update(contextId: string, input: ObservationContextUpdateRequest) {
    const current = await this.get(contextId);
    if (current.revision !== input.expectedRevision)
      throw new Error("observation_context_conflict");
    const localDate = input.localDate ?? current.localDate;
    const { nightStartUtc, nightEndUtc } = observationNightBounds({ localDate, timezone: current.timezone });
    const selectedAtUtc = input.selectedAt
      ? new Date(input.selectedAt).toISOString()
      : current.selectedAtUtc;
    assertSelectedAt(selectedAtUtc, nightStartUtc, nightEndUtc);
    const next: ObservationContext = {
      ...current,
      revision: current.revision + 1,
      localDate,
      nightStartUtc,
      nightEndUtc,
      selectedAtUtc,
      eventInstanceId:
        input.eventInstanceId === undefined
          ? current.eventInstanceId
          : input.eventInstanceId,
      weatherView: {
        primaryPolicy: "QWEATHER",
        comparisonModels: [],
        selectedModel: null,
        cloudLayer: "TOTAL",
      },
    };
    assertEventSelection(next.eventInstanceId, next.localDate, this.eventCatalog);
    const nextFingerprint = digest({
      location: next.location,
      routeOrigin: next.routeOrigin,
      timezone: next.timezone,
      localDate: next.localDate,
      eventInstanceId: next.eventInstanceId,
      targetProfile: next.targetProfile,
      weatherView: next.weatherView,
      algorithmVersions: next.algorithmVersions,
    });
    const saved = { ...next, contextFingerprint: nextFingerprint };
    const remainingTtlSeconds = Math.max(
      1,
      Math.floor((Date.parse(saved.expiresAt) - Date.now()) / 1_000),
    );
    await this.cache.set(this.#key(contextId), saved, remainingTtlSeconds);
    return saved;
  }

  #key(contextId: string) {
    return `observation-context:${contextId}`;
  }

  async #formalLocation(spotId: string) {
    const spot = await this.repository.getSpot(spotId as SpotId);
    if (!spot || spot.status === "DATA_INSUFFICIENT")
      throw new Error("formal_spot_not_found");
    return {
      location: {
        kind: "FORMAL_SPOT" as const,
        spotId: spot.spotId,
        locationVersion: 1,
      },
      timezone: spot.timezone,
      privacyClass: "PUBLIC_REFERENCE" as const,
      ttlSeconds: CONTEXT_TTL_SECONDS,
    };
  }

  #mapLocation(
    location: Extract<
      ObservationContextResolveRequest["location"],
      { kind: "MAP_POINT" }
    >,
  ) {
    if (
      location.wgs84.system !== "WGS84" ||
      !location.displayName.trim() ||
      location.displayName.length > 80
    )
      throw new Error("observation_location_invalid");
    const timezone = timezoneForTrialPoint(
      location.wgs84.latitude,
      location.wgs84.longitude,
    );
    return {
      location: {
        kind: "MAP_POINT" as const,
        displayName: location.displayName.trim(),
        wgs84: { ...location.wgs84 },
        source: location.source,
      },
      timezone,
      privacyClass:
        location.source === "USER_LOCATION"
          ? ("SESSION_PRECISE" as const)
          : ("PUBLIC_REFERENCE" as const),
      ttlSeconds:
        location.source === "USER_LOCATION"
          ? PRECISE_CONTEXT_TTL_SECONDS
          : CONTEXT_TTL_SECONDS,
    };
  }
}
