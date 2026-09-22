import { assertSkyScene, STELLAR_SCENE_FORMAT, type SkyScene, type DeepSkyScene, type SpotSummary } from "@starward/miniapp-contracts";
import type { SkyCatalogProvider } from "./sky-scene-catalog-provider.ts";
import { buildDeepSkyScene } from "./deep-sky-scene-provider.ts";
export { createBsc5pSkyCatalogProvider, type SkyCatalogFrameInput, type SkyCatalogProvider, type SkyCatalogSnapshot } from "./sky-scene-catalog-provider.ts";
export { createTestSkyCatalogProvider } from "./sky-scene-test-provider.ts";

function unavailableScene(hourlyAt: readonly string[], reason: string, deepSky?: DeepSkyScene): SkyScene {
  return { format: STELLAR_SCENE_FORMAT, state: "UNAVAILABLE", observer: null, catalog: null,
    frames: hourlyAt.map(at => ({ at, state: "UNAVAILABLE", geometry: null })),
    unavailableReason: reason, ...(deepSky ? { deepSky } : {}) };
}

export function buildSkyScene(input: {
  provider: SkyCatalogProvider; hourlyAt: readonly string[]; spot: Pick<SpotSummary, "wgs84" | "altitudeM">;
}): SkyScene {
  if (!input.hourlyAt.length) return unavailableScene(input.hourlyAt, "NO_TIME_SLICES");
  const deepSky = buildDeepSkyScene(input.hourlyAt, input.spot);
  try {
    const catalog = input.provider.load();
    const observer = { latitude: input.spot.wgs84.latitude, longitude: input.spot.wgs84.longitude, elevationM: input.spot.altitudeM ?? 0 };
    const scene: SkyScene = { format: STELLAR_SCENE_FORMAT, state: "AVAILABLE", observer, catalog,
      frames: input.hourlyAt.map(at => ({ at, state: "AVAILABLE", geometry: input.provider.frame({ ...observer, at: new Date(at), catalog }) })),
      unavailableReason: null, deepSky };
    assertSkyScene(scene, input.hourlyAt);
    return scene;
  } catch {
    return unavailableScene(input.hourlyAt, "STELLAR_SCENE_UNAVAILABLE", deepSky);
  }
}
