import { createHash } from "node:crypto";
import type { AccountProfileRecord, UserId } from "@starward/miniapp-contracts";
import type { PoolClient } from "pg";
import { assertReceiptNotErased } from "./account-data-erasure.ts";
import { accountMediaObjectIsReferenced } from "./account-media-retirement.ts";
import { CONTRIBUTION_UPLOAD_TTL_MS } from "./contribution-validation.ts";
import type { MediaObjectStorePort, MiniappRepositoryPort } from "./ports.ts";

type Client = Pick<PoolClient, "query">;
type Avatar = Parameters<MiniappRepositoryPort["saveAccountAvatar"]>[1];
export type AccountAvatarSaveResult = Awaited<ReturnType<MiniappRepositoryPort["saveAccountAvatar"]>>;
export interface AccountAvatarWrite {
  userId: UserId;
  avatar: Avatar;
  expectedRevision: number;
  idempotencyKey: string;
}

const RECEIPT_DIGEST_PREFIX = "account-avatar-write-v1:";

export function accountAvatarRequestDigest(input: AccountAvatarWrite) {
  const { userId, avatar, expectedRevision, idempotencyKey } = input;
  return createHash("sha256").update(JSON.stringify({
    userId, idempotencyKey, expectedRevision, objectKey: avatar.objectKey,
    version: avatar.version, mimeType: avatar.mimeType, zoom: avatar.zoom,
    byteSize: avatar.byteSize, sha256: avatar.sha256,
  })).digest("hex");
}

export function accountAvatarReceiptDigest(requestDigest: string) {
  return RECEIPT_DIGEST_PREFIX + requestDigest;
}

/** Both preparation and commit acquire the account before its write intent.
 * Receipt replay never reacquires an upload permission or rewrites old bytes. */
export async function lockAccountAvatarWrite(client: Client, input: AccountAvatarWrite, requestDigest: string) {
  const { userId, avatar, expectedRevision, idempotencyKey } = input;
  const existing = await client.query<{
    state: string; profile_revision: number; nickname: string | null; avatar_object_key: string | null;
  }>("SELECT state, profile_revision, nickname, avatar_object_key FROM users WHERE user_id = $1 FOR UPDATE", [userId]);
  const row = existing.rows[0];
  if (!row) throw new Error("account_profile_not_found");
  if (row.state !== "ACTIVE") throw new Error("account_not_active");
  const recorded = await client.query<{ operation: string; request_digest: string | null; response: AccountAvatarSaveResult }>(
    "SELECT operation, request_digest, response FROM idempotency_records WHERE scope_id = $1 AND idempotency_key = $2",
    [userId, idempotencyKey],
  );
  const receipt = recorded.rows[0];
  if (receipt) {
    assertReceiptNotErased(receipt.response);
    const profile: AccountProfileRecord | undefined = receipt.response?.profile;
    // Older avatar receipts used the outbox payload digest. Preserve their
    // original metadata comparison; new receipts bind the complete request.
    if (receipt.operation !== "account.avatar.save"
      || profile?.avatar?.version !== avatar.version || profile.avatar.mimeType !== avatar.mimeType
      || profile.avatar.zoom !== avatar.zoom || profile.revision !== expectedRevision + 1
      || (receipt.request_digest?.startsWith(RECEIPT_DIGEST_PREFIX)
        && receipt.request_digest !== accountAvatarReceiptDigest(requestDigest))) {
      throw new Error("account_profile_idempotency_conflict");
    }
    return { row, replay: receipt.response };
  }
  if (row.profile_revision !== expectedRevision) throw new Error("account_profile_revision_conflict");
  return { row, replay: null };
}

/** Commit this registration before entering the transaction that writes bytes.
 * The existing private-upload TTL bounds abandoned work, not a running writer:
 * a running writer holds this row lock until its reference transaction ends. */
export async function prepareAccountAvatarWriteIntent(client: Client, input: AccountAvatarWrite, requestDigest: string) {
  await client.query(
    `INSERT INTO account_avatar_write_intents(user_id, idempotency_key, object_key, request_digest, expires_at)
     VALUES ($1, $2, $3, $4, clock_timestamp() + $5 * interval '1 millisecond')
     ON CONFLICT (user_id, idempotency_key) DO NOTHING`,
    [input.userId, input.idempotencyKey, input.avatar.objectKey, requestDigest, CONTRIBUTION_UPLOAD_TTL_MS],
  );
  const intent = await client.query<{ object_key: string; request_digest: string }>(
    "SELECT object_key, request_digest FROM account_avatar_write_intents WHERE user_id = $1 AND idempotency_key = $2 FOR UPDATE",
    [input.userId, input.idempotencyKey],
  );
  if (intent.rows[0]?.request_digest !== requestDigest || intent.rows[0]?.object_key !== input.avatar.objectKey)
    throw new Error("account_profile_idempotency_conflict");
  // A retired tombstone retains the command's content binding. Only an exact
  // retry may renew it after expiry; a changed payload never inherits its key.
  await client.query(
    `UPDATE account_avatar_write_intents
        SET expires_at = clock_timestamp() + $3 * interval '1 millisecond', retired_at = NULL
      WHERE user_id = $1 AND idempotency_key = $2`,
    [input.userId, input.idempotencyKey, CONTRIBUTION_UPLOAD_TTL_MS],
  );
}

export async function lockAccountAvatarWriteIntent(client: Client, input: AccountAvatarWrite, requestDigest: string) {
  const intent = await client.query<{ object_key: string; request_digest: string; writable: boolean }>(
    `SELECT object_key, request_digest, retired_at IS NULL AND expires_at > clock_timestamp() AS writable
       FROM account_avatar_write_intents WHERE user_id = $1 AND idempotency_key = $2 FOR UPDATE`,
    [input.userId, input.idempotencyKey],
  );
  const row = intent.rows[0];
  if (!row || !row.writable) throw new Error("account_avatar_write_intent_expired");
  if (row.request_digest !== requestDigest || row.object_key !== input.avatar.objectKey)
    throw new Error("account_profile_idempotency_conflict");
}

/** The account erasure transaction already owns the user lock. An active
 * avatar writer cannot pass it, and an expiry worker can finish before this
 * lock is acquired. Retired tombstones no longer own bytes but are erased too. */
export async function takeAccountAvatarWriteIntentsForDeletion(client: Client, userId: UserId) {
  const intents = await client.query<{ object_key: string; retired_at: Date | null }>(
    "SELECT object_key, retired_at FROM account_avatar_write_intents WHERE user_id = $1 ORDER BY object_key FOR UPDATE", [userId],
  );
  await client.query("DELETE FROM account_avatar_write_intents WHERE user_id = $1", [userId]);
  return intents.rows.filter(row => row.retired_at === null).map(row => row.object_key);
}

/** The worker supplies a transaction and its existing sweep batch bound.
 * SKIP LOCKED excludes both active object writers and another expiry worker.
 * Unknown COMMIT therefore remains protected until PostgreSQL resolves it. */
export async function retireExpiredAccountAvatarWrites(
  client: Client,
  mediaStore: Pick<MediaObjectStorePort, "delete" | "enabled">,
  limit: number,
) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("account_avatar_retirement_limit_invalid");
  const intents = await client.query<{ user_id: string; idempotency_key: string; object_key: string }>(
    `SELECT user_id, idempotency_key, object_key FROM account_avatar_write_intents
      WHERE retired_at IS NULL AND expires_at <= clock_timestamp()
      ORDER BY cleanup_attempted_at NULLS FIRST, expires_at, object_key LIMIT $1 FOR UPDATE SKIP LOCKED`, [limit],
  );
  let deletedObjectCount = 0;
  let retainedObjectCount = 0;
  let retiredIntentCount = 0;
  let failedIntentCount = 0;
  for (const intent of intents.rows) {
    await client.query("SAVEPOINT avatar_retirement_item");
    try {
      const referenced = await accountMediaObjectIsReferenced(client, intent.object_key);
      if (!referenced) {
        if (!mediaStore.enabled) throw new Error("account_media_retirement_store_unavailable");
        await mediaStore.delete(intent.object_key);
      }
      await client.query(
        `UPDATE account_avatar_write_intents SET retired_at=clock_timestamp(),cleanup_attempted_at=clock_timestamp()
          WHERE user_id=$1 AND idempotency_key=$2`, [intent.user_id, intent.idempotency_key],
      );
      if (referenced) retainedObjectCount++; else deletedObjectCount++;
      retiredIntentCount++;
    } catch {
      // An item-level failure cannot discard the successful independent rows.
      // A lost database connection still escapes here: no acknowledgement is
      // inferred when rollback/update cannot establish a durable result.
      await client.query("ROLLBACK TO SAVEPOINT avatar_retirement_item");
      await client.query(
        "UPDATE account_avatar_write_intents SET cleanup_attempted_at=clock_timestamp() WHERE user_id=$1 AND idempotency_key=$2",
        [intent.user_id, intent.idempotency_key],
      );
      failedIntentCount++;
    }
    await client.query("RELEASE SAVEPOINT avatar_retirement_item");
  }
  return { retiredIntentCount, deletedObjectCount, retainedObjectCount, failedIntentCount };
}
