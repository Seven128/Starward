import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { ContributionId, ContributionMediaUpload, ContributionSubmission, ContributionFormalUploadIntent, UserId } from "@starward/miniapp-contracts";
import { contributionMediaObjectKey } from "./contribution-media-object.ts";
import { normalizeContributionSubmission } from "./contribution-attempts.ts";
import type { MediaObjectStorePort, MiniappRepositoryPort } from "./ports.ts";

// Match the existing outbox dispatch batch. This bounds a maintenance pass,
// not a user-data limit or a new product performance acceptance threshold.
export const MEDIA_MAINTENANCE_BATCH_SIZE = 50;
type Transaction = <T>(run: (client: PoolClient) => Promise<T>) => Promise<T>;
type Candidate = { family: "draft" | "formal"; user_id: UserId; parent_id: string; upload_id: string };
type UploadRow = { upload_id: string; object_key: string | null; state: string; mime_type: ContributionMediaUpload["mimeType"] };

/** Persistent EXPIRED rows retain deletion intent until store deletion is
 * acknowledged. Attempt ordering keeps a permanently failing old object from
 * excluding the rest of the population on every bounded worker pass. */
export async function expireContributionMediaBatch(pool: Pick<Pool, "query">, transaction: Transaction, now: string, limit = MEDIA_MAINTENANCE_BATCH_SIZE) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MEDIA_MAINTENANCE_BATCH_SIZE) throw new Error("media_cleanup_batch_limit_invalid");
  if (!Number.isFinite(Date.parse(now))) throw new Error("media_cleanup_time_invalid");
  const candidates = await pool.query<Candidate>(
    `SELECT family,user_id,parent_id,upload_id FROM (
       SELECT 'draft' AS family,user_id,submission_id AS parent_id,upload_id,cleanup_attempted_at,expires_at
         FROM contribution_media_uploads
        WHERE (state IN ('PENDING','UPLOADED') AND expires_at <= $1)
           OR (state='EXPIRED' AND object_key IS NOT NULL)
       UNION ALL
       SELECT 'formal' AS family,user_id,intent_id AS parent_id,upload_id,cleanup_attempted_at,expires_at
         FROM formal_feedback_media_uploads
        WHERE (state IN ('PENDING','UPLOADED') AND expires_at <= $1)
           OR (state='EXPIRED' AND object_key IS NOT NULL)
     ) due ORDER BY cleanup_attempted_at NULLS FIRST,expires_at,upload_id,family LIMIT $2`, [now, limit],
  );
  const owners = new Map<UserId, Candidate[]>();
  for (const candidate of candidates.rows) {
    const rows = owners.get(candidate.user_id) ?? [];
    rows.push(candidate); owners.set(candidate.user_id, rows);
  }
  const keys: string[] = [];
  for (const [userId, selected] of owners) {
    keys.push(...await transaction(async client => {
      // Do not begin with a parent/child lock: the contribution guard trigger
      // requires SHARE on this account, while erasure takes UPDATE first.
      const account = await client.query<{ state: string }>("SELECT state FROM users WHERE user_id=$1 FOR SHARE SKIP LOCKED", [userId]);
      if (account.rows[0]?.state !== "ACTIVE") return [];
      const parents = new Map<string, Candidate[]>();
      for (const candidate of selected) {
        const key = `${candidate.family}:${candidate.parent_id}`;
        const rows = parents.get(key) ?? []; rows.push(candidate); parents.set(key, rows);
      }
      const retired: string[] = [];
      for (const [, group] of [...parents].sort(([a], [b]) => a.localeCompare(b))) {
        const { family, parent_id: parentId } = group[0]!;
        const formal = family === "formal";
        const parentTable = formal ? "formal_feedback_upload_intents" : "user_submissions";
        const parentColumn = formal ? "intent_id" : "submission_id";
        const mediaTable = formal ? "formal_feedback_media_uploads" : "contribution_media_uploads";
        const parent = await client.query<{ payload: ContributionSubmission | ContributionFormalUploadIntent; revision: number }>(
          `SELECT payload,revision FROM ${parentTable} WHERE ${parentColumn}=$1 AND user_id=$2 FOR UPDATE SKIP LOCKED`, [parentId, userId],
        );
        const current = parent.rows[0];
        if (!current || "privacyErasedAt" in current.payload) continue;
        const uploads = await client.query<UploadRow>(
          `SELECT upload_id,object_key,state,mime_type FROM ${mediaTable}
            WHERE user_id=$1 AND ${parentColumn}=$2 AND upload_id=ANY($3::text[])
              AND ((state IN ('PENDING','UPLOADED') AND expires_at <= $4)
                   OR (state='EXPIRED' AND object_key IS NOT NULL))
            ORDER BY upload_id FOR UPDATE`, [userId, parentId, group.map(row => row.upload_id), now],
        );
        const newlyExpired = new Set<string>();
        for (const upload of uploads.rows) {
          const key = upload.object_key ?? (upload.state === "PENDING"
            ? contributionMediaObjectKey(userId, upload.upload_id as ContributionMediaUpload["uploadId"], upload.mime_type) : null);
          if (upload.state !== "EXPIRED") newlyExpired.add(upload.upload_id);
          await client.query(
            `UPDATE ${mediaTable} SET state='EXPIRED',object_key=$2,cleanup_attempted_at=$3,
               payload=payload || jsonb_build_object('state','EXPIRED') WHERE upload_id=$1`, [upload.upload_id, key, now],
          );
          if (key) retired.push(key);
        }
        if (!newlyExpired.size) continue;
        if (formal) {
          const payload = current.payload as ContributionFormalUploadIntent;
          const next = { ...payload, revision: current.revision + 1,
            uploads: payload.uploads.map(upload => newlyExpired.has(upload.uploadId) ? { ...upload, state: "EXPIRED" as const } : upload) };
          await client.query("UPDATE formal_feedback_upload_intents SET payload=$2,revision=$3 WHERE intent_id=$1", [parentId, next, next.revision]);
        } else {
          const payload = current.payload as ContributionSubmission;
          const next: ContributionSubmission = { ...normalizeContributionSubmission(payload), revision: current.revision + 1, updatedAt: now,
            media: payload.media.map(upload => newlyExpired.has(upload.uploadId) ? { ...upload, state: "EXPIRED" as const } : upload) };
          await client.query("UPDATE user_submissions SET payload=$2,revision=$3,updated_at=$4 WHERE submission_id=$1", [parentId, next, next.revision, now]);
          await client.query(
            `INSERT INTO contribution_revisions(revision_id,submission_id,revision_no,submission_state,merge_state,publication_impact,payload,payload_digest,actor_id)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,'system:upload-cleanup') ON CONFLICT(submission_id,revision_no) DO NOTHING`,
            [`contribution-revision:${parentId}:${next.revision}`, parentId as ContributionId, next.revision, next.submissionState, next.mergeState,
              next.publicationImpact, next, createHash("sha256").update(JSON.stringify(next)).digest("hex")],
          );
        }
      }
      return retired;
    }));
  }
  return [...new Set(keys)];
}

/** Only an explicit maintenance/worker call retires objects. A single failed
 * object keeps its durable EXPIRED intent without preventing independent
 * objects in this bounded pass from finishing. */
export async function cleanupExpiredContributionUploads(
  repository: Pick<MiniappRepositoryPort, "expireContributionUploads" | "acknowledgeContributionMediaDeletion">,
  mediaStore: Pick<MediaObjectStorePort, "delete" | "enabled">,
  now = new Date().toISOString(),
) {
  const keys = await repository.expireContributionUploads(now, MEDIA_MAINTENANCE_BATCH_SIZE);
  if (keys.length && !mediaStore.enabled) throw new Error("contribution_media_cleanup_store_unavailable");
  const errors: unknown[] = [];
  for (const key of keys) {
    try { await mediaStore.delete(key); await repository.acknowledgeContributionMediaDeletion([key]); }
    catch (error) { errors.push(error); }
  }
  if (errors.length) throw errors[0];
  return keys.length;
}
