import assert from "node:assert/strict";
import test from "node:test";
import {
  fastifyDeploymentOptions,
  loadHttpDeploymentConfig,
  loadReleaseMetadata,
} from "./release-metadata.ts";

const releaseEnvironment = {
  STARWARD_ENVIRONMENT: "staging",
  STARWARD_RELEASE_REVISION: "a".repeat(40),
  STARWARD_IMAGE_DIGEST: `sha256:${"b".repeat(64)}`,
  STARWARD_RELEASED_AT: "2026-08-26T12:00:00.000Z",
};

test("release metadata rejects unresolved or mutable remote identity", () => {
  assert.throws(
    () => loadReleaseMetadata({ ...releaseEnvironment, STARWARD_IMAGE_DIGEST: "latest" }),
    /STARWARD_IMAGE_DIGEST/u,
  );
  assert.throws(
    () => loadReleaseMetadata({ ...releaseEnvironment, STARWARD_RELEASE_REVISION: "main" }),
    /STARWARD_RELEASE_REVISION/u,
  );
  assert.throws(
    () => loadReleaseMetadata({ ...releaseEnvironment, STARWARD_RELEASED_AT: "secret-ref:release" }),
    /release_metadata_unresolved/u,
  );
});

test("remote HTTP config accepts only HTTPS origins and one exact trusted proxy address", () => {
  const release = loadReleaseMetadata(releaseEnvironment);
  const config = loadHttpDeploymentConfig(release, {
      MINIAPP_CORS_ORIGINS: "https://ops.example.cn,https://admin.example.cn",
      MINIAPP_TRUST_PROXY_CIDRS: "172.30.10.2/32",
    });
  assert.deepEqual(config, {
    origins: ["https://ops.example.cn", "https://admin.example.cn"],
    trustedProxyCidrs: ["172.30.10.2/32"],
  });
  assert.deepEqual(fastifyDeploymentOptions(config), {
    bodyLimit: 2_000_000,
    connectionTimeout: 10_000,
    requestTimeout: 15_000,
    handlerTimeout: 30_000,
    keepAliveTimeout: 10_000,
    maxRequestsPerSocket: 1_000,
    forceCloseConnections: "idle",
    trustProxy: ["172.30.10.2/32"],
  });
  assert.throws(
    () => loadHttpDeploymentConfig(release, {
      MINIAPP_CORS_ORIGINS: "http://ops.example.cn",
      MINIAPP_TRUST_PROXY_CIDRS: "172.30.10.2/32",
    }),
    /MINIAPP_CORS_ORIGINS/u,
  );
  assert.throws(
    () => loadHttpDeploymentConfig(release, {
      MINIAPP_CORS_ORIGINS: "https://ops.example.cn/path",
      MINIAPP_TRUST_PROXY_CIDRS: "172.30.10.2/32",
    }),
    /MINIAPP_CORS_ORIGINS/u,
  );
  assert.throws(
    () => loadHttpDeploymentConfig(release, {
      MINIAPP_CORS_ORIGINS: "https://ops.example.cn",
      MINIAPP_TRUST_PROXY_HOPS: "1",
    }),
    /MINIAPP_TRUST_PROXY_HOPS/u,
  );
  assert.throws(
    () => loadHttpDeploymentConfig(release, {
      MINIAPP_CORS_ORIGINS: "https://ops.example.cn",
      MINIAPP_TRUST_PROXY_CIDRS: "172.30.10.0\/29",
    }),
    /MINIAPP_TRUST_PROXY_CIDRS/u,
  );
});
