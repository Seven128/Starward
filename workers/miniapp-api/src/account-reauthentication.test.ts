import assert from "node:assert/strict";
import test from "node:test";
import { AuthService } from "./auth-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";

test("sensitive account operations require a fresh code matching the session identity", async () => {
  const repository = new InMemoryTestRepository([]);
  const used = new Set<string>();
  const base = createTestRuntimeConfig();
  const config = createTestRuntimeConfig({ authMode: "WECHAT",
    wechat: { ...base.wechat, appId: "synthetic-app", appSecret: "synthetic-secret" } });
  let exchanges = 0;
  const transport: typeof fetch = async input => {
    exchanges++;
    const code = new URL(String(input)).searchParams.get("js_code")!;
    if (used.has(code) || code === "rejected") return Response.json({ errcode: 40029 });
    used.add(code);
    return Response.json({ openid: code.startsWith("other") ? "other-account" : "same-account", session_key: "synthetic-session" });
  };
  const auth = new AuthService(repository, config, transport);
  const session = (await auth.login({ code: "initial" })).data;
  const authorization = `Bearer ${session.accessToken}`;
  await assert.rejects(auth.requireReauthenticatedPrincipal(authorization), /reauthentication_required/);
  await assert.rejects(auth.requireReauthenticatedPrincipal(undefined, "fresh"), /auth_required/);
  assert.equal(exchanges, 1, "missing session/code cannot initiate an exchange");
  await assert.rejects(auth.requireReauthenticatedPrincipal(authorization, "other-fresh"), /identity_mismatch/);
  await assert.rejects(auth.requireReauthenticatedPrincipal(authorization, "rejected"), /wechat_auth_rejected/);
  assert.equal(await auth.requirePrincipal(authorization), session.userId, "failures retain the original session");
  assert.equal(await auth.requireReauthenticatedPrincipal(authorization, "fresh"), session.userId);
  await assert.rejects(auth.requireReauthenticatedPrincipal(authorization, "fresh"), /wechat_auth_rejected/);
});

test("local fixture reauthentication still rejects a different installation", async () => {
  const auth = new AuthService(new InMemoryTestRepository([]), createTestRuntimeConfig());
  const code = "local:synthetic-installation-one";
  const session = (await auth.login({ code })).data;
  assert.equal(await auth.requireReauthenticatedPrincipal(`Bearer ${session.accessToken}`, code), session.userId);
  await assert.rejects(auth.requireReauthenticatedPrincipal(`Bearer ${session.accessToken}`, "local:synthetic-installation-two"), /identity_mismatch/);
});
