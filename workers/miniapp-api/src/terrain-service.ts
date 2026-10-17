import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TerrainOverlayRequest, TerrainHorizonRequest } from "@starward/miniapp-contracts";
import { ComputationCache } from "./computation-cache.ts";
import { terrainImageUrl, terrainPublication, terrainRequestIsCovered, validateTerrainAsset, validateTerrainPublication,
  type TerrainPublication } from "./terrain-publication.ts";
import { renderTerrain } from "./terrain-renderer.ts";
import { createTerrainViewportRenderer } from "./terrain-viewport-renderer.ts";
import { normalizeTerrainRequest, terrainRequestKey, validateTerrainRequest, terrainLocationIsSupported,
  terrainWindowViewport, terrainWindowRequest, terrainFixedRequest, TERRAIN_RENDER_VERSION, TERRAIN_LEGACY_MAP_RENDER_VERSION,
  type RenderedTerrain, type TerrainRenderer, type TerrainRenderRequest } from "./terrain-request.ts";
import { DISPLAY_RASTER_GRID, type DisplayRasterRegion } from "@starward/coordinate-system";
import type { TerrainRenderMeasurement } from "./terrain-viewport-renderer.ts";
import { renderTerrainWindow } from "./terrain-window-renderer.ts";
import { readTerrainFixedInventory, readTerrainFixedAsset, type TerrainFixedInventory } from "./terrain-fixed-publication.ts";
import { HORIZON_METHOD, HORIZON_RADIUS_M, readTerrainHorizonModel, type TerrainHorizonResult } from "./terrain-horizon-model.ts";

export interface TerrainPort {
  getPublication(input: TerrainOverlayRequest, signal?: AbortSignal): Promise<TerrainPublication | null>;
  getHorizon(input: TerrainHorizonRequest, signal?: AbortSignal): Promise<TerrainHorizonResult>;
  getAsset(file: string, signal?: AbortSignal): Promise<{ bytes: Buffer; publicationId: string }>;
  close(): void;
}

const assetPattern = /^glo30-cn-(v1|v2-map|v3-map)-(\d+)-(\d+)-(\d+)-([a-f0-9]{64})\.png$/u;
const viewportAssetPattern = /^terrarium-cn-v1-map-(\d+)-(\d+)-(\d+)-(\d+)-(\d+)-(\d+)-([a-f0-9]{64})\.png$/u;
const fixedAssetPattern = /^terrarium-cn-v2-fixed-(\d{1,2})-(\d+)-(\d+)-(1|2|4)-([a-f0-9]{64})-([a-f0-9]{64})\.png$/u;
const windowAssetPattern = /^terrarium-cn-v2-window-(\d{1,2})-(\d+)-(\d+)-([1-5])-([1-5])-([a-f0-9]{64})-([a-f0-9]{64})\.png$/u;
const ttlMs = 24 * 60 * 60_000;
type TerrainRead<T> = { controller: AbortController; consumers: Set<symbol>; promise: Promise<T> };

/** One Map/Spot source owner; each purpose has its own immutable presentation.
 * The bundled elevation-colour publication remains available to Spot/old URLs. */
export class TerrainService implements TerrainPort {
  private readonly cache = new ComputationCache<RenderedTerrain | null>(16);
  private readonly horizonCache = new ComputationCache<TerrainHorizonResult>(16);
  private readonly directory: string;
  private readonly publishedDirectory: string | undefined;
  private inventory: Promise<TerrainFixedInventory> | undefined;
  private readonly renderer: TerrainRenderer;
  private readonly horizonRenderer: typeof readTerrainHorizonModel;
  private readonly closeRenderer: () => void;
  private readonly active = new Set<AbortController>();
  private readonly compositions = new Set<AbortController>();
  private readonly readers = new Map<string, TerrainRead<RenderedTerrain | null>>();
  private readonly horizonReaders = new Map<string, TerrainRead<TerrainHorizonResult>>();
  private cacheWrite: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(options: { directory?: string; publishedDirectory?: string; renderer?: TerrainRenderer;
    horizonRenderer?: typeof readTerrainHorizonModel; measured?: (value: TerrainRenderMeasurement) => void } = {}) {
    const workspace = createHash("sha256").update(process.cwd()).digest("hex").slice(0, 12);
    this.directory = options.directory ?? path.join(tmpdir(), `starward-terrain-${workspace}-${TERRAIN_RENDER_VERSION}`);
    this.publishedDirectory = options.publishedDirectory;
    const viewport = options.renderer ? null : createTerrainViewportRenderer(fetch, options.measured);
    this.renderer = options.renderer ?? ((input, signal) => input.viewportBounds ? viewport!.render(input, signal) : renderTerrain(input, signal));
    this.horizonRenderer = options.horizonRenderer ?? readTerrainHorizonModel;
    this.closeRenderer = () => viewport?.close();
  }

  async getPublication(input: TerrainOverlayRequest, signal?: AbortSignal) {
    signal?.throwIfAborted();
    validateTerrainRequest(input);
    if (!terrainLocationIsSupported(input)) return null;
    const bundled = await terrainPublication().catch(() => null);
    signal?.throwIfAborted();
    if (input.purpose === "SPOT" && bundled && terrainRequestIsCovered(bundled, input)) return bundled;
    return (await this.resolve(input.viewportBounds ? terrainWindowViewport(input) : input, signal))?.publication ?? null;
  }

  async getHorizon(input: TerrainHorizonRequest, signal?: AbortSignal) {
    const request = { purpose: "SPOT" as const, center: input.center, radiusKm: HORIZON_RADIUS_M / 1000 };
    validateTerrainRequest(request);
    signal?.throwIfAborted();
    if (this.closed) throw new Error("terrain_service_closed");
    if (!terrainLocationIsSupported(request)) return null;
    const center = normalizeTerrainRequest(request).center;
    const key = `${HORIZON_METHOD}:${center.latitude}:${center.longitude}`;
    const result = await this.sharedRead(key, this.horizonReaders, controller => this.horizonCache.get(key,
      () => this.runBounded(controller, this.active, () => this.horizonRenderer(center, controller.signal)),
      value => Date.now() + (value?.status === "COMPLETE" ? ttlMs : value?.sourceIssues.some(issue => issue.reason === "READ_FAILED") ? 0
        : !value || value.sourceIssues.length ? 60_000 : ttlMs)), signal);
    // Small metadata only; callers cannot mutate a future reader's cached model.
    return structuredClone(result);
  }

  /** Offline publisher prepares bounded units before composing a release view;
   * each unit still uses the normal cancellation, deadline and asset owner. */
  async prepareFixedCell(region: DisplayRasterRegion, signal?: AbortSignal) {
    const input = terrainFixedRequest(region);
    if (region.span !== 1) throw new Error("terrain_fixed_cell_required");
    if (!terrainLocationIsSupported(input)) return null;
    return (await this.resolve(input, signal))?.publication ?? null;
  }

  private resolve(input: TerrainRenderRequest, signal?: AbortSignal): Promise<RenderedTerrain | null> {
    input = normalizeTerrainRequest(input);
    const key = terrainRequestKey(input);
    return this.sharedRead(key, this.readers, controller => this.cache.get(key, () => this.compute(input, controller),
      result => Date.now() + (result?.publication.sourceIssues?.some(issue => issue.reason !== "NOT_FOUND") ? 0
        : result && result.publication.unavailableSourceTiles.length === 0 ? ttlMs : 60_000)), signal);
  }

  private sharedRead<T>(key: string, readers: Map<string, TerrainRead<T>>,
    read: (controller: AbortController) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (this.closed) throw new Error("terrain_service_closed");
    signal?.throwIfAborted();
    const pending = readers.get(key);
    // Let a fully abandoned source read release its slot/cache promise before
    // a new reader of the same identity starts; never inherit its cancellation.
    if (pending?.controller.signal.aborted)
      return pending.promise.catch(() => null).then(() => this.sharedRead(key, readers, read, signal));
    let job = pending;
    if (!pending) {
      const controller = new AbortController();
      const promise = read(controller);
      const owned: TerrainRead<T> = { controller, consumers: new Set<symbol>(), promise: promise.finally(() => {
        if (readers.get(key) === owned) readers.delete(key);
      }) };
      readers.set(key, owned);
      job = owned;
    }
    const shared = job!;
    const consumer = Symbol();
    shared.consumers.add(consumer);
    return new Promise((resolve, reject) => {
      const cleanup = () => { signal?.removeEventListener("abort", cancel); shared.consumers.delete(consumer); };
      const cancel = () => {
        cleanup();
        if (shared.consumers.size === 0) shared.controller.abort(new Error("terrain_request_cancelled"));
        reject(signal?.reason ?? new Error("terrain_request_cancelled"));
      };
      signal?.addEventListener("abort", cancel, { once: true });
      shared.promise.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
      if (signal?.aborted) cancel();
    });
  }

  private async compute(input: TerrainRenderRequest, controller: AbortController) {
    controller.signal.throwIfAborted();
    const cached = await this.readCached(input);
    controller.signal.throwIfAborted();
    if (cached) return cached;
    const jobs = input.fixedWindow ? this.compositions : this.active;
    return this.runBounded(controller, jobs, async () => {
      const result = input.fixedWindow ? await renderTerrainWindow(input, controller.signal, (request, signal) => this.resolve(request, signal))
        : await this.renderer(input, controller.signal);
      controller.signal.throwIfAborted();
      if (result) {
        validateTerrainPublication(result.publication);
        validateTerrainAsset(result.bytes, result.publication);
        const write = this.cacheWrite.then(() => this.writeCached(input, result));
        this.cacheWrite = write.catch(() => { console.warn("terrain_cache_write_failed"); });
        await this.cacheWrite;
      }
      return result;
    });
  }

  private async runBounded<T>(controller: AbortController, jobs: Set<AbortController>, read: () => Promise<T>) {
    controller.signal.throwIfAborted();
    if (jobs.size >= 2) throw new Error("terrain_busy_retry");
    jobs.add(controller);
    // Preserve the existing source budget and headroom below the client's 18s timeout.
    const timer = setTimeout(() => controller.abort(new Error("terrain_source_deadline_exceeded")), 16_000);
    try {
      const result = await read();
      controller.signal.throwIfAborted();
      return result;
    } finally { clearTimeout(timer); jobs.delete(controller); }
  }

  private async readCached(input: TerrainRenderRequest): Promise<RenderedTerrain | null> {
    if (this.publishedDirectory && (input.fixedRaster || input.fixedWindow)) {
      this.inventory ??= readTerrainFixedInventory(this.publishedDirectory).catch(error => { this.inventory = undefined; throw error; });
      const entry = (await this.inventory).assets.find(asset => asset.key === terrainRequestKey(input));
      if (entry) return readTerrainFixedAsset(this.publishedDirectory, entry);
    }
    try {
      const manifest = path.join(this.directory, `${terrainRequestKey(input)}.json`);
      if (Date.now() - (await stat(manifest)).mtimeMs > ttlMs) return null;
      const publication = validateTerrainPublication(JSON.parse(await readFile(manifest, "utf8")));
      if (!terrainRequestIsCovered(publication, input) || publication.unavailableSourceTiles.length) return null;
      const bytes = validateTerrainAsset(await readFile(path.join(this.directory, publication.image.file)), publication);
      return { publication, bytes };
    } catch (error) {
      // A regenerable cache miss or damaged entry cannot disable the source.
      if (this.closed) throw error;
      return null;
    }
  }

  private async writeCached(input: TerrainRenderRequest, result: RenderedTerrain) {
    await mkdir(this.directory, { recursive: true });
    const image = path.join(this.directory, result.publication.image.file);
    const manifest = path.join(this.directory, `${terrainRequestKey(input)}.json`);
    const imageManifest = path.join(this.directory, `${result.publication.image.file}.json`);
    const temporary = `${manifest}.${randomUUID()}.tmp`;
    const imageTemporary = `${imageManifest}.${randomUUID()}.tmp`;
    try {
      await writeFile(image, result.bytes);
      const proof = JSON.stringify(result.publication);
      await writeFile(imageTemporary, proof);
      await rename(imageTemporary, imageManifest);
      await writeFile(temporary, proof);
      await rename(temporary, manifest);
      await this.prune(image, manifest, imageManifest);
    } finally { await rm(temporary, { force: true }); await rm(imageTemporary, { force: true }); }
  }

  private async prune(image: string, manifest: string, imageManifest: string) {
    const entries = await Promise.all((await readdir(this.directory)).filter(file => /\.(?:png|json)$/u.test(file)).map(async file => {
      const full = path.join(this.directory, file), info = await stat(full);
      return { full, size: info.size, at: info.mtimeMs };
    }));
    let bytes = entries.reduce((sum, item) => sum + item.size, 0);
    for (const entry of entries.sort((a, b) => a.at - b.at)) {
      if (bytes <= 128 * 1024 * 1024) break;
      if (entry.full === image || entry.full === manifest || entry.full === imageManifest) continue;
      await rm(entry.full, { force: true }); bytes -= entry.size;
    }
  }

  async getAsset(file: string, signal?: AbortSignal) {
    signal?.throwIfAborted();
    const bundled = await terrainPublication().catch(() => null);
    signal?.throwIfAborted();
    if (bundled && file === bundled.image.file) return { bytes: validateTerrainAsset(await readFile(terrainImageUrl(file)), bundled), publicationId: bundled.publicationId };
    const match = assetPattern.exec(file), viewport = viewportAssetPattern.exec(file), fixed = fixedAssetPattern.exec(file), window = windowAssetPattern.exec(file);
    if (!match && !viewport && !fixed && !window) throw new Error("terrain_asset_not_found");
    if (this.publishedDirectory && (fixed || window)) {
      this.inventory ??= readTerrainFixedInventory(this.publishedDirectory).catch(error => { this.inventory = undefined; throw error; });
      const inventory = await this.inventory;
      const entry = [...inventory.assets, ...(inventory.retainedAssets ?? [])].find(asset => asset.file === file);
      if (entry) {
        const result = await readTerrainFixedAsset(this.publishedDirectory, entry);
        signal?.throwIfAborted();
        return { bytes: result.bytes, publicationId: result.publication.publicationId };
      }
    }
    const input: TerrainRenderRequest = window ? terrainWindowRequest({ grid: DISPLAY_RASTER_GRID, tilePixels: 256,
      zoom: Number(window[1]), x: Number(window[2]), y: Number(window[3]), columns: Number(window[4]), rows: Number(window[5]) }) : fixed ? terrainFixedRequest({ grid: DISPLAY_RASTER_GRID, tilePixels: 256,
      zoom: Number(fixed[1]), x: Number(fixed[2]), y: Number(fixed[3]), span: Number(fixed[4]) as 1 | 2 | 4 }) : viewport ? { purpose: "MAP",
      center: { system: "GCJ02", latitude: (Number(viewport[1]) - 90e7) / 1e7, longitude: (Number(viewport[2]) - 180e7) / 1e7 },
      viewportBounds: { west: (Number(viewport[3]) - 180e7) / 1e7, south: (Number(viewport[4]) - 90e7) / 1e7,
        east: (Number(viewport[5]) - 180e7) / 1e7, north: (Number(viewport[6]) - 90e7) / 1e7 },
    } : { purpose: match![1] === "v1" ? "SPOT" : "MAP",
      ...(match![1] === "v2-map" ? { renderVersion: TERRAIN_LEGACY_MAP_RENDER_VERSION } : {}),
      center: { system: "GCJ02", latitude: Number(match![2]) / 1e7, longitude: Number(match![3]) / 1e7 }, radiusKm: Number(match![4]) / 1000 };
    validateTerrainRequest(input);
    if (!terrainLocationIsSupported(input)) throw new Error("terrain_asset_not_found");
    // Metadata freshness controls when to read the source again; it cannot
    // invalidate already-published immutable bytes, including a partial image.
    // Retain a per-image proof when the current viewport manifest advances.
    for (const manifest of [`${file}.json`, `${terrainRequestKey(input)}.json`]) {
      try {
        const publication = validateTerrainPublication(JSON.parse(await readFile(path.join(this.directory, manifest), "utf8")));
        if (publication.image.file !== file || !terrainRequestIsCovered(publication, input)) continue;
        const bytes = validateTerrainAsset(await readFile(path.join(this.directory, file)), publication);
        signal?.throwIfAborted();
        return { bytes, publicationId: publication.publicationId };
      } catch { signal?.throwIfAborted(); }
    }
    // Recover an evicted asset from its bounded request identity. Never serve
    // regenerated different bytes under an immutable previous image URL.
    // Resolve the filename's presentation directly. In-region legacy dynamic
    // URLs must not be substituted by today's bundled or Map publication.
    const result = await this.resolve(input, signal);
    if (!result || result.publication.image.file !== file) throw new Error("terrain_asset_not_found");
    return { bytes: validateTerrainAsset(result.bytes, result.publication), publicationId: result.publication.publicationId };
  }

  close() {
    this.closed = true;
    for (const job of this.readers.values()) job.controller.abort(new Error("terrain_service_closed"));
    for (const job of this.horizonReaders.values()) job.controller.abort(new Error("terrain_service_closed"));
    this.closeRenderer();
    this.cache.clear();
    this.horizonCache.clear();
  }
}
