import type { SkyArtworkRegistration, SkyArtworkView } from "./sky-artwork-registration";
import type { SkyRenderSurface, SkyHipsMeshLevel, SkyHipsSourceGroup } from "./sky-render-surface";
import type { SkyReadyImageFrame, SkyReadyImageResult } from "./sky-ready-presentation";
import type { SkyArtworkLevels, SkyArtworkLevelSurface } from "./sky-artwork-level-composition";

/** One transition adapter for individually composited registered artwork.
 * Grouped same-source levels use their own composition before this envelope;
 * individual LOD alpha must not be multiplied into an additive double draw. */
export function drawSkyReadyArtwork(surface: SkyRenderSurface, image: object,
  registration: SkyArtworkRegistration, view: SkyArtworkView, target: number, tint: string,
  composite?: Parameters<SkyRenderSurface["artwork"]>[5],
  ready?: SkyReadyImageFrame): SkyReadyImageResult | "UNAVAILABLE" {
  if (!Number.isFinite(target) || target <= 0) return "HIDDEN";
  if (!ready) return surface.artwork(image, registration, view, target, tint, composite) ? "PAINTED" : "FAILED";
  // Older software/no-reveal consumers need no new capability. The real GPU
  // renderer requires and supplies this preparation path, without draw credit.
  if (!surface.prepareArtwork) return "UNAVAILABLE";
  return ready.draw(image, target,
    () => surface.prepareArtwork!(image, registration, view),
    opacity => surface.artwork(image, registration, view, opacity, tint, composite));
}

/** Exact same-source fields retain one compositor and its real draw receipt.
 * Display clocks are resolved after preparation; independent LOD source-over
 * passes would double the source and withdraw the parent at the wrong time. */
export function drawSkyReadyArtworkLevels(surface: SkyArtworkLevelSurface, levels: SkyArtworkLevels,
  view: SkyArtworkView, target: number, ready?: SkyReadyImageFrame) {
  if (!ready) return surface.artworkLevels(levels, view, target);
  let coarse: ReturnType<SkyReadyImageFrame["image"]> | undefined;
  let fine: ReturnType<SkyReadyImageFrame["image"]> | undefined;
  const draw = surface.artworkLevels(levels, view, target, eligible => {
    coarse = eligible.coarse && levels.coarse ? ready.image(levels.coarse.image) : undefined;
    fine = eligible.fine && levels.fine ? ready.image(levels.fine.image) : undefined;
    return { coarse: coarse?.progress ?? 0, fine: fine?.progress ?? 0 };
  });
  if (draw.coarsePrepared) coarse?.accept();
  if (draw.finePrepared) fine?.accept();
  return draw;
}

/** Curved tiles share only the readiness clock. Their original mesh/alpha and
 * same-source replacement policy remain with the mesh compositor. */
export function drawSkyReadyMesh(surface: SkyRenderSurface, image: object,
  triangles: readonly number[], view: SkyArtworkView, target: number,
  group?: SkyHipsSourceGroup, ready?: SkyReadyImageFrame): SkyReadyImageResult | "UNAVAILABLE" {
  if (!Number.isFinite(target) || target <= 0) return "HIDDEN";
  if (!ready) return surface.skyImageMesh(image, triangles, view, target, group) ? "PAINTED" : "FAILED";
  if (!surface.prepareSkyImageMesh) return "UNAVAILABLE";
  return ready.draw(image, target, () => surface.prepareSkyImageMesh!(image, triangles, view),
    opacity => surface.skyImageMesh(image, triangles, view, opacity, group));
}

export function drawSkyReadyMeshLevels(surface: SkyRenderSurface, levels: readonly SkyHipsMeshLevel[],
  view: SkyArtworkView, target: number, group: SkyHipsSourceGroup, ready?: SkyReadyImageFrame) {
  if (!ready) return surface.skyImageMeshLevels?.(levels, view, target, group) ?? null;
  let clocks: Array<ReturnType<SkyReadyImageFrame["image"]> | undefined> = [];
  const results = surface.skyImageMeshLevels?.(levels, view, target, group, prepared => {
    clocks = levels.map((level, index) => prepared[index] ? ready.image(level.image) : undefined);
    return clocks.map(clock => clock?.progress ?? 0);
  }) ?? null;
  if (results?.length === levels.length) results.forEach((prepared, index) => {
    if (prepared) clocks[index]?.accept();
  });
  return results;
}
