import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { MediaObjectStorePort } from "./ports.ts";
import { MEDIA_MAINTENANCE_BATCH_SIZE } from "./contribution-media-maintenance.ts";

export function isAccountMediaRetirementPayload(payload: unknown): payload is { action: "DELETE_ACCOUNT_MEDIA"; deletionBatchId: string } {
  return typeof payload === "object" && payload !== null
    && "action" in payload && payload.action === "DELETE_ACCOUNT_MEDIA"
    && "deletionBatchId" in payload && typeof payload.deletionBatchId === "string";
}

/** One reference policy for replacement, erasure and abandoned avatar writes.
 * A missing/invalid query result is never permission to delete private bytes. */
export async function accountMediaObjectIsReferenced(client: Pick<PoolClient, "query">, objectKey: string) {
  const referenced = await client.query<{ referenced: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM users WHERE avatar_object_key = $1)
        OR EXISTS (SELECT 1 FROM spot_formal_reference_media WHERE object_key = $1) AS referenced`, [objectKey],
  );
  const value = referenced.rows[0]?.referenced;
  if (typeof value !== "boolean") throw new Error("account_media_reference_check_unavailable");
  return value;
}

/** Called inside the same transaction as the reference removal/replacement.
 * Reuse the account erasure queue and its MEDIA event protocol. */
export async function queueAccountMediaRetirement(client: Pick<PoolClient, "query">, keys: readonly string[]) {
  const objectKeys = [...new Set(keys)];
  if (!objectKeys.length) return null;
  const deletionBatchId = randomUUID();
  for (const objectKey of objectKeys) {
    await client.query(
      `INSERT INTO account_deletion_media_queue(deletion_batch_id, object_key)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`, [deletionBatchId, objectKey],
    );
  }
  return deletionBatchId;
}

/** One bounded page commits independently of the outbox completion receipt.
 * Savepoints keep an individual failure from undoing other acknowledgements;
 * a retry may delete absent bytes, but never a current durable reference. */
export async function retireAccountMediaBatch(
  client: Pick<PoolClient, "query">,
  mediaStore: Pick<MediaObjectStorePort, "delete" | "enabled">,
  deletionBatchId: string,
  limit = MEDIA_MAINTENANCE_BATCH_SIZE,
) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MEDIA_MAINTENANCE_BATCH_SIZE)
    throw new Error("account_media_retirement_limit_invalid");
  await client.query(
    `INSERT INTO account_media_retirement_progress(deletion_batch_id) VALUES ($1)
     ON CONFLICT DO NOTHING`, [deletionBatchId],
  );
  // The same batch has one accumulated receipt even if a page's COMMIT reply
  // is lost. This row also serializes duplicate consumers of the same batch.
  await client.query("SELECT deletion_batch_id FROM account_media_retirement_progress WHERE deletion_batch_id=$1 FOR UPDATE", [deletionBatchId]);
  const queued = await client.query<{ object_key: string }>(
    `SELECT object_key FROM account_deletion_media_queue
      WHERE deletion_batch_id = $1
      ORDER BY cleanup_attempted_at NULLS FIRST, object_key LIMIT $2 FOR UPDATE SKIP LOCKED`, [deletionBatchId, limit],
  );
  let deletedObjectCount = 0;
  let retainedObjectCount = 0;
  let failedObjectCount = 0;
  for (const { object_key: objectKey } of queued.rows) {
    await client.query("SAVEPOINT account_media_retirement_item");
    try {
      const referenced = await accountMediaObjectIsReferenced(client, objectKey);
      if (!referenced) {
        if (!mediaStore.enabled) throw new Error("account_media_retirement_store_unavailable");
        await mediaStore.delete(objectKey);
      }
      // An affirmative live reference supersedes only this old intent.
      await client.query(
        "DELETE FROM account_deletion_media_queue WHERE deletion_batch_id=$1 AND object_key=$2", [deletionBatchId, objectKey],
      );
      if (referenced) retainedObjectCount++; else deletedObjectCount++;
    } catch {
      // A failed query may have aborted the subtransaction. Restore it before
      // recording the failed attempt; connection loss still escapes safely.
      await client.query("ROLLBACK TO SAVEPOINT account_media_retirement_item");
      await client.query(
        `UPDATE account_deletion_media_queue SET cleanup_attempted_at=clock_timestamp()
          WHERE deletion_batch_id=$1 AND object_key=$2`, [deletionBatchId, objectKey],
      );
      failedObjectCount++;
    }
    await client.query("RELEASE SAVEPOINT account_media_retirement_item");
  }
  const progress = await client.query<{ deleted_object_count: number; retained_object_count: number }>(
    `UPDATE account_media_retirement_progress
        SET deleted_object_count=deleted_object_count+$2,retained_object_count=retained_object_count+$3
      WHERE deletion_batch_id=$1 RETURNING deleted_object_count,retained_object_count`,
    [deletionBatchId, deletedObjectCount, retainedObjectCount],
  );
  const remaining = await client.query<{ pending: boolean; unattempted: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM account_deletion_media_queue WHERE deletion_batch_id=$1) AS pending,
            EXISTS (SELECT 1 FROM account_deletion_media_queue WHERE deletion_batch_id=$1 AND cleanup_attempted_at IS NULL) AS unattempted`,
    [deletionBatchId],
  );
  const pending = remaining.rows[0];
  if (!progress.rows[0] || typeof pending?.pending !== "boolean" || typeof pending.unattempted !== "boolean")
    throw new Error("account_media_retirement_progress_unavailable");
  return {
    deletionBatchId, deletedObjectCount, retainedObjectCount, failedObjectCount,
    totalDeletedObjectCount: progress.rows[0].deleted_object_count,
    totalRetainedObjectCount: progress.rows[0].retained_object_count,
    hasRemainingObjects: pending.pending,
    // Normal pagination, useful progress and externally locked rows must not
    // consume the job's finite failure budget. A failure-only remainder does.
    continueProcessing: pending.pending && (pending.unattempted || deletedObjectCount + retainedObjectCount > 0 || failedObjectCount === 0),
  };
}
