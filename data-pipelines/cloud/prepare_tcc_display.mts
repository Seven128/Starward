/** Offline cloud image producer. API requests never call this code. The same
 * scientific owner runs in bounded processes and is shared by batch preparation. */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PNG } from "pngjs";
import { gcj02ToWgs84, displayRasterWindowBounds, displayRasterWindowKey, latitudeForMercatorY, type DisplayRasterWindow } from "@starward/coordinate-system";
import { cloudInstant, cloudTimeBracket, cloudSamplePercent, cloudDisplayRgba, CLOUD_SAMPLING_POLICY,
  createCloudDisplayProof, assertCloudDisplayProof, createCloudDisplayInventory, CLOUD_DISPLAY_STYLE, CLOUD_DISPLAY_COORDINATE_MEANING,
  CLOUD_DISPLAY_MAXIMUM_WINDOWS, CLOUD_DISPLAY_MAXIMUM_TIMES,
  type CloudDisplayWindowDescriptor, type CloudDisplayInventoryRecord } from "@starward/miniapp-contracts";
import { CloudNumericPublication } from "../../workers/miniapp-api/src/cloud-publication.ts";
import { CloudDisplayExecution, canonicalCloudDisplayWindow, validateCloudDisplayBudget,
  type CloudDisplayExecutionBudget, type CloudDisplayExecutionSource, type CloudDisplayRenderResult } from "./cloud-display-execution.mts";
import { CloudDisplayOutput } from "./cloud-display-output.mts";

const hash = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");
const sourceFiles = [import.meta.url, new URL("../../packages/coordinate-system/src/index.ts", import.meta.url).href,
  new URL("../../packages/coordinate-system/src/raster-grid.ts", import.meta.url).href,
  new URL("../../packages/coordinate-system/src/mercator.ts", import.meta.url).href,
  new URL("../../packages/miniapp-contracts/src/cloud-grid.ts", import.meta.url).href,
  new URL("../../packages/miniapp-contracts/src/source-instant.ts", import.meta.url).href,
  new URL("../../packages/miniapp-contracts/src/cloud-display.ts", import.meta.url).href,
  new URL("../../packages/miniapp-contracts/src/utf8-content-integrity.ts", import.meta.url).href];
export const cloudDisplayProcessorHashes = () => Promise.all(sourceFiles.map(async file => hash(await readFile(new URL(file)))));
const assertProcessor = async (expected: readonly string[]) => {
  if (JSON.stringify(await cloudDisplayProcessorHashes()) !== JSON.stringify(expected)) throw Error("cloud_display_processor_changed_during_batch");
};

/** Scientific calculation remains in this file so all new proofs retain the
 * same eight source roles. A process keeps only the current window's geometry
 * and the existing bounded numeric store; it retains no rendered PNG cache. */
export class CloudDisplayRenderSession {
  private geometry: { key: string; latitudes: Float64Array; longitudes: Float64Array } | null = null;
  private busy = false;
  private closed = false;
  private constructor(private readonly publication: CloudNumericPublication, private readonly codeHashes: readonly string[]) {}
  static async open(source: CloudDisplayExecutionSource) {
    await assertProcessor(source.codeHashes);
    const publication = await CloudNumericPublication.open(source.directory, source.manifestSha256);
    return new CloudDisplayRenderSession(publication, [...source.codeHashes]);
  }

  async render(rawWindow: DisplayRasterWindow, rawAt: string): Promise<CloudDisplayRenderResult> {
    if (this.closed || this.busy) throw Error("cloud_display_render_unavailable");
    this.busy = true;
    const started = performance.now(), cpu = process.cpuUsage();
    let sampledPeakRssBytes = process.memoryUsage().rss;
    const sample = () => { sampledPeakRssBytes = Math.max(sampledPeakRssBytes, process.memoryUsage().rss); };
    try {
      await assertProcessor(this.codeHashes);
      const window = canonicalCloudDisplayWindow(rawWindow), selectedAt = cloudInstant(rawAt);
      if (!selectedAt) throw Error("cloud_display_time_invalid");
      const key = displayRasterWindowKey(window), bounds = displayRasterWindowBounds(window);
      const width = window.columns * 256, height = window.rows * 256, scale = 2 ** window.zoom * 256;
      const geometryReused = this.geometry?.key === key;
      if (!geometryReused) {
        const latitudes = new Float64Array(width * height), longitudes = new Float64Array(width * height);
        // Warp every pixel centre through the original coordinate owner.
        for (let row = 0; row < height; row++) {
          const latitude = latitudeForMercatorY((window.y * 256 + row + 0.5) / scale);
          for (let column = 0; column < width; column++) {
            const longitude = (window.x * 256 + column + 0.5) / scale * 360 - 180;
            const point = gcj02ToWgs84({ lat: latitude, lon: longitude, system: "GCJ-02" }), at = row * width + column;
            latitudes[at] = point.lat; longitudes[at] = point.lon;
          }
        }
        this.geometry = { key, latitudes, longitudes };
      }
      sample();
      const { latitudes, longitudes } = this.geometry!;
      const publication = this.publication;
      const bracket = cloudTimeBracket(publication.manifest.frames, publication.manifest.runAt, selectedAt);
      if (!bracket) throw Error("cloud_display_time_unavailable");
      const [lower, upper] = await Promise.all([publication.frame(bracket.lowerIndex), publication.frame(bracket.upperIndex)]);
      const pixels = new PNG({ width, height });
      let validPixels = 0, zeroPixels = 0;
      for (let at = 0; at < latitudes.length; at++) {
        const value = cloudSamplePercent(publication.manifest.grid, bracket, lower, upper, latitudes[at]!, longitudes[at]!);
        if (value !== null) { validPixels++; if (value === 0) zeroPixels++; }
        pixels.data.set(cloudDisplayRgba(value), at * 4);
      }
      sample();
      const png = PNG.sync.write(pixels), imageSha256 = hash(png);
      const source = { ...publication.manifest, manifestSha256: publication.manifestSha256 };
      const descriptor: CloudDisplayWindowDescriptor = { schemaVersion: "starward-cloud-display-window-v1",
        sourceManifestSha256: publication.manifestSha256, sourcePublicationId: publication.manifest.publicationId,
        runAt: publication.manifest.runAt, selectedAt,
        brackets: { lowerAt: bracket.lowerAt, upperAt: bracket.upperAt, fraction: bracket.fraction,
          lowerValuesSha256: publication.manifest.frames[bracket.lowerIndex]!.values.sha256,
          upperValuesSha256: publication.manifest.frames[bracket.upperIndex]!.values.sha256 },
        samplingPolicy: CLOUD_SAMPLING_POLICY, coordinateMeaning: CLOUD_DISPLAY_COORDINATE_MEANING,
        styleVersion: CLOUD_DISPLAY_STYLE, codeHashes: [...this.codeHashes], window, boundsGcj02: bounds,
        width, height, validPixels, zeroPixels, missingPixels: width * height - validPixels, imageSha256 };
      const proof = createCloudDisplayProof(descriptor, png.length, source);
      await assertProcessor(this.codeHashes);
      if (this.closed) throw Error("cloud_display_render_unavailable");
      sample();
      const used = process.cpuUsage(cpu);
      return { png, proof, wallSeconds: (performance.now() - started) / 1000,
        cpuSeconds: (used.user + used.system) / 1e6, sampledPeakRssBytes, geometryReused };
    } finally { this.busy = false; }
  }

  async close() {
    this.closed = true;
    await this.publication.close();
    this.geometry = null;
  }
}

export interface CloudDisplayBatchInput {
  directory: string; manifestSha256: string; output: string;
  windows: readonly DisplayRasterWindow[]; selectedTimes: readonly string[];
  execution: CloudDisplayExecutionBudget;
}
export async function prepareCloudDisplayWindows(input: CloudDisplayBatchInput, options: { signal?: AbortSignal } = {}) {
  const started = performance.now(), cpu = process.cpuUsage();
  let parentSampledPeakRssBytes = process.memoryUsage().rss;
  const sample = () => { parentSampledPeakRssBytes = Math.max(parentSampledPeakRssBytes, process.memoryUsage().rss); };
  const deadline = validateCloudDisplayBudget(input.execution);
  deadline.check(options.signal);
  if (!path.isAbsolute(input.output) || !Array.isArray(input.windows) || input.windows.length < 1 || input.windows.length > CLOUD_DISPLAY_MAXIMUM_WINDOWS
    || !Array.isArray(input.selectedTimes) || input.selectedTimes.length < 1 || input.selectedTimes.length > CLOUD_DISPLAY_MAXIMUM_TIMES)
    throw Error("cloud_display_batch_invalid");
  const root = path.resolve(input.output), relative = path.relative(path.resolve(input.directory), root);
  if (!relative || !relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative))
    throw Error("cloud_display_output_overlaps_source");
  const windows = input.windows.map(canonicalCloudDisplayWindow), times = input.selectedTimes.map(rawAt => {
    const selectedAt = cloudInstant(rawAt);
    if (!selectedAt) throw Error("cloud_display_time_invalid");
    return selectedAt;
  });
  if (new Set(windows.map(displayRasterWindowKey)).size !== windows.length) throw Error("cloud_display_window_invalid");
  if (new Set(times).size !== times.length) throw Error("cloud_display_time_duplicate");
  const publication = await CloudNumericPublication.open(input.directory, input.manifestSha256, options.signal);
  const source = { ...publication.manifest, manifestSha256: input.manifestSha256 };
  try {
    for (const at of times) if (!cloudTimeBracket(source.frames, source.runAt, at)) throw Error("cloud_display_time_unavailable");
  } finally { await publication.close(); }
  deadline.check(options.signal);
  const codeHashes = await cloudDisplayProcessorHashes();
  const output = await CloudDisplayOutput.open(root, input.execution.maximumOutputBytes, deadline, options.signal);
  let executor: CloudDisplayExecution | null = null;
  const results: (CloudDisplayInventoryRecord & { wallSeconds: number })[] = [];
  sample();
  const timer = setInterval(sample, 50);
  let cleanup: { lockReleased: boolean } = { lockReleased: false };
  try {
    executor = new CloudDisplayExecution({ directory: input.directory, manifestSha256: input.manifestSha256, codeHashes }, input.execution);
    // Preserve the original window/time order and its serial reuse. Other
    // authorized callers may share this executor; batch does not flood its queue.
    for (const window of windows) for (const selectedAt of times) {
      const frameStarted = performance.now();
      const rendered = await executor.run(window, selectedAt, options.signal);
      deadline.check(options.signal);
      const proof = assertCloudDisplayProof(rendered.proof, source), file = proof.image.file;
      if (proof.selectedAt !== selectedAt || displayRasterWindowKey(proof.window) !== displayRasterWindowKey(window)
        || JSON.stringify(proof.codeHashes) !== JSON.stringify(codeHashes)
        || rendered.png.length !== proof.image.bytes || hash(rendered.png) !== proof.image.sha256) throw Error("cloud_display_worker_result_mismatch");
      const encodedProof = JSON.stringify(proof, null, 2) + "\n";
      await output.write(file, rendered.png);
      await output.write(file + ".json", encodedProof);
      results.push({ windowKey: displayRasterWindowKey(window), selectedAt, file, bytes: rendered.png.length,
        width: proof.width, height: proof.height, validPixels: proof.validPixels, proofSha256: hash(encodedProof),
        wallSeconds: (performance.now() - frameStarted) / 1000 });
      sample();
    }
    await executor.close(); // includes normal numeric-store drain and real process close
    deadline.check(options.signal);
    await assertProcessor(codeHashes); deadline.check(options.signal);
    const execution = executor.observation();
    if (execution.liveProcesses !== 0 || execution.processExits !== execution.processStarts || !execution.cpuMeasurementComplete)
      throw Error("cloud_display_drain_incomplete");
    const inventory = createCloudDisplayInventory(source, results.map(({ wallSeconds, ...record }) => record));
    sample();
    const used = process.cpuUsage(cpu), parentCpuSeconds = (used.user + used.system) / 1e6;
    const measurement = { wallSeconds: (performance.now() - started) / 1000,
      cpuSeconds: execution.cpuMeasurementComplete ? parentCpuSeconds + execution.cpuSeconds : null, parentCpuSeconds, execution,
      sampledPeakRssBytes: Math.max(parentSampledPeakRssBytes, execution.sampledPeakRssBytes), parentSampledPeakRssBytes,
      wallScope: "producer entry through image writes and actual process drains; excludes final measurement/inventory writes",
      cpuScope: "parent producer entry through drain plus normally exited render-process total CPU; excludes external tsx helper CPU",
      rssSampling: "maximum single-process RSS from 50ms timers and stage boundaries, not an aggregate or native transient peak",
      pngBytes: results.reduce((sum, result) => sum + result.bytes, 0), results, inventory };
    await output.write("measurement-" + Date.now() + ".json", JSON.stringify(measurement, null, 2) + "\n");
    const outputUsage = await output.sealInventory(JSON.stringify(inventory, null, 2) + "\n");
    cleanup = await output.release();
    return { ...measurement, outputUsage, retainedOutput: output.usage(), cleanup };
  } finally {
    clearInterval(timer);
    await executor?.close();
    if (!cleanup.lockReleased) await output.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [spec] = process.argv.slice(2);
  if (!spec) throw Error("Usage: prepare_tcc_display.mts <batch-spec.json>");
  const controller = new AbortController();
  const interrupt = () => controller.abort(Error("cloud_display_batch_interrupted"));
  process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
  try {
    const result = await prepareCloudDisplayWindows(JSON.parse(await readFile(spec, "utf8")), { signal: controller.signal });
    console.log(JSON.stringify({ windows: result.results.length, pngBytes: result.pngBytes, wallSeconds: result.wallSeconds,
      cpuSeconds: result.cpuSeconds, parentCpuSeconds: result.parentCpuSeconds, sampledPeakRssBytes: result.sampledPeakRssBytes,
      execution: result.execution, outputUsage: result.outputUsage, retainedOutput: result.retainedOutput,
      cleanup: result.cleanup, publicationId: result.inventory.publicationId }));
  } finally { process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt); }
}
