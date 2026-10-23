import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { MemoryMediaObjectStore } from "./media-object-store.ts";

async function avatarInput(expectedRevision: number, zoom = 1.35) {
  const bytes = await readFile(new URL("./test-fixtures/self-generated-transport-test.jpg", import.meta.url));
  return { dataBase64: bytes.toString("base64"), mimeType: "image/jpeg" as const,
    declaredByteSize: bytes.length, zoom, expectedRevision };
}

test("committed avatar survives unavailable old-object cleanup", async () => {
  class UnavailableDeletionStore extends MemoryMediaObjectStore {
    deletionAttempts = 0;
    override async delete(_key: string) { this.deletionAttempts++; throw new Error("test_old_object_cleanup_unavailable"); }
  }
  const repository = new InMemoryTestRepository();
  const mediaStore = new UnavailableDeletionStore();
  const service = createTestMiniappService({ repository, mediaStore });
  try {
    const { userId } = (await service.login({ code: "local:avatar-retirement-test" })).data;
    await service.saveAccountAvatar(userId, await avatarInput(1), "avatar:retirement:first");
    const oldObject = (await repository.getAccountAvatarObject(userId))!;
    const saved = await service.saveAccountAvatar(userId, await avatarInput(2, 1.8), "avatar:retirement:second");
    assert.equal(saved.data.revision, 3);
    assert.equal((await service.getAccountAvatar(userId)).data.zoom, 1.8);
    assert.ok(await mediaStore.read(oldObject.objectKey));
    assert.deepEqual([...repository.pendingAccountMediaRetirement], [oldObject.objectKey]);
    assert.equal(mediaStore.deletionAttempts, 0, "user commit does not run object retirement");
  } finally { await service.onModuleDestroy(); }
});

test("lost avatar commit reply preserves bytes and permits the exact retry", async () => {
  class LostReplyRepository extends InMemoryTestRepository {
    failReply = true;
    override async saveAccountAvatar(...args: Parameters<InMemoryTestRepository["saveAccountAvatar"]>) {
      const saved = await super.saveAccountAvatar(...args);
      if (this.failReply) { this.failReply = false; throw new Error("test_commit_reply_lost"); }
      return saved;
    }
  }
  const repository = new LostReplyRepository();
  const service = createTestMiniappService({ repository });
  try {
    const { userId } = (await service.login({ code: "local:avatar-lost-reply-test" })).data;
    const input = await avatarInput(1);
    await assert.rejects(service.saveAccountAvatar(userId, input, "avatar:lost-reply:retry"), /test_commit_reply_lost/);
    assert.equal((await service.getAccountAvatar(userId)).data.zoom, input.zoom);
    const saved = await service.saveAccountAvatar(userId, input, "avatar:lost-reply:retry");
    assert.equal(saved.data.revision, 2);
    assert.equal((await service.getAccountProfile(userId)).data.revision, 2);
    await assert.rejects(service.saveAccountAvatar(userId, { ...input, zoom: 2 }, "avatar:lost-reply:retry"), /idempotency_conflict/);
  } finally { await service.onModuleDestroy(); }
});

test("avatar CAS rejection and historical replay neither upload nor replace the current object", async () => {
  class CountedStore extends MemoryMediaObjectStore {
    uploads = 0;
    override async put(input: Parameters<MemoryMediaObjectStore["put"]>[0]) { this.uploads++; return super.put(input); }
  }
  const repository = new InMemoryTestRepository();
  const mediaStore = new CountedStore();
  const service = createTestMiniappService({ repository, mediaStore });
  try {
    const { userId } = (await service.login({ code: "local:avatar-cas-replay-test" })).data;
    const first = await avatarInput(1);
    await service.saveAccountAvatar(userId, first, "avatar:cas:first");
    await service.saveAccountAvatar(userId, await avatarInput(2, 1.9), "avatar:cas:second");
    const current = await repository.getAccountAvatarObject(userId);
    assert.equal(mediaStore.uploads, 2);
    await assert.rejects(service.saveAccountAvatar(userId, first, "avatar:cas:stale"), /revision_conflict/);
    assert.equal(mediaStore.uploads, 2, "rejected metadata never starts an object write");
    const replay = await service.saveAccountAvatar(userId, first, "avatar:cas:first");
    assert.equal(replay.data.revision, 2, "receipt is the original result");
    assert.deepEqual(await repository.getAccountAvatarObject(userId), current, "receipt replay does not restore historical media");
    assert.equal((await service.getAccountAvatar(userId)).data.zoom, 1.9);
    assert.equal(mediaStore.uploads, 2);
  } finally { await service.onModuleDestroy(); }
});

test("nickname identity isolation, revision conflicts, replay and export", async () => {
  const service = createTestMiniappService();
  try {
    const account = (await service.login({ code: "local:installation-nickname-one" })).data;
    const other = (await service.login({ code: "local:installation-nickname-two" })).data;
    const initial = (await service.getAccountProfile(account.userId)).data;
    assert.equal(initial.nickname, null);
    const input = { nickname: "  追星者  ", expectedRevision: initial.revision };
    const saved = await service.saveAccountNickname(account.userId, input, "nickname:save:0001");
    assert.equal(saved.data.nickname, "追星者");
    assert.equal(saved.data.revision, initial.revision + 1);
    assert.deepEqual((await service.saveAccountNickname(account.userId, input, "nickname:save:0001")).data, saved.data);
    await assert.rejects(service.saveAccountNickname(account.userId, { ...input, nickname: "另外" }, "nickname:save:0001"), /idempotency_conflict/);
    await assert.rejects(service.saveAccountNickname(account.userId, { ...input, nickname: "旧页面" }, "nickname:save:0002"), /revision_conflict/);
    for (const nickname of [null, "", "  ", "a\nb", "x".repeat(41), 42]) {
      await assert.rejects(service.saveAccountNickname(account.userId, { nickname: nickname as string, expectedRevision: saved.data.revision }, "nickname:invalid:0001"), /nickname_invalid/);
    }
    assert.deepEqual((await service.getAccountProfile(account.userId)).data, saved.data);
    assert.equal((await service.getAccountProfile(other.userId)).data.nickname, null);
    assert.deepEqual((await service.exportAccountData(account.userId)).data.profile, saved.data);
    const maximum = "星".repeat(40);
    assert.equal((await service.saveAccountNickname(other.userId, { nickname: maximum, expectedRevision: 1 }, "nickname:maximum:0001")).data.nickname, maximum);
  } finally { await service.onModuleDestroy(); }
});

test("avatar is sanitized, revisioned, replayable and isolated by account", async () => {
  const service = createTestMiniappService();
  try {
    const account = (await service.login({ code: "local:installation-avatar-one" })).data;
    const other = (await service.login({ code: "local:installation-avatar-two" })).data;
    const bytes = await readFile(new URL("./test-fixtures/self-generated-transport-test.jpg", import.meta.url));
    const initial = (await service.getAccountProfile(account.userId)).data;
    const input = { dataBase64: bytes.toString("base64"), mimeType: "image/jpeg" as const, declaredByteSize: bytes.length, zoom: 1.35, expectedRevision: initial.revision };
    const saved = await service.saveAccountAvatar(account.userId, input, "avatar:save:0001");
    assert.equal(saved.data.avatar?.zoom, 1.35);
    assert.equal(saved.data.avatar?.mimeType, "image/jpeg");
    assert.equal(saved.data.revision, initial.revision + 1);
    assert.deepEqual((await service.saveAccountAvatar(account.userId, input, "avatar:save:0001")).data, saved.data);
    const downloaded = (await service.getAccountAvatar(account.userId)).data;
    assert.equal(downloaded.version, saved.data.avatar?.version);
    assert.ok(Buffer.from(downloaded.dataBase64, "base64").length > 0);
    assert.equal((await service.getAccountProfile(other.userId)).data.avatar, null);
    await assert.rejects(service.getAccountAvatar(other.userId), /account_avatar_not_found/);
    await assert.rejects(service.saveAccountAvatar(account.userId, { ...input, zoom: 3, expectedRevision: saved.data.revision }, "avatar:invalid:0001"), /avatar_zoom_invalid/);
    await assert.rejects(service.saveAccountAvatar(account.userId, { ...input, expectedRevision: initial.revision }, "avatar:stale:0001"), /revision_conflict/);
  } finally { await service.onModuleDestroy(); }
});
