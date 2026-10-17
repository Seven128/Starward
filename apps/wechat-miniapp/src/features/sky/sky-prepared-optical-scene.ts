import type { DeepSkySceneCatalogEntry, SkyObservationFrame } from "@starward/miniapp-contracts";
import type { SkyArtworkView } from "./sky-artwork-registration";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { SkyPreparedOpticalImage, SkyTargetOpticalImage } from "./sky-sdss-optical-frame";
import { submitSkySceneTargetOptical, type SkySceneTargetOpticalPort } from "./sky-target-optical-scene";
import { completePreparedSkyOptical } from "./sky-sdss-optical-completion";
import { registerSkyTanOpticalField } from "./sky-tan-optical-registration";
import { skyArtworkFootprintsIntersect } from "./sky-artwork-visibility";
import type { SkyReadyImageFrame } from "./sky-ready-presentation";

/** Explicit Prepared publication intent, independent of science/default data. */
export type SkyScenePreparedOpticalPort = SkySceneTargetOpticalPort;
export interface SkyScenePreparedOpticalRegion {
  readonly frame: SkyPreparedOpticalImage;
  readonly port: SkyScenePreparedOpticalPort;
}
export function submitSkyScenePreparedOptical(context: SkyRenderSurface,
  port: SkyScenePreparedOpticalPort | undefined, frame: SkyTargetOpticalImage | null | undefined,
  observation: SkyObservationFrame | null, view: SkyArtworkView,
  failed?: (image: object) => void, catalogEntry?: DeepSkySceneCatalogEntry | null, ready?: SkyReadyImageFrame) {
  return submitSkySceneTargetOptical(context, "prepared", port, frame, observation, view, failed, catalogEntry, ready);
}

/** Independently registered regions join the same draw order and finish fence.
 * They never acquire the selected object's catalogue/model identity. */
export function submitSkyScenePreparedRegions(context: SkyRenderSurface,
  regions: readonly SkyScenePreparedOpticalRegion[] | undefined, observation: SkyObservationFrame | null,
  view: SkyArtworkView, failed?: (image: object) => void, ready?: SkyReadyImageFrame) {
  const references = new Set<string>();
  return (regions ?? []).flatMap(({ frame, port }) => {
    if (!frame.reference.startsWith("REGION:") || references.has(frame.reference)) return [];
    const submission = submitSkyScenePreparedOptical(context, port, frame, observation, view, failed, undefined, ready);
    if (!submission) return [];
    references.add(frame.reference); return [submission];
  });
}
export type SkyPreparedRegionSubmissions = ReturnType<typeof submitSkyScenePreparedRegions>;
export function completeSkyScenePreparedRegions(submissions: SkyPreparedRegionSubmissions) {
  return Object.freeze(submissions.flatMap(submission => {
    if (!submission.draw.submitted) return [];
    const receipt = completePreparedSkyOptical(submission.frame, submission.draw,
      submission.surface.artworkLevelsContribution(submission.draw));
    return receipt ? [receipt] : [];
  }));
}

/** One cutout must not mix a different spectrum into an overlapping optical
 * field's edge. Decide before later layers, using each actually prepared slot.
 * An independent off-field region cannot hide the selected infrared cutout. */
export function skyPreparedRegionsBlockInfrared(submissions: SkyPreparedRegionSubmissions,
  infrared: Parameters<typeof skyArtworkFootprintsIntersect>[0], observation: SkyObservationFrame | null): boolean {
  return submissions.some(({ frame, draw, allowInfrared }) => !allowInfrared &&
    [draw.finePrepared ? frame : null, draw.coarsePrepared ? frame.coarser : null].some(field => {
      if (!field || !("preparedPublication" in frame)) return false;
      const registration = registerSkyTanOpticalField(frame.preparedPublication, field.asset, observation);
      return registration && skyArtworkFootprintsIntersect(registration, infrared);
    }));
}
