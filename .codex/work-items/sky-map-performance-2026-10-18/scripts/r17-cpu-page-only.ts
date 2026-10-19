// TASK ONLY: frozen synthetic Scene success path. Never a renderer or source receipt.
import type { SkyGpuRenderer } from "./sky-gpu-renderer";
import type { SkyCanvasSurface, SkyDisplayCanvas } from "./sky-canvas-surface";
import type { CanvasSize } from "./sky-canvas-lifecycle";
import { unknownSkyArtworkLocalObservation } from "./sky-artwork-level-composition";
type Owner = {
  renderer: SkyGpuRenderer; surface: SkyCanvasSurface<any>; display: SkyDisplayCanvas;
  selection: SkyDisplayCanvas | undefined; width: number; height: number; disposed: boolean; frozen: boolean;
  nativeCopies: number; readyNativeCopies: number; syntheticBegins: number; syntheticFinishes: number;
  syntheticPublications: number; discs: number; segments: number; images: number; readiness: number;
  facade: SkyGpuRenderer;
};
const byRenderer = new WeakMap<SkyGpuRenderer, Owner>();
const bySurface = new WeakMap<SkyCanvasSurface<any>, Owner>();
let current: Owner | undefined;
let last = { frozen: false, retired: false, nativeCopies: 0, readyNativeCopies: 0,
  syntheticBegins: 0, syntheticFinishes: 0, syntheticPublications: 0, discs: 0, segments: 0, images: 0, readiness: 0 };
const increment = (value: number, amount = 1) => Math.min(Number.MAX_SAFE_INTEGER, value + Math.max(0, amount));
const assertLive = (owner: Owner) => {
  if (owner.disposed || !owner.frozen) throw new Error("r17_cpu_page_only_surface_not_live");
};
export function r17CpuPageOnlyAttach(renderer: SkyGpuRenderer, surface: SkyCanvasSurface<any>,
  display: SkyDisplayCanvas, size: CanvasSize, ratio: number, selection?: SkyDisplayCanvas) {
  const owner: Owner = { renderer, surface, display, selection,
    width: Math.round(size.width * ratio), height: Math.round(size.height * ratio), disposed: false, frozen: false,
    nativeCopies: 0, readyNativeCopies: 0, syntheticBegins: 0, syntheticFinishes: 0,
    syntheticPublications: 0, discs: 0, segments: 0, images: 0, readiness: 0, facade: null as any };
  const success = () => { assertLive(owner); return true; };
  const image = () => { assertLive(owner); owner.images = increment(owner.images); return true; };
  const prepared = () => { assertLive(owner); owner.readiness = increment(owner.readiness); return true; };
  const qualification = (draw: { coarsePrepared: boolean; finePrepared: boolean }) => ({
    fine: draw.finePrepared ? "has" as const : "unknown" as const,
    coarse: draw.coarsePrepared ? "has" as const : "unknown" as const,
    any: draw.coarsePrepared || draw.finePrepared ? "has" as const : "unknown" as const,
  });
  owner.facade = {
    begin() { assertLive(owner); owner.syntheticBegins = increment(owner.syntheticBegins); },
    solarLight: success, landscape: success, sun: success, saturnRings: success,
    galacticBand(_view, _band, bitmap, painted) { image(); if (bitmap) painted?.(bitmap); return true; },
    moon(_disc, _view, _mode, bitmap, painted) { image(); if (bitmap) painted?.(bitmap); return true; },
    planet(_disc, _view, _tint, _mode, bitmap, painted) { image(); if (bitmap) painted?.(bitmap); return true; },
    image, skyImageMesh: image, artwork: image,
    prepareSkyImageMesh: prepared, prepareArtwork: prepared,
    skyImageMeshLevels(levels, _view, _opacity, _group, readiness) {
      assertLive(owner); owner.images = increment(owner.images, levels.length);
      const ready = levels.map(() => true); readiness?.(ready); return ready;
    },
    skyImageMeshContribution() { assertLive(owner); return "positive"; },
    artworkLevels(levels, _view, _opacity, readiness) {
      assertLive(owner); owner.images = increment(owner.images);
      const eligible = { coarse: !!levels.coarse, fine: !!levels.fine };
      readiness?.(eligible);
      return { submitted: eligible.coarse || eligible.fine,
        coarsePrepared: eligible.coarse, finePrepared: eligible.fine };
    },
    artworkLevelsObserveRegion() { assertLive(owner); return unknownSkyArtworkLocalObservation; },
    artworkLevelsQualification(draw) { assertLive(owner); return qualification(draw); },
    artworkLevelsContribution(draw) { assertLive(owner); return {
      completed: draw.submitted, qualification: qualification(draw),
      finePhoto: draw.finePrepared ? "positive" : "unknown",
      coarsePhoto: draw.coarsePrepared ? "positive" : "unknown",
    }; },
    artworkContributionsFailed() { assertLive(owner); return false; },
    resetArtworkContributions() { assertLive(owner); }, resetTargetOptical() { assertLive(owner); },
    resetBodyImages() { assertLive(owner); }, resetHips() { assertLive(owner); },
    segments(lines) { assertLive(owner); owner.segments = increment(owner.segments, lines.length); },
    disc() { assertLive(owner); owner.discs = increment(owner.discs); },
    finish() { assertLive(owner); owner.syntheticFinishes = increment(owner.syntheticFinishes); },
    // Original renderer lifetime remains with the original page owner.
    dispose() { throw new Error("r17_cpu_page_only_facade_not_resource_owner"); },
  };
  byRenderer.set(renderer, owner); bySurface.set(surface, owner); current = owner;
}
export function r17CpuPageOnlyScene(renderer: SkyGpuRenderer): SkyGpuRenderer {
  const owner = byRenderer.get(renderer);
  if (owner?.disposed) throw new Error("r17_cpu_page_only_renderer_retired");
  return owner?.frozen ? owner.facade : renderer;
}
export function r17CpuPageOnlyFrozen(surface: SkyCanvasSurface<any>) { return bySurface.get(surface)?.frozen === true; }
export function r17CpuPageOnlyCurrent(surface: SkyCanvasSurface<any>, display: SkyDisplayCanvas,
  size: CanvasSize, ratio: number, selection?: SkyDisplayCanvas) {
  const owner = bySurface.get(surface);
  if (!owner || !owner.frozen) return surface.isCurrent(display, size, ratio, selection);
  // The frozen diagnostic skips the original recurring gl.isContextLost read.
  // Page lifecycle, exact display identity and resize still invalidate it.
  return !owner.disposed && display === owner.display && selection === owner.selection &&
    owner.width === Math.round(size.width * ratio) && owner.height === Math.round(size.height * ratio) &&
    display.width === owner.width && display.height === owner.height &&
    surface.node.width === owner.width && surface.node.height === owner.height;
}
export function r17CpuPageOnlyNativeCopyReturned(surface: SkyCanvasSurface<any>) {
  const owner = bySurface.get(surface);
  if (!owner || owner.disposed || owner.frozen) throw new Error("r17_cpu_page_only_native_copy_boundary_invalid");
  owner.nativeCopies = increment(owner.nativeCopies);
}
export function r17CpuPageOnlyPublished(surface: SkyCanvasSurface<any>, synthetic: boolean, ready: boolean) {
  const owner = bySurface.get(surface);
  if (!owner || owner.disposed || synthetic !== owner.frozen) throw new Error("r17_cpu_page_only_publication_boundary_invalid");
  if (synthetic) owner.syntheticPublications = increment(owner.syntheticPublications);
  else if (ready) { owner.readyNativeCopies = increment(owner.readyNativeCopies); owner.frozen = true; }
}
export function r17CpuPageOnlyRetire(renderer: SkyGpuRenderer) {
  const owner = byRenderer.get(renderer); if (!owner) return;
  owner.disposed = true;
  if (current === owner) { last = r17CpuPageOnlyStats(); current = undefined; }
}
export function r17CpuPageOnlyStats() {
  const value = current;
  if (!value) return { ...last };
  return { frozen: value?.frozen === true, retired: value?.disposed === true,
    nativeCopies: value?.nativeCopies ?? 0, readyNativeCopies: value?.readyNativeCopies ?? 0,
    syntheticBegins: value?.syntheticBegins ?? 0, syntheticFinishes: value?.syntheticFinishes ?? 0,
    syntheticPublications: value?.syntheticPublications ?? 0, discs: value?.discs ?? 0,
    segments: value?.segments ?? 0, images: value?.images ?? 0, readiness: value?.readiness ?? 0 };
}
