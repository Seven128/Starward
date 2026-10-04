import { assertDeepSkyImageDiscovery, readSkyImageDisplaySupport,
  type DeepSkyImageDiscoveryData, type DeepSkyImageDescriptor, type DeepSkyImageLevel,
  type SkyImageDisplaySupport } from "@starward/miniapp-contracts";
import type { SkyPublicImageAcquisition, SkyPublicImageLease } from "../../services/sky-public-image-cache";
import type { SkyPublicImageDemand } from "../../services/sky-public-image-cache";

export type { DeepSkyImageLevel } from "@starward/miniapp-contracts";

export interface DeepSkyImageAsset {
  reference: string;
  level: DeepSkyImageLevel;
  fieldDegrees: number;
  tempFilePath: string;
  publicationHash?: string;
  sourceId?: string;
  pixelSize?: 256 | 512;
  sourceMissingPixels?: number;
  displaySupport?: SkyImageDisplaySupport;
}

export interface OwnedDeepSkyImageAsset extends DeepSkyImageAsset {
  /** Metadata owns a lease, even when two publications share encoded bytes. */
  isCurrent(): boolean;
  onRetire(handler: () => void): () => void;
  release(): void;
}

// The common native transport shapes are also used by bounded local fixtures.
export interface DeepSkyImageRequestOptions {
  url: string;
  responseType: "arraybuffer";
  success(result: { statusCode: number; data: unknown; header?: Record<string, string | number> }): void;
  fail(): void;
}
export interface DeepSkyImageWriteOptions {
  filePath: string;
  data: ArrayBuffer;
  success(): void;
  fail(): void;
}

export interface DeepSkyImageRequestInput {
  reference: string;
  level: DeepSkyImageLevel;
  demand: SkyPublicImageDemand;
  discover(signal: AbortSignal): Promise<DeepSkyImageDiscoveryData>;
  /** Receives validated metadata before any encoded-byte acquisition. A false
   * result retires this demand normally (not a source/data failure). */
  onDiscovered?(publication: DeepSkyImageDiscoveryData): boolean;
  acquire(asset: DeepSkyImageDescriptor, publicationHash: string): SkyPublicImageAcquisition;
  onReady(asset: OwnedDeepSkyImageAsset): void;
  onError(): void;
  onCancel?(): void;
}

/** Discover identity before transfer. The shared owner validates encoded bytes,
 * persists them, deduplicates and leases files; this owner retains publication
 * meaning separately. No mutable URL or session file fallback enters the lane. */
export function startDeepSkyImageRequest(input: DeepSkyImageRequestInput): () => void {
  let active = true;
  let acquisition: SkyPublicImageAcquisition | undefined;
  let lease: SkyPublicImageLease | undefined;
  const controller = new AbortController();
  let unsubscribe = () => {};
  const releaseDemand = () => { unsubscribe(); input.demand.release(); };
  const fail = () => {
    if (!active) return;
    active = false;
    releaseDemand();
    try { controller.abort(); } catch { /* Request remains fenced. */ }
    try { acquisition?.cancel(); } catch { /* Native settlement stays with its owner. */ }
    lease?.release();
    input.onError();
  };
  unsubscribe = input.demand.onRetire(fail);
  void (async () => {
    if (!active) return;
    // Snapshot a response before asynchronous acquisition. Later caller changes
    // cannot assign another publication's display metadata to this lease.
    const discovered: unknown = JSON.parse(JSON.stringify(await input.discover(controller.signal)));
    if (!active) return;
    if (!input.demand.isCurrent()) { fail(); return; }
    assertDeepSkyImageDiscovery(discovered, input.reference);
    // The view may change while metadata is in flight. Keep the acquisition
    // snapshot separate from caller-owned geometry/provenance metadata.
    const wanted = input.onDiscovered?.(JSON.parse(JSON.stringify(discovered))) !== false;
    if (!active) return;
    if (!input.demand.isCurrent()) { fail(); return; }
    if (!wanted) {
      active = false;
      releaseDemand();
      input.onCancel?.();
      return;
    }
    const descriptor = discovered.levels[input.level];
    const displaySupport = descriptor.displaySupport === undefined ? undefined :
      readSkyImageDisplaySupport(descriptor.displaySupport, descriptor.pixels, descriptor.sha256)!;
    acquisition = input.acquire(descriptor, discovered.publicationHash);
    const received = await acquisition.promise;
    if (!active) { received.release(); return; }
    lease = received;
    if (!lease.isCurrent() || !input.demand.isCurrent()) { fail(); return; }
    const owned: OwnedDeepSkyImageAsset = {
      reference: discovered.objectRef, level: input.level, fieldDegrees: descriptor.fieldDegrees,
      tempFilePath: lease.filePath, publicationHash: discovered.publicationHash,
      sourceId: discovered.sourceId, pixelSize: descriptor.pixels,
      ...(descriptor.sourceFiniteMask ? { sourceMissingPixels: descriptor.sourceFiniteMask.missingPixels } : {}),
      ...(displaySupport ? { displaySupport } : {}),
      isCurrent: () => received.isCurrent(), onRetire: handler => received.onRetire(handler),
      release: () => received.release(),
    };
    active = false;
    releaseDemand();
    try { input.onReady(owned); } catch (cause) { owned.release(); throw cause; }
  })().catch(fail);
  return () => {
    if (!active) return;
    active = false;
    releaseDemand();
    // Cancellation fences callbacks first. A native abort failure cannot keep
    // this consumer's cache acquisition alive or suppress its cancellation.
    try { controller.abort(); } catch { /* Consumer remains fenced. */ }
    try { acquisition?.cancel(); } catch { /* Shared owner keeps I/O bounded. */ }
    finally { lease?.release(); input.onCancel?.(); }
  };
}
