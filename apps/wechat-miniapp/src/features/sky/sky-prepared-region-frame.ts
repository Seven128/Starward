import { acceptedSkyOpticalCompletion, sameSkyOpticalCompletion, sameSkyOpticalInput,
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
    if (source.kind !== "prepared" || !source.reference.startsWith("REGION:")) return [];
    const live = acceptedSkyOpticalCompletion(source, frames.find(candidate =>
      candidate.reference === source.reference && candidate.publicationHash === source.publicationHash &&
      candidate.preparedPublication === source.preparedPublication));
    return live?.kind === "prepared" ? [live] : [];
  });
}
export function skyPreparedRegionImages(frames: readonly SkyPreparedOpticalImage[]): readonly object[] {
  return [...new Set(frames.flatMap(frame => [frame.image, frame.coarser?.image, frame.fallback?.image]
    .filter((image): image is object => Boolean(image))))];
}
