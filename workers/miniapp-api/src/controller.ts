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
} from "@nestjs/common";
import {
  assertFilterState,
  type ContributionDraftRequest,
  type ContributionId,
  type ContributionSubmitRequest,
  type ContributionUpdateRequest,
  type ContributionUploadCompleteRequest,
  type ContributionUploadId,
  type ContributionUploadSessionRequest,
  type FilterState,
  type ImportStage,
  type MapLayerKind,
  type ObservationContext,
  type ObservationContextResolveRequest,
  type ObservationContextUpdateRequest,
  type ObservationPlan,
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

  @Patch("observation-contexts/:contextId")
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
      !body.spotId.startsWith("spot:")
    )
      throw new Error("route_estimate_input_invalid");
    return this.service.estimateRoute(body);
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

  @Get("spots/:spotId/sky")
  sky(
    @Param("spotId") spotId: string,
    @Query("contextId") contextId?: string,
  ) {
    return this.service.getSky(
      decodeURIComponent(spotId),
      required(contextId, "observation_context_required"),
    );
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
    body: Omit<
      ObservationPlan,
      "planId" | "revision" | "updatedAt" | "contextSnapshot"
    > & {
      expectedRevision: number | null;
    },
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
