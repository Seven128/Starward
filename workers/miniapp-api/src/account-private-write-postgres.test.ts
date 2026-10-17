import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { PoolClient } from "pg";
import type { ImportDraft, ProfileLink, UserId } from "@starward/miniapp-contracts";
import { LocalFilesystemMediaObjectStore } from "./media-object-store.ts";
import { MiniappService } from "./miniapp-service.ts";
import { DisabledRouteAdapter } from "./route-provider.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { DeterministicWeatherTestAdapter } from "./test-fixtures/deterministic-weather-adapter.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";

const databaseUrl = process.env.ACCOUNT_PRIVATE_WRITE_TEST_DATABASE_URL;

async function repositoryForTest() {
  assert.ok(databaseUrl);
  assert.match(new URL(databaseUrl).pathname, /^\/starward_account_write_[a-f0-9]+$/u);
  return new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
}

function link(): ProfileLink {
  return { profileLinkId: `profile-link:${randomUUID()}` as ProfileLink["profileLinkId"], platform: "OTHER",
    displayName: "TEST owned link", url: "https://example.com/owned-test", visibility: "PRIVATE", sortOrder: 0,
    status: "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

function draft(): ImportDraft {
  const field = <T>(value: T) => ({ value, revision: 1, editedByUser: true });
  return { importDraftId: `import:${randomUUID()}` as ImportDraft["importDraftId"], stage: "SOURCE", platform: "OTHER",
    originalUrl: "https://example.com/owned-test", rightsConfirmed: true, importedAt: new Date().toISOString(),
    parseState: "NOT_REQUESTED", parseReason: "TEST manual input", title: field("TEST title"), body: field("TEST body"),
    sourceNote: field("TEST own content"), visibility: field("PRIVATE" as const), spotId: null, spotProposalId: null,
    moderationState: "DRAFT", proposalReviewState: "NOT_APPLICABLE", revision: 1 };
}

async function assertErased(repository: PostgresMiniappRepository, userId: UserId) {
  const row = (await repository.pool.query("SELECT state,nickname,avatar_object_key FROM users WHERE user_id=$1", [userId])).rows[0];
  assert.deepEqual(row, { state: "DELETED", nickname: null, avatar_object_key: null });
  for (const table of ["favorites", "user_profile_links", "external_post_imports", "user_preferences", "user_sessions"]) {
    assert.equal(Number((await repository.pool.query(`SELECT count(*)::int AS count FROM ${table} WHERE user_id=$1`, [userId])).rows[0].count), 0, table);
  }
  assert.deepEqual((await repository.pool.query("SELECT operation FROM idempotency_records WHERE scope_id=$1", [userId])).rows, [{ operation: "account.delete" }]);
}

for (const operation of ["favorite", "nickname", "avatar", "preferences", "profile-link", "profile-link-delete", "import"] as const) {
  test(`PostgreSQL rejects an authenticated late ${operation} write after account deletion`, { skip: !databaseUrl }, async () => {
    const repository = await repositoryForTest();
    try {
      const userId = await repository.findOrCreateWechatUser(`private-write:${randomUUID()}`);
      const otherId = await repository.findOrCreateWechatUser(`private-write-other:${randomUUID()}`);
      const spot = await insertExplicitTestSpot(repository, { spotId: `spot:private-write:${randomUUID()}` });
      const profileLink = link(), importDraft = draft(), preferences = (await repository.getPreferences(userId)).preferences;
      await repository.setFavorite(otherId, spot.spotId, true, `other-favorite:${randomUUID()}`);
      const otherBefore = { favorites: await repository.listFavoriteIds(otherId), preferences: await repository.getPreferences(otherId), profile: await repository.getAccountProfile(otherId) };
      // A supported positive write precedes erasure; the late call uses the
      // revision/identity already obtained by its authenticated request.
      const write = () => {
        const key = `late:${randomUUID()}`;
        switch (operation) {
          case "favorite": return repository.setFavorite(userId, spot.spotId, true, key);
          case "nickname": return repository.saveAccountNickname(userId, "TEST late nickname", 1, key);
          case "avatar": return repository.saveAccountAvatar(userId, { objectKey: `profiles/test/${randomUUID()}.png`, version: "f".repeat(64), sha256: "f".repeat(64), mimeType: "image/png", byteSize: 32, zoom: 1.2 }, 1, key);
          case "preferences": return repository.savePreferences(userId, preferences, 1, key);
          case "profile-link": return repository.saveProfileLink(userId, profileLink, key);
          case "profile-link-delete": return repository.deleteProfileLink(userId, profileLink.profileLinkId, key);
          case "import": return repository.saveImportDraft(userId, importDraft, null, key);
        }
      };
      if (operation === "nickname" || operation === "avatar" || operation === "preferences") {
        // Exercise the same production writer without consuming the target's
        // in-flight expected revision before deletion.
        if (operation === "nickname") await repository.saveAccountNickname(otherId, "TEST active", 1, `active:${randomUUID()}`);
        if (operation === "avatar") await repository.saveAccountAvatar(otherId, { objectKey: "profiles/test/active.png", version: "e".repeat(64), sha256: "e".repeat(64), mimeType: "image/png", byteSize: 32, zoom: 1 }, 1, `active:${randomUUID()}`);
        if (operation === "preferences") await repository.savePreferences(otherId, preferences, 1, `active:${randomUUID()}`);
      } else await write();
      const otherHeld = { ...otherBefore, preferences: await repository.getPreferences(otherId), profile: await repository.getAccountProfile(otherId) };
      await repository.deleteAccount(userId, `delete:${randomUUID()}`);
      await assert.rejects(write(), /account_not_active/u);
      await assertErased(repository, userId);
      assert.deepEqual({ favorites: await repository.listFavoriteIds(otherId), preferences: await repository.getPreferences(otherId), profile: await repository.getAccountProfile(otherId) }, otherHeld);
    } finally { await repository.close(); }
  });
}

for (const order of ["delete-first", "write-first"] as const) {
  test(`PostgreSQL favorite and erasure serialize when ${order}`, { skip: !databaseUrl, timeout: 30_000 }, async () => {
    const repository = await repositoryForTest();
    let blocker: PoolClient | null = null, writer: PostgresMiniappRepository | null = null;
    let releaseWrite: () => void = () => undefined;
    const waitForLocks = async (minimum: number) => {
      const deadline = Date.now() + 5_000;
      while (Date.now() < deadline) {
        const count = Number((await repository.pool.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'")).rows[0].count);
        if (count >= minimum) return;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.fail(`expected ${minimum} real lock waiters`);
    };
    try {
      const userId = await repository.findOrCreateWechatUser(`private-race:${randomUUID()}`);
      const spot = await insertExplicitTestSpot(repository, { spotId: `spot:private-race:${randomUUID()}` });
      if (order === "delete-first") {
        blocker = await repository.pool.connect();await blocker.query("BEGIN");
        await blocker.query("SELECT user_id FROM users WHERE user_id=$1 FOR UPDATE", [userId]);
        const deletion = repository.deleteAccount(userId, `delete:${randomUUID()}`);await waitForLocks(1);
        const write = repository.setFavorite(userId, spot.spotId, true, `favorite:${randomUUID()}`);
        const rejected = assert.rejects(write, /account_not_active/u);await waitForLocks(2);
        await blocker.query("COMMIT");blocker.release();blocker = null;await deletion;await rejected;
      } else {
        writer = await new PostgresMiniappRepository(databaseUrl!).initialize();
        const connect = writer.pool.connect.bind(writer.pool), hold = new Promise<void>(resolve => { releaseWrite = resolve; });
        let inserted = false;
        writer.pool.connect = (async () => {
          const client = await connect(), query = client.query;
          client.query = (async (...args: unknown[]) => {
            const result = await Reflect.apply(query, client, args);
            if (typeof args[0] === "string" && args[0].includes("INSERT INTO favorites")) {
              inserted = true;await hold;client.query = query;
            }
            return result;
          }) as typeof client.query;
          return client;
        }) as typeof writer.pool.connect;
        const write = writer.setFavorite(userId, spot.spotId, true, `favorite:${randomUUID()}`);
        const deadline = Date.now() + 5_000;while (!inserted && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
        assert.equal(inserted, true, "the actual favorite INSERT must precede deletion");
        const deletion = repository.deleteAccount(userId, `delete:${randomUUID()}`);await waitForLocks(1);
        releaseWrite();releaseWrite = () => undefined;await write;await deletion;
      }
      await assertErased(repository, userId);
    } finally {
      releaseWrite();if (blocker) { await blocker.query("ROLLBACK");blocker.release(); }
      await writer?.close();await repository.close();
    }
  });
}

test("late avatar metadata rejection retires its actual filesystem bytes", { skip: !databaseUrl }, async () => {
  const repository = await repositoryForTest(), root = await mkdtemp(path.join(os.tmpdir(), "starward-account-write-media-"));
  const mediaStore = new LocalFilesystemMediaObjectStore(root);
  const service = new MiniappService({ repository, mediaStore, config: createTestRuntimeConfig(), weather: new DeterministicWeatherTestAdapter(), route: new DisabledRouteAdapter() });
  let puts = 0;
  const put = mediaStore.put.bind(mediaStore);
  mediaStore.put = async input => { await put(input);puts++; };
  try {
    const userId = await repository.findOrCreateWechatUser(`private-avatar:${randomUUID()}`);
    await repository.deleteAccount(userId, `delete:${randomUUID()}`);
    const bytes = await readFile(new URL("./test-fixtures/self-generated-transport-test.jpg", import.meta.url));
    await assert.rejects(service.saveAccountAvatar(userId, { dataBase64: bytes.toString("base64"), mimeType: "image/jpeg", declaredByteSize: bytes.length, zoom: 1.3, expectedRevision: 1 }, `avatar:${randomUUID()}`), /account_not_active/u);
    assert.equal(puts, 1, "the real filesystem put must be observed before compensation");
    const entries = await readdir(root, { recursive: true, withFileTypes: true });assert.equal(entries.filter(entry => entry.isFile()).length, 0);
    await assertErased(repository, userId);
  } finally {
    await service.onModuleDestroy();
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(root, { recursive: true, force: true });
  }
});
