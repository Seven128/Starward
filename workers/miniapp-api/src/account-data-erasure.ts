import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { ContributionSubmission } from "@starward/miniapp-contracts";

/** A deletion projection, not a scrubber for arbitrary JSON. New input fields
 * are excluded unless deliberately added to this retained-evidence schema. */
export function eraseContributionContent(value: ContributionSubmission, erasedAt: string) {
  return {
    submissionId: value.submissionId,
    kind: value.kind,
    spotId: value.spotId,
    spotNameSnapshot: null,
    candidateLocation: null,
    observedAt: null,
    topics: [],
    detail: "",
    rightsConfirmed: false,
    preciseLocationConsent: false,
    media: [],
    state: value.state,
    submissionState: value.submissionState ?? (value.state === "APPROVED" ? "ACCEPTED" : value.state),
    mergeState: value.mergeState ?? "NOT_STARTED",
    publicationImpact: value.publicationImpact ?? "NONE",
    statusHistory: (value.statusHistory ?? []).map((event) => ({
      eventId: event.eventId,
      axis: event.axis,
      from: event.from,
      to: event.to,
      reason: null,
      actorType: event.actorType,
      occurredAt: event.occurredAt,
    })),
    revision: value.revision,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    review: value.review ? {
      resolution: value.review.resolution,
      reason: "",
      reviewedAt: value.review.reviewedAt,
    } : null,
    privacyErasedAt: erasedAt,
  } satisfies ContributionSubmission & { privacyErasedAt: string };
}

export function assertReceiptNotErased(value: unknown) {
  if (value && typeof value === "object" && "privacyErasedAt" in value)
    throw new Error("operation_receipt_privacy_erased");
}

/** Called only within the repository's account-deletion transaction. */
export async function eraseAccountContributionEvidence(client: PoolClient, userId: string) {
  const erasedAt = new Date().toISOString();
  const marker = { privacyErasedAt: erasedAt };
  // Lock cases before submissions, matching the administrator review order.
  const cases = await client.query<{ case_id: string }>(
    `SELECT case_id FROM moderation_cases
      WHERE subject_type = 'USER_CONTRIBUTION'
        AND subject_id IN (SELECT submission_id FROM user_submissions WHERE user_id = $1)
      ORDER BY case_id FOR UPDATE`, [userId]);
  const submissions = await client.query<{ submission_id: string; payload: ContributionSubmission }>(
    "SELECT submission_id, payload FROM user_submissions WHERE user_id = $1 ORDER BY submission_id FOR UPDATE", [userId]);
  const submissionIds = submissions.rows.map((row) => row.submission_id);
  const caseIds = cases.rows.map((row) => row.case_id);
  const uploadIds = submissions.rows.flatMap((row) => (row.payload.media ?? []).map((media) => media.uploadId));
  const subjectIds = [userId, ...submissionIds, ...caseIds, ...uploadIds];
  const erasedSubject = `erased:${randomUUID()}`;
  if (submissionIds.length) {
    await client.query("INSERT INTO users(user_id, state) VALUES ($1, 'DELETED')", [erasedSubject]);
    for (const row of submissions.rows) {
      const retained = eraseContributionContent(row.payload, erasedAt);
      await client.query(
        "UPDATE user_submissions SET user_id = $2, payload = $3, updated_at = now() WHERE submission_id = $1",
        [row.submission_id, erasedSubject, retained]);
      const revisions = await client.query<{ revision_id: string; payload: ContributionSubmission }>(
        "SELECT revision_id, payload FROM contribution_revisions WHERE submission_id = $1 FOR UPDATE", [row.submission_id]);
      for (const revision of revisions.rows) {
        const payload = eraseContributionContent(revision.payload, erasedAt);
        const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
        await client.query(
          `UPDATE contribution_revisions SET payload = $2, payload_digest = $3,
             actor_id = CASE WHEN actor_id = $4 THEN $5 ELSE actor_id END WHERE revision_id = $1`,
          [revision.revision_id, payload, digest, userId, erasedSubject]);
      }
      await client.query(
        `UPDATE moderation_cases SET payload = $2 WHERE subject_type = 'USER_CONTRIBUTION' AND subject_id = $1`,
        [row.submission_id, { ...marker, submission: retained, canonicalMergeRequired: false, publicationGateRequired: false }]);
    }
    await client.query(
      `UPDATE moderation_case_events SET reason = NULL, redacted_payload = $2,
         actor_id = CASE WHEN actor_id = $3 THEN $4 ELSE actor_id END WHERE case_id = ANY($1::text[])`,
      [caseIds, marker, userId, erasedSubject]);
    for (const caseId of caseIds)
      await client.query(
        `INSERT INTO moderation_case_events(event_id, case_id, event_type, actor_id, reason, redacted_payload)
         VALUES ($1, $2, 'ACCOUNT_DATA_ERASED', 'system:account-erasure', NULL, $3)`,
        [randomUUID(), caseId, marker]);
    await client.query(
      `UPDATE contribution_merge_events SET reason = 'account-data-erased',
         actor_id = CASE WHEN actor_id = $2 THEN $3 ELSE actor_id END
       WHERE submission_id = ANY($1::text[])`, [submissionIds, userId, erasedSubject]);
  }
  // These stores contain full readbacks of contributions/cases, including
  // immutableEvidence. Replace the whole snapshot, not only its nested submission.
  await client.query(
    `UPDATE operation_receipts SET result_payload = $4, readback_payload = $4
      WHERE scope_id = $1
         OR jsonb_path_query_array(result_payload, '$.**.submissionId') ?| $2::text[]
         OR jsonb_path_query_array(readback_payload, '$.**.submissionId') ?| $2::text[]
         OR jsonb_path_query_array(result_payload, '$.**.caseId') ?| $3::text[]
         OR jsonb_path_query_array(readback_payload, '$.**.caseId') ?| $3::text[]
         OR jsonb_path_query_array(result_payload, '$.**.uploadId') ?| $5::text[]
         OR jsonb_path_query_array(readback_payload, '$.**.uploadId') ?| $5::text[]`,
    [userId, submissionIds, caseIds, marker, uploadIds]);
  await client.query(
    `UPDATE idempotency_records SET response = $4
      WHERE scope_id = $1
         OR jsonb_path_query_array(response, '$.**.submissionId') ?| $2::text[]
         OR jsonb_path_query_array(response, '$.**.caseId') ?| $3::text[]
         OR jsonb_path_query_array(response, '$.**.uploadId') ?| $5::text[]`,
    [userId, submissionIds, caseIds, marker, uploadIds]);
  await client.query(
    `UPDATE audit_logs SET before_payload = $3, after_payload = $3,
       actor_id = CASE WHEN actor_id = $1 THEN $4 ELSE actor_id END,
       subject_id = CASE WHEN subject_id = $1 THEN $4 ELSE subject_id END
      WHERE actor_id = $1 OR subject_id = ANY($2::text[])
         OR jsonb_path_query_array(before_payload, '$.**.submissionId') ?| $5::text[]
         OR jsonb_path_query_array(after_payload, '$.**.submissionId') ?| $5::text[]`,
    [userId, subjectIds, marker, erasedSubject, submissionIds]);
  // User events carry identifiers, not original content. Keep their dispatch
  // identity and job routing while breaking the contributor/account association.
  await client.query(
    `UPDATE outbox_events SET payload = payload - 'userId', idempotency_key = 'erased:' || event_id::text
      WHERE payload->>'userId' = $1`, [userId]);
}
