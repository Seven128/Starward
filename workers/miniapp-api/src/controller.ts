import type { AccountAvatarSaveRequest, AccountNicknameSaveRequest } from "@starward/miniapp-contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import {
  assertFilterState,
  type ContributionDraftRequest,
  type ContributionFormalSubmitRequest,
  type ContributionFormalUploadIntentRequest,
  type ContributionFormalUploadSessionRequest,
  type ContributionFormalUploadCompleteRequest,
  type ContributionFormalUploadRemoveRequest,
  type ContributionId,
  type ContributionSubmitRequest,
  type ContributionUpdateRequest,
  type ContributionUploadCompleteRequest,
  type ContributionUploadRemoveRequest,
  type ContributionUploadId,
  type ContributionUploadSessionRequest,
  type FilterState,
  type SpotId,
  type ImportStage,
  type MapLayerKind,
  type ObservationContext,
  type ObservationContextResolveRequest,
  type ObservationContextUpdateRequest,
  type ObservationPlan,
  type PlanSaveRequest,
  type PlatformKind,
  type RouteEstimateRequest,
  type SpotRankingPreferences,
  type UserPreferences,
  type WechatLoginRequest,
} from "@starward/miniapp-contracts";
import { MiniappService } from "./miniapp-service.ts";

function required(value: string | undefined, code: string) {
  if (!value?.trim()) throw new Error(code);
  return value.trim();
}

function parseJson<T>(value: string | undefined, code: string): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(code);
  }
}

function parseFilters(value?: string): FilterState | undefined {
  const parsed = parseJson<unknown>(value, "map_filters_invalid");
  if (parsed === undefined) return undefined;
  try {
    assertFilterState(parsed);
    return parsed;
  } catch {
    throw new Error("map_filters_invalid");
  }
}

function parsePreferences(value?: string): SpotRankingPreferences | undefined {
  const candidate = parseJson<Partial<SpotRankingPreferences>>(
    value,
    "map_preferences_invalid",
  );
  if (candidate === undefined) return undefined;
  const facilities = new Set([
    "PARKING",
    "TOILET",
    "PLATFORM",
    "CHARGING",
    "CAMPING",
    "ROAD",
    "WALKING",
    "SIGNAL",
  ]);
  if (
    typeof candidate.defaultPlace !== "string" ||
    candidate.defaultPlace.length > 80 ||
    !["BEGINNER", "ADVANCED"].includes(candidate.experience ?? "") ||
    !Number.isInteger(candidate.maxDriveMinutes) ||
    (candidate.maxDriveMinutes ?? 0) < 30 ||
    (candidate.maxDriveMinutes ?? 0) > 360 ||
    !Array.isArray(candidate.requiredFacilities) ||
    candidate.requiredFacilities.length > 8 ||
    candidate.requiredFacilities.some(
      (facility) => typeof facility !== "string" || !facilities.has(facility),
    ) ||
    typeof candidate.equipment !== "string" ||
    candidate.equipment.length > 120 ||
    typeof candidate.capturePreference !== "string" ||
    candidate.capturePreference.length > 120
  )
    throw new Error("map_preferences_invalid");
  return candidate as SpotRankingPreferences;
}

function parseViewport(input: {
  centerLat?: string;
  centerLng?: string;
  zoom?: string;
}) {
  const values = [input.centerLat, input.centerLng, input.zoom];
  if (
    values.some((value) => value !== undefined) &&
    values.some((value) => value === undefined)
  )
    throw new Error("map_viewport_incomplete");
  if (
    input.centerLat === undefined ||
    input.centerLng === undefined ||
    input.zoom === undefined
  )
    return undefined;
  const viewport = {
    center: {
      latitude: Number(input.centerLat),
      longitude: Number(input.centerLng),
    },
    zoom: Number(input.zoom),
  };
  if (
    !Number.isFinite(viewport.center.latitude) ||
    !Number.isFinite(viewport.center.longitude) ||
    Math.abs(viewport.center.latitude) > 90 ||
    Math.abs(viewport.center.longitude) > 180 ||
    !Number.isFinite(viewport.zoom) ||
    viewport.zoom < 3 ||
    viewport.zoom > 20
  )
    throw new Error("map_viewport_invalid");
  return viewport;
}

function parseLayer(value?: string): MapLayerKind {
  const layer = value ?? "NORMAL";
  if (!["NORMAL", "LIGHT_POLLUTION", "CLOUD", "OPPORTUNITY"].includes(layer))
    throw new Error("map_layer_invalid");
  return layer as MapLayerKind;
}

function parseCloudLayer(
  value?: string,
): ObservationContext["weatherView"]["cloudLayer"] {
  const layer = value ?? "TOTAL";
  if (!["TOTAL", "LOW", "MID", "HIGH"].includes(layer))
    throw new Error("cloud_layer_invalid");
  return layer as ObservationContext["weatherView"]["cloudLayer"];
}

@Controller("v2")
export class MiniappController {
  constructor(
    @Inject(MiniappService) private readonly service: MiniappService,
  ) {}

  @Get("capabilities")
  capabilities() {
    return this.service.getCapabilities();
  }

  @Post("auth/wechat/login")
  login(@Body() body: WechatLoginRequest) {
    return this.service.login(body);
  }

  @Post("observation-contexts/resolve")
  resolveContext(@Body() body: ObservationContextResolveRequest) {
    return this.service.resolveObservationContext(body);
  }

  @Get("observation-contexts/:contextId")
  getContext(@Param("contextId") contextId: string) {
    return this.service.getObservationContext(decodeURIComponent(contextId));
  }

  @Put("observation-contexts/:contextId")
  updateContext(
    @Param("contextId") contextId: string,
    @Body() body: ObservationContextUpdateRequest,
  ) {
    return this.service.updateObservationContext(
      decodeURIComponent(contextId),
      body,
    );
  }

  @Get("map/scene")
  async mapScene(
    @Query("contextId") contextId?: string,
    @Query("filters") filters?: string,
    @Query("q") query?: string,
    @Query("layer") layer?: string,
    @Query("cloudLayer") cloudLayer?: string,
    @Query("centerLat") centerLat?: string,
    @Query("centerLng") centerLng?: string,
    @Query("zoom") zoom?: string,
    @Query("preferences") preferences?: string,
    @Headers("authorization") authorization?: string,
  ) {
    const userId = await this.service.auth.optionalPrincipal(authorization);
    const parsedFilters = parseFilters(filters);
    const parsedPreferences = parsePreferences(preferences);
    const viewport = parseViewport({
      ...(centerLat === undefined ? {} : { centerLat }),
      ...(centerLng === undefined ? {} : { centerLng }),
      ...(zoom === undefined ? {} : { zoom }),
    });
    return this.service.getMapScene({
      contextId: required(contextId, "observation_context_required"),
      layer: parseLayer(layer),
      cloudLayer: parseCloudLayer(cloudLayer),
      ...(parsedFilters ? { filters: parsedFilters } : {}),
      ...(query ? { query } : {}),
      ...(viewport ? { viewport } : {}),
      ...(parsedPreferences ? { preferences: parsedPreferences } : {}),
      ...(userId ? { userId } : {}),
    });
  }

  @Get("places/search")
  search(@Query("q") query = "", @Query("region") region = "") {
    return this.service.search(query, [], region);
  }

  @Post("routes/estimate")
  estimateRoute(@Body() body: RouteEstimateRequest) {
    if (
      typeof body?.contextId !== "string" ||
      !body.contextId.trim() ||
      typeof body?.spotId !== "string" ||
      !body.spotId.startsWith("spot:") ||
      (body.travelMode !== undefined &&
        !["DRIVING", "TRANSIT", "WALKING"].includes(body.travelMode)) ||
      (body.departureLocalDate !== undefined &&
        !/^\d{4}-\d{2}-\d{2}$/u.test(body.departureLocalDate)) ||
      (body.departureLocalTime !== undefined &&
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(body.departureLocalTime))
    )
      throw new Error("route_estimate_input_invalid");
    return this.service.estimateRoute(body);
  }

  @Get("astronomical-events")
  astronomicalEvents() {
    return this.service.getAstronomicalEvents();
  }

  @Get("astronomical-events/:occurrenceId")
  astronomicalEvent(
    @Param("occurrenceId") occurrenceId: string,
    @Query("contextId") contextId?: string,
  ) {
    return this.service.getAstronomicalEvent(
      decodeURIComponent(occurrenceId),
      contextId ? decodeURIComponent(contextId) : undefined,
    );
  }

  @Get("spots/:spotId/overview")
  overview(
    @Param("spotId") spotId: string,
    @Query("contextId") contextId?: string,
  ) {
    return this.service.getSpotOverview(
      decodeURIComponent(spotId),
      required(contextId, "observation_context_required"),
    );
  }

  @Get("spots/:spotId/guides")
  guides(@Param("spotId") spotId: string) {
    return this.service.getSpotGuides(decodeURIComponent(spotId));
  }

  @Get("spots/:spotId/field")
  field(@Param("spotId") spotId: string) {
    return this.service.getSpotSite(decodeURIComponent(spotId));
  }

  @Get("spots/:spotId/media/:uploadId")
  spotContributionMedia(
    @Param("spotId") spotId: string,
    @Param("uploadId") uploadId: string,
  ) {
    if (!uploadId.startsWith("upload:")) throw new Error("contribution_upload_not_found");
    return this.service.getSpotContributionMedia(
      decodeURIComponent(spotId) as SpotId,
      decodeURIComponent(uploadId) as ContributionUploadId,
    );
  }

  @Get("spots/:spotId/contribution-baseline")
  contributionBaseline(@Param("spotId") spotId: string) {
    return this.service.getContributionFormalBaseline(decodeURIComponent(spotId));
  }

  @Get("spots/:spotId/sky")
  sky(
    @Param("spotId") spotId: string,
    @Query("contextId") contextId?: string,
    @Headers("authorization") authorization?: string,
  ) {
    const locationId = decodeURIComponent(spotId);
    if (locationId.startsWith("contribution:")) {
      return this.service.auth.requirePrincipal(authorization).then((userId) => this.service.getSky(
        locationId,
        required(contextId, "observation_context_required"),
        userId,
      ));
    }
    return this.service.getSky(locationId, required(contextId, "observation_context_required"));
  }

  @Get("celestial-objects/:reference")
  celestialObject(
    @Param("reference") reference: string,
    @Query("locale") locale = "zh-CN",
  ) {
    return this.service.getCelestialObject(decodeURIComponent(reference), locale);
  }

  @Get("celestial-objects/:reference/image")
  async celestialObjectImage(
    @Param("reference") reference: string,
    @Query("level") level = "MEDIUM",
    @Res() reply: FastifyReply,
  ) {
    const image = await this.service.getDeepSkyImage(decodeURIComponent(reference), level);
    reply
      .header("content-type", image.contentType)
      .header("cache-control", "public, max-age=86400")
      .header("x-content-type-options", "nosniff")
      .header("x-starward-image-source", image.sourceLabel)
      .header("x-starward-image-field-degrees", String(image.fieldDegrees))
      .send(image.bytes);
  }

  @Get("me/favorites")
  async favorites(@Headers("authorization") authorization?: string) {
    return this.service.getFavorites(
      await this.service.auth.requirePrincipal(authorization),
    );
  }

  @Put("me/favorites/FORMAL_SPOT/:spotId")
  async favorite(
    @Param("spotId") spotId: string,
    @Body() body: { favorite: boolean },
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.setFavorite(
      await this.service.auth.requirePrincipal(authorization),
      decodeURIComponent(spotId),
      body.favorite,
      idempotencyKey,
    );
  }

  @Get("me/library")
  async library(@Headers("authorization") authorization?: string) {
    return this.service.getUserLibrary(
      await this.service.auth.requirePrincipal(authorization),
    );
  }

  @Get("me/profile")
  async accountProfile(@Headers("authorization") authorization?: string) {
    return this.service.getAccountProfile(await this.service.auth.requirePrincipal(authorization));
  }

  @Put("me/profile/nickname")
  async accountNickname(@Body() body: AccountNicknameSaveRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "") {
    return this.service.saveAccountNickname(await this.service.auth.requirePrincipal(authorization), body, idempotencyKey);
  }

  @Get("me/profile/avatar")
  async accountAvatar(@Headers("authorization") authorization?: string) {
    return this.service.getAccountAvatar(await this.service.auth.requirePrincipal(authorization));
  }

  @Put("me/profile/avatar")
  async saveAccountAvatar(@Body() body: AccountAvatarSaveRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "") {
    return this.service.saveAccountAvatar(await this.service.auth.requirePrincipal(authorization), body, idempotencyKey);
  }

  @Get("me/preferences")
  async preferences(@Headers("authorization") authorization?: string) {
    return this.service.getPreferences(
      await this.service.auth.requirePrincipal(authorization),
    );
  }

  @Put("me/preferences")
  async savePreferences(
    @Body()
    body: { preferences: UserPreferences; expectedRevision: number },
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.savePreferences(
      await this.service.auth.requirePrincipal(authorization),
      body,
      idempotencyKey,
    );
  }

  @Get("me/data-export")
  async accountDataExport(
    @Headers("authorization") authorization?: string,
    @Headers("x-wechat-reauth-code") reauthenticationCode?: string,
  ) {
    return this.service.exportAccountData(
      await this.service.auth.requireReauthenticatedPrincipal(authorization, reauthenticationCode),
    );
  }

  @Delete("me/account")
  async deleteAccount(
    @Body() body: { confirmation: "DELETE_ACCOUNT" },
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
    @Headers("x-wechat-reauth-code") reauthenticationCode?: string,
  ) {
    return this.service.deleteAccount(
      await this.service.auth.requireReauthenticatedPrincipal(authorization, reauthenticationCode),
      body,
      idempotencyKey,
    );
  }

  @Get("me/observation-plans")
  async plans(@Headers("authorization") authorization?: string) {
    return this.service.getPlans(
      await this.service.auth.requirePrincipal(authorization),
    );
  }

  @Put("me/observation-plans/:planId")
  async plan(
    @Param("planId") planId: string,
    @Body()
    body: PlanSaveRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.savePlan(
      await this.service.auth.requirePrincipal(authorization),
      {
        ...body,
        planId: decodeURIComponent(planId) as ObservationPlan["planId"],
      },
      idempotencyKey,
    );
  }

  @Put("me/observation-plans/:planId/checklist-completion")
  async planChecklistCompletion(
    @Param("planId") planId: string,
    @Body() body: import("@starward/miniapp-contracts").PlanChecklistCompletionRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.setPlanChecklistCompletion(
      await this.service.auth.requirePrincipal(authorization), decodeURIComponent(planId), body, idempotencyKey,
    );
  }

  @Delete("me/observation-plans/:planId")
  async deletePlan(
    @Param("planId") planId: string,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.deletePlan(
      await this.service.auth.requirePrincipal(authorization),
      decodeURIComponent(planId),
      idempotencyKey,
    );
  }

  @Get("me/contributions")
  async contributions(@Headers("authorization") authorization?: string) {
    return this.service.listContributions(
      await this.service.auth.requirePrincipal(authorization),
    );
  }

  @Post("me/formal-contributions/submit")
  async submitFormalContribution(
    @Body() body: ContributionFormalSubmitRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.submitFormalContribution(
      await this.service.auth.requirePrincipal(authorization),
      body,
      idempotencyKey,
    );
  }

  @Get("me/contributions/:submissionId/media/:uploadId")
  async contributionMedia(
    @Param("submissionId") submissionId: string,
    @Param("uploadId") uploadId: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.service.getContributionMedia(
      await this.service.auth.requirePrincipal(authorization),
      decodeURIComponent(submissionId) as ContributionId,
      decodeURIComponent(uploadId) as ContributionUploadId,
    );
  }

  @Post("me/formal-contribution-upload-intents")
  async createFormalUploadIntent(@Body() body: ContributionFormalUploadIntentRequest, @Headers("authorization") authorization?: string, @Headers("idempotency-key") idempotencyKey = "") {
    return this.service.createFormalUploadIntent(await this.service.auth.requirePrincipal(authorization), body, idempotencyKey);
  }

  @Post("me/formal-contribution-upload-intents/:intentId/uploads")
  async createFormalUpload(@Param("intentId") intentId: string, @Body() body: ContributionFormalUploadSessionRequest, @Headers("authorization") authorization?: string, @Headers("idempotency-key") idempotencyKey = "") {
    return this.service.createFormalUpload(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(intentId), body, idempotencyKey);
  }

  @Put("me/formal-contribution-upload-intents/:intentId/uploads/:uploadId")
  async completeFormalUpload(@Param("intentId") intentId: string, @Param("uploadId") uploadId: ContributionUploadId, @Body() body: ContributionFormalUploadCompleteRequest, @Headers("authorization") authorization?: string, @Headers("idempotency-key") idempotencyKey = "") {
    return this.service.completeFormalUpload(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(intentId), decodeURIComponent(uploadId) as ContributionUploadId, body, idempotencyKey);
  }

  @Delete("me/formal-contribution-upload-intents/:intentId/uploads/:uploadId")
  async removeFormalUpload(@Param("intentId") intentId: string, @Param("uploadId") uploadId: ContributionUploadId, @Body() body: ContributionFormalUploadRemoveRequest, @Headers("authorization") authorization?: string, @Headers("idempotency-key") idempotencyKey = "") {
    return this.service.removeFormalUpload(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(intentId), decodeURIComponent(uploadId) as ContributionUploadId, body.expectedRevision, idempotencyKey);
  }

  @Post("me/contributions")
  async createContribution(
    @Body() body: ContributionDraftRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.createContributionDraft(
      await this.service.auth.requirePrincipal(authorization),
      body,
      idempotencyKey,
    );
  }

  @Put("me/contributions/:submissionId")
  async updateContribution(
    @Param("submissionId") submissionId: string,
    @Body() body: ContributionUpdateRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.updateContributionDraft(
      await this.service.auth.requirePrincipal(authorization),
      decodeURIComponent(submissionId) as ContributionId,
      body,
      idempotencyKey,
    );
  }

  @Post("me/contributions/:submissionId/media-uploads")
  async createContributionUpload(
    @Param("submissionId") submissionId: string,
    @Body() body: ContributionUploadSessionRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.createContributionUpload(
      await this.service.auth.requirePrincipal(authorization),
      decodeURIComponent(submissionId) as ContributionId,
      body,
      idempotencyKey,
    );
  }

  @Delete("me/contributions/:submissionId/media-uploads/:uploadId")
  async removeContributionUpload(
    @Param("submissionId") submissionId: string,
    @Param("uploadId") uploadId: string,
    @Body() body: ContributionUploadRemoveRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.removeContributionUpload(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(submissionId) as ContributionId, decodeURIComponent(uploadId) as ContributionUploadId, body.expectedRevision, idempotencyKey);
  }

  @Put("me/contributions/:submissionId/media-uploads/:uploadId")
  async completeContributionUpload(
    @Param("submissionId") submissionId: string,
    @Param("uploadId") uploadId: string,
    @Body() body: ContributionUploadCompleteRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.completeContributionUpload(
      await this.service.auth.requirePrincipal(authorization),
      decodeURIComponent(submissionId) as ContributionId,
      decodeURIComponent(uploadId) as ContributionUploadId,
      body,
      idempotencyKey,
    );
  }

  @Post("me/contributions/:submissionId/submit")
  async submitContribution(
    @Param("submissionId") submissionId: string,
    @Body() body: ContributionSubmitRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.submitContribution(
      await this.service.auth.requirePrincipal(authorization),
      decodeURIComponent(submissionId) as ContributionId,
      body.expectedRevision,
      idempotencyKey,
    );
  }

  @Get("me/profile-links")
  async links(@Headers("authorization") authorization?: string) {
    return this.service.listProfileLinks(
      await this.service.auth.requirePrincipal(authorization),
    );
  }

  @Post("me/profile-links")
  async saveLink(
    @Body()
    body: {
      profileLinkId?: string;
      platform: PlatformKind;
      displayName: string;
      url: string;
      visibility: "PRIVATE" | "PUBLIC";
      sortOrder: number;
    },
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.saveProfileLink(
      await this.service.auth.requirePrincipal(authorization),
      body,
      idempotencyKey,
    );
  }

  @Delete("me/profile-links/:profileLinkId")
  async deleteLink(
    @Param("profileLinkId") profileLinkId: string,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.deleteProfileLink(
      await this.service.auth.requirePrincipal(authorization),
      decodeURIComponent(profileLinkId),
      idempotencyKey,
    );
  }

  @Post("me/imports")
  async createImport(
    @Body()
    body: {
      platform: PlatformKind;
      originalUrl: string;
      rightsConfirmed: boolean;
    },
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.createImportDraft(
      await this.service.auth.requirePrincipal(authorization),
      body,
      idempotencyKey,
    );
  }

  @Get("me/imports")
  async listImports(@Headers("authorization") authorization?: string) {
    return this.service.listImportDrafts(
      await this.service.auth.requirePrincipal(authorization),
    );
  }

  @Get("me/imports/:importId")
  async getImport(
    @Param("importId") importId: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.service.getImportDraft(
      await this.service.auth.requirePrincipal(authorization),
      decodeURIComponent(importId),
    );
  }

  @Put("me/imports/:importId")
  async updateImport(
    @Param("importId") importId: string,
    @Body()
    body: {
      expectedRevision: number;
      rightsConfirmed?: boolean;
      stage?: ImportStage;
      title?: string;
      body?: string;
      sourceNote?: string;
      visibility?: "PRIVATE" | "PUBLIC";
      spotId?: string | null;
      createProposal?: boolean;
    },
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.updateImportDraft(
      await this.service.auth.requirePrincipal(authorization),
      decodeURIComponent(importId),
      body,
      idempotencyKey,
    );
  }

  @Get("operations")
  async operations(@Headers("authorization") authorization?: string) {
    await this.service.auth.requirePrincipal(authorization);
    return this.service.operationsSnapshot();
  }
}
