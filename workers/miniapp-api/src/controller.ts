import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import type {
  FilterState,
  ImportStage,
  ObservationPlan,
  PlatformKind,
  SpotRankingPreferences,
  UserPreferences,
} from "@starward/miniapp-contracts";
import { assertFilterState } from "@starward/miniapp-contracts";
import { MiniappService } from "./miniapp-service.ts";

@Controller("v1")
export class MiniappController {
  constructor(
    @Inject(MiniappService) private readonly service: MiniappService,
  ) {}

  @Get("capabilities") capabilities() {
    return this.service.getCapabilities();
  }
  @Get("map/scene") mapScene(
    @Query("filters") filters?: string,
    @Query("q") q?: string,
    @Query("centerLat") centerLat?: string,
    @Query("centerLng") centerLng?: string,
    @Query("zoom") zoom?: string,
    @Query("preferences") preferences?: string,
  ) {
    let parsed: FilterState | undefined;
    if (filters) {
      try {
        const candidate: unknown = JSON.parse(filters);
        assertFilterState(candidate);
        parsed = candidate;
      } catch {
        throw new Error("map_filters_invalid");
      }
    }
    const viewportValues = [centerLat, centerLng, zoom];
    if (
      viewportValues.some((value) => value !== undefined) &&
      viewportValues.some((value) => value === undefined)
    )
      throw new Error("map_viewport_incomplete");
    const viewport =
      centerLat !== undefined && centerLng !== undefined && zoom !== undefined
        ? {
            center: {
              latitude: Number(centerLat),
              longitude: Number(centerLng),
            },
            zoom: Number(zoom),
          }
        : undefined;
    if (
      viewport &&
      (!Number.isFinite(viewport.center.latitude) ||
        !Number.isFinite(viewport.center.longitude) ||
        Math.abs(viewport.center.latitude) > 90 ||
        Math.abs(viewport.center.longitude) > 180 ||
        !Number.isFinite(viewport.zoom) ||
        viewport.zoom < 3 ||
        viewport.zoom > 20)
    )
      throw new Error("map_viewport_invalid");
    let parsedPreferences: SpotRankingPreferences | undefined;
    if (preferences) {
      const candidate = JSON.parse(preferences) as Partial<SpotRankingPreferences>;
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
        typeof candidate !== "object" ||
        candidate === null ||
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
      parsedPreferences = candidate as SpotRankingPreferences;
    }
    return this.service.getMapScene({
      ...(parsed ? { filters: parsed } : {}),
      ...(q ? { query: q } : {}),
      ...(viewport ? { viewport } : {}),
      ...(parsedPreferences ? { preferences: parsedPreferences } : {}),
    });
  }
  @Get("search/places") search(@Query("q") q = "") {
    return this.service.search(q);
  }
  @Get("spots/:spotId") spot(@Param("spotId") spotId: string) {
    return this.service.getSpotDetail(decodeURIComponent(spotId));
  }
  @Get("spots/:spotId/overview") overview(@Param("spotId") spotId: string) {
    return this.service.getSpotOverview(decodeURIComponent(spotId));
  }
  @Get("spots/:spotId/guides") guides(@Param("spotId") spotId: string) {
    return this.service.getSpotGuides(decodeURIComponent(spotId));
  }
  @Get("spots/:spotId/site") site(@Param("spotId") spotId: string) {
    return this.service.getSpotSite(decodeURIComponent(spotId));
  }
  @Get("spots/:spotId/sky") sky(
    @Param("spotId") spotId: string,
    @Query("localDate") localDate: string,
    @Query("at") at?: string,
  ) {
    return this.service.getSky({
      spotId: decodeURIComponent(spotId),
      localDate,
      ...(at ? { at } : {}),
    });
  }
  @Get("favorites") favorites() {
    return this.service.getFavorites();
  }
  @Get("library") library() {
    return this.service.getUserLibrary();
  }
  @Get("preferences") preferences() {
    return this.service.getPreferences();
  }
  @Put("preferences") savePreferences(
    @Body()
    body: { preferences: UserPreferences; expectedRevision: number },
    @Headers("idempotency-key") key = "",
  ) {
    return this.service.savePreferences(body, key);
  }
  @Put("favorites/:spotId") favorite(
    @Param("spotId") spotId: string,
    @Body() body: { favorite: boolean },
    @Headers("idempotency-key") key = "",
  ) {
    return this.service.setFavorite(
      decodeURIComponent(spotId),
      body.favorite,
      key,
    );
  }
  @Get("plans") plans() {
    return this.service.getPlans();
  }
  @Put("plans/:planId") plan(
    @Param("planId") planId: string,
    @Body()
    body: Omit<ObservationPlan, "planId" | "revision" | "updatedAt"> & {
      expectedRevision: number | null;
    },
    @Headers("idempotency-key") key = "",
  ) {
    return this.service.savePlan(
      {
        ...body,
        planId: decodeURIComponent(planId) as ObservationPlan["planId"],
      },
      key,
    );
  }
  @Delete("plans/:planId") deletePlan(
    @Param("planId") planId: string,
    @Headers("idempotency-key") key = "",
  ) {
    return this.service.deletePlan(decodeURIComponent(planId), key);
  }
  @Get("profile-links") links() {
    return this.service.listProfileLinks();
  }
  @Post("profile-links") saveLink(
    @Body()
    body: {
      profileLinkId?: string;
      platform: PlatformKind;
      displayName: string;
      url: string;
      visibility: "PRIVATE" | "PUBLIC";
      sortOrder: number;
    },
    @Headers("idempotency-key") key = "",
  ) {
    return this.service.saveProfileLink(body, key);
  }
  @Delete("profile-links/:id") deleteLink(
    @Param("id") id: string,
    @Headers("idempotency-key") key = "",
  ) {
    return this.service.deleteProfileLink(decodeURIComponent(id), key);
  }
  @Post("imports") createImport(
    @Body()
    body: {
      platform: PlatformKind;
      originalUrl: string;
      rightsConfirmed: boolean;
    },
    @Headers("idempotency-key") key = "",
  ) {
    return this.service.createImportDraft(body, key);
  }
  @Get("imports") listImports() {
    return this.service.listImportDrafts();
  }
  @Get("imports/:id") getImport(@Param("id") id: string) {
    return this.service.getImportDraft(decodeURIComponent(id));
  }
  @Put("imports/:id") updateImport(
    @Param("id") id: string,
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
    @Headers("idempotency-key") key = "",
  ) {
    return this.service.updateImportDraft(decodeURIComponent(id), body, key);
  }
  @Get("operations") operations() {
    return this.service.operationsSnapshot();
  }
}
