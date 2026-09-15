import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import {
  createReleaseEnvironmentFixture,
  releaseImageDigest,
} from "./test-support.mjs";
import { validateReleaseEnvironment } from "./validate-release-environment.mjs";

async function withFixture(overrides, assertion) {
  const current = await createReleaseEnvironmentFixture(overrides);
  try {
    await assertion(current.deployPath);
  } finally {
    await rm(current.root, { recursive: true, force: true });
  }
}

test("a release environment closes identity, credentials and least-privilege lanes", async () => {
  await withFixture({}, async (deployPath) => {
    const result = await validateReleaseEnvironment({ deployEnvPath: deployPath });
    assert.equal(result.status, "valid");
    assert.equal(result.environment, "staging");
    assert.equal(result.imageDigest, releaseImageDigest);
  });
});

test("remote release keeps QWeather as the selected primary provider", async () => {
  await withFixture(
    {
      api: {
        MINIAPP_WEATHER_PROVIDER: "OPEN_METEO_COMMERCIAL",
        OPEN_METEO_API_KEY: "commercial-open-meteo-key",
      },
    },
    async (deployPath) => {
      await assert.rejects(
        () => validateReleaseEnvironment({ deployEnvPath: deployPath }),
        /release_environment_mismatch:api:MINIAPP_WEATHER_PROVIDER/u,
      );
    },
  );
});

test("unresolved secret references fail closed without exposing the value", async () => {
  await withFixture({ api: { WECHAT_MINIAPP_APP_SECRET: "secret-ref:wechat" } }, async (deployPath) => {
    await assert.rejects(() => validateReleaseEnvironment({ deployEnvPath: deployPath }), /release_environment_unresolved:WECHAT_MINIAPP_APP_SECRET/u);
  });
});

test("worker cannot inherit provider or user-session secrets", async () => {
  await withFixture({ worker: { QWEATHER_PRIVATE_KEY_PEM: "forbidden-provider-key-material" } }, async (deployPath) => {
    await assert.rejects(() => validateReleaseEnvironment({ deployEnvPath: deployPath }), /release_environment_worker_secret_forbidden:QWEATHER_PRIVATE_KEY_PEM/u);
  });
});

test("database credentials must agree with the isolated Postgres owner", async () => {
  await withFixture({ postgres: { POSTGRES_PASSWORD: "different-database-password-24" } }, async (deployPath) => {
    await assert.rejects(() => validateReleaseEnvironment({ deployEnvPath: deployPath }), /release_environment_mismatch:DATABASE_URL:password/u);
  });
});

test("stable lane files cannot override the promoted release identity", async () => {
  await withFixture({ worker: { STARWARD_IMAGE_DIGEST: `sha256:${"c".repeat(64)}` } }, async (deployPath) => {
    await assert.rejects(() => validateReleaseEnvironment({ deployEnvPath: deployPath }), /release_environment_lane_identity_forbidden:worker:STARWARD_IMAGE_DIGEST/u);
  });
});

test("candidate digest must match the immutable image reference", async () => {
  await withFixture({ deploy: { STARWARD_IMAGE_DIGEST: `sha256:${"c".repeat(64)}` } }, async (deployPath) => {
    await assert.rejects(() => validateReleaseEnvironment({ deployEnvPath: deployPath }), /release_environment_mismatch:STARWARD_IMAGE_DIGEST/u);
  });
});

test("candidate image must come from the environment-owned repository", async () => {
  await withFixture({ deploy: { STARWARD_IMAGE_REF: `other.example/starward@${releaseImageDigest}` } }, async (deployPath) => {
    await assert.rejects(() => validateReleaseEnvironment({ deployEnvPath: deployPath }), /release_environment_mismatch:STARWARD_IMAGE_REF/u);
  });
});

test("operational paths must be absolute and independently owned", async () => {
  await withFixture({ deploy: { STARWARD_BACKUP_DIRECTORY: "relative/backups" } }, async (deployPath) => {
    await assert.rejects(() => validateReleaseEnvironment({ deployEnvPath: deployPath }), /release_environment_path_not_absolute:STARWARD_BACKUP_DIRECTORY/u);
  });
});

test("backup size is explicitly bounded", async () => {
  await withFixture({ deploy: { STARWARD_BACKUP_MAX_BYTES: "0" } }, async (deployPath) => {
    await assert.rejects(() => validateReleaseEnvironment({ deployEnvPath: deployPath }), /release_environment_invalid:STARWARD_BACKUP_MAX_BYTES/u);
  });
});

test("public rate limiting is explicit and bounded", async () => {
  await withFixture({ api: { MINIAPP_RATE_LIMIT_MAX: "0" } }, async (deployPath) => {
    await assert.rejects(
      () => validateReleaseEnvironment({ deployEnvPath: deployPath }),
      /release_environment_invalid:api:MINIAPP_RATE_LIMIT_MAX/u,
    );
  });
  await withFixture({ api: { MINIAPP_RATE_LIMIT_WINDOW_MS: "3600001" } }, async (deployPath) => {
    await assert.rejects(
      () => validateReleaseEnvironment({ deployEnvPath: deployPath }),
      /release_environment_invalid:api:MINIAPP_RATE_LIMIT_WINDOW_MS/u,
    );
  });
});

test("both environments accept QWeather alone and bounded actual forecast hours", async () => {
  for (const environment of ["staging", "production"]) {
    for (const hours of ["1", "24", "48", "72", "240"]) {
      await withFixture({ environment, api: { QWEATHER_FORECAST_HOURS: hours } }, async deployPath => {
        assert.equal((await validateReleaseEnvironment({ deployEnvPath: deployPath })).status, "valid");
      });
    }
  }
  for (const hours of ["0", "241", "1.5", "invalid"]) {
    await withFixture({ api: { QWEATHER_FORECAST_HOURS: hours } }, async deployPath => {
      await assert.rejects(() => validateReleaseEnvironment({ deployEnvPath: deployPath }), /release_environment_invalid:api:QWEATHER_FORECAST_HOURS/);
    });
  }
});
