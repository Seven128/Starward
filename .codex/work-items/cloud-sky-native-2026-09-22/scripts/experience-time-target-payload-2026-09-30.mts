import { writeFile } from "node:fs/promises";
import { createTestMiniappService } from "../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts";
import { createBsc5pSkyCatalogProvider } from "../../../../workers/miniapp-api/src/sky-scene-catalog.ts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { RESPONSE_CACHE_LIMITS } from "../../../../apps/wechat-miniapp/src/services/response-cache.ts";

const records = [];
for (const catalogue of ["test-fixture", "bsc5p-bright-stars.v3"]) {
  const service = createTestMiniappService(catalogue === "test-fixture" ? {} : {
    skyCatalog: createBsc5pSkyCatalogProvider("bsc5p-bright-stars.v3"),
  });
  try {
    const context = (await service.resolveObservationContext({
      location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId },
      localDate: "2026-08-06", selectedAt: "2026-08-06T13:00:00.000Z",
    })).data;
    const report = await service.getSky(TEST_PUBLISHED_SPOT.spotId, context.contextId, undefined,
      catalogue === "test-fixture" ? "bsc5p-bright-stars.v2" : "bsc5p-bright-stars.v3");
    const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");
    const targets = await service.getSkyTargetInstant(TEST_PUBLISHED_SPOT.spotId, context.contextId, "2026-08-06T13:00:24.087Z");
    records.push({ catalogue, reportBytes: bytes(report), dataBytes: bytes(report.data),
      actualCatalogVersion: report.data.skyScene.catalog?.catalogVersion,
      modelBytes: bytes(report.data.timeModel), withoutModelBytes: bytes({ ...report.data, timeModel: null }),
      fieldBytes: Object.fromEntries(Object.entries(report.data).map(([key, value]) => [key, bytes(value)])),
      fineTargetBytes: bytes(targets), targetTypes: targets.data.targets.map(target => target.type),
      existingPersistedItemLimit: RESPONSE_CACHE_LIMITS.persistedItemBytes,
      scope: "local deterministic weather, one meteor date; bytes do not establish target memory or cost" });
  } finally { await service.onModuleDestroy(); }
}
await writeFile(new URL("../evidence/experience-time-target-payload-2026-09-30.json", import.meta.url), JSON.stringify(records, null, 2) + "\n");
process.stdout.write(JSON.stringify(records) + "\n");
