import assert from "node:assert/strict";
import test from "node:test";
import { createHmac, randomBytes } from "node:crypto";
import { AuthService } from "./auth-service.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { encryptWechatDeliveryIdentity, decryptWechatDeliveryIdentity } from "./wechat-delivery-identity.ts";

test("delivery destination is encrypted and authenticated to account, AppID and key", () => {
  const key = randomBytes(32).toString("hex");
  const encrypted = encryptWechatDeliveryIdentity("synthetic-openid", "user:a", "app:a", key);
  assert.equal(decryptWechatDeliveryIdentity(encrypted, "user:a", "app:a", key), "synthetic-openid");
  assert.notEqual(encryptWechatDeliveryIdentity("synthetic-openid", "user:a", "app:a", key), encrypted);
  assert.ok(!encrypted.includes("synthetic-openid"));
  for (const [user, app, candidate] of [["user:b", "app:a", key], ["user:a", "app:b", key], ["user:a", "app:a", randomBytes(32).toString("hex")]])
    assert.throws(() => decryptWechatDeliveryIdentity(encrypted, user!, app!, candidate!), /identity_unavailable/);
  const parts = encrypted.split(".");
  const ciphertext = Buffer.from(parts[4]!, "base64url"); ciphertext[0] = ciphertext[0]! ^ 1;
  parts[4] = ciphertext.toString("base64url");
  assert.throws(() => decryptWechatDeliveryIdentity(parts.join("."), "user:a", "app:a", key), /identity_unavailable/);
});

test("verified login upgrades an existing digest; disabled registration and erasure retain their boundaries", async () => {
  const repository = new InMemoryTestRepository([]);
  const base = createTestRuntimeConfig();
  const key = randomBytes(32).toString("hex");
  const config = createTestRuntimeConfig({ authMode: "WECHAT", wechat: { ...base.wechat, appId: "app:a", appSecret: "synthetic" } });
  const transport: typeof fetch = async () => Response.json({ openid: "synthetic-openid", session_key: "synthetic-session-key" });
  const original = (await new AuthService(repository, config, transport).login({ code: "before" })).data;
  assert.equal(await repository.getWechatDeliveryIdentity(original.userId, "app:a"), null);
  const auth = new AuthService(repository, { ...config, wechat: { ...config.wechat, deliveryIdentityKey: key } }, transport);
  const upgraded = (await auth.login({ code: "after" })).data;
  assert.equal(upgraded.userId, original.userId);
  const stored = await repository.getWechatDeliveryIdentity(original.userId, "app:a");
  assert.ok(stored);
  assert.equal(decryptWechatDeliveryIdentity(stored, original.userId, "app:a", key), "synthetic-openid");
  assert.equal(await repository.getWechatDeliveryIdentity(original.userId, "app:b"), null);
  assert.ok(!JSON.stringify(upgraded).includes("synthetic"), "session response contains no provider identity or session key");
  const digest = createHmac("sha256", config.wechat.sessionSecret).update("wechat-openid:synthetic-openid").digest("hex");
  await repository.deleteAccount(original.userId, "delete:synthetic");
  assert.equal(await repository.getWechatDeliveryIdentity(original.userId, "app:a"), null);
  await assert.rejects(repository.saveWechatDeliveryIdentity({ userId: original.userId, identityDigest: digest, appId: "app:a", ciphertext: stored }), /account_unavailable/);
  const next = (await auth.login({ code: "new-account" })).data;
  assert.notEqual(next.userId, original.userId);
});
