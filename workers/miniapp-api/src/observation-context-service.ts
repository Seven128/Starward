import { localParts, observationNightBounds, zonedLocalToUtc } from "@starward/miniapp-contracts";
export { zonedLocalToUtc } from "@starward/miniapp-contracts";
import { createHash, randomUUID } from "node:crypto";
import type {
  ObservationContext,
  ObservationContextId,
  ObservationContextResolveRequest,
  ObservationContextUpdateRequest,
  SpotId,
  UserId,
  ContributionId,
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

function fingerprint(context: ObservationContext) {
  return digest({ location: context.location, routeOrigin: context.routeOrigin,
    timezone: context.timezone, localDate: context.localDate, eventInstanceId: context.eventInstanceId,
    targetProfile: context.targetProfile, weatherView: context.weatherView,
    algorithmVersions: context.algorithmVersions,
    ...(context.privateProposal ? { privateProposal: context.privateProposal } : {}) });
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

  async resolve(input: ObservationContextResolveRequest, actor?: UserId | null) {
    const resolvedLocation =
      input.location.kind === "FORMAL_SPOT"
        ? await this.#formalLocation(input.location.spotId)
        : input.location.kind === "PENDING_PROPOSAL"
        ? await this.#proposalLocation(input.location, actor)
        : this.#mapLocation(input.location);
    if (input.location.kind !== "FORMAL_SPOT" && input.routeOriginContextId)
      throw new Error("observation_route_origin_invalid");
    const originContext = input.routeOriginContextId
      ? await this.get(input.routeOriginContextId, actor)
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
      schemaVersion: input.location.kind === "PENDING_PROPOSAL" ? "observation-context-v3" : "observation-context-v2",
      contextId: `ctx:${randomUUID()}` as ObservationContextId,
      contextFingerprint: digest(fingerprintInput),
      revision: 1,
      ...fingerprintInput,
      ...("privateProposal" in resolvedLocation ? { privateProposal: resolvedLocation.privateProposal } : {}),
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
    context.contextFingerprint = fingerprint(context);
    await this.cache.set(
      this.#key(context.contextId),
      context,
      ttlSeconds,
    );
    return context.privateProposal ? this.get(context.contextId, actor) : context;
  }

  async get(contextId: string, actor?: UserId | null): Promise<ObservationContext> {
    if (!/^ctx:[0-9a-f-]{36}$/iu.test(contextId))
      throw new Error("observation_context_not_found");
    const context = await this.cache.get<ObservationContext>(this.#key(contextId));
    if (!context) throw new Error("observation_context_not_found");
    if (context.schemaVersion === "observation-context-v3") {
      if (!actor || !context.privateProposal || context.privateProposal.ownerId !== actor || context.privacyClass !== "ACCOUNT_PRIVATE" || context.routeOrigin !== null)
        throw new Error("observation_proposal_permission_denied");
    } else if (context.privateProposal || context.location.kind === "PENDING_PROPOSAL" || context.privacyClass === "ACCOUNT_PRIVATE") {
      throw new Error("observation_context_invalid");
    }
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
    if (!context.privateProposal) return context;
    const resolved = await this.#proposalLocation({ kind: "PENDING_PROPOSAL", ...context.privateProposal,
      ...(context.location.kind === "FORMAL_SPOT" ? { formalSpotId: context.location.spotId } : {}) }, actor);
    if (Date.parse(context.expiresAt) <= Date.now()) throw new Error("observation_context_expired");
    if (JSON.stringify(resolved.location) === JSON.stringify(context.location) && resolved.timezone === context.timezone) return context;
    const bounds = observationNightBounds({ localDate: context.localDate, timezone: resolved.timezone });
    assertSelectedAt(context.selectedAtUtc, bounds.nightStartUtc, bounds.nightEndUtc);
    const next: ObservationContext = { ...context, location: resolved.location, timezone: resolved.timezone, timezoneSource: null,
      ...bounds, revision: context.revision + 1 };
    next.contextFingerprint = fingerprint(next);
    const result = await this.cache.replaceIfRevision(this.#key(contextId), context.revision, next, Date.parse(context.expiresAt));
    if (result === "missing") throw new Error("observation_context_not_found");
    // Another reader may have committed this same authoritative transition. One
    // readback suffices; never recurse or overwrite its newer user time edit.
    if (result === "conflict") {
      const latest = await this.cache.get<ObservationContext>(this.#key(contextId));
      if (!latest || latest.revision <= context.revision || latest.privateProposal?.ownerId !== actor ||
          JSON.stringify(latest.privateProposal) !== JSON.stringify(context.privateProposal) ||
          JSON.stringify(latest.location) !== JSON.stringify(resolved.location)) throw new Error("observation_context_conflict");
      const confirmed = await this.#proposalLocation({ kind: "PENDING_PROPOSAL", ...context.privateProposal,
        ...(latest.location.kind === "FORMAL_SPOT" ? { formalSpotId: latest.location.spotId } : {}) }, actor);
      if (Date.parse(latest.expiresAt) <= Date.now() || JSON.stringify(confirmed.location) !== JSON.stringify(latest.location))
        throw new Error("observation_context_conflict");
      return latest;
    }
    const confirmed = await this.#proposalLocation({ kind: "PENDING_PROPOSAL", ...context.privateProposal,
      ...(next.location.kind === "FORMAL_SPOT" ? { formalSpotId: next.location.spotId } : {}) }, actor);
    if (Date.parse(next.expiresAt) <= Date.now() || JSON.stringify(confirmed.location) !== JSON.stringify(next.location))
      throw new Error("observation_context_conflict");
    return next;
  }

  async update(contextId: string, input: ObservationContextUpdateRequest, actor?: UserId | null) {
    const current = await this.get(contextId, actor);
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
    const nextFingerprint = fingerprint(next);
    const saved = { ...next, contextFingerprint: nextFingerprint };
    const result = await this.cache.replaceIfRevision(
      this.#key(contextId), input.expectedRevision, saved,
      Date.parse(saved.expiresAt),
    );
    if (result === "missing") throw new Error("observation_context_not_found");
    if (result === "conflict") throw new Error("observation_context_conflict");
    if (saved.privateProposal) {
      const confirmed = await this.#proposalLocation({ kind: "PENDING_PROPOSAL", ...saved.privateProposal,
        ...(saved.location.kind === "FORMAL_SPOT" ? { formalSpotId: saved.location.spotId } : {}) }, actor);
      if (JSON.stringify(confirmed.location) !== JSON.stringify(saved.location)) throw new Error("observation_context_conflict");
      if (Date.parse(saved.expiresAt) <= Date.now()) throw new Error("observation_context_expired");
    }
    return saved;
  }

  #key(contextId: string) {
    return `observation-context:${contextId}`;
  }

  async #proposalLocation(input: Extract<ObservationContextResolveRequest["location"], { kind: "PENDING_PROPOSAL" }>, actor?: UserId | null) {
    if (!actor) throw new Error("observation_proposal_permission_denied");
    if (typeof input.submissionId !== "string" || !input.submissionId.startsWith("contribution:") ||
        typeof input.attemptId !== "string" || !input.attemptId.startsWith("contribution-attempt:") ||
        !Number.isInteger(input.attemptBaseRevision) || input.attemptBaseRevision < 1)
      throw new Error("observation_proposal_identity_invalid");
    // This owner-scoped aggregate read binds current state, latest immutable
    // attempt and durable publication mapping in one repository snapshot.
    const submission = await this.repository.getContribution(actor, input.submissionId as ContributionId);
    if (!submission) throw new Error("contribution_not_found");
    const attempt = submission.attempts.at(-1);
    if (submission.kind !== "NEW_SPOT_PROPOSAL" || !["PENDING_REVIEW", "ACCEPTED"].includes(submission.submissionState) ||
        !submission.preciseLocationConsent || !attempt || attempt.attemptId !== input.attemptId ||
        attempt.baseRevision !== input.attemptBaseRevision || attempt.snapshot.kind !== "NEW_SPOT_PROPOSAL" ||
        !attempt.snapshot.preciseLocationConsent || !attempt.snapshot.candidateLocation ||
        (attempt.review && !["APPROVED", "ACCEPTED"].includes(attempt.review.resolution)))
      throw new Error("observation_proposal_permission_denied");
    const privateProposal = { ownerId: actor, submissionId: submission.submissionId,
      attemptId: attempt.attemptId, attemptBaseRevision: attempt.baseRevision };
    const hasMapping = submission.mergeState === "MERGED" && submission.spotId !== null;
    const mappedSpot = hasMapping ? await this.repository.getSpot(submission.spotId!) : null;
    if (hasMapping) {
      // Canonical eligibility is an awaited read. Close it against the latest
      // owned aggregate before returning private location data; a withdrawal or
      // replacement during that read cannot inherit the earlier authorization.
      const latest = await this.repository.getContribution(actor, submission.submissionId);
      const latestAttempt = latest?.attempts.at(-1);
      if (!latest || latest.kind !== "NEW_SPOT_PROPOSAL" || !["PENDING_REVIEW", "ACCEPTED"].includes(latest.submissionState) ||
          !latest.preciseLocationConsent || !latestAttempt || latestAttempt.attemptId !== input.attemptId ||
          latestAttempt.baseRevision !== input.attemptBaseRevision || !latestAttempt.snapshot.preciseLocationConsent ||
          (latestAttempt.review && !["APPROVED", "ACCEPTED"].includes(latestAttempt.review.resolution)))
        throw new Error("observation_proposal_permission_denied");
      if (latest.mergeState !== submission.mergeState || latest.spotId !== submission.spotId || latest.publicationImpact !== submission.publicationImpact)
        throw new Error("observation_context_conflict");
    }
    const publicMapping = mappedSpot && ["PUBLISHED", "TEMPORARILY_CLOSED"].includes(mappedSpot.status);
    if (input.formalSpotId !== undefined && (!publicMapping || mappedSpot!.spotId !== input.formalSpotId))
      throw new Error("formal_spot_not_found");
    if (publicMapping) {
      const formal = { location: { kind: "FORMAL_SPOT" as const, spotId: mappedSpot!.spotId, locationVersion: 1 }, timezone: mappedSpot!.timezone };
      return { ...formal, privateProposal, privacyClass: "ACCOUNT_PRIVATE" as const, ttlSeconds: PRECISE_CONTEXT_TTL_SECONDS };
    }
    if (submission.publicationImpact === "SPOT_PUBLISHED") throw new Error("formal_spot_not_found");
    const snapshot = attempt.snapshot;
    const map = this.#mapLocation({ kind: "MAP_POINT", displayName: snapshot.candidateProfile?.fields.name ?? snapshot.candidateLocation!.displayName,
      wgs84: snapshot.candidateLocation!.wgs84, source: "MAP_VIEWPORT" });
    return { ...map, location: { kind: "PENDING_PROPOSAL" as const, displayName: map.location.displayName, wgs84: map.location.wgs84 },
      privateProposal, privacyClass: "ACCOUNT_PRIVATE" as const, ttlSeconds: PRECISE_CONTEXT_TTL_SECONDS };
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
