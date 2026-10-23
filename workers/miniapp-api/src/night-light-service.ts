import path from "node:path";
import { displayRasterWindowKey, type DisplayRasterWindow, type RasterBounds } from "@starward/coordinate-system";
import { nightLightFixedLegend, type MapLayerData, type Gcj02Point } from "@starward/miniapp-contracts";
import { ComputationCache } from "./computation-cache.ts";
import { SharedReadPool } from "./shared-read-pool.ts";
import type { MiniappRepositoryPort } from "./ports.ts";
import { fixedNightLightDataset, readFixedNightLightInventory, readFixedNightLightProof,
  readFixedNightLightImage, readFixedNightLightPixel, type FixedNightLightDataset, type FixedNightLightInventory,
  type FixedNightLightRaster } from "./night-light-publication.ts";
import { nightLightWindowForBounds, composeNightLightWindow, validateNightLightWindow, type NightLightWindow } from "./night-light-window.ts";
import { PreparedNightLightWindows, type PreparedNightLightPublication } from "./night-light-prepared-window.ts";

type Release = { directory: string; dataset: FixedNightLightDataset; inventory: FixedNightLightInventory; proofs: FixedNightLightRaster[] };
const contains = (outer: RasterBounds, inner: RasterBounds) => outer.west <= inner.west && outer.east >= inner.east && outer.south <= inner.south && outer.north >= inner.north;

export function nightLightUnavailable(datasetVersion: string, failed = false): MapLayerData {
  return { kind: "LIGHT_POLLUTION", cloudLayer: null, polygons: [], legend: [], validAt: null, datasetVersion,
    precision: failed ? "年度卫星夜光读取失败，请重试。" : "当前视窗没有已发布的年度卫星夜光影像。",
    state: "UNAVAILABLE", source: null, ...(failed ? { failureCode: "LIGHT_READ_FAILED" as const } : {}) };
}

/** DB publication is the authority; sealed files alone are never activated.
 * Each dataset keeps its own directory, so prior immutable URLs remain valid.
 * Local numerical/image reads share a two-active-read bound; no remote fetch.
 */
export class NightLightService {
  private readonly cache = new ComputationCache<Release>(8);
  private readonly shutdown = new AbortController();
  private readonly windows = new Map<string, NightLightWindow>();
  private readonly windowReads = new SharedReadPool<NightLightWindow | null>(() => new Error("nightlight_request_cancelled"));
  private readonly prepared: PreparedNightLightWindows | null;
  private cachedImageBytes = 0;
  private activeReads = 0;

  constructor(private readonly repository: Pick<MiniappRepositoryPort, "getPublishedDarkSkyDataset">,
    private readonly root?: string | null, prepared?: PreparedNightLightPublication | null) {
    if (root && !path.isAbsolute(root)) throw new Error("nightlight_publication_root_invalid");
    this.prepared = prepared ? new PreparedNightLightWindows(prepared) : null;
  }

  private async release(version: string, signal?: AbortSignal): Promise<Release | null> {
    this.shutdown.signal.throwIfAborted(); signal?.throwIfAborted();
    if (!/^[a-z0-9][a-z0-9._-]{2,127}$/u.test(version)) {
      if (version === "UNAVAILABLE") return null;
      throw new Error("nightlight_dataset_version_invalid");
    }
    const record = await this.repository.getPublishedDarkSkyDataset(version);
    this.shutdown.signal.throwIfAborted(); signal?.throwIfAborted();
    if (!record) return null;
    const dataset = fixedNightLightDataset(record);
    if (!dataset) return null;
    if (!this.root) throw new Error("nightlight_publication_unconfigured");
    const directory = path.join(this.root, dataset.datasetVersion);
    const result = await this.cache.get(`${version}:${dataset.payload.rasterInventory.sha256}`, async () => {
      const inventory = await readFixedNightLightInventory(directory, dataset, this.shutdown.signal);
      const proofs = new Array<FixedNightLightRaster>(inventory.assets.length);
      const proofReads = new AbortController();
      const proofSignal = AbortSignal.any([this.shutdown.signal, proofReads.signal]);
      let next = 0;
      // Validate every proof before publishing the release. Two metadata reads
      // overlap filesystem waits without changing image/source read admission.
      // A failed proof stops new work; drain both readers before retry can start.
      const readProofs = async () => {
        try {
          while (next < inventory.assets.length) {
            proofSignal.throwIfAborted();
            const index = next++;
            proofs[index] = await readFixedNightLightProof(directory, dataset, inventory.assets[index], proofSignal);
          }
        } catch (error) { proofReads.abort(error); throw error; }
      };
      await Promise.allSettled([readProofs(), readProofs()]);
      proofSignal.throwIfAborted();
      return { directory, dataset, inventory, proofs };
    }, () => Infinity);
    this.shutdown.signal.throwIfAborted(); signal?.throwIfAborted();
    return result;
  }

  private async binaryRead<T>(signal: AbortSignal | undefined, read: (signal: AbortSignal) => Promise<T>) {
    this.shutdown.signal.throwIfAborted(); signal?.throwIfAborted();
    if (this.activeReads >= 2) throw new Error("nightlight_busy_retry");
    this.activeReads++;
    try { return await read(signal ? AbortSignal.any([signal, this.shutdown.signal]) : this.shutdown.signal); }
    finally { this.activeReads--; }
  }

  private async window(release: Release, window: DisplayRasterWindow, signal?: AbortSignal) {
    this.shutdown.signal.throwIfAborted(); signal?.throwIfAborted(); validateNightLightWindow(window);
    const key = `${release.dataset.datasetVersion}:${release.dataset.payload.rasterInventory.sha256}:${displayRasterWindowKey(window)}`;
    const cached = this.windows.get(key);
    if (cached) { this.windows.delete(key); this.windows.set(key, cached); return cached; }
    return this.windowReads.run(key, controller => this.binaryRead(controller.signal, async combined => {
      const result = await this.prepared?.read(release.dataset, release.proofs, window, combined)
        ?? await composeNightLightWindow(release.directory,
          release.dataset.payload.rasterInventory.sha256, release.proofs, window, combined);
      combined.throwIfAborted();
      if (result) {
        const previous = this.windows.get(key);
        if (previous) { this.cachedImageBytes -= previous.bytes.length; this.windows.delete(key); }
        while (this.windows.size >= 8 || this.cachedImageBytes + result.bytes.length > 16 * 1024 * 1024) {
          const oldest = this.windows.keys().next().value!;
          this.cachedImageBytes -= this.windows.get(oldest)!.bytes.length;
          this.windows.delete(oldest);
        }
        this.windows.set(key, result);
        this.cachedImageBytes += result.bytes.length;
      }
      return result;
    }), signal);
  }

  async layer(version: string, bounds: RasterBounds | undefined, signal?: AbortSignal): Promise<MapLayerData | null> {
    const release = await this.release(version, signal);
    if (!release) return null; // schema 1 continues through the original owner.
    if (!bounds) return { ...nightLightUnavailable(version), precision: "正在读取地图实际范围。" };
    const window = nightLightWindowForBounds(release.proofs, bounds);
    if (!window) return nightLightUnavailable(version);
    const result = await this.window(release, window, signal);
    if (!result) return nightLightUnavailable(version);
    const proof = result.proof;
    const counts = proof.quality.qualityMaskCounts;
    const emptyReason = counts["3"] === proof.quality.pixelCount ? "无云有效观测次数不足。"
      : counts["4"] === proof.quality.pixelCount ? "年度夜光源资料缺测。"
      : counts["5"] === proof.quality.pixelCount ? "该范围尚未发布年度夜光资料。" : "有效资料面积不足。";
    const complete = contains(proof.grid.boundsGcj02, bounds) && proof.quality.validPixelCount === proof.quality.pixelCount;
    return { kind: "LIGHT_POLLUTION", cloudLayer: null, polygons: [], legend: nightLightFixedLegend(),
      validAt: release.dataset.source.validFrom, datasetVersion: version, state: complete ? "FRESH" : "PARTIAL", source: release.dataset.source,
      precision: "年度卫星向上辐亮度；主图像元按有效物理面积均值、地点按3×3原始像元面积加权分位数统计，使用同一固定色标。"
        + (proof.quality.validPixelCount === 0 ? emptyReason : complete ? "" : "发布影像含未发布或质量不足的范围，空白不表示夜光为零。") + "不是Bortle、SQM或现场天空实测。",
      raster: { publicationId: proof.publicationId, datasetVersion: version, methodVersion: proof.methodVersion, styleVersion: proof.styleVersion,
        coordinateGrid: "gcj02-mercator-pixel-centres-v1", imageUrl: `/v2/night-light/assets/${encodeURIComponent(version)}/${proof.image.file}`,
        imageBytes: proof.image.bytes, imageSha256: proof.image.sha256, boundsGcj02: proof.grid.boundsGcj02,
        statistic: proof.statistic, unit: "nW/cm²/sr", qualityPolicyVersion: proof.quality.policyVersion,
        validPixelCount: proof.quality.validPixelCount, pixelCount: proof.quality.pixelCount,
        qualitySummary: { availablePixels: counts["1"], partialPixels: counts["2"], insufficientCoveragePixels: counts["3"],
          sourceMissingPixels: counts["4"], unpublishedPixels: counts["5"], insufficientValidAreaPixels: counts["6"] } } };
  }

  async asset(version: string, file: string, signal?: AbortSignal) {
    const fixed = /^nightlight-v2-[a-f0-9]{64}\.png$/u.test(file);
    const composed = /^nightlight-v2-window-(\d{1,2})-(\d{1,4})-(\d{1,4})-([1-3])-([1-3])-([a-f0-9]{64})-([a-f0-9]{64})\.png$/u.exec(file);
    if (!fixed && !composed) return null;
    const release = await this.release(version, signal);
    if (!release) return null;
    if (composed) {
      if (composed[6] !== release.dataset.payload.rasterInventory.sha256) return null;
      const window: DisplayRasterWindow = { grid: "gcj02-mercator-pixel-centres-v1", tilePixels: 256,
        zoom: Number(composed[1]), x: Number(composed[2]), y: Number(composed[3]), columns: Number(composed[4]), rows: Number(composed[5]) };
      try { validateNightLightWindow(window); } catch { return null; }
      const result = await this.window(release, window, signal);
      if (!result || result.proof.image.file !== file) return null;
      return { bytes: result.bytes, publicationId: result.proof.publicationId };
    }
    const proof = release?.proofs.find(value => value.image.file === file);
    if (!proof) return null;
    if (this.prepared) {
      const result = await this.window(release, proof.grid.window, signal);
      return result?.proof.image.file === file ? { bytes: result.bytes, publicationId: result.proof.publicationId } : null;
    }
    return this.binaryRead(signal, async combined => ({ bytes: await readFixedNightLightImage(release.directory, proof, combined), publicationId: proof.publicationId }));
  }

  async pixel(version: string, point: Gcj02Point, signal?: AbortSignal) {
    const release = await this.release(version, signal);
    if (!release) return null;
    const proof = [...release.proofs].sort((a, b) => b.grid.window.zoom - a.grid.window.zoom || a.grid.width * a.grid.height - b.grid.width * b.grid.height)
      .find(value => contains(value.grid.boundsGcj02, { west: point.longitude, east: point.longitude, south: point.latitude, north: point.latitude }));
    if (!proof) return null;
    return this.binaryRead(signal, combined => readFixedNightLightPixel(release.directory, proof, point, combined));
  }

  close() {
    const reason = new Error("nightlight_service_closed");
    this.shutdown.abort(reason); this.windowReads.close(reason);
    this.cache.clear(); this.windows.clear(); this.cachedImageBytes = 0; this.prepared?.close();
  }
}
