import {
  assertSkyScene,
  SKY_SCENE_MAX_CATALOG_ENTRIES,
  SKY_SCENE_MAX_SERIALIZED_BYTES,
  type SkyScene,
  type SkySceneFrame,
  type SkyScenePoint,
  type SpotSummary,
} from "@starward/miniapp-contracts";
import {
  normalizeScenePositions,
  validSkyCatalogSnapshot,
  type SkyCatalogEntry,
  type SkyCatalogProvider,
  type SkyCatalogSnapshot,
} from "./sky-scene-catalog-provider.ts";

export {
  createGaiaDr3SkyCatalogProvider,
  type SkyCatalogEntry,
  type SkyCatalogPosition,
  type SkyCatalogPositionInput,
  type SkyCatalogProvider,
  type SkyCatalogSnapshot,
} from "./sky-scene-catalog-provider.ts";
export { createTestSkyCatalogProvider } from "./sky-scene-test-provider.ts";

function unavailableScene(
  hourlyAt: readonly string[],
  reason: string,
): SkyScene {
  return {
    state: "UNAVAILABLE",
    catalog: null,
    frames: hourlyAt.map<SkySceneFrame>((at) => ({
      at,
      state: "UNAVAILABLE",
      points: null,
    })),
    unavailableReason: reason,
  };
}

function sourceIdToIndex(entries: readonly SkyCatalogEntry[]): Map<string, number> {
  return new Map(entries.map((entry, index) => [entry.sourceId, index] as const));
}

function buildFrames(
  provider: SkyCatalogProvider,
  catalog: SkyCatalogSnapshot,
  hourlyAt: readonly string[],
  spot: Pick<SpotSummary, "wgs84" | "altitudeM">,
): SkySceneFrame[] | null {
  const indexBySourceId = sourceIdToIndex(catalog.entries);
  const frames: SkySceneFrame[] = [];
  for (const at of hourlyAt) {
    if (typeof at !== "string" || !Number.isFinite(Date.parse(at))) return null;
    const projected = normalizeScenePositions(
      provider.position({
        at: new Date(at),
        latitude: spot.wgs84.latitude,
        longitude: spot.wgs84.longitude,
        elevationM: spot.altitudeM ?? 0,
        catalog,
      }),
      catalog,
    );
    const seen = new Set<number>();
    const points: SkyScenePoint[] = [];
    for (const row of projected) {
      const catalogIndex = indexBySourceId.get(row.sourceId);
      if (catalogIndex === undefined || seen.has(catalogIndex)) return null;
      seen.add(catalogIndex);
      points.push([catalogIndex, row.azimuthDeg, row.altitudeDeg]);
    }
    frames.push({ at, state: "AVAILABLE", points });
  }
  return frames;
}

export function buildSkyScene(input: {
  provider: SkyCatalogProvider;
  hourlyAt: readonly string[];
  spot: Pick<SpotSummary, "wgs84" | "altitudeM">;
}): SkyScene {
  if (input.hourlyAt.length === 0)
    return unavailableScene(input.hourlyAt, "NO_TIME_SLICES");
  let catalog: SkyCatalogSnapshot;
  try {
    catalog = input.provider.load();
  } catch {
    return unavailableScene(input.hourlyAt, "CATALOG_UNAVAILABLE");
  }
  if (
    Array.isArray(catalog?.entries) &&
    catalog.entries.length > SKY_SCENE_MAX_CATALOG_ENTRIES
  )
    return unavailableScene(input.hourlyAt, "CATALOG_LIMIT_INVALID");
  if (!validSkyCatalogSnapshot(catalog))
    return unavailableScene(input.hourlyAt, "CATALOG_INVALID");
  let frames: SkySceneFrame[] | null;
  try {
    frames = buildFrames(input.provider, catalog, input.hourlyAt, input.spot);
  } catch {
    return unavailableScene(input.hourlyAt, "SCENE_PROJECTION_UNAVAILABLE");
  }
  if (!frames)
    return unavailableScene(input.hourlyAt, "SCENE_PROJECTION_INVALID");
  const scene: SkyScene = {
    state: "AVAILABLE",
    catalog: {
      catalogVersion: catalog.catalogVersion,
      catalogHash: catalog.catalogHash,
      magnitudeLimit: catalog.magnitudeLimit,
      source: catalog.source,
      entries: catalog.entries.map(({ sourceId, gMagnitude, bpRp }) => ({
        sourceId,
        gMagnitude,
        bpRp,
      })),
    },
    frames,
    unavailableReason: null,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(scene)).byteLength;
  if (bytes >= SKY_SCENE_MAX_SERIALIZED_BYTES)
    return unavailableScene(input.hourlyAt, "SCENE_SERIALIZED_SIZE_LIMIT");
  try {
    assertSkyScene(scene, input.hourlyAt);
    return scene;
  } catch {
    return unavailableScene(input.hourlyAt, "SCENE_CONTRACT_INVALID");
  }
}
