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
import { adminOperationsContext, requiredIdempotency, requiredRevision, requiredSpotId, requiredText, } from "./admin-operations-support.js";
import { envelope } from "./admin.controller.js";
import { MiniappService } from "./miniapp-service.js";
let AdminPublicationController = class AdminPublicationController {
    service;
    constructor(service) {
        this.service = service;
    }
    async assessPublication(spotId, body, idempotencyKey, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "PUBLICATION_ASSESS");
        const expected = body.expectedSpotRevision ?? body.expectedRevision;
        const result = await context.repository.adminAssessPublication({
            spotId: requiredSpotId(spotId),
            expectedSpotRevision: expected === undefined
                ? null
                : requiredRevision(expected, "spot_revision"),
            reason: requiredText(body.reason, "publication_reason", 500),
            actorId: context.actorId,
            requestId: context.requestId,
            idempotencyKey: requiredIdempotency(idempotencyKey),
        });
        return envelope(result);
    }
    async revisions(spotId, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "CASE_READ");
        return envelope({
            revisions: await context.repository.adminListSpotRevisions(requiredSpotId(spotId)),
        });
    }
    async #lifecycle(spotId, action, body, idempotencyKey, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, action);
        const result = await context.repository.adminChangeSpotLifecycle({
            spotId: requiredSpotId(spotId),
            action,
            expectedSpotRevision: requiredRevision(body.expectedSpotRevision ?? body.expectedRevision, "spot_revision"),
            ...(body.assessmentDigest
                ? { assessmentDigest: body.assessmentDigest }
                : {}),
            reason: requiredText(body.reason, "lifecycle_reason", 500),
            actorId: context.actorId,
            requestId: context.requestId,
            idempotencyKey: requiredIdempotency(idempotencyKey),
        });
        await this.service.cache.deleteByPrefix("map:");
        await this.service.cache.deleteByPrefix(`spot-overview:${spotId}`);
        return envelope(result);
    }
    unpublish(spotId, body, idempotencyKey, token, actor) {
        return this.#lifecycle(spotId, "UNPUBLISH", body, idempotencyKey, token, actor);
    }
    retire(spotId, body, idempotencyKey, token, actor) {
        return this.#lifecycle(spotId, "RETIRE", body, idempotencyKey, token, actor);
    }
    async replacementPreview(spotId, body, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "REPLACE");
        const successor = normalizeSuccessor(body.successorSpotId);
        const result = await context.repository.adminPreviewReplacement({
            spotId: requiredSpotId(spotId),
            successorSpotId: successor,
            expectedSpotRevision: requiredRevision(body.expectedSpotRevision ?? body.expectedRevision, "spot_revision"),
        });
        return envelope({ impact: result });
    }
    async replace(spotId, body, idempotencyKey, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "REPLACE");
        const result = await context.repository.adminCommitReplacement({
            spotId: requiredSpotId(spotId),
            successorSpotId: normalizeSuccessor(body.successorSpotId),
            expectedSpotRevision: requiredRevision(body.expectedSpotRevision ?? body.expectedRevision, "spot_revision"),
            reason: requiredText(body.reason, "replacement_reason", 500),
            actorId: context.actorId,
            requestId: context.requestId,
            idempotencyKey: requiredIdempotency(idempotencyKey),
        });
        return envelope(result);
    }
    async receipt(receiptId, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "AUDIT_READ");
        const result = await context.repository.adminReadReceipt(decodeURIComponent(receiptId));
        if (!result)
            throw new Error("operation_receipt_not_found");
        return envelope(result);
    }
    async audit(token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "AUDIT_READ");
        return envelope({ entries: await context.repository.adminAuditLog() });
    }
};
__decorate([
    Post("spots/:spotId/publication-assessments"),
    __param(0, Param("spotId")),
    __param(1, Body()),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-admin-token")),
    __param(4, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminPublicationController.prototype, "assessPublication", null);
__decorate([
    Get("spots/:spotId/revisions"),
    __param(0, Param("spotId")),
    __param(1, Headers("x-admin-token")),
    __param(2, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminPublicationController.prototype, "revisions", null);
__decorate([
    Post("spots/:spotId/unpublish"),
    __param(0, Param("spotId")),
    __param(1, Body()),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-admin-token")),
    __param(4, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", void 0)
], AdminPublicationController.prototype, "unpublish", null);
__decorate([
    Post("spots/:spotId/retire"),
    __param(0, Param("spotId")),
    __param(1, Body()),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-admin-token")),
    __param(4, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", void 0)
], AdminPublicationController.prototype, "retire", null);
__decorate([
    Post("spots/:spotId/replacement-preview"),
    __param(0, Param("spotId")),
    __param(1, Body()),
    __param(2, Headers("x-admin-token")),
    __param(3, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminPublicationController.prototype, "replacementPreview", null);
__decorate([
    Post("spots/:spotId/replace"),
    __param(0, Param("spotId")),
    __param(1, Body()),
    __param(2, Headers("idempotency-key")),
    __param(3, Headers("x-admin-token")),
    __param(4, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminPublicationController.prototype, "replace", null);
__decorate([
    Get("receipts/:receiptId"),
    __param(0, Param("receiptId")),
    __param(1, Headers("x-admin-token")),
    __param(2, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminPublicationController.prototype, "receipt", null);
__decorate([
    Get("audit"),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminPublicationController.prototype, "audit", null);
AdminPublicationController = __decorate([
    Controller("v2/admin"),
    __param(0, Inject(MiniappService)),
    __metadata("design:paramtypes", [MiniappService])
], AdminPublicationController);
export { AdminPublicationController };
function normalizeSuccessor(value) {
    return value === null || value === undefined ? null : requiredSpotId(value);
}
//# sourceMappingURL=admin-publication.controller.js.map