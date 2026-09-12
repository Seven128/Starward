import { createHash } from "node:crypto";
import { loadHipparcosBrightStarCatalog, positionHipparcosCatalog } from "@starward/astronomy-core";
import {
  normalizeOwnerPositions,
  type SkyCatalogProvider,
  type SkyCatalogSnapshot,
} from "./sky-scene-catalog-provider.ts";

export function createTestSkyCatalogProvider(): SkyCatalogProvider {
  const owner = loadHipparcosBrightStarCatalog();
  const entries = owner.rows.slice(0, 3).map((entry) => ({
    sourceId: entry.sourceId,
    objectRef: entry.sourceId,
    displayName: entry.properName,
    magnitude: entry.vMag,
    magnitudeBand: "V" as const,
    colorIndex: entry.bV,
    colorIndexBand: "B-V" as const,
    raHours: entry.raDeg / 15,
    decDeg: entry.decDeg,
  }));
  const catalogHash = createHash("sha256")
    .update(JSON.stringify(entries))
    .digest("hex");
  const catalog: SkyCatalogSnapshot = {
    catalogVersion: "test-gaia-dr3-catalog-v1",
    catalogHash,
    magnitudeLimit: 5.5,
    sources: [{
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
    }],
    entries,
  };
  const selectedIds = new Set(entries.map((entry) => entry.sourceId));
  return {
    load: () => catalog,
    position: (input) =>
      normalizeOwnerPositions(
        positionHipparcosCatalog({
          at: input.at,
          latitude: input.latitude,
          longitude: input.longitude,
          elevationM: input.elevationM,
          catalog: owner,
        }).filter((row) => selectedIds.has(row.sourceId)),
        input.catalog,
      ),
    cacheKey: () => `${catalog.catalogVersion}:${catalog.catalogHash}`,
  };
}
