import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createSkyOssClient, SKY_OSS_REQUEST_TIMEOUT } from "./sky-oss-client.mjs";
import { ossFixtureCredentials } from "./sky-oss-test-oracle.mjs";

const target = { bucket: "starward-local-fixture", region: "oss-cn-hangzhou" };

test("production SDK configuration fixes HTTPS, V4, no implicit retry and owned agents without exposing credentials", async () => {
  let options;
  const client = createSkyOssClient({ ...target, credentials: ossFixtureCredentials }, { sdkFactory: input => {
    options = input;
    return { head: async () => ({ res: { status: 200, headers: {} } }) };
  } });
  try {
    assert.equal(options.endpoint, "https://oss-cn-hangzhou.aliyuncs.com");
    assert.equal(options.secure, true); assert.equal(options.authorizationV4, true); assert.equal(options.retryMax, 0);
    assert.equal(options.timeout, SKY_OSS_REQUEST_TIMEOUT); assert.equal(options.agent.maxSockets, 1); assert.equal(options.httpsAgent.maxSockets, 1);
    assert.ok(!Object.hasOwn(client, "credentials")); assert.ok(!Object.hasOwn(client, "sdk"));
  } finally { client.dispose(); }
  await assert.rejects(client.head("v2/sky/fixture"), /sky_oss_aborted/u);
});

test("invalid OSS target, credentials and pre-cancellation allocate no usable SDK", () => {
  for (const region of ["https://attacker.invalid", "oss-cn-hangzhou.aliyuncs.com", "oss-cn-hangzhou/evil"]) {
    assert.throws(() => createSkyOssClient({ ...target, region, credentials: ossFixtureCredentials }), /target_invalid/u);
  }
  for (const bucket of ["ab", "Bucket", "evil/target", "-invalid", "invalid-"]) {
    assert.throws(() => createSkyOssClient({ ...target, bucket, credentials: ossFixtureCredentials }), /target_invalid/u);
  }
  assert.throws(() => createSkyOssClient({ ...target, credentials: {} }), /credentials_missing/u);
  const controller = new AbortController(); controller.abort();
  assert.throws(() => createSkyOssClient({ ...target, credentials: ossFixtureCredentials, signal: controller.signal }), /aborted/u);
});

test("oversized SDK streams destroy the owned body, report a bounded failure and remain disposable", async () => {
  const stream = Readable.from([Buffer.alloc(2), Buffer.alloc(4)]);
  const client = createSkyOssClient({ ...target, credentials: ossFixtureCredentials }, { sdkFactory: () => ({
    getStream: async () => ({ stream, res: { status: 200, headers: { "content-length": "6" } } }),
  }) });
  try {
    await assert.rejects(client.get("v2/sky/fixture", 3), /body_too_large/u); assert.equal(stream.destroyed, true);
  } finally { client.dispose(); }
});

test("invalid SDK stream responses destroy a provided body even before iteration", async () => {
  const stream = Readable.from([Buffer.alloc(2)]);
  const client = createSkyOssClient({ ...target, credentials: ossFixtureCredentials }, { sdkFactory: () => ({
    getStream: async () => ({ stream, res: { status: 200 } }),
  }) });
  try { await assert.rejects(client.get("v2/sky/fixture", 2), /response_invalid/u); assert.equal(stream.destroyed, true); }
  finally { client.dispose(); }
});
