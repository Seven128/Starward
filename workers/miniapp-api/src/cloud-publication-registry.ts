import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { copyTotalCloudContext, totalCloudSupports240Hours, unavailableTotalCloud, TOTAL_CLOUD_CONTEXT_SCHEMA, TOTAL_CLOUD_POLICY,
  type TotalCloudContext, type TotalCloudContextOwner, type TotalCloudPublicationPin } from "@starward/miniapp-contracts";
import { CloudNumericPublication, type CloudBatchManifest } from "./cloud-publication.ts";
import { CloudNumericReadStore } from "./cloud-numeric-read-store.ts";

export interface CloudCurrentPublication {
  schemaVersion: "starward-cloud-current-v1";
  publicationId: string;
  manifestSha256: string;
}

export function cloudContextPin(manifest: CloudBatchManifest, manifestSha256: string): TotalCloudPublicationPin {
  return copyTotalCloudContext({ schemaVersion: TOTAL_CLOUD_CONTEXT_SCHEMA, policy: TOTAL_CLOUD_POLICY, state: "PINNED",
    publicationId: manifest.publicationId, manifestSha256, runAt: manifest.runAt, validFrom: manifest.coverage.validFrom,
    validTo: manifest.coverage.validTo, supports240HoursUntil: manifest.coverage.supports240HoursUntil,
    samplingPolicy: manifest.samplingPolicy }) as TotalCloudPublicationPin;
}

export function assertCloudCurrent(value: unknown): CloudCurrentPublication {
  const item = value as CloudCurrentPublication;
  if (!item || Object.keys(item).sort().join() !== ["schemaVersion", "publicationId", "manifestSha256"].sort().join()
    || item.schemaVersion !== "starward-cloud-current-v1" || !/^ecmwf-tcc:[a-f0-9]{64}$/u.test(item.publicationId)
    || !/^[a-f0-9]{64}$/u.test(item.manifestSha256)) throw new Error("cloud_current_publication_invalid");
  return item;
}

/** One operator-owned activation pointer. Only Context selection reads current;
 * an existing Context always reads its own immutable publication directory. */
export class CloudPublicationRegistry implements TotalCloudContextOwner {
  private readonly reads = new CloudNumericReadStore();
  private closed = false;
  constructor(readonly root: string | null, private readonly now: () => number = Date.now) {
    if (root && !path.isAbsolute(root)) throw new Error("cloud_publication_root_invalid");
  }

  private async current(): Promise<CloudCurrentPublication | null> {
    if (!this.root) return null;
    const root = path.resolve(this.root), real = await realpath(root);
    if ((process.platform === "win32" ? real.toLowerCase() !== root.toLowerCase() : real !== root))
      throw new Error("cloud_publication_root_invalid");
    const file = path.join(root, "current.json"), info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size < 1 || info.size > 4096) throw new Error("cloud_current_publication_invalid");
    const bytes = await readFile(file);
    if (bytes.length > 4096) throw new Error("cloud_current_publication_invalid");
    return assertCloudCurrent(JSON.parse(bytes.toString("utf8")));
  }

  private async open(descriptor: CloudCurrentPublication, signal?: AbortSignal) {
    if (this.closed || !this.root) throw new Error("cloud_publication_registry_unavailable");
    signal?.throwIfAborted();
    const directory = path.join(this.root, "publications", descriptor.manifestSha256);
    const publication = await CloudNumericPublication.open(directory, descriptor.manifestSha256, signal, this.reads);
    try {
      const marker = path.join(directory, "ready.json"), info = await lstat(marker);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 4096) throw new Error("cloud_publication_not_ready");
      const readyBytes = await readFile(marker, { signal });
      if (readyBytes.length > 4096) throw new Error("cloud_publication_not_ready");
      const ready = assertCloudCurrent(JSON.parse(readyBytes.toString("utf8")));
      if (ready.manifestSha256 !== descriptor.manifestSha256 || ready.publicationId !== descriptor.publicationId
        || publication.manifest.publicationId !== descriptor.publicationId || this.closed) throw new Error("cloud_publication_pin_mismatch");
      return publication;
    } catch (error) { await publication.close(); throw error; }
  }

  async selectCurrent(): Promise<TotalCloudContext | null> {
    if (this.closed) throw new Error("cloud_publication_registry_closed");
    if (!this.root) return null;
    try {
      const descriptor = await this.current();
      if (!descriptor) return null;
      const publication = await this.open(descriptor);
      try {
        const pin = cloudContextPin(publication.manifest, descriptor.manifestSha256);
        const now = this.now();
        return publication.supports240Hours(now) && totalCloudSupports240Hours(pin, now) ? pin : unavailableTotalCloud("NOT_READY");
      } finally { await publication.close(); }
    } catch (error) {
      if (this.closed) throw error;
      return unavailableTotalCloud((error as NodeJS.ErrnoException).code === "ENOENT" ? "NOT_READY" : "READ_FAILED");
    }
  }

  async read(binding: TotalCloudPublicationPin, signal?: AbortSignal) {
    const pin = copyTotalCloudContext(binding);
    if (pin.state !== "PINNED") throw new Error("cloud_publication_binding_unavailable");
    const publication = await this.open({ schemaVersion: "starward-cloud-current-v1", publicationId: pin.publicationId,
      manifestSha256: pin.manifestSha256 }, signal);
    if (JSON.stringify(cloudContextPin(publication.manifest, pin.manifestSha256)) !== JSON.stringify(pin)) {
      await publication.close(); throw new Error("cloud_publication_pin_mismatch");
    }
    return publication;
  }

  async restore(binding: TotalCloudPublicationPin): Promise<TotalCloudPublicationPin> {
    // Recovery does not select current or promote a stale run to fresh. The
    // usual consumers still decide time validity for this exact publication.
    const publication = await this.read(binding);
    try { return cloudContextPin(publication.manifest, publication.manifestSha256); }
    finally { await publication.close(); }
  }

  close() { this.closed = true; return this.reads.close(); }
}
