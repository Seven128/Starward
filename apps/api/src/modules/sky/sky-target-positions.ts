import type { SkyPosition, SkyQuery } from "../../../../../packages/contracts/src/sky";
import { loadHipparcosBrightStarCatalog, positionHipparcosCatalog } from "../../../../../packages/astronomy-core/src/hipparcos-catalog";
import { loadDeepSkyCatalog, positionDeepSkyCatalog } from "../../../../../packages/astronomy-core/src/deep-sky-catalog";
import { positionMilkyWayCoreDirection } from "../../../../../packages/astronomy-core/src/milky-way-direction";

type ObserverInstant = Pick<SkyQuery, "latitude" | "longitude" | "elevationM"> & { at: Date };
const namedStars = {
  sirius: { sourceId: "HIP:32349", name: "天狼星", properName: "Sirius" },
  vega: { sourceId: "HIP:91262", name: "织女星", properName: "Vega" },
  antares: { sourceId: "HIP:80763", name: "心宿二", properName: "Antares" },
} as const;

/** Product target aliases are distinct from the anonymous Gaia scene rows. */
export function createSkyTargetProjection(target: SkyQuery["target"]): (input: ObserverInstant) => SkyPosition {
  if (target === "milky-way-core") {
    return input => ({
      id: target, sourceId: "sagittarius-a-j2000-direction-proxy", name: "银河核心方向",
      kind: "milky-way-core", magnitude: null, ...positionMilkyWayCoreDirection(input),
    });
  }
  if (target === "m31") {
    const catalog = loadDeepSkyCatalog();
    const row = catalog.rows.find(item => item.objectRef === "M:31");
    if (!row) throw new Error("astronomy_target_catalog_identity_missing:M:31");
    const selected = { ...catalog, rows: [row] };
    return input => {
      const position = positionDeepSkyCatalog({ ...input, catalog: selected })[0]!;
      return { id: target, sourceId: row.objectRef, name: "仙女座星系", kind: "deep-sky", magnitude: row.vMag,
        altitudeDeg: position.altitudeDeg, azimuthDeg: position.azimuthDeg,
        visible: position.visible, obstructed: null };
    };
  }
  const identity = namedStars[target];
  const catalog = loadHipparcosBrightStarCatalog();
  const row = catalog.rows.find(item => item.sourceId === identity.sourceId);
  if (!row || row.properName !== identity.properName)
    throw new Error(`astronomy_target_catalog_identity_missing:${identity.sourceId}`);
  const selected = { ...catalog, rows: [row] };
  return input => {
    const position = positionHipparcosCatalog({ ...input, catalog: selected })[0]!;
    return { id: target, sourceId: row.sourceId, name: identity.name, kind: "star", magnitude: row.vMag,
      altitudeDeg: position.altitudeDeg, azimuthDeg: position.azimuthDeg,
      visible: position.visible, obstructed: position.obstructed };
  };
}
