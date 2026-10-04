import { beginPublishedSkyImageDemand, capturePublishedSkyImageGeneration } from "./sky-public-image-runtime";

export interface SkyPublicationResource<Publication> {
  readonly publication: Publication;
  /** This settled metadata may not open retired native/file image demand. */
  readonly isCurrent: () => boolean;
}

/** One epoch/cancellation/snapshot owner for already admitted publication
 * metadata. Each source client keeps its own pin, URLs and physical meaning. */
export async function getSkyPublicationResource<Publication>(
  request: (signal: AbortSignal) => Promise<Publication>,
  cancelledCode: "sdss_science_optical_resource_cancelled" | "sdss_calibrated_optical_resource_cancelled" | "prepared_optical_resource_cancelled",
  signal?: AbortSignal): Promise<SkyPublicationResource<Publication>> {
  if (signal?.aborted) throw new Error(cancelledCode);
  const generation = capturePublishedSkyImageGeneration(), demand = beginPublishedSkyImageDemand();
  const controller = new AbortController();
  let pending = true;
  let rejectCancellation!: (reason: Error) => void;
  const cancellation = new Promise<never>((_resolve, reject) => { rejectCancellation = reject; });
  const cancel = () => {
    if (!pending) return;
    rejectCancellation(new Error(cancelledCode));
    try { controller.abort(); } catch { /* Promise and consumers stay fenced. */ }
  };
  const unsubscribe = demand.onRetire(cancel);
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const publication = await Promise.race([request(controller.signal), cancellation]);
    if (!generation.isCurrent() || !demand.isCurrent()) throw new Error(cancelledCode);
    const snapshot: Publication = JSON.parse(JSON.stringify(publication));
    const freeze = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    };
    freeze(snapshot);
    return Object.freeze({ publication: snapshot, isCurrent: generation.isCurrent });
  } finally {
    pending = false;
    unsubscribe(); signal?.removeEventListener("abort", cancel); demand.release();
  }
}
