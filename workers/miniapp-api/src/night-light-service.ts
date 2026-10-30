import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { displayRasterWindowKey, type DisplayRasterWindow, type RasterBounds } from "@starward/coordinate-system";
import { NIGHT_LIGHT_CONTRAST_DISPLAY, NIGHT_LIGHT_LEGACY_DISPLAY, isNightLightDisplayStyle, nightLightDisplayLegend,
  type NightLightDisplayStyle, type MapLayerData, type Gcj02Point } from "@starward/miniapp-contracts";
import { ComputationCache } from "./computation-cache.ts";
import { SharedReadPool } from "./shared-read-pool.ts";
import type { MiniappRepositoryPort } from "./ports.ts";
import { fixedNightLightDataset, shardedNightLightDataset, readFixedNightLightInventory, readFixedNightLightProof,
  readFixedNightLightImage, readFixedNightLightPixel, type FixedNightLightDataset, type FixedNightLightInventory,
  type FixedNightLightRaster, type ShardedNightLightDataset } from "./night-light-publication.ts";
import { ShardedNightLightPublication } from "./night-light-sharded-publication.ts";
import { nightLightWindowForBounds, composeNightLightWindow, validateNightLightWindow, type NightLightWindow } from "./night-light-window.ts";
import { PreparedNightLightWindows, type PreparedNightLightPublication } from "./night-light-prepared-window.ts";
import { projectNightLightDisplay } from "./night-light-display-image.ts";

type FixedRelease = { kind: "FIXED"; directory: string; dataset: FixedNightLightDataset; inventory: FixedNightLightInventory; proofs: FixedNightLightRaster[] };
type ShardedMetadata = Awaited<ReturnType<ShardedNightLightPublication["metadata"]>>;
type ShardedRelease = { kind: "SHARDED"; directory: string; dataset: ShardedNightLightDataset;
  publication: ShardedNightLightPublication; metadata: ShardedMetadata };
type Release = FixedRelease | ShardedRelease;
const contains = (outer: RasterBounds, inner: RasterBounds) => outer.west <= inner.west && outer.east >= inner.east && outer.south <= inner.south && outer.north >= inner.north;

function assertShardedBinding(dataset: ShardedNightLightDataset, metadata: ShardedMetadata) {
  const payload = dataset.payload, reference = payload.shardedIndex;
  if (metadata.datasetVersion !== dataset.datasetVersion || metadata.indexVersion !== reference.indexVersion
    || !isDeepStrictEqual(metadata.index, { file: reference.file, bytes: reference.bytes, sha256: reference.sha256 })
    || !isDeepStrictEqual(metadata.source, dataset.source)
    || metadata.radianceSha256 !== dataset.radianceSha256 || metadata.coverageSha256 !== dataset.coverageSha256
    || metadata.methodVersion !== payload.methodVersion || metadata.styleVersion !== payload.styleVersion
    || metadata.policySha256 !== payload.policySha256 || metadata.minimumCloudFreeObservations !== payload.minimumCloudFreeObservations
    || metadata.coverage !== payload.coverage) throw new Error("nightlight_sharded_database_root_mismatch");
}

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
  /** Only pending root discovery owns uncancelled shared metadata I/O. Once
   * cached, a prepared reader holds no handle/subscription; its calls receive
   * this service's existing shutdown/binary-read signal. */
  private readonly shardedDiscovery = new Set<ShardedNightLightPublication>();
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
    if ((record.payload as { schemaVersion?: unknown } | null)?.schemaVersion === 3) {
      const dataset = shardedNightLightDataset(record);
      if (!this.root) throw new Error("nightlight_publication_unconfigured");
      const directory = path.join(this.root, dataset.datasetVersion), reference = dataset.payload.shardedIndex;
      const pin = { file: reference.file, bytes: reference.bytes, sha256: reference.sha256 };
      const result = await this.cache.get(`${version}:sharded:${reference.sha256}`, async () => {
        const publication = new ShardedNightLightPublication(directory, pin);
        this.shardedDiscovery.add(publication);
        try {
          const metadata = await this.binaryRead(this.shutdown.signal, combined => publication.metadata(combined));
          assertShardedBinding(dataset, metadata);
          return { kind: "SHARDED" as const, directory, dataset, publication, metadata };
        } catch (error) { publication.close(); throw error; }
        finally { this.shardedDiscovery.delete(publication); }
      }, () => Infinity);
      this.shutdown.signal.throwIfAborted(); signal?.throwIfAborted();
      // The root is immutable, but every call must still agree with its current
      // DB authority. A cache hit cannot hide a drifted publication record.
      if (result.kind !== "SHARDED") throw new Error("nightlight_sharded_database_root_mismatch");
      assertShardedBinding(dataset, result.metadata);
      return result;
    }
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
      return { kind: "FIXED" as const, directory, dataset, inventory, proofs };
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

  private async window(release: FixedRelease, window: DisplayRasterWindow, signal?: AbortSignal,
    displayStyle: NightLightDisplayStyle = NIGHT_LIGHT_LEGACY_DISPLAY) {
    this.shutdown.signal.throwIfAborted(); signal?.throwIfAborted(); validateNightLightWindow(window);
    if (!isNightLightDisplayStyle(displayStyle)) throw new Error("nightlight_display_style_invalid");
    const key = `${release.dataset.datasetVersion}:${release.dataset.payload.rasterInventory.sha256}:${displayRasterWindowKey(window)}:${displayStyle}`;
    const cached = this.windows.get(key);
    if (cached) { this.windows.delete(key); this.windows.set(key, cached); return cached; }
    return this.windowReads.run(key, controller => this.binaryRead(controller.signal, async combined => {
      const prepared = await this.prepared?.read(release.dataset, release.proofs, window, combined);
      const result = prepared ? projectNightLightDisplay(prepared, release.dataset.payload.rasterInventory.sha256, displayStyle, combined)
        : await composeNightLightWindow(release.directory,
          release.dataset.payload.rasterInventory.sha256, release.proofs, window, combined, displayStyle);
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

  async layer(version: string, bounds: RasterBounds | undefined, signal?: AbortSignal,
    displayStyle: NightLightDisplayStyle = NIGHT_LIGHT_LEGACY_DISPLAY): Promise<MapLayerData | null> {
    if (!isNightLightDisplayStyle(displayStyle)) throw new Error("nightlight_display_style_invalid");
    const release = await this.release(version, signal);
    if (!release) return null; // schema 1 continues through the original owner.
    if (release.kind === "SHARDED") throw new Error("nightlight_sharded_static_delivery_capability_not_ready");
    if (!bounds) return { ...nightLightUnavailable(version), precision: "正在读取地图实际范围。" };
    const window = nightLightWindowForBounds(release.proofs, bounds);
    if (!window) return nightLightUnavailable(version);
    const result = await this.window(release, window, signal, displayStyle);
    if (!result) return nightLightUnavailable(version);
    const proof = result.proof;
    const counts = proof.quality.qualityMaskCounts;
    const emptyReason = counts["3"] === proof.quality.pixelCount ? "无云有效观测次数不足。"
      : counts["4"] === proof.quality.pixelCount ? "年度夜光源资料缺测。"
      : counts["5"] === proof.quality.pixelCount ? "该范围尚未发布年度夜光资料。" : "有效资料面积不足。";
    const complete = contains(proof.grid.boundsGcj02, bounds) && proof.quality.validPixelCount === proof.quality.pixelCount;
    return { kind: "LIGHT_POLLUTION", cloudLayer: null, polygons: [], legend: nightLightDisplayLegend(displayStyle),
      validAt: release.dataset.source.validFrom, datasetVersion: version, state: complete ? "FRESH" : "PARTIAL", source: release.dataset.source,
      precision: "年度卫星向上辐亮度；主图像元按有效物理面积均值、地点按3×3原始像元面积加权分位数统计，"
        + "使用同一固定分级阈值。"
        + (proof.quality.validPixelCount === 0 ? emptyReason : complete ? "" : "发布影像含未发布或质量不足的范围，空白不表示夜光为零。") + "不是Bortle、SQM或现场天空实测。",
      raster: { publicationId: proof.publicationId, datasetVersion: version, methodVersion: proof.methodVersion, styleVersion: proof.styleVersion,
        ...(proof.displaySource ? { displaySource: proof.displaySource } : {}),
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
    const contrast = /^nightlight-contrast-v1-window-(\d{1,2})-(\d{1,4})-(\d{1,4})-([1-3])-([1-3])-([a-f0-9]{64})-([a-f0-9]{64})\.png$/u.exec(file);
    if (!fixed && !composed && !contrast) return null;
    const release = await this.release(version, signal);
    if (!release) return null;
    if (release.kind === "SHARDED") throw new Error("nightlight_sharded_static_delivery_capability_not_ready");
    const parsedWindow = contrast ?? composed;
    if (parsedWindow) {
      if (parsedWindow[6] !== release.dataset.payload.rasterInventory.sha256) return null;
      const window: DisplayRasterWindow = { grid: "gcj02-mercator-pixel-centres-v1", tilePixels: 256,
        zoom: Number(parsedWindow[1]), x: Number(parsedWindow[2]), y: Number(parsedWindow[3]), columns: Number(parsedWindow[4]), rows: Number(parsedWindow[5]) };
      try { validateNightLightWindow(window); } catch { return null; }
      const result = await this.window(release, window, signal, contrast ? NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion : NIGHT_LIGHT_LEGACY_DISPLAY);
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
    if (release.kind === "SHARDED") return this.binaryRead(signal, combined => release.publication.pixel(point, combined));
    const proof = [...release.proofs].sort((a, b) => b.grid.window.zoom - a.grid.window.zoom || a.grid.width * a.grid.height - b.grid.width * b.grid.height)
      .find(value => contains(value.grid.boundsGcj02, { west: point.longitude, east: point.longitude, south: point.latitude, north: point.latitude }));
    if (!proof) return null;
    return this.binaryRead(signal, combined => readFixedNightLightPixel(release.directory, proof, point, combined));
  }

  /** Internal discovery, not an HTTP/static publication. A selected DB record
   * must match the pinned root; the result still has no URL or image bytes. */
  async preparedWindow(version: string, key: string, signal?: AbortSignal) {
    const release = await this.release(version, signal);
    if (!release || release.kind !== "SHARDED") return null;
    return this.binaryRead(signal, combined => release.publication.window(key, combined));
  }

  /** Same DB authority and bounded read owner as exact discovery. The selected
   * cover keeps its actual bounds/LOD; this does not make a public layer ready. */
  async preparedCoveringWindow(version: string, key: string, signal?: AbortSignal) {
    const release = await this.release(version, signal);
    if (!release || release.kind !== "SHARDED") return null;
    return this.binaryRead(signal, combined => release.publication.coveringWindow(key, combined));
  }

  /** Internal prepared pixels only. A sealed static window may span parts;
   * public layer/asset readiness and URL authority remain unchanged. */
  async preparedDisplayWindow(version: string, window: DisplayRasterWindow, signal?: AbortSignal) {
    validateNightLightWindow(window);
    const release = await this.release(version, signal);
    if (!release || release.kind !== "SHARDED") return null;
    return this.binaryRead(signal, async combined => {
      const prepared = await this.prepared?.readSharded(release.publication, window, combined);
      if (prepared) return { authority: "PREPARED_ONLY" as const, indexVersion: release.metadata.indexVersion,
        indexSha256: release.metadata.index.sha256, ...prepared };
      const original = await release.publication.coveringDisplay(displayRasterWindowKey(window), combined);
      return original ? { authority: "PREPARED_ONLY" as const, indexVersion: original.prepared.indexVersion,
        indexSha256: original.prepared.indexSha256, proof: original.prepared.displayProof, bytes: original.bytes } : null;
    });
  }

  close() {
    const reason = new Error("nightlight_service_closed");
    this.shutdown.abort(reason); this.windowReads.close(reason);
    for (const publication of this.shardedDiscovery) publication.close();
    this.shardedDiscovery.clear();
    this.cache.clear(); this.windows.clear(); this.cachedImageBytes = 0; this.prepared?.close();
  }
}
