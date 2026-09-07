import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { MiniappController } from "./controller.ts";
import { MiniappService } from "./miniapp-service.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("HTTP export and delete enforce reauthentication before accessing or deleting account data", async () => {
  const service = createTestMiniappService();
  class TestModule {}
  Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const app = await NestFactory.create(TestModule, new FastifyAdapter(), { logger: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const code = "local:account-reauth-http-isolated";
    const session = (await service.login({ code })).data;
    const authorization = `Bearer ${session.accessToken}`;
    const invoke = (operation: "export" | "delete", reauth?: string) => fetch(`${base}/v2/me/${operation === "export" ? "data-export" : "account"}`, {
      method: operation === "export" ? "GET" : "DELETE",
      headers: { authorization, "content-type": "application/json", "idempotency-key": "synthetic-delete-reauth",
        ...(reauth ? { "x-wechat-reauth-code": reauth } : {}) },
      ...(operation === "delete" ? { body: JSON.stringify({ confirmation: "DELETE_ACCOUNT" }) } : {}),
    });
    for (const operation of ["export", "delete"] as const) {
      for (const reauth of [undefined, "local:other-installation-isolated"]) {
        const denied = await invoke(operation, reauth);
        assert.equal(denied.status, 403);
        assert.equal((await denied.json()).code, "PERMISSION_DENIED");
        assert.equal(await service.auth.requirePrincipal(authorization), session.userId);
      }
    }
    assert.equal((await invoke("export", code)).status, 200);
    assert.equal((await invoke("delete", code)).status, 200);
    await assert.rejects(service.auth.requirePrincipal(authorization), /auth_required/);
  } finally { await app.close(); }
});
