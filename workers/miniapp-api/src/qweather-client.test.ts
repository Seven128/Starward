import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import test from "node:test";
import { qweatherJwt } from "./qweather-client.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";

test("QWeather JWT signs the official developer issuer and distinct project subject", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const config = createTestRuntimeConfig({ qweather: {
    credentialId: "credential-test", developerId: "Q12345ABCD", projectId: "project-test",
    privateKeyPem: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
  } });
  const [header, payload, signature] = qweatherJwt(config).split(".") as [string, string, string];
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url").toString()), { alg: "EdDSA", kid: "credential-test" });
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  assert.equal(claims.iss, "Q12345ABCD");
  assert.equal(claims.sub, "project-test");
  assert.ok(claims.iat <= Date.now() / 1000 && claims.exp > Date.now() / 1000);
  assert.equal(verify(null, Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, "base64url")), true);
  assert.throws(() => qweatherJwt({ ...config, qweather: { ...config.qweather, developerId: null } }), /qweather_credentials_required/u);
});
