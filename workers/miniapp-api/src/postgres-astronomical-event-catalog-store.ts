import { randomUUID } from "node:crypto";
import type pg from "pg";
import { validateExternalUrl } from "@starward/miniapp-contracts";
import { builtInAstronomicalEventCatalogPackage, eventCatalogDigest } from "./astronomical-event-catalog-owner.ts";
import type {
  AstronomicalEventCatalogStore,
  EventCatalogCandidate,
  EventCatalogIngestionRun,
  EventCatalogPublication,
  EventCatalogSourceConfig,
  EventCatalogActiveIdentity,
} from "./astronomical-event-catalog-owner.ts";

function candidate(row: Record<string, unknown>): EventCatalogCandidate {
  return {
    candidateId: String(row.candidate_id),
    sourceId: String(row.source_id),
    trigger: row.trigger as EventCatalogCandidate["trigger"],
    state: row.state as EventCatalogCandidate["state"],
    package: row.payload as EventCatalogCandidate["package"],
    contentSha256: String(row.content_sha256),
    diff: row.diff as EventCatalogCandidate["diff"],
    decisionReasons: row.decision_reasons as string[],
    retrievedAt: new Date(row.retrieved_at as string | Date).toISOString(),
    actorId: String(row.actor_id),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at as string | Date).toISOString() : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewReason: row.review_reason ? String(row.review_reason) : null,
    reviewedAgainst: (row.reviewed_against ?? null) as EventCatalogCandidate["reviewedAgainst"],
  };
}

function publication(row: Record<string, unknown>): EventCatalogPublication {
  return {
    publicationId: String(row.publication_id),
    catalogVersion: String(row.catalog_version),
    candidateId: row.candidate_id ? String(row.candidate_id) : null,
    package: row.payload as EventCatalogPublication["package"],
    contentSha256: String(row.content_sha256),
    publishedAt: new Date(row.published_at as string | Date).toISOString(),
    publishedBy: String(row.published_by),
    reason: String(row.reason),
    rolledBackFromVersion: row.rolled_back_from_version ? String(row.rolled_back_from_version) : null,
    restoredFromVersion: row.restored_from_version ? String(row.restored_from_version) : null,
  };
}

function source(row: Record<string, unknown>): EventCatalogSourceConfig {
  return {
    sourceId: String(row.source_id), provider: String(row.provider), endpoint: row.endpoint ? String(row.endpoint) : null,
    enabled: Boolean(row.enabled), parserVersion: String(row.parser_version), schemaVersion: row.schema_version as EventCatalogSourceConfig["schemaVersion"],
    autoPublishEligible: Boolean(row.auto_publish_eligible), approvedBaselineVersion: row.approved_baseline_version ? String(row.approved_baseline_version) : null,
    termsUrl: String(row.terms_url), coverage: String(row.coverage),
  };
}

function ingestionRun(row: Record<string, unknown>): EventCatalogIngestionRun {
  return {
    runId:String(row.run_id),sourceId:String(row.source_id),trigger:row.trigger as EventCatalogIngestionRun["trigger"],state:row.state as EventCatalogIngestionRun["state"],
    startedAt:new Date(row.started_at as string | Date).toISOString(),completedAt:new Date(row.completed_at as string | Date).toISOString(),httpStatus:row.http_status as number | null,
    etag:row.etag ? String(row.etag) : null,lastModified:row.last_modified ? String(row.last_modified) : null,contentSha256:row.content_sha256 ? String(row.content_sha256) : null,
    candidateId:row.candidate_id ? String(row.candidate_id) : null,errorCode:row.error_code ? String(row.error_code) : null,
  };
}

export class PostgresAstronomicalEventCatalogStore implements AstronomicalEventCatalogStore {
  constructor(readonly pool: pg.Pool) {}

  async loadActivePublication() {
    const result = await this.pool.query("SELECT * FROM astronomical_event_catalog_publications WHERE active = true");
    return result.rows[0] ? publication(result.rows[0]) : null;
  }
  async getPublication(version: string) {
    const result = await this.pool.query("SELECT * FROM astronomical_event_catalog_publications WHERE catalog_version = $1", [version]);
    return result.rows[0] ? publication(result.rows[0]) : null;
  }
  async listPublications() {
    const result = await this.pool.query("SELECT * FROM astronomical_event_catalog_publications ORDER BY published_at DESC LIMIT 100");
    return result.rows.map(publication);
  }
  async saveCandidate(input: EventCatalogCandidate) {
    try {
      const result = await this.pool.query(
        `INSERT INTO astronomical_event_catalog_candidates(
           candidate_id, source_id, trigger, state, catalog_version, schema_version,
           source_release, parser_version, time_scale, precision, content_sha256,
           payload, diff, decision_reasons, retrieved_at, actor_id, reviewed_against
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [input.candidateId, input.sourceId, input.trigger, input.state, input.package.catalogVersion,
          input.package.schemaVersion, input.package.sourceRelease, input.package.parserVersion,
          input.package.timeScale, input.package.precision, input.contentSha256, input.package,
          input.diff, JSON.stringify(input.decisionReasons), input.retrievedAt, input.actorId, input.reviewedAgainst],
      );
      return candidate(result.rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new Error("event_catalog_candidate_duplicate");
      throw error;
    }
  }
  async getCandidate(id: string) {
    const result = await this.pool.query("SELECT * FROM astronomical_event_catalog_candidates WHERE candidate_id = $1", [id]);
    return result.rows[0] ? candidate(result.rows[0]) : null;
  }
  async getCandidateByHash(hash: string) {
    const result = await this.pool.query("SELECT * FROM astronomical_event_catalog_candidates WHERE content_sha256 = $1", [hash]);
    return result.rows[0] ? candidate(result.rows[0]) : null;
  }
  async getCandidateByVersion(version: string) {
    const result = await this.pool.query("SELECT * FROM astronomical_event_catalog_candidates WHERE catalog_version = $1", [version]);
    return result.rows[0] ? candidate(result.rows[0]) : null;
  }
  async listCandidates(states?: readonly EventCatalogCandidate["state"][], offset = 0) {
    const result = states?.length
      ? await this.pool.query("SELECT * FROM astronomical_event_catalog_candidates WHERE state = ANY($1::text[]) ORDER BY created_at DESC, candidate_id DESC LIMIT 100 OFFSET $2", [states, offset])
      : await this.pool.query("SELECT * FROM astronomical_event_catalog_candidates ORDER BY created_at DESC, candidate_id DESC LIMIT 100 OFFSET $1", [offset]);
    return result.rows.map(candidate);
  }
  async updateCandidateReview(input: { candidateId: string; state: "REJECTED" | "AUTO_PUBLISH_ELIGIBLE"; actorId: string; reason: string; expectedState?: EventCatalogCandidate["state"]; reviewedAgainst: EventCatalogActiveIdentity | null }) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const prior = await client.query("SELECT * FROM astronomical_event_catalog_candidates WHERE candidate_id = $1 FOR UPDATE", [input.candidateId]);
      if (!prior.rows[0] || prior.rows[0].state === "PUBLISHED") throw new Error("event_catalog_candidate_not_reviewable");
      if (input.expectedState !== undefined && input.expectedState !== prior.rows[0].state) throw new Error("event_catalog_candidate_changed");
      const result = await client.query(
        `UPDATE astronomical_event_catalog_candidates SET state=$2, reviewed_at=now(), reviewed_by=$3, review_reason=$4, reviewed_against=$5
          WHERE candidate_id=$1 RETURNING *`, [input.candidateId, input.state, input.actorId, input.reason, input.reviewedAgainst]);
      await this.#audit(client, input.actorId, input.state === "REJECTED" ? "EVENT_CATALOG_REJECT" : "EVENT_CATALOG_APPROVE", input.candidateId, prior.rows[0], result.rows[0]);
      await client.query("COMMIT");
      return candidate(result.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async activatePublication(input: EventCatalogPublication, expectedActive?: EventCatalogActiveIdentity | null) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('astronomical-event-catalog-publication'))");
      const before = await client.query("SELECT * FROM astronomical_event_catalog_publications WHERE active=true FOR UPDATE");
      if (expectedActive !== undefined && (expectedActive === null ? before.rows.length > 0 : before.rows[0]?.catalog_version !== expectedActive.catalogVersion || before.rows[0]?.content_sha256 !== expectedActive.contentSha256))
        throw new Error("event_catalog_active_changed");
      if (input.candidateId) {
        const locked = await client.query("SELECT state, reviewed_against FROM astronomical_event_catalog_candidates WHERE candidate_id=$1 FOR UPDATE", [input.candidateId]);
        if (locked.rows[0]?.state !== "AUTO_PUBLISH_ELIGIBLE") throw new Error("event_catalog_candidate_not_publishable");
        const activePackage = before.rows[0]?.payload ?? builtInAstronomicalEventCatalogPackage();
        if (locked.rows[0]?.reviewed_against?.catalogVersion !== activePackage.catalogVersion || locked.rows[0]?.reviewed_against?.contentSha256 !== eventCatalogDigest(activePackage)) throw new Error("event_catalog_review_baseline_changed");
      }
      await client.query("UPDATE astronomical_event_catalog_publications SET active=false WHERE active=true");
      const result = await client.query(
        `INSERT INTO astronomical_event_catalog_publications(
           publication_id,catalog_version,candidate_id,content_sha256,payload,published_at,published_by,reason,rolled_back_from_version,restored_from_version,active
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true) RETURNING *`,
        [input.publicationId,input.catalogVersion,input.candidateId,input.contentSha256,input.package,input.publishedAt,input.publishedBy,input.reason,input.rolledBackFromVersion,input.restoredFromVersion ?? null]);
      if (input.candidateId) await client.query("UPDATE astronomical_event_catalog_candidates SET state='PUBLISHED' WHERE candidate_id=$1", [input.candidateId]);
      await client.query(
        `INSERT INTO published_dataset_versions(dataset_kind,dataset_version,state,manifest,published_at)
         VALUES ('ASTRONOMICAL_EVENTS',$1,'PUBLISHED',$2,$3)
         ON CONFLICT (dataset_kind,dataset_version) DO UPDATE SET state='PUBLISHED',manifest=EXCLUDED.manifest,published_at=EXCLUDED.published_at`,
        [input.catalogVersion, { publicationId: input.publicationId, contentSha256: input.contentSha256, sourceRelease: input.package.sourceRelease }, input.publishedAt]);
      await this.#audit(client, input.publishedBy, input.rolledBackFromVersion ? "EVENT_CATALOG_ROLLBACK" : "EVENT_CATALOG_PUBLISH", input.catalogVersion, before.rows[0] ?? null, result.rows[0]);
      await client.query("COMMIT");
      return publication(result.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); if ((error as {code?:string}).code === "23505") throw new Error("event_catalog_version_exists"); throw error; } finally { client.release(); }
  }
  async saveIngestionRun(run: EventCatalogIngestionRun) {
    await this.pool.query(
      `INSERT INTO astronomical_event_ingestion_runs(run_id,source_id,trigger,state,started_at,completed_at,http_status,etag,last_modified,content_sha256,candidate_id,error_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [run.runId,run.sourceId,run.trigger,run.state,run.startedAt,run.completedAt,run.httpStatus,run.etag,run.lastModified,run.contentSha256,run.candidateId,run.errorCode]);
  }
  async lastSuccessfulIngestion(sourceId: string) {
    const result = await this.pool.query(
      `SELECT * FROM astronomical_event_ingestion_runs WHERE source_id=$1 AND state IN ('NO_CHANGE','CANDIDATE_CREATED') ORDER BY completed_at DESC LIMIT 1`, [sourceId]);
    return result.rows[0] ? ingestionRun(result.rows[0]) : null;
  }
  async listIngestionRuns(limit = 100) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error("event_catalog_run_limit_invalid");
    const result = await this.pool.query("SELECT * FROM astronomical_event_ingestion_runs ORDER BY completed_at DESC LIMIT $1", [limit]);
    return result.rows.map(ingestionRun);
  }
  async getSourceConfig(sourceId: string) {
    const result = await this.pool.query("SELECT * FROM astronomical_event_source_configs WHERE source_id=$1", [sourceId]);
    return result.rows[0] ? source(result.rows[0]) : null;
  }
  async listSourceConfigs() {
    const result = await this.pool.query("SELECT * FROM astronomical_event_source_configs ORDER BY source_id");
    return result.rows.map(source);
  }
  async upsertSourceConfig(input: EventCatalogSourceConfig, actorId = "admin:source-configuration", createOnly = false) {
    if (input.endpoint) {
      const validation = validateExternalUrl(input.endpoint);
      if (!validation.ok || !validation.normalizedUrl?.startsWith("https://")) throw new Error("event_catalog_source_url_invalid");
    }
    if (input.autoPublishEligible && !input.approvedBaselineVersion) throw new Error("event_catalog_source_baseline_required");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const before = await client.query("SELECT * FROM astronomical_event_source_configs WHERE source_id=$1 FOR UPDATE", [input.sourceId]);
      const result = await client.query(
        `INSERT INTO astronomical_event_source_configs(source_id,provider,endpoint,enabled,parser_version,schema_version,auto_publish_eligible,approved_baseline_version,terms_url,coverage)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (source_id) DO UPDATE SET provider=EXCLUDED.provider,endpoint=EXCLUDED.endpoint,enabled=EXCLUDED.enabled,
           parser_version=EXCLUDED.parser_version,schema_version=EXCLUDED.schema_version,auto_publish_eligible=EXCLUDED.auto_publish_eligible,
           approved_baseline_version=EXCLUDED.approved_baseline_version,terms_url=EXCLUDED.terms_url,coverage=EXCLUDED.coverage,updated_at=now() WHERE NOT $11
         RETURNING *`,
        [input.sourceId,input.provider,input.endpoint,input.enabled,input.parserVersion,input.schemaVersion,input.autoPublishEligible,input.approvedBaselineVersion,input.termsUrl,input.coverage,createOnly]);
      if (!result.rows[0]) throw new Error("event_catalog_source_exists");
      await this.#audit(client, actorId, "EVENT_CATALOG_SOURCE_CONFIGURE", input.sourceId, before.rows[0] ?? null, result.rows[0]);
      await client.query("COMMIT");
      return source(result.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async #audit(client: pg.PoolClient, actorId: string, action: string, subjectId: string, before: unknown, after: unknown) {
    await client.query(
      `INSERT INTO audit_logs(audit_id,actor_id,action,subject_type,subject_id,request_id,before_payload,after_payload)
       VALUES ($1,$2,$3,'ASTRONOMICAL_EVENT_CATALOG',$4,$5,$6,$7)`,
      [randomUUID(),actorId,action,subjectId,randomUUID(),before,after]);
  }
}
