import { createHash } from "node:crypto";
import {
  loadGaiaDr3BrightStarCatalog,
  positionGaiaDr3Catalog,
} from "@starward/astronomy-core";
import {
  normalizeOwnerPositions,
  type SkyCatalogProvider,
  type SkyCatalogSnapshot,
} from "./sky-scene-catalog-provider.ts";

export function createTestSkyCatalogProvider(): SkyCatalogProvider {
  const owner = loadGaiaDr3BrightStarCatalog();
  const entries = owner.entries.slice(0, 3).map((entry) => ({
    sourceId: entry.sourceId,
    gMagnitude: entry.gMagnitude,
    bpRp: entry.bpRp,
    raHours: entry.raHours,
    decDeg: entry.decDeg,
  }));
  const catalogHash = createHash("sha256")
    .update(JSON.stringify(entries))
    .digest("hex");
  const catalog: SkyCatalogSnapshot = {
    catalogVersion: "test-gaia-dr3-catalog-v1",
    catalogHash,
    magnitudeLimit: 5.5,
    source: {
      id: "test:gaia-dr3-catalog",
      kind: "TEST_FIXTURE",
      provider: "Starward deterministic test fixture",
      title: "Test-only Gaia-compatible star catalog",
      sourceUrl: "https://example.invalid/starward-test-catalog",
      license: "TEST_ONLY",
      licenseUrl: "https://example.invalid/starward-test-catalog/license",
      publishedAt: null,
      retrievedAt: "2026-01-01T00:00:00.000Z",
      validFrom: null,
      validTo: null,
      state: "FRESH",
      confidence: 1,
      precision: "Deterministic test fixture only",
      limitations: ["不可用于生产场景或用户展示"],
    },
    entries,
  };
  const selectedIds = new Set(entries.map((entry) => entry.sourceId));
  return {
    load: () => catalog,
    position: (input) =>
      normalizeOwnerPositions(
        positionGaiaDr3Catalog({
          at: input.at,
          latitude: input.latitude,
          longitude: input.longitude,
          elevationM: input.elevationM,
          magnitudeLimit: owner.magnitudeLimit,
          catalog: owner,
        }).filter((row) => selectedIds.has(row.sourceId)),
        input.catalog,
      ),
    cacheKey: () => `${catalog.catalogVersion}:${catalog.catalogHash}`,
  };
}
