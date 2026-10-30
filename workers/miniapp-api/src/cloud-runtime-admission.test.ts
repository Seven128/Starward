import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { CloudPublicationRegistry } from "./cloud-publication-registry.ts";
import { MiniappService } from "./miniapp-service.ts";
import { OutboxWorkerRuntime } from "./outbox-worker.ts";
import { createTestRuntimeConfig, type ReleaseProfile } from "./runtime-config.ts";
import { DisabledRouteAdapter } from "./route-provider.ts";
import { DeterministicWeatherTestAdapter } from "./test-fixtures/deterministic-weather-adapter.ts";

const root = path.resolve("runtime-cloud-numeric-fixture");
const forbidden = /^Error: cloud_numeric_publication_requires_local$/u;
const reachedDependency = new Error("test_dependency_boundary_reached");

test("direct API construction rejects configured and injected numeric publications before consuming dependencies", async () => {
  for (const releaseProfile of ["TRIAL", "COMMERCIAL"] as const) {
    for (const source of ["configured", "injected"] as const) {
      const config = createTestRuntimeConfig({ releaseProfile, storageMode: "POSTGRES",
        ...(source === "configured" ? { cloudPublicationRoot: root } : {}) });
      const registry = source === "injected" ? new CloudPublicationRegistry(root) : undefined;
      let dependenciesRead = 0;
      try {
        assert.throws(() => new MiniappService({ config, ...(registry ? { cloudPublications: registry } : {}),
          get repository(): never { dependenciesRead++; throw reachedDependency; },
          weather: new DeterministicWeatherTestAdapter(), route: new DisabledRouteAdapter(),
        }), forbidden);
        assert.equal(dependenciesRead, 0, "rejection must precede repository/native publication setup");
      } finally { await registry?.close(); }
    }
  }
});

test("direct outbox construction rejects numeric publications before database or queue setup", () => {
  for (const releaseProfile of ["TRIAL", "COMMERCIAL"] as const) {
    const config = createTestRuntimeConfig({ releaseProfile, storageMode: "POSTGRES", cloudPublicationRoot: root });
    let dependenciesRead = 0;
    assert.throws(() => new OutboxWorkerRuntime({ runtimeConfig: config,
      get databaseUrl(): never { dependenciesRead++; throw reachedDependency; },
      redisUrl: "redis://localhost:6379/0",
    }), forbidden);
    assert.equal(dependenciesRead, 0, "rejection must occur before any Pool, Queue or Worker is created");
  }
});

test("LOCAL numeric roots and release profiles without numeric roots still reach their existing dependencies", () => {
  const allowed: Array<{ releaseProfile: ReleaseProfile; cloudPublicationRoot?: string }> = [
    { releaseProfile: "LOCAL", cloudPublicationRoot: root },
    { releaseProfile: "TRIAL" }, { releaseProfile: "COMMERCIAL" },
  ];
  for (const input of allowed) {
    const config = createTestRuntimeConfig({ ...input, storageMode: "POSTGRES" });
    assert.throws(() => new MiniappService({ config,
      get repository(): never { throw reachedDependency; },
      weather: new DeterministicWeatherTestAdapter(), route: new DisabledRouteAdapter(),
    }), error => error === reachedDependency);
    assert.throws(() => new OutboxWorkerRuntime({ runtimeConfig: config,
      get databaseUrl(): never { throw reachedDependency; },
      redisUrl: "redis://localhost:6379/0",
    }), error => error === reachedDependency);
  }
});
