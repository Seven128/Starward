import type { PoolClient } from "pg";
import type { SpotId } from "@starward/miniapp-contracts";

interface ModerationCaseRow {
  case_id: string;
  subject_type: string;
  subject_id: string;
  state: string;
  payload: Record<string, unknown>;
  created_at: string | Date;
  resolved_at: string | Date | null;
}

/** Contribution writers acquire account → optional canonical spot → submission
 * before any media/case/revision. The account SHARE mode includes migration 009's
 * trigger lock; acquiring it after a child would invert account erasure's order.
 * Discovery is not authority: identities are checked again under these locks. */
async function lockContributionSubject(client: PoolClient, submissionId: string, spotId?: SpotId) {
  const discovered = (await client.query<{ user_id: string; erased: boolean }>(
    "SELECT user_id, payload ? 'privacyErasedAt' AS erased FROM user_submissions WHERE submission_id=$1", [submissionId],
  )).rows[0];
  if (!discovered) throw new Error("contribution_not_found");
  if (discovered.erased) throw new Error("contribution_account_deleted");
  const owner = await client.query<{ state: string }>(
    "SELECT state FROM users WHERE user_id=$1 FOR SHARE", [discovered.user_id],
  );
  if (owner.rows[0]?.state !== "ACTIVE") throw new Error("account_not_active");
  if (spotId) await client.query("SELECT spot_id FROM spots WHERE spot_id=$1 FOR UPDATE", [spotId]);
  const current = (await client.query<{ user_id: string; erased: boolean }>(
    "SELECT user_id, payload ? 'privacyErasedAt' AS erased FROM user_submissions WHERE submission_id=$1 FOR UPDATE", [submissionId],
  )).rows[0];
  if (!current) throw new Error("contribution_not_found");
  if (current.erased) throw new Error("contribution_account_deleted");
  if (current.user_id !== discovered.user_id) throw new Error("contribution_identity_scope_conflict");
}

export async function lockModerationCase(client: PoolClient, caseId: string, spotId?: SpotId) {
  const discovered = (await client.query<Pick<ModerationCaseRow, "subject_id" | "subject_type">>(
    "SELECT subject_id,subject_type FROM moderation_cases WHERE case_id=$1", [caseId],
  )).rows[0];
  if (!discovered) return undefined;
  if (discovered.subject_type === "USER_CONTRIBUTION")
    await lockContributionSubject(client, discovered.subject_id, spotId);
  const current = (await client.query<ModerationCaseRow>(
    "SELECT * FROM moderation_cases WHERE case_id = $1 FOR UPDATE", [caseId],
  )).rows[0];
  if (!current) return undefined;
  if (current.subject_id !== discovered.subject_id || current.subject_type !== discovered.subject_type)
    throw new Error("contribution_moderation_subject_invalid");
  if ("privacyErasedAt" in current.payload) throw new Error("contribution_account_deleted");
  return current;
}

export async function lockContributionMediaSubject(client: PoolClient, uploadId: string) {
  const target = (await client.query<{ submission_id: string }>(
    `SELECT submission_id FROM contribution_media_uploads WHERE upload_id=$1
     UNION ALL SELECT submission_id FROM formal_feedback_media_uploads
       WHERE upload_id=$1 AND submission_id IS NOT NULL`, [uploadId],
  )).rows[0];
  if (!target) throw new Error("contribution_upload_not_found");
  await lockContributionSubject(client, target.submission_id);
}

export const PUBLISHABLE_CONTRIBUTION_PREDICATE = `submission_state = 'ACCEPTED'
  AND merge_state = 'MERGED' AND payload->>'kind' = 'NEW_SPOT_PROPOSAL'
  AND NOT (payload ? 'privacyErasedAt')`;

class PublicationContributionSetChanged extends Error {
  constructor() { super("publication_contribution_set_changed"); }
}

/** Publication holds its contributing accounts before the canonical spot. A
 * new merge can enter between discovery and the spot lock, so retry discovery
 * in a fresh transaction, before any publication mutation, if its owner is new. */
export async function lockPublicationContributionOwners(client: PoolClient, spotId: SpotId) {
  const owners = await client.query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM user_submissions WHERE spot_id=$1 AND ${PUBLISHABLE_CONTRIBUTION_PREDICATE}`,
    [spotId],
  );
  const lockedOwners = new Set(owners.rows.map(row => row.user_id));
  if (lockedOwners.size) await client.query(
    "SELECT user_id FROM users WHERE user_id=ANY($1::text[]) ORDER BY user_id FOR SHARE", [[...lockedOwners]],
  );
  await client.query("SELECT spot_id FROM spots WHERE spot_id=$1 FOR UPDATE", [spotId]);
  const current = await client.query<{ user_id: string }>(
    `SELECT DISTINCT user_id FROM user_submissions WHERE spot_id=$1 AND ${PUBLISHABLE_CONTRIBUTION_PREDICATE}`,
    [spotId],
  );
  if (current.rows.some(row => !lockedOwners.has(row.user_id))) throw new PublicationContributionSetChanged();
}

export async function withPublicationContributionLockRetry<T>(transaction: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await transaction(); }
    catch (error) {
      if (!(error instanceof PublicationContributionSetChanged) || attempt >= 2) throw error;
    }
  }
}
