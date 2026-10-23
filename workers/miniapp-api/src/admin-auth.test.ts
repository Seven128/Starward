import "reflect-metadata";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { Module, RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { authenticateAdmin, assertAdminOperation } from "./admin-auth.ts";
import { configuredAdminCredentials } from "./admin-credentials.ts";
import { AdminController } from "./admin.controller.ts";
import { AdminOperationsController } from "./admin-operations.controller.ts";
import { AdminPublicationController } from "./admin-publication.controller.ts";
import { AdminEventCatalogController } from "./admin-event-catalog.controller.ts";
import { ApiExceptionFilter } from "./api-exception.filter.ts";
import { MiniappService } from "./miniapp-service.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";

const controllers = [AdminController, AdminOperationsController, AdminPublicationController, AdminEventCatalogController];
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const credentials = JSON.stringify([
  { actorId: "admin:owner", tokenSha256: digest("owner-credential"), roles: ["OWNER"] },
  { actorId: "admin:auditor", tokenSha256: digest("auditor-credential"), roles: ["AUDITOR"] },
  { actorId: "admin:moderator", tokenSha256: digest("moderator-credential"), roles: ["MODERATOR"] },
]);

test("credential configuration fails closed and legacy credentials bind one explicit principal", () => {
  assert.throws(() => configuredAdminCredentials({}), /admin_capability_disabled/u);
  assert.throws(() => configuredAdminCredentials({ MINIAPP_ADMIN_TOKEN: "legacy" }), /admin_rbac_principal_not_configured/u);
  assert.throws(() => configuredAdminCredentials({ MINIAPP_ADMIN_TOKEN: "legacy", MINIAPP_ADMIN_ACTOR: "admin:fixed" }), /admin_rbac_disabled/u);
  const configured = configuredAdminCredentials({
    MINIAPP_ADMIN_TOKEN: "legacy", MINIAPP_ADMIN_ACTOR: "admin:fixed",
    MINIAPP_ADMIN_RBAC: JSON.stringify({ "admin:fixed": ["AUDITOR"], "admin:other": ["OWNER"] }),
  });
  assert.equal(configured.length, 1);
  assert.equal(configured[0]!.actorId, "admin:fixed");
  assert.deepEqual(configured[0]!.roles, ["AUDITOR"]);
  assert.throws(() => configuredAdminCredentials({ MINIAPP_ADMIN_CREDENTIALS: "[]", MINIAPP_ADMIN_TOKEN: "fallback" }), /admin_rbac_configuration_invalid/u);
  const duplicate = { actorId: "admin:owner", tokenSha256: digest("duplicate"), roles: ["OWNER"] };
  assert.throws(() => configuredAdminCredentials({ MINIAPP_ADMIN_CREDENTIALS: JSON.stringify([duplicate, { ...duplicate, actorId: "admin:other" }]) }), /admin_rbac_configuration_invalid/u);
});

test("HTTP management routes authenticate credentials and never let the actor header grant writes", async () => {
  const before = process.env.MINIAPP_ADMIN_CREDENTIALS;
  process.env.MINIAPP_ADMIN_CREDENTIALS = credentials;
  const writes: unknown[] = [];
  const repository = Object.create(PostgresMiniappRepository.prototype) as PostgresMiniappRepository;
  repository.adminPatchSpot = async (input) => { writes.push(input); return { spot: { spotId: input.spotId } } as never; };
  repository.adminListSpots = async () => [];
  repository.adminListArticles = async () => [];
  repository.adminListModerationCases = async () => [];
  repository.adminOperations = async () => ({ audits: [{ privateAudit: true }] }) as never;
  const service = { repository, cache: { deleteByPrefix: async () => undefined } };
  class TestModule {}
  Module({ controllers, providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const adapter = new FastifyAdapter({ logger: false });
  const app = await NestFactory.create(TestModule, adapter, { logger: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  try {
    await app.init();
    const http = adapter.getInstance();
    await http.ready();
    // Exercise every registered route through Nest's real header/body binding.
    for (const controller of controllers) {
      const root = Reflect.getMetadata(PATH_METADATA, controller) as string;
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const method = controller.prototype[name as keyof typeof controller.prototype];
        const route = Reflect.getMetadata(PATH_METADATA, method) as string | undefined;
        const verb = Reflect.getMetadata(METHOD_METADATA, method) as RequestMethod | undefined;
        if (route === undefined || verb === undefined) continue;
        const url = `/${root}/${route}`.replace(/\/+/gu, "/").replace(/\/$/u, "").replace(/:[A-Za-z]+/gu, "test");
        const requestMethod = verb === RequestMethod.GET ? "GET" : verb === RequestMethod.PATCH ? "PATCH" : "POST";
        const result = await http.inject({ method: requestMethod, url, ...(requestMethod === "GET" ? {} : { payload: {} }) });
        assert.equal(result.statusCode, 403, `${requestMethod} ${url} must require credentials`);
        if (requestMethod !== "GET") {
          const denied = await http.inject({ method: requestMethod, url, headers: { "x-admin-token": "auditor-credential" }, payload: {} });
          assert.equal(denied.statusCode, 403, `${requestMethod} ${url} cannot use a read permission`);
        }
      }
    }
    const patch = (token: string, actor?: string) => http.inject({ method: "PATCH", url: "/v2/admin/spots/spot:test", headers: { "x-admin-token": token, ...(actor ? { "x-admin-actor": actor } : {}) }, payload: { reason: "verified change", name: "Updated" } });
    assert.equal((await patch("auditor-credential")).statusCode, 403);
    assert.equal((await patch("auditor-credential", "admin:owner")).statusCode, 403);
    assert.equal((await patch("moderator-credential")).statusCode, 403);
    assert.equal((await patch("unknown-credential")).statusCode, 403);
    assert.equal(writes.length, 0);
    assert.equal((await patch("owner-credential")).statusCode, 200);
    assert.equal((writes[0] as { actorId: string }).actorId, "admin:owner");
    const who = await http.inject({ url: "/v2/admin/session", headers: { "x-admin-token": "auditor-credential" } });
    assert.equal(who.statusCode, 200);
    assert.equal(who.json().data.actorId, "admin:auditor");
    assert.ok(!who.json().data.operations.includes("SPOT_EDIT"));
    assert.ok(!JSON.stringify(who.json()).includes("tokenSha256"));
    const dashboard = await http.inject({ url: "/v2/admin/dashboard", headers: { "x-admin-token": "moderator-credential" } });
    assert.equal(dashboard.statusCode, 200);
    assert.equal(dashboard.json().data.audits, undefined);
    const principal = authenticateAdmin("auditor-credential");
    assert.throws(() => assertAdminOperation(principal, "SPOT_CREATE"), /admin_permission_denied/u);
  } finally {
    await app.close();
    if (before === undefined) delete process.env.MINIAPP_ADMIN_CREDENTIALS;
    else process.env.MINIAPP_ADMIN_CREDENTIALS = before;
  }
});

test("a committed command keeps its receipt after Redis denial and retries cache work with the same key", async () => {
  const before = process.env.MINIAPP_ADMIN_CREDENTIALS;
  process.env.MINIAPP_ADMIN_CREDENTIALS = credentials;
  const repository = Object.create(PostgresMiniappRepository.prototype) as PostgresMiniappRepository;
  let commits = 0;
  let cacheFailure = true;
  const invalidations: string[] = [];
  const receipts = new Map<string, unknown>();
  repository.adminChangeSpotLifecycle = async input => {
    const previous = receipts.get(input.idempotencyKey);
    if (previous) return { ...(previous as object), receipt: { ...(previous as { receipt: object }).receipt, status: "REPLAYED" } } as never;
    ++commits;
    const result = { result: { status: "TEMPORARILY_CLOSED" }, readback: { status: "TEMPORARILY_CLOSED" }, receipt: { actorId: input.actorId, idempotencyKey: input.idempotencyKey, status: "COMMITTED" } };
    receipts.set(input.idempotencyKey, result);
    return result as never;
  };
  repository.adminPatchSpot = async input => ({ spot: { spotId: input.spotId, name: input.patch.name } }) as never;
  const service = { repository, cache: { deleteByPrefix: async (prefix: string) => {
    invalidations.push(prefix);
    if (cacheFailure) throw new Error("NOPERM this user has no permissions to run the 'scan' command");
  } } };
  class TestModule {}
  Module({ controllers: [AdminController, AdminPublicationController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
  const adapter = new FastifyAdapter({ logger: false });
  const app = await NestFactory.create(TestModule, adapter, { logger: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  try {
    await app.init(); const http = adapter.getInstance(); await http.ready();
    for (const action of ["suspend", "unpublish"]) {
      cacheFailure = true;
      const request = { method: "POST" as const, url: `/v2/admin/spots/spot:test/${action}`, headers: { "x-admin-token": "owner-credential", "idempotency-key": `same-${action}` }, payload: { reason: "confirmed operation", expectedRevision: 1 } };
      const failedCache = await http.inject(request);
      assert.equal(failedCache.statusCode, 201, "post-commit Redis permission denial is not an authorization denial");
      assert.equal(failedCache.json().data.receipt.status, "COMMITTED");
      assert.equal(failedCache.json().postCommit.cacheInvalidation, "FAILED");
      assert.match(failedCache.json().warnings.join(" "), /变更已提交/u);
      const committedCount = commits;
      cacheFailure = false;
      const replay = await http.inject(request);
      assert.equal(replay.statusCode, 201);
      assert.equal(replay.json().data.receipt.status, "REPLAYED");
      assert.equal(replay.json().data.receipt.idempotencyKey, `same-${action}`);
      assert.equal(replay.json().postCommit.cacheInvalidation, "COMPLETE");
      assert.equal(commits, committedCount, "cache recovery cannot duplicate the business effect");
    }
    cacheFailure = true;
    const patch = await http.inject({ method: "PATCH", url: "/v2/admin/spots/spot:test", headers: { "x-admin-token": "owner-credential" }, payload: { reason: "legacy non-idempotent edit", name: "Saved" } });
    assert.equal(patch.statusCode, 200);
    assert.equal(patch.json().data.spot.name, "Saved");
    assert.equal(patch.json().postCommit.cacheInvalidation, "FAILED");
    assert.deepEqual(invalidations.slice(-3).sort(), ["favorites:", "map:", "spot-overview:spot:test"], "try all affected caches even when one fails");
  } finally {
    await app.close();
    if (before === undefined) delete process.env.MINIAPP_ADMIN_CREDENTIALS;
    else process.env.MINIAPP_ADMIN_CREDENTIALS = before;
  }
});
