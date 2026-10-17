import { liveSkyOpticalCompletion, sameSkyOpticalCompletion, sameSkyOpticalInput,
  type SkyPreparedOpticalCompletion, type SkyTargetOpticalCompletion } from "./sky-sdss-optical-completion";
import type { SkyPreparedOpticalImage } from "./sky-sdss-optical-frame";

export function sameSkyPreparedRegionInputs(a: readonly SkyPreparedOpticalImage[] = [], b: readonly SkyPreparedOpticalImage[] = []) {
  return a.length === b.length && a.every((frame, index) => sameSkyOpticalInput(frame, b[index]));
}
export function sameSkyPreparedRegionCompletions(a: readonly SkyPreparedOpticalCompletion[] = [], b: readonly SkyPreparedOpticalCompletion[] = []) {
  return a.length === b.length && a.every((receipt, index) => sameSkyOpticalCompletion(receipt, b[index]));
}
/** Accepted native frame joins actual ready descriptors, not mutable discovery
 * or a newly focused catalogue target. Retirement filters each field separately. */
export function acceptedSkyPreparedRegionCompletions(sources: readonly SkyTargetOpticalCompletion[] | undefined,
  frames: readonly SkyPreparedOpticalImage[]): readonly SkyPreparedOpticalCompletion[] {
  return (sources ?? []).flatMap(source => {
    const live = liveSkyOpticalCompletion(source);
    if (!live || live.kind !== "prepared" || !live.reference.startsWith("REGION:")) return [];
    const frame = frames.find(candidate => candidate.reference === live.reference &&
      candidate.publicationHash === live.publicationHash && candidate.preparedPublication === live.preparedPublication);
    return frame && live.participatingFields.every(field => [frame, frame.coarser, frame.fallback].some(ready =>
      ready && field.image === ready.image && field.asset === ready.asset && field.level === ready.level &&
      field.fieldDegrees === ready.fieldDegrees)) ? [live] : [];
  });
}
export function skyPreparedRegionImages(frames: readonly SkyPreparedOpticalImage[]): readonly object[] {
  return [...new Set(frames.flatMap(frame => [frame.image, frame.coarser?.image, frame.fallback?.image]
    .filter((image): image is object => Boolean(image))))];
}
