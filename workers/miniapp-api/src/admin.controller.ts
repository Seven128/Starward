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
import type { SpotId } from "@starward/miniapp-contracts";
import { assertAdminToken, normalizeAdminActor } from "./admin-auth.ts";
import { MiniappService } from "./miniapp-service.ts";
import {
  PostgresMiniappRepository,
  type AdminSpotPatch,
} from "./postgres-repository.ts";

function requireText(value: unknown, field: string, maximum: number) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum)
    throw new Error(`admin_${field}_invalid`);
  return value.trim();
}

function envelope<T>(data: T) {
  return {
    apiVersion: "v1" as const,
    data,
    dataState: "FRESH" as const,
    generatedAt: new Date().toISOString(),
    sources: [],
    warnings: [
      "运营操作受 Demo 管理员能力门禁、审计和数据库事务约束。",
    ],
  };
}

@Controller("v1/admin")
export class AdminController {
  constructor(
    @Inject(MiniappService) private readonly service: MiniappService,
  ) {}

  #context(token: string | undefined, actor: string | undefined) {
    assertAdminToken(token);
    if (!(this.service.repository instanceof PostgresMiniappRepository))
      throw new Error("admin_requires_postgres");
    return {
      repository: this.service.repository,
      actorId: normalizeAdminActor(actor),
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
    if (body.media && (body.media.length < 1 || body.media.length > 12))
      throw new Error("admin_media_count_invalid");
    if (body.guides && body.guides.length > 20)
      throw new Error("admin_guide_count_invalid");
    if (body.siteSafety && body.siteSafety.some((item) => !item.trim()))
      throw new Error("admin_site_safety_invalid");
    const patch: AdminSpotPatch = {
      reason,
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.region !== undefined ? { region: body.region.trim() } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.visibilityPolicy !== undefined
        ? { visibilityPolicy: body.visibilityPolicy }
        : {}),
      ...(body.wgs84 ? { wgs84: body.wgs84 } : {}),
      ...(body.facilities ? { facilities: body.facilities } : {}),
      ...(body.media ? { media: body.media } : {}),
      ...(body.guides ? { guides: body.guides } : {}),
      ...(body.siteSafety ? { siteSafety: body.siteSafety } : {}),
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
  publish(
    @Param("spotId") spotId: string,
    @Body() body: { reason?: string },
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    return this.patchSpot(
      spotId,
      { status: "PUBLISHED", reason: body.reason ?? "管理员发布" },
      token,
      actor,
    );
  }

  @Post("spots/:spotId/suspend")
  suspend(
    @Param("spotId") spotId: string,
    @Body() body: { reason?: string },
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    return this.patchSpot(
      spotId,
      {
        status: "TEMPORARILY_CLOSED",
        reason: body.reason ?? "管理员暂停推荐",
      },
      token,
      actor,
    );
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

  @Post("moderation/cases/:caseId/resolve")
  async resolveModeration(
    @Param("caseId") caseId: string,
    @Body() body: { resolution?: string; reason?: string },
    @Headers("x-admin-token") token?: string,
    @Headers("x-admin-actor") actor?: string,
  ) {
    const context = this.#context(token, actor);
    if (!caseId) throw new Error("moderation_case_not_found");
    if (body.resolution !== "APPROVED" && body.resolution !== "REJECTED")
      throw new Error("moderation_resolution_invalid");
    return envelope(
      await context.repository.adminResolveModeration({
        caseId,
        resolution: body.resolution,
        reason: requireText(body.reason, "moderation_reason", 500),
        actorId: context.actorId,
        requestId: context.requestId,
      }),
    );
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
