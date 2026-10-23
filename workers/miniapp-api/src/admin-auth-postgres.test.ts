import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { AdminController } from "./admin.controller.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { MiniappService } from "./miniapp-service.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";

const databaseUrl = process.env.ADMIN_AUTH_TEST_DATABASE_URL;

test("HTTP principal authorization reaches durable PostgreSQL writes and audit under the same actor", { skip: !databaseUrl }, async () => {
  const selected = new URL(databaseUrl!);
  assert.equal(selected.hostname, "127.0.0.1");
  assert.match(selected.pathname, /^\/starward_(?:admin_auth|account_write)_[a-f0-9]+$/u);
  const repository = await new PostgresMiniappRepository(databaseUrl!).initialize();
  const before = process.env.MINIAPP_ADMIN_CREDENTIALS;
  const credential = (actorId: string, token: string, role: string) => ({ actorId, tokenSha256: createHash("sha256").update(token).digest("hex"), roles: [role] });
  process.env.MINIAPP_ADMIN_CREDENTIALS = JSON.stringify([credential("admin:http-owner", "owner-test", "OWNER"), credential("admin:http-auditor", "auditor-test", "AUDITOR")]);
  const service = { repository, cache: { deleteByPrefix: async () => undefined } };
  class TestModule {}
  Module({ controllers: [AdminController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const adapter = new FastifyAdapter({ logger: false });
  const app = await NestFactory.create(TestModule, adapter, { logger: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  try {
    const spot = await insertExplicitTestSpot(repository, { spotId: `spot:admin-auth:${randomUUID()}` });
    await app.init();
    const http = adapter.getInstance(); await http.ready();
    const patch = (token?: string, actor?: string) => http.inject({ method: "PATCH", url: `/v2/admin/spots/${encodeURIComponent(spot.spotId)}`, headers: { ...(token ? { "x-admin-token": token } : {}), ...(actor ? { "x-admin-actor": actor } : {}) }, payload: { name: "R20 verified owner edit", reason: "isolated authorization check" } });
    for (const result of [await patch(), await patch("auditor-test"), await patch("auditor-test", "admin:http-owner")]) assert.equal(result.statusCode, 403);
    const untouched = await repository.pool.query("SELECT name, version FROM spots WHERE spot_id = $1", [spot.spotId]);
    assert.equal(untouched.rows[0].name, spot.name);
    assert.equal(untouched.rows[0].version, 1);
    assert.equal((await patch("owner-test")).statusCode, 200);
    const readback = await repository.pool.query("SELECT name, version FROM spots WHERE spot_id = $1", [spot.spotId]);
    assert.equal(readback.rows[0].name, "R20 verified owner edit");
    assert.equal(readback.rows[0].version, 2);
    const audit = await repository.pool.query("SELECT actor_id FROM audit_logs WHERE subject_id = $1", [spot.spotId]);
    assert.equal(audit.rows.length, 1);
    assert.equal(audit.rows[0].actor_id, "admin:http-owner");
    const history = await repository.pool.query("SELECT created_by FROM spot_revisions WHERE spot_id = $1 AND revision_no = 2", [spot.spotId]);
    assert.equal(history.rows[0].created_by, "admin:http-owner");
  } finally {
    await app.close(); await repository.close();
    if (before === undefined) delete process.env.MINIAPP_ADMIN_CREDENTIALS;
    else process.env.MINIAPP_ADMIN_CREDENTIALS = before;
  }
});
