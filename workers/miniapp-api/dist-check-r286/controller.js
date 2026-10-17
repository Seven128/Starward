var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { isBodyImageKind, isDeepSkyCatalogVersion, isDeepSkyObjectReference, MINIAPP_API_OPERATIONS } from "@starward/miniapp-contracts";
import { Body, BadRequestException, Controller, Delete, Get, Headers, Inject, NotFoundException, Param, Post, Put, Query, Res, } from "@nestjs/common";
import { celestialObjectPosition } from "./celestial-object-position.js";
import { assertFilterState, DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION, } from "@starward/miniapp-contracts";
import { MiniappService } from "./miniapp-service.js";
import { galacticImagePublicAssetHeaders, galacticImagePublicMetadataHeaders, opticalHipsPublicAssetHeaders, preparedOpticalManifestHeaders, skyPublicAssetHeaders, skySourceManifestHeaders } from "./sky-public-asset-headers.js";
function required(value, code) {
    if (!value?.trim())
        throw new Error(code);
    return value.trim();
}
function deepSkyImageSelection(imageVersion, publicationHash) {
    if (imageVersion !== undefined && imageVersion !== DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION)
        throw new BadRequestException("deep_sky_image_version_invalid");
    if (publicationHash !== undefined && !/^[a-f0-9]{64}$/u.test(publicationHash))
        throw new BadRequestException("deep_sky_image_publication_hash_invalid");
    return { ...(imageVersion !== undefined ? { imageVersion } : {}), ...(publicationHash !== undefined ? { publicationHash } : {}) };
}
function parseJson(value, code) {
    if (!value)
        return undefined;
    try {
        return JSON.parse(value);
    }
    catch {
        throw new Error(code);
    }
}
function parseFilters(value) {
    const parsed = parseJson(value, "map_filters_invalid");
    if (parsed === undefined)
        return undefined;
    try {
        assertFilterState(parsed);
        return parsed;
    }
    catch {
        throw new Error("map_filters_invalid");
    }
}
function parsePreferences(value) {
    const candidate = parseJson(value, "map_preferences_invalid");
    if (candidate === undefined)
        return undefined;
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
    if (typeof candidate.defaultPlace !== "string" ||
        candidate.defaultPlace.length > 80 ||
        !["BEGINNER", "ADVANCED"].includes(candidate.experience ?? "") ||
        !Number.isInteger(candidate.maxDriveMinutes) ||
        (candidate.maxDriveMinutes ?? 0) < 30 ||
        (candidate.maxDriveMinutes ?? 0) > 360 ||
        !Array.isArray(candidate.requiredFacilities) ||
        candidate.requiredFacilities.length > 8 ||
        candidate.requiredFacilities.some((facility) => typeof facility !== "string" || !facilities.has(facility)) ||
        typeof candidate.equipment !== "string" ||
        candidate.equipment.length > 120 ||
        typeof candidate.capturePreference !== "string" ||
        candidate.capturePreference.length > 120)
        throw new Error("map_preferences_invalid");
    return candidate;
}
function parseViewport(input) {
    const values = [input.centerLat, input.centerLng, input.zoom];
    if (values.some((value) => value !== undefined) &&
        values.some((value) => value === undefined))
        throw new Error("map_viewport_incomplete");
    if (input.centerLat === undefined ||
        input.centerLng === undefined ||
        input.zoom === undefined)
        return undefined;
    const viewport = {
        center: {
            latitude: Number(input.centerLat),
            longitude: Number(input.centerLng),
        },
        zoom: Number(input.zoom),
    };
    if (!Number.isFinite(viewport.center.latitude) ||
        !Number.isFinite(viewport.center.longitude) ||
        Math.abs(viewport.center.latitude) > 90 ||
        Math.abs(viewport.center.longitude) > 180 ||
        !Number.isFinite(viewport.zoom) ||
        viewport.zoom < 3 ||
        viewport.zoom > 20)
        throw new Error("map_viewport_invalid");
    return viewport;
}
function parseLayer(value) {
    const layer = value ?? "NORMAL";
    if (!["NORMAL", "LIGHT_POLLUTION", "CLOUD", "OPPORTUNITY"].includes(layer))
        throw new Error("map_layer_invalid");
    return layer;
}
function parseCloudLayer(value) {
    const layer = value ?? "TOTAL";
    if (!["TOTAL", "LOW", "MID", "HIGH"].includes(layer))
        throw new Error("cloud_layer_invalid");
    return layer;
}
let MiniappController = class MiniappController {
    service;
    constructor(service) {
        this.service = service;
    }
    capabilities() {
        return this.service.getCapabilities();
    }
    login(body) {
        return this.service.login(body);
    }
    resolveContext(body) {
        return this.service.resolveObservationContext(body);
    }
    getContext(contextId) {
        return this.service.getObservationContext(decodeURIComponent(contextId));
    }
    updateContext(contextId, body) {
        return this.service.updateObservationContext(decodeURIComponent(contextId), body);
    }
    async mapScene(contextId, filters, query, layer, cloudLayer, centerLat, centerLng, zoom, preferences, authorization) {
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
    terrainOverlay(purpose, centerLat, centerLng, radiusKm) {
        const latitude = Number(centerLat);
        const longitude = Number(centerLng);
        const radius = Number(radiusKm);
        if ((purpose !== "MAP" && purpose !== "SPOT") || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(radius) || radius < 2 || radius > 50)
            throw new Error("terrain_overlay_request_invalid");
        const request = { purpose, center: { system: "GCJ02", latitude, longitude }, radiusKm: radius };
        return this.service.getTerrainOverlay(request);
    }
    async terrainAsset(file, reply) {
        const asset = await this.service.getTerrainAsset(decodeURIComponent(file));
        reply.header("content-type", "image/png")
            .header("cache-control", "public, max-age=604800, immutable")
            .header("x-content-type-options", "nosniff")
            .header("x-starward-terrain-publication", asset.publicationId)
            .send(asset.bytes);
    }
    search(query = "", region = "") {
        return this.service.search(query, [], region);
    }
    estimateRoute(body) {
        if (typeof body?.contextId !== "string" ||
            !body.contextId.trim() ||
            typeof body?.spotId !== "string" ||
            !body.spotId.startsWith("spot:") ||
            (body.travelMode !== undefined &&
                !["DRIVING", "TRANSIT", "WALKING"].includes(body.travelMode)) ||
            (body.departureLocalDate !== undefined &&
                !/^\d{4}-\d{2}-\d{2}$/u.test(body.departureLocalDate)) ||
            (body.departureLocalTime !== undefined &&
                !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(body.departureLocalTime)))
            throw new Error("route_estimate_input_invalid");
        return this.service.estimateRoute(body);
    }
    astronomicalEvents() {
        return this.service.getAstronomicalEvents();
    }
    astronomicalEvent(occurrenceId, contextId) {
        return this.service.getAstronomicalEvent(decodeURIComponent(occurrenceId), contextId ? decodeURIComponent(contextId) : undefined);
    }
    overview(spotId, contextId) {
        return this.service.getSpotOverview(decodeURIComponent(spotId), required(contextId, "observation_context_required"));
    }
    guides(spotId) {
        return this.service.getSpotGuides(decodeURIComponent(spotId));
    }
    field(spotId) {
        return this.service.getSpotSite(decodeURIComponent(spotId));
    }
    recentWeather(spotId, reply) {
        reply.header("Cache-Control", "no-store");
        return this.service.getSpotRecentWeather(decodeURIComponent(spotId));
    }
    airQuality(spotId) {
        return this.service.getSpotAirQuality(decodeURIComponent(spotId));
    }
    spotContributionMedia(spotId, uploadId) {
        if (!uploadId.startsWith("upload:"))
            throw new Error("contribution_upload_not_found");
        return this.service.getSpotContributionMedia(decodeURIComponent(spotId), decodeURIComponent(uploadId));
    }
    async spotContributionImage(spotId, uploadId, reply) {
        if (!uploadId.startsWith("upload:"))
            throw new Error("contribution_upload_not_found");
        const image = await this.service.getSpotContributionImage(decodeURIComponent(spotId), decodeURIComponent(uploadId));
        return reply.header("content-type", image.mimeType).header("cache-control", "no-store")
            .header("x-content-type-options", "nosniff").send(Buffer.from(image.bytes));
    }
    contributionBaseline(spotId) {
        return this.service.getContributionFormalBaseline(decodeURIComponent(spotId));
    }
    sky(spotId, contextId, authorization, catalogVersion, deepSkyCatalogVersion) {
        if (catalogVersion !== undefined && catalogVersion !== "bsc5p-bright-stars.v2" &&
            catalogVersion !== "bsc5p-bright-stars.v3")
            throw new BadRequestException("sky_catalog_version_invalid");
        const selectedCatalog = catalogVersion ?? "bsc5p-bright-stars.v2";
        if (deepSkyCatalogVersion !== undefined && !isDeepSkyCatalogVersion(deepSkyCatalogVersion))
            throw new BadRequestException("deep_sky_catalog_version_invalid");
        const locationId = decodeURIComponent(spotId);
        if (locationId.startsWith("contribution:")) {
            return this.service.auth.requirePrincipal(authorization).then((userId) => this.service.getSky(locationId, required(contextId, "observation_context_required"), userId, selectedCatalog, deepSkyCatalogVersion));
        }
        return this.service.getSky(locationId, required(contextId, "observation_context_required"), undefined, selectedCatalog, deepSkyCatalogVersion);
    }
    skyTargets(spotId, contextId, at, authorization) {
        const locationId = decodeURIComponent(spotId);
        if (locationId.startsWith("contribution:"))
            return this.service.auth.requirePrincipal(authorization).then(userId => this.service.getSkyTargetInstant(locationId, required(contextId, "observation_context_required"), required(at, "observation_time_required"), userId));
        return this.service.getSkyTargetInstant(locationId, required(contextId, "observation_context_required"), required(at, "observation_time_required"));
    }
    async celestialPosition(spotId, reference, contextId, at, authorization, catalogVersion, deepSkyCatalogVersion) {
        const report = await this.sky(spotId, contextId, authorization, catalogVersion, deepSkyCatalogVersion);
        return celestialObjectPosition(decodeURIComponent(reference), required(at, "observation_time_required"), report);
    }
    celestialSearch(query = "", limit = "20", catalogVersion, luminaryCatalogVersion, deepSkyCatalogVersion) {
        if (catalogVersion !== undefined && catalogVersion !== "bsc5p-bright-stars.v2" && catalogVersion !== "bsc5p-bright-stars.v3")
            throw new BadRequestException("sky_catalog_version_invalid");
        return this.service.celestialSearch.search(query, Number(limit), catalogVersion ?? "bsc5p-bright-stars.v2", luminaryCatalogVersion, deepSkyCatalogVersion);
    }
    celestialObject(reference, locale = "zh-CN", catalogVersion, moonTextureVersion, deepSkyImageVersion, deepSkyPublicationHash, opticalPublicationHash) {
        if (catalogVersion !== undefined && catalogVersion !== "bsc5p-bright-stars.v2" && catalogVersion !== "bsc5p-bright-stars.v3")
            throw new BadRequestException("sky_catalog_version_invalid");
        if (moonTextureVersion !== undefined && moonTextureVersion !== "coverage-v2")
            throw new BadRequestException("moon_texture_version_invalid");
        if (opticalPublicationHash !== undefined && (!isDeepSkyObjectReference(decodeURIComponent(reference)) ||
            !/^[a-f0-9]{64}$/u.test(opticalPublicationHash)))
            throw new BadRequestException("sdss_optical_publication_hash_invalid");
        return this.service.getCelestialObject(decodeURIComponent(reference), locale, catalogVersion ?? "bsc5p-bright-stars.v2", moonTextureVersion, deepSkyImageSelection(deepSkyImageVersion, deepSkyPublicationHash), opticalPublicationHash);
    }
    deepSkyManifest(publicationHash, reply) {
        return reply.headers(skySourceManifestHeaders("deep-sky")).send(this.service.deepSkyImages.manifest(publicationHash));
    }
    deepSkyImageDiscovery(reference, imageVersion, reply) {
        deepSkyImageSelection(imageVersion);
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.deepSkyImages.discovery(reference));
    }
    async deepSkyImmutableImage(publicationHash, directory, file, reply) {
        const image = await this.service.deepSkyImages.getByFile(publicationHash, `${directory}/${file}`);
        const headers = skyPublicAssetHeaders("deep-sky", image.contentType, image.fieldDegrees, image);
        for (const [name, value] of Object.entries(headers))
            reply.header(name, value);
        return reply.send(image.bytes);
    }
    sdssOpticalCurrentManifest(reference, reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.sdssOpticalImages.currentManifest(reference));
    }
    sdssOpticalManifest(publicationHash, reply) {
        const manifest = this.service.sdssOpticalImages.manifest(publicationHash);
        return reply.headers(skySourceManifestHeaders("sdss-optical", manifest.objectRef)).send(manifest);
    }
    async sdssOpticalImage(publicationHash, file, reply) {
        const image = await this.service.sdssOpticalImages.getByFile(publicationHash, file);
        return reply.headers(skyPublicAssetHeaders("sdss-optical", image.contentType, image.fieldDegrees)).send(image.bytes);
    }
    preparedOpticalDiscovery(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.preparedOpticalImages.discovery());
    }
    /** Selected metadata keeps its own immutable admission. It does not resolve
     * through mutable discovery, and the default publication owner stays empty. */
    preparedOpticalManifest(publicationHash, reply) {
        const manifest = this.service.preparedOpticalImages.manifest(publicationHash);
        return reply.headers(preparedOpticalManifestHeaders(manifest)).send(manifest);
    }
    async preparedOpticalImage(publicationHash, file, reply) {
        const image = await this.service.preparedOpticalImages.getByFile(publicationHash, file);
        return reply.headers(skyPublicAssetHeaders("prepared-optical", image.contentType, image.fieldDegrees)).send(image.bytes);
    }
    wideFieldManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.wideFieldW3.manifest());
    }
    bodyImageOwner(body) {
        const owners = { moon: this.service.moonTexture, mars: this.service.marsTexture, mercury: this.service.mercuryTexture,
            jupiter: this.service.jupiterBands, saturn: this.service.saturnBands, uranus: this.service.uranusBands, neptune: this.service.neptuneBands };
        if (!isBodyImageKind(body))
            throw new NotFoundException("body_texture_version_unavailable");
        return { kind: body, owner: owners[body] };
    }
    bodyImageManifest(body, publicationHash, reply) {
        const { kind, owner } = this.bodyImageOwner(body), metadata = owner.publishedMetadata(publicationHash);
        return reply.headers(skyPublicAssetHeaders(kind, "application/json; charset=utf-8")).send(metadata.bytes);
    }
    async bodyImageAsset(body, publicationHash, file, reply) {
        const { kind, owner } = this.bodyImageOwner(body), image = await owner.imageAsset(publicationHash, file);
        return reply.headers(skyPublicAssetHeaders(kind, image.contentType)).send(image.bytes);
    }
    moonCoverageVersionManifest(publicationHash, reply) {
        const metadata = this.service.moonTexture.coveragePublishedMetadata(publicationHash);
        return reply.headers(skyPublicAssetHeaders("moon", "application/json; charset=utf-8")).send(metadata.bytes);
    }
    moonTextureManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.moonTexture.manifest());
    }
    moonCoverageManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache").header("x-content-type-options", "nosniff")
            .send(this.service.moonTexture.coverageManifest());
    }
    async moonCoverageImage(publicationHash, file, reply) {
        const image = await this.service.moonTexture.coverageImageAsset(publicationHash, file);
        return reply.headers(skyPublicAssetHeaders("moon", image.contentType)).send(image.bytes);
    }
    marsTextureManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.marsTexture.manifest());
    }
    mercuryTextureManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.mercuryTexture.manifest());
    }
    jupiterBandsManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.jupiterBands.manifest());
    }
    saturnBandsManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.saturnBands.manifest());
    }
    uranusBandsManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.uranusBands.manifest());
    }
    neptuneBandsManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.neptuneBands.manifest());
    }
    skyLandscapeManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache").header("x-content-type-options", "nosniff")
            .send(this.service.landscape.manifest());
    }
    async skyLandscapeAsset(publicationHash, file, reply) {
        const asset = await this.service.landscape.asset(publicationHash, file);
        return reply.headers(skyPublicAssetHeaders("landscape", asset.contentType)).send(asset.bytes);
    }
    galacticImageManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.galacticImage.infraredManifest());
    }
    galacticDisplayManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.galacticImage.manifest());
    }
    galacticPublishedManifest(publicationHash, reply) {
        const manifest = this.service.galacticImage.imageManifest(publicationHash);
        const metadata = this.service.galacticImage.publishedMetadata(publicationHash);
        return reply.headers(galacticImagePublicMetadataHeaders(manifest)).send(metadata.bytes);
    }
    async galacticImage(publicationHash, file, reply) {
        const bytes = await this.service.galacticImage.image(publicationHash, file);
        return reply.headers(galacticImagePublicAssetHeaders(this.service.galacticImage.imageManifest(publicationHash, file))).send(bytes);
    }
    async wideFieldProperties(publicationHash, reply) {
        const properties = await this.service.wideFieldW3.properties(publicationHash);
        return reply.headers(skyPublicAssetHeaders("wide-field-properties", "text/plain; charset=utf-8")).send(properties);
    }
    async wideFieldTile(publicationHash, file, reply) {
        const match = /^Npix(0|[1-9]|1[01])\.jpg$/u.exec(file);
        if (!match)
            throw new NotFoundException("wide_field_w3_tile_unavailable");
        const bytes = await this.service.wideFieldW3.tile(publicationHash, Number(match[1]));
        return reply.headers(skyPublicAssetHeaders("wide-field", "image/jpeg")).send(bytes);
    }
    opticalManifest(reply) {
        return reply.header("content-type", "application/json; charset=utf-8")
            .header("cache-control", "no-cache")
            .header("x-content-type-options", "nosniff")
            .send(this.service.opticalHips.manifest());
    }
    opticalSelectedManifest(publicationHash, reply) {
        return reply.headers(opticalHipsPublicAssetHeaders("application/json; charset=utf-8"))
            .send(this.service.opticalHips.manifest(publicationHash));
    }
    async opticalRights(publicationHash, reply) {
        const offer = await this.service.opticalHips.rights(publicationHash);
        // Discovery may gain a companion later. Only its SHA-bound URL is immutable.
        return reply.type("application/json; charset=utf-8").header("cache-control", "no-store").send(offer.reference);
    }
    async opticalRightsAsset(publicationHash, offerHash, reply) {
        const offer = await this.service.opticalHips.rightsAsset(publicationHash, offerHash);
        return reply.headers(opticalHipsPublicAssetHeaders("application/json; charset=utf-8")).send(offer.bytes);
    }
    async opticalIndex(publicationHash, sourceId, order, dir, reply) {
        const index = await this.service.opticalHips.index(publicationHash, sourceId, Number(order), Number(dir));
        return reply.headers(opticalHipsPublicAssetHeaders("application/json; charset=utf-8")).send(index);
    }
    async opticalTile(publicationHash, sourceId, order, pixel, reply) {
        const tile = await this.service.opticalHips.tile(publicationHash, sourceId, Number(order), Number(pixel));
        return reply.headers(opticalHipsPublicAssetHeaders(tile.contentType, tile.sourceId)).send(tile.bytes);
    }
    async celestialObjectImage(reference, level = "MEDIUM", publicationHash, imageVersion, reply) {
        const selection = deepSkyImageSelection(imageVersion, publicationHash);
        const image = await this.service.getDeepSkyImage(decodeURIComponent(reference), level, selection.publicationHash, selection.imageVersion);
        if (image.publicationHash)
            reply.header("x-starward-image-publication-hash", image.publicationHash);
        if (image.sourceId)
            reply.header("x-starward-image-source-id", image.sourceId);
        if (image.pixelSize)
            reply.header("x-starward-image-pixels", String(image.pixelSize));
        if (image.sourceMissingPixels !== undefined)
            reply.header("x-starward-image-missing-pixels", String(image.sourceMissingPixels));
        if (image.displaySupport)
            reply.header("x-starward-image-display-support", JSON.stringify(image.displaySupport));
        reply
            .header("content-type", image.contentType)
            .header("cache-control", "public, max-age=86400")
            .header("x-content-type-options", "nosniff")
            .header("x-starward-image-source", image.sourceLabel)
            .header("x-starward-image-field-degrees", String(image.fieldDegrees))
            .send(image.bytes);
    }
    async favorites(authorization) {
        return this.service.getFavorites(await this.service.auth.requirePrincipal(authorization));
    }
    async favorite(spotId, body, authorization, idempotencyKey = "") {
        return this.service.setFavorite(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(spotId), body.favorite, idempotencyKey);
    }
    async library(authorization) {
        return this.service.getUserLibrary(await this.service.auth.requirePrincipal(authorization));
    }
    async accountProfile(authorization) {
        return this.service.getAccountProfile(await this.service.auth.requirePrincipal(authorization));
    }
    async accountNickname(body, authorization, idempotencyKey = "") {
        return this.service.saveAccountNickname(await this.service.auth.requirePrincipal(authorization), body, idempotencyKey);
    }
    async accountAvatar(authorization) {
        return this.service.getAccountAvatar(await this.service.auth.requirePrincipal(authorization));
    }
    async saveAccountAvatar(body, authorization, idempotencyKey = "") {
        return this.service.saveAccountAvatar(await this.service.auth.requirePrincipal(authorization), body, idempotencyKey);
    }
    async preferences(authorization) {
        return this.service.getPreferences(await this.service.auth.requirePrincipal(authorization));
    }
    async savePreferences(body, authorization, idempotencyKey = "") {
        return this.service.savePreferences(await this.service.auth.requirePrincipal(authorization), body, idempotencyKey);
    }
    async accountDataExport(authorization, reauthenticationCode) {
        return this.service.exportAccountData(await this.service.auth.requireReauthenticatedPrincipal(authorization, reauthenticationCode));
    }
    async deleteAccount(body, authorization, idempotencyKey = "", reauthenticationCode) {
        return this.service.deleteAccount(await this.service.auth.requireReauthenticatedPrincipal(authorization, reauthenticationCode), body, idempotencyKey);
    }
    async plans(authorization) {
        return this.service.getPlans(await this.service.auth.requirePrincipal(authorization));
    }
    async createPlanShare(planId, authorization) {
        return this.service.createPlanShare(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(planId));
    }
    sharedPlan(token) {
        return this.service.getSharedPlan(token);
    }
    sharedSpot(spotId) {
        return this.service.getSharedSpot(decodeURIComponent(spotId));
    }
    async plan(planId, body, authorization, idempotencyKey = "") {
        return this.service.savePlan(await this.service.auth.requirePrincipal(authorization), {
            ...body,
            planId: decodeURIComponent(planId),
        }, idempotencyKey);
    }
    async planChecklistCompletion(planId, body, authorization, idempotencyKey = "") {
        return this.service.setPlanChecklistCompletion(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(planId), body, idempotencyKey);
    }
    async prepareReminderSubscription(planId, body, authorization) {
        return this.service.prepareReminderSubscription(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(planId), body);
    }
    async reportReminderSubscription(challengeId, body, authorization) {
        return this.service.reportReminderSubscription(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(challengeId), body);
    }
    async deletePlan(planId, authorization, idempotencyKey = "") {
        return this.service.deletePlan(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(planId), idempotencyKey);
    }
    async contributions(authorization) {
        return this.service.listContributions(await this.service.auth.requirePrincipal(authorization));
    }
    async submitFormalContribution(body, authorization, idempotencyKey = "") {
        return this.service.submitFormalContribution(await this.service.auth.requirePrincipal(authorization), body, idempotencyKey);
    }
    async contributionMedia(submissionId, uploadId, authorization) {
        return this.service.getContributionMedia(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(submissionId), decodeURIComponent(uploadId));
    }
    async createFormalUploadIntent(body, authorization, idempotencyKey = "") {
        return this.service.createFormalUploadIntent(await this.service.auth.requirePrincipal(authorization), body, idempotencyKey);
    }
    async createFormalUpload(intentId, body, authorization, idempotencyKey = "") {
        return this.service.createFormalUpload(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(intentId), body, idempotencyKey);
    }
    async completeFormalUpload(intentId, uploadId, body, authorization, idempotencyKey = "") {
        return this.service.completeFormalUpload(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(intentId), decodeURIComponent(uploadId), body, idempotencyKey);
    }
    async removeFormalUpload(intentId, uploadId, body, authorization, idempotencyKey = "") {
        return this.service.removeFormalUpload(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(intentId), decodeURIComponent(uploadId), body.expectedRevision, idempotencyKey);
    }
    async createContribution(body, authorization, idempotencyKey = "") {
        return this.service.createContributionDraft(await this.service.auth.requirePrincipal(authorization), body, idempotencyKey);
    }
    async updateContribution(submissionId, body, authorization, idempotencyKey = "") {
        return this.service.updateContributionDraft(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(submissionId), body, idempotencyKey);
    }
    async withdrawContribution(submissionId, body, authorization, idempotencyKey = "") {
        return this.service.withdrawContributionDraft(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(submissionId), body.expectedRevision, idempotencyKey);
    }
    async createContributionUpload(submissionId, body, authorization, idempotencyKey = "") {
        return this.service.createContributionUpload(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(submissionId), body, idempotencyKey);
    }
    async removeContributionUpload(submissionId, uploadId, body, authorization, idempotencyKey = "") {
        return this.service.removeContributionUpload(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(submissionId), decodeURIComponent(uploadId), body.expectedRevision, idempotencyKey);
    }
    async completeContributionUpload(submissionId, uploadId, body, authorization, idempotencyKey = "") {
        return this.service.completeContributionUpload(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(submissionId), decodeURIComponent(uploadId), body, idempotencyKey);
    }
    async submitContribution(submissionId, body, authorization, idempotencyKey = "") {
        return this.service.submitContribution(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(submissionId), body.expectedRevision, idempotencyKey);
    }
    async links(authorization) {
        return this.service.listProfileLinks(await this.service.auth.requirePrincipal(authorization));
    }
    async saveLink(body, authorization, idempotencyKey = "") {
        return this.service.saveProfileLink(await this.service.auth.requirePrincipal(authorization), body, idempotencyKey);
    }
    async deleteLink(profileLinkId, authorization, idempotencyKey = "") {
        return this.service.deleteProfileLink(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(profileLinkId), idempotencyKey);
    }
    async createImport(body, authorization, idempotencyKey = "") {
        return this.service.createImportDraft(await this.service.auth.requirePrincipal(authorization), body, idempotencyKey);
    }
    async listImports(authorization) {
        return this.service.listImportDrafts(await this.service.auth.requirePrincipal(authorization));
    }
    async getImport(importId, authorization) {
        return this.service.getImportDraft(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(importId));
    }
    async updateImport(importId, body, authorization, idempotencyKey = "") {
        return this.service.updateImportDraft(await this.service.auth.requirePrincipal(authorization), decodeURIComponent(importId), body, idempotencyKey);
    }
    async operations(authorization) {
        await this.service.auth.requirePrincipal(authorization);
        return this.service.operationsSnapshot();
    }
};
__decorate([
    Get("capabilities"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "capabilities", null);
__decorate([
    Post("auth/wechat/login"),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "login", null);
__decorate([
    Post("observation-contexts/resolve"),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "resolveContext", null);
__decorate([
    Get("observation-contexts/:contextId"),
    __param(0, Param("contextId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "getContext", null);
__decorate([
    Put("observation-contexts/:contextId"),
    __param(0, Param("contextId")),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "updateContext", null);
__decorate([
    Get("map/scene"),
    __param(0, Query("contextId")),
    __param(1, Query("filters")),
    __param(2, Query("q")),
    __param(3, Query("layer")),
    __param(4, Query("cloudLayer")),
    __param(5, Query("centerLat")),
    __param(6, Query("centerLng")),
    __param(7, Query("zoom")),
    __param(8, Query("preferences")),
    __param(9, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "mapScene", null);
__decorate([
    Get("terrain/overlay"),
    __param(0, Query("purpose")),
    __param(1, Query("centerLat")),
    __param(2, Query("centerLng")),
    __param(3, Query("radiusKm")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "terrainOverlay", null);
__decorate([
    Get("terrain/assets/:file"),
    __param(0, Param("file")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "terrainAsset", null);
__decorate([
    Get("places/search"),
    __param(0, Query("q")),
    __param(1, Query("region")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "search", null);
__decorate([
    Post("routes/estimate"),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "estimateRoute", null);
__decorate([
    Get("astronomical-events"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "astronomicalEvents", null);
__decorate([
    Get("astronomical-events/:occurrenceId"),
    __param(0, Param("occurrenceId")),
    __param(1, Query("contextId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "astronomicalEvent", null);
__decorate([
    Get("spots/:spotId/overview"),
    __param(0, Param("spotId")),
    __param(1, Query("contextId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "overview", null);
__decorate([
    Get("spots/:spotId/guides"),
    __param(0, Param("spotId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "guides", null);
__decorate([
    Get("spots/:spotId/field"),
    __param(0, Param("spotId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "field", null);
__decorate([
    Get("spots/:spotId/recent-weather"),
    __param(0, Param("spotId")),
    __param(1, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "recentWeather", null);
__decorate([
    Get("spots/:spotId/air-quality"),
    __param(0, Param("spotId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "airQuality", null);
__decorate([
    Get("spots/:spotId/media/:uploadId"),
    __param(0, Param("spotId")),
    __param(1, Param("uploadId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "spotContributionMedia", null);
__decorate([
    Get("spots/:spotId/media/:uploadId/image"),
    __param(0, Param("spotId")),
    __param(1, Param("uploadId")),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "spotContributionImage", null);
__decorate([
    Get("spots/:spotId/contribution-baseline"),
    __param(0, Param("spotId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "contributionBaseline", null);
__decorate([
    Get("spots/:spotId/sky"),
    __param(0, Param("spotId")),
    __param(1, Query("contextId")),
    __param(2, Headers("authorization")),
    __param(3, Query("catalogVersion")),
    __param(4, Query("deepSkyCatalogVersion")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "sky", null);
__decorate([
    Get("spots/:spotId/sky/targets"),
    __param(0, Param("spotId")),
    __param(1, Query("contextId")),
    __param(2, Query("at")),
    __param(3, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "skyTargets", null);
__decorate([
    Get("spots/:spotId/sky/objects/:reference"),
    __param(0, Param("spotId")),
    __param(1, Param("reference")),
    __param(2, Query("contextId")),
    __param(3, Query("at")),
    __param(4, Headers("authorization")),
    __param(5, Query("catalogVersion")),
    __param(6, Query("deepSkyCatalogVersion")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "celestialPosition", null);
__decorate([
    Get("celestial-objects"),
    __param(0, Query("q")),
    __param(1, Query("limit")),
    __param(2, Query("catalogVersion")),
    __param(3, Query("luminaryCatalogVersion")),
    __param(4, Query("deepSkyCatalogVersion")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "celestialSearch", null);
__decorate([
    Get("celestial-objects/:reference"),
    __param(0, Param("reference")),
    __param(1, Query("locale")),
    __param(2, Query("catalogVersion")),
    __param(3, Query("moonTextureVersion")),
    __param(4, Query("deepSkyImageVersion")),
    __param(5, Query("deepSkyPublicationHash")),
    __param(6, Query("opticalPublicationHash")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "celestialObject", null);
__decorate([
    Get("sky/deep-sky/:publicationHash/manifest"),
    __param(0, Param("publicationHash")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "deepSkyManifest", null);
__decorate([
    Get("sky/deep-sky/selected/:reference"),
    __param(0, Param("reference")),
    __param(1, Query("imageVersion")),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "deepSkyImageDiscovery", null);
__decorate([
    Get("sky/deep-sky/:publicationHash/:directory/:file"),
    __param(0, Param("publicationHash")),
    __param(1, Param("directory")),
    __param(2, Param("file")),
    __param(3, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "deepSkyImmutableImage", null);
__decorate([
    Get("sky/sdss-optical/manifest"),
    __param(0, Query("reference")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "sdssOpticalCurrentManifest", null);
__decorate([
    Get("sky/sdss-optical/:publicationHash/manifest"),
    __param(0, Param("publicationHash")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "sdssOpticalManifest", null);
__decorate([
    Get("sky/sdss-optical/:publicationHash/:file"),
    __param(0, Param("publicationHash")),
    __param(1, Param("file")),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "sdssOpticalImage", null);
__decorate([
    Get(MINIAPP_API_OPERATIONS.preparedOpticalDiscoveryGet.path.slice(1)),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "preparedOpticalDiscovery", null);
__decorate([
    Get("sky/prepared-optical/:publicationHash/manifest"),
    __param(0, Param("publicationHash")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "preparedOpticalManifest", null);
__decorate([
    Get("sky/prepared-optical/:publicationHash/:file"),
    __param(0, Param("publicationHash")),
    __param(1, Param("file")),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "preparedOpticalImage", null);
__decorate([
    Get("sky/wide-field/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "wideFieldManifest", null);
__decorate([
    Get("sky/:body/:publicationHash/manifest"),
    __param(0, Param("body")),
    __param(1, Param("publicationHash")),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "bodyImageManifest", null);
__decorate([
    Get("sky/:body/:publicationHash/:file"),
    __param(0, Param("body")),
    __param(1, Param("publicationHash")),
    __param(2, Param("file")),
    __param(3, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "bodyImageAsset", null);
__decorate([
    Get("sky/moon/coverage/:publicationHash/manifest"),
    __param(0, Param("publicationHash")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "moonCoverageVersionManifest", null);
__decorate([
    Get("sky/moon/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "moonTextureManifest", null);
__decorate([
    Get("sky/moon/coverage/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "moonCoverageManifest", null);
__decorate([
    Get("sky/moon/coverage/:publicationHash/:file"),
    __param(0, Param("publicationHash")),
    __param(1, Param("file")),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "moonCoverageImage", null);
__decorate([
    Get("sky/mars/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "marsTextureManifest", null);
__decorate([
    Get("sky/mercury/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "mercuryTextureManifest", null);
__decorate([
    Get("sky/jupiter/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "jupiterBandsManifest", null);
__decorate([
    Get("sky/saturn/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "saturnBandsManifest", null);
__decorate([
    Get("sky/uranus/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "uranusBandsManifest", null);
__decorate([
    Get("sky/neptune/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "neptuneBandsManifest", null);
__decorate([
    Get("sky/landscape/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "skyLandscapeManifest", null);
__decorate([
    Get("sky/landscape/:publicationHash/:file"),
    __param(0, Param("publicationHash")),
    __param(1, Param("file")),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "skyLandscapeAsset", null);
__decorate([
    Get("sky/galactic/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "galacticImageManifest", null);
__decorate([
    Get("sky/galactic/display/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "galacticDisplayManifest", null);
__decorate([
    Get("sky/galactic/:publicationHash/manifest"),
    __param(0, Param("publicationHash")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "galacticPublishedManifest", null);
__decorate([
    Get("sky/galactic/:publicationHash/:file"),
    __param(0, Param("publicationHash")),
    __param(1, Param("file")),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "galacticImage", null);
__decorate([
    Get("sky/wide-field/:publicationHash/properties"),
    __param(0, Param("publicationHash")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "wideFieldProperties", null);
__decorate([
    Get("sky/wide-field/:publicationHash/Norder0/Dir0/:file"),
    __param(0, Param("publicationHash")),
    __param(1, Param("file")),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "wideFieldTile", null);
__decorate([
    Get("sky/optical/manifest"),
    __param(0, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "opticalManifest", null);
__decorate([
    Get("sky/optical/:publicationHash/manifest"),
    __param(0, Param("publicationHash")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "opticalSelectedManifest", null);
__decorate([
    Get("sky/optical/:publicationHash/rights"),
    __param(0, Param("publicationHash")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "opticalRights", null);
__decorate([
    Get("sky/optical/:publicationHash/rights/:offerHash"),
    __param(0, Param("publicationHash")),
    __param(1, Param("offerHash")),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "opticalRightsAsset", null);
__decorate([
    Get("sky/optical/:publicationHash/:sourceId/:order/:dir/index"),
    __param(0, Param("publicationHash")),
    __param(1, Param("sourceId")),
    __param(2, Param("order")),
    __param(3, Param("dir")),
    __param(4, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "opticalIndex", null);
__decorate([
    Get("sky/optical/:publicationHash/:sourceId/:order/:pixel"),
    __param(0, Param("publicationHash")),
    __param(1, Param("sourceId")),
    __param(2, Param("order")),
    __param(3, Param("pixel")),
    __param(4, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "opticalTile", null);
__decorate([
    Get("celestial-objects/:reference/image"),
    __param(0, Param("reference")),
    __param(1, Query("level")),
    __param(2, Query("publicationHash")),
    __param(3, Query("imageVersion")),
    __param(4, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "celestialObjectImage", null);
__decorate([
    Get("me/favorites"),
    __param(0, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "favorites", null);
__decorate([
    Put("me/favorites/FORMAL_SPOT/:spotId"),
    __param(0, Param("spotId")),
    __param(1, Body()),
    __param(2, Headers("authorization")),
    __param(3, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "favorite", null);
__decorate([
    Get("me/library"),
    __param(0, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "library", null);
__decorate([
    Get("me/profile"),
    __param(0, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "accountProfile", null);
__decorate([
    Put("me/profile/nickname"),
    __param(0, Body()),
    __param(1, Headers("authorization")),
    __param(2, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "accountNickname", null);
__decorate([
    Get("me/profile/avatar"),
    __param(0, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "accountAvatar", null);
__decorate([
    Put("me/profile/avatar"),
    __param(0, Body()),
    __param(1, Headers("authorization")),
    __param(2, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "saveAccountAvatar", null);
__decorate([
    Get("me/preferences"),
    __param(0, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "preferences", null);
__decorate([
    Put("me/preferences"),
    __param(0, Body()),
    __param(1, Headers("authorization")),
    __param(2, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "savePreferences", null);
__decorate([
    Get("me/data-export"),
    __param(0, Headers("authorization")),
    __param(1, Headers("x-wechat-reauth-code")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "accountDataExport", null);
__decorate([
    Delete("me/account"),
    __param(0, Body()),
    __param(1, Headers("authorization")),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-wechat-reauth-code")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "deleteAccount", null);
__decorate([
    Get("me/observation-plans"),
    __param(0, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "plans", null);
__decorate([
    Post("me/observation-plans/:planId/share"),
    __param(0, Param("planId")),
    __param(1, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "createPlanShare", null);
__decorate([
    Get("shares/plans/:token"),
    __param(0, Param("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "sharedPlan", null);
__decorate([
    Get("shares/spots/:spotId"),
    __param(0, Param("spotId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiniappController.prototype, "sharedSpot", null);
__decorate([
    Put("me/observation-plans/:planId"),
    __param(0, Param("planId")),
    __param(1, Body()),
    __param(2, Headers("authorization")),
    __param(3, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "plan", null);
__decorate([
    Put("me/observation-plans/:planId/checklist-completion"),
    __param(0, Param("planId")),
    __param(1, Body()),
    __param(2, Headers("authorization")),
    __param(3, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "planChecklistCompletion", null);
__decorate([
    Post("me/observation-plans/:planId/reminder-subscription"),
    __param(0, Param("planId")),
    __param(1, Body()),
    __param(2, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "prepareReminderSubscription", null);
__decorate([
    Put("me/reminder-subscriptions/:challengeId"),
    __param(0, Param("challengeId")),
    __param(1, Body()),
    __param(2, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "reportReminderSubscription", null);
__decorate([
    Delete("me/observation-plans/:planId"),
    __param(0, Param("planId")),
    __param(1, Headers("authorization")),
    __param(2, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "deletePlan", null);
__decorate([
    Get("me/contributions"),
    __param(0, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "contributions", null);
__decorate([
    Post("me/formal-contributions/submit"),
    __param(0, Body()),
    __param(1, Headers("authorization")),
    __param(2, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "submitFormalContribution", null);
__decorate([
    Get("me/contributions/:submissionId/media/:uploadId"),
    __param(0, Param("submissionId")),
    __param(1, Param("uploadId")),
    __param(2, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "contributionMedia", null);
__decorate([
    Post("me/formal-contribution-upload-intents"),
    __param(0, Body()),
    __param(1, Headers("authorization")),
    __param(2, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "createFormalUploadIntent", null);
__decorate([
    Post("me/formal-contribution-upload-intents/:intentId/uploads"),
    __param(0, Param("intentId")),
    __param(1, Body()),
    __param(2, Headers("authorization")),
    __param(3, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "createFormalUpload", null);
__decorate([
    Put("me/formal-contribution-upload-intents/:intentId/uploads/:uploadId"),
    __param(0, Param("intentId")),
    __param(1, Param("uploadId")),
    __param(2, Body()),
    __param(3, Headers("authorization")),
    __param(4, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "completeFormalUpload", null);
__decorate([
    Delete("me/formal-contribution-upload-intents/:intentId/uploads/:uploadId"),
    __param(0, Param("intentId")),
    __param(1, Param("uploadId")),
    __param(2, Body()),
    __param(3, Headers("authorization")),
    __param(4, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "removeFormalUpload", null);
__decorate([
    Post("me/contributions"),
    __param(0, Body()),
    __param(1, Headers("authorization")),
    __param(2, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "createContribution", null);
__decorate([
    Put("me/contributions/:submissionId"),
    __param(0, Param("submissionId")),
    __param(1, Body()),
    __param(2, Headers("authorization")),
    __param(3, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "updateContribution", null);
__decorate([
    Delete("me/contributions/:submissionId"),
    __param(0, Param("submissionId")),
    __param(1, Body()),
    __param(2, Headers("authorization")),
    __param(3, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "withdrawContribution", null);
__decorate([
    Post("me/contributions/:submissionId/media-uploads"),
    __param(0, Param("submissionId")),
    __param(1, Body()),
    __param(2, Headers("authorization")),
    __param(3, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "createContributionUpload", null);
__decorate([
    Delete("me/contributions/:submissionId/media-uploads/:uploadId"),
    __param(0, Param("submissionId")),
    __param(1, Param("uploadId")),
    __param(2, Body()),
    __param(3, Headers("authorization")),
    __param(4, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "removeContributionUpload", null);
__decorate([
    Put("me/contributions/:submissionId/media-uploads/:uploadId"),
    __param(0, Param("submissionId")),
    __param(1, Param("uploadId")),
    __param(2, Body()),
    __param(3, Headers("authorization")),
    __param(4, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "completeContributionUpload", null);
__decorate([
    Post("me/contributions/:submissionId/submit"),
    __param(0, Param("submissionId")),
    __param(1, Body()),
    __param(2, Headers("authorization")),
    __param(3, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "submitContribution", null);
__decorate([
    Get("me/profile-links"),
    __param(0, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "links", null);
__decorate([
    Post("me/profile-links"),
    __param(0, Body()),
    __param(1, Headers("authorization")),
    __param(2, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "saveLink", null);
__decorate([
    Delete("me/profile-links/:profileLinkId"),
    __param(0, Param("profileLinkId")),
    __param(1, Headers("authorization")),
    __param(2, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "deleteLink", null);
__decorate([
    Post("me/imports"),
    __param(0, Body()),
    __param(1, Headers("authorization")),
    __param(2, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "createImport", null);
__decorate([
    Get("me/imports"),
    __param(0, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "listImports", null);
__decorate([
    Get("me/imports/:importId"),
    __param(0, Param("importId")),
    __param(1, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "getImport", null);
__decorate([
    Put("me/imports/:importId"),
    __param(0, Param("importId")),
    __param(1, Body()),
    __param(2, Headers("authorization")),
    __param(3, Headers("idempotency-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "updateImport", null);
__decorate([
    Get("operations"),
    __param(0, Headers("authorization")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MiniappController.prototype, "operations", null);
MiniappController = __decorate([
    Controller("v2"),
    __param(0, Inject(MiniappService)),
    __metadata("design:paramtypes", [MiniappService])
], MiniappController);
export { MiniappController };
//# sourceMappingURL=controller.js.map