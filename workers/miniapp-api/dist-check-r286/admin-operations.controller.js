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
import { Body, Controller, Get, Headers, Inject, Param, Post, } from "@nestjs/common";
import { adminOperationsContext, optionalClaims, requiredIdempotency, requiredRevision, requiredSpotId, requiredText, requiredUploadId, } from "./admin-operations-support.js";
import { envelope } from "./admin.controller.js";
import { MiniappService } from "./miniapp-service.js";
let AdminOperationsController = class AdminOperationsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async queue(token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "QUEUE_READ");
        return envelope({
            items: await context.repository.adminListModerationQueue(),
        });
    }
    async moderationCase(caseId, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "CASE_READ");
        const result = await context.repository.adminGetModerationCase(decodeURIComponent(caseId));
        if (!result)
            throw new Error("moderation_case_not_found");
        return envelope({ case: result });
    }
    async requestChanges(caseId, body, idempotencyKey, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "CASE_REVIEW");
        const result = await context.repository.adminRequestContributionChanges({
            caseId: decodeURIComponent(caseId),
            reason: requiredText(body.reason, "moderation_reason", 500),
            expectedRevision: requiredRevision(body.expectedRevision, "revision"),
            actorId: context.actorId,
            requestId: context.requestId,
            idempotencyKey: requiredIdempotency(idempotencyKey),
        });
        return envelope(result);
    }
    async mediaReview(uploadId, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "MEDIA_READ");
        const result = await context.repository.adminGetMediaReview(requiredUploadId(uploadId));
        if (!result)
            throw new Error("contribution_upload_not_found");
        return envelope({ media: result });
    }
    async reviewMedia(uploadId, body, idempotencyKey, token, actor, caseId) {
        const context = adminOperationsContext(this.service, token, actor, "MEDIA_REVIEW");
        if (body.decision !== "ACCEPTED" && body.decision !== "REJECTED")
            throw new Error("admin_media_decision_invalid");
        const result = await context.repository.adminReviewContributionMedia({
            uploadId: requiredUploadId(uploadId),
            ...(caseId !== undefined ? { caseId: decodeURIComponent(caseId) } : {}),
            decision: body.decision,
            reason: requiredText(body.reason, "media_review_reason", 500),
            expectedRevision: body.expectedRevision === undefined
                ? null
                : requiredRevision(body.expectedRevision, "revision"),
            actorId: context.actorId,
            requestId: context.requestId,
            idempotencyKey: requiredIdempotency(idempotencyKey),
        });
        return envelope(result);
    }
    mediaDecision(caseId, body, idempotencyKey, token, actor) {
        if (body.decision !== "ACCEPT" && body.decision !== "REJECT")
            throw new Error("admin_media_decision_invalid");
        return this.reviewMedia(requiredUploadId(body.mediaId ?? ""), {
            decision: body.decision === "ACCEPT" ? "ACCEPTED" : "REJECTED",
            ...(body.reason !== undefined ? { reason: body.reason } : {}),
        }, idempotencyKey, token, actor, caseId);
    }
    async mergePreview(caseId, body, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "MERGE_PREVIEW");
        const result = await context.repository.adminCreateMergePreview({
            caseId: decodeURIComponent(caseId),
            spotId: requiredSpotId(body.spotId ?? ""),
            confirmedClaims: optionalClaims(body.confirmedClaims),
            expectedSubmissionRevision: requiredRevision(body.expectedSubmissionRevision, "submission_revision"),
            expectedSpotRevision: requiredRevision(body.expectedSpotRevision, "spot_revision"),
        });
        return envelope({ preview: result });
    }
};
__decorate([
    Get("moderation/queue"),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminOperationsController.prototype, "queue", null);
__decorate([
    Get("moderation/cases/:caseId"),
    __param(0, Param("caseId")),
    __param(1, Headers("x-admin-token")),
    __param(2, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminOperationsController.prototype, "moderationCase", null);
__decorate([
    Post("moderation/cases/:caseId/request-changes"),
    __param(0, Param("caseId")),
    __param(1, Body()),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-admin-token")),
    __param(4, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminOperationsController.prototype, "requestChanges", null);
__decorate([
    Get("contribution-media/:uploadId/review"),
    __param(0, Param("uploadId")),
    __param(1, Headers("x-admin-token")),
    __param(2, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminOperationsController.prototype, "mediaReview", null);
__decorate([
    Post("contribution-media/:uploadId/review"),
    __param(0, Param("uploadId")),
    __param(1, Body()),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-admin-token")),
    __param(4, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminOperationsController.prototype, "reviewMedia", null);
__decorate([
    Post("moderation/cases/:caseId/media-decisions"),
    __param(0, Param("caseId")),
    __param(1, Body()),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-admin-token")),
    __param(4, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", void 0)
], AdminOperationsController.prototype, "mediaDecision", null);
__decorate([
    Post("moderation/cases/:caseId/merge-preview"),
    __param(0, Param("caseId")),
    __param(1, Body()),
    __param(2, Headers("x-admin-token")),
    __param(3, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminOperationsController.prototype, "mergePreview", null);
AdminOperationsController = __decorate([
    Controller("v2/admin"),
    __param(0, Inject(MiniappService)),
    __metadata("design:paramtypes", [MiniappService])
], AdminOperationsController);
export { AdminOperationsController };
//# sourceMappingURL=admin-operations.controller.js.map