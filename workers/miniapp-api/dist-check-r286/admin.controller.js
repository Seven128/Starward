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
import { randomUUID } from "node:crypto";
import { Body, Controller, Get, Headers, Inject, Param, Patch, Post, } from "@nestjs/common";
import { assertAdminOperation, assertAdminToken, normalizeAdminActor, } from "./admin-auth.js";
import { MiniappService } from "./miniapp-service.js";
import { PostgresMiniappRepository, } from "./postgres-repository.js";
const CONTRIBUTION_EVIDENCE_CLAIMS = new Set([
    "ACCESS_LAST_ROAD",
    "ACCESS_PARKING",
    "FACILITY_STATUS",
    "ACCESS_OPENNESS",
    "ACCESS_LEGAL_ENTRY",
    "SAFETY_NIGHT",
    "HORIZON_PROFILE",
    "SPOT_DETAILS",
    "SITE_MEDIA_PROVENANCE",
]);
function requireText(value, field, maximum) {
    if (typeof value !== "string" || !value.trim() || value.length > maximum)
        throw new Error(`admin_${field}_invalid`);
    return value.trim();
}
function requireRevision(value, field = "revision") {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
        throw new Error(`admin_${field}_invalid`);
    return value;
}
function requireIdempotency(value) {
    return requireText(value, "idempotency_key", 200);
}
export function envelope(data) {
    const generatedAt = new Date().toISOString();
    return {
        apiVersion: "v2",
        data,
        dataState: "FRESH",
        generatedAt,
        validAt: generatedAt,
        etag: "",
        sources: [],
        warnings: ["运营操作受管理员能力门禁、完整度策略、审计和数据库事务约束。"],
        requestId: randomUUID(),
    };
}
let AdminController = class AdminController {
    service;
    constructor(service) {
        this.service = service;
    }
    #context(token, actor, operation = "CASE_READ") {
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
    async dashboard(token, actor) {
        const context = this.#context(token, actor);
        const [spots, articles, moderation, operations] = await Promise.all([
            context.repository.adminListSpots(),
            context.repository.adminListArticles(),
            context.repository.adminListModerationCases(),
            context.repository.adminOperations(),
        ]);
        return envelope({ spots, articles, moderation, ...operations });
    }
    async spots(token, actor) {
        const context = this.#context(token, actor);
        return envelope(await context.repository.adminListSpots());
    }
    async createSpotCandidate(body, token, actor) {
        const context = this.#context(token, actor);
        const name = requireText(body.name, "name", 120);
        const region = requireText(body.region, "region", 120);
        const address = requireText(body.address, "address", 500);
        const reason = requireText(body.reason, "reason", 500);
        if (body.spotId !== undefined &&
            !/^spot:[a-zA-Z0-9._:-]+$/u.test(body.spotId))
            throw new Error("admin_spot_id_invalid");
        if (!body.timezone || !["Asia/Shanghai", "Asia/Hong_Kong", "Asia/Macau"].includes(body.timezone))
            throw new Error("admin_timezone_invalid");
        if (!Number.isFinite(body.latitude) ||
            !Number.isFinite(body.longitude) ||
            Math.abs(body.latitude) > 90 ||
            Math.abs(body.longitude) > 180 ||
            (body.latitude === 0 && body.longitude === 0))
            throw new Error("admin_coordinate_or_source_invalid");
        if (body.altitudeM !== null &&
            body.altitudeM !== undefined &&
            (!Number.isFinite(body.altitudeM) || Math.abs(body.altitudeM) > 9_000))
            throw new Error("admin_altitude_invalid");
        if (!body.visibilityPolicy ||
            !["PUBLIC_EXACT", "PUBLIC_APPROXIMATE", "RESTRICTED", "HIDDEN"].includes(body.visibilityPolicy))
            throw new Error("admin_visibility_invalid");
        const source = body.source;
        if (!source ||
            !["OFFICIAL_VERIFICATION", "USER_FIELD_REPORT", "OPEN_DATA", "HISTORICAL_RECORD"].includes(source.kind) ||
            ["TEST_FIXTURE"].includes(source.kind) ||
            ["SAMPLE_DATA", "UNAVAILABLE", "EXPIRED"].includes(source.state) ||
            !source.id ||
            !source.provider ||
            !source.title ||
            !source.license ||
            !source.precision ||
            !Number.isFinite(Date.parse(source.retrievedAt ?? "")) ||
            (["OPEN_DATA", "HISTORICAL_RECORD"].includes(source.kind) &&
                !/^https:\/\//u.test(source.sourceUrl)))
            throw new Error("admin_candidate_source_invalid");
        const candidate = {
            ...(body.spotId ? { spotId: body.spotId } : {}),
            name,
            region,
            address,
            timezone: body.timezone,
            latitude: body.latitude,
            longitude: body.longitude,
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
    async patchSpot(spotId, body, token, actor) {
        const context = this.#context(token, actor);
        if (!spotId.startsWith("spot:"))
            throw new Error("formal_spot_not_found");
        const reason = requireText(body.reason, "reason", 500);
        if (body.name !== undefined)
            requireText(body.name, "name", 120);
        if (body.region !== undefined)
            requireText(body.region, "region", 120);
        if (body.address !== undefined)
            requireText(body.address, "address", 500);
        if (body.timezone !== undefined &&
            !["Asia/Shanghai", "Asia/Hong_Kong", "Asia/Macau"].includes(body.timezone))
            throw new Error("admin_timezone_invalid");
        if (body.altitudeM !== undefined &&
            body.altitudeM !== null &&
            (!Number.isFinite(body.altitudeM) || Math.abs(body.altitudeM) > 9_000))
            throw new Error("admin_altitude_invalid");
        if (body.status !== undefined &&
            !["PUBLISHED", "TEMPORARILY_CLOSED", "DATA_INSUFFICIENT"].includes(body.status))
            throw new Error("admin_status_invalid");
        if (body.visibilityPolicy !== undefined &&
            ![
                "PUBLIC_EXACT",
                "PUBLIC_APPROXIMATE",
                "RESTRICTED",
                "HIDDEN",
            ].includes(body.visibilityPolicy))
            throw new Error("admin_visibility_invalid");
        if (body.wgs84) {
            if (!Number.isFinite(body.wgs84.latitude) ||
                !Number.isFinite(body.wgs84.longitude) ||
                Math.abs(body.wgs84.latitude) > 90 ||
                Math.abs(body.wgs84.longitude) > 180 ||
                !body.wgs84.source?.id)
                throw new Error("admin_coordinate_or_source_invalid");
        }
        if (body.facilities && body.facilities.length !== 8)
            throw new Error("admin_facility_closure_invalid");
        if (body.media && body.media.length > 12)
            throw new Error("admin_media_count_invalid");
        if (body.guides && body.guides.length > 20)
            throw new Error("admin_guide_count_invalid");
        if (body.route) {
            if (!["ROUTE_ESTIMATE", "STRAIGHT_LINE_ONLY", "UNAVAILABLE"].includes(body.route.kind) ||
                !["FRESH", "STALE", "PARTIAL", "UNAVAILABLE"].includes(body.route.state) ||
                typeof body.route.lastRoad !== "string" ||
                !body.route.lastRoad.trim() ||
                typeof body.route.parkingGuidance !== "string" ||
                !body.route.parkingGuidance.trim() ||
                !body.route.source?.id)
                throw new Error("admin_route_evidence_invalid");
            for (const value of [
                body.route.distanceKm,
                body.route.driveMinutes,
                body.route.walkingMinutes,
            ])
                if (value !== null && (!Number.isFinite(value) || value < 0))
                    throw new Error("admin_route_evidence_invalid");
        }
        if (body.lastVerifiedAt !== undefined &&
            body.lastVerifiedAt !== null &&
            !Number.isFinite(Date.parse(body.lastVerifiedAt)))
            throw new Error("admin_last_verified_at_invalid");
        if (body.obstructionPercent !== undefined &&
            body.obstructionPercent !== null &&
            (!Number.isFinite(body.obstructionPercent) ||
                body.obstructionPercent < 0 ||
                body.obstructionPercent > 100))
            throw new Error("admin_obstruction_invalid");
        if (body.siteMediaState !== undefined &&
            ![
                "SITE_MEDIA_VERIFIED",
                "NO_SITE_MEDIA_VERIFIED",
                "UNKNOWN",
            ].includes(body.siteMediaState))
            throw new Error("admin_site_media_state_invalid");
        if (body.evidence && body.evidence.length > 256)
            throw new Error("admin_evidence_count_invalid");
        if (body.dataDisclosure && body.dataDisclosure.length > 256)
            throw new Error("admin_source_count_invalid");
        const patch = {
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
            spotId: decodeURIComponent(spotId),
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
    async publish(spotId, body, idempotencyKey, token, actor) {
        const context = this.#context(token, actor, "PUBLISH");
        const result = await context.repository.adminChangeSpotLifecycle({
            spotId: decodeURIComponent(spotId),
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
    async suspend(spotId, body, idempotencyKey, token, actor) {
        const context = this.#context(token, actor, "SUSPEND");
        const result = await context.repository.adminChangeSpotLifecycle({
            spotId: decodeURIComponent(spotId),
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
    async articles(token, actor) {
        const context = this.#context(token, actor);
        return envelope(await context.repository.adminListArticles());
    }
    async moderation(token, actor) {
        const context = this.#context(token, actor);
        return envelope(await context.repository.adminListModerationCases());
    }
    async contributionMedia(uploadId, token, actor) {
        this.#context(token, actor, "MEDIA_READ");
        if (!uploadId.startsWith("upload:"))
            throw new Error("contribution_upload_not_found");
        return envelope(await this.service.contributions.readForAdmin(decodeURIComponent(uploadId)));
    }
    async resolveModeration(caseId, body, idempotencyKey, token, actor) {
        const context = this.#context(token, actor, "CASE_REVIEW");
        if (!caseId)
            throw new Error("moderation_case_not_found");
        if (body.resolution !== "APPROVED" &&
            body.resolution !== "ACCEPTED" &&
            body.resolution !== "REJECTED" &&
            body.resolution !== "CHANGES_REQUESTED")
            throw new Error("moderation_resolution_invalid");
        const key = requireIdempotency(idempotencyKey);
        const reason = requireText(body.reason, "moderation_reason", 500);
        const expectedRevision = requireRevision(body.expectedRevision);
        if (body.resolution === "CHANGES_REQUESTED")
            return envelope(await context.repository.adminRequestContributionChanges({
                caseId,
                reason,
                expectedRevision,
                actorId: context.actorId,
                requestId: context.requestId,
                idempotencyKey: key,
            }));
        return envelope(await context.repository.adminResolveModeration({
            caseId,
            resolution: body.resolution,
            reason,
            actorId: context.actorId,
            requestId: context.requestId,
            expectedRevision,
            idempotencyKey: key,
        }));
    }
    async mergeContributionEvidence(caseId, body, idempotencyKey, token, actor) {
        const context = this.#context(token, actor, "MERGE_COMMIT");
        if (!caseId)
            throw new Error("moderation_case_not_found");
        if (!body.spotId?.startsWith("spot:"))
            throw new Error("formal_spot_not_found");
        if (!Array.isArray(body.confirmedClaims) ||
            !body.confirmedClaims.length ||
            body.confirmedClaims.length > CONTRIBUTION_EVIDENCE_CLAIMS.size ||
            body.confirmedClaims.some((claim) => typeof claim !== "string" ||
                !CONTRIBUTION_EVIDENCE_CLAIMS.has(claim)) ||
            new Set(body.confirmedClaims).size !== body.confirmedClaims.length)
            throw new Error("contribution_merge_claims_invalid");
        const result = await context.repository.adminCommitMerge({
            caseId: decodeURIComponent(caseId),
            spotId: decodeURIComponent(body.spotId),
            confirmedClaims: body.confirmedClaims,
            expectedSubmissionRevision: requireRevision(body.expectedSubmissionRevision, "submission_revision"),
            expectedSpotRevision: requireRevision(body.expectedSpotRevision, "spot_revision"),
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
    async dataSources(token, actor) {
        const context = this.#context(token, actor);
        return envelope((await context.repository.adminOperations()).dataSources);
    }
    async providerHealth(token, actor) {
        const context = this.#context(token, actor);
        return envelope((await context.repository.adminOperations()).providerHealth);
    }
    async costs(token, actor) {
        const context = this.#context(token, actor);
        return envelope({
            usage: (await context.repository.adminOperations()).costs,
            budget: await this.service.budgetSnapshot(),
        });
    }
    async decisions(token, actor) {
        const context = this.#context(token, actor);
        return envelope((await context.repository.adminOperations()).decisions);
    }
    async auditLogs(token, actor) {
        const context = this.#context(token, actor);
        return envelope((await context.repository.adminOperations()).audits);
    }
};
__decorate([
    Get("dashboard"),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "dashboard", null);
__decorate([
    Get("spots"),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "spots", null);
__decorate([
    Post("spots"),
    __param(0, Body()),
    __param(1, Headers("x-admin-token")),
    __param(2, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createSpotCandidate", null);
__decorate([
    Patch("spots/:spotId"),
    __param(0, Param("spotId")),
    __param(1, Body()),
    __param(2, Headers("x-admin-token")),
    __param(3, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "patchSpot", null);
__decorate([
    Post("spots/:spotId/publish"),
    __param(0, Param("spotId")),
    __param(1, Body()),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-admin-token")),
    __param(4, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "publish", null);
__decorate([
    Post("spots/:spotId/suspend"),
    __param(0, Param("spotId")),
    __param(1, Body()),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-admin-token")),
    __param(4, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "suspend", null);
__decorate([
    Get("articles"),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "articles", null);
__decorate([
    Get("moderation/cases"),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "moderation", null);
__decorate([
    Get("contribution-media/:uploadId"),
    __param(0, Param("uploadId")),
    __param(1, Headers("x-admin-token")),
    __param(2, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "contributionMedia", null);
__decorate([
    Post("moderation/cases/:caseId/resolve"),
    __param(0, Param("caseId")),
    __param(1, Body()),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-admin-token")),
    __param(4, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resolveModeration", null);
__decorate([
    Post("moderation/cases/:caseId/merge"),
    __param(0, Param("caseId")),
    __param(1, Body()),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-admin-token")),
    __param(4, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "mergeContributionEvidence", null);
__decorate([
    Get("data-sources"),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "dataSources", null);
__decorate([
    Get("provider-health"),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "providerHealth", null);
__decorate([
    Get("costs"),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "costs", null);
__decorate([
    Get("decisions"),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "decisions", null);
__decorate([
    Get("audit-logs"),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "auditLogs", null);
AdminController = __decorate([
    Controller("v2/admin"),
    __param(0, Inject(MiniappService)),
    __metadata("design:paramtypes", [MiniappService])
], AdminController);
export { AdminController };
//# sourceMappingURL=admin.controller.js.map