import assert from "node:assert/strict";
import test from "node:test";
import { createAccountProfileClient } from "./account-profile-client";

test("nickname retries reuse intent and fence account changes before and after requests", async () => {
  let owner = "a", keys = 0, fail = true, invalidate = 0;
  const sent: string[] = [];
  const client = createAccountProfileClient({
    currentUser: () => owner, makeKey: () => `key:${++keys}`,
    invalidate: async () => { invalidate++; },
    request: (async (_key: string, _op: string, options: { idempotencyKey: string }, _retried: boolean, expected: string) => {
      assert.equal(expected, "a"); sent.push(options.idempotencyKey);
      if (fail) throw new Error("connection_lost");
      return { data: { nickname: "名字", revision: 2 } };
    }) as any,
  });
  const input = { nickname: "名字", expectedRevision: 1 };
  await assert.rejects(client.saveAccountNickname("a", input));
  fail = false;
  await client.saveAccountNickname("a", input);
  assert.deepEqual(sent, ["key:1", "key:1"]);
  assert.equal(invalidate, 1);
  owner = "b";
  await assert.rejects(client.saveAccountNickname("a", input), /账户已变化/);
  assert.equal(sent.length, 2);
  const switched = createAccountProfileClient({
    currentUser: () => owner, makeKey: () => "switch-key", invalidate: async () => assert.fail("wrong account invalidation"),
    request: (async () => { owner = "c"; return { data: {} }; }) as any,
  });
  await assert.rejects(switched.saveAccountNickname("b", input), /账户已变化/);
});

test("avatar reads and explicit saves stay inside the initiating account", async () => {
  let owner = "a", key = 0, invalidate = 0;
  const operations: string[] = [];
  const client = createAccountProfileClient({
    currentUser: () => owner, makeKey: () => `avatar:${++key}`,
    invalidate: async () => { invalidate++; },
    request: (async (_cacheKey: string, operation: string, options: { idempotencyKey?: string }, _retried: boolean, expected: string) => {
      assert.equal(expected, "a"); operations.push(`${operation}:${options.idempotencyKey ?? "read"}`);
      return operation === "accountAvatarGet"
        ? { data: { version: "v", mimeType: "image/jpeg", zoom: 1, dataBase64: "AA==" } }
        : { data: { nickname: null, avatar: { version: "v", mimeType: "image/jpeg", zoom: 1 }, revision: 2, updatedAt: "2026-09-10T00:00:00.000Z" } };
    }) as any,
  });
  await client.getAccountAvatar("a");
  await client.saveAccountAvatar("a", { dataBase64: "AA==", mimeType: "image/jpeg", declaredByteSize: 1, zoom: 1, expectedRevision: 1 });
  assert.deepEqual(operations, ["accountAvatarGet:read", "accountAvatarPut:avatar:1"]);
  assert.equal(invalidate, 1);
  owner = "b";
  await assert.rejects(client.getAccountAvatar("a"), /账户已变化/);
  assert.equal(operations.length, 2);
});
