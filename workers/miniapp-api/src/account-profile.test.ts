import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

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
