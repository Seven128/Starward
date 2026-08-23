import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { MiniappService } from "./miniapp-service.ts";

test("explicit development fixture mode composes deterministic weather at the existing port", async () => {
  const prior = {
    storage: process.env.MINIAPP_STORAGE_MODE,
    acceptance: process.env.MINIAPP_ACCEPTANCE_MODE,
    fixture: process.env.MINIAPP_DEVELOPMENT_FIXTURE_MODE,
  };
  process.env.MINIAPP_STORAGE_MODE = "MEMORY_TEST";
  process.env.MINIAPP_ACCEPTANCE_MODE = "1";
  process.env.MINIAPP_DEVELOPMENT_FIXTURE_MODE = "1";

  let service: MiniappService | null = null;
  try {
    service = await MiniappService.createFromEnvironment();
    const context = (
      await service.resolveObservationContext({
        location: {
          kind: "FORMAL_SPOT",
          spotId: TEST_PUBLISHED_SPOT.spotId,
        },
        localDate: "2026-08-23",
      })
    ).data;
    const report = await service.getSky(
      TEST_PUBLISHED_SPOT.spotId,
      context.contextId,
    );
    assert.ok(
      report.sources.some(
        (source) =>
          source.kind === "TEST_FIXTURE" &&
          source.provider === "今晚去观星确定性测试天气",
      ),
    );
    assert.ok(
      report.sources
        .filter((source) => source.provider.includes("天气"))
        .every((source) => source.state === "SAMPLE_DATA"),
    );
  } finally {
    await service?.onModuleDestroy();
    for (const [name, value] of Object.entries({
      MINIAPP_STORAGE_MODE: prior.storage,
      MINIAPP_ACCEPTANCE_MODE: prior.acceptance,
      MINIAPP_DEVELOPMENT_FIXTURE_MODE: prior.fixture,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
