import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_USER_PREFERENCES,
  DEMO_FEATURE_FLAGS,
  DEMO_SPOTS,
  buildDemoSpotDetail,
  type ImportDraft,
  type FacilityEvidence,
  type GuideArticle,
  type ObservationPlan,
  type PlanId,
  type ProfileLink,
  type RepresentativeMedia,
  type SourceSummary,
  type SpotDetail,
  type SpotId,
  type SpotSummary,
  type UserPreferences,
  type UserPreferencesRecord,
} from "@starward/miniapp-contracts";
import { createMapCoordinateView } from "@starward/coordinate-system";
import pg, { type PoolClient } from "pg";
import type { MiniappRepositoryPort } from "./ports.ts";

const { Pool } = pg;
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const migrationPath = path.join(
  root,
  "database",
  "miniapp",
  "migrations",
  "001_demo_baseline.sql",
);
const DEMO_USER_ID = "user:demo-local";

export interface AdminSpotPatch {
  name?: string;
  region?: string;
  status?: SpotSummary["status"];
  visibilityPolicy?: SpotSummary["visibilityPolicy"];
  wgs84?: { latitude: number; longitude: number; source: SourceSummary };
  facilities?: readonly FacilityEvidence[];
  media?: readonly RepresentativeMedia[];
  guides?: readonly GuideArticle[];
  siteSafety?: readonly string[];
  reason: string;
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class PostgresMiniappRepository implements MiniappRepositoryPort {
  readonly kind = "postgres" as const;
  readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 8,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      application_name: "starward-miniapp-api",
    });
  }

  async initialize({ migrate = false }: { migrate?: boolean } = {}) {
    if (migrate) await this.pool.query(await readFile(migrationPath, "utf8"));
    const migration = await this.pool.query<{ exists: boolean }>(
      "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists",
    );
    if (!migration.rows[0]?.exists)
      throw new Error("postgres_schema_missing_run_migrations");
    await this.#seedDemoBaseline();
    return this;
  }

  async #seedDemoBaseline() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO users(user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [DEMO_USER_ID],
      );
      await client.query(
        `INSERT INTO user_preferences(user_id, payload, revision)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id) DO NOTHING`,
        [DEMO_USER_ID, DEFAULT_USER_PREFERENCES],
      );
      await client.query(
        `INSERT INTO rule_versions(rule_version, state, payload)
         VALUES ($1, 'ACTIVE', $2)
         ON CONFLICT (rule_version) DO UPDATE SET payload = EXCLUDED.payload`,
        [
          "starward-tonight-decision-v1-hard-blocker-first",
          {
            hardBlockersFirst: true,
            aiMayOverride: false,
            source: "Technical V2.0 section 12",
          },
        ],
      );
      for (const [flagKey, value] of Object.entries(DEMO_FEATURE_FLAGS))
        await client.query(
          `INSERT INTO feature_flags(flag_key, payload)
           VALUES ($1, $2)
           ON CONFLICT (flag_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
          [flagKey, { value }],
        );

      for (const [index, spot] of DEMO_SPOTS.entries()) {
        const detail = buildDemoSpotDetail(spot.spotId);
        if (!detail) throw new Error(`demo_detail_missing:${spot.spotId}`);
        const sources = [
          spot.source,
          spot.lightPollution.source,
          ...spot.facilities.map((facility) => facility.source),
          ...detail.guides.map((guide) => guide.source),
        ];
        for (const source of sources)
          await client.query(
            `INSERT INTO data_source_registry(source_id, provider, license, license_url, payload)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (source_id) DO UPDATE SET
               provider = EXCLUDED.provider,
               license = EXCLUDED.license,
               license_url = EXCLUDED.license_url,
               payload = EXCLUDED.payload,
               updated_at = now()`,
            [
              source.id,
              source.provider,
              source.license,
              source.licenseUrl,
              source,
            ],
          );
        await client.query(
          `INSERT INTO spots(
             spot_id, name, region, timezone, geom_wgs84, gcj02_lat, gcj02_lng,
             status, visibility_policy, source_id, payload, display_order
           ) VALUES (
             $1, $2, $3, $4,
             ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
             $7, $8, $9, $10, $11, $12, $13
           ) ON CONFLICT (spot_id) DO UPDATE SET
             name = EXCLUDED.name,
             region = EXCLUDED.region,
             timezone = EXCLUDED.timezone,
             geom_wgs84 = EXCLUDED.geom_wgs84,
             gcj02_lat = EXCLUDED.gcj02_lat,
             gcj02_lng = EXCLUDED.gcj02_lng,
             status = EXCLUDED.status,
             visibility_policy = EXCLUDED.visibility_policy,
             source_id = EXCLUDED.source_id,
             payload = EXCLUDED.payload,
             display_order = EXCLUDED.display_order,
             version = spots.version + CASE
               WHEN spots.payload IS DISTINCT FROM EXCLUDED.payload THEN 1
               ELSE 0
             END,
             updated_at = CASE
               WHEN spots.payload IS DISTINCT FROM EXCLUDED.payload THEN now()
               ELSE spots.updated_at
             END`,
          [
            spot.spotId,
            spot.name,
            spot.region,
            spot.timezone,
            spot.wgs84.longitude,
            spot.wgs84.latitude,
            spot.gcj02.latitude,
            spot.gcj02.longitude,
            spot.status,
            spot.visibilityPolicy,
            spot.source.id,
            spot,
            index,
          ],
        );
        for (const facility of spot.facilities)
          await client.query(
            `INSERT INTO spot_facilities(spot_id, facility_type, state, source_id, payload)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (spot_id, facility_type) DO UPDATE SET
               state = EXCLUDED.state,
               source_id = EXCLUDED.source_id,
               payload = EXCLUDED.payload`,
            [
              spot.spotId,
              facility.type,
              facility.status,
              facility.source.id,
              facility,
            ],
          );
        for (const media of spot.media)
          await client.query(
            `INSERT INTO spot_media(media_id, spot_id, source_url, license, site_specific, payload)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (media_id) DO UPDATE SET
               spot_id = EXCLUDED.spot_id,
               source_url = EXCLUDED.source_url,
               license = EXCLUDED.license,
               site_specific = EXCLUDED.site_specific,
               payload = EXCLUDED.payload`,
            [
              `${spot.spotId}:${media.id}`,
              spot.spotId,
              media.sourceUrl,
              media.license,
              media.isSiteSpecific,
              media,
            ],
          );
        for (const guide of detail.guides) {
          await client.query(
            `INSERT INTO articles(article_id, state, source_id, payload)
             VALUES ($1, 'PUBLISHED', $2, $3)
             ON CONFLICT (article_id) DO UPDATE SET
               state = EXCLUDED.state,
               source_id = EXCLUDED.source_id,
               payload = EXCLUDED.payload,
               updated_at = now()`,
            [guide.articleId, guide.source.id, guide],
          );
          await client.query(
            `INSERT INTO article_spots(article_id, spot_id) VALUES ($1, $2)
             ON CONFLICT (article_id, spot_id) DO NOTHING`,
            [guide.articleId, spot.spotId],
          );
        }
        await client.query(
          `INSERT INTO light_pollution_samples(spot_id, dataset_version, state, payload)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (spot_id, dataset_version) DO UPDATE SET
             state = EXCLUDED.state,
             payload = EXCLUDED.payload`,
          [
            spot.spotId,
            spot.lightPollution.datasetVersion,
            spot.lightPollution.state,
            spot.lightPollution,
          ],
        );
        await client.query(
          `INSERT INTO spot_overview_read_models(spot_id, payload, dependency_digest)
           VALUES ($1, $2, $3)
           ON CONFLICT (spot_id) DO UPDATE SET
             payload = EXCLUDED.payload,
             dependency_digest = EXCLUDED.dependency_digest,
             generated_at = now()`,
          [spot.spotId, detail, digest(detail)],
        );
        for (const table of ["map_spot_summaries", "favorite_spot_summaries"])
          await client.query(
            `INSERT INTO ${table}(spot_id, payload)
             VALUES ($1, $2)
             ON CONFLICT (spot_id) DO UPDATE SET payload = EXCLUDED.payload, generated_at = now()`,
            [spot.spotId, spot],
          );
        await client.query(
          `INSERT INTO spot_access_profiles(spot_id, payload)
           VALUES ($1, $2)
           ON CONFLICT (spot_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
          [
            spot.spotId,
            {
              route: detail.route,
              accessTags: spot.accessTags,
              state: detail.route.state,
            },
          ],
        );
        await client.query(
          `INSERT INTO spot_horizon_profiles(spot_id, payload)
           VALUES ($1, $2)
           ON CONFLICT (spot_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
          [
            spot.spotId,
            {
              obstructionPercent: spot.obstructionPercent,
              clearDirections: spot.clearDirections,
              state: "UNAVAILABLE",
            },
          ],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listSpots(): Promise<readonly SpotSummary[]> {
    const result = await this.pool.query<{ payload: SpotSummary }>(
      "SELECT payload FROM spots WHERE visibility_policy <> 'HIDDEN' ORDER BY display_order",
    );
    return result.rows.map((row) => clone(row.payload));
  }

  async listSpotsInRadius(
    center: { system: "WGS84"; latitude: number; longitude: number },
    radiusKm: number,
  ): Promise<readonly SpotSummary[]> {
    const result = await this.pool.query<{ payload: SpotSummary }>(
      `SELECT payload FROM spots
        WHERE visibility_policy <> 'HIDDEN'
          AND ST_DWithin(
            geom_wgs84,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
        ORDER BY display_order`,
      [center.longitude, center.latitude, radiusKm * 1_000],
    );
    return result.rows.map((row) => clone(row.payload));
  }

  async getSpot(spotId: SpotId): Promise<SpotSummary | null> {
    const result = await this.pool.query<{ payload: SpotSummary }>(
      "SELECT payload FROM spots WHERE spot_id = $1",
      [spotId],
    );
    return result.rows[0] ? clone(result.rows[0].payload) : null;
  }

  async getDetail(spotId: SpotId): Promise<SpotDetail | null> {
    const result = await this.pool.query<{ payload: SpotDetail }>(
      "SELECT payload FROM spot_overview_read_models WHERE spot_id = $1",
      [spotId],
    );
    return result.rows[0] ? clone(result.rows[0].payload) : null;
  }

  async getPreferences(): Promise<UserPreferencesRecord> {
    const result = await this.pool.query<{
      payload: UserPreferences;
      revision: number;
      updated_at: Date;
    }>(
      "SELECT payload, revision, updated_at FROM user_preferences WHERE user_id = $1",
      [DEMO_USER_ID],
    );
    const row = result.rows[0];
    if (!row) throw new Error("user_preferences_not_found");
    return {
      preferences: clone(row.payload),
      revision: row.revision,
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async savePreferences(
    preferences: UserPreferences,
    expectedRevision: number,
    idempotencyKey: string,
  ): Promise<UserPreferencesRecord> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<UserPreferencesRecord>(
        client,
        idempotencyKey,
      );
      if (replay) return replay;
      const existing = await client.query<{
        revision: number;
      }>(
        "SELECT revision FROM user_preferences WHERE user_id = $1 FOR UPDATE",
        [DEMO_USER_ID],
      );
      const currentRevision = existing.rows[0]?.revision;
      if (currentRevision === undefined)
        throw new Error("user_preferences_not_found");
      if (currentRevision !== expectedRevision)
        throw new Error("preferences_revision_conflict");
      const record: UserPreferencesRecord = {
        preferences: clone(preferences),
        revision: currentRevision + 1,
        updatedAt: new Date().toISOString(),
      };
      await client.query(
        `UPDATE user_preferences
         SET payload = $2, revision = $3, updated_at = $4
         WHERE user_id = $1`,
        [DEMO_USER_ID, record.preferences, record.revision, record.updatedAt],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "preferences.save",
        response: record,
        eventType: "UserPreferencesUpdated",
        payload: { userId: DEMO_USER_ID, revision: record.revision },
      });
      return record;
    });
  }

  async listFavoriteIds(): Promise<readonly SpotId[]> {
    const result = await this.pool.query<{ spot_id: SpotId }>(
      "SELECT spot_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC",
      [DEMO_USER_ID],
    );
    return result.rows.map((row) => row.spot_id);
  }

  async setFavorite(
    spotId: SpotId,
    favorite: boolean,
    idempotencyKey: string,
  ): Promise<void> {
    await this.#transaction(async (client) => {
      if (await this.#replay(client, idempotencyKey)) return;
      const exists = await client.query("SELECT 1 FROM spots WHERE spot_id = $1", [
        spotId,
      ]);
      if (!exists.rowCount) throw new Error("formal_spot_not_found");
      if (favorite)
        await client.query(
          `INSERT INTO favorites(user_id, spot_id) VALUES ($1, $2)
           ON CONFLICT (user_id, spot_id) DO NOTHING`,
          [DEMO_USER_ID, spotId],
        );
      else
        await client.query(
          "DELETE FROM favorites WHERE user_id = $1 AND spot_id = $2",
          [DEMO_USER_ID, spotId],
        );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "favorite.set",
        response: { spotId, favorite },
        eventType: favorite ? "FavoriteCreated" : "FavoriteRemoved",
        payload: { userId: DEMO_USER_ID, spotId, favorite },
      });
    });
  }

  async listPlans(): Promise<readonly ObservationPlan[]> {
    const result = await this.pool.query<{ payload: ObservationPlan }>(
      "SELECT payload FROM observation_plans WHERE user_id = $1 ORDER BY updated_at DESC",
      [DEMO_USER_ID],
    );
    return result.rows.map((row) => clone(row.payload));
  }

  async savePlan(
    plan: ObservationPlan,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ObservationPlan> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<ObservationPlan>(client, idempotencyKey);
      if (replay) return replay;
      const spot = await client.query("SELECT 1 FROM spots WHERE spot_id = $1", [
        plan.spotId,
      ]);
      if (!spot.rowCount) throw new Error("formal_spot_not_found");
      const existing = await client.query<{ revision: number }>(
        "SELECT revision FROM observation_plans WHERE plan_id = $1 FOR UPDATE",
        [plan.planId],
      );
      const currentRevision = existing.rows[0]?.revision ?? 0;
      if (expectedRevision !== null && currentRevision !== expectedRevision)
        throw new Error("plan_revision_conflict");
      const saved: ObservationPlan = {
        ...plan,
        planId: (plan.planId || `plan:${randomUUID()}`) as PlanId,
        revision: currentRevision + 1,
        updatedAt: new Date().toISOString(),
      };
      await client.query(
        `INSERT INTO observation_plans(
           plan_id, user_id, spot_id, local_date, local_time, notes, revision, payload, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (plan_id) DO UPDATE SET
           spot_id = EXCLUDED.spot_id,
           local_date = EXCLUDED.local_date,
           local_time = EXCLUDED.local_time,
           notes = EXCLUDED.notes,
           revision = EXCLUDED.revision,
           payload = EXCLUDED.payload,
           updated_at = EXCLUDED.updated_at`,
        [
          saved.planId,
          DEMO_USER_ID,
          saved.spotId,
          saved.localDate,
          saved.localTime,
          saved.notes,
          saved.revision,
          saved,
          saved.updatedAt,
        ],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "plan.save",
        response: saved,
        eventType: existing.rowCount
          ? "ObservationPlanUpdated"
          : "ObservationPlanCreated",
        payload: saved,
      });
      return clone(saved);
    });
  }

  async deletePlan(planId: string, idempotencyKey: string): Promise<void> {
    await this.#transaction(async (client) => {
      if (await this.#replay(client, idempotencyKey)) return;
      await client.query(
        "DELETE FROM observation_plans WHERE plan_id = $1 AND user_id = $2",
        [planId, DEMO_USER_ID],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "plan.delete",
        response: { planId, deleted: true },
        eventType: "ObservationPlanDeleted",
        payload: { userId: DEMO_USER_ID, planId },
      });
    });
  }

  async listProfileLinks(): Promise<readonly ProfileLink[]> {
    const result = await this.pool.query<{ payload: ProfileLink }>(
      "SELECT payload FROM user_profile_links WHERE user_id = $1 ORDER BY sort_order",
      [DEMO_USER_ID],
    );
    return result.rows.map((row) => clone(row.payload));
  }

  async saveProfileLink(
    link: ProfileLink,
    idempotencyKey: string,
  ): Promise<ProfileLink> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<ProfileLink>(client, idempotencyKey);
      if (replay) return replay;
      await client.query(
        `INSERT INTO user_profile_links(
           profile_link_id, user_id, platform, url, visibility, sort_order, payload, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (profile_link_id) DO UPDATE SET
           platform = EXCLUDED.platform,
           url = EXCLUDED.url,
           visibility = EXCLUDED.visibility,
           sort_order = EXCLUDED.sort_order,
           payload = EXCLUDED.payload,
           updated_at = EXCLUDED.updated_at`,
        [
          link.profileLinkId,
          DEMO_USER_ID,
          link.platform,
          link.url,
          link.visibility,
          link.sortOrder,
          link,
          link.updatedAt,
        ],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "profile-link.save",
        response: link,
        eventType: "ProfileLinkSaved",
        payload: { userId: DEMO_USER_ID, profileLinkId: link.profileLinkId },
      });
      return clone(link);
    });
  }

  async deleteProfileLink(id: string, idempotencyKey: string): Promise<void> {
    await this.#transaction(async (client) => {
      if (await this.#replay(client, idempotencyKey)) return;
      await client.query(
        "DELETE FROM user_profile_links WHERE profile_link_id = $1 AND user_id = $2",
        [id, DEMO_USER_ID],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "profile-link.delete",
        response: { profileLinkId: id, deleted: true },
        eventType: "ProfileLinkDeleted",
        payload: { userId: DEMO_USER_ID, profileLinkId: id },
      });
    });
  }

  async saveImportDraft(
    draft: ImportDraft,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ImportDraft> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<ImportDraft>(client, idempotencyKey);
      if (replay) return replay;
      const existing = await client.query<{ revision: number }>(
        "SELECT revision FROM external_post_import_drafts WHERE import_id = $1 FOR UPDATE",
        [draft.importDraftId],
      );
      const currentRevision = existing.rows[0]?.revision ?? 0;
      if (expectedRevision !== null && currentRevision !== expectedRevision)
        throw new Error("import_revision_conflict");
      const saved = { ...draft, revision: currentRevision + 1 };
      await client.query(
        `INSERT INTO external_post_imports(
           import_id, user_id, platform, original_url, rights_confirmed,
           parse_state, moderation_state, spot_id, spot_proposal_id, payload
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (import_id) DO UPDATE SET
           rights_confirmed = EXCLUDED.rights_confirmed,
           parse_state = EXCLUDED.parse_state,
           moderation_state = EXCLUDED.moderation_state,
           spot_id = EXCLUDED.spot_id,
           spot_proposal_id = EXCLUDED.spot_proposal_id,
           payload = EXCLUDED.payload`,
        [
          saved.importDraftId,
          DEMO_USER_ID,
          saved.platform,
          saved.originalUrl,
          saved.rightsConfirmed,
          saved.parseState,
          saved.moderationState,
          saved.spotId,
          saved.spotProposalId,
          saved,
        ],
      );
      await client.query(
        `INSERT INTO external_post_import_drafts(import_id, stage, revision, payload)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (import_id) DO UPDATE SET
           stage = EXCLUDED.stage,
           revision = EXCLUDED.revision,
           payload = EXCLUDED.payload,
           updated_at = now()`,
        [saved.importDraftId, saved.stage, saved.revision, saved],
      );
      if (saved.spotProposalId)
        await client.query(
          `INSERT INTO spot_proposals(proposal_id, user_id, state, payload)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (proposal_id) DO UPDATE SET state = EXCLUDED.state, payload = EXCLUDED.payload`,
          [
            saved.spotProposalId,
            DEMO_USER_ID,
            saved.proposalReviewState,
            {
              sourceImportId: saved.importDraftId,
              originalUrl: saved.originalUrl,
              state: saved.proposalReviewState,
            },
          ],
        );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "import-draft.save",
        response: saved,
        eventType:
          saved.stage === "SUBMIT" ? "FieldReportSubmitted" : "ImportDraftSaved",
        payload: {
          importDraftId: saved.importDraftId,
          revision: saved.revision,
          stage: saved.stage,
        },
      });
      if (saved.stage === "SUBMIT")
        await client.query(
          `INSERT INTO moderation_cases(case_id, subject_type, subject_id, state, payload)
           VALUES ($1, 'EXTERNAL_POST_IMPORT', $2, 'PENDING', $3)
           ON CONFLICT (case_id) DO NOTHING`,
          [
            `moderation:${saved.importDraftId}`,
            saved.importDraftId,
            {
              sourceLineagePreserved: true,
              visibility: saved.visibility.value,
              mediaPolicy: "private-scan-strip-exif-quarantine",
            },
          ],
        );
      return clone(saved);
    });
  }

  async listImportDrafts(): Promise<readonly ImportDraft[]> {
    const result = await this.pool.query<{ payload: ImportDraft }>(
      `SELECT d.payload
         FROM external_post_import_drafts d
         JOIN external_post_imports i ON i.import_id = d.import_id
        WHERE i.user_id = $1
        ORDER BY i.created_at DESC`,
      [DEMO_USER_ID],
    );
    return result.rows.map((row) => clone(row.payload));
  }

  async getImportDraft(id: string): Promise<ImportDraft | null> {
    const result = await this.pool.query<{ payload: ImportDraft }>(
      "SELECT payload FROM external_post_import_drafts WHERE import_id = $1",
      [id],
    );
    return result.rows[0] ? clone(result.rows[0].payload) : null;
  }

  async operationsSnapshot() {
    const result = await this.pool.query<{
      favorites: string;
      plans: string;
      links: string;
      imports: string;
      pending_outbox: string;
      dead_letter: string;
    }>(`SELECT
      (SELECT count(*) FROM favorites)::text AS favorites,
      (SELECT count(*) FROM observation_plans)::text AS plans,
      (SELECT count(*) FROM user_profile_links)::text AS links,
      (SELECT count(*) FROM external_post_imports)::text AS imports,
      (SELECT count(*) FROM outbox_events WHERE state IN ('PENDING', 'DISPATCHED'))::text AS pending_outbox,
      (SELECT count(*) FROM outbox_events WHERE state = 'DEAD_LETTER')::text AS dead_letter`);
    const row = result.rows[0]!;
    return {
      repository: this.kind,
      postgis: true,
      counts: Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, Number(value)]),
      ),
      persistence: "postgresql_postgis",
    };
  }

  async adminListSpots() {
    const result = await this.pool.query<{
      spot_id: string;
      name: string;
      region: string;
      status: string;
      visibility_policy: string;
      version: number;
      longitude: number;
      latitude: number;
      payload: SpotSummary;
    }>(`SELECT spot_id, name, region, status, visibility_policy, version,
               ST_X(geom_wgs84::geometry) AS longitude,
               ST_Y(geom_wgs84::geometry) AS latitude,
               payload
          FROM spots
         ORDER BY display_order`);
    return result.rows;
  }

  async adminPatchSpot(input: {
    spotId: SpotId;
    patch: AdminSpotPatch;
    actorId: string;
    requestId: string;
  }) {
    return this.#transaction(async (client) => {
      const selected = await client.query<{
        payload: SpotSummary;
        detail: SpotDetail;
        status: SpotSummary["status"];
      }>(
        `SELECT s.payload, r.payload AS detail, s.status
           FROM spots s
           JOIN spot_overview_read_models r USING (spot_id)
          WHERE s.spot_id = $1
          FOR UPDATE`,
        [input.spotId],
      );
      const current = selected.rows[0];
      if (!current) throw new Error("formal_spot_not_found");
      const nextSpot = clone(current.payload);
      if (input.patch.name !== undefined) nextSpot.name = input.patch.name;
      if (input.patch.region !== undefined) nextSpot.region = input.patch.region;
      if (input.patch.status !== undefined) nextSpot.status = input.patch.status;
      if (input.patch.visibilityPolicy !== undefined)
        nextSpot.visibilityPolicy = input.patch.visibilityPolicy;
      if (input.patch.wgs84) {
        const view = createMapCoordinateView({
          authoritative: {
            lat: input.patch.wgs84.latitude,
            lon: input.patch.wgs84.longitude,
            system: "WGS84",
          },
        });
        nextSpot.wgs84 = {
          system: "WGS84",
          latitude: view.authoritative.lat,
          longitude: view.authoritative.lon,
        };
        nextSpot.gcj02 = {
          system: "GCJ02",
          latitude: view.display.lat,
          longitude: view.display.lon,
          derivedFrom: "WGS84",
          transformVersion: view.conversionVersion,
        };
        const source = input.patch.wgs84.source;
        await client.query(
          `INSERT INTO data_source_registry(source_id, provider, license, license_url, payload)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (source_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
          [source.id, source.provider, source.license, source.licenseUrl, source],
        );
        await client.query(
          `INSERT INTO spot_verifications(
             verification_id, spot_id, source_id, state, payload, verified_at
           ) VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (verification_id) DO NOTHING`,
          [
            `verification:${input.requestId}`,
            input.spotId,
            source.id,
            source.state,
            { reason: input.patch.reason, coordinate: nextSpot.wgs84 },
            source.retrievedAt,
          ],
        );
      }
      if (input.patch.facilities)
        nextSpot.facilities = input.patch.facilities.map(clone);
      if (input.patch.media) nextSpot.media = input.patch.media.map(clone);
      const nextDetail: SpotDetail = {
        ...clone(current.detail),
        spot: nextSpot,
        ...(input.patch.guides
          ? { guides: input.patch.guides.map(clone) }
          : {}),
        ...(input.patch.siteSafety
          ? { siteSafety: [...input.patch.siteSafety] }
          : {}),
      };
      await client.query(
        `UPDATE spots SET
           name = $2,
           region = $3,
           status = $4,
           visibility_policy = $5,
           geom_wgs84 = ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
           gcj02_lat = $8,
           gcj02_lng = $9,
           payload = $10,
           version = version + 1,
           updated_at = now()
         WHERE spot_id = $1`,
        [
          input.spotId,
          nextSpot.name,
          nextSpot.region,
          nextSpot.status,
          nextSpot.visibilityPolicy,
          nextSpot.wgs84.longitude,
          nextSpot.wgs84.latitude,
          nextSpot.gcj02.latitude,
          nextSpot.gcj02.longitude,
          nextSpot,
        ],
      );
      await client.query(
        `UPDATE spot_overview_read_models
            SET payload = $2, dependency_digest = $3, generated_at = now()
          WHERE spot_id = $1`,
        [input.spotId, nextDetail, digest(nextDetail)],
      );
      for (const table of ["map_spot_summaries", "favorite_spot_summaries"])
        await client.query(
          `UPDATE ${table} SET payload = $2, generated_at = now() WHERE spot_id = $1`,
          [input.spotId, nextSpot],
        );
      if (input.patch.facilities) {
        await client.query("DELETE FROM spot_facilities WHERE spot_id = $1", [
          input.spotId,
        ]);
        for (const facility of nextSpot.facilities) {
          await client.query(
            `INSERT INTO data_source_registry(source_id, provider, license, license_url, payload)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (source_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
            [
              facility.source.id,
              facility.source.provider,
              facility.source.license,
              facility.source.licenseUrl,
              facility.source,
            ],
          );
          await client.query(
            `INSERT INTO spot_facilities(spot_id, facility_type, state, source_id, payload)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              input.spotId,
              facility.type,
              facility.status,
              facility.source.id,
              facility,
            ],
          );
        }
      }
      if (input.patch.media) {
        await client.query("DELETE FROM spot_media WHERE spot_id = $1", [
          input.spotId,
        ]);
        for (const media of nextSpot.media)
          await client.query(
            `INSERT INTO spot_media(media_id, spot_id, source_url, license, site_specific, payload)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              `${input.spotId}:${media.id}`,
              input.spotId,
              media.sourceUrl,
              media.license,
              media.isSiteSpecific,
              media,
            ],
          );
      }
      if (input.patch.guides) {
        await client.query(
          "DELETE FROM article_spots WHERE spot_id = $1",
          [input.spotId],
        );
        for (const guide of nextDetail.guides) {
          await client.query(
            `INSERT INTO data_source_registry(source_id, provider, license, license_url, payload)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (source_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
            [
              guide.source.id,
              guide.source.provider,
              guide.source.license,
              guide.source.licenseUrl,
              guide.source,
            ],
          );
          await client.query(
            `INSERT INTO articles(article_id, state, source_id, payload)
             VALUES ($1, 'PUBLISHED', $2, $3)
             ON CONFLICT (article_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
            [guide.articleId, guide.source.id, guide],
          );
          await client.query(
            "INSERT INTO article_spots(article_id, spot_id) VALUES ($1, $2)",
            [guide.articleId, input.spotId],
          );
        }
      }
      if (current.status !== nextSpot.status)
        await client.query(
          `INSERT INTO spot_status_history(
             history_id, spot_id, prior_status, next_status, reason, actor_id
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            randomUUID(),
            input.spotId,
            current.status,
            nextSpot.status,
            input.patch.reason,
            input.actorId,
          ],
        );
      await client.query(
        `INSERT INTO audit_logs(
           audit_id, actor_id, action, subject_type, subject_id, request_id,
           before_payload, after_payload
         ) VALUES ($1, $2, 'SPOT_PATCH', 'SPOT', $3, $4, $5, $6)`,
        [
          randomUUID(),
          input.actorId,
          input.spotId,
          input.requestId,
          current.detail,
          nextDetail,
        ],
      );
      return nextDetail;
    });
  }

  async adminListArticles() {
    return (
      await this.pool.query(
        "SELECT article_id, state, payload, updated_at FROM articles ORDER BY updated_at DESC",
      )
    ).rows;
  }

  async adminListModerationCases() {
    return (
      await this.pool.query(
        "SELECT case_id, subject_type, subject_id, state, payload, created_at, resolved_at FROM moderation_cases ORDER BY created_at DESC",
      )
    ).rows;
  }

  async adminResolveModeration(input: {
    caseId: string;
    resolution: "APPROVED" | "REJECTED";
    reason: string;
    actorId: string;
    requestId: string;
  }) {
    return this.#transaction(async (client) => {
      const before = await client.query(
        "SELECT * FROM moderation_cases WHERE case_id = $1 FOR UPDATE",
        [input.caseId],
      );
      if (!before.rows[0]) throw new Error("moderation_case_not_found");
      const after = await client.query(
        `UPDATE moderation_cases
            SET state = $2, resolved_at = now(),
                payload = payload || jsonb_build_object('resolutionReason', $3)
          WHERE case_id = $1
          RETURNING *`,
        [input.caseId, input.resolution, input.reason],
      );
      await client.query(
        `INSERT INTO audit_logs(
           audit_id, actor_id, action, subject_type, subject_id, request_id,
           before_payload, after_payload
         ) VALUES ($1, $2, 'MODERATION_RESOLVE', 'MODERATION_CASE', $3, $4, $5, $6)`,
        [
          randomUUID(),
          input.actorId,
          input.caseId,
          input.requestId,
          before.rows[0],
          after.rows[0],
        ],
      );
      return after.rows[0];
    });
  }

  async adminOperations() {
    const [sources, health, costs, decisions, audits, jobs] = await Promise.all([
      this.pool.query(
        "SELECT source_id, provider, license, license_url, payload, updated_at FROM data_source_registry ORDER BY provider, source_id",
      ),
      this.pool.query(
        "SELECT provider, state, failure_code, checked_at, payload FROM provider_health_checks ORDER BY provider",
      ),
      this.pool.query(`SELECT provider, capability,
        count(*)::integer AS calls,
        coalesce(sum(estimated_cost_cny), 0)::text AS estimated_cost_cny
        FROM vendor_call_usage GROUP BY provider, capability ORDER BY provider, capability`),
      this.pool.query(
        "SELECT snapshot_id, spot_id, local_date, rule_version, input_digest, source_snapshot_ids, payload, generated_at FROM tonight_decision_snapshots ORDER BY generated_at DESC LIMIT 100",
      ),
      this.pool.query(
        "SELECT audit_id, actor_id, action, subject_type, subject_id, request_id, occurred_at FROM audit_logs ORDER BY occurred_at DESC LIMIT 200",
      ),
      this.pool.query(
        "SELECT job_kind, state, count(*)::integer AS count FROM job_executions GROUP BY job_kind, state ORDER BY job_kind, state",
      ),
    ]);
    return {
      dataSources: sources.rows,
      providerHealth: health.rows,
      costs: costs.rows,
      decisions: decisions.rows,
      audits: audits.rows,
      jobs: jobs.rows,
    };
  }

  async close() {
    await this.pool.end();
  }

  async #transaction<T>(operation: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async #replay<T = unknown>(client: PoolClient, key: string) {
    const result = await client.query<{ response: T }>(
      "SELECT response FROM idempotency_records WHERE idempotency_key = $1",
      [key],
    );
    return result.rows[0]?.response ?? null;
  }

  async #recordMutation(
    client: PoolClient,
    input: {
      idempotencyKey: string;
      operation: string;
      response: unknown;
      eventType: string;
      payload: unknown;
    },
  ) {
    await client.query(
      `INSERT INTO idempotency_records(idempotency_key, operation, response)
       VALUES ($1, $2, $3)`,
      [input.idempotencyKey, input.operation, input.response],
    );
    await client.query(
      `INSERT INTO outbox_events(event_id, event_type, idempotency_key, payload)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), input.eventType, input.idempotencyKey, input.payload],
    );
  }
}
