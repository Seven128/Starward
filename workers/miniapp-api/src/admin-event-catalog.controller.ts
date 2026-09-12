import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import type { AstronomicalEventCatalogPackage, EventCatalogSourceConfig } from "./astronomical-event-catalog-owner.ts";
import { EVENT_CATALOG_SCHEMA_VERSION } from "./astronomical-event-catalog-owner.ts";
import { adminOperationsContext, requiredText } from "./admin-operations-support.ts";
import { envelope } from "./admin.controller.ts";
import { MiniappService } from "./miniapp-service.ts";

function sourceId(value: string) {
  const decoded = decodeURIComponent(value);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:._-]{1,127}$/u.test(decoded)) throw new Error("event_catalog_source_id_invalid");
  return decoded;
}

function candidateId(value: string) {
  const decoded = decodeURIComponent(value);
  if (!/^event-candidate:[0-9a-f-]{36}$/iu.test(decoded)) throw new Error("event_catalog_candidate_id_invalid");
  return decoded;
}

@Controller("v2/admin/event-catalog")
export class AdminEventCatalogController {
  constructor(@Inject(MiniappService) private readonly service: MiniappService) {}

  @Get()
  async current(@Headers("x-admin-token") token?: string, @Headers("x-admin-actor") actor?: string) {
    adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_READ");
    return envelope({
      active: this.service.eventCatalog.snapshot(),
      reviewQueue: await this.service.eventCatalog.reviewQueue(),
      recentRuns: await this.service.eventCatalog.recentIngestionRuns(),
      publications: await this.service.eventCatalog.listPublications(),
      sources: await this.service.eventCatalog.listSourceConfigs(),
    });
  }

  @Post("sources/:sourceId")
  async configureSource(@Param("sourceId") rawSourceId: string, @Body() body: Partial<EventCatalogSourceConfig>, @Headers("x-admin-token") token?: string, @Headers("x-admin-actor") actor?: string) {
    const context = adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_SOURCE_MANAGE");
    const endpoint = body.endpoint === null ? null : requiredText(body.endpoint, "event_source_endpoint", 1_000);
    if (endpoint && !endpoint.startsWith("https://")) throw new Error("event_catalog_source_url_invalid");
    const config: EventCatalogSourceConfig = {
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
    if (!config.termsUrl.startsWith("https://")) throw new Error("event_catalog_terms_url_invalid");
    return envelope(await this.service.eventCatalog.store.upsertSourceConfig(config, context.actorId));
  }

  @Post("imports")
  async importPackage(@Body() body: { sourceId?: string; package?: AstronomicalEventCatalogPackage }, @Headers("x-admin-token") token?: string, @Headers("x-admin-actor") actor?: string) {
    const context = adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_IMPORT");
    return envelope(await this.service.eventCatalog.importCandidate({ sourceId: sourceId(requiredText(body.sourceId, "event_source_id", 128)), package: body.package, actorId: context.actorId }));
  }

  @Post("candidates/:candidateId/review")
  async review(@Param("candidateId") rawCandidateId: string, @Body() body: { decision?: "APPROVE" | "REJECT"; reason?: string }, @Headers("x-admin-token") token?: string, @Headers("x-admin-actor") actor?: string) {
    const context = adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_REVIEW");
    if (body.decision !== "APPROVE" && body.decision !== "REJECT") throw new Error("event_catalog_review_decision_invalid");
    return envelope(await this.service.eventCatalog.reviewCandidate({ candidateId: candidateId(rawCandidateId), decision: body.decision, actorId: context.actorId, reason: requiredText(body.reason, "event_review_reason", 500) }));
  }

  @Post("candidates/:candidateId/publish")
  async publish(@Param("candidateId") rawCandidateId: string, @Body() body: { reason?: string }, @Headers("x-admin-token") token?: string, @Headers("x-admin-actor") actor?: string) {
    const context = adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_PUBLISH");
    return envelope(await this.service.eventCatalog.publishCandidate({ candidateId: candidateId(rawCandidateId), actorId: context.actorId, reason: requiredText(body.reason, "event_publication_reason", 500) }));
  }

  @Post("rollback/:catalogVersion")
  async rollback(@Param("catalogVersion") rawVersion: string, @Body() body: { reason?: string }, @Headers("x-admin-token") token?: string, @Headers("x-admin-actor") actor?: string) {
    const context = adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_ROLLBACK");
    const catalogVersion = decodeURIComponent(rawVersion);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.+_-]{2,159}$/u.test(catalogVersion)) throw new Error("event_catalog_version_invalid");
    return envelope(await this.service.eventCatalog.rollback({ catalogVersion, actorId: context.actorId, reason: requiredText(body.reason, "event_rollback_reason", 500) }));
  }

  @Post("sources/:sourceId/retrieve")
  async retrieve(@Param("sourceId") rawSourceId: string, @Headers("x-admin-token") token?: string, @Headers("x-admin-actor") actor?: string) {
    adminOperationsContext(this.service, token, actor, "EVENT_CATALOG_RERUN");
    return envelope(await this.service.eventCatalog.retrieve({ sourceId: sourceId(rawSourceId), trigger: "MANUAL_RERUN" }));
  }
}
