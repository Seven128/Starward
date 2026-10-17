import { assertSkyScene, STELLAR_SCENE_FORMAT } from "@starward/miniapp-contracts";
import { buildDeepSkyScene } from "./deep-sky-scene-provider.js";
export { createBsc5pSkyCatalogProvider } from "./sky-scene-catalog-provider.js";
export { createTestSkyCatalogProvider } from "./sky-scene-test-provider.js";
function unavailableScene(hourlyAt, reason, deepSky) {
    return { format: STELLAR_SCENE_FORMAT, state: "UNAVAILABLE", observer: null, catalog: null,
        frames: hourlyAt.map(at => ({ at, state: "UNAVAILABLE", geometry: null })),
        unavailableReason: reason, ...(deepSky ? { deepSky } : {}) };
}
export function buildSkyScene(input) {
    if (!input.hourlyAt.length)
        return unavailableScene(input.hourlyAt, "NO_TIME_SLICES");
    const deepSky = buildDeepSkyScene(input.hourlyAt, input.spot, input.deepSkyCatalogVersion);
    try {
        const catalog = input.provider.load();
        const observer = { latitude: input.spot.wgs84.latitude, longitude: input.spot.wgs84.longitude, elevationM: input.spot.altitudeM ?? 0 };
        const scene = { format: STELLAR_SCENE_FORMAT, state: "AVAILABLE", observer, catalog,
            frames: input.hourlyAt.map(at => ({ at, state: "AVAILABLE", geometry: input.provider.frame({ ...observer, at: new Date(at), catalog }) })),
            unavailableReason: null, deepSky };
        assertSkyScene(scene, input.hourlyAt);
        return scene;
    }
    catch {
        return unavailableScene(input.hourlyAt, "STELLAR_SCENE_UNAVAILABLE", deepSky);
    }
}
//# sourceMappingURL=sky-scene-catalog.js.map