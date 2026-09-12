import type { AccountProfileRecord } from "@starward/miniapp-contracts";
import { createHash, randomUUID } from "node:crypto";
import { assertContributionBaselineMatches, assertContributionSubmittable, assertContributionUploadFits } from "./contribution-validation.ts";
import {
  appendContributionAttempt,
  appendCandidateProfileMedia,
  isContributionEditable,
  normalizeContributionAttempts,
  reviewLatestContributionAttempt,
  removeCandidateProfileMedia,
} from "./contribution-attempts.ts";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cloneUserPreferences,
  DEFAULT_USER_PREFERENCES,
  type AccountDeletionReceipt,
  type AccessAndSafetyState,
  type ContributionId,
  type ContributionMediaUpload,
  type ContributionStatusHistoryEntry,
  type ContributionSubmission,
  type ContributionFormalSubmitRequest,
  type ContributionFormalSubmitResult,
  type ContributionFormalUploadIntent,
  type ContributionFormalMediaUpload,
  type ContributionTopic,
  type ContributionUploadId,
  type FactEvidence,
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
  type AdminMutationResult,
  type MergeClaimPreview,
  type MergePreview,
  type MediaReviewView,
  type ModerationCaseView,
  type ModerationQueueItem,
  type OperationReceipt,
  type PublicationAssessment,
  type ReplacementImpact,
  type UserPreferences,
  type UserPreferencesRecord,
  type UserId,
} from "@starward/miniapp-contracts";
import { createMapCoordinateView } from "@starward/coordinate-system";
import pg, { type PoolClient } from "pg";
import { assertReceiptNotErased, eraseAccountContributionEvidence } from "./account-data-erasure.ts";
import { derivePlanReminderSchedules, type StoredPlanReminderSchedule } from "./plan-reminder-schedule.ts";
import { contributionFormalBaseline } from "./contribution-formal-baseline.ts";
import { buildFormalContributionResult } from "./formal-contribution-submission.ts";
import type {
  DarkSkyGridCellRecord,
  AdminOperationsPort,
  MiniappRepositoryPort,
} from "./ports.ts";
import {
  evaluateSpotCompleteness,
  SpotPublicationBlockedError,
} from "./spot-completeness-policy.ts";
import {
  listMigrationVersions,
  runPostgresMigrations,
} from "./migration-runner.ts";

const { Pool } = pg;
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const migrationDir = path.join(
  root,
  "database",
  "miniapp",
  "migrations",
);

async function migrationVersions() {
  return listMigrationVersions(migrationDir);
}

export interface AdminSpotPatch {
  name?: string;
  region?: string;
  address?: SpotSummary["address"];
  timezone?: SpotSummary["timezone"];
  altitudeM?: SpotSummary["altitudeM"];
  status?: SpotSummary["status"];
  visibilityPolicy?: SpotSummary["visibilityPolicy"];
  wgs84?: { latitude: number; longitude: number; source: SourceSummary };
  lastVerifiedAt?: SpotSummary["lastVerifiedAt"];
  lightPollution?: SpotSummary["lightPollution"];
  obstructionPercent?: SpotSummary["obstructionPercent"];
  clearDirections?: SpotSummary["clearDirections"];
  accessTags?: SpotSummary["accessTags"];
  facilities?: readonly FacilityEvidence[];
  media?: readonly RepresentativeMedia[];
  guides?: readonly GuideArticle[];
  route?: SpotDetail["route"];
  accessAndSafety?: SpotDetail["accessAndSafety"];
  siteMediaState?: SpotDetail["siteMediaState"];
  evidence?: SpotDetail["evidence"];
  dataDisclosure?: SpotDetail["dataDisclosure"];
  reason: string;
}

export interface AdminSpotCandidateInput {
  spotId?: string;
  name: string;
  region: string;
  address: string;
  timezone: SpotSummary["timezone"];
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  visibilityPolicy: SpotSummary["visibilityPolicy"];
  source: SourceSummary;
  reason: string;
}

export type AdminContributionEvidenceClaim =
  | "ACCESS_LAST_ROAD"
  | "ACCESS_PARKING"
  | "FACILITY_STATUS"
  | "ACCESS_OPENNESS"
  | "ACCESS_LEGAL_ENTRY"
  | "SAFETY_NIGHT"
  | "HORIZON_PROFILE"
  | "SPOT_DETAILS"
  | "SITE_MEDIA_PROVENANCE";

const CONTRIBUTION_TOPIC_CLAIMS = {
  LAST_ROAD: ["ACCESS_LAST_ROAD"],
  PARKING: ["ACCESS_PARKING"],
  FACILITIES: ["FACILITY_STATUS"],
  OPENNESS: ["ACCESS_OPENNESS"],
  LEGAL_ACCESS: ["ACCESS_LEGAL_ENTRY"],
  NIGHT_SAFETY: ["SAFETY_NIGHT"],
  HORIZON: ["HORIZON_PROFILE"],
  SITE_MEDIA: ["SITE_MEDIA_PROVENANCE"],
  OTHER: ["SPOT_DETAILS"],
} as const satisfies Record<
  ContributionTopic,
  readonly AdminContributionEvidenceClaim[]
>;

const FORMAL_FIELD_TOPIC = {
  address: "OTHER", name: "OTHER", detail: "OTHER",
  openness: "OPENNESS", hours: "OPENNESS",
  access: "LEGAL_ACCESS", accessNote: "LEGAL_ACCESS", camping: "LEGAL_ACCESS", contact: "LEGAL_ACCESS",
  road: "LAST_ROAD", safety: "NIGHT_SAFETY",
  parking: "PARKING", parkingNote: "PARKING",
  toilet: "FACILITIES", toiletNote: "FACILITIES", platform: "FACILITIES", signal: "FACILITIES",
  horizon: "HORIZON", light: "HORIZON",
} as const;

export function contributionResolvedProposal(submission: ContributionSubmission) {
  return submission.formalFeedback?.resolvedProposal ??
    (submission.kind === "NEW_SPOT_PROPOSAL" ? submission.candidateProfile : undefined);
}

export function contributionAllowedMergeClaims(
  submission: ContributionSubmission,
): readonly AdminContributionEvidenceClaim[] {
  if (submission.kind !== "NEW_SPOT_PROPOSAL")
    return [...new Set(submission.topics.flatMap((topic) => CONTRIBUTION_TOPIC_CLAIMS[topic]))];
  const proposal = contributionResolvedProposal(submission);
  if (!proposal) return [];
  const claims: AdminContributionEvidenceClaim[] = Object.keys(proposal.fields).flatMap((key) => {
    const topic = FORMAL_FIELD_TOPIC[key as keyof typeof FORMAL_FIELD_TOPIC];
    return topic ? CONTRIBUTION_TOPIC_CLAIMS[topic] : [];
  });
  if (Object.values(proposal.media).some((ids) => Boolean(ids?.length)))
    claims.push("SITE_MEDIA_PROVENANCE");
  return [...new Set(claims)];
}

export function assertNewSpotContributionTarget(
  submission: ContributionSubmission,
  spot: SpotSummary,
) {
  if (submission.kind !== "NEW_SPOT_PROPOSAL") return;
  const candidate = submission.candidateLocation?.wgs84;
  if (
    !candidate ||
    candidate.system !== "WGS84" ||
    Math.abs(candidate.latitude - spot.wgs84.latitude) > 0.000001 ||
    Math.abs(candidate.longitude - spot.wgs84.longitude) > 0.000001
  )
    throw new Error("contribution_candidate_location_mismatch");
}

const CORE_FIELD_EVIDENCE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

const FACILITY_TYPES = [
  "PARKING",
  "TOILET",
  "PLATFORM",
  "CHARGING",
  "CAMPING",
  "ROAD",
  "WALKING",
  "SIGNAL",
] as const satisfies readonly FacilityEvidence["type"][];

function formalFacilityStatus(value: string | null): FacilityEvidence["status"] {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "UNKNOWN";
  if (normalized === "有" || normalized === "可用" || normalized === "开放") return "AVAILABLE";
  if (normalized === "没有" || normalized === "无" || normalized === "不可用" || normalized === "不开放") return "UNAVAILABLE";
  if (normalized === "季节性开放") return "SEASONAL";
  return "UNKNOWN";
}

function formalOpenness(value: string | null): AccessAndSafetyState["openness"] {
  if (value === "开放") return "OPEN";
  if (value === "有条件开放") return "CONDITIONAL";
  if (value === "不开放") return "CLOSED";
  return "UNKNOWN";
}

function formalLegalAccess(value: string | null): AccessAndSafetyState["legalAccess"] {
  if (value === "允许进入") return "PERMITTED";
  if (value === "需预约或其他条件") return "CONDITIONAL";
  if (value === "禁止进入") return "PROHIBITED";
  return "UNKNOWN";
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeContributionSubmission(
  value: ContributionSubmission,
): ContributionSubmission {
  const submissionState =
    value.submissionState ??
    (value.state === "APPROVED" ? "ACCEPTED" : value.state);
  return {
    ...normalizeContributionAttempts(value),
    submissionState,
    mergeState: value.mergeState ?? "NOT_STARTED",
    publicationImpact: value.publicationImpact ?? "NONE",
    statusHistory: value.statusHistory ?? [],
  };
}

function contributionEvent(
  axis: ContributionStatusHistoryEntry["axis"],
  from: string | null,
  to: string,
  reason: string | null,
  actorType: ContributionStatusHistoryEntry["actorType"],
): ContributionStatusHistoryEntry {
  return {
    eventId: `contribution-event:${randomUUID()}`,
    axis,
    from,
    to,
    reason,
    actorType,
    occurredAt: new Date().toISOString(),
  };
}

export function publishMergedNewSpotContribution(
  value: ContributionSubmission,
  spotId: SpotId,
  occurredAt: string,
  reason: string,
): ContributionSubmission | null {
  const submission = normalizeContributionSubmission(value);
  if (
    submission.kind !== "NEW_SPOT_PROPOSAL" ||
    submission.submissionState !== "ACCEPTED" ||
    submission.mergeState !== "MERGED"
  ) return null;
  if (submission.spotId !== spotId) throw new Error("contribution_publication_spot_mismatch");
  if (submission.publicationImpact === "SPOT_PUBLISHED") return null;
  return {
    ...submission,
    publicationImpact: "SPOT_PUBLISHED",
    revision: submission.revision + 1,
    updatedAt: occurredAt,
    statusHistory: [
      ...submission.statusHistory,
      {
        eventId: `contribution-event:${randomUUID()}`,
        axis: "PUBLICATION",
        from: submission.publicationImpact,
        to: "SPOT_PUBLISHED",
        reason,
        actorType: "OPERATOR",
        occurredAt,
      },
    ],
  };
}

function toModerationCaseView(
  row: {
    case_id: string;
    subject_type: string;
    subject_id: string;
    state: string;
    payload: Record<string, unknown>;
    created_at: string | Date;
    resolved_at: string | Date | null;
  },
  events: readonly ContributionStatusHistoryEntry[],
): ModerationCaseView {
  const rawSubmission = row.payload.submission as ContributionSubmission | undefined;
  const submission = rawSubmission
    ? normalizeContributionSubmission(rawSubmission)
    : null;
  return {
    caseId: row.case_id as ModerationCaseView["caseId"],
    subjectType: row.subject_type as ModerationCaseView["subjectType"],
    subjectId: row.subject_id,
    state: row.state as ModerationCaseView["state"],
    submission,
    events,
    immutableEvidence: {
      detail: submission?.detail ?? null,
      candidateLocation: submission?.candidateLocation ?? null,
      media: submission?.media ?? [],
    },
    canonicalMergeRequired: row.payload.canonicalMergeRequired === true,
    publicationGateRequired: row.payload.publicationGateRequired !== false,
    createdAt: new Date(row.created_at).toISOString(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
  };
}

function toMediaReviewView(row: {
  upload_id: ContributionUploadId;
  submission_id: ContributionId;
  state: ContributionMediaUpload["state"];
  mime_type: ContributionMediaUpload["mimeType"];
  byte_size: number | null;
  sha256: string | null;
  review_state: string;
  review_reason: string | null;
  rights_confirmed: boolean;
}): MediaReviewView {
  return {
    uploadId: row.upload_id,
    submissionId: row.submission_id,
    state: row.state,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    sha256: row.sha256,
    sanitized: true,
    exifRemoved: true,
    rightsConfirmed: row.rights_confirmed,
    decision:
      row.review_state === "ACCEPTED" || row.review_state === "REJECTED"
        ? row.review_state
        : null,
    decisionReason: row.review_reason,
  };
}

function mergeClaimCurrentValue(detail: SpotDetail, claim: string): unknown {
  switch (claim) {
    case "ACCESS_LAST_ROAD":
      return detail.route.lastRoad;
    case "ACCESS_PARKING":
      return detail.route.parkingGuidance;
    case "FACILITY_STATUS":
      return detail.spot.facilities.map((facility) => ({ type: facility.type, status: facility.status }));
    case "ACCESS_OPENNESS":
      return detail.accessAndSafety.openness;
    case "ACCESS_LEGAL_ENTRY":
      return detail.accessAndSafety.legalAccess;
    case "SAFETY_NIGHT":
      return detail.accessAndSafety.nightSafety;
    case "HORIZON_PROFILE":
      return { obstructionPercent: detail.spot.obstructionPercent, clearDirections: detail.spot.clearDirections };
    case "SPOT_DETAILS":
      return detail.formalFacts ?? {};
    case "SITE_MEDIA_PROVENANCE":
      return detail.spot.media.map((media) => media.id);
    default:
      return null;
  }
}

function mergeClaimCandidateValue(
  submission: ContributionSubmission,
  claim: string,
): unknown {
  const proposal = contributionResolvedProposal(submission);
  if (claim === "SPOT_DETAILS" && proposal) return proposal.fields;
  return {
    claim,
    detail: submission.detail,
    mediaIds: submission.media.map((media) => media.uploadId),
    observedAt: submission.observedAt,
  };
}

function contributionEvidenceSubject(
  claim: AdminContributionEvidenceClaim,
): FactEvidence["subjectType"] {
  if (claim === "FACILITY_STATUS") return "FACILITY";
  if (
    claim === "ACCESS_LAST_ROAD" ||
    claim === "ACCESS_PARKING" ||
    claim === "ACCESS_OPENNESS" ||
    claim === "ACCESS_LEGAL_ENTRY"
  )
    return "ACCESS";
  if (claim === "SAFETY_NIGHT") return "SAFETY";
  if (claim === "HORIZON_PROFILE") return "HORIZON";
  return "SPOT";
}

function unavailableCandidateSource(
  spotId: SpotId,
  capability: "light-pollution" | "route",
  now: string,
): SourceSummary {
  const title =
    capability === "light-pollution"
      ? "尚未录入可发布的光害数据"
      : "尚未请求或录入路线数据";
  return {
    id: `candidate:${spotId}:${capability}`,
    kind: "PRODUCT_CALCULATION",
    provider: "今晚去观星数据完整度门禁",
    title,
    sourceUrl: "",
    license: "产品能力状态",
    licenseUrl: "",
    publishedAt: null,
    retrievedAt: now,
    validFrom: null,
    validTo: null,
    state: "UNAVAILABLE",
    confidence: null,
    precision: "未建立事实，不参与正式点发布或今晚结论",
    limitations: ["候选点资料未闭合"],
  };
}

export class PostgresMiniappRepository
  implements MiniappRepositoryPort, AdminOperationsPort
{
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
    if (migrate)
      await runPostgresMigrations({ pool: this.pool, migrationDirectory: migrationDir });
    const migration = await this.pool.query<{ exists: boolean }>(
      "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists",
    );
    if (!migration.rows[0]?.exists)
      throw new Error("postgres_schema_missing_run_migrations");
    return this;
  }

  async readinessSnapshot() {
    const versions = await migrationVersions();
    const expectedMigration = versions.at(-1) ?? null;
    const result = await this.pool.query<{ current_migration: string | null }>(
      `SELECT CASE
         WHEN to_regclass('public.schema_migrations') IS NULL THEN NULL
         ELSE (SELECT max(version) FROM schema_migrations)
       END AS current_migration`,
    );
    const currentMigration = result.rows[0]?.current_migration ?? null;
    return {
      ready:
        expectedMigration !== null && currentMigration === expectedMigration,
      repository: this.kind,
      currentMigration,
      expectedMigration,
    };
  }

  async listSpots(): Promise<readonly SpotSummary[]> {
    const result = await this.pool.query<{ payload: SpotSummary }>(
      `SELECT s.payload
         FROM spots s
         JOIN spot_publication_assessments a USING (spot_id)
        WHERE s.visibility_policy = 'PUBLIC_EXACT'
          AND s.status IN ('PUBLISHED', 'TEMPORARILY_CLOSED')
          AND a.complete = true
          AND a.spot_revision = s.version
          AND a.assessed_at >= now() - interval '30 days'
        ORDER BY s.display_order`,
    );
    return result.rows.map((row) => clone(row.payload));
  }

  async listSpotsInRadius(
    center: { system: "WGS84"; latitude: number; longitude: number },
    radiusKm: number,
  ): Promise<readonly SpotSummary[]> {
    const result = await this.pool.query<{ payload: SpotSummary }>(
      `SELECT s.payload
         FROM spots s
         JOIN spot_publication_assessments a USING (spot_id)
        WHERE s.visibility_policy = 'PUBLIC_EXACT'
          AND s.status IN ('PUBLISHED', 'TEMPORARILY_CLOSED')
          AND a.complete = true
          AND a.spot_revision = s.version
          AND a.assessed_at >= now() - interval '30 days'
          AND ST_DWithin(
            s.geom_wgs84,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
          )
        ORDER BY s.display_order`,
      [center.longitude, center.latitude, radiusKm * 1_000],
    );
    return result.rows.map((row) => clone(row.payload));
  }

  async listSpotPopulation(): Promise<readonly Pick<SpotSummary, "spotId" | "source">[]> {
    const result = await this.pool.query<{ spot_id: SpotId; source: SpotSummary["source"] }>(
      `SELECT s.spot_id, s.payload->'source' AS source
         FROM spots s
         JOIN spot_publication_assessments a USING (spot_id)
        WHERE s.visibility_policy = 'PUBLIC_EXACT'
          AND s.status IN ('PUBLISHED', 'TEMPORARILY_CLOSED')
          AND a.complete = true
          AND a.spot_revision = s.version
          AND a.assessed_at >= now() - interval '30 days'
        ORDER BY s.display_order`,
    );
    return result.rows.map((row) => ({ spotId: row.spot_id, source: clone(row.source) }));
  }

  async listDarkSkyGridCells(input: {
    datasetVersion: string;
    center?: { system: "WGS84"; latitude: number; longitude: number };
    radiusKm?: number;
  }): Promise<readonly DarkSkyGridCellRecord[]> {
    if (input.datasetVersion === "UNAVAILABLE") return [];
    if ((input.center === undefined) !== (input.radiusKm === undefined))
      throw new Error("dark_sky_viewport_incomplete");
    if (
      input.radiusKm !== undefined &&
      (!Number.isFinite(input.radiusKm) || input.radiusKm <= 0)
    )
      throw new Error("dark_sky_viewport_radius_invalid");
    const values: unknown[] = [input.datasetVersion];
    const viewportClause = input.center
      ? `AND ST_DWithin(
             c.geom_wgs84::geography,
             ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
             $4
           )`
      : "";
    if (input.center)
      values.push(
        input.center.longitude,
        input.center.latitude,
        input.radiusKm! * 1_000,
      );
    const result = await this.pool.query<{
      payload: Omit<DarkSkyGridCellRecord, "source">;
      source: SourceSummary;
    }>(
      `SELECT c.payload, s.payload AS source
         FROM dark_sky_grid_cells c
         JOIN dark_sky_dataset_publications p USING (dataset_version)
         JOIN data_source_registry s ON s.source_id = p.source_id
        WHERE c.dataset_version = $1
          AND p.state = 'PUBLISHED'
          AND c.state = 'ESTIMATED'
          ${viewportClause}
        ORDER BY c.cell_id
        LIMIT 513`,
      values,
    );
    if (result.rows.length > 512)
      throw new Error("dark_sky_native_grid_cell_budget_exceeded");
    return result.rows.map((row) => ({
      ...clone(row.payload),
      source: clone(row.source),
    }));
  }

  async searchSpotCandidates(query: string): Promise<readonly SpotSummary[]> {
    const normalized = query.trim();
    if (!normalized) return [];
    const result = await this.pool.query<{ payload: SpotSummary }>(
      `SELECT payload
         FROM spots
        WHERE status = 'DATA_INSUFFICIENT'
          AND visibility_policy = 'PUBLIC_EXACT'
          AND (name ILIKE $1 OR region ILIKE $1 OR payload->>'address' ILIKE $1)
        ORDER BY display_order
        LIMIT 20`,
      [`%${normalized.replace(/[\\%_]/gu, "\\$&")}%`],
    );
    return result.rows.map((row) => clone(row.payload));
  }

  async getSpot(spotId: SpotId): Promise<SpotSummary | null> {
    const result = await this.pool.query<{ payload: SpotSummary }>(
      `SELECT s.payload
         FROM spots s
         JOIN spot_publication_assessments a USING (spot_id)
        WHERE s.spot_id = $1
          AND s.visibility_policy = 'PUBLIC_EXACT'
          AND s.status IN ('PUBLISHED', 'TEMPORARILY_CLOSED')
          AND a.complete = true
          AND a.spot_revision = s.version
          AND a.assessed_at >= now() - interval '30 days'`,
      [spotId],
    );
    return result.rows[0]
      ? clone(result.rows[0].payload)
      : null;
  }

  async getDetail(spotId: SpotId): Promise<SpotDetail | null> {
    const result = await this.pool.query<{ payload: SpotDetail; spot: SpotSummary }>(
      `SELECT r.payload, s.payload AS spot
         FROM spot_overview_read_models r
         JOIN spots s USING (spot_id)
         JOIN spot_publication_assessments a USING (spot_id)
        WHERE r.spot_id = $1
          AND s.visibility_policy = 'PUBLIC_EXACT'
          AND s.status IN ('PUBLISHED', 'TEMPORARILY_CLOSED')
          AND a.complete = true
          AND a.spot_revision = s.version
          AND a.assessed_at >= now() - interval '30 days'`,
      [spotId],
    );
    return result.rows[0]
      ? clone({ ...result.rows[0].payload, spot: result.rows[0].spot })
      : null;
  }

  async getContributionFormalBaseline(spotId: SpotId) {
    const result = await this.pool.query<{ payload: SpotDetail; spot: SpotSummary; version: number }>(
      `SELECT r.payload, s.payload AS spot, s.version
         FROM spot_overview_read_models r
         JOIN spots s USING (spot_id)
         JOIN spot_publication_assessments a USING (spot_id)
        WHERE r.spot_id = $1
          AND s.visibility_policy = 'PUBLIC_EXACT'
          AND s.status IN ('PUBLISHED', 'TEMPORARILY_CLOSED')
          AND a.complete = true
          AND a.spot_revision = s.version
          AND a.assessed_at >= now() - interval '30 days'`,
      [spotId],
    );
    const row = result.rows[0];
    return row ? contributionFormalBaseline({ ...row.payload, spot: row.spot }, row.version) : null;
  }

  async ensureUser(userId: UserId): Promise<void> {
    await this.#transaction(async (client) => {
      await client.query(
        "INSERT INTO users(user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        [userId],
      );
      await client.query(
        `INSERT INTO user_preferences(user_id, payload, revision)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, DEFAULT_USER_PREFERENCES],
      );
    });
  }

  async findOrCreateWechatUser(identityDigest: string): Promise<UserId> {
    return this.#transaction(async (client) => {
      const existing = await client.query<{ user_id: UserId }>(
        `UPDATE wechat_identities SET last_login_at = now()
          WHERE identity_digest = $1 RETURNING user_id`,
        [identityDigest],
      );
      if (existing.rows[0]) return existing.rows[0].user_id;
      const userId = `user:${randomUUID()}` as UserId;
      await client.query("INSERT INTO users(user_id) VALUES ($1)", [userId]);
      await client.query(
        `INSERT INTO user_preferences(user_id, payload, revision)
         VALUES ($1, $2, 1)`,
        [userId, DEFAULT_USER_PREFERENCES],
      );
      await client.query(
        `INSERT INTO wechat_identities(identity_digest, user_id)
         VALUES ($1, $2)`,
        [identityDigest, userId],
      );
      return userId;
    });
  }

  async createSession(input: {
    userId: UserId;
    tokenDigest: string;
    expiresAt: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_sessions(token_digest, user_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (token_digest) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         expires_at = EXCLUDED.expires_at,
         revoked_at = NULL`,
      [input.tokenDigest, input.userId, input.expiresAt],
    );
  }

  async resolveSession(tokenDigest: string): Promise<UserId | null> {
    const result = await this.pool.query<{ user_id: UserId }>(
      `SELECT s.user_id
         FROM user_sessions s
         JOIN users u ON u.user_id = s.user_id
        WHERE s.token_digest = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > now()
          AND u.state = 'ACTIVE'`,
      [tokenDigest],
    );
    return result.rows[0]?.user_id ?? null;
  }

  async deleteAccount(
    userId: UserId,
    idempotencyKey: string,
  ): Promise<AccountDeletionReceipt> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<AccountDeletionReceipt>(
        client,
        userId,
        idempotencyKey,
      );
      if (replay) return replay;
      const user = await client.query<{ state: string }>(
        "SELECT state FROM users WHERE user_id = $1 FOR UPDATE",
        [userId],
      );
      if (!user.rows[0]) throw new Error("account_not_found");
      if (user.rows[0].state !== "ACTIVE")
        throw new Error("account_not_active");

      const media = await client.query<{ object_key: string | null }>(
        `SELECT object_key FROM contribution_media_uploads
          WHERE user_id = $1 AND object_key IS NOT NULL
         UNION ALL
         SELECT media.object_key FROM formal_feedback_media_uploads media
          WHERE media.user_id = $1 AND media.object_key IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM spot_formal_reference_media canonical
               WHERE canonical.object_key = media.object_key
            )
         UNION ALL
         SELECT avatar_object_key FROM users
          WHERE user_id = $1 AND avatar_object_key IS NOT NULL`,
        [userId],
      );
      const objectKeys = [
        ...new Set(
          media.rows
            .map((row) => row.object_key)
            .filter((value): value is string => Boolean(value)),
        ),
      ];
      const deletionBatchId = objectKeys.length ? randomUUID() : null;
      for (const objectKey of objectKeys)
        await client.query(
          `INSERT INTO account_deletion_media_queue(deletion_batch_id, object_key)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [deletionBatchId, objectKey],
        );

      await client.query(
        "DELETE FROM contribution_media_uploads WHERE user_id = $1",
        [userId],
      );
      await client.query("DELETE FROM formal_feedback_media_uploads WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM formal_feedback_upload_intents WHERE user_id = $1", [userId]);
      await eraseAccountContributionEvidence(client, userId);
      for (const table of [
        "favorites",
        "observation_plans",
        "user_profile_links",
        "external_post_imports",
        "spot_proposals",
        "field_reports",
        "corrections",
        "user_preferences",
      ])
        await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
      await client.query("DELETE FROM wechat_identities WHERE user_id = $1", [
        userId,
      ]);
      await client.query("DELETE FROM user_sessions WHERE user_id = $1", [
        userId,
      ]);
      await client.query(
        "DELETE FROM idempotency_records WHERE scope_id = $1",
        [userId],
      );
      const deletedAt = new Date().toISOString();
      await client.query(
        "UPDATE users SET state = 'DELETED', nickname = NULL, avatar_object_key = NULL, avatar_mime_type = NULL, avatar_byte_size = NULL, avatar_sha256 = NULL, avatar_zoom = NULL WHERE user_id = $1",
        [userId],
      );
      const receipt: AccountDeletionReceipt = {
        schemaVersion: "starward-account-deletion-receipt-v1",
        userId,
        accountState: "DELETED",
        deletedAt,
        sessionsRevoked: true,
        externalIdentityUnlinked: true,
        mediaCleanupState: deletionBatchId ? "QUEUED" : "NOT_REQUIRED",
        mutableDataDeleted: [
          "preferences",
          "favorites",
          "plans",
          "notification-schedules",
          "profile-links",
          "imports",
          "media",
        ],
        retainedDeidentifiedEvidence: [
          "moderation-history",
          "merge-publication-audit",
        ],
      };
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "account.delete",
        response: receipt,
        eventType: "AccountDeleted",
        scopeId: userId,
        payload: {
          userId,
          deletionBatchId,
          action: "DELETE_ACCOUNT_MEDIA",
          jobKind: "MEDIA",
        },
      });
      return receipt;
    });
  }

  async getAccountProfile(userId: UserId): Promise<AccountProfileRecord> {
    const result = await this.pool.query<{ nickname: string | null; profile_revision: number; profile_updated_at: Date; avatar_sha256: string | null; avatar_mime_type: "image/jpeg" | "image/png" | "image/webp" | null; avatar_zoom: string | null }>(
      "SELECT nickname, profile_revision, profile_updated_at, avatar_sha256, avatar_mime_type, avatar_zoom FROM users WHERE user_id = $1", [userId]);
    const row = result.rows[0];
    if (!row) throw new Error("account_profile_not_found");
    return { nickname: row.nickname, avatar: row.avatar_sha256 && row.avatar_mime_type && row.avatar_zoom ? { version: row.avatar_sha256, mimeType: row.avatar_mime_type, zoom: Number(row.avatar_zoom) } : null, revision: row.profile_revision, updatedAt: row.profile_updated_at.toISOString() };
  }

  async saveAccountNickname(userId: UserId, nickname: string, expectedRevision: number, idempotencyKey: string): Promise<AccountProfileRecord> {
    return this.#transaction(async client => {
      const existing = await client.query<{ profile_revision: number; avatar_sha256: string | null; avatar_mime_type: "image/jpeg" | "image/png" | "image/webp" | null; avatar_zoom: string | null }>(
        "SELECT profile_revision, avatar_sha256, avatar_mime_type, avatar_zoom FROM users WHERE user_id = $1 FOR UPDATE", [userId]);
      if (!existing.rows[0]) throw new Error("account_profile_not_found");
      const replay = await this.#replay<AccountProfileRecord>(client, userId, idempotencyKey);
      if (replay) {
        if (replay.nickname !== nickname || replay.revision !== expectedRevision + 1) throw new Error("account_profile_idempotency_conflict");
        return replay;
      }
      if (existing.rows[0].profile_revision !== expectedRevision) throw new Error("account_profile_revision_conflict");
      const avatar = existing.rows[0].avatar_sha256 && existing.rows[0].avatar_mime_type && existing.rows[0].avatar_zoom ? { version: existing.rows[0].avatar_sha256, mimeType: existing.rows[0].avatar_mime_type, zoom: Number(existing.rows[0].avatar_zoom) } : null;
      const saved: AccountProfileRecord = { nickname, avatar, revision: expectedRevision + 1, updatedAt: new Date().toISOString() };
      await client.query("UPDATE users SET nickname = $2, profile_revision = $3, profile_updated_at = $4 WHERE user_id = $1", [userId, nickname, saved.revision, saved.updatedAt]);
      await this.#recordMutation(client, { idempotencyKey, operation: "account.nickname.save", response: saved,
        eventType: "AccountProfileUpdated", scopeId: userId, payload: { userId, revision: saved.revision } });
      return saved;
    });
  }

  async getAccountAvatarObject(userId: UserId) {
    const result = await this.pool.query<{ avatar_object_key: string | null; avatar_sha256: string | null; avatar_mime_type: "image/jpeg" | "image/png" | "image/webp" | null; avatar_zoom: string | null }>(
      "SELECT avatar_object_key, avatar_sha256, avatar_mime_type, avatar_zoom FROM users WHERE user_id = $1", [userId]);
    const row = result.rows[0];
    if (!row) throw new Error("account_profile_not_found");
    return row.avatar_object_key && row.avatar_sha256 && row.avatar_mime_type && row.avatar_zoom
      ? { objectKey: row.avatar_object_key, version: row.avatar_sha256, mimeType: row.avatar_mime_type, zoom: Number(row.avatar_zoom) }
      : null;
  }

  async saveAccountAvatar(userId: UserId, avatar: { objectKey: string; version: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; zoom: number; byteSize: number; sha256: string }, expectedRevision: number, idempotencyKey: string) {
    return this.#transaction(async client => {
      const existing = await client.query<{ profile_revision: number; nickname: string | null; avatar_object_key: string | null }>(
        "SELECT profile_revision, nickname, avatar_object_key FROM users WHERE user_id = $1 FOR UPDATE", [userId]);
      const row = existing.rows[0];
      if (!row) throw new Error("account_profile_not_found");
      const replay = await this.#replay<{ profile: AccountProfileRecord; previousObjectKey: string | null }>(client, userId, idempotencyKey);
      if (replay) {
        if (replay.profile.avatar?.version !== avatar.version || replay.profile.revision !== expectedRevision + 1) throw new Error("account_profile_idempotency_conflict");
        return replay;
      }
      if (row.profile_revision !== expectedRevision) throw new Error("account_profile_revision_conflict");
      const profile: AccountProfileRecord = { nickname: row.nickname, avatar: { version: avatar.version, mimeType: avatar.mimeType, zoom: avatar.zoom }, revision: expectedRevision + 1, updatedAt: new Date().toISOString() };
      const result = { profile, previousObjectKey: row.avatar_object_key };
      await client.query("UPDATE users SET avatar_object_key=$2, avatar_mime_type=$3, avatar_byte_size=$4, avatar_sha256=$5, avatar_zoom=$6, profile_revision=$7, profile_updated_at=$8 WHERE user_id=$1", [userId, avatar.objectKey, avatar.mimeType, avatar.byteSize, avatar.sha256, avatar.zoom, profile.revision, profile.updatedAt]);
      await this.#recordMutation(client, { idempotencyKey, operation: "account.avatar.save", response: result, eventType: "AccountProfileUpdated", scopeId: userId, payload: { userId, revision: profile.revision, field: "avatar" } });
      return result;
    });
  }

  async getPreferences(userId: UserId): Promise<UserPreferencesRecord> {
    const result = await this.pool.query<{
      payload: UserPreferences;
      revision: number;
      updated_at: Date;
    }>(
      "SELECT payload, revision, updated_at FROM user_preferences WHERE user_id = $1",
      [userId],
    );
    const row = result.rows[0];
    if (!row) throw new Error("user_preferences_not_found");
    return {
      preferences: cloneUserPreferences(row.payload),
      revision: row.revision,
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async savePreferences(
    userId: UserId,
    preferences: UserPreferences,
    expectedRevision: number,
    idempotencyKey: string,
  ): Promise<UserPreferencesRecord> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<UserPreferencesRecord>(
        client,
        userId,
        idempotencyKey,
      );
      if (replay) return replay;
      const existing = await client.query<{
        revision: number;
      }>(
        "SELECT revision FROM user_preferences WHERE user_id = $1 FOR UPDATE",
        [userId],
      );
      const currentRevision = existing.rows[0]?.revision;
      if (currentRevision === undefined)
        throw new Error("user_preferences_not_found");
      if (currentRevision !== expectedRevision)
        throw new Error("preferences_revision_conflict");
      const record: UserPreferencesRecord = {
        preferences: cloneUserPreferences(preferences),
        revision: currentRevision + 1,
        updatedAt: new Date().toISOString(),
      };
      await client.query(
        `UPDATE user_preferences
         SET payload = $2, revision = $3, updated_at = $4
         WHERE user_id = $1`,
        [userId, record.preferences, record.revision, record.updatedAt],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "preferences.save",
        response: record,
        eventType: "UserPreferencesUpdated",
        scopeId: userId,
        payload: { userId, revision: record.revision },
      });
      return record;
    });
  }

  async listFavoriteIds(userId: UserId): Promise<readonly SpotId[]> {
    const result = await this.pool.query<{ spot_id: SpotId }>(
      "SELECT spot_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return result.rows.map((row) => row.spot_id);
  }

  async setFavorite(
    userId: UserId,
    spotId: SpotId,
    favorite: boolean,
    idempotencyKey: string,
  ): Promise<void> {
    await this.#transaction(async (client) => {
      if (await this.#replay(client, userId, idempotencyKey)) return;
      const exists = await client.query("SELECT 1 FROM spots WHERE spot_id = $1", [
        spotId,
      ]);
      if (!exists.rowCount) throw new Error("formal_spot_not_found");
      if (favorite)
        await client.query(
          `INSERT INTO favorites(user_id, spot_id) VALUES ($1, $2)
           ON CONFLICT (user_id, spot_id) DO NOTHING`,
          [userId, spotId],
        );
      else
        await client.query(
          "DELETE FROM favorites WHERE user_id = $1 AND spot_id = $2",
          [userId, spotId],
        );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "favorite.set",
        response: { spotId, favorite },
        eventType: favorite ? "FavoriteCreated" : "FavoriteRemoved",
        scopeId: userId,
        payload: { userId, spotId, favorite },
      });
    });
  }

  async listPlans(userId: UserId): Promise<readonly ObservationPlan[]> {
    const result = await this.pool.query<{ payload: ObservationPlan }>(
      "SELECT payload FROM observation_plans WHERE user_id = $1 ORDER BY updated_at DESC",
      [userId],
    );
    return result.rows.map((row) => clone(row.payload));
  }

  async listPlanReminderSchedules(userId: UserId): Promise<readonly StoredPlanReminderSchedule[]> {
    const result = await this.pool.query<{
      plan_id: string; user_id: string; reminder_id: string; plan_revision: number;
      schedule_version: string; trigger_at: Date | null; departure_at: Date | null;
      state: StoredPlanReminderSchedule["state"]; reason: string; attempt_count: number; updated_at: Date;
    }>(`SELECT plan_id, user_id, reminder_id, plan_revision, schedule_version,
               trigger_at, departure_at, state, reason, attempt_count, updated_at
          FROM plan_reminder_schedules
         WHERE user_id = $1 AND active = true
         ORDER BY trigger_at NULLS LAST, reminder_id`, [userId]);
    return result.rows.map(row => ({
      planId: row.plan_id, userId: row.user_id, reminderId: row.reminder_id,
      planRevision: row.plan_revision, scheduleVersion: row.schedule_version,
      triggerAtUtc: row.trigger_at?.toISOString() ?? null,
      departureAtUtc: row.departure_at?.toISOString() ?? null,
      state: row.state, reason: row.reason, attemptCount: row.attempt_count,
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async getPlanSaveReceipt(userId: UserId, planId: string, idempotencyKey: string): Promise<ObservationPlan | null> {
    return this.#transaction(async client => {
      const receipt = await this.#replay<ObservationPlan>(client, userId, idempotencyKey);
      return receipt?.planId === planId ? receipt : null;
    });
  }
  async savePlan(
    userId: UserId,
    plan: ObservationPlan,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ObservationPlan> {
    return this.#transaction(async (client) => {
      await client.query("SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE", [userId]);
      const replay = await this.#replay<ObservationPlan>(
        client,
        userId,
        idempotencyKey,
      );
      if (replay) return replay;
      const spot = await client.query("SELECT 1 FROM spots WHERE spot_id = $1", [
        plan.spotId,
      ]);
      if (!spot.rowCount) throw new Error("formal_spot_not_found");
      const existing = await client.query<{
        revision: number;
        user_id: string;
      }>(
        "SELECT revision, user_id FROM observation_plans WHERE plan_id = $1 FOR UPDATE",
        [plan.planId],
      );
      if (existing.rows[0] && existing.rows[0].user_id !== userId)
        throw new Error("plan_identity_scope_conflict");
      const currentRevision = existing.rows[0]?.revision ?? 0;
      if (expectedRevision === null && existing.rows[0])
        throw new Error("plan_revision_conflict");
      if (expectedRevision !== null && currentRevision !== expectedRevision)
        throw new Error("plan_revision_conflict");
      const saved: ObservationPlan = {
        ...plan,
        planId: (plan.planId || `plan:${randomUUID()}`) as PlanId,
        revision: currentRevision + 1,
        updatedAt: new Date().toISOString(),
      };
      const persisted = await client.query(
        `INSERT INTO observation_plans(
           plan_id, user_id, spot_id, local_date, local_time, notes,
           context_snapshot, revision, payload, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (plan_id) DO UPDATE SET
           spot_id = EXCLUDED.spot_id,
           local_date = EXCLUDED.local_date,
           local_time = EXCLUDED.local_time,
           notes = EXCLUDED.notes,
           context_snapshot = EXCLUDED.context_snapshot,
           revision = EXCLUDED.revision,
           payload = EXCLUDED.payload,
           updated_at = EXCLUDED.updated_at
         WHERE observation_plans.user_id = EXCLUDED.user_id
         RETURNING plan_id`,
        [
          saved.planId,
          userId,
          saved.spotId,
          saved.localDate,
          saved.localTime,
          saved.notes,
          saved.contextSnapshot,
          saved.revision,
          saved,
          saved.updatedAt,
        ],
      );
      if (!persisted.rowCount) throw new Error("plan_identity_scope_conflict");
      const schedules = derivePlanReminderSchedules(userId, saved);
      await client.query(
        `UPDATE plan_reminder_schedules SET active = false, state = 'CANCELED',
            reason = 'SUPERSEDED_OR_REMOVED', updated_at = now()
          WHERE user_id = $1 AND plan_id = $2 AND active = true
            AND NOT (schedule_version = ANY($3::text[]))`,
        [userId, saved.planId, schedules.map(row => row.scheduleVersion)],
      );
      for (const row of schedules) {
        await client.query(
          `INSERT INTO plan_reminder_schedules(
             schedule_version, plan_id, user_id, reminder_id, plan_revision,
             trigger_at, departure_at, state, reason, attempt_count, active, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,true,$10)
           ON CONFLICT (schedule_version) DO UPDATE SET
             plan_revision = EXCLUDED.plan_revision,
             active = true,
             updated_at = EXCLUDED.updated_at`,
          [row.scheduleVersion, row.planId, row.userId, row.reminderId, row.planRevision,
            row.triggerAtUtc, row.departureAtUtc, row.state, row.reason, row.updatedAt],
        );
      }
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "plan.save",
        response: saved,
        eventType: existing.rowCount
          ? "ObservationPlanUpdated"
          : "ObservationPlanCreated",
        scopeId: userId,
        payload: { userId, plan: saved },
      });
      return clone(saved);
    });
  }

  async deletePlan(
    userId: UserId,
    planId: string,
    idempotencyKey: string,
  ): Promise<void> {
    await this.#transaction(async (client) => {
      if (await this.#replay(client, userId, idempotencyKey)) return;
      await client.query(
        `UPDATE plan_reminder_schedules SET active = false, state = 'CANCELED',
            reason = 'PLAN_DELETED', updated_at = now()
          WHERE plan_id = $1 AND user_id = $2 AND active = true`,
        [planId, userId],
      );
      await client.query(
        "DELETE FROM observation_plans WHERE plan_id = $1 AND user_id = $2",
        [planId, userId],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "plan.delete",
        response: { planId, deleted: true },
        eventType: "ObservationPlanDeleted",
        scopeId: userId,
        payload: { userId, planId },
      });
    });
  }

  async listProfileLinks(userId: UserId): Promise<readonly ProfileLink[]> {
    const result = await this.pool.query<{ payload: ProfileLink }>(
      "SELECT payload FROM user_profile_links WHERE user_id = $1 ORDER BY sort_order",
      [userId],
    );
    return result.rows.map((row) => clone(row.payload));
  }

  async saveProfileLink(
    userId: UserId,
    link: ProfileLink,
    idempotencyKey: string,
  ): Promise<ProfileLink> {
    return this.#transaction(async (client) => {
      // Serialize a user's link writes, including initially empty lists.
      await client.query("SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE", [userId]);
      const replay = await this.#replay<ProfileLink>(
        client,
        userId,
        idempotencyKey,
      );
      if (replay) return replay;
      const duplicate = await client.query(
        "SELECT profile_link_id FROM user_profile_links WHERE user_id = $1 AND url = $2 AND profile_link_id <> $3 LIMIT 1",
        [userId, link.url, link.profileLinkId],
      );
      if (duplicate.rows.length) throw new Error("profile_link_duplicate");
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
          userId,
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
        scopeId: userId,
        payload: { userId, profileLinkId: link.profileLinkId },
      });
      return clone(link);
    });
  }

  async deleteProfileLink(
    userId: UserId,
    id: string,
    idempotencyKey: string,
  ): Promise<void> {
    await this.#transaction(async (client) => {
      if (await this.#replay(client, userId, idempotencyKey)) return;
      await client.query(
        "DELETE FROM user_profile_links WHERE profile_link_id = $1 AND user_id = $2",
        [id, userId],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "profile-link.delete",
        response: { profileLinkId: id, deleted: true },
        eventType: "ProfileLinkDeleted",
        scopeId: userId,
        payload: { userId, profileLinkId: id },
      });
    });
  }

  async getImportSaveReceipt(userId: UserId, id: string, idempotencyKey: string): Promise<ImportDraft | null> {
    return this.#transaction(async (client) => {
      const receipt = await this.#replay<ImportDraft>(client, userId, idempotencyKey);
      return receipt?.importDraftId === id ? receipt : null;
    });
  }

  async saveImportDraft(
    userId: UserId,
    draft: ImportDraft,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ImportDraft> {
    return this.#transaction(async (client) => {
      // A retried create may have a different generated draft ID. Lock the owner
      // before looking up its receipt so concurrent retries share one result.
      await client.query("SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE", [userId]);
      const replay = await this.#replay<ImportDraft>(
        client,
        userId,
        idempotencyKey,
      );
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
          userId,
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
            userId,
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
        scopeId: userId,
        payload: {
          userId,
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

  async listImportDrafts(userId: UserId): Promise<readonly ImportDraft[]> {
    const result = await this.pool.query<{ payload: ImportDraft }>(
      `SELECT d.payload
         FROM external_post_import_drafts d
         JOIN external_post_imports i ON i.import_id = d.import_id
        WHERE i.user_id = $1
        ORDER BY i.created_at DESC`,
      [userId],
    );
    return result.rows.map((row) => clone(row.payload));
  }

  async getImportDraft(userId: UserId, id: string): Promise<ImportDraft | null> {
    const result = await this.pool.query<{ payload: ImportDraft }>(
      `SELECT d.payload
         FROM external_post_import_drafts d
         JOIN external_post_imports i ON i.import_id = d.import_id
        WHERE d.import_id = $1 AND i.user_id = $2`,
      [id, userId],
    );
    return result.rows[0] ? clone(result.rows[0].payload) : null;
  }

  async listContributions(
    userId: UserId,
  ): Promise<readonly ContributionSubmission[]> {
    const result = await this.pool.query<{ payload: ContributionSubmission }>(
      `SELECT payload FROM user_submissions
        WHERE user_id = $1
        ORDER BY updated_at DESC`,
      [userId],
    );
    return result.rows.map((row) => normalizeContributionSubmission(row.payload));
  }

  async getContribution(
    userId: UserId,
    submissionId: ContributionId,
  ): Promise<ContributionSubmission | null> {
    const result = await this.pool.query<{ payload: ContributionSubmission }>(
      `SELECT payload FROM user_submissions
        WHERE submission_id = $1 AND user_id = $2`,
      [submissionId, userId],
    );
    return result.rows[0]
      ? normalizeContributionSubmission(result.rows[0].payload)
      : null;
  }

  async getFormalUploadIntent(userId: UserId, intentId: string) {
    const result = await this.pool.query<{ payload: ContributionFormalUploadIntent }>(
      "SELECT payload FROM formal_feedback_upload_intents WHERE intent_id = $1 AND user_id = $2 AND consumed_at IS NULL",
      [intentId, userId],
    );
    return result.rows[0] ? clone(result.rows[0].payload) : null;
  }

  async saveFormalUploadIntent(userId: UserId, intent: ContributionFormalUploadIntent, idempotencyKey: string) {
    return this.#transaction(async client => {
      const replay=await this.#replay<ContributionFormalUploadIntent>(client,userId,idempotencyKey); if(replay)return clone(replay);
      await client.query(`INSERT INTO formal_feedback_upload_intents(intent_id,user_id,spot_id,baseline_revision,revision,payload,expires_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[intent.intentId,userId,intent.spotId,intent.baselineRevision,intent.revision,intent,intent.expiresAt,intent.createdAt]);
      await this.#recordMutation(client,{idempotencyKey,operation:"formal-upload-intent.create",response:intent,eventType:"FormalUploadIntentCreated",scopeId:userId,payload:{userId,intentId:intent.intentId,spotId:intent.spotId}}); return clone(intent);
    });
  }

  async createFormalContributionUpload(userId: UserId, intentId: string, upload: ContributionFormalMediaUpload, expectedRevision: number, idempotencyKey: string) {
    return this.#transaction(async client => {
      const replay=await this.#replay<ContributionFormalUploadIntent>(client,userId,idempotencyKey); if(replay)return clone(replay);
      const result=await client.query<{revision:number;payload:ContributionFormalUploadIntent;expires_at:string}>("SELECT revision,payload,expires_at FROM formal_feedback_upload_intents WHERE intent_id=$1 AND user_id=$2 AND consumed_at IS NULL FOR UPDATE",[intentId,userId]); const row=result.rows[0];
      if(!row)throw new Error("formal_upload_intent_not_found"); if(row.revision!==expectedRevision)throw new Error("formal_upload_intent_revision_conflict"); if(Date.parse(row.expires_at)<=Date.now())throw new Error("formal_upload_intent_expired"); if(row.payload.uploads.length>=9)throw new Error("contribution_media_count_invalid");
      const next={...row.payload,uploads:[...row.payload.uploads,clone(upload)],revision:row.revision+1};
      await client.query("INSERT INTO formal_feedback_media_uploads(upload_id,intent_id,user_id,state,mime_type,payload,expires_at) VALUES($1,$2,$3,'PENDING',$4,$5,$6)",[upload.uploadId,intentId,userId,upload.mimeType,upload,upload.expiresAt]);
      await client.query("UPDATE formal_feedback_upload_intents SET revision=$3,payload=$4 WHERE intent_id=$1 AND user_id=$2",[intentId,userId,next.revision,next]);
      await this.#recordMutation(client,{idempotencyKey,operation:"formal-upload.create",response:next,eventType:"FormalUploadCreated",scopeId:userId,payload:{userId,intentId,uploadId:upload.uploadId}}); return clone(next);
    });
  }

  async completeFormalContributionUpload(userId: UserId, intentId: string, uploadId: ContributionUploadId, completion: { byteSize: number; sha256: string; objectKey: string; uploadedAt: string }, idempotencyKey: string) {
    return this.#transaction(async client => {
      const replay=await this.#replay<ContributionFormalUploadIntent>(client,userId,idempotencyKey); if(replay)return clone(replay);
      const result=await client.query<{revision:number;payload:ContributionFormalUploadIntent}>("SELECT revision,payload FROM formal_feedback_upload_intents WHERE intent_id=$1 AND user_id=$2 AND consumed_at IS NULL FOR UPDATE",[intentId,userId]); const row=result.rows[0]; if(!row)throw new Error("formal_upload_intent_not_found");
      const target=row.payload.uploads.find(value=>value.uploadId===uploadId); if(!target)throw new Error("contribution_upload_not_found"); if(target.state!=="PENDING")throw new Error("contribution_upload_not_pending");
      const uploads=row.payload.uploads.map(value=>value.uploadId===uploadId?{...value,state:"UPLOADED" as const,byteSize:completion.byteSize,sha256:completion.sha256,uploadedAt:completion.uploadedAt}:value); const next={...row.payload,uploads,revision:row.revision+1};
      await client.query("UPDATE formal_feedback_media_uploads SET state='UPLOADED',object_key=$4,payload=$5 WHERE upload_id=$1 AND intent_id=$2 AND user_id=$3",[uploadId,intentId,userId,completion.objectKey,uploads.find(value=>value.uploadId===uploadId)]);
      await client.query("UPDATE formal_feedback_upload_intents SET revision=$3,payload=$4 WHERE intent_id=$1 AND user_id=$2",[intentId,userId,next.revision,next]);
      await this.#recordMutation(client,{idempotencyKey,operation:"formal-upload.complete",response:next,eventType:"FormalUploadCompleted",scopeId:userId,payload:{userId,intentId,uploadId}}); return clone(next);
    });
  }

  async removeFormalContributionUpload(userId: UserId, intentId: string, uploadId: ContributionUploadId, expectedRevision: number, idempotencyKey: string) {
    return this.#transaction(async client => {
      const replay=await this.#replay<ContributionFormalUploadIntent>(client,userId,idempotencyKey); if(replay)return clone(replay); const result=await client.query<{revision:number;payload:ContributionFormalUploadIntent}>("SELECT revision,payload FROM formal_feedback_upload_intents WHERE intent_id=$1 AND user_id=$2 AND consumed_at IS NULL FOR UPDATE",[intentId,userId]); const row=result.rows[0]; if(!row)throw new Error("formal_upload_intent_not_found"); if(row.revision!==expectedRevision)throw new Error("formal_upload_intent_revision_conflict"); if(!row.payload.uploads.some(value=>value.uploadId===uploadId))throw new Error("contribution_upload_not_found"); const next={...row.payload,uploads:row.payload.uploads.filter(value=>value.uploadId!==uploadId),revision:row.revision+1}; await client.query("DELETE FROM formal_feedback_media_uploads WHERE upload_id=$1 AND intent_id=$2 AND user_id=$3",[uploadId,intentId,userId]); await client.query("UPDATE formal_feedback_upload_intents SET revision=$3,payload=$4 WHERE intent_id=$1 AND user_id=$2",[intentId,userId,next.revision,next]); await this.#recordMutation(client,{idempotencyKey,operation:"formal-upload.remove",response:next,eventType:"FormalUploadRemoved",scopeId:userId,payload:{userId,intentId,uploadId}}); return clone(next);
    });
  }

  async saveContributionDraft(
    userId: UserId,
    submission: ContributionSubmission,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ContributionSubmission> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<ContributionSubmission>(
        client,
        userId,
        idempotencyKey,
      );
      if (replay) return clone(replay);
      const existing = await client.query<{
        user_id: string;
        revision: number;
      }>(
        `SELECT user_id, revision FROM user_submissions
          WHERE submission_id = $1 FOR UPDATE`,
        [submission.submissionId],
      );
      if (existing.rows[0]?.user_id && existing.rows[0].user_id !== userId)
        throw new Error("contribution_identity_scope_conflict");
      if (expectedRevision === null && existing.rowCount)
        throw new Error("contribution_already_exists");
      if (
        expectedRevision !== null &&
        existing.rows[0]?.revision !== expectedRevision
      )
        throw new Error("contribution_revision_conflict");
      const persisted = await client.query(
        `INSERT INTO user_submissions(
           submission_id, user_id, spot_id, state, payload, revision,
           created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (submission_id) DO UPDATE SET
           spot_id = EXCLUDED.spot_id,
           state = EXCLUDED.state,
           payload = EXCLUDED.payload,
           revision = EXCLUDED.revision,
           updated_at = EXCLUDED.updated_at
         WHERE user_submissions.user_id = EXCLUDED.user_id
         RETURNING submission_id`,
        [
          submission.submissionId,
          userId,
          submission.spotId,
          submission.state,
          submission,
          submission.revision,
          submission.createdAt,
          submission.updatedAt,
        ],
      );
      if (!persisted.rowCount)
        throw new Error("contribution_identity_scope_conflict");
      await client.query(
        `INSERT INTO contribution_revisions(
           revision_id, submission_id, revision_no, submission_state,
           merge_state, publication_impact, payload, payload_digest, actor_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (submission_id, revision_no) DO NOTHING`,
        [
          `contribution-revision:${submission.submissionId}:${submission.revision}`,
          submission.submissionId,
          submission.revision,
          submission.submissionState,
          submission.mergeState,
          submission.publicationImpact,
          submission,
          digest(submission),
          userId,
        ],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "contribution-draft.save",
        response: submission,
        eventType: existing.rowCount
          ? "ContributionDraftUpdated"
          : "ContributionDraftCreated",
        scopeId: userId,
        payload: {
          userId,
          submissionId: submission.submissionId,
          revision: submission.revision,
        },
      });
      return clone(submission);
    });
  }

  async createContributionUpload(
    userId: UserId,
    submissionId: ContributionId,
    upload: ContributionMediaUpload,
    expectedRevision: number,
    idempotencyKey: string,
    replaceUploadId?: ContributionUploadId,
  ): Promise<ContributionSubmission> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<ContributionSubmission>(
        client,
        userId,
        idempotencyKey,
      );
      if (replay) return clone(replay);
      const result = await client.query<{
        user_id: string;
        revision: number;
        state: string;
        payload: ContributionSubmission;
      }>(
        `SELECT user_id, revision, state, payload FROM user_submissions
          WHERE submission_id = $1 FOR UPDATE`,
        [submissionId],
      );
      const current = result.rows[0];
      if (!current || current.user_id !== userId)
        throw new Error("contribution_not_found");
      if (!isContributionEditable(current.state))
        throw new Error("contribution_not_editable");
      if (current.revision !== expectedRevision)
        throw new Error("contribution_revision_conflict");
      const now = new Date().toISOString();
      if (!current.payload.rightsConfirmed)
        throw new Error("contribution_media_rights_required");
      const replaced = replaceUploadId ? current.payload.media.find((item) => item.uploadId === replaceUploadId) : undefined;
      if (replaceUploadId && (!replaced || replaced.state !== "EXPIRED"))
        throw new Error("contribution_upload_replacement_invalid");
      assertContributionUploadFits(normalizeContributionSubmission(current.payload), upload, replaced);
      const candidateProfile = appendCandidateProfileMedia(normalizeContributionSubmission(current.payload), upload, replaced);
      const next: ContributionSubmission = {
        ...normalizeContributionSubmission(current.payload),
        media: replaced
          ? current.payload.media.map((item) => clone(item.uploadId === replaceUploadId ? upload : item))
          : [...current.payload.media.map(clone), clone(upload)],
        ...(candidateProfile ? { candidateProfile } : {}),
        revision: current.revision + 1,
        updatedAt: now,
      };
      await client.query(
        `INSERT INTO contribution_media_uploads(
           upload_id, submission_id, user_id, state, mime_type, original_name,
           declared_byte_size, expires_at, payload
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          upload.uploadId,
          submissionId,
          userId,
          upload.state,
          upload.mimeType,
          upload.originalName,
          upload.declaredByteSize,
          upload.expiresAt,
          upload,
        ],
      );
      await client.query(
        `UPDATE user_submissions
            SET payload = $3, revision = $4, updated_at = $5
          WHERE submission_id = $1 AND user_id = $2`,
        [submissionId, userId, next, next.revision, next.updatedAt],
      );
      await client.query(
        `INSERT INTO contribution_revisions(
           revision_id, submission_id, revision_no, submission_state,
           merge_state, publication_impact, payload, payload_digest, actor_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (submission_id, revision_no) DO NOTHING`,
        [
          `contribution-revision:${submissionId}:${next.revision}`,
          submissionId,
          next.revision,
          next.submissionState,
          next.mergeState,
          next.publicationImpact,
          next,
          digest(next),
          userId,
        ],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "contribution-upload.create",
        response: next,
        eventType: "ContributionMediaUploadCreated",
        scopeId: userId,
        payload: { userId, submissionId, uploadId: upload.uploadId },
      });
      return clone(next);
    });
  }

  async completeContributionUpload(
    userId: UserId,
    submissionId: ContributionId,
    uploadId: ContributionUploadId,
    completion: {
      byteSize: number;
      sha256: string;
      objectKey: string;
      uploadedAt: string;
    },
    idempotencyKey: string,
  ): Promise<ContributionSubmission> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<ContributionSubmission>(
        client,
        userId,
        idempotencyKey,
      );
      if (replay) return clone(replay);
      const submissionResult = await client.query<{
        user_id: string;
        revision: number;
        state: string;
        payload: ContributionSubmission;
      }>(
        `SELECT user_id, revision, state, payload FROM user_submissions
          WHERE submission_id = $1 FOR UPDATE`,
        [submissionId],
      );
      const current = submissionResult.rows[0];
      if (!current || current.user_id !== userId)
        throw new Error("contribution_not_found");
      if (!isContributionEditable(current.state))
        throw new Error("contribution_not_editable");
      const uploadResult = await client.query<{
        state: string;
        mime_type: ContributionMediaUpload["mimeType"];
      }>(
        `SELECT state, mime_type FROM contribution_media_uploads
          WHERE upload_id = $1 AND submission_id = $2 AND user_id = $3
          FOR UPDATE`,
        [uploadId, submissionId, userId],
      );
      if (!uploadResult.rows[0])
        throw new Error("contribution_upload_not_found");
      if (uploadResult.rows[0].state !== "PENDING")
        throw new Error("contribution_upload_not_pending");
      const media = normalizeContributionSubmission(current.payload).media.map((item) =>
        item.uploadId === uploadId
          ? {
              ...clone(item),
              state: "UPLOADED" as const,
              byteSize: completion.byteSize,
              sha256: completion.sha256,
              uploadedAt: completion.uploadedAt,
            }
          : clone(item),
      );
      if (!media.some((item) => item.uploadId === uploadId))
        throw new Error("contribution_upload_not_found");
      const next: ContributionSubmission = {
        ...normalizeContributionSubmission(current.payload),
        media,
        revision: current.revision + 1,
        updatedAt: completion.uploadedAt,
      };
      await client.query(
        `UPDATE contribution_media_uploads
            SET state = 'UPLOADED', byte_size = $2::bigint, sha256 = $3,
                object_key = $4, uploaded_at = $5,
                payload = payload || jsonb_build_object(
                  'state', 'UPLOADED', 'byteSize', $2::bigint,
                  'sha256', $3::text, 'uploadedAt', $5::timestamptz
                )
          WHERE upload_id = $1`,
        [
          uploadId,
          completion.byteSize,
          completion.sha256,
          completion.objectKey,
          completion.uploadedAt,
        ],
      );
      await client.query(
        `UPDATE user_submissions
            SET payload = $3, revision = $4, updated_at = $5
          WHERE submission_id = $1 AND user_id = $2`,
        [submissionId, userId, next, next.revision, next.updatedAt],
      );
      await client.query(
        `INSERT INTO contribution_revisions(
           revision_id, submission_id, revision_no, submission_state,
           merge_state, publication_impact, payload, payload_digest, actor_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (submission_id, revision_no) DO NOTHING`,
        [
          `contribution-revision:${submissionId}:${next.revision}`,
          submissionId,
          next.revision,
          next.submissionState,
          next.mergeState,
          next.publicationImpact,
          next,
          digest(next),
          userId,
        ],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "contribution-upload.complete",
        response: next,
        eventType: "ContributionMediaUploaded",
        scopeId: userId,
        payload: {
          userId,
          submissionId,
          uploadId,
          byteSize: completion.byteSize,
          sha256: completion.sha256,
        },
      });
      return clone(next);
    });
  }

  async submitContribution(
    userId: UserId,
    submissionId: ContributionId,
    expectedRevision: number,
    idempotencyKey: string,
  ): Promise<ContributionSubmission> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<ContributionSubmission>(
        client,
        userId,
        idempotencyKey,
      );
      if (replay) return clone(replay);
      const result = await client.query<{
        user_id: string;
        revision: number;
        state: string;
        payload: ContributionSubmission;
      }>(
        `SELECT user_id, revision, state, payload FROM user_submissions
          WHERE submission_id = $1 FOR UPDATE`,
        [submissionId],
      );
      const current = result.rows[0];
      if (!current || current.user_id !== userId)
        throw new Error("contribution_not_found");
      if (!isContributionEditable(current.state))
        throw new Error("contribution_not_editable");
      if (current.revision !== expectedRevision)
        throw new Error("contribution_revision_conflict");
      assertContributionSubmittable(normalizeContributionSubmission(current.payload));
      const uploads = await client.query<{ state: string }>(
        `SELECT state FROM contribution_media_uploads
          WHERE submission_id = $1 AND user_id = $2 FOR UPDATE`,
        [submissionId, userId],
      );
      if (uploads.rows.some((row) => row.state !== "UPLOADED" && row.state !== "ATTACHED"))
        throw new Error("contribution_media_upload_incomplete");
      const now = new Date().toISOString();
      const next: ContributionSubmission = {
        ...normalizeContributionSubmission(current.payload),
        ...appendContributionAttempt(normalizeContributionSubmission(current.payload), now),
        state: "PENDING_REVIEW",
        submissionState: "PENDING_REVIEW",
        review: null,
        statusHistory: [
          ...normalizeContributionSubmission(current.payload).statusHistory,
          contributionEvent(
            "SUBMISSION",
            normalizeContributionSubmission(current.payload).submissionState,
            "PENDING_REVIEW",
            null,
            "USER",
          ),
        ],
        media: current.payload.media.map((item) => ({
          ...clone(item),
          state: "ATTACHED",
        })),
        revision: current.revision + 1,
        updatedAt: now,
      };
      await client.query(
        `UPDATE contribution_media_uploads
            SET state = 'ATTACHED',
                payload = payload || jsonb_build_object('state', 'ATTACHED')
          WHERE submission_id = $1 AND user_id = $2`,
        [submissionId, userId],
      );
      await client.query(
        `UPDATE user_submissions
            SET state = 'PENDING_REVIEW', payload = $3, revision = $4,
                updated_at = $5
          WHERE submission_id = $1 AND user_id = $2`,
        [submissionId, userId, next, next.revision, next.updatedAt],
      );
      await client.query(
        `INSERT INTO contribution_revisions(
           revision_id, submission_id, revision_no, submission_state,
           merge_state, publication_impact, payload, payload_digest, actor_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (submission_id, revision_no) DO NOTHING`,
        [
          `contribution-revision:${submissionId}:${next.revision}`,
          submissionId,
          next.revision,
          next.submissionState,
          next.mergeState,
          next.publicationImpact,
          next,
          digest(next),
          userId,
        ],
      );
      await client.query(
        `INSERT INTO moderation_cases(
           case_id, subject_type, subject_id, state, payload
         ) VALUES ($1, 'USER_CONTRIBUTION', $2, 'PENDING', $3)
         ON CONFLICT (case_id) DO UPDATE SET
           state = 'PENDING', payload = EXCLUDED.payload, resolved_at = NULL`,
        [
          `moderation:${submissionId}`,
          submissionId,
          {
            submission: next,
            contributorDigest: digest(userId).slice(0, 24),
            canonicalMergeRequired: true,
            publicationGateRequired: true,
          },
        ],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "contribution.submit",
        response: next,
        eventType: "ContributionSubmitted",
        scopeId: userId,
        payload: { userId, submissionId, revision: next.revision },
      });
      return clone(next);
    });
  }

  async submitFormalContribution(
    userId: UserId,
    input: ContributionFormalSubmitRequest,
    idempotencyKey: string,
  ): Promise<ContributionFormalSubmitResult> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<ContributionFormalSubmitResult>(client, userId, idempotencyKey);
      if (replay) return clone(replay);
      // Serialize the user/spot subject so two first submissions cannot both pass
      // the pending check when neither row exists yet.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`formal-feedback:${userId}:${input.baseline.spotId}`]);
      const formal = await client.query<{ payload: SpotDetail; spot: SpotSummary; version: number }>(
        `SELECT r.payload, s.payload AS spot, s.version
           FROM spot_overview_read_models r
           JOIN spots s USING (spot_id)
           JOIN spot_publication_assessments a USING (spot_id)
          WHERE r.spot_id = $1
            AND s.visibility_policy = 'PUBLIC_EXACT'
            AND s.status IN ('PUBLISHED', 'TEMPORARILY_CLOSED')
            AND a.complete = true
            AND a.spot_revision = s.version
            AND a.assessed_at >= now() - interval '30 days'
          FOR UPDATE OF s`,
        [input.baseline.spotId],
      );
      const formalRow = formal.rows[0];
      if (!formalRow) throw new Error("formal_spot_not_found");
      const currentBaseline = contributionFormalBaseline({ ...formalRow.payload, spot: formalRow.spot }, formalRow.version);
      const historical = await client.query<{ spot_payload: SpotSummary; detail_payload: SpotDetail }>(
        `SELECT spot_payload, detail_payload FROM spot_revisions
          WHERE spot_id = $1 AND revision_no = $2`,
        [input.baseline.spotId, input.baseline.revision],
      );
      const historicalRow = historical.rows[0];
      if (!historicalRow) throw new Error("contribution_baseline_revision_not_found");
      assertContributionBaselineMatches(
        input.baseline,
        contributionFormalBaseline({ ...historicalRow.detail_payload, spot: historicalRow.spot_payload }, input.baseline.revision),
      );

      let existing: ContributionSubmission | null = null;
      if (input.submissionId) {
        const result = await client.query<{ user_id: string; revision: number; payload: ContributionSubmission }>(
          "SELECT user_id, revision, payload FROM user_submissions WHERE submission_id = $1 FOR UPDATE",
          [input.submissionId],
        );
        const row = result.rows[0];
        if (!row || row.user_id !== userId) throw new Error("contribution_not_found");
        existing = normalizeContributionSubmission(row.payload);
        if (!isContributionEditable(existing.state)) throw new Error("contribution_not_editable");
        if (row.revision !== input.expectedSubmissionRevision) throw new Error("contribution_revision_conflict");
        if (existing.spotId !== input.baseline.spotId || existing.kind === "NEW_SPOT_PROPOSAL") throw new Error("contribution_resubmit_identity_invalid");
      }
      const pending = await client.query<{ submission_id: string }>(
        `SELECT submission_id FROM user_submissions
          WHERE user_id = $1 AND spot_id = $2 AND state = 'PENDING_REVIEW'
            AND ($3::text IS NULL OR submission_id <> $3)
          LIMIT 1 FOR UPDATE`,
        [userId, input.baseline.spotId, input.submissionId ?? null],
      );
      if (pending.rowCount) throw new Error("contribution_formal_pending_exists");

      let uploadIntent: ContributionFormalUploadIntent | null = null;
      if (input.uploadIntentId) {
        const uploadResult = await client.query<{ revision: number; payload: ContributionFormalUploadIntent; expires_at: string }>(
          "SELECT revision,payload,expires_at FROM formal_feedback_upload_intents WHERE intent_id=$1 AND user_id=$2 AND consumed_at IS NULL FOR UPDATE",
          [input.uploadIntentId, userId],
        );
        const row = uploadResult.rows[0];
        if (!row) throw new Error("formal_upload_intent_not_found");
        uploadIntent = row.payload;
        if (row.revision !== input.expectedUploadIntentRevision) throw new Error("formal_upload_intent_revision_conflict");
        if (Date.parse(row.expires_at) <= Date.now()) throw new Error("formal_upload_intent_expired");
        if (uploadIntent.spotId !== input.baseline.spotId || uploadIntent.baselineRevision !== input.baseline.revision) throw new Error("formal_upload_intent_scope_invalid");
        if (uploadIntent.uploads.some(value => value.state !== "UPLOADED")) throw new Error("formal_upload_incomplete");
        const allowed = new Set([...Object.values(input.baseline.media).flat(), ...(existing?.media ?? []).map(value => value.uploadId), ...uploadIntent.uploads.map(value => value.uploadId)]);
        if (Object.values(input.proposal.media).flatMap(value => value ?? []).some(id => !allowed.has(id))) throw new Error("contribution_formal_media_unknown");
      } else if (Object.keys(input.proposal.media).length) {
        const baselineIds = new Set([...Object.values(input.baseline.media).flat(), ...(existing?.media ?? []).map(value => value.uploadId)]);
        if (Object.values(input.proposal.media).flatMap(value => value ?? []).some(id => !baselineIds.has(id))) throw new Error("formal_upload_intent_required");
      }
      const result = buildFormalContributionResult({ request: input, currentBaseline, existing, uploads: [...(existing?.media ?? []), ...(uploadIntent?.uploads ?? [])] });
      if (result.state === "CONFLICT") {
        await this.#recordMutation(client, {
          idempotencyKey,
          operation: "formal-contribution.conflict",
          response: result,
          eventType: "FormalContributionConflictDetected",
          scopeId: userId,
          payload: { userId, spotId: input.baseline.spotId, currentRevision: currentBaseline.revision },
        });
        return clone(result);
      }
      const submission = result.submission;
      if (uploadIntent && input.uploadIntentId) {
        await client.query("UPDATE formal_feedback_upload_intents SET consumed_at=now(), revision=revision+1 WHERE intent_id=$1 AND user_id=$2",[input.uploadIntentId,userId]);
      }
      await client.query(
        `INSERT INTO user_submissions(submission_id, user_id, spot_id, state, payload, revision, created_at, updated_at)
         VALUES ($1, $2, $3, 'PENDING_REVIEW', $4, $5, $6, $7)
         ON CONFLICT (submission_id) DO UPDATE SET
           state = 'PENDING_REVIEW', payload = EXCLUDED.payload, revision = EXCLUDED.revision, updated_at = EXCLUDED.updated_at
         WHERE user_submissions.user_id = EXCLUDED.user_id`,
        [submission.submissionId, userId, submission.spotId, submission, submission.revision, submission.createdAt, submission.updatedAt],
      );
      if (uploadIntent && input.uploadIntentId) {
        await client.query("UPDATE formal_feedback_media_uploads SET state='ATTACHED',submission_id=$3,payload=payload||jsonb_build_object('state','ATTACHED') WHERE intent_id=$1 AND user_id=$2",[input.uploadIntentId,userId,submission.submissionId]);
      }
      await client.query(
        `INSERT INTO contribution_revisions(revision_id, submission_id, revision_no, submission_state, merge_state, publication_impact, payload, payload_digest, actor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [`contribution-revision:${submission.submissionId}:${submission.revision}`, submission.submissionId, submission.revision,
          submission.submissionState, submission.mergeState, submission.publicationImpact, submission, digest(submission), userId],
      );
      await client.query(
        `INSERT INTO moderation_cases(case_id, subject_type, subject_id, state, payload)
         VALUES ($1, 'USER_CONTRIBUTION', $2, 'PENDING', $3)
         ON CONFLICT (case_id) DO UPDATE SET state = 'PENDING', payload = EXCLUDED.payload, resolved_at = NULL`,
        [`moderation:${submission.submissionId}`, submission.submissionId, {
          submission,
          contributorDigest: digest(userId).slice(0, 24),
          canonicalMergeRequired: true,
          publicationGateRequired: true,
        }],
      );
      await this.#recordMutation(client, {
        idempotencyKey,
        operation: "formal-contribution.submit",
        response: result,
        eventType: "FormalContributionSubmitted",
        scopeId: userId,
        payload: { userId, submissionId: submission.submissionId, revision: submission.revision, spotRevision: currentBaseline.revision },
      });
      return clone(result);
    });
  }

  async removeContributionUpload(userId: UserId, submissionId: ContributionId, uploadId: ContributionUploadId, expectedRevision: number, idempotencyKey: string): Promise<ContributionSubmission> {
    return this.#transaction(async (client) => {
      const replay = await this.#replay<ContributionSubmission>(client, userId, idempotencyKey);
      if (replay) return clone(replay);
      const result = await client.query<{ user_id: string; state: string; revision: number; payload: ContributionSubmission }>(
        "SELECT user_id, state, revision, payload FROM user_submissions WHERE submission_id = $1 FOR UPDATE", [submissionId],
      );
      const current = result.rows[0];
      if (!current || current.user_id !== userId) throw new Error("contribution_not_found");
      if (!isContributionEditable(current.state)) throw new Error("contribution_not_editable");
      if (current.revision !== expectedRevision) throw new Error("contribution_revision_conflict");
      const upload = current.payload.media.find((item) => item.uploadId === uploadId);
      if (!upload) throw new Error("contribution_upload_not_found");
      if (upload.state === "ATTACHED") throw new Error("contribution_upload_not_editable");
      const now = new Date().toISOString();
      const candidateProfile = removeCandidateProfileMedia(normalizeContributionSubmission(current.payload), upload);
      const next: ContributionSubmission = {
        ...normalizeContributionSubmission(current.payload),
        media: current.payload.media.filter((item) => item.uploadId !== uploadId).map(clone),
        ...(candidateProfile ? { candidateProfile } : {}),
        revision: current.revision + 1, updatedAt: now,
      };
      await client.query(
        "UPDATE contribution_media_uploads SET state = 'EXPIRED', expires_at = $4, payload = payload || jsonb_build_object('state', 'EXPIRED') WHERE upload_id = $1 AND submission_id = $2 AND user_id = $3",
        [uploadId, submissionId, userId, now],
      );
      await client.query("UPDATE user_submissions SET payload = $2, revision = $3, updated_at = $4 WHERE submission_id = $1", [submissionId, next, next.revision, now]);
      await client.query(
        `INSERT INTO contribution_revisions(revision_id, submission_id, revision_no, submission_state, merge_state, publication_impact, payload, payload_digest, actor_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [`contribution-revision:${submissionId}:${next.revision}`, submissionId, next.revision, next.submissionState, next.mergeState, next.publicationImpact, next, digest(next), userId],
      );
      await this.#recordMutation(client, { idempotencyKey, operation: "contribution-upload.remove", response: next, eventType: "ContributionMediaUploadRemoved", scopeId: userId, payload: { userId, submissionId, uploadId } });
      return clone(next);
    });
  }

  async expireContributionUploads(now: string): Promise<readonly string[]> {
    return this.#transaction(async (client) => {
      const retry = await client.query<{ object_key: string }>(
        "SELECT object_key FROM contribution_media_uploads WHERE state = 'EXPIRED' AND object_key IS NOT NULL",
      );
      const formalRetry = await client.query<{ object_key: string }>(
        "SELECT object_key FROM formal_feedback_media_uploads WHERE state = 'EXPIRED' AND object_key IS NOT NULL",
      );
      const expired = await client.query<{
        upload_id: ContributionUploadId;
        submission_id: ContributionId;
        object_key: string | null;
      }>(
        `SELECT upload_id, submission_id, object_key
           FROM contribution_media_uploads
          WHERE state IN ('PENDING', 'UPLOADED') AND expires_at <= $1
          FOR UPDATE`,
        [now],
      );
      const bySubmission = new Map<ContributionId, Set<ContributionUploadId>>();
      for (const row of expired.rows) {
        const set = bySubmission.get(row.submission_id) ?? new Set();
        set.add(row.upload_id);
        bySubmission.set(row.submission_id, set);
      }
      for (const [submissionId, uploadIds] of bySubmission) {
        const row = await client.query<{
          payload: ContributionSubmission;
          revision: number;
        }>(
          `SELECT payload, revision FROM user_submissions
            WHERE submission_id = $1 FOR UPDATE`,
          [submissionId],
        );
        if (!row.rows[0]) continue;
        const next: ContributionSubmission = {
          ...normalizeContributionSubmission(row.rows[0].payload),
          media: row.rows[0].payload.media.map((item) =>
            uploadIds.has(item.uploadId)
              ? { ...clone(item), state: "EXPIRED" }
              : clone(item),
          ),
          revision: row.rows[0].revision + 1,
          updatedAt: now,
        };
        await client.query(
          `UPDATE user_submissions
              SET payload = $2, revision = $3, updated_at = $4
            WHERE submission_id = $1`,
          [submissionId, next, next.revision, now],
        );
        await client.query(
          `INSERT INTO contribution_revisions(
             revision_id, submission_id, revision_no, submission_state,
             merge_state, publication_impact, payload, payload_digest, actor_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'system:upload-cleanup')
           ON CONFLICT (submission_id, revision_no) DO NOTHING`,
          [
            `contribution-revision:${submissionId}:${next.revision}`,
            submissionId,
            next.revision,
            next.submissionState,
            next.mergeState,
            next.publicationImpact,
            next,
            digest(next),
          ],
        );
      }
      if (expired.rowCount)
        await client.query(
          `UPDATE contribution_media_uploads
              SET state = 'EXPIRED',
                  payload = payload || jsonb_build_object('state', 'EXPIRED')
            WHERE state IN ('PENDING', 'UPLOADED') AND expires_at <= $1`,
          [now],
        );
      const formalExpired = await client.query<{
        upload_id: ContributionUploadId;
        intent_id: string;
        object_key: string | null;
      }>(
        `SELECT upload_id, intent_id, object_key
           FROM formal_feedback_media_uploads
          WHERE state IN ('PENDING', 'UPLOADED') AND expires_at <= $1
          FOR UPDATE`,
        [now],
      );
      const formalByIntent = new Map<string, Set<ContributionUploadId>>();
      for (const row of formalExpired.rows) {
        const ids = formalByIntent.get(row.intent_id) ?? new Set<ContributionUploadId>();
        ids.add(row.upload_id);
        formalByIntent.set(row.intent_id, ids);
      }
      for (const [intentId, uploadIds] of formalByIntent) {
        const intent = await client.query<{ payload: ContributionFormalUploadIntent; revision: number }>(
          "SELECT payload,revision FROM formal_feedback_upload_intents WHERE intent_id=$1 FOR UPDATE",
          [intentId],
        );
        const row = intent.rows[0];
        if (!row) continue;
        const next: ContributionFormalUploadIntent = {
          ...row.payload,
          uploads: row.payload.uploads.map(upload => uploadIds.has(upload.uploadId)
            ? { ...upload, state: "EXPIRED" as const }
            : upload),
          revision: row.revision + 1,
        };
        await client.query(
          "UPDATE formal_feedback_upload_intents SET payload=$2,revision=$3 WHERE intent_id=$1",
          [intentId, next, next.revision],
        );
      }
      if (formalExpired.rowCount) await client.query(
        `UPDATE formal_feedback_media_uploads
            SET state='EXPIRED', payload=payload || jsonb_build_object('state','EXPIRED')
          WHERE state IN ('PENDING','UPLOADED') AND expires_at <= $1`,
        [now],
      );
      return [...new Set([...retry.rows.map((row) => row.object_key), ...formalRetry.rows.map((row) => row.object_key), ...expired.rows
        .map((row) => row.object_key)
        .filter((value): value is string => Boolean(value)), ...formalExpired.rows
        .map((row) => row.object_key)
        .filter((value): value is string => Boolean(value))])];
    });
  }

  async acknowledgeContributionMediaDeletion(objectKeys: readonly string[]): Promise<void> {
    if (!objectKeys.length) return;
    await this.#transaction(async client => {
      await client.query(
        "UPDATE contribution_media_uploads SET object_key = NULL WHERE state = 'EXPIRED' AND object_key = ANY($1::text[])",
        [objectKeys],
      );
      await client.query(
        "UPDATE formal_feedback_media_uploads SET object_key = NULL WHERE state = 'EXPIRED' AND object_key = ANY($1::text[])",
        [objectKeys],
      );
    });
  }

  async getContributionUploadObject(uploadId: ContributionUploadId) {
    const result = await this.pool.query<{
      object_key: string;
      mime_type: ContributionMediaUpload["mimeType"];
    }>(
      `SELECT object_key, mime_type FROM contribution_media_uploads
        WHERE upload_id = $1 AND state IN ('UPLOADED', 'ATTACHED') AND object_key IS NOT NULL
       UNION ALL
       SELECT object_key, mime_type FROM formal_feedback_media_uploads
        WHERE upload_id = $1 AND state IN ('UPLOADED', 'ATTACHED') AND object_key IS NOT NULL
       UNION ALL
       SELECT object_key, mime_type FROM spot_formal_reference_media
        WHERE upload_id = $1
       LIMIT 1`,
      [uploadId],
    );
    return result.rows[0]
      ? {
          objectKey: result.rows[0].object_key,
          mimeType: result.rows[0].mime_type,
        }
      : null;
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
      detail: SpotDetail;
      publication_assessment: unknown | null;
    }>(`SELECT s.spot_id, s.name, s.region, s.status, s.visibility_policy, s.version,
               ST_X(geom_wgs84::geometry) AS longitude,
               ST_Y(geom_wgs84::geometry) AS latitude,
               s.payload, r.payload AS detail,
               CASE
                 WHEN a.spot_revision = s.version THEN a.payload
                 ELSE NULL
               END AS publication_assessment
          FROM spots s
          JOIN spot_overview_read_models r USING (spot_id)
          LEFT JOIN spot_publication_assessments a USING (spot_id)
         ORDER BY s.display_order`);
    return result.rows;
  }

  async adminCreateSpotCandidate(input: {
    candidate: AdminSpotCandidateInput;
    actorId: string;
    requestId: string;
  }) {
    return this.#transaction(async (client) => {
      const candidate = input.candidate;
      const spotId = (candidate.spotId ?? `spot:${randomUUID()}`) as SpotId;
      if (candidate.source.kind === "TEST_FIXTURE" || candidate.source.state === "SAMPLE_DATA")
        throw new Error("admin_candidate_source_not_publishable");
      const duplicate = await client.query(
        "SELECT 1 FROM spots WHERE spot_id = $1",
        [spotId],
      );
      if (duplicate.rowCount) throw new Error("formal_spot_already_exists");

      const now = new Date().toISOString();
      const coordinate = createMapCoordinateView({
        authoritative: {
          lat: candidate.latitude,
          lon: candidate.longitude,
          system: "WGS84",
        },
      });
      const lightSource = unavailableCandidateSource(
        spotId,
        "light-pollution",
        now,
      );
      const routeSource = unavailableCandidateSource(spotId, "route", now);
      const facilities: FacilityEvidence[] = FACILITY_TYPES.map((type) => ({
        type,
        status: "UNKNOWN",
        summary: "待核验",
        detail: "尚未录入可发布的现场核验资料",
        distanceM: null,
        openingHours: null,
        usageCondition: null,
        verifiedAt: null,
        confidence: null,
        source: clone(candidate.source),
      }));
      const spot: SpotSummary = {
        spotId,
        name: candidate.name,
        region: candidate.region,
        address: candidate.address,
        timezone: candidate.timezone,
        wgs84: {
          system: "WGS84",
          latitude: coordinate.authoritative.lat,
          longitude: coordinate.authoritative.lon,
        },
        gcj02: {
          system: "GCJ02",
          latitude: coordinate.display.lat,
          longitude: coordinate.display.lon,
          derivedFrom: "WGS84",
          transformVersion: coordinate.conversionVersion,
        },
        altitudeM: candidate.altitudeM,
        status: "DATA_INSUFFICIENT",
        visibilityPolicy: candidate.visibilityPolicy,
        source: clone(candidate.source),
        lastVerifiedAt: null,
        lightPollution: {
          levelAtMost: null,
          productBand: null,
          radiance: null,
          minimumCloudFreeObservations: null,
          calibratedSkyClass: false,
          label: "暂无可发布数据",
          method: "未录入",
          datasetVersion: "UNAVAILABLE",
          dataDate: "暂无",
          precision: "未建立光害事实",
          state: "UNAVAILABLE",
          source: lightSource,
        },
        obstructionPercent: null,
        clearDirections: [],
        accessTags: [],
        facilities,
        media: [],
      };
      const detail: SpotDetail = {
        spot,
        route: {
          kind: "UNAVAILABLE",
          travelMode: null,
          originLabel: null,
          distanceKm: null,
          durationMinutes: null,
          driveMinutes: null,
          walkingMinutes: null,
          lastRoad: "待核验",
          parkingGuidance: "待核验",
          state: "UNAVAILABLE",
          source: routeSource,
        },
        decision: {
          recommendation: "DATA_INSUFFICIENT",
          label: "资料不足，暂不判断",
          skyOpportunity: {
            status: "INSUFFICIENT_DATA",
            label: "天空关键数据不足，暂不能判断",
            primaryWindow: null,
            backupWindow: null,
            windows: [],
            suitableFor: [],
            factors: [],
            confidence: null,
            freshness: "UNAVAILABLE",
            ruleVersion: "not-computed",
            inputDigest: digest({
              spotId,
              state: "SKY_OPPORTUNITY_NOT_COMPUTED",
            }),
          },
          factors: [],
          confidence: null,
          freshness: "UNAVAILABLE",
          ruleVersion: "not-computed",
          inputDigest: digest({ spotId, state: "DATA_INSUFFICIENT" }),
        },
        guides: [],
        accessAndSafety: {
          openness: "UNKNOWN",
          legalAccess: "UNKNOWN",
          nightSafety: "UNKNOWN",
          explicitDanger: null,
          restrictions: [],
          guidance: [],
        },
        siteMediaState: "UNKNOWN",
        evidence: [],
        dataDisclosure: [clone(candidate.source), lightSource, routeSource],
      };
      const assessment = evaluateSpotCompleteness({
        detail,
        review: { actorId: input.actorId, reason: candidate.reason },
      });
      if (assessment.complete)
        throw new Error("admin_candidate_unexpectedly_publishable");

      for (const source of [candidate.source, lightSource, routeSource])
        await client.query(
          `INSERT INTO data_source_registry(source_id, provider, license, license_url, payload)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (source_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
          [source.id, source.provider, source.license, source.licenseUrl, source],
        );
      await client.query(
        `INSERT INTO spots(
           spot_id, name, region, timezone, geom_wgs84, gcj02_lat, gcj02_lng,
           status, visibility_policy, source_id, payload, display_order
         ) VALUES (
           $1, $2, $3, $4,
           ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
           $7, $8, 'DATA_INSUFFICIENT', $9, $10, $11,
           COALESCE((SELECT max(display_order) + 1 FROM spots), 0)
         )`,
        [
          spotId,
          spot.name,
          spot.region,
          spot.timezone,
          spot.wgs84.longitude,
          spot.wgs84.latitude,
          spot.gcj02.latitude,
          spot.gcj02.longitude,
          spot.visibilityPolicy,
          spot.source.id,
          spot,
        ],
      );
      await client.query(
        `INSERT INTO spot_overview_read_models(spot_id, payload, dependency_digest)
         VALUES ($1, $2, $3)`,
        [spotId, detail, digest(detail)],
      );
      const candidateRevisionId = `spot-revision:${spotId}:1`;
      await client.query(
        `INSERT INTO spot_revisions(
           revision_id, spot_id, revision_no, spot_payload, detail_payload,
           payload_digest, source_ids, created_by, reason
         ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)`,
        [
          candidateRevisionId,
          spotId,
          spot,
          detail,
          digest({ spot, detail }),
          JSON.stringify(detail.dataDisclosure.map((source) => source.id)),
          input.actorId,
          candidate.reason,
        ],
      );
      await client.query(
        "UPDATE spots SET active_revision_id = $2 WHERE spot_id = $1",
        [spotId, candidateRevisionId],
      );
      for (const table of ["map_spot_summaries", "favorite_spot_summaries"])
        await client.query(
          `INSERT INTO ${table}(spot_id, payload) VALUES ($1, $2)`,
          [spotId, spot],
        );
      for (const facility of facilities)
        await client.query(
          `INSERT INTO spot_facilities(spot_id, facility_type, state, source_id, payload)
           VALUES ($1, $2, $3, $4, $5)`,
          [spotId, facility.type, facility.status, facility.source.id, facility],
        );
      await client.query(
        `INSERT INTO spot_publication_assessments(
           spot_id, spot_revision, assessment_digest, complete, payload,
           reviewed_by, review_reason, assessed_at
         ) VALUES ($1, 1, $2, false, $3, $4, $5, $6)`,
        [
          spotId,
          assessment.assessmentDigest,
          assessment,
          input.actorId,
          candidate.reason,
          assessment.checkedAt,
        ],
      );
      await client.query(
        `INSERT INTO spot_publication_assessment_events(
           assessment_event_id, spot_id, spot_revision, assessment_digest, complete, payload, actor_id, reason
         ) VALUES ($1, $2, 1, $3, false, $4, $5, $6)`,
        [randomUUID(), spotId, assessment.assessmentDigest, assessment, input.actorId, candidate.reason],
      );
      await client.query(
        `INSERT INTO spot_status_history(
           history_id, spot_id, prior_status, next_status, reason, actor_id
         ) VALUES ($1, $2, NULL, 'DATA_INSUFFICIENT', $3, $4)`,
        [randomUUID(), spotId, candidate.reason, input.actorId],
      );
      await client.query(
        `INSERT INTO audit_logs(
           audit_id, actor_id, action, subject_type, subject_id, request_id,
           before_payload, after_payload
         ) VALUES ($1, $2, 'SPOT_CANDIDATE_CREATE', 'SPOT', $3, $4, NULL, $5)`,
        [randomUUID(), input.actorId, spotId, input.requestId, detail],
      );
      return { detail, assessment };
    });
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
        version: number;
      }>(
        `SELECT s.payload, r.payload AS detail, s.status, s.version
           FROM spots s
           JOIN spot_overview_read_models r USING (spot_id)
          WHERE s.spot_id = $1
          FOR UPDATE`,
        [input.spotId],
      );
      const current = selected.rows[0];
      if (!current) throw new Error("formal_spot_not_found");
      if (
        input.patch.status === "PUBLISHED" &&
        current.status !== "PUBLISHED"
      )
        throw new Error("spot_publication_requires_lifecycle_command");
      const nextSpot = clone(current.payload);
      if (input.patch.name !== undefined) nextSpot.name = input.patch.name;
      if (input.patch.region !== undefined) nextSpot.region = input.patch.region;
      if (input.patch.address !== undefined)
        nextSpot.address = input.patch.address;
      if (input.patch.timezone !== undefined)
        nextSpot.timezone = input.patch.timezone;
      if (input.patch.altitudeM !== undefined)
        nextSpot.altitudeM = input.patch.altitudeM;
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
      if (input.patch.lastVerifiedAt !== undefined)
        nextSpot.lastVerifiedAt = input.patch.lastVerifiedAt;
      if (input.patch.lightPollution !== undefined)
        nextSpot.lightPollution = clone(input.patch.lightPollution);
      if (input.patch.obstructionPercent !== undefined)
        nextSpot.obstructionPercent = input.patch.obstructionPercent;
      if (input.patch.clearDirections !== undefined)
        nextSpot.clearDirections = [...input.patch.clearDirections];
      if (input.patch.accessTags !== undefined)
        nextSpot.accessTags = [...input.patch.accessTags];
      const nextDetail: SpotDetail = {
        ...clone(current.detail),
        spot: nextSpot,
        ...(input.patch.guides
          ? { guides: input.patch.guides.map(clone) }
          : {}),
        ...(input.patch.route ? { route: clone(input.patch.route) } : {}),
        ...(input.patch.accessAndSafety
          ? { accessAndSafety: clone(input.patch.accessAndSafety) }
          : {}),
        ...(input.patch.siteMediaState
          ? { siteMediaState: input.patch.siteMediaState }
          : {}),
        ...(input.patch.evidence
          ? { evidence: input.patch.evidence.map(clone) }
          : {}),
        ...(input.patch.dataDisclosure
          ? { dataDisclosure: input.patch.dataDisclosure.map(clone) }
          : {}),
      };
      const referencedSources = new Map(
        [
          nextSpot.source,
          nextSpot.lightPollution.source,
          nextDetail.route.source,
          ...nextSpot.facilities.map((facility) => facility.source),
          ...nextDetail.guides.map((guide) => guide.source),
          ...nextDetail.dataDisclosure,
        ].map((source) => [source.id, source]),
      );
      for (const source of referencedSources.values())
        await client.query(
          `INSERT INTO data_source_registry(source_id, provider, license, license_url, payload)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (source_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
          [source.id, source.provider, source.license, source.licenseUrl, source],
        );
      const assessment = evaluateSpotCompleteness({
        detail: nextDetail,
        review: { actorId: input.actorId, reason: input.patch.reason },
      });
      if (
        (nextSpot.status === "PUBLISHED" ||
          nextSpot.status === "TEMPORARILY_CLOSED") &&
        !assessment.complete
      )
        throw new SpotPublicationBlockedError(assessment);
      const updated = await client.query<{ version: number }>(
        `UPDATE spots SET
           name = $2,
           region = $3,
           timezone = $4,
           status = $5,
           visibility_policy = $6,
           geom_wgs84 = ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography,
           gcj02_lat = $9,
           gcj02_lng = $10,
           payload = $11,
           version = version + 1,
           updated_at = now()
         WHERE spot_id = $1
         RETURNING version`,
        [
          input.spotId,
          nextSpot.name,
          nextSpot.region,
          nextSpot.timezone,
          nextSpot.status,
          nextSpot.visibilityPolicy,
          nextSpot.wgs84.longitude,
          nextSpot.wgs84.latitude,
          nextSpot.gcj02.latitude,
          nextSpot.gcj02.longitude,
          nextSpot,
        ],
      );
      const nextRevision = updated.rows[0]?.version;
      if (!nextRevision) throw new Error("spot_update_failed");
      const revisionId = `spot-revision:${input.spotId}:${nextRevision}`;
      await client.query(
        `INSERT INTO spot_revisions(
           revision_id, spot_id, revision_no, spot_payload, detail_payload,
           payload_digest, source_ids, created_by, reason
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          revisionId,
          input.spotId,
          nextRevision,
          nextSpot,
          nextDetail,
          digest({ spot: nextSpot, detail: nextDetail }),
          JSON.stringify(nextDetail.dataDisclosure.map((source) => source.id)),
          input.actorId,
          input.patch.reason,
        ],
      );
      await client.query(
        "UPDATE spots SET active_revision_id = $2 WHERE spot_id = $1",
        [input.spotId, revisionId],
      );
      await client.query(
        `INSERT INTO spot_publication_assessments(
           spot_id, spot_revision, assessment_digest, complete, payload,
           reviewed_by, review_reason, assessed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (spot_id) DO UPDATE SET
           spot_revision = EXCLUDED.spot_revision,
           assessment_digest = EXCLUDED.assessment_digest,
           complete = EXCLUDED.complete,
           payload = EXCLUDED.payload,
           reviewed_by = EXCLUDED.reviewed_by,
           review_reason = EXCLUDED.review_reason,
           assessed_at = EXCLUDED.assessed_at`,
        [
          input.spotId,
          nextRevision,
          assessment.assessmentDigest,
          assessment.complete,
          assessment,
          input.actorId,
          input.patch.reason,
          assessment.checkedAt,
        ],
      );
      await client.query(
        `INSERT INTO spot_publication_assessment_events(
           assessment_event_id, spot_id, spot_revision, assessment_digest, complete, payload, actor_id, reason
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(),
          input.spotId,
          nextRevision,
          assessment.assessmentDigest,
          assessment.complete,
          assessment,
          input.actorId,
          input.patch.reason,
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

  async adminMergeContributionEvidence(input: {
    caseId: string;
    spotId: SpotId;
    confirmedClaims: readonly AdminContributionEvidenceClaim[];
    reason: string;
    actorId: string;
    requestId: string;
    expectedSubmissionRevision?: number;
    expectedSpotRevision?: number;
    idempotencyKey?: string;
    receiptResult?: "MODERATION_CASE";
  }) {
    return this.#transaction(async (client) => {
      const operationKey = input.idempotencyKey ?? `legacy:${input.requestId}`;
      const requestDigest = digest({
        operation: "moderation.merge",
        caseId: input.caseId,
        spotId: input.spotId,
        confirmedClaims: input.confirmedClaims,
        expectedSubmissionRevision: input.expectedSubmissionRevision ?? null,
        expectedSpotRevision: input.expectedSpotRevision ?? null,
        reason: input.reason,
      });
      const replay = await this.#adminReceiptReplay<{
        contribution: ContributionSubmission;
        canonicalMerge: Record<string, unknown>;
        detail: SpotDetail;
        assessment: ReturnType<typeof evaluateSpotCompleteness>;
      }>(client, input.actorId, operationKey, "moderation.merge", requestDigest);
      if (replay) return replay.result;
      const moderation = await client.query<{
        case_id: string;
        subject_type: string;
        subject_id: string;
        state: string;
        payload: Record<string, unknown>;
      }>(
        "SELECT * FROM moderation_cases WHERE case_id = $1 FOR UPDATE",
        [input.caseId],
      );
      const review = moderation.rows[0];
      if (!review || review.subject_type !== "USER_CONTRIBUTION")
        throw new Error("contribution_moderation_case_not_found");
      if (review.state !== "APPROVED" && review.state !== "ACCEPTED")
        throw new Error("contribution_moderation_not_approved");
      if (
        review.payload.canonicalMergeRequired === false ||
        review.payload.canonicalMerge !== undefined
      )
        throw new Error("contribution_already_merged");

      const contributionResult = await client.query<{
        payload: ContributionSubmission;
      }>(
        "SELECT payload FROM user_submissions WHERE submission_id = $1 FOR UPDATE",
        [review.subject_id],
      );
      const submission = contributionResult.rows[0]?.payload;
      if (!submission || (submission.state !== "APPROVED" && submission.submissionState !== "ACCEPTED"))
        throw new Error("contribution_review_state_conflict");
      const normalizedSubmission = normalizeContributionSubmission(submission);
      if (
        input.expectedSubmissionRevision !== undefined &&
        normalizedSubmission.revision !== input.expectedSubmissionRevision
      )
        throw new Error("contribution_revision_conflict");
      const claims = [...new Set(input.confirmedClaims)];
      if (!claims.length || claims.length !== input.confirmedClaims.length)
        throw new Error("contribution_merge_claims_invalid");
      const allowedClaims = new Set<AdminContributionEvidenceClaim>(
        contributionAllowedMergeClaims(normalizedSubmission),
      );
      if (claims.some((claim) => !allowedClaims.has(claim)))
        throw new Error("contribution_merge_claim_not_reported");
      if (
        claims.includes("SITE_MEDIA_PROVENANCE") &&
        (!submission.rightsConfirmed ||
          !submission.media.some((media) => media.state === "ATTACHED"))
      )
        throw new Error("contribution_merge_media_evidence_missing");
      const acceptedMediaIds = new Set<string>();
      if (claims.includes("SITE_MEDIA_PROVENANCE")) {
        const mediaIds = submission.media
          .filter((media) => media.state === "ATTACHED")
          .map((media) => media.uploadId);
        const reviewed = await client.query<{ upload_id: string }>(
          `SELECT upload_id FROM contribution_media_uploads
            WHERE upload_id = ANY($1::text[]) AND review_state = 'ACCEPTED'
           UNION ALL
           SELECT upload_id FROM formal_feedback_media_uploads
            WHERE upload_id = ANY($1::text[]) AND review_state = 'ACCEPTED'`,
          [mediaIds],
        );
        for (const row of reviewed.rows) acceptedMediaIds.add(row.upload_id);
        if (acceptedMediaIds.size !== mediaIds.length)
          throw new Error("contribution_merge_media_not_accepted");
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const evidenceObservedAt = submission.observedAt ??
        (submission.kind === "CORRECTION" || submission.kind === "NEW_SPOT_PROPOSAL" ? nowIso : null);
      const observedAtMs = evidenceObservedAt ? Date.parse(evidenceObservedAt) : Number.NaN;
      if (
        !Number.isFinite(observedAtMs) ||
        observedAtMs > now.getTime() + 5 * 60_000 ||
        now.getTime() - observedAtMs > CORE_FIELD_EVIDENCE_MAX_AGE_MS
      )
        throw new Error("contribution_field_evidence_stale_or_missing");
      const validTo = new Date(
        observedAtMs + CORE_FIELD_EVIDENCE_MAX_AGE_MS,
      ).toISOString();

      const selected = await client.query<{
        payload: SpotSummary;
        detail: SpotDetail;
        status: SpotSummary["status"];
        version: number;
      }>(
        `SELECT s.payload, r.payload AS detail, s.status, s.version
           FROM spots s
           JOIN spot_overview_read_models r USING (spot_id)
          WHERE s.spot_id = $1
          FOR UPDATE`,
        [input.spotId],
      );
      const current = selected.rows[0];
      if (!current) throw new Error("formal_spot_not_found");
      if (
        input.expectedSpotRevision !== undefined &&
        current.version !== input.expectedSpotRevision
      )
        throw new Error("spot_revision_conflict");
      if (submission.spotId && submission.spotId !== input.spotId)
        throw new Error("contribution_merge_spot_mismatch");
      assertNewSpotContributionTarget(normalizedSubmission, current.payload);

      const source: SourceSummary = {
        id: `contribution-source:${submission.submissionId}`,
        kind: "USER_FIELD_REPORT",
        provider: "经管理员核验的登录用户现场投稿",
        title: `${submission.spotNameSnapshot ?? submission.candidateLocation?.displayName ?? current.payload.name} 的现场事实投稿`,
        sourceUrl: "",
        license: submission.rightsConfirmed
          ? "用户确认有权提交所附材料；公开再利用仍由管理员逐项核验"
          : "站内现场事实投稿；不包含媒体再分发授权",
        licenseUrl: "",
        publishedAt: null,
        retrievedAt: submission.updatedAt,
        validFrom: evidenceObservedAt,
        validTo,
        state: "FRESH",
        confidence: null,
        precision: "用户现场材料经管理员人工核验；仅确认本次显式选择的事实",
        limitations: [
          "自由文本不会自动覆盖结构化点位字段",
          "原始投稿与私有媒体不进入普通公开读模型",
          "合并后仍须重新通过正式点完整度和发布门",
        ],
      };
      const mediaIds = submission.media
        .filter((media) => media.state === "ATTACHED")
        .map((media) => media.uploadId);
      const evidence = claims.map<FactEvidence>((claim) => ({
        evidenceId: `evidence:${submission.submissionId}:${claim}`,
        subjectType: contributionEvidenceSubject(claim),
        subjectId: input.spotId,
        claim,
        state: "CONFIRMED",
        sourceType: "OPERATOR",
        sourceId: source.id,
        mediaIds,
        observedAt: evidenceObservedAt,
        verifiedAt: nowIso,
        validTo,
        confidence: null,
      }));
      const evidenceIds = new Set(evidence.map((item) => item.evidenceId));
      const resolvedProposal = contributionResolvedProposal(normalizedSubmission);
      const mergedFormalFacts = { ...(current.detail.formalFacts ?? {}) } as Record<string, string | null>;
      const mergedFormalFieldKeys = new Set<string>();
      for (const [field, value] of Object.entries(resolvedProposal?.fields ?? {})) {
        const topic = FORMAL_FIELD_TOPIC[field as keyof typeof FORMAL_FIELD_TOPIC];
        if (topic && CONTRIBUTION_TOPIC_CLAIMS[topic].some(claim => claims.includes(claim))) {
          mergedFormalFacts[field] = value.trim() || null;
          mergedFormalFieldKeys.add(field);
        }
      }
      const nextRoute = clone(current.detail.route);
      const nextAccessAndSafety = clone(current.detail.accessAndSafety);
      let nextFacilities = current.detail.spot.facilities.map(clone);
      const upsertFacility = (
        type: FacilityEvidence["type"],
        patch: Partial<Pick<FacilityEvidence, "status" | "summary" | "detail">>,
      ) => {
        const index = nextFacilities.findIndex((facility) => facility.type === type);
        if (index >= 0) {
          nextFacilities[index] = {
            ...nextFacilities[index]!,
            ...patch,
            verifiedAt: nowIso,
            source,
          };
          return;
        }
        nextFacilities = [
          ...nextFacilities,
          {
            type,
            status: patch.status ?? "UNKNOWN",
            summary: patch.summary ?? "待核验",
            detail: patch.detail ?? "",
            distanceM: null,
            openingHours: null,
            usageCondition: null,
            verifiedAt: nowIso,
            confidence: null,
            source,
          },
        ];
      };
      if (mergedFormalFieldKeys.has("road")) nextRoute.lastRoad = mergedFormalFacts.road ?? "";
      if (mergedFormalFieldKeys.has("parkingNote")) nextRoute.parkingGuidance = mergedFormalFacts.parkingNote ?? "";
      if (mergedFormalFieldKeys.has("openness")) nextAccessAndSafety.openness = formalOpenness(mergedFormalFacts.openness ?? null);
      if (mergedFormalFieldKeys.has("access")) nextAccessAndSafety.legalAccess = formalLegalAccess(mergedFormalFacts.access ?? null);
      if (mergedFormalFieldKeys.has("accessNote")) nextAccessAndSafety.restrictions = mergedFormalFacts.accessNote ? [mergedFormalFacts.accessNote] : [];
      if (mergedFormalFieldKeys.has("safety")) nextAccessAndSafety.guidance = mergedFormalFacts.safety ? [mergedFormalFacts.safety] : [];
      if (mergedFormalFieldKeys.has("parking")) upsertFacility("PARKING", {
        status: formalFacilityStatus(mergedFormalFacts.parking ?? null),
        summary: mergedFormalFacts.parking ?? "停车情况待核验",
      });
      if (mergedFormalFieldKeys.has("parkingNote")) upsertFacility("PARKING", { detail: mergedFormalFacts.parkingNote ?? "" });
      if (mergedFormalFieldKeys.has("toilet")) upsertFacility("TOILET", {
        status: formalFacilityStatus(mergedFormalFacts.toilet ?? null),
        summary: mergedFormalFacts.toilet ?? "洗手间情况待核验",
      });
      if (mergedFormalFieldKeys.has("toiletNote")) upsertFacility("TOILET", { detail: mergedFormalFacts.toiletNote ?? "" });
      if (mergedFormalFieldKeys.has("platform")) upsertFacility("PLATFORM", { detail: mergedFormalFacts.platform ?? "" });
      if (mergedFormalFieldKeys.has("signal")) upsertFacility("SIGNAL", { detail: mergedFormalFacts.signal ?? "" });
      if (mergedFormalFieldKeys.has("camping")) upsertFacility("CAMPING", { detail: mergedFormalFacts.camping ?? "" });
      const formalMediaKind = new Map<string, "parking" | "toilet" | "site">();
      for (const [kind, ids] of Object.entries(resolvedProposal?.media ?? {}))
        for (const id of ids ?? []) formalMediaKind.set(id, kind as "parking" | "toilet" | "site");
      const mergedFormalMedia = { ...(current.detail.formalMedia ?? {}) };
      if (claims.includes("SITE_MEDIA_PROVENANCE") && resolvedProposal) {
        const existingCanonicalMedia = new Set([
          ...current.detail.spot.media.map((media) => media.id),
          ...Object.values(current.detail.formalMedia ?? {}).flatMap((ids) => ids ?? []),
        ]);
        for (const [kind, ids] of Object.entries(resolvedProposal.media)) {
          const proposed = ids ?? [];
          if (proposed.some((id) => !existingCanonicalMedia.has(id) && !acceptedMediaIds.has(id)))
            throw new Error("contribution_merge_media_not_accepted");
          mergedFormalMedia[kind as "parking" | "toilet" | "site"] = [...proposed];
        }
        for (const uploadId of acceptedMediaIds) {
          const kind = formalMediaKind.get(uploadId);
          if (!kind) continue;
          const copied = await client.query(
            `INSERT INTO spot_formal_reference_media(
               upload_id, spot_id, kind, object_key, mime_type, source_submission_id, payload
             )
             SELECT upload_id, $2, $3, object_key, mime_type, $4, payload
               FROM (
                 SELECT upload_id, object_key, mime_type, payload
                   FROM formal_feedback_media_uploads
                  WHERE upload_id = $1 AND review_state = 'ACCEPTED' AND object_key IS NOT NULL
                 UNION ALL
                 SELECT upload_id, object_key, mime_type, payload
                   FROM contribution_media_uploads
                  WHERE upload_id = $1 AND review_state = 'ACCEPTED' AND object_key IS NOT NULL
               ) accepted_media
              LIMIT 1
             ON CONFLICT (upload_id) DO NOTHING`,
            [uploadId, input.spotId, kind, submission.submissionId],
          );
          if (!copied.rowCount) {
            const existing = await client.query<{ spot_id: string; kind: string }>(
              "SELECT spot_id,kind FROM spot_formal_reference_media WHERE upload_id=$1",
              [uploadId],
            );
            if (existing.rows[0]?.spot_id !== input.spotId || existing.rows[0]?.kind !== kind)
              throw new Error("contribution_merge_media_canonical_conflict");
          }
        }
      }
      const nextSpot: SpotSummary = {
        ...clone(current.payload),
        ...(Object.prototype.hasOwnProperty.call(mergedFormalFacts, "name") && mergedFormalFacts.name
          ? { name: mergedFormalFacts.name }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(mergedFormalFacts, "address") && mergedFormalFacts.address !== null
          ? { address: mergedFormalFacts.address }
          : {}),
        facilities: nextFacilities,
        status: "DATA_INSUFFICIENT",
        lastVerifiedAt: nowIso,
      };
      const nextDetail: SpotDetail = {
        ...clone(current.detail),
        spot: nextSpot,
        route: nextRoute,
        accessAndSafety: nextAccessAndSafety,
        evidence: [
          ...current.detail.evidence
            .filter((item) => !evidenceIds.has(item.evidenceId))
            .map(clone),
          ...evidence,
        ],
        dataDisclosure: [
          ...current.detail.dataDisclosure
            .filter((item) => item.id !== source.id)
            .map(clone),
          source,
        ],
        ...(resolvedProposal ? { formalFacts: mergedFormalFacts } : {}),
        ...(resolvedProposal ? { formalMedia: mergedFormalMedia } : {}),
      };
      const assessment = evaluateSpotCompleteness({
        detail: nextDetail,
        review: { actorId: input.actorId, reason: input.reason },
        now,
      });
      const mergedSubmission: ContributionSubmission = {
        ...normalizedSubmission,
        ...(normalizedSubmission.kind === "NEW_SPOT_PROPOSAL" ? { spotId: input.spotId } : {}),
        state: normalizedSubmission.state,
        submissionState: normalizedSubmission.submissionState,
        mergeState: "MERGED",
        publicationImpact: assessment.complete
          ? "ACTIVE_REVISION_UPDATED"
          : "CANDIDATE_UPDATED",
        revision: normalizedSubmission.revision + 1,
        updatedAt: nowIso,
        statusHistory: [
          ...normalizedSubmission.statusHistory,
          contributionEvent("MERGE", normalizedSubmission.mergeState, "MERGED", input.reason, "OPERATOR"),
          contributionEvent(
            "PUBLICATION",
            normalizedSubmission.publicationImpact,
            assessment.complete ? "ACTIVE_REVISION_UPDATED" : "CANDIDATE_UPDATED",
            input.reason,
            "OPERATOR",
          ),
        ],
      };

      await client.query(
        `INSERT INTO data_source_registry(source_id, provider, license, license_url, payload)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source_id) DO UPDATE SET
           provider = EXCLUDED.provider,
           license = EXCLUDED.license,
           license_url = EXCLUDED.license_url,
           payload = EXCLUDED.payload,
           updated_at = now()`,
        [source.id, source.provider, source.license, source.licenseUrl, source],
      );
      const updated = await client.query<{ version: number }>(
        `UPDATE spots SET
           status = 'DATA_INSUFFICIENT', payload = $2,
           version = version + 1, updated_at = now()
         WHERE spot_id = $1
         RETURNING version`,
        [input.spotId, nextSpot],
      );
      const nextRevision = updated.rows[0]?.version;
      if (!nextRevision) throw new Error("spot_update_failed");
      await client.query(
        `INSERT INTO spot_revisions(
           revision_id, spot_id, revision_no, spot_payload, detail_payload,
           payload_digest, source_ids, created_by, reason
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          `spot-revision:${input.spotId}:${nextRevision}`,
          input.spotId,
          nextRevision,
          nextSpot,
          nextDetail,
          digest({ spot: nextSpot, detail: nextDetail }),
           JSON.stringify(nextDetail.dataDisclosure.map((item) => item.id)),
          input.actorId,
          input.reason,
        ],
      );
      await client.query(
        `UPDATE spots SET active_revision_id = $2 WHERE spot_id = $1`,
        [input.spotId, `spot-revision:${input.spotId}:${nextRevision}`],
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
      await client.query(
        `INSERT INTO spot_publication_assessments(
           spot_id, spot_revision, assessment_digest, complete, payload,
           reviewed_by, review_reason, assessed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (spot_id) DO UPDATE SET
           spot_revision = EXCLUDED.spot_revision,
           assessment_digest = EXCLUDED.assessment_digest,
           complete = EXCLUDED.complete,
           payload = EXCLUDED.payload,
           reviewed_by = EXCLUDED.reviewed_by,
           review_reason = EXCLUDED.review_reason,
           assessed_at = EXCLUDED.assessed_at`,
        [
          input.spotId,
          nextRevision,
          assessment.assessmentDigest,
          assessment.complete,
          assessment,
          input.actorId,
          input.reason,
          assessment.checkedAt,
        ],
      );
      if (current.status !== "DATA_INSUFFICIENT")
        await client.query(
          `INSERT INTO spot_status_history(
             history_id, spot_id, prior_status, next_status, reason, actor_id
           ) VALUES ($1, $2, $3, 'DATA_INSUFFICIENT', $4, $5)`,
          [randomUUID(), input.spotId, current.status, input.reason, input.actorId],
        );
      const canonicalMerge = {
        spotId: input.spotId,
        claims,
        sourceId: source.id,
        mergedAt: nowIso,
        actorId: input.actorId,
        resultingSpotRevision: nextRevision,
        publicationAssessmentDigest: assessment.assessmentDigest,
      };
      const mergedCase = await client.query(
        `UPDATE moderation_cases
            SET payload = payload || jsonb_build_object(
              'canonicalMergeRequired', false,
              'publicationGateRequired', true,
              'canonicalMerge', $2::jsonb,
              'submission', $3::jsonb
            )
          WHERE case_id = $1
          RETURNING *`,
        [input.caseId, JSON.stringify(canonicalMerge), JSON.stringify(mergedSubmission)],
      );
      await client.query(
        `UPDATE user_submissions
            SET payload = $2, revision = $3, merge_state = 'MERGED',
                publication_impact = $4, updated_at = $5, spot_id = $6
          WHERE submission_id = $1`,
        [review.subject_id, mergedSubmission, mergedSubmission.revision, mergedSubmission.publicationImpact, nowIso, mergedSubmission.spotId],
      );
      await this.#insertContributionRevision(client, mergedSubmission, input.actorId);
      await client.query(
        `INSERT INTO contribution_merge_events(
           merge_event_id, case_id, submission_id, spot_id, submission_revision,
           prior_spot_revision, resulting_spot_revision, confirmed_claims,
           source_ids, actor_id, reason, idempotency_scope, idempotency_key
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          randomUUID(),
          input.caseId,
          review.subject_id,
          input.spotId,
          normalizedSubmission.revision,
          current.version,
          nextRevision,
          JSON.stringify(claims),
          JSON.stringify([source.id]),
          input.actorId,
          input.reason,
          input.actorId,
          operationKey,
        ],
      );
      await client.query(
        `INSERT INTO moderation_case_events(event_id, case_id, event_type, actor_id, reason, redacted_payload)
         VALUES ($1, $2, 'MERGE_COMMITTED', $3, $4, $5)`,
        [randomUUID(), input.caseId, input.actorId, input.reason, { spotRevision: nextRevision, claims }],
      );
      await client.query(
        `INSERT INTO audit_logs(
           audit_id, actor_id, action, subject_type, subject_id, request_id,
           before_payload, after_payload
         ) VALUES ($1, $2, 'CONTRIBUTION_CANONICAL_MERGE', 'SPOT', $3, $4, $5, $6)`,
        [
          randomUUID(),
          input.actorId,
          input.spotId,
          input.requestId,
          { moderation: review, spot: current.detail },
          { moderation: mergedCase.rows[0], spot: nextDetail, assessment },
        ],
      );
      const response = {
        contribution: mergedSubmission,
        canonicalMerge,
        detail: nextDetail,
        assessment,
      };
      const receiptView =
        input.receiptResult === "MODERATION_CASE"
          ? await this.#readModerationCase(client, input.caseId)
          : null;
      if (input.receiptResult === "MODERATION_CASE" && !receiptView)
        throw new Error("moderation_case_readback_missing");
      await this.#commitAdminResult(client, {
        operation: "moderation.merge",
        scopeId: input.actorId,
        idempotencyKey: operationKey,
        requestId: input.requestId,
        actorId: input.actorId,
        result: receiptView ?? response,
        readback: receiptView ?? response,
        resultingRevision: nextRevision,
        assessmentDigest: assessment.assessmentDigest,
        eventType: "ContributionCanonicalMerge",
        eventPayload: { caseId: input.caseId, spotId: input.spotId, revision: nextRevision },
        requestDigest,
      });
      return response;
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
    resolution: "ACCEPTED" | "APPROVED" | "REJECTED";
    reason: string;
    actorId: string;
    requestId: string;
    expectedRevision?: number;
    idempotencyKey?: string;
  }) {
    return this.#transaction(async (client) => {
      const operationKey = input.idempotencyKey ?? `legacy:${input.requestId}`;
      const requestDigest = digest({
        operation: "moderation.resolve",
        caseId: input.caseId,
        resolution: input.resolution,
        reason: input.reason,
        expectedRevision: input.expectedRevision ?? null,
      });
      const replay = await this.#adminReceiptReplay<ModerationCaseView>(
        client,
        input.actorId,
        operationKey,
        "moderation.resolve",
        requestDigest,
      );
      if (replay) return replay;
      const before = await client.query<{
        case_id: string;
        subject_type: string;
        subject_id: string;
        state: string;
        payload: Record<string, unknown>;
      }>(
        "SELECT * FROM moderation_cases WHERE case_id = $1 FOR UPDATE",
        [input.caseId],
      );
      if (!before.rows[0]) throw new Error("moderation_case_not_found");
      if (before.rows[0].state !== "PENDING" && before.rows[0].state !== "CHANGES_REQUESTED")
        throw new Error("moderation_case_already_resolved");
      let contribution: ContributionSubmission | null = null;
      if (before.rows[0].subject_type === "USER_CONTRIBUTION") {
        const result = await client.query<{
          payload: ContributionSubmission;
          revision: number;
        }>(
          `SELECT payload, revision FROM user_submissions
            WHERE submission_id = $1 FOR UPDATE`,
          [before.rows[0].subject_id],
        );
        if (!result.rows[0]) throw new Error("contribution_not_found");
        if (
          input.expectedRevision !== undefined &&
          result.rows[0].revision !== input.expectedRevision
        )
          throw new Error("contribution_revision_conflict");
        if (
          result.rows[0].payload.state !== "PENDING_REVIEW" &&
          result.rows[0].payload.state !== "CHANGES_REQUESTED"
        )
          throw new Error("contribution_review_state_conflict");
        const reviewedAt = new Date().toISOString();
        const base = normalizeContributionSubmission(result.rows[0].payload);
        const submissionState =
          input.resolution === "APPROVED" ? "ACCEPTED" : input.resolution;
        const review = {
          resolution: input.resolution,
          reason: input.reason,
          reviewedAt,
        } as const;
        contribution = {
          ...base,
          ...reviewLatestContributionAttempt(base, review),
          state: input.resolution,
          submissionState,
          revision: result.rows[0].revision + 1,
          updatedAt: reviewedAt,
          review,
          statusHistory: [
            ...base.statusHistory,
            contributionEvent(
              "SUBMISSION",
              base.submissionState,
              submissionState,
              input.reason,
              "OPERATOR",
            ),
          ],
        };
        await client.query(
          `UPDATE user_submissions
              SET state = $2, submission_state = $5, payload = $3, revision = $4,
                  updated_at = $6, reviewed_at = $6
            WHERE submission_id = $1`,
          [
            before.rows[0].subject_id,
            input.resolution,
            contribution,
            contribution.revision,
            submissionState,
            reviewedAt,
          ],
        );
        await this.#insertContributionRevision(client, contribution, input.actorId);
      }
      const after = await client.query(
        `UPDATE moderation_cases
            SET state = $2, resolved_at = now(),
                payload = payload || jsonb_build_object(
                  'resolutionReason', $3::text,
                  'canonicalMergeRequired', $4::boolean,
                  'publicationGateRequired', $4::boolean,
                  'submission', $5::jsonb
                )
          WHERE case_id = $1
          RETURNING *`,
        [
          input.caseId,
          input.resolution,
          input.reason,
          before.rows[0].subject_type === "USER_CONTRIBUTION" &&
            (input.resolution === "APPROVED" || input.resolution === "ACCEPTED"),
          contribution,
        ],
      );
      await client.query(
        `INSERT INTO moderation_case_events(event_id, case_id, event_type, actor_id, reason, redacted_payload)
         VALUES ($1, $2, 'REVIEW_RESOLVED', $3, $4, $5)`,
        [randomUUID(), input.caseId, input.actorId, input.reason, { resolution: input.resolution }],
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
      const readback = await this.#readModerationCase(client, input.caseId);
      if (!readback) throw new Error("moderation_case_readback_missing");
      return this.#commitAdminResult(client, {
        operation: "moderation.resolve",
        scopeId: input.actorId,
        idempotencyKey: operationKey,
        requestId: input.requestId,
        actorId: input.actorId,
        result: readback,
        readback,
        resultingRevision: contribution?.revision ?? null,
        assessmentDigest: null,
        eventType: "ModerationResolved",
        eventPayload: {
          caseId: input.caseId,
          resolution: input.resolution,
          submissionRevision: contribution?.revision ?? null,
        },
        requestDigest,
      });
    });
  }

  async adminOperations() {
    const [sources, health, costs, decisions, opportunities, audits, jobs] = await Promise.all([
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
        "SELECT snapshot_id, spot_id, local_date, rule_version, input_digest, source_snapshot_ids, payload, generated_at FROM sky_opportunity_snapshots ORDER BY generated_at DESC LIMIT 100",
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
      decisions: [
        ...opportunities.rows.map((row) => ({
          conclusion: "SKY_OPPORTUNITY",
          ...row,
        })),
        ...decisions.rows.map((row) => ({
          conclusion: "TRIP_DECISION",
          ...row,
        })),
      ].sort(
        (left, right) =>
          Date.parse(String(right.generated_at)) -
          Date.parse(String(left.generated_at)),
      ),
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

  async #replay<T = unknown>(
    client: PoolClient,
    scopeId: string,
    key: string,
  ) {
    const result = await client.query<{ response: T }>(
      `SELECT response FROM idempotency_records
        WHERE scope_id = $1 AND idempotency_key = $2`,
      [scopeId, key],
    );
    const response = result.rows[0]?.response ?? null;
    assertReceiptNotErased(response);
    return response;
  }

  async #recordMutation(
    client: PoolClient,
    input: {
      idempotencyKey: string;
      operation: string;
      response: unknown;
      eventType: string;
      scopeId: string;
      payload: unknown;
      requestDigest?: string;
    },
  ) {
    await client.query(
      `INSERT INTO idempotency_records(
         scope_id, idempotency_key, operation, request_digest, response
       ) VALUES ($1, $2, $3, $4, $5)`,
      [
        input.scopeId,
        input.idempotencyKey,
        input.operation,
        input.requestDigest ?? digest({ operation: input.operation, payload: input.payload }),
        input.response,
      ],
    );
    await client.query(
      `INSERT INTO outbox_events(event_id, event_type, idempotency_key, payload)
       VALUES ($1, $2, $3, $4)`,
      [
        randomUUID(),
        input.eventType,
        `${input.scopeId}:${input.idempotencyKey}`,
        input.payload,
      ],
    );
  }

  async adminListModerationQueue(): Promise<readonly ModerationQueueItem[]> {
    const result = await this.pool.query<{
      case_id: string;
      subject_type: string;
      subject_id: string;
      state: string;
      payload: Record<string, unknown>;
      created_at: string | Date;
    }>(
      `SELECT case_id, subject_type, subject_id, state, payload, created_at
         FROM moderation_cases
        WHERE state IN ('PENDING', 'CHANGES_REQUESTED')
        ORDER BY created_at ASC`,
    );
    const now = Date.now();
    return result.rows.map((row) => {
      const submission = row.payload.submission as ContributionSubmission | undefined;
      const normalized = submission
        ? normalizeContributionSubmission(submission)
        : null;
      const riskFlags = [
        ...(normalized?.kind === "NEW_SPOT_PROPOSAL" ? ["NEW_SPOT"] : []),
        ...(normalized?.candidateLocation ? ["PRECISE_LOCATION"] : []),
        ...(normalized?.media.length ? ["MEDIA_REVIEW"] : []),
      ];
      const ageSeconds = Math.max(
        0,
        Math.floor((now - Date.parse(new Date(row.created_at).toISOString())) / 1_000),
      );
      return {
        caseId: row.case_id as ModerationQueueItem["caseId"],
        subjectType: row.subject_type as ModerationQueueItem["subjectType"],
        subjectId: row.subject_id,
        state: row.state as ModerationQueueItem["state"],
        kind: normalized?.kind ?? null,
        priority: riskFlags.length > 1 ? "HIGH" : ageSeconds > 86_400 ? "HIGH" : "NORMAL",
        riskFlags,
        ageSeconds,
        createdAt: new Date(row.created_at).toISOString(),
        spotId: normalized?.spotId ?? null,
      };
    });
  }

  async adminGetModerationCase(caseId: string): Promise<ModerationCaseView | null> {
    return this.#readModerationCase(this.pool, caseId);
  }

  async adminGetMediaReview(uploadId: ContributionUploadId): Promise<MediaReviewView | null> {
    const result = await this.pool.query<{
      upload_id: ContributionUploadId;
      submission_id: ContributionId;
      state: ContributionMediaUpload["state"];
      mime_type: ContributionMediaUpload["mimeType"];
      byte_size: number | null;
      sha256: string | null;
      review_state: string;
      review_reason: string | null;
      rights_confirmed: boolean;
    }>(
      `SELECT m.upload_id, m.submission_id, m.state, m.mime_type, m.byte_size,
              m.sha256, m.review_state, m.review_reason,
              s.payload->>'rightsConfirmed' = 'true' AS rights_confirmed
         FROM contribution_media_uploads m
         JOIN user_submissions s USING (submission_id)
        WHERE m.upload_id = $1
       UNION ALL
       SELECT m.upload_id, m.submission_id, m.state, m.mime_type,
              NULLIF(m.payload->>'byteSize', '')::integer AS byte_size,
              NULLIF(m.payload->>'sha256', '') AS sha256,
              m.review_state, m.review_reason,
              s.payload->>'rightsConfirmed' = 'true' AS rights_confirmed
         FROM formal_feedback_media_uploads m
         JOIN user_submissions s USING (submission_id)
        WHERE m.upload_id = $1
       LIMIT 1`,
      [uploadId],
    );
    return result.rows[0] ? toMediaReviewView(result.rows[0]) : null;
  }

  async adminRequestContributionChanges(input: {
    caseId: string;
    reason: string;
    expectedRevision: number;
    actorId: string;
    requestId: string;
    idempotencyKey: string;
  }): Promise<AdminMutationResult<ModerationCaseView>> {
    return this.#transaction(async (client) => {
      const requestDigest = digest({
        operation: "moderation.request-changes",
        caseId: input.caseId,
        reason: input.reason,
        expectedRevision: input.expectedRevision,
      });
      const replay = await this.#adminReceiptReplay<ModerationCaseView>(
        client,
        input.actorId,
        input.idempotencyKey,
        "moderation.request-changes",
        requestDigest,
      );
      if (replay) return replay;
      const caseRow = await client.query<{
        case_id: string;
        subject_type: string;
        subject_id: string;
        state: string;
        payload: Record<string, unknown>;
        created_at: string | Date;
        resolved_at: string | Date | null;
      }>("SELECT * FROM moderation_cases WHERE case_id = $1 FOR UPDATE", [input.caseId]);
      const currentCase = caseRow.rows[0];
      if (!currentCase) throw new Error("moderation_case_not_found");
      if (currentCase.state !== "PENDING" && currentCase.state !== "CHANGES_REQUESTED")
        throw new Error("moderation_case_already_resolved");
      if (currentCase.subject_type !== "USER_CONTRIBUTION")
        throw new Error("moderation_subject_unsupported");
      const submissionRow = await client.query<{
        payload: ContributionSubmission;
        revision: number;
      }>(
        `SELECT payload, revision FROM user_submissions
          WHERE submission_id = $1 FOR UPDATE`,
        [currentCase.subject_id],
      );
      const current = submissionRow.rows[0];
      if (!current) throw new Error("contribution_not_found");
      if (current.revision !== input.expectedRevision)
        throw new Error("contribution_revision_conflict");
      const base = normalizeContributionSubmission(current.payload);
      const now = new Date().toISOString();
      const review = {
        resolution: "CHANGES_REQUESTED",
        reason: input.reason,
        reviewedAt: now,
      } as const;
      const next: ContributionSubmission = {
        ...base,
        ...reviewLatestContributionAttempt(base, review),
        state: "CHANGES_REQUESTED",
        submissionState: "CHANGES_REQUESTED",
        review,
        revision: current.revision + 1,
        updatedAt: now,
        statusHistory: [
          ...base.statusHistory,
          contributionEvent("SUBMISSION", base.submissionState, "CHANGES_REQUESTED", input.reason, "OPERATOR"),
        ],
      };
      await client.query(
        `UPDATE user_submissions
            SET state = 'CHANGES_REQUESTED', submission_state = 'CHANGES_REQUESTED',
                payload = $2, revision = $3, updated_at = $4, reviewed_at = $4
          WHERE submission_id = $1`,
        [currentCase.subject_id, next, next.revision, now],
      );
      await this.#insertContributionRevision(client, next, input.actorId);
      const nextPayload = {
        ...currentCase.payload,
        submission: next,
        canonicalMergeRequired: false,
        publicationGateRequired: true,
      };
      const updatedCase = await client.query(
        `UPDATE moderation_cases
            SET state = 'CHANGES_REQUESTED', payload = $2, resolved_at = NULL
          WHERE case_id = $1
          RETURNING *`,
        [input.caseId, nextPayload],
      );
      await client.query(
        `INSERT INTO moderation_case_events(event_id, case_id, event_type, actor_id, reason, redacted_payload)
         VALUES ($1, $2, 'REQUEST_CHANGES', $3, $4, $5)`,
        [randomUUID(), input.caseId, input.actorId, input.reason, { submissionRevision: next.revision }],
      );
      await client.query(
        `INSERT INTO audit_logs(audit_id, actor_id, action, subject_type, subject_id, request_id, before_payload, after_payload)
         VALUES ($1, $2, 'CONTRIBUTION_REQUEST_CHANGES', 'MODERATION_CASE', $3, $4, $5, $6)`,
        [randomUUID(), input.actorId, input.caseId, input.requestId, currentCase.payload, nextPayload],
      );
      const readback = await this.#readModerationCase(client, input.caseId);
      if (!readback) throw new Error("moderation_case_readback_missing");
      return this.#commitAdminResult(client, {
        operation: "moderation.request-changes",
        scopeId: input.actorId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        actorId: input.actorId,
        result: readback,
        readback,
        resultingRevision: next.revision,
        assessmentDigest: null,
        eventType: "ModerationChangesRequested",
        eventPayload: { caseId: input.caseId, submissionRevision: next.revision },
        requestDigest,
      });
    });
  }

  async adminReviewContributionMedia(input: {
    uploadId: ContributionUploadId;
    caseId?: string;
    decision: "ACCEPTED" | "REJECTED";
    reason: string;
    expectedRevision: number | null;
    actorId: string;
    requestId: string;
    idempotencyKey: string;
  }): Promise<AdminMutationResult<MediaReviewView>> {
    return this.#transaction(async (client) => {
      const requestDigest = digest({
        operation: "media.review",
        uploadId: input.uploadId,
        caseId: input.caseId ?? null,
        decision: input.decision,
        reason: input.reason,
        expectedRevision: input.expectedRevision,
      });
      const replay = await this.#adminReceiptReplay<MediaReviewView>(
        client,
        input.actorId,
        input.idempotencyKey,
        "media.review",
        requestDigest,
      );
      if (replay) return replay;
      const result = await client.query<{
        media_table: "LEGACY" | "FORMAL";
        upload_id: ContributionUploadId;
        submission_id: ContributionId;
        state: ContributionMediaUpload["state"];
        mime_type: ContributionMediaUpload["mimeType"];
        byte_size: number | null;
        sha256: string | null;
        review_state: string;
        review_reason: string | null;
        rights_confirmed: boolean;
        payload: ContributionSubmission;
        revision: number;
      }>(
        `SELECT 'LEGACY'::text AS media_table, m.upload_id, m.submission_id, m.state, m.mime_type, m.byte_size,
                m.sha256, m.review_state, m.review_reason,
                s.payload->>'rightsConfirmed' = 'true' AS rights_confirmed,
                s.payload, s.revision
           FROM contribution_media_uploads m
           JOIN user_submissions s USING (submission_id)
          WHERE m.upload_id = $1
          FOR UPDATE OF m, s`,
        [input.uploadId],
      );
      let current = result.rows[0];
      if (!current) {
        const formalResult = await client.query<typeof result.rows[number]>(
          `SELECT 'FORMAL'::text AS media_table, m.upload_id, m.submission_id, m.state, m.mime_type,
                  NULLIF(m.payload->>'byteSize', '')::integer AS byte_size,
                  NULLIF(m.payload->>'sha256', '') AS sha256,
                  m.review_state, m.review_reason,
                  s.payload->>'rightsConfirmed' = 'true' AS rights_confirmed,
                  s.payload, s.revision
             FROM formal_feedback_media_uploads m
             JOIN user_submissions s USING (submission_id)
            WHERE m.upload_id = $1
            FOR UPDATE OF m, s`,
          [input.uploadId],
        );
        current = formalResult.rows[0];
      }
      if (!current) throw new Error("contribution_upload_not_found");
      if (input.caseId) {
        const caseResult = await client.query(
          `SELECT 1 FROM moderation_cases
            WHERE case_id = $1 AND subject_type = 'USER_CONTRIBUTION' AND subject_id = $2
            FOR UPDATE`,
          [input.caseId, current.submission_id],
        );
        if (!caseResult.rowCount) throw new Error("moderation_case_media_mismatch");
      }
      if (input.expectedRevision !== null && current.revision !== input.expectedRevision)
        throw new Error("contribution_revision_conflict");
      if (!current.payload.media.some((media) => media.uploadId === input.uploadId))
        throw new Error("contribution_upload_not_found");
      const now = new Date().toISOString();
      const nextPayload = normalizeContributionSubmission(current.payload);
      const media = nextPayload.media.map((item) =>
        item.uploadId === input.uploadId
          ? { ...item, state: item.state === "ATTACHED" ? "ATTACHED" as const : item.state }
          : item,
      );
      const nextSubmission: ContributionSubmission = {
        ...nextPayload,
        media,
        revision: current.revision + 1,
        updatedAt: now,
        statusHistory: [
          ...nextPayload.statusHistory,
          contributionEvent("PUBLICATION", null, `MEDIA_${input.decision}`, input.reason, "OPERATOR"),
        ],
      };
      const mediaTable = current.media_table === "FORMAL"
        ? "formal_feedback_media_uploads"
        : "contribution_media_uploads";
      await client.query(
        `UPDATE ${mediaTable}
            SET review_state = $2, review_reason = $3, reviewed_by = $4, reviewed_at = $5::timestamptz,
                payload = payload || jsonb_build_object(
                  'reviewState', $2::text, 'reviewReason', $3::text,
                  'reviewedBy', $4::text, 'reviewedAt', $5::text
                )
          WHERE upload_id = $1`,
        [input.uploadId, input.decision, input.reason, input.actorId, now],
      );
      await client.query(
        `UPDATE user_submissions SET payload = $2, revision = $3, updated_at = $4
          WHERE submission_id = $1`,
        [current.submission_id, nextSubmission, nextSubmission.revision, now],
      );
      await this.#insertContributionRevision(client, nextSubmission, input.actorId);
      await client.query(
        `INSERT INTO moderation_case_events(event_id, case_id, event_type, actor_id, reason, redacted_payload)
         SELECT $2, case_id, 'MEDIA_REVIEW', $3, $4, $5
           FROM moderation_cases
          WHERE subject_id = $1`,
        [current.submission_id, randomUUID(), input.actorId, input.reason, { uploadId: input.uploadId, decision: input.decision }],
      );
      await client.query(
        `INSERT INTO audit_logs(audit_id, actor_id, action, subject_type, subject_id, request_id, before_payload, after_payload)
         VALUES ($1, $2, 'MEDIA_REVIEW', 'CONTRIBUTION_MEDIA', $3, $4, $5, $6)`,
        [randomUUID(), input.actorId, input.uploadId, input.requestId, { reviewState: current.review_state }, { reviewState: input.decision }],
      );
      const readback = toMediaReviewView({
        ...current,
        review_state: input.decision,
        review_reason: input.reason,
      });
      return this.#commitAdminResult(client, {
        operation: "media.review",
        scopeId: input.actorId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        actorId: input.actorId,
        result: readback,
        readback,
        resultingRevision: nextSubmission.revision,
        assessmentDigest: null,
        eventType: "ContributionMediaReviewed",
        eventPayload: { uploadId: input.uploadId, decision: input.decision },
        requestDigest,
      });
    });
  }

  async adminCreateMergePreview(input: {
    caseId: string;
    spotId: SpotId;
    confirmedClaims: readonly string[];
    expectedSubmissionRevision: number;
    expectedSpotRevision: number;
  }): Promise<MergePreview> {
    const caseRow = await this.pool.query<{
      state: string;
      subject_id: string;
      payload: Record<string, unknown>;
    }>("SELECT state, subject_id, payload FROM moderation_cases WHERE case_id = $1", [input.caseId]);
    const currentCase = caseRow.rows[0];
    if (!currentCase) throw new Error("moderation_case_not_found");
    if (currentCase.state !== "APPROVED" && currentCase.state !== "ACCEPTED")
      throw new Error("contribution_moderation_not_approved");
    if (currentCase.subject_id !== input.caseId.replace(/^moderation:/u, "") && !currentCase.payload.submission)
      throw new Error("contribution_moderation_subject_invalid");
    const submission = normalizeContributionSubmission(
      currentCase.payload.submission as ContributionSubmission,
    );
    if (submission.revision !== input.expectedSubmissionRevision)
      throw new Error("contribution_revision_conflict");
    const selected = await this.pool.query<{ detail: SpotDetail; status: SpotSummary["status"]; version: number }>(
      `SELECT r.payload AS detail, s.status, s.version
         FROM spots s JOIN spot_overview_read_models r USING (spot_id)
        WHERE s.spot_id = $1`,
      [input.spotId],
    );
    const currentSpot = selected.rows[0];
    if (!currentSpot) throw new Error("formal_spot_not_found");
    const detail = currentSpot.detail;
    if (currentSpot.status === "RETIRED") throw new Error("formal_spot_retired");
    if (currentSpot.version !== input.expectedSpotRevision)
      throw new Error("spot_revision_conflict");
    const requestedClaims = input.confirmedClaims.length
      ? input.confirmedClaims
      : contributionAllowedMergeClaims(submission);
    const claims = [...new Set(requestedClaims)];
    if (!claims.length || claims.length !== requestedClaims.length)
      throw new Error("contribution_merge_claims_invalid");
    const allowedClaims = new Set<string>(contributionAllowedMergeClaims(submission));
    if (claims.some((claim) => !allowedClaims.has(claim)))
      throw new Error("contribution_merge_claim_not_reported");
    const sourceIds = [`contribution-source:${submission.submissionId}`];
    const previews: MergeClaimPreview[] = claims.map((claim) => ({
      claimId: claim,
      claim,
      currentValue: mergeClaimCurrentValue(detail, claim),
      candidateValue: mergeClaimCandidateValue(submission, claim),
      sourceIds,
      conflict: false,
      disposition: "ALLOW",
    }));
    return {
      caseId: input.caseId as MergePreview["caseId"],
      submissionId: submission.submissionId,
      spotId: input.spotId,
      submissionRevision: submission.revision,
      spotRevision: input.expectedSpotRevision,
      claims: previews,
      candidateRevision: input.expectedSpotRevision + 1,
      publicationAssessment: "RECOMPUTE_AFTER_MERGE",
      readOnly: true,
    };
  }

  async adminCommitMerge(input: {
    caseId: string;
    spotId: SpotId;
    confirmedClaims: readonly string[];
    expectedSubmissionRevision: number;
    expectedSpotRevision: number;
    reason: string;
    actorId: string;
    requestId: string;
    idempotencyKey: string;
  }): Promise<AdminMutationResult<ModerationCaseView>> {
    await this.adminCreateMergePreview({
      caseId: input.caseId,
      spotId: input.spotId,
      confirmedClaims: input.confirmedClaims,
      expectedSubmissionRevision: input.expectedSubmissionRevision,
      expectedSpotRevision: input.expectedSpotRevision,
    });
    await this.adminMergeContributionEvidence({
      caseId: input.caseId,
      spotId: input.spotId,
      confirmedClaims: input.confirmedClaims as readonly AdminContributionEvidenceClaim[],
      reason: input.reason,
      actorId: input.actorId,
      requestId: input.requestId,
      expectedSubmissionRevision: input.expectedSubmissionRevision,
      expectedSpotRevision: input.expectedSpotRevision,
      idempotencyKey: input.idempotencyKey,
      receiptResult: "MODERATION_CASE",
    });
    const readback = await this.adminGetModerationCase(input.caseId);
    if (!readback) throw new Error("moderation_case_readback_missing");
    const receipt = await this.adminReadReceiptByIdentity(input.actorId, input.idempotencyKey);
    if (!receipt) throw new Error("operation_receipt_missing");
    return { result: readback, readback, receipt: receipt as OperationReceipt<ModerationCaseView> };
  }

  async adminAssessPublication(input: {
    spotId: SpotId;
    expectedSpotRevision: number | null;
    reason: string;
    actorId: string;
    requestId: string;
    idempotencyKey: string;
  }): Promise<AdminMutationResult<PublicationAssessment>> {
    return this.#transaction(async (client) => {
      const requestDigest = digest({
        operation: "publication.assess",
        spotId: input.spotId,
        expectedSpotRevision: input.expectedSpotRevision,
        reason: input.reason,
      });
      const replay = await this.#adminReceiptReplay<PublicationAssessment>(
        client,
        input.actorId,
        input.idempotencyKey,
        "publication.assess",
        requestDigest,
      );
      if (replay) return replay;
      const selected = await client.query<{
        payload: SpotSummary;
        detail: SpotDetail;
        version: number;
      }>(
        `SELECT s.payload, r.payload AS detail, s.version
           FROM spots s JOIN spot_overview_read_models r USING (spot_id)
          WHERE s.spot_id = $1 FOR UPDATE`,
        [input.spotId],
      );
      const current = selected.rows[0];
      if (!current) throw new Error("formal_spot_not_found");
      if (input.expectedSpotRevision !== null && current.version !== input.expectedSpotRevision)
        throw new Error("spot_revision_conflict");
      const assessment = evaluateSpotCompleteness({
        detail: current.detail,
        review: { actorId: input.actorId, reason: input.reason },
      });
      const publication: PublicationAssessment = {
        spotId: input.spotId,
        spotRevision: current.version,
        assessmentDigest: assessment.assessmentDigest,
        complete: assessment.complete,
        blockers: assessment.issues.map((issue) => issue.code),
        checkedAt: assessment.checkedAt,
        checkedBy: input.actorId,
        projectionDigest: digest(current.detail),
      };
      await client.query(
        `INSERT INTO spot_publication_assessments(
           spot_id, spot_revision, assessment_digest, complete, payload,
           reviewed_by, review_reason, assessed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (spot_id) DO UPDATE SET
           spot_revision = EXCLUDED.spot_revision,
           assessment_digest = EXCLUDED.assessment_digest,
           complete = EXCLUDED.complete,
           payload = EXCLUDED.payload,
           reviewed_by = EXCLUDED.reviewed_by,
           review_reason = EXCLUDED.review_reason,
           assessed_at = EXCLUDED.assessed_at`,
        [input.spotId, current.version, publication.assessmentDigest, publication.complete, publication, input.actorId, input.reason, publication.checkedAt],
      );
      await client.query(
        `INSERT INTO spot_publication_assessment_events(
           assessment_event_id, spot_id, spot_revision, assessment_digest, complete, payload, actor_id, reason
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [randomUUID(), input.spotId, current.version, publication.assessmentDigest, publication.complete, publication, input.actorId, input.reason],
      );
      await client.query(
        `INSERT INTO audit_logs(audit_id, actor_id, action, subject_type, subject_id, request_id, before_payload, after_payload)
         VALUES ($1, $2, 'PUBLICATION_ASSESSMENT', 'SPOT', $3, $4, NULL, $5)`,
        [randomUUID(), input.actorId, input.spotId, input.requestId, publication],
      );
      return this.#commitAdminResult(client, {
        operation: "publication.assess",
        scopeId: input.actorId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        actorId: input.actorId,
        result: publication,
        readback: publication,
        resultingRevision: current.version,
        assessmentDigest: publication.assessmentDigest,
        eventType: "PublicationAssessed",
        eventPayload: { spotId: input.spotId, revision: current.version, complete: publication.complete },
        requestDigest,
      });
    });
  }

  async adminChangeSpotLifecycle(input: {
    spotId: SpotId;
    action: "PUBLISH" | "SUSPEND" | "UNPUBLISH" | "RETIRE";
    expectedSpotRevision: number;
    assessmentDigest?: string;
    reason: string;
    actorId: string;
    requestId: string;
    idempotencyKey: string;
  }): Promise<AdminMutationResult<SpotSummary>> {
    return this.#transaction(async (client) => {
      const requestDigest = digest({
        operation: `spot.${input.action.toLowerCase()}`,
        spotId: input.spotId,
        action: input.action,
        expectedSpotRevision: input.expectedSpotRevision,
        assessmentDigest: input.assessmentDigest ?? null,
        reason: input.reason,
      });
      const replay = await this.#adminReceiptReplay<SpotSummary>(
        client,
        input.actorId,
        input.idempotencyKey,
        `spot.${input.action.toLowerCase()}`,
        requestDigest,
      );
      if (replay) return replay;
      const selected = await client.query<{
        payload: SpotSummary;
        detail: SpotDetail;
        status: SpotSummary["status"];
        version: number;
      }>(
        `SELECT s.payload, r.payload AS detail, s.status, s.version
           FROM spots s JOIN spot_overview_read_models r USING (spot_id)
          WHERE s.spot_id = $1 FOR UPDATE`,
        [input.spotId],
      );
      const current = selected.rows[0];
      if (!current) throw new Error("formal_spot_not_found");
      if (current.version !== input.expectedSpotRevision)
        throw new Error("spot_revision_conflict");
      if (input.action === "PUBLISH") {
        const assessment = await client.query<{ complete: boolean; spot_revision: number; assessment_digest: string }>(
          `SELECT complete, spot_revision, assessment_digest
             FROM spot_publication_assessments
            WHERE spot_id = $1`,
          [input.spotId],
        );
        const gate = assessment.rows[0];
        if (
          !gate ||
          gate.spot_revision !== current.version ||
          !gate.complete ||
          (input.assessmentDigest !== undefined &&
            gate.assessment_digest !== input.assessmentDigest)
        )
          throw new SpotPublicationBlockedError(
            evaluateSpotCompleteness({
              detail: current.detail,
              review: { actorId: input.actorId, reason: input.reason },
            }),
          );
      }
      if (input.action === "RETIRE" && current.status === "RETIRED")
        throw new Error("formal_spot_already_retired");
      const nextStatus = ({
        PUBLISH: "PUBLISHED",
        SUSPEND: "TEMPORARILY_CLOSED",
        UNPUBLISH: "UNPUBLISHED",
        RETIRE: "RETIRED",
      } as const)[input.action];
      const nextSpot: SpotSummary = { ...clone(current.payload), status: nextStatus };
      const updated = await client.query<{ version: number }>(
        `UPDATE spots
            SET status = $2, payload = $3, version = version + 1, updated_at = now()
          WHERE spot_id = $1
          RETURNING version`,
        [input.spotId, nextStatus, nextSpot],
      );
      const nextRevision = updated.rows[0]?.version;
      if (!nextRevision) throw new Error("spot_update_failed");
      const nextDetail = { ...clone(current.detail), spot: nextSpot };
      let lifecycleAssessment: PublicationAssessment | null = null;
      if (input.action === "PUBLISH" || input.action === "SUSPEND") {
        const evaluated = evaluateSpotCompleteness({
          detail: nextDetail,
          review: { actorId: input.actorId, reason: input.reason },
        });
        if (!evaluated.complete)
          throw new SpotPublicationBlockedError(evaluated);
        lifecycleAssessment = {
          spotId: input.spotId,
          spotRevision: nextRevision,
          assessmentDigest: evaluated.assessmentDigest,
          complete: true,
          blockers: [],
          checkedAt: evaluated.checkedAt,
          checkedBy: input.actorId,
          projectionDigest: digest(nextDetail),
        };
        await client.query(
          `INSERT INTO spot_publication_assessments(
             spot_id, spot_revision, assessment_digest, complete, payload,
             reviewed_by, review_reason, assessed_at
           ) VALUES ($1, $2, $3, true, $4, $5, $6, $7)
           ON CONFLICT (spot_id) DO UPDATE SET
             spot_revision = EXCLUDED.spot_revision,
             assessment_digest = EXCLUDED.assessment_digest,
             complete = true,
             payload = EXCLUDED.payload,
             reviewed_by = EXCLUDED.reviewed_by,
             review_reason = EXCLUDED.review_reason,
             assessed_at = EXCLUDED.assessed_at`,
          [
            input.spotId,
            nextRevision,
            lifecycleAssessment.assessmentDigest,
            lifecycleAssessment,
            input.actorId,
            input.reason,
            lifecycleAssessment.checkedAt,
          ],
        );
        await client.query(
          `INSERT INTO spot_publication_assessment_events(
             assessment_event_id, spot_id, spot_revision, assessment_digest,
             complete, payload, actor_id, reason
           ) VALUES ($1, $2, $3, $4, true, $5, $6, $7)`,
          [
            randomUUID(),
            input.spotId,
            nextRevision,
            lifecycleAssessment.assessmentDigest,
            lifecycleAssessment,
            input.actorId,
            input.reason,
          ],
        );
      }
      const revisionId = `spot-revision:${input.spotId}:${nextRevision}`;
      await client.query(
        `INSERT INTO spot_revisions(
           revision_id, spot_id, revision_no, spot_payload, detail_payload,
           payload_digest, source_ids, created_by, reason
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          revisionId,
          input.spotId,
          nextRevision,
          nextSpot,
          nextDetail,
          digest({ spot: nextSpot, detail: nextDetail }),
          JSON.stringify(nextDetail.dataDisclosure.map((source) => source.id)),
          input.actorId,
          input.reason,
        ],
      );
      await client.query("UPDATE spots SET active_revision_id = $2 WHERE spot_id = $1", [input.spotId, revisionId]);
      await client.query(
        `UPDATE spot_overview_read_models
            SET payload = $2, dependency_digest = $3, generated_at = now()
          WHERE spot_id = $1`,
        [input.spotId, nextDetail, digest(nextDetail)],
      );
      for (const table of ["map_spot_summaries", "favorite_spot_summaries"])
        await client.query(`UPDATE ${table} SET payload = $2, generated_at = now() WHERE spot_id = $1`, [input.spotId, nextSpot]);
      await client.query(
        `INSERT INTO spot_status_history(history_id, spot_id, prior_status, next_status, reason, actor_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomUUID(), input.spotId, current.status, nextStatus, input.reason, input.actorId],
      );
      if (input.action === "PUBLISH") {
        const publishedAt = new Date().toISOString();
        const contributions = await client.query<{
          submission_id: ContributionId;
          payload: ContributionSubmission;
        }>(
          `SELECT submission_id, payload
             FROM user_submissions
            WHERE spot_id = $1
              AND submission_state = 'ACCEPTED'
              AND merge_state = 'MERGED'
              AND payload->>'kind' = 'NEW_SPOT_PROPOSAL'
            FOR UPDATE`,
          [input.spotId],
        );
        for (const row of contributions.rows) {
          const published = publishMergedNewSpotContribution(
            row.payload,
            input.spotId,
            publishedAt,
            input.reason,
          );
          if (!published) continue;
          await client.query(
            `UPDATE user_submissions
                SET payload = $2, revision = $3,
                    publication_impact = 'SPOT_PUBLISHED', updated_at = $4
              WHERE submission_id = $1`,
            [row.submission_id, published, published.revision, publishedAt],
          );
          await this.#insertContributionRevision(client, published, input.actorId);
          await client.query(
            `UPDATE moderation_cases
                SET payload = jsonb_set(payload, '{submission}', $2::jsonb, true)
              WHERE subject_type = 'USER_CONTRIBUTION' AND subject_id = $1`,
            [row.submission_id, JSON.stringify(published)],
          );
        }
      }
      await client.query(
        `INSERT INTO audit_logs(audit_id, actor_id, action, subject_type, subject_id, request_id, before_payload, after_payload)
         VALUES ($1, $2, $3, 'SPOT', $4, $5, $6, $7)`,
        [randomUUID(), input.actorId, `SPOT_${input.action}`, input.spotId, input.requestId, current.payload, nextSpot],
      );
      return this.#commitAdminResult(client, {
        operation: `spot.${input.action.toLowerCase()}`,
        scopeId: input.actorId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        actorId: input.actorId,
        result: nextSpot,
        readback: nextSpot,
        resultingRevision: nextRevision,
        assessmentDigest: lifecycleAssessment?.assessmentDigest ?? null,
        eventType: `Spot${input.action[0]}${input.action.slice(1).toLowerCase()}`,
        eventPayload: { spotId: input.spotId, revision: nextRevision, status: nextStatus },
        requestDigest,
      });
    });
  }

  async adminListSpotRevisions(spotId: SpotId): Promise<readonly Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT revision_id, spot_id, revision_no, payload_digest, source_ids,
              created_by, reason, created_at,
              revision_id = (SELECT active_revision_id FROM spots WHERE spot_id = $1) AS active
         FROM spot_revisions
        WHERE spot_id = $1
        ORDER BY revision_no DESC`,
      [spotId],
    );
    return result.rows.map((row) => ({
      revisionId: row.revision_id,
      spotId: row.spot_id,
      revisionNo: row.revision_no,
      payloadDigest: row.payload_digest,
      sourceIds: row.source_ids,
      createdBy: row.created_by,
      reason: row.reason,
      createdAt: new Date(row.created_at).toISOString(),
      active: row.active === true,
    }));
  }

  async adminPreviewReplacement(input: {
    spotId: SpotId;
    successorSpotId: SpotId | null;
    expectedSpotRevision: number;
  }): Promise<ReplacementImpact> {
    if (input.successorSpotId === input.spotId)
      throw new Error("replacement_successor_self_reference");
    if (input.successorSpotId) {
      const successor = await this.pool.query("SELECT 1 FROM spots WHERE spot_id = $1", [input.successorSpotId]);
      if (!successor.rowCount) throw new Error("replacement_successor_not_found");
      const cycle = await this.pool.query(
        `WITH RECURSIVE chain(spot_id) AS (
           SELECT successor_spot_id FROM spot_replacement_relations
            WHERE predecessor_spot_id = $1 AND state = 'COMMITTED'
           UNION ALL
           SELECT r.successor_spot_id
             FROM spot_replacement_relations r JOIN chain c ON r.predecessor_spot_id = c.spot_id
            WHERE r.state = 'COMMITTED' AND r.successor_spot_id IS NOT NULL
         ) SELECT 1 FROM chain WHERE spot_id = $2 LIMIT 1`,
        [input.successorSpotId, input.spotId],
      );
      if (cycle.rowCount) throw new Error("replacement_successor_cycle");
    }
    const current = await this.pool.query<{ version: number }>(
      "SELECT version FROM spots WHERE spot_id = $1",
      [input.spotId],
    );
    if (!current.rows[0]) throw new Error("formal_spot_not_found");
    if (current.rows[0].version !== input.expectedSpotRevision)
      throw new Error("spot_revision_conflict");
    const counts = await this.pool.query<{ favorites: string; plans: string }>(
      `SELECT
         (SELECT count(*) FROM favorites WHERE spot_id = $1)::text AS favorites,
         (SELECT count(*) FROM observation_plans WHERE spot_id = $1)::text AS plans`,
      [input.spotId],
    );
    const row = counts.rows[0]!;
    return {
      spotId: input.spotId,
      successorSpotId: input.successorSpotId,
      favoriteCount: Number(row.favorites),
      planCount: Number(row.plans),
      relationState: input.successorSpotId ? "PREVIEW" : "NO_SUCCESSOR",
      warnings: [
        "收藏和计划保留原 spotId，不会静默迁移；客户端只显示迁移建议。",
        ...(input.successorSpotId ? [] : ["退役后没有 successor，公开读取将停止。"]),
      ],
    };
  }

  async adminCommitReplacement(input: {
    spotId: SpotId;
    successorSpotId: SpotId | null;
    expectedSpotRevision: number;
    reason: string;
    actorId: string;
    requestId: string;
    idempotencyKey: string;
  }): Promise<AdminMutationResult<ReplacementImpact>> {
    return this.#transaction(async (client) => {
      const requestDigest = digest({
        operation: "spot.replace",
        spotId: input.spotId,
        successorSpotId: input.successorSpotId,
        expectedSpotRevision: input.expectedSpotRevision,
        reason: input.reason,
      });
      const replay = await this.#adminReceiptReplay<ReplacementImpact>(
        client,
        input.actorId,
        input.idempotencyKey,
        "spot.replace",
        requestDigest,
      );
      if (replay) return replay;
      const current = await client.query<{ version: number; status: SpotSummary["status"] }>(
        "SELECT version, status FROM spots WHERE spot_id = $1 FOR UPDATE",
        [input.spotId],
      );
      const spot = current.rows[0];
      if (!spot) throw new Error("formal_spot_not_found");
      if (spot.version !== input.expectedSpotRevision) throw new Error("spot_revision_conflict");
      if (input.successorSpotId === input.spotId) throw new Error("replacement_successor_self_reference");
      if (input.successorSpotId) {
        const successor = await client.query("SELECT 1 FROM spots WHERE spot_id = $1", [input.successorSpotId]);
        if (!successor.rowCount) throw new Error("replacement_successor_not_found");
        const cycle = await client.query(
          `WITH RECURSIVE chain(spot_id) AS (
             SELECT successor_spot_id FROM spot_replacement_relations
              WHERE predecessor_spot_id = $1 AND state = 'COMMITTED'
             UNION ALL
             SELECT r.successor_spot_id
               FROM spot_replacement_relations r JOIN chain c ON r.predecessor_spot_id = c.spot_id
              WHERE r.state = 'COMMITTED' AND r.successor_spot_id IS NOT NULL
           ) SELECT 1 FROM chain WHERE spot_id = $2 LIMIT 1`,
          [input.successorSpotId, input.spotId],
        );
        if (cycle.rowCount) throw new Error("replacement_successor_cycle");
      }
      const counts = await client.query<{ favorites: string; plans: string }>(
        `SELECT
           (SELECT count(*) FROM favorites WHERE spot_id = $1)::text AS favorites,
           (SELECT count(*) FROM observation_plans WHERE spot_id = $1)::text AS plans`,
        [input.spotId],
      );
      const row = counts.rows[0]!;
      const existingRelation = await client.query(
        `SELECT 1 FROM spot_replacement_relations
          WHERE predecessor_spot_id = $1 AND state = 'COMMITTED'
          FOR UPDATE`,
        [input.spotId],
      );
      if (existingRelation.rowCount)
        throw new Error("replacement_already_committed");
      await client.query(
        `INSERT INTO spot_replacement_relations(
           relation_id, predecessor_spot_id, successor_spot_id, state, actor_id, reason, committed_at
          ) VALUES ($1, $2, $3, 'COMMITTED', $4, $5, now())
          `,
        [randomUUID(), input.spotId, input.successorSpotId, input.actorId, input.reason],
      );
      const relation: ReplacementImpact = {
        spotId: input.spotId,
        successorSpotId: input.successorSpotId,
        favoriteCount: Number(row.favorites),
        planCount: Number(row.plans),
        relationState: input.successorSpotId ? "COMMITTED" : "NO_SUCCESSOR",
        warnings: ["收藏和计划保留原 spotId，不会静默迁移。"],
      };
      await client.query(
        `INSERT INTO audit_logs(audit_id, actor_id, action, subject_type, subject_id, request_id, before_payload, after_payload)
         VALUES ($1, $2, 'SPOT_REPLACE', 'SPOT', $3, $4, $5, $6)`,
        [randomUUID(), input.actorId, input.spotId, input.requestId, { status: spot.status }, relation],
      );
      return this.#commitAdminResult(client, {
        operation: "spot.replace",
        scopeId: input.actorId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        actorId: input.actorId,
        result: relation,
        readback: relation,
        resultingRevision: spot.version,
        assessmentDigest: null,
        eventType: "SpotReplacementCommitted",
        eventPayload: relation,
        requestDigest,
      });
    });
  }

  async adminAuditLog(input: { subjectId?: string; limit?: number } = {}) {
    const limit = Math.min(Math.max(input.limit ?? 200, 1), 500);
    const result = await this.pool.query(
      `SELECT audit_id, actor_id, action, subject_type, subject_id, request_id, occurred_at
         FROM audit_logs
        WHERE ($1::text IS NULL OR subject_id = $1)
        ORDER BY occurred_at DESC
        LIMIT $2`,
      [input.subjectId ?? null, limit],
    );
    return result.rows;
  }

  async adminReadReceipt(receiptId: string): Promise<OperationReceipt | null> {
    const result = await this.pool.query("SELECT * FROM operation_receipts WHERE receipt_id = $1", [receiptId]);
    const row = result.rows[0];
    if (!row) return null;
    return this.#operationReceipt(row);
  }

  private async adminReadReceiptByIdentity(scopeId: string, idempotencyKey: string) {
    const result = await this.pool.query("SELECT * FROM operation_receipts WHERE scope_id = $1 AND idempotency_key = $2", [scopeId, idempotencyKey]);
    return result.rows[0] ? this.#operationReceipt(result.rows[0]) : null;
  }

  async #readModerationCase(client: Pick<pg.Pool, "query"> | PoolClient, caseId: string) {
    const caseResult = await client.query<{
      case_id: string;
      subject_type: string;
      subject_id: string;
      state: string;
      payload: Record<string, unknown>;
      created_at: string | Date;
      resolved_at: string | Date | null;
    }>("SELECT * FROM moderation_cases WHERE case_id = $1", [caseId]);
    const row = caseResult.rows[0];
    if (!row) return null;
    const events = await client.query<{
      event_id: string;
      event_type: string;
      actor_id: string;
      reason: string | null;
      occurred_at: string | Date;
    }>(
      `SELECT event_id, event_type, actor_id, reason, occurred_at
         FROM moderation_case_events WHERE case_id = $1 ORDER BY occurred_at ASC`,
      [caseId],
    );
    return toModerationCaseView(
      row,
      events.rows.map((event) => ({
        eventId: event.event_id,
        axis: event.event_type.includes("MERGE") ? "MERGE" : "SUBMISSION",
        from: null,
        to: event.event_type,
        reason: event.reason,
        actorType: event.actor_id.startsWith("admin:") ? "OPERATOR" : "SYSTEM",
        occurredAt: new Date(event.occurred_at).toISOString(),
      })),
    );
  }

  async #insertContributionRevision(client: PoolClient, submission: ContributionSubmission, actorId: string) {
    await client.query(
      `INSERT INTO contribution_revisions(
         revision_id, submission_id, revision_no, submission_state,
         merge_state, publication_impact, payload, payload_digest, actor_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (submission_id, revision_no) DO NOTHING`,
      [
        `contribution-revision:${submission.submissionId}:${submission.revision}`,
        submission.submissionId,
        submission.revision,
        submission.submissionState,
        submission.mergeState,
        submission.publicationImpact,
        submission,
        digest(submission),
        actorId,
      ],
    );
  }

  async #adminReceiptReplay<T>(
    client: PoolClient,
    scopeId: string,
    idempotencyKey: string,
    operation: string,
    requestDigest?: string,
  ): Promise<AdminMutationResult<T> | null> {
    const result = await client.query("SELECT * FROM operation_receipts WHERE scope_id = $1 AND idempotency_key = $2 FOR UPDATE", [scopeId, idempotencyKey]);
    const row = result.rows[0];
    if (!row) return null;
    assertReceiptNotErased(row.result_payload);
    assertReceiptNotErased(row.readback_payload);
    if (row.operation !== operation) throw new Error("idempotency_operation_conflict");
    if (requestDigest !== undefined && row.request_digest !== requestDigest)
      throw new Error("idempotency_request_conflict");
    const readback = row.readback_payload as T;
    return {
      result: row.result_payload as T,
      readback,
      receipt: { ...this.#operationReceipt(row), status: "REPLAYED", readback },
    };
  }

  async #commitAdminResult<T>(client: PoolClient, input: {
    operation: string;
    scopeId: string;
    idempotencyKey: string;
    requestId: string;
    actorId: string;
    result: T;
    readback: T;
    resultingRevision: number | null;
    assessmentDigest: string | null;
    eventType: string;
    eventPayload: unknown;
    requestDigest?: string;
  }): Promise<AdminMutationResult<T>> {
    const committedAt = new Date().toISOString();
    const receiptId = `receipt:${randomUUID()}`;
    await this.#recordMutation(client, {
      idempotencyKey: input.idempotencyKey,
      operation: input.operation,
      response: input.result,
      eventType: input.eventType,
      scopeId: input.scopeId,
      payload: input.eventPayload,
      ...(input.requestDigest
        ? { requestDigest: input.requestDigest }
        : {}),
    });
    await client.query(
      `INSERT INTO operation_receipts(
         receipt_id, operation, scope_id, idempotency_key, request_id, actor_id,
         request_digest, status, resulting_revision, assessment_digest,
         result_payload, readback_payload, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'COMMITTED', $8, $9, $10, $11, $12)`,
      [
        receiptId,
        input.operation,
        input.scopeId,
        input.idempotencyKey,
        input.requestId,
        input.actorId,
         input.requestDigest ??
           digest({ operation: input.operation, payload: input.eventPayload }),
        input.resultingRevision,
        input.assessmentDigest,
        input.result,
        input.readback,
        committedAt,
      ],
    );
    const receipt: OperationReceipt<T> = {
      receiptId: receiptId as OperationReceipt["receiptId"],
      operation: input.operation,
      status: "COMMITTED",
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId,
      committedAt,
      resultingRevision: input.resultingRevision,
      assessmentDigest: input.assessmentDigest,
      readback: input.readback,
    };
    return { result: input.result, readback: input.readback, receipt };
  }

  #operationReceipt<T>(row: Record<string, unknown>): OperationReceipt<T> {
    assertReceiptNotErased(row.result_payload);
    assertReceiptNotErased(row.readback_payload);
    return {
      receiptId: row.receipt_id as OperationReceipt["receiptId"],
      operation: String(row.operation),
      status: row.status as OperationReceipt["status"],
      actorId: String(row.actor_id),
      idempotencyKey: String(row.idempotency_key),
      requestId: String(row.request_id),
      committedAt: new Date(String(row.created_at)).toISOString(),
      resultingRevision: row.resulting_revision === null ? null : Number(row.resulting_revision),
      assessmentDigest: row.assessment_digest === null ? null : String(row.assessment_digest),
      readback: row.readback_payload as T,
    };
  }
}
