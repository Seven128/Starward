import { mock } from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./create-test-service.ts";

// Executed only by sky-time-test-support in an isolated process. The real report
// owner supplies geometry; the existing public test spot, clock and weather
// adapter supply controlled inputs. No device/account capture or network input.
mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-30T13:55:00.000Z") });
const service = createTestMiniappService();
try {
  const prior = await service.resolveObservationContext({
    location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
    localDate: "2026-09-30",
    selectedAt: "2026-09-30T14:00:00.000Z",
  });
  const source = await service.getSky(TEST_PUBLISHED_SPOT.spotId, prior.data.contextId,
    null, "bsc5p-bright-stars.v3");
  process.stdout.write(JSON.stringify({ prior, source }));
} finally {
  try { await service.onModuleDestroy(); }
  finally { mock.timers.reset(); }
}
