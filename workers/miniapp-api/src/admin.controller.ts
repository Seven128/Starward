import { randomUUID } from "node:crypto";
import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import type {
  AdminOperation,
  ContributionUploadId,
  SpotId,
} from "@starward/miniapp-contracts";
import {
  assertAdminOperation,
  assertAdminToken,
  normalizeAdminActor,
} from "./admin-auth.ts";
import { MiniappService } from "./miniapp-service.ts";
import {
  PostgresMiniappRepository,
  type AdminContributionEvidenceClaim,
  type AdminSpotCandidateInput,
  type AdminSpotPatch,
} from "./postgres-repository.ts";

const CONTRIBUTION_EVIDENCE_CLAIMS = new Set<AdminContributionEvidenceClaim>([
  "ACCESS_LAST_ROAD",
  "ACCESS_PARKING",
  "FACILITY_STATUS",
  "ACCESS_OPENNESS",
  "ACCESS_LEGAL_ENTRY",
  "SAFETY_NIGHT",
  "HORIZON_PROFILE",
  "SITE_MEDIA_PROVENANCE",
]);

function requireText(value: unknown, field: string, maximum: number) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum)
    throw new Error(`admin_${field}_invalid`);
  return value.trim();
}

function requireRevision(value: unknown, field = "revision") {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
    throw new Error(`admin_${field}_invalid`);
  return value;
}

function requireIdempotency(value: string | undefined) {
  return requireText(value, "idempotency_key", 200);
}

export function envelope<T>(data: T) {
  const generatedAt = new Date().toISOString();
  return {
    apiVersion: "v2" as const,
    data,
    dataState: "FRESH" as const,
    generatedAt,
    validAt: generatedAt,
    etag: "",
    sources: [],
    warnings: ["运营操作受管理员能力门禁、完整度策略、审计和数据库事务约束。"],
    requestId: randomUUID(),
  };
}

@Controller("v2/admin")
export class AdminController {
  constructor(
    @Inject(MiniappService) private readonly service: MiniappService,
  ) {}

  #context(
    token: string | undefined,
    actor: string | undefined,
    operation: AdminOperation = "CASE_READ",
  ) {
    assertAdminToken(token);
    if (!(this.service.repository instanceof PostgresMiniappRepository))
      throw new Error("admin_requires_postgres");
    const actorId = normalizeAdminActor(actor);
    assertAdminOperation(actorId, operation);
    return {
      repository: this.service.repository,
      actorId,
      requestId: randomUUID(),
    };
  }

  @Get("dashboard")
  async dashboard(
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    const [spots, articles, moderation, operations] = await Promise.all([
      context.repository.adminListSpots(),
      context.repository.adminListArticles(),
      context.repository.adminListModerationCases(),
      context.repository.adminOperations(),
    ]);
    return envelope({ spots, articles, moderation, ...operations });
  }

  @Get("spots")
  async spots(
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    return envelope(await context.repository.adminListSpots());
  }

  @Post("spots")
  async createSpotCandidate(
    @Body() body: Partial<AdminSpotCandidateInput>,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    const name = requireText(body.name, "name", 120);
    const region = requireText(body.region, "region", 120);
    const address = requireText(body.address, "address", 500);
    const reason = requireText(body.reason, "reason", 500);
    if (
      body.spotId !== undefined &&
      !/^spot:[a-zA-Z0-9._:-]+$/u.test(body.spotId)
    )
      throw new Error("admin_spot_id_invalid");
    if (!body.timezone || !["Asia/Shanghai", "Asia/Hong_Kong"].includes(body.timezone))
      throw new Error("admin_timezone_invalid");
    if (
      !Number.isFinite(body.latitude) ||
      !Number.isFinite(body.longitude) ||
      Math.abs(body.latitude!) > 90 ||
      Math.abs(body.longitude!) > 180 ||
      (body.latitude === 0 && body.longitude === 0)
    )
      throw new Error("admin_coordinate_or_source_invalid");
    if (
      body.altitudeM !== null &&
      body.altitudeM !== undefined &&
      (!Number.isFinite(body.altitudeM) || Math.abs(body.altitudeM) > 9_000)
    )
      throw new Error("admin_altitude_invalid");
    if (
      !body.visibilityPolicy ||
      !["PUBLIC_EXACT", "PUBLIC_APPROXIMATE", "RESTRICTED", "HIDDEN"].includes(
        body.visibilityPolicy,
      )
    )
      throw new Error("admin_visibility_invalid");
    const source = body.source;
    if (
      !source ||
      !["OFFICIAL_VERIFICATION", "USER_FIELD_REPORT", "OPEN_DATA", "HISTORICAL_RECORD"].includes(
        source.kind,
      ) ||
      ["TEST_FIXTURE"].includes(source.kind) ||
      ["SAMPLE_DATA", "UNAVAILABLE", "EXPIRED"].includes(source.state) ||
      !source.id ||
      !source.provider ||
      !source.title ||
      !source.license ||
      !source.precision ||
      !Number.isFinite(Date.parse(source.retrievedAt)) ||
      (["OPEN_DATA", "HISTORICAL_RECORD"].includes(source.kind) &&
        !/^https:\/\//u.test(source.sourceUrl))
    )
      throw new Error("admin_candidate_source_invalid");
    const candidate: AdminSpotCandidateInput = {
      ...(body.spotId ? { spotId: body.spotId } : {}),
      name,
      region,
      address,
      timezone: body.timezone,
      latitude: body.latitude!,
      longitude: body.longitude!,
      altitudeM: body.altitudeM ?? null,
      visibilityPolicy: body.visibilityPolicy,
      source,
      reason,
    };
    const result = await context.repository.adminCreateSpotCandidate({
      candidate,
      actorId: context.actorId,
      requestId: context.requestId,
    });
    await this.service.cache.deleteByPrefix("search:");
    return envelope(result);
  }

  @Patch("spots/:spotId")
  async patchSpot(
    @Param("spotId") spotId: string,
    @Body() body: Partial<AdminSpotPatch>,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    if (!spotId.startsWith("spot:")) throw new Error("formal_spot_not_found");
    const reason = requireText(body.reason, "reason", 500);
    if (body.name !== undefined) requireText(body.name, "name", 120);
    if (body.region !== undefined) requireText(body.region, "region", 120);
    if (body.address !== undefined) requireText(body.address, "address", 500);
    if (
      body.timezone !== undefined &&
      !["Asia/Shanghai", "Asia/Hong_Kong"].includes(body.timezone)
    )
      throw new Error("admin_timezone_invalid");
    if (
      body.altitudeM !== undefined &&
      body.altitudeM !== null &&
      (!Number.isFinite(body.altitudeM) || Math.abs(body.altitudeM) > 9_000)
    )
      throw new Error("admin_altitude_invalid");
    if (
      body.status !== undefined &&
      !["PUBLISHED", "TEMPORARILY_CLOSED", "DATA_INSUFFICIENT"].includes(
        body.status,
      )
    )
      throw new Error("admin_status_invalid");
    if (
      body.visibilityPolicy !== undefined &&
      ![
        "PUBLIC_EXACT",
        "PUBLIC_APPROXIMATE",
        "RESTRICTED",
        "HIDDEN",
      ].includes(body.visibilityPolicy)
    )
      throw new Error("admin_visibility_invalid");
    if (body.wgs84) {
      if (
        !Number.isFinite(body.wgs84.latitude) ||
        !Number.isFinite(body.wgs84.longitude) ||
        Math.abs(body.wgs84.latitude) > 90 ||
        Math.abs(body.wgs84.longitude) > 180 ||
        !body.wgs84.source?.id
      )
        throw new Error("admin_coordinate_or_source_invalid");
    }
    if (body.facilities && body.facilities.length !== 8)
      throw new Error("admin_facility_closure_invalid");
    if (body.media && body.media.length > 12)
      throw new Error("admin_media_count_invalid");
    if (body.guides && body.guides.length > 20)
      throw new Error("admin_guide_count_invalid");
    if (body.route) {
      if (
        !["ROUTE_ESTIMATE", "STRAIGHT_LINE_ONLY", "UNAVAILABLE"].includes(
          body.route.kind,
        ) ||
        !["FRESH", "STALE", "PARTIAL", "UNAVAILABLE"].includes(
          body.route.state,
        ) ||
        typeof body.route.lastRoad !== "string" ||
        !body.route.lastRoad.trim() ||
        typeof body.route.parkingGuidance !== "string" ||
        !body.route.parkingGuidance.trim() ||
        !body.route.source?.id
      )
        throw new Error("admin_route_evidence_invalid");
      for (const value of [
        body.route.distanceKm,
        body.route.driveMinutes,
        body.route.walkingMinutes,
      ])
        if (value !== null && (!Number.isFinite(value) || value < 0))
          throw new Error("admin_route_evidence_invalid");
    }
    if (
      body.lastVerifiedAt !== undefined &&
      body.lastVerifiedAt !== null &&
      !Number.isFinite(Date.parse(body.lastVerifiedAt))
    )
      throw new Error("admin_last_verified_at_invalid");
    if (
      body.obstructionPercent !== undefined &&
      body.obstructionPercent !== null &&
      (!Number.isFinite(body.obstructionPercent) ||
        body.obstructionPercent < 0 ||
        body.obstructionPercent > 100)
    )
      throw new Error("admin_obstruction_invalid");
    if (
      body.siteMediaState !== undefined &&
      ![
        "SITE_MEDIA_VERIFIED",
        "NO_SITE_MEDIA_VERIFIED",
        "UNKNOWN",
      ].includes(body.siteMediaState)
    )
      throw new Error("admin_site_media_state_invalid");
    if (body.evidence && body.evidence.length > 256)
      throw new Error("admin_evidence_count_invalid");
    if (body.dataDisclosure && body.dataDisclosure.length > 256)
      throw new Error("admin_source_count_invalid");
    const patch: AdminSpotPatch = {
      reason,
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.region !== undefined ? { region: body.region.trim() } : {}),
      ...(body.address !== undefined ? { address: body.address.trim() } : {}),
      ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      ...(body.altitudeM !== undefined ? { altitudeM: body.altitudeM } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.visibilityPolicy !== undefined
        ? { visibilityPolicy: body.visibilityPolicy }
        : {}),
      ...(body.wgs84 ? { wgs84: body.wgs84 } : {}),
      ...(body.lastVerifiedAt !== undefined
        ? { lastVerifiedAt: body.lastVerifiedAt }
        : {}),
      ...(body.lightPollution !== undefined
        ? { lightPollution: body.lightPollution }
        : {}),
      ...(body.obstructionPercent !== undefined
        ? { obstructionPercent: body.obstructionPercent }
        : {}),
      ...(body.clearDirections !== undefined
        ? { clearDirections: body.clearDirections }
        : {}),
      ...(body.accessTags !== undefined
        ? { accessTags: body.accessTags }
        : {}),
      ...(body.facilities ? { facilities: body.facilities } : {}),
      ...(body.media ? { media: body.media } : {}),
      ...(body.guides ? { guides: body.guides } : {}),
      ...(body.route ? { route: body.route } : {}),
      ...(body.accessAndSafety
        ? { accessAndSafety: body.accessAndSafety }
        : {}),
      ...(body.siteMediaState
        ? { siteMediaState: body.siteMediaState }
        : {}),
      ...(body.evidence ? { evidence: body.evidence } : {}),
      ...(body.dataDisclosure
        ? { dataDisclosure: body.dataDisclosure }
        : {}),
    };
    const result = await context.repository.adminPatchSpot({
      spotId: decodeURIComponent(spotId) as SpotId,
      patch,
      actorId: context.actorId,
      requestId: context.requestId,
    });
    await Promise.all([
      this.service.cache.deleteByPrefix("map:"),
      this.service.cache.deleteByPrefix(`spot-overview:${spotId}`),
      this.service.cache.deleteByPrefix("favorites:"),
    ]);
    return envelope(result);
  }

  @Post("spots/:spotId/publish")
  async publish(
    @Param("spotId") spotId: string,
    @Body()
    body: {
      reason?: string;
      expectedRevision?: number;
      assessmentDigest?: string;
    },
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor, "PUBLISH");
    const result = await context.repository.adminChangeSpotLifecycle({
      spotId: decodeURIComponent(spotId) as SpotId,
      action: "PUBLISH",
      expectedSpotRevision: requireRevision(body.expectedRevision),
      ...(body.assessmentDigest
        ? { assessmentDigest: body.assessmentDigest }
        : {}),
      reason: requireText(body.reason, "publication_reason", 500),
      actorId: context.actorId,
      requestId: context.requestId,
      idempotencyKey: requireIdempotency(idempotencyKey),
    });
    await this.service.cache.deleteByPrefix("map:");
    await this.service.cache.deleteByPrefix(`spot-overview:${spotId}`);
    return envelope(result);
  }

  @Post("spots/:spotId/suspend")
  async suspend(
    @Param("spotId") spotId: string,
    @Body()
    body: {
      reason?: string;
      expectedRevision?: number;
      assessmentDigest?: string;
    },
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor, "SUSPEND");
    const result = await context.repository.adminChangeSpotLifecycle({
      spotId: decodeURIComponent(spotId) as SpotId,
      action: "SUSPEND",
      expectedSpotRevision: requireRevision(body.expectedRevision),
      ...(body.assessmentDigest
        ? { assessmentDigest: body.assessmentDigest }
        : {}),
      reason: requireText(body.reason, "publication_reason", 500),
      actorId: context.actorId,
      requestId: context.requestId,
      idempotencyKey: requireIdempotency(idempotencyKey),
    });
    await this.service.cache.deleteByPrefix("map:");
    await this.service.cache.deleteByPrefix(`spot-overview:${spotId}`);
    return envelope(result);
  }

  @Get("articles")
  async articles(
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    return envelope(await context.repository.adminListArticles());
  }

  @Get("moderation/cases")
  async moderation(
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    return envelope(await context.repository.adminListModerationCases());
  }

  @Get("contribution-media/:uploadId")
  async contributionMedia(
    @Param("uploadId") uploadId: string,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    this.#context(token, actor, "MEDIA_READ");
    if (!uploadId.startsWith("upload:"))
      throw new Error("contribution_upload_not_found");
    return envelope(
      await this.service.contributions.readForAdmin(
        decodeURIComponent(uploadId) as ContributionUploadId,
      ),
    );
  }

  @Post("moderation/cases/:caseId/resolve")
  async resolveModeration(
    @Param("caseId") caseId: string,
    @Body()
    body: {
      resolution?: string;
      reason?: string;
      expectedRevision?: number;
    },
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor, "CASE_REVIEW");
    if (!caseId) throw new Error("moderation_case_not_found");
    if (
      body.resolution !== "APPROVED" &&
      body.resolution !== "ACCEPTED" &&
      body.resolution !== "REJECTED" &&
      body.resolution !== "CHANGES_REQUESTED"
    )
      throw new Error("moderation_resolution_invalid");
    const key = requireIdempotency(idempotencyKey);
    const reason = requireText(body.reason, "moderation_reason", 500);
    const expectedRevision = requireRevision(body.expectedRevision);
    if (body.resolution === "CHANGES_REQUESTED")
      return envelope(
        await context.repository.adminRequestContributionChanges({
          caseId,
          reason,
          expectedRevision,
          actorId: context.actorId,
          requestId: context.requestId,
          idempotencyKey: key,
        }),
      );
    return envelope(
      await context.repository.adminResolveModeration({
        caseId,
        resolution: body.resolution,
        reason,
        actorId: context.actorId,
        requestId: context.requestId,
        expectedRevision,
        idempotencyKey: key,
      }),
    );
  }

  @Post("moderation/cases/:caseId/merge")
  async mergeContributionEvidence(
    @Param("caseId") caseId: string,
    @Body()
    body: {
      spotId?: string;
      confirmedClaims?: readonly string[];
      reason?: string;
      expectedSubmissionRevision?: number;
      expectedSpotRevision?: number;
    },
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor, "MERGE_COMMIT");
    if (!caseId) throw new Error("moderation_case_not_found");
    if (!body.spotId?.startsWith("spot:"))
      throw new Error("formal_spot_not_found");
    if (
      !Array.isArray(body.confirmedClaims) ||
      !body.confirmedClaims.length ||
      body.confirmedClaims.length > CONTRIBUTION_EVIDENCE_CLAIMS.size ||
      body.confirmedClaims.some(
        (claim) =>
          typeof claim !== "string" ||
          !CONTRIBUTION_EVIDENCE_CLAIMS.has(
            claim as AdminContributionEvidenceClaim,
          ),
      ) ||
      new Set(body.confirmedClaims).size !== body.confirmedClaims.length
    )
      throw new Error("contribution_merge_claims_invalid");
    const result = await context.repository.adminCommitMerge({
      caseId: decodeURIComponent(caseId),
      spotId: decodeURIComponent(body.spotId) as SpotId,
      confirmedClaims:
        body.confirmedClaims as readonly string[],
      expectedSubmissionRevision: requireRevision(
        body.expectedSubmissionRevision,
        "submission_revision",
      ),
      expectedSpotRevision: requireRevision(
        body.expectedSpotRevision,
        "spot_revision",
      ),
      reason: requireText(body.reason, "merge_reason", 500),
      actorId: context.actorId,
      requestId: context.requestId,
      idempotencyKey: requireIdempotency(idempotencyKey),
    });
    await Promise.all([
      this.service.cache.deleteByPrefix("map:"),
      this.service.cache.deleteByPrefix(`spot-overview:${body.spotId}`),
      this.service.cache.deleteByPrefix("favorites:"),
    ]);
    return envelope(result);
  }

  @Get("data-sources")
  async dataSources(
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    return envelope((await context.repository.adminOperations()).dataSources);
  }

  @Get("provider-health")
  async providerHealth(
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    return envelope((await context.repository.adminOperations()).providerHealth);
  }

  @Get("costs")
  async costs(
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    return envelope({
      usage: (await context.repository.adminOperations()).costs,
      budget: this.service.providers.budget.snapshot(),
    });
  }

  @Get("decisions")
  async decisions(
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    return envelope((await context.repository.adminOperations()).decisions);
  }

  @Get("audit-logs")
  async auditLogs(
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    return envelope((await context.repository.adminOperations()).audits);
  }
}
