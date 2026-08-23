import "reflect-metadata";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { MiniappController } from "./controller.ts";

interface OperationManifest {
  basePath: string;
  operations: Array<{ id: string; method: string; path: string }>;
}

const manifest = JSON.parse(
  await readFile(
    new URL(
      "../../../packages/miniapp-contracts/api/miniapp.operations.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as OperationManifest;

const METHOD_NAMES = new Map<number, string>([
  [RequestMethod.GET, "GET"],
  [RequestMethod.POST, "POST"],
  [RequestMethod.PUT, "PUT"],
  [RequestMethod.DELETE, "DELETE"],
  [RequestMethod.PATCH, "PATCH"],
]);

function normalizePath(path: string): string {
  return `/${path}`
    .replace(/\/+/gu, "/")
    .replace(/\/?:[^/]+/gu, "/{}")
    .replace(/\{[^}]+\}/gu, "{}")
    .replace(/\/$/u, "");
}

function controllerRoutes(controller: Function) {
  const root = Reflect.getMetadata(PATH_METADATA, controller) as string;
  const routes: string[] = [];
  for (const methodName of Object.getOwnPropertyNames(controller.prototype)) {
    if (methodName === "constructor") continue;
    const handler = controller.prototype[methodName] as Function;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as
      | string
      | undefined;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as
      | number
      | undefined;
    if (path === undefined || method === undefined) continue;
    const methodLabel = METHOD_NAMES.get(method);
    assert.ok(methodLabel, `unsupported Nest request method on ${methodName}`);
    routes.push(`${methodLabel} ${normalizePath(`${root}/${path}`)}`);
  }
  return routes.sort();
}

test("generated client operation manifest exactly matches the public Nest controller", () => {
  const expected = manifest.operations
    .map(
      (operation) =>
        `${operation.method} ${normalizePath(`${manifest.basePath}/${operation.path}`)}`,
    )
    .sort();
  const actual = controllerRoutes(MiniappController);
  assert.deepEqual(actual, expected);
  assert.equal(new Set(expected).size, expected.length, "duplicate API route");
  assert.equal(
    new Set(manifest.operations.map((operation) => operation.id)).size,
    manifest.operations.length,
    "duplicate operation id",
  );
});
