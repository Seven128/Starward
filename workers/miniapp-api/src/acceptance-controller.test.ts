import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { AcceptanceController } from "./acceptance.controller.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("acceptance reset is token-gated and clears explicit in-memory state", async () => {
  const priorMode = process.env.MINIAPP_ACCEPTANCE_MODE;
  const priorToken = process.env.MINIAPP_ACCEPTANCE_TOKEN;
  process.env.MINIAPP_ACCEPTANCE_MODE = "1";
  process.env.MINIAPP_ACCEPTANCE_TOKEN = "acceptance-test-token-at-least-20";
  const service = createTestMiniappService();
  const controller = new AcceptanceController(service);
  try {
    const principal = (
      await service.login({ code: "local:acceptance-installation" })
    ).data;
    await service.repository.setFavorite(
      principal.userId,
      TEST_PUBLISHED_SPOT.spotId,
      true,
      "acceptance:favorite:seed",
    );
    assert.deepEqual(await service.repository.listFavoriteIds(principal.userId), [
      TEST_PUBLISHED_SPOT.spotId,
    ]);
    await assert.rejects(
      controller.reset("wrong-token-at-least-twenty"),
      /acceptance_control_unavailable/u,
    );
    assert.deepEqual(await controller.reset(process.env.MINIAPP_ACCEPTANCE_TOKEN), {
      status: "reset",
      storage: "memory",
    });
    assert.deepEqual(
      await service.repository.listFavoriteIds(principal.userId),
      [],
    );
  } finally {
    await service.onModuleDestroy();
    if (priorMode === undefined) delete process.env.MINIAPP_ACCEPTANCE_MODE;
    else process.env.MINIAPP_ACCEPTANCE_MODE = priorMode;
    if (priorToken === undefined) delete process.env.MINIAPP_ACCEPTANCE_TOKEN;
    else process.env.MINIAPP_ACCEPTANCE_TOKEN = priorToken;
  }
});
