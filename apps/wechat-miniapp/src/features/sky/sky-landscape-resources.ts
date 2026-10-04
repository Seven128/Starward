import type { SkyLandscapeManifestData, SkyLandscapeResource } from "@starward/miniapp-contracts";
import { SKY_GPU_TEXTURE_PRESSURE_BYTES, skyImageRgbaBytes } from "./sky-gpu-textures";
import { createSkyPanoramaMask, skyPanoramaMaskIntersectsView, type SkyPanoramaMask, type SkyLandscapePanorama } from "./sky-landscape-mask";
import type { SkyArtworkView } from "./sky-artwork-registration";
import { skyLandscapeViewOpacity } from "./sky-landscape-visibility";

export interface SkyLandscapeFootprint { view: SkyArtworkView; width: number; height: number }

/** Keep each image's own alpha identity. An unknown footprint is not empty;
 * valid alpha remains available without acquiring an invisible bitmap. */
export function selectSkyLandscapeImageResources(resources: readonly SkyLandscapeResource[],
  masks: ReadonlyMap<string, SkyPanoramaMask>, footprint: SkyLandscapeFootprint | null): SkyLandscapeResource[] {
  if (footprint && skyLandscapeViewOpacity(footprint.view, footprint.width, footprint.height) === 0) return [];
  return resources.filter(resource => {
    const mask = masks.get(resource.id);
    return mask && (!footprint || skyPanoramaMaskIntersectsView(mask, footprint.view, footprint.width, footprint.height));
  });
}

/** Keep independently wanted celestial layers; refine the foreground only in
 * the remaining shared allocation target. Pending/unknown inputs keep overview;
 * the required overview and active celestial textures can exceed that target.
 * Native decoded memory and target performance are separate measurements. */
export function selectSkyLandscapeResource(publication: SkyLandscapeManifestData,
  otherImages: readonly object[], pending: boolean): SkyLandscapeResource {
  const overview = publication.resources[0]!;
  if (pending) return overview;
  let reserved = 0;
  for (const image of new Set(otherImages)) {
    const bytes = skyImageRgbaBytes(image);
    if (bytes === null) return overview;
    reserved += bytes;
  }
  return [...publication.resources].reverse().find(resource =>
    reserved + resource.image.width * resource.image.height * 4 <= SKY_GPU_TEXTURE_PRESSURE_BYTES) ?? overview;
}

/** Match the selected image to its own decoded alpha. A valid overview stays
 * usable during a detail request/failure; a coarser request never paints detail. */
export function selectSkyLandscapePanorama(resource: SkyLandscapeResource | undefined,
  masks: ReadonlyMap<string, SkyPanoramaMask>, images: ReadonlyMap<string, object>,
  retained: ReadonlyMap<string, object>): SkyLandscapePanorama | null {
  for (const id of resource?.id === "detail" ? ["detail", "overview"] : ["overview"]) {
    const mask = masks.get(id), image = images.get(`landscape:${id}`) ?? retained.get(`landscape:${id}`);
    if (mask && image) return { image, mask };
  }
  return null;
}

export interface SkyLandscapeMaskState {
  masks: ReadonlyMap<string, SkyPanoramaMask>;
  failed: boolean;
}

/** This canvas/publication owns at most the two declared alpha grids. Requests
 * are cancelable; valid independent masks survive zoom changes and retry. */
export function createSkyLandscapeMasks(publication: SkyLandscapeManifestData, deps: {
  load(resource: SkyLandscapeResource, signal: AbortSignal): Promise<Uint8Array>;
  changed(state: SkyLandscapeMaskState): void;
}) {
  type Entry = { state: "loading" | "ready" | "error"; abort: AbortController; mask?: SkyPanoramaMask };
  const entries = new Map<string, Entry>();
  let live = true, wanted: readonly SkyLandscapeResource[] = [];
  const emit = () => {
    if (live) deps.changed({ masks: new Map([...entries].flatMap(([id, entry]) => entry.mask ? [[id, entry.mask]] : [])),
      failed: wanted.some(resource => entries.get(resource.id)?.state === "error") });
  };
  const start = () => {
    for (const resource of wanted) {
      if (entries.has(resource.id)) continue;
      const entry: Entry = { state: "loading", abort: new AbortController() }; entries.set(resource.id, entry);
      void deps.load(resource, entry.abort.signal).then(alpha => {
        if (!live || entries.get(resource.id) !== entry) return;
        entry.mask = createSkyPanoramaMask(publication, resource, alpha); entry.state = "ready"; emit();
      }).catch(() => {
        if (!live || entries.get(resource.id) !== entry) return;
        entry.state = "error"; emit();
      });
    }
  };
  return {
    update(resources: readonly SkyLandscapeResource[]) {
      if (!live) return;
      wanted = resources;
      for (const [id, entry] of entries) if (entry.state === "loading" && !wanted.some(resource => resource.id === id)) {
        entries.delete(id); entry.abort.abort();
      }
      start(); emit();
    },
    retry() {
      if (!live) return;
      for (const [id, entry] of entries) if (entry.state === "error") entries.delete(id);
      start(); emit();
    },
    dispose() { live = false; for (const entry of entries.values()) entry.abort.abort(); entries.clear(); wanted = []; },
  };
}
