import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import {
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";
import { AppModule } from "./app.module.ts";
import { AdminOperationsController } from "./admin-operations.controller.ts";
import { AdminPublicationController } from "./admin-publication.controller.ts";
import { assertAdminOperation } from "./admin-auth.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";

const METHOD_NAMES = new Map<number, string>([
  [RequestMethod.GET, "GET"],
  [RequestMethod.POST, "POST"],
]);

function routes() {
  return [AdminOperationsController, AdminPublicationController]
    .flatMap((controller) => {
      const root = Reflect.getMetadata(PATH_METADATA, controller) as string;
      const prototype = controller.prototype as unknown as Record<
        string,
        Function
      >;
      return Object.getOwnPropertyNames(prototype).flatMap((methodName) => {
        const handler = prototype[methodName]!;
        const path = Reflect.getMetadata(PATH_METADATA, handler) as
          | string
          | undefined;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          | number
          | undefined;
        if (path === undefined || method === undefined) return [];
        return [`${METHOD_NAMES.get(method)} /${root}/${path}`];
      });
    })
    .sort();
}

test("Operations controller exposes every required high-impact endpoint", () => {
  const actual = routes();
  for (const expected of [
    "GET /v2/admin/moderation/queue",
    "GET /v2/admin/moderation/cases/:caseId",
    "POST /v2/admin/moderation/cases/:caseId/request-changes",
    "POST /v2/admin/moderation/cases/:caseId/media-decisions",
    "POST /v2/admin/moderation/cases/:caseId/merge-preview",
    "POST /v2/admin/spots/:spotId/publication-assessments",
    "POST /v2/admin/spots/:spotId/unpublish",
    "POST /v2/admin/spots/:spotId/replacement-preview",
    "POST /v2/admin/spots/:spotId/replace",
    "POST /v2/admin/spots/:spotId/retire",
    "GET /v2/admin/receipts/:receiptId",
  ])
    assert.ok(actual.includes(expected), `missing ${expected}`);
});

test("Operations controller is registered in the production module", () => {
  const controllers = Reflect.getMetadata(
    MODULE_METADATA.CONTROLLERS,
    AppModule,
  ) as readonly Function[];
  assert.ok(controllers.includes(AdminOperationsController));
  assert.ok(controllers.includes(AdminPublicationController));
});

test("admin RBAC fails closed in production and denies unauthorized operations", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRbac = process.env.MINIAPP_ADMIN_RBAC;
  try {
    process.env.NODE_ENV = "test";
    delete process.env.MINIAPP_ADMIN_RBAC;
    assert.doesNotThrow(() => assertAdminOperation("admin:local", "PUBLISH"));

    process.env.MINIAPP_ADMIN_RBAC = JSON.stringify({
      "admin:review": ["MODERATOR"],
    });
    assert.doesNotThrow(() =>
      assertAdminOperation("admin:review", "MERGE_PREVIEW"),
    );
    assert.throws(
      () => assertAdminOperation("admin:review", "PUBLISH"),
      /admin_permission_denied/u,
    );

    delete process.env.MINIAPP_ADMIN_RBAC;
    process.env.NODE_ENV = "production";
    assert.throws(
      () => assertAdminOperation("admin:local", "QUEUE_READ"),
      /admin_rbac_disabled/u,
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousRbac === undefined) delete process.env.MINIAPP_ADMIN_RBAC;
    else process.env.MINIAPP_ADMIN_RBAC = previousRbac;
  }
});

test("request-changes forwards actor, expected revision and idempotency key", async () => {
  const calls: unknown[] = [];
  const repository = Object.create(
    PostgresMiniappRepository.prototype,
  ) as PostgresMiniappRepository;
  repository.adminRequestContributionChanges = async (input) => {
    calls.push(input);
    return {
      result: {} as never,
      readback: {} as never,
      receipt: {} as never,
    };
  };
  const controller = new AdminOperationsController({
    repository,
    cache: { deleteByPrefix: async () => undefined },
  } as never);
  const previousToken = process.env.MINIAPP_ADMIN_TOKEN;
  const previousRbac = process.env.MINIAPP_ADMIN_RBAC;
  try {
    process.env.MINIAPP_ADMIN_TOKEN = "test-token";
    delete process.env.MINIAPP_ADMIN_RBAC;
    await controller.requestChanges(
      "case:one",
      { reason: "补充道路证据", expectedRevision: 7 },
      "operation:one",
      "test-token",
      "admin:local",
    );
  } finally {
    if (previousToken === undefined) delete process.env.MINIAPP_ADMIN_TOKEN;
    else process.env.MINIAPP_ADMIN_TOKEN = previousToken;
    if (previousRbac === undefined) delete process.env.MINIAPP_ADMIN_RBAC;
    else process.env.MINIAPP_ADMIN_RBAC = previousRbac;
  }
  assert.deepEqual(calls, [
    {
      caseId: "case:one",
      reason: "补充道路证据",
      expectedRevision: 7,
      actorId: "admin:local",
      requestId: calls.length === 1 ? (calls[0] as { requestId: string }).requestId : "",
      idempotencyKey: "operation:one",
    },
  ]);
});
