import type { AccountAvatarSaveRequest, AccountNicknameSaveRequest } from "@starward/miniapp-contracts";
import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { celestialObjectPosition } from "./celestial-object-position.ts";
import {
  assertFilterState,
  DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION,
  type DeepSkyImageSelection,
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
  type TerrainOverlayRequest,
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
import { skyPublicAssetHeaders } from "./sky-public-asset-headers.ts";

function required(value: string | undefined, code: string) {
  if (!value?.trim()) throw new Error(code);
  return value.trim();
}

function deepSkyImageSelection(imageVersion?: string, publicationHash?: string): DeepSkyImageSelection {
  if (imageVersion !== undefined && imageVersion !== DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION)
    throw new BadRequestException("deep_sky_image_version_invalid");
  if (publicationHash !== undefined && !/^[a-f0-9]{64}$/u.test(publicationHash))
    throw new BadRequestException("deep_sky_image_publication_hash_invalid");
  return { ...(imageVersion !== undefined ? { imageVersion } : {}), ...(publicationHash !== undefined ? { publicationHash } : {}) };
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

  @Get("terrain/overlay")
  terrainOverlay(
    @Query("purpose") purpose?: string,
    @Query("centerLat") centerLat?: string,
    @Query("centerLng") centerLng?: string,
    @Query("radiusKm") radiusKm?: string,
  ) {
    const latitude = Number(centerLat);
    const longitude = Number(centerLng);
    const radius = Number(radiusKm);
    if ((purpose !== "MAP" && purpose !== "SPOT") || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(radius) || radius < 2 || radius > 50)
      throw new Error("terrain_overlay_request_invalid");
    const request: TerrainOverlayRequest = { purpose, center: { system: "GCJ02", latitude, longitude }, radiusKm: radius };
    return this.service.getTerrainOverlay(request);
  }

  @Get("terrain/assets/:file")
  async terrainAsset(@Param("file") file: string, @Res() reply: FastifyReply) {
    const asset = await this.service.getTerrainAsset(decodeURIComponent(file));
    reply.header("content-type", "image/png")
      .header("cache-control", "public, max-age=604800, immutable")
      .header("x-content-type-options", "nosniff")
      .header("x-starward-terrain-publication", asset.publicationId)
      .send(asset.bytes);
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

  @Get("spots/:spotId/recent-weather")
  recentWeather(@Param("spotId") spotId: string, @Res({ passthrough: true }) reply: FastifyReply) {
    reply.header("Cache-Control", "no-store");
    return this.service.getSpotRecentWeather(decodeURIComponent(spotId));
  }

  @Get("spots/:spotId/air-quality")
  airQuality(@Param("spotId") spotId: string) {
    return this.service.getSpotAirQuality(decodeURIComponent(spotId));
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

  @Get("spots/:spotId/media/:uploadId/image")
  async spotContributionImage(@Param("spotId") spotId: string, @Param("uploadId") uploadId: string,
    @Res() reply: FastifyReply) {
    if (!uploadId.startsWith("upload:")) throw new Error("contribution_upload_not_found");
    const image = await this.service.getSpotContributionImage(decodeURIComponent(spotId) as SpotId,
      decodeURIComponent(uploadId) as ContributionUploadId);
    return reply.header("content-type", image.mimeType).header("cache-control", "no-store")
      .header("x-content-type-options", "nosniff").send(Buffer.from(image.bytes));
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
    @Query("catalogVersion") catalogVersion?: string,
  ) {
    if (catalogVersion !== undefined && catalogVersion !== "bsc5p-bright-stars.v2" &&
        catalogVersion !== "bsc5p-bright-stars.v3") throw new BadRequestException("sky_catalog_version_invalid");
    const selectedCatalog = catalogVersion ?? "bsc5p-bright-stars.v2";
    const locationId = decodeURIComponent(spotId);
    if (locationId.startsWith("contribution:")) {
      return this.service.auth.requirePrincipal(authorization).then((userId) => this.service.getSky(
        locationId,
        required(contextId, "observation_context_required"),
        userId,
        selectedCatalog,
      ));
    }
    return this.service.getSky(locationId, required(contextId, "observation_context_required"), undefined, selectedCatalog);
  }

  @Get("spots/:spotId/sky/targets")
  skyTargets(
    @Param("spotId") spotId: string,
    @Query("contextId") contextId?: string,
    @Query("at") at?: string,
    @Headers("authorization") authorization?: string,
  ) {
    const locationId = decodeURIComponent(spotId);
    if (locationId.startsWith("contribution:"))
      return this.service.auth.requirePrincipal(authorization).then(userId =>
        this.service.getSkyTargetInstant(locationId, required(contextId, "observation_context_required"),
          required(at, "observation_time_required"), userId));
    return this.service.getSkyTargetInstant(locationId, required(contextId, "observation_context_required"),
      required(at, "observation_time_required"));
  }

  @Get("spots/:spotId/sky/objects/:reference")
  async celestialPosition(
    @Param("spotId") spotId: string,
    @Param("reference") reference: string,
    @Query("contextId") contextId?: string,
    @Query("at") at?: string,
    @Headers("authorization") authorization?: string,
    @Query("catalogVersion") catalogVersion?: string,
  ) {
    const report = await this.sky(spotId, contextId, authorization, catalogVersion);
    return celestialObjectPosition(decodeURIComponent(reference), required(at, "observation_time_required"), report);
  }

  @Get("celestial-objects")
  celestialSearch(@Query("q") query = "", @Query("limit") limit = "20", @Query("catalogVersion") catalogVersion?: string,
    @Query("luminaryCatalogVersion") luminaryCatalogVersion?: string) {
    if (catalogVersion !== undefined && catalogVersion !== "bsc5p-bright-stars.v2" && catalogVersion !== "bsc5p-bright-stars.v3")
      throw new BadRequestException("sky_catalog_version_invalid");
    return this.service.celestialSearch.search(query, Number(limit), catalogVersion ?? "bsc5p-bright-stars.v2", luminaryCatalogVersion);
  }
  @Get("celestial-objects/:reference")
  celestialObject(
    @Param("reference") reference: string,
    @Query("locale") locale = "zh-CN",
    @Query("catalogVersion") catalogVersion?: string,
    @Query("moonTextureVersion") moonTextureVersion?: string,
    @Query("deepSkyImageVersion") deepSkyImageVersion?: string,
    @Query("deepSkyPublicationHash") deepSkyPublicationHash?: string,
    @Query("opticalPublicationHash") opticalPublicationHash?: string,
  ) {
    if (catalogVersion !== undefined && catalogVersion !== "bsc5p-bright-stars.v2" && catalogVersion !== "bsc5p-bright-stars.v3")
      throw new BadRequestException("sky_catalog_version_invalid");
    if(moonTextureVersion!==undefined&&moonTextureVersion!=="coverage-v2")
      throw new BadRequestException("moon_texture_version_invalid");
    if (opticalPublicationHash !== undefined && (!decodeURIComponent(reference).startsWith("M:") ||
      !/^[a-f0-9]{64}$/u.test(opticalPublicationHash)))
      throw new BadRequestException("sdss_optical_publication_hash_invalid");
    return this.service.getCelestialObject(decodeURIComponent(reference), locale, catalogVersion ?? "bsc5p-bright-stars.v2",moonTextureVersion,
      deepSkyImageSelection(deepSkyImageVersion, deepSkyPublicationHash), opticalPublicationHash);
  }

  @Get("sky/deep-sky/:publicationHash/manifest")
  deepSkyManifest(@Param("publicationHash") publicationHash: string, @Res() reply: FastifyReply) {
    return reply.header("content-type", "application/json; charset=utf-8")
      .header("content-disposition", 'attachment; filename="allwise-w3-manifest.json"')
      .header("cache-control", "public, max-age=31536000, immutable")
      .header("x-content-type-options", "nosniff")
      .send(this.service.deepSkyImages.manifest(publicationHash));
  }

  @Get("sky/deep-sky/selected/:reference")
  deepSkyImageDiscovery(@Param("reference") reference: string, @Query("imageVersion") imageVersion: string | undefined,
    @Res() reply: FastifyReply) {
    deepSkyImageSelection(imageVersion);
    return reply.header("content-type", "application/json; charset=utf-8")
      .header("cache-control", "no-cache")
      .header("x-content-type-options", "nosniff")
      .send(this.service.deepSkyImages.discovery(reference));
  }

  @Get("sky/deep-sky/:publicationHash/:directory/:file")
  async deepSkyImmutableImage(@Param("publicationHash") publicationHash: string, @Param("directory") directory: string,
    @Param("file") file: string, @Res() reply: FastifyReply) {
    const image = await this.service.deepSkyImages.getByFile(publicationHash, `${directory}/${file}`);
    const headers = skyPublicAssetHeaders("deep-sky", image.contentType, image.fieldDegrees, image);
    for (const [name, value] of Object.entries(headers)) reply.header(name, value);
    return reply.send(image.bytes);
  }

  @Get("sky/sdss-optical/manifest")
  sdssOpticalCurrentManifest(@Query("reference") reference: string | undefined, @Res() reply: FastifyReply) {
    return reply.header("content-type", "application/json; charset=utf-8")
      .header("cache-control", "no-cache")
      .header("x-content-type-options", "nosniff")
      .send(this.service.sdssOpticalImages.currentManifest(reference));
  }

  @Get("sky/sdss-optical/:publicationHash/manifest")
  sdssOpticalManifest(@Param("publicationHash") publicationHash: string, @Res() reply: FastifyReply) {
    const manifest = this.service.sdssOpticalImages.manifest(publicationHash);
    return reply.header("content-type", "application/json; charset=utf-8")
      .header("content-disposition", `attachment; filename="sdss-${manifest.objectRef.replace(":", "").toLowerCase()}-optical-manifest.json"`)
      .header("cache-control", "public, max-age=31536000, immutable")
      .header("x-content-type-options", "nosniff")
      .send(manifest);
  }

  @Get("sky/sdss-optical/:publicationHash/:file")
  async sdssOpticalImage(@Param("publicationHash") publicationHash: string,
    @Param("file") file: string, @Res() reply: FastifyReply) {
    const image = await this.service.sdssOpticalImages.getByFile(publicationHash, file);
    return reply.headers(skyPublicAssetHeaders("sdss-optical", image.contentType, image.fieldDegrees)).send(image.bytes);
  }

  /** Each profile keeps its own immutable content admission; this route has no
   * current/discovery alias and an empty default publication owner. */
  @Get("sky/prepared-optical/:publicationHash/manifest")
  preparedOpticalManifest(@Param("publicationHash") publicationHash: string, @Res() reply: FastifyReply) {
    const manifest = this.service.preparedOpticalImages.manifest(publicationHash);
    return reply.header("content-type", "application/json; charset=utf-8")
      .header("content-disposition", `attachment; filename="${manifest.objectRef.replace(":", "-")}-prepared-optical-manifest.json"`)
      .header("cache-control", "public, max-age=31536000, immutable")
      .header("x-content-type-options", "nosniff").send(manifest);
  }

  @Get("sky/prepared-optical/:publicationHash/:file")
  async preparedOpticalImage(@Param("publicationHash") publicationHash: string,
    @Param("file") file: string, @Res() reply: FastifyReply) {
    const image = await this.service.preparedOpticalImages.getByFile(publicationHash, file);
    return reply.headers(skyPublicAssetHeaders("prepared-optical", image.contentType, image.fieldDegrees)).send(image.bytes);
  }

  @Get("sky/wide-field/manifest")
  wideFieldManifest(@Res() reply:FastifyReply){
    return reply.header("content-type","application/json; charset=utf-8")
      .header("cache-control","no-cache")
      .header("x-content-type-options","nosniff")
      .send(this.service.wideFieldW3.manifest());
  }

  @Get("sky/moon/manifest")
  moonTextureManifest(@Res() reply:FastifyReply){
    return reply.header("content-type","application/json; charset=utf-8")
      .header("cache-control","no-cache")
      .header("x-content-type-options","nosniff")
      .send(this.service.moonTexture.manifest());
  }

  @Get("sky/moon/coverage/manifest")
  moonCoverageManifest(@Res() reply:FastifyReply){
    return reply.header("content-type","application/json; charset=utf-8")
      .header("cache-control","no-cache").header("x-content-type-options","nosniff")
      .send(this.service.moonTexture.coverageManifest());
  }

  @Get("sky/moon/coverage/:publicationHash/:file")
  async moonCoverageImage(@Param("publicationHash") publicationHash:string,@Param("file") file:string,
    @Res() reply:FastifyReply){
    const manifest=this.service.moonTexture.coverageManifest();
    if(file!==manifest.image.file)throw new NotFoundException("moon_texture_image_unavailable");
    const bytes=await this.service.moonTexture.coverageImage(publicationHash);
    return reply.headers(skyPublicAssetHeaders("moon", "image/png")).send(bytes);
  }

  @Get("sky/moon/:publicationHash/:file")
  async moonTextureImage(@Param("publicationHash") publicationHash:string,@Param("file") file:string,
    @Res() reply:FastifyReply){
    if(file!=="clementine-uv750-v2-wms-2048x1024.jpg")throw new NotFoundException("moon_texture_image_unavailable");
    const bytes=await this.service.moonTexture.image(publicationHash);
    return reply.headers(skyPublicAssetHeaders("moon", "image/jpeg")).send(bytes);
  }

  @Get("sky/mars/manifest")
  marsTextureManifest(@Res() reply:FastifyReply){
    return reply.header("content-type","application/json; charset=utf-8")
      .header("cache-control","no-cache")
      .header("x-content-type-options","nosniff")
      .send(this.service.marsTexture.manifest());
  }

  @Get("sky/mercury/manifest")
  mercuryTextureManifest(@Res() reply:FastifyReply){
    return reply.header("content-type","application/json; charset=utf-8")
      .header("cache-control","no-cache")
      .header("x-content-type-options","nosniff")
      .send(this.service.mercuryTexture.manifest());
  }

  @Get("sky/jupiter/manifest")
  jupiterBandsManifest(@Res() reply:FastifyReply){
    return reply.header("content-type","application/json; charset=utf-8")
      .header("cache-control","no-cache")
      .header("x-content-type-options","nosniff")
      .send(this.service.jupiterBands.manifest());
  }

  @Get("sky/saturn/manifest")
  saturnBandsManifest(@Res() reply:FastifyReply){
    return reply.header("content-type","application/json; charset=utf-8")
      .header("cache-control","no-cache")
      .header("x-content-type-options","nosniff")
      .send(this.service.saturnBands.manifest());
  }

  @Get("sky/uranus/manifest")
  uranusBandsManifest(@Res() reply:FastifyReply){
    return reply.header("content-type","application/json; charset=utf-8")
      .header("cache-control","no-cache")
      .header("x-content-type-options","nosniff")
      .send(this.service.uranusBands.manifest());
  }

  @Get("sky/uranus/:publicationHash/:file")
  async uranusBandsImage(@Param("publicationHash") publicationHash:string,@Param("file") file:string,
    @Res() reply:FastifyReply){
    if(file!=="uranus-opal-2025a-median-bands-8x512.png")
      throw new NotFoundException("uranus_bands_image_unavailable");
    const bytes=await this.service.uranusBands.image(publicationHash);
    return reply.headers(skyPublicAssetHeaders("uranus", "image/png")).send(bytes);
  }

  @Get("sky/neptune/manifest")
  neptuneBandsManifest(@Res() reply:FastifyReply){
    return reply.header("content-type","application/json; charset=utf-8")
      .header("cache-control","no-cache")
      .header("x-content-type-options","nosniff")
      .send(this.service.neptuneBands.manifest());
  }

  @Get("sky/neptune/:publicationHash/:file")
  async neptuneBandsImage(@Param("publicationHash") publicationHash:string,@Param("file") file:string,
    @Res() reply:FastifyReply){
    if(file!=="neptune-opal-2025b-median-bands-8x512.png")
      throw new NotFoundException("neptune_bands_image_unavailable");
    const bytes=await this.service.neptuneBands.image(publicationHash);
    return reply.headers(skyPublicAssetHeaders("neptune", "image/png")).send(bytes);
  }

  @Get("sky/landscape/manifest")
  skyLandscapeManifest(@Res() reply: FastifyReply) {
    return reply.header("content-type", "application/json; charset=utf-8")
      .header("cache-control", "no-cache").header("x-content-type-options", "nosniff")
      .send(this.service.landscape.manifest());
  }

  @Get("sky/landscape/:publicationHash/:file")
  async skyLandscapeAsset(@Param("publicationHash") publicationHash: string, @Param("file") file: string,
    @Res() reply: FastifyReply) {
    const asset = await this.service.landscape.asset(publicationHash, file);
    return reply.headers(skyPublicAssetHeaders("landscape", asset.contentType)).send(asset.bytes);
  }

  @Get("sky/galactic/manifest")
  galacticImageManifest(@Res() reply:FastifyReply){
    return reply.header("content-type","application/json; charset=utf-8")
      .header("cache-control","no-cache")
      .header("x-content-type-options","nosniff")
      .send(this.service.galacticImage.manifest());
  }

  @Get("sky/galactic/:publicationHash/:file")
  async galacticImage(@Param("publicationHash") publicationHash:string,@Param("file") file:string,
    @Res() reply:FastifyReply){
    if(file!=="2mass-galactic-2048x1024.jpg")throw new NotFoundException("galactic_image_unavailable");
    const bytes=await this.service.galacticImage.image(publicationHash);
    return reply.headers(skyPublicAssetHeaders("galactic", "image/jpeg")).send(bytes);
  }

  @Get("sky/mars/:publicationHash/:file")
  async marsTextureImage(@Param("publicationHash") publicationHash:string,@Param("file") file:string,
    @Res() reply:FastifyReply){
    if(file!=="mars-mdim21-color-usgs-wms-1024x512.jpg")throw new NotFoundException("mars_texture_image_unavailable");
    const bytes=await this.service.marsTexture.image(publicationHash);
    return reply.headers(skyPublicAssetHeaders("mars", "image/jpeg")).send(bytes);
  }

  @Get("sky/mercury/:publicationHash/:file")
  async mercuryTextureImage(@Param("publicationHash") publicationHash:string,@Param("file") file:string,
    @Res() reply:FastifyReply){
    if(file!=="mercury-messenger-2013-usgs-wms-1024x512.jpg")throw new NotFoundException("mercury_texture_image_unavailable");
    const bytes=await this.service.mercuryTexture.image(publicationHash);
    return reply.headers(skyPublicAssetHeaders("mercury", "image/jpeg")).send(bytes);
  }

  @Get("sky/jupiter/:publicationHash/:file")
  async jupiterBandsImage(@Param("publicationHash") publicationHash:string,@Param("file") file:string,
    @Res() reply:FastifyReply){
    if(file!=="jupiter-opal-2024c-median-bands-8x512.png")
      throw new NotFoundException("jupiter_bands_image_unavailable");
    const bytes=await this.service.jupiterBands.image(publicationHash);
    return reply.headers(skyPublicAssetHeaders("jupiter", "image/png")).send(bytes);
  }

  @Get("sky/saturn/:publicationHash/:file")
  async saturnBandsImage(@Param("publicationHash") publicationHash:string,@Param("file") file:string,
    @Res() reply:FastifyReply){
    if(file!=="saturn-opal-2025a-median-bands-8x512.png")
      throw new NotFoundException("saturn_bands_image_unavailable");
    const bytes=await this.service.saturnBands.image(publicationHash);
    return reply.headers(skyPublicAssetHeaders("saturn", "image/png")).send(bytes);
  }

  @Get("sky/wide-field/:publicationHash/properties")
  async wideFieldProperties(@Param("publicationHash") publicationHash:string,@Res() reply:FastifyReply){
    const properties=await this.service.wideFieldW3.properties(publicationHash);
    return reply.headers(skyPublicAssetHeaders("wide-field-properties", "text/plain; charset=utf-8")).send(properties);
  }

  @Get("sky/wide-field/:publicationHash/Norder0/Dir0/:file")
  async wideFieldTile(@Param("publicationHash") publicationHash:string,@Param("file") file:string,
    @Res() reply:FastifyReply){
    const match=/^Npix(0|[1-9]|1[01])\.jpg$/u.exec(file);
    if(!match)throw new NotFoundException("wide_field_w3_tile_unavailable");
    const bytes=await this.service.wideFieldW3.tile(publicationHash,Number(match[1]));
    return reply.headers(skyPublicAssetHeaders("wide-field", "image/jpeg")).send(bytes);
  }

  @Get("sky/optical/manifest")
  opticalManifest(@Res() reply: FastifyReply) {
    return reply.header("content-type", "application/json; charset=utf-8")
      .header("cache-control", "no-cache")
      .header("x-content-type-options", "nosniff")
      .send(this.service.opticalHips.manifest());
  }

  @Get("sky/optical/:publicationHash/:sourceId/:order/:dir/index")
  async opticalIndex(@Param("publicationHash") publicationHash: string,
    @Param("sourceId") sourceId: string,@Param("order") order: string,@Param("dir") dir: string,
    @Res() reply: FastifyReply) {
    const index=await this.service.opticalHips.index(publicationHash,sourceId,Number(order),Number(dir));
    return reply.header("content-type", "application/json; charset=utf-8")
      .header("cache-control", "public, max-age=31536000, immutable")
      .header("x-content-type-options", "nosniff").send(index);
  }

  @Get("sky/optical/:publicationHash/:sourceId/:order/:pixel")
  async opticalTile(@Param("publicationHash") publicationHash: string,
    @Param("sourceId") sourceId: string,@Param("order") order: string,@Param("pixel") pixel: string,
    @Res() reply: FastifyReply) {
    const tile=await this.service.opticalHips.tile(publicationHash,sourceId,Number(order),Number(pixel));
    return reply.header("content-type",tile.contentType)
      .header("cache-control", "public, max-age=31536000, immutable")
      .header("x-content-type-options", "nosniff")
      .header("x-starward-image-source",tile.sourceId)
      .send(tile.bytes);
  }

  @Get("celestial-objects/:reference/image")
  async celestialObjectImage(
    @Param("reference") reference: string,
    @Query("level") level = "MEDIUM",
    @Query("publicationHash") publicationHash: string | undefined,
    @Query("imageVersion") imageVersion: string | undefined,
    @Res() reply: FastifyReply,
  ) {
    const selection = deepSkyImageSelection(imageVersion, publicationHash);
    const image = await this.service.getDeepSkyImage(decodeURIComponent(reference), level, selection.publicationHash, selection.imageVersion);
    if (image.publicationHash) reply.header("x-starward-image-publication-hash", image.publicationHash);
    if (image.sourceId) reply.header("x-starward-image-source-id", image.sourceId);
    if (image.pixelSize) reply.header("x-starward-image-pixels", String(image.pixelSize));
    if (image.sourceMissingPixels !== undefined) reply.header("x-starward-image-missing-pixels", String(image.sourceMissingPixels));
    if (image.displaySupport) reply.header("x-starward-image-display-support", JSON.stringify(image.displaySupport));
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

  @Post("me/observation-plans/:planId/share")
  async createPlanShare(
    @Param("planId") planId: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.service.createPlanShare(
      await this.service.auth.requirePrincipal(authorization), decodeURIComponent(planId),
    );
  }

  @Get("shares/plans/:token")
  sharedPlan(@Param("token") token: string) {
    return this.service.getSharedPlan(token);
  }

  @Get("shares/spots/:spotId")
  sharedSpot(@Param("spotId") spotId: string) {
    return this.service.getSharedSpot(decodeURIComponent(spotId) as SpotId);
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

  @Post("me/observation-plans/:planId/reminder-subscription")
  async prepareReminderSubscription(
    @Param("planId") planId: string,
    @Body() body: import("@starward/miniapp-contracts").ReminderSubscriptionPrepareRequest,
    @Headers("authorization") authorization?: string,
  ) {
    return this.service.prepareReminderSubscription(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(planId), body);
  }

  @Put("me/reminder-subscriptions/:challengeId")
  async reportReminderSubscription(
    @Param("challengeId") challengeId: string,
    @Body() body: import("@starward/miniapp-contracts").ReminderSubscriptionReportRequest,
    @Headers("authorization") authorization?: string,
  ) {
    return this.service.reportReminderSubscription(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(challengeId), body);
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

  @Delete("me/contributions/:submissionId")
  async withdrawContribution(
    @Param("submissionId") submissionId: string,
    @Body() body: ContributionSubmitRequest,
    @Headers("authorization") authorization?: string,
    @Headers("idempotency-key") idempotencyKey = "",
  ) {
    return this.service.withdrawContributionDraft(
      await this.service.auth.requirePrincipal(authorization),
      decodeURIComponent(submissionId) as ContributionId,
      body.expectedRevision,
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
