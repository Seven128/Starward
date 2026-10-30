import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { endianness } from "node:os";
import { assertCloudGrid, CLOUD_NATIVE_STEPS, CLOUD_SAMPLING_POLICY, cloudTimeBracket, cloudSampleAt,
  type CloudNativeTime, type CloudNumericGrid, type CloudNumericFrame } from "@starward/miniapp-contracts";
import { CloudNumericReadStore } from "./cloud-numeric-read-store.ts";
export { CloudNumericReadStore } from "./cloud-numeric-read-store.ts";

export interface CloudFile { file: string; bytes: number; sha256: string }
export interface CloudFrameDeclaration extends CloudNativeTime {
  values: CloudFile;
  mask: CloudFile;
  source: { sha256: string; bytes: number; retrievedAt: string; metadata: Record<string, string | number> };
  validSamples: number;
  missingSamples: number;
}
export interface CloudBatchManifest {
  schemaVersion: "starward-ecmwf-tcc-batch-v1";
  methodVersion: "ifs-0p1-tcc-native-f32-mask-v1";
  processorSha256: string;
  publicationId: string;
  contentSha256: string;
  runAt: string;
  grid: CloudNumericGrid;
  frames: CloudFrameDeclaration[];
  coverage: { validFrom: string; validTo: string; qualifiedAt: string; requestedHorizonHours: 240; supports240HoursUntil: string; endpointInclusive: true };
  samplingPolicy: typeof CLOUD_SAMPLING_POLICY;
  source: { provider: "ECMWF"; model: "IFS"; stream: "oper"; type: "fc"; parameter: "tcc"; resolutionDegrees: 0.1;
    license: "CC-BY-4.0"; licenseUrl: string; url: string; attribution: string; modifications: string[] };
}
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const validHash = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const fail = (code: string): never => { throw new Error(`cloud_publication_${code}`); };
const at = (value: string) => typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/u.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString().replace(".000Z", "Z") === value ? Date.parse(value) : NaN;

export function assertCloudBatch(value: unknown): CloudBatchManifest {
  const batch = value as CloudBatchManifest;
  if (!batch || batch.schemaVersion !== "starward-ecmwf-tcc-batch-v1" || batch.methodVersion !== "ifs-0p1-tcc-native-f32-mask-v1"
    || batch.samplingPolicy !== CLOUD_SAMPLING_POLICY || !validHash(batch.processorSha256) || !validHash(batch.contentSha256)
    || batch.publicationId !== `ecmwf-tcc:${batch.contentSha256}`) fail("identity_invalid");
  const grid = assertCloudGrid(batch.grid), cells = grid.width * grid.height, run = at(batch.runAt);
  if (!Number.isFinite(run) || run % (12 * 3_600_000) !== 0 || !Array.isArray(batch.frames)
    || batch.frames.length < 2 || batch.frames.length > CLOUD_NATIVE_STEPS.length) fail("run_invalid");
  const source = batch.source;
  if (source?.provider !== "ECMWF" || source.model !== "IFS" || source.stream !== "oper" || source.type !== "fc" || source.parameter !== "tcc"
    || source.resolutionDegrees !== 0.1 || source.license !== "CC-BY-4.0" || source.licenseUrl !== "https://creativecommons.org/licenses/by/4.0/"
    || !source.attribution || !Array.isArray(source.modifications) || source.modifications.length === 0) fail("source_invalid");
  for (const [index, frame] of batch.frames.entries()) {
    if (frame.stepHours !== CLOUD_NATIVE_STEPS[index] || at(frame.validAt) !== run + frame.stepHours * 3_600_000
      || !validHash(frame.source?.sha256) || !Number.isSafeInteger(frame.source.bytes) || frame.source.bytes <= 0
      || !Number.isFinite(at(frame.source.retrievedAt)) || frame.validSamples + frame.missingSamples !== cells
      || !Number.isSafeInteger(frame.validSamples) || frame.validSamples < 0 || !Number.isSafeInteger(frame.missingSamples) || frame.missingSamples < 0) fail("frame_invalid");
    const meta = frame.source.metadata;
    if (!meta || meta.centre !== "ecmf" || meta.class !== "od" || meta.stream !== "oper" || meta.dataType !== "fc"
      || meta.edition !== 2 || meta.typeOfGeneratingProcess !== 2 || meta.shortName !== "tcc" || meta.paramId !== 164
      || meta.units !== "(0 - 1)" || meta.step !== frame.stepHours) fail("origin_invalid");
    for (const [descriptor, extension, bytes] of [[frame.values, "f32", cells * 4], [frame.mask, "mask", cells]] as const) {
      if (!descriptor || !validHash(descriptor.sha256) || descriptor.bytes !== bytes
        || !new RegExp(`^tcc-[a-f0-9]{64}\\.${extension}$`, "u").test(descriptor.file)) fail("file_invalid");
    }
    if (frame.values.file.split(".")[0] !== frame.mask.file.split(".")[0]) fail("mask_identity_invalid");
  }
  const coverage = batch.coverage, end = at(batch.frames.at(-1)!.validAt);
  if (!coverage || at(coverage.validFrom) !== run || at(coverage.validTo) !== end
    || coverage.requestedHorizonHours !== 240 || coverage.endpointInclusive !== true
    || !Number.isFinite(at(coverage.qualifiedAt)) || at(coverage.qualifiedAt) < run
    || at(coverage.qualifiedAt) + 240 * 3_600_000 > end
    || at(coverage.supports240HoursUntil) !== end - 240 * 3_600_000) fail("coverage_invalid");
  return batch;
}

async function readSealed(directory: string, descriptor: CloudFile, maximum: number, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (!path.isAbsolute(directory) || !/^[a-zA-Z0-9.-]+$/u.test(descriptor.file) || descriptor.file === "." || descriptor.file === ".."
    || !validHash(descriptor.sha256) || !Number.isSafeInteger(descriptor.bytes) || descriptor.bytes < 1 || descriptor.bytes > maximum) fail("file_invalid");
  const root = path.resolve(directory), real = await realpath(root);
  const same = process.platform === "win32" ? real.toLowerCase() === root.toLowerCase() : real === root;
  const info = await lstat(path.join(root, descriptor.file));
  if (!same || info.isSymbolicLink() || !info.isFile() || info.size !== descriptor.bytes) fail("file_type_or_size_invalid");
  const bytes = await readFile(path.join(root, descriptor.file), { signal });
  signal?.throwIfAborted();
  if (bytes.length !== descriptor.bytes || hash(bytes) !== descriptor.sha256) fail("file_integrity_invalid");
  return bytes;
}

/** A handle binds one immutable run for an entire consumer operation. No latest
 * reads per point/frame and no GRIB, coordinate warp or image encode on the API.
 * The registry injects one shared read store across every current/retained run;
 * an isolated offline reader owns its store. Neither is a capacity claim. */
export class CloudNumericPublication {
  private readonly shutdown = new AbortController();
  private readonly store: CloudNumericReadStore;
  private readonly ownsStore: boolean;
  private closed = false;
  private draining: Promise<void> | null = null;
  private constructor(readonly directory: string, readonly manifest: CloudBatchManifest, readonly manifestSha256: string,
    store?: CloudNumericReadStore) {
    this.store = store ?? new CloudNumericReadStore();
    this.ownsStore = !store;
  }

  static async open(directory: string, manifestSha256: string, signal?: AbortSignal, store?: CloudNumericReadStore) {
    const file = path.join(directory, "manifest.json"), info = await lstat(file);
    const raw = await readSealed(directory, { file: "manifest.json", bytes: info.size, sha256: manifestSha256 }, 256 * 1024, signal);
    return new CloudNumericPublication(directory, assertCloudBatch(JSON.parse(raw.toString("utf8"))), manifestSha256, store);
  }

  supports240Hours(now: number) {
    return Number.isFinite(now) && now >= at(this.manifest.runAt) && now <= at(this.manifest.coverage.supports240HoursUntil);
  }

  async frame(index: number, signal?: AbortSignal): Promise<CloudNumericFrame> {
    signal?.throwIfAborted();
    if (this.closed || !Number.isInteger(index) || !this.manifest.frames[index]) fail("reader_unavailable");
    const declaration = this.manifest.frames[index]!, size = this.manifest.grid.width * this.manifest.grid.height;
    const readerSignal = signal ? AbortSignal.any([signal, this.shutdown.signal]) : this.shutdown.signal;
    const result = await this.store.read({ manifestSha256: this.manifestSha256, frameIndex: index,
      valuesSha256: declaration.values.sha256, maskSha256: declaration.mask.sha256 }, async controller => {
      const pending = [
        readSealed(this.directory, declaration.values, 4_000_000, controller.signal),
        readSealed(this.directory, declaration.mask, 1_000_000, controller.signal),
      ];
      let bytes: Buffer, mask: Buffer;
      try { [bytes, mask] = await Promise.all(pending) as [Buffer, Buffer]; }
      catch (error) {
        // A failed sibling does not release the local-read slot while another
        // filesystem operation still owns it. Preserve the first failure.
        controller.abort(error);
        await Promise.allSettled(pending);
        throw error;
      }
      const values = new Float32Array(size);
      if (endianness() === "LE") new Uint8Array(values.buffer).set(bytes);
      else for (let i = 0; i < size; i++) values[i] = bytes.readFloatLE(i * 4);
      let valid = 0;
      for (let i = 0; i < size; i++) {
        if (mask[i] === 1 && Number.isFinite(values[i]) && values[i]! >= 0 && values[i]! <= 1) valid++;
        else if (mask[i] !== 0 || !Number.isNaN(values[i])) fail("numeric_mask_invalid");
      }
      if (valid !== declaration.validSamples) fail("valid_sample_count_invalid");
      controller.signal.throwIfAborted();
      return { values, mask };
    }, readerSignal);
    readerSignal.throwIfAborted();
    return result;
  }

  async sample(latitude: number, longitude: number, selectedAt: string, signal?: AbortSignal) {
    const bracket = cloudTimeBracket(this.manifest.frames, this.manifest.runAt, selectedAt);
    if (!bracket) return null;
    const [lower, upper] = await Promise.all([this.frame(bracket.lowerIndex, signal), this.frame(bracket.upperIndex, signal)]);
    this.shutdown.signal.throwIfAborted(); signal?.throwIfAborted();
    return cloudSampleAt({ grid: this.manifest.grid, bracket, lower, upper, latitude, longitude, selectedAt,
      publicationId: this.manifest.publicationId, runAt: this.manifest.runAt });
  }

  close(): Promise<void> {
    if (this.draining) return this.draining;
    this.closed = true;
    this.shutdown.abort(new Error("cloud_publication_closed"));
    // An injected store owns any file work still needed by other handles. The
    // handle only retires its readers; the registry awaits store.close().
    this.draining = this.ownsStore ? this.store.close() : Promise.resolve();
    return this.draining;
  }
}
