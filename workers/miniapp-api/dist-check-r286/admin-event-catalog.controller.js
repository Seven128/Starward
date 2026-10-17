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
import { Body, Controller, Get, Headers, Inject, Param, Post, Query } from "@nestjs/common";
import { EVENT_CATALOG_SCHEMA_VERSION, eventCatalogDigest, isRetiredBuiltInCatalog, diffAstronomicalEventCatalog, sameCatalogContent } from "./astronomical-event-catalog-owner.js";
import { adminOperationsContext, requiredText } from "./admin-operations-support.js";
import { envelope } from "./admin.controller.js";
import { MiniappService } from "./miniapp-service.js";
import { extractEventArticle, retrieveEventArticle, decodeEventArticleHtml, EVENT_ARTICLE_HTML_BYTES } from "./event-article-extraction.js";
import { importEventArticle } from "./event-article-import.js";
import { createEventArticleResolver } from "./event-article-dns.js";
function sourceId(value) {
    const decoded = decodeURIComponent(value);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:._-]{1,127}$/u.test(decoded))
        throw new Error("event_catalog_source_id_invalid");
    return decoded;
}
function candidateId(value) {
    const decoded = decodeURIComponent(value);
    if (!/^event-candidate:[0-9a-f-]{36}$/iu.test(decoded))
        throw new Error("event_catalog_candidate_id_invalid");
    return decoded;
}
let AdminEventCatalogController = class AdminEventCatalogController {
    service;
    constructor(service) {
        this.service = service;
    }
    async current(token, actor, rawOffset) {
        adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_READ");
        const candidateOffset = rawOffset === undefined ? 0 : Number(rawOffset);
        if (!Number.isSafeInteger(candidateOffset) || candidateOffset < 0)
            throw new Error("event_catalog_candidate_offset_invalid");
        await this.service.eventCatalog.initialize();
        const active = this.service.eventCatalog.snapshot();
        const recentCandidates = await this.service.eventCatalog.store.listCandidates(undefined, candidateOffset);
        return envelope({
            active,
            activeIdentity: { catalogVersion: active.catalogVersion, contentSha256: eventCatalogDigest(active) },
            reviewQueue: await this.service.eventCatalog.reviewQueue(),
            recentCandidates: recentCandidates.map(candidate => ({ ...candidate, diff: diffAstronomicalEventCatalog(active, candidate.package), reviewCurrent: candidate.reviewedAgainst?.catalogVersion === active.catalogVersion && candidate.reviewedAgainst?.contentSha256 === eventCatalogDigest(active) })),
            candidateOffset,
            hasMoreCandidates: recentCandidates.length === 100,
            recentRuns: await this.service.eventCatalog.recentIngestionRuns(),
            publications: (await this.service.eventCatalog.listPublications()).map(publication => ({ ...publication, restorable: !isRetiredBuiltInCatalog(publication.package), activeEquivalent: sameCatalogContent(publication.package, active) })),
            sources: await this.service.eventCatalog.listSourceConfigs(),
        });
    }
    async configureSource(rawSourceId, body, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_SOURCE_MANAGE");
        const endpoint = body.endpoint === null ? null : requiredText(body.endpoint, "event_source_endpoint", 1_000);
        if (endpoint && !endpoint.startsWith("https://"))
            throw new Error("event_catalog_source_url_invalid");
        const config = {
            sourceId: sourceId(rawSourceId),
            provider: requiredText(body.provider, "event_source_provider", 200),
            endpoint,
            enabled: body.enabled === true,
            parserVersion: requiredText(body.parserVersion, "event_parser_version", 100),
            schemaVersion: EVENT_CATALOG_SCHEMA_VERSION,
            autoPublishEligible: body.autoPublishEligible === true,
            approvedBaselineVersion: body.approvedBaselineVersion === null ? null : requiredText(body.approvedBaselineVersion, "event_baseline_version", 160),
            termsUrl: requiredText(body.termsUrl, "event_terms_url", 1_000),
            coverage: requiredText(body.coverage, "event_source_coverage", 500),
        };
        if (!config.termsUrl.startsWith("https://"))
            throw new Error("event_catalog_terms_url_invalid");
        return envelope(await this.service.eventCatalog.store.upsertSourceConfig(config, context.actorId, body.createOnly === true));
    }
    async importPackage(body, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_IMPORT");
        return envelope(await this.service.eventCatalog.importCandidate({ sourceId: sourceId(requiredText(body.sourceId, "event_source_id", 128)), package: body.package, actorId: context.actorId, ...(body.articleRightsConfirmation ? { articleRightsConfirmation: body.articleRightsConfirmation } : {}) }));
    }
    async articlePreview(body, token, actor) {
        adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_IMPORT");
        const url = requiredText(body.url, "event_article_url", 2000);
        if (body.htmlBase64 !== undefined) {
            if (body.html !== undefined)
                throw new Error("event_article_html_invalid");
            return envelope(extractEventArticle(decodeEventArticleHtml(body.htmlBase64), url));
        }
        return envelope(body.html === undefined ? await retrieveEventArticle(url, createEventArticleResolver(this.service.config.eventArticleDnsMode))
            : extractEventArticle(requiredText(body.html, "event_article_html", EVENT_ARTICLE_HTML_BYTES), url));
    }
    async articleImport(body, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_IMPORT");
        return envelope(await importEventArticle(this.service.eventCatalog, body, context.actorId));
    }
    async review(rawCandidateId, body, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_REVIEW");
        if (body.decision !== "APPROVE" && body.decision !== "REJECT")
            throw new Error("event_catalog_review_decision_invalid");
        return envelope(await this.service.eventCatalog.reviewCandidate({ candidateId: candidateId(rawCandidateId), decision: body.decision, actorId: context.actorId, reason: requiredText(body.reason, "event_review_reason", 500), ...(body.expectedState !== undefined ? { expectedState: body.expectedState } : {}), ...(body.expectedActive !== undefined ? { expectedActive: body.expectedActive } : {}) }));
    }
    async publish(rawCandidateId, body, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_PUBLISH");
        return envelope(await this.service.eventCatalog.publishCandidate({ candidateId: candidateId(rawCandidateId), actorId: context.actorId, reason: requiredText(body.reason, "event_publication_reason", 500), ...(body.expectedActive !== undefined ? { expectedActive: body.expectedActive } : {}) }));
    }
    async rollback(rawVersion, body, token, actor) {
        const context = adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_ROLLBACK");
        const catalogVersion = decodeURIComponent(rawVersion);
        if (!/^[a-zA-Z0-9][a-zA-Z0-9.+_-]{2,159}$/u.test(catalogVersion))
            throw new Error("event_catalog_version_invalid");
        return envelope(await this.service.eventCatalog.rollback({ catalogVersion, actorId: context.actorId, reason: requiredText(body.reason, "event_rollback_reason", 500), ...(body.expectedActive !== undefined ? { expectedActive: body.expectedActive } : {}) }));
    }
    async retrieve(rawSourceId, token, actor) {
        adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_RERUN");
        return envelope(await this.service.eventCatalog.retrieve({ sourceId: sourceId(rawSourceId), trigger: "MANUAL_RERUN" }));
    }
};
__decorate([
    Get(),
    __param(0, Headers("x-admin-token")),
    __param(1, Headers("x-admin-actor")),
    __param(2, Query("candidateOffset")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminEventCatalogController.prototype, "current", null);
__decorate([
    Post("sources/:sourceId"),
    __param(0, Param("sourceId")),
    __param(1, Body()),
    __param(2, Headers("x-admin-token")),
    __param(3, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminEventCatalogController.prototype, "configureSource", null);
__decorate([
    Post("imports"),
    __param(0, Body()),
    __param(1, Headers("x-admin-token")),
    __param(2, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminEventCatalogController.prototype, "importPackage", null);
__decorate([
    Post("article-previews"),
    __param(0, Body()),
    __param(1, Headers("x-admin-token")),
    __param(2, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminEventCatalogController.prototype, "articlePreview", null);
__decorate([
    Post("article-imports"),
    __param(0, Body()),
    __param(1, Headers("x-admin-token")),
    __param(2, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminEventCatalogController.prototype, "articleImport", null);
__decorate([
    Post("candidates/:candidateId/review"),
    __param(0, Param("candidateId")),
    __param(1, Body()),
    __param(2, Headers("x-admin-token")),
    __param(3, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminEventCatalogController.prototype, "review", null);
__decorate([
    Post("candidates/:candidateId/publish"),
    __param(0, Param("candidateId")),
    __param(1, Body()),
    __param(2, Headers("x-admin-token")),
    __param(3, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminEventCatalogController.prototype, "publish", null);
__decorate([
    Post("rollback/:catalogVersion"),
    __param(0, Param("catalogVersion")),
    __param(1, Body()),
    __param(2, Headers("x-admin-token")),
    __param(3, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminEventCatalogController.prototype, "rollback", null);
__decorate([
    Post("sources/:sourceId/retrieve"),
    __param(0, Param("sourceId")),
    __param(1, Headers("x-admin-token")),
    __param(2, Headers("x-admin-actor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminEventCatalogController.prototype, "retrieve", null);
AdminEventCatalogController = __decorate([
    Controller("v2/admin/event-catalog"),
    __param(0, Inject(MiniappService)),
    __metadata("design:paramtypes", [MiniappService])
], AdminEventCatalogController);
export { AdminEventCatalogController };
//# sourceMappingURL=admin-event-catalog.controller.js.map