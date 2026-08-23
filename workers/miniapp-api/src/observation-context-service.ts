import { createHash, randomUUID } from "node:crypto";
import type {
  ObservationContext,
  ObservationContextId,
  ObservationContextResolveRequest,
  ObservationContextUpdateRequest,
  SpotId,
} from "@starward/miniapp-contracts";
import {
  activeMeteorEvents,
  meteorEventByOccurrenceId,
} from "./meteor-event-catalog.ts";
import type { CachePort, MiniappRepositoryPort } from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

const CONTEXT_TTL_SECONDS = 48 * 60 * 60;
const PRECISE_CONTEXT_TTL_SECONDS = 2 * 60 * 60;

function timezoneForTrialPoint(
  latitude: number,
  longitude: number,
  hint?: "Asia/Shanghai" | "Asia/Hong_Kong",
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
  if (hint) return hint;
  const inHongKongLongitude = longitude >= 113.78 && longitude <= 114.52;
  if (inHongKongLongitude && latitude >= 22.12 && latitude <= 22.45)
    return "Asia/Hong_Kong" as const;
  if (!inHongKongLongitude || latitude >= 22.58)
    return "Asia/Shanghai" as const;
  // The Shenzhen/Hong Kong land border cannot be classified safely by a
  // broad bounding box. Require an explicit map/geocoder timezone hint in
  // this narrow band rather than silently attaching the wrong IANA zone.
  throw new Error("observation_timezone_resolution_ambiguous");
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function localParts(date: Date, timezone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

/** Converts a finite local wall-clock value through the platform IANA rules.
 * Two passes handle offset changes without assuming China-only fixed offsets. */
export function zonedLocalToUtc(input: {
  localDate: string;
  localTime: string;
  timezone: string;
}): string {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.localDate))
    throw new Error("observation_local_date_invalid");
  if (!/^\d{2}:\d{2}$/u.test(input.localTime))
    throw new Error("observation_local_time_invalid");
  const [year, month, day] = input.localDate.split("-").map(Number);
  const [hour, minute] = input.localTime.split(":").map(Number);
  const wall = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0);
  let candidate = wall;
  for (let index = 0; index < 3; index += 1) {
    const seen = localParts(new Date(candidate), input.timezone);
    const seenWall = Date.UTC(
      seen.year,
      seen.month - 1,
      seen.day,
      seen.hour,
      seen.minute,
      seen.second,
    );
    candidate -= seenWall - wall;
  }
  const verified = localParts(new Date(candidate), input.timezone);
  if (
    verified.year !== year ||
    verified.month !== month ||
    verified.day !== day ||
    verified.hour !== hour ||
    verified.minute !== minute
  )
    throw new Error("observation_local_time_nonexistent_or_ambiguous");
  return new Date(candidate).toISOString();
}

function nextLocalDate(localDate: string): string {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + 1))
    .toISOString()
    .slice(0, 10);
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
) {
  if (!eventInstanceId) return;
  const event = meteorEventByOccurrenceId(eventInstanceId);
  if (
    !event ||
    !activeMeteorEvents(localDate).some(
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
    const nightStartUtc = zonedLocalToUtc({
      localDate: input.localDate,
      localTime: "12:00",
      timezone: resolvedLocation.timezone,
    });
    const nightEndUtc = zonedLocalToUtc({
      localDate: nextLocalDate(input.localDate),
      localTime: "12:00",
      timezone: resolvedLocation.timezone,
    });
    const selectedAtUtc = input.selectedAt
      ? new Date(input.selectedAt).toISOString()
      : zonedLocalToUtc({
          localDate: input.localDate,
          localTime: "21:00",
          timezone: resolvedLocation.timezone,
        });
    assertSelectedAt(selectedAtUtc, nightStartUtc, nightEndUtc);
    assertEventSelection(input.eventInstanceId, input.localDate);
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
        eventCatalog: this.config.eventCatalogVersion,
      },
    };
    const context: ObservationContext = {
      schemaVersion: "observation-context-v2",
      contextId: `ctx:${randomUUID()}` as ObservationContextId,
      contextFingerprint: digest(fingerprintInput),
      revision: 1,
      ...fingerprintInput,
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
    return context;
  }

  async update(contextId: string, input: ObservationContextUpdateRequest) {
    const current = await this.get(contextId);
    if (current.revision !== input.expectedRevision)
      throw new Error("observation_context_conflict");
    const selectedAtUtc = input.selectedAt
      ? new Date(input.selectedAt).toISOString()
      : current.selectedAtUtc;
    assertSelectedAt(selectedAtUtc, current.nightStartUtc, current.nightEndUtc);
    const next: ObservationContext = {
      ...current,
      revision: current.revision + 1,
      selectedAtUtc,
      eventInstanceId:
        input.eventInstanceId === undefined
          ? current.eventInstanceId
          : input.eventInstanceId,
      weatherView: {
        ...current.weatherView,
        cloudLayer: input.cloudLayer ?? current.weatherView.cloudLayer,
      },
    };
    assertEventSelection(next.eventInstanceId, next.localDate);
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
      location.timezoneHint,
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
