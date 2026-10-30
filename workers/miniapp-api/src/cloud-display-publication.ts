import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { displayRasterRegionForBounds, displayRasterWindowBounds, displayRasterWindowKey,
  type DisplayRasterWindow, type RasterBounds } from "@starward/coordinate-system";
import { assertCloudDisplayInventory, assertCloudDisplayProof, assertCloudDisplayRecord,
  cloudInstant, copyTotalCloudContext, totalCloudSupports240Hours,
  type CloudDisplayNumericSource, type CloudDisplayInventoryRecord, type PreparedMapCloudRaster,
  type TotalCloudPublicationPin } from "@starward/miniapp-contracts";
import type { CloudNumericPublication } from "./cloud-publication.ts";
import { cloudContextPin } from "./cloud-publication-registry.ts";

const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const validHash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
function fail(code: string): never { throw new Error(`cloud_display_${code}`); }
const comparable = (value: string) => process.platform === "win32" ? value.toLowerCase() : value;
const contains = (outer: RasterBounds, inner: RasterBounds) => outer.west <= inner.west && outer.east >= inner.east
  && outer.south <= inner.south && outer.north >= inner.north;

async function sealedFile(directory: string, file: string, maximum: number, expectedHash: string,
  signal?: AbortSignal, expectedBytes?: number) {
  signal?.throwIfAborted();
  if (!path.isAbsolute(directory) || !/^[a-z0-9][a-z0-9.-]*$/u.test(file) || !validHash(expectedHash)) fail("file_invalid");
  const root = path.resolve(directory), rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || comparable(await realpath(root)) !== comparable(root)) fail("directory_invalid");
  const full = path.join(root, file), info = await lstat(full);
  if (!info.isFile() || info.isSymbolicLink() || info.size < 1 || info.size > maximum
    || expectedBytes !== undefined && info.size !== expectedBytes) fail("file_type_or_size_invalid");
  const bytes = await readFile(full, { signal });
  signal?.throwIfAborted();
  if (bytes.length !== info.size || hash(bytes) !== expectedHash) fail("file_integrity_invalid");
  return bytes;
}

/** Request-time identity/header checks only. Full PNG CRC/pixel qualification
 * belongs to the offline producer and publication, never to the API reader. */
function assertPngHeader(bytes: Buffer, width: number, height: number) {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR"
    || bytes.readUInt32BE(16) !== width || bytes.readUInt32BE(20) !== height || bytes[24] !== 8 || bytes[25] !== 6)
    fail("png_header_invalid");
}

export type CloudDisplayReadResult =
  | { state: "AVAILABLE" | "PARTIAL"; raster: PreparedMapCloudRaster }
  | { state: "UNAVAILABLE"; reason: "NOT_READY" | "EXPIRED" | "OUTSIDE_COVERAGE" | "SOURCE_MISSING";
      raster: PreparedMapCloudRaster | null };

/** A read-only handle for a finite, explicitly pinned offline display
 * inventory. It creates no pointer, ready marker, URL, cache, image or job.
 * Opening it is local artifact admission, not formal source/OSS qualification.
 * The caller continues to own the already-admitted numeric handle. */
export class CloudDisplayPublication {
  private readonly lifetime = new AbortController();
  private constructor(private readonly directory: string, private readonly source: CloudDisplayNumericSource,
    private readonly binding: TotalCloudPublicationPin, private readonly records: Map<string, CloudDisplayInventoryRecord>,
    private readonly now: () => number) {}

  static async open(input: { directory: string; inventorySha256: string; numeric: CloudNumericPublication; now?: () => number },
    signal?: AbortSignal) {
    if (!path.isAbsolute(input.directory) || !validHash(input.inventorySha256)) fail("configuration_invalid");
    const numeric = input.numeric;
    const source: CloudDisplayNumericSource = { publicationId: numeric.manifest.publicationId,
      manifestSha256: numeric.manifestSha256, runAt: numeric.manifest.runAt,
      frames: numeric.manifest.frames.map(frame => ({ stepHours: frame.stepHours, validAt: frame.validAt,
        values: { sha256: frame.values.sha256 } })) };
    const raw = await sealedFile(input.directory, "inventory.json", 2 * 1024 * 1024, input.inventorySha256, signal);
    const inventory = assertCloudDisplayInventory(JSON.parse(raw.toString("utf8")), source);
    signal?.throwIfAborted();
    return new CloudDisplayPublication(input.directory, source, cloudContextPin(numeric.manifest, numeric.manifestSha256),
      new Map(inventory.records.map(record => [`${record.windowKey}:${record.selectedAt}`, record])), input.now ?? Date.now);
  }

  private unavailableTime(): CloudDisplayReadResult | null {
    const now = this.now();
    if (!Number.isFinite(now)) fail("clock_invalid");
    const until = Date.parse(this.binding.supports240HoursUntil);
    if (!totalCloudSupports240Hours(this.binding, now)) return { state: "UNAVAILABLE",
      reason: now > until ? "EXPIRED" : "NOT_READY", raster: null };
    return null;
  }

  async read(input: { binding: TotalCloudPublicationPin; selectedAt: string; window: DisplayRasterWindow; viewport: RasterBounds },
    signal?: AbortSignal): Promise<CloudDisplayReadResult> {
    const reader = signal ? AbortSignal.any([signal, this.lifetime.signal]) : this.lifetime.signal;
    reader.throwIfAborted();
    const binding = copyTotalCloudContext(input.binding);
    if (binding.state !== "PINNED" || JSON.stringify(binding) !== JSON.stringify(this.binding)) fail("binding_mismatch");
    const selectedAt = cloudInstant(input.selectedAt);
    if (!selectedAt) fail("time_invalid");
    const windowKey = displayRasterWindowKey(input.window), bounds = displayRasterWindowBounds(input.window);
    if (input.window.columns > 3 || input.window.rows > 3) fail("window_invalid");
    displayRasterRegionForBounds(input.viewport); // Existing complete geographic input validation.
    const expired = this.unavailableTime();
    if (expired) return expired;
    if (Date.parse(selectedAt) < Date.parse(binding.validFrom) || Date.parse(selectedAt) > Date.parse(binding.validTo))
      return { state: "UNAVAILABLE", reason: "OUTSIDE_COVERAGE", raster: null };
    const record = this.records.get(`${windowKey}:${selectedAt}`);
    if (!contains(bounds, input.viewport) || !record) return { state: "UNAVAILABLE", reason: "NOT_READY", raster: null };
    const raw = await sealedFile(this.directory, record.file + ".json", 2 * 1024 * 1024, record.proofSha256, reader);
    const proof = assertCloudDisplayProof(JSON.parse(raw.toString("utf8")), this.source);
    assertCloudDisplayRecord(record, proof);
    const image = await sealedFile(this.directory, record.file, 16 * 1024 * 1024, proof.image.sha256, reader, proof.image.bytes);
    assertPngHeader(image, proof.width, proof.height);
    reader.throwIfAborted();
    // Async file reads cannot extend the selected source's lifetime.
    const completedAfterExpiry = this.unavailableTime();
    if (completedAfterExpiry) return completedAfterExpiry;
    const raster: PreparedMapCloudRaster = { schemaVersion: "map-cloud-raster-v1", publicationId: proof.publicationId,
      sourcePublicationId: proof.sourcePublicationId, sourceManifestSha256: proof.sourceManifestSha256, runAt: proof.runAt,
      sourceValidUntil: binding.supports240HoursUntil, selectedAt: proof.selectedAt, brackets: { ...proof.brackets },
      samplingPolicy: proof.samplingPolicy, nativeGrid: { crs: "WGS84", registration: "grid-point-centres", resolutionDegrees: 0.1 },
      coordinateGrid: proof.window.grid, window: { ...proof.window }, boundsGcj02: { ...proof.boundsGcj02 },
      width: proof.width, height: proof.height, styleVersion: proof.styleVersion, unit: "%",
      validPixelCount: proof.validPixels, zeroPixelCount: proof.zeroPixels, missingPixelCount: proof.missingPixels,
      imageBytes: proof.image.bytes, imageSha256: proof.image.sha256 };
    if (proof.validPixels === 0) return { state: "UNAVAILABLE", reason: "SOURCE_MISSING", raster };
    return { state: proof.missingPixels ? "PARTIAL" : "AVAILABLE", raster };
  }

  close() { this.lifetime.abort(new Error("cloud_display_closed")); }
}
