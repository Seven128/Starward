import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { MiniappApiOperationId, MiniappApiResponse } from "@starward/miniapp-contracts";

interface Operation {
  id: string;
  method: string;
  path: string;
  responseEnvelope?: boolean;
}
const manifest = JSON.parse(readFileSync(new URL(
  "../../../../packages/miniapp-contracts/api/miniapp.operations.json", import.meta.url,
), "utf8")) as { basePath: string; operations: Operation[] };

export function publicOperation(id: string) {
  const operation = manifest.operations.find(value => value.id === id);
  assert.ok(operation, `missing public operation ${id}`);
  return operation;
}

/** Interpret the real HTTP JSON according to the SDK's declared wire shape.
 * A false envelope declaration therefore cannot pass with an empty/old result. */
export function declaredPublicJson<K extends MiniappApiOperationId>(id: K, response: { json(): unknown }): MiniappApiResponse<K>;
export function declaredPublicJson(id: string, response: { json(): unknown }): unknown;
export function declaredPublicJson(id: string, response: { json(): unknown }): unknown {
  const operation = publicOperation(id), body = response.json() as Record<string, unknown>;
  return operation.responseEnvelope === false ? body : body.data;
}

export function publicOperationPath(id: string, parameters: Readonly<Record<string, string | number>> = {}) {
  const operation = publicOperation(id);
  return manifest.basePath + operation.path.replace(/\{([^}]+)\}/gu, (_, name: string) => {
    assert.ok(Object.hasOwn(parameters, name), `missing public parameter ${name}`);
    return encodeURIComponent(parameters[name]!);
  });
}

export function assertPublicBinary(id: string, response: { rawPayload: Buffer; headers: Record<string, unknown> },
  expected: { bytes: number; sha256: string }, digest: (value: Buffer) => string) {
  assert.equal(publicOperation(id).responseEnvelope, false, `binary operation ${id} must not declare ApiEnvelope`);
  assert.equal(response.rawPayload.length, expected.bytes);
  assert.equal(digest(response.rawPayload), expected.sha256);
  assert.match(String(response.headers["content-type"]), /^image\/(?:jpeg|png)(?:;|$)/u);
}
