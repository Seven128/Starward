import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { ComputationCache } from "./computation-cache.ts";
import { terrainImageUrl, terrainPublication, terrainRequestIsCovered, validateTerrainAsset, validateTerrainPublication,
  type TerrainPublication } from "./terrain-publication.ts";
import { normalizeTerrainRequest, renderTerrain, terrainRequestKey, TERRAIN_RENDER_VERSION, type RenderedTerrain, type TerrainRenderer } from "./terrain-renderer.ts";

export interface TerrainPort {
  getPublication(input: TerrainOverlayRequest): Promise<TerrainPublication | null>;
  getAsset(file: string): Promise<{ bytes: Buffer; publicationId: string }>;
  close(): void;
}

const assetPattern = /^glo30-cn-v1-(\d+)-(\d+)-(\d+)-([a-f0-9]{64})\.png$/u;
const ttlMs = 24 * 60 * 60_000;

/** Shared Map/Spot source and asset owner. The bundled publication remains
 * compatible; all other supported domestic coordinates use the same renderer. */
export class TerrainService implements TerrainPort {
  private readonly cache = new ComputationCache<RenderedTerrain | null>(16);
  private readonly directory: string;
  private readonly renderer: TerrainRenderer;
  private readonly active = new Set<AbortController>();
  private cacheWrite: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(options: { directory?: string; renderer?: TerrainRenderer } = {}) {
    const workspace = createHash("sha256").update(process.cwd()).digest("hex").slice(0, 12);
    this.directory = options.directory ?? path.join(tmpdir(), `starward-terrain-${workspace}-${TERRAIN_RENDER_VERSION}`);
    this.renderer = options.renderer ?? renderTerrain;
  }

  async getPublication(input: TerrainOverlayRequest) {
    const bundled = await terrainPublication().catch(() => null);
    if (bundled && terrainRequestIsCovered(bundled, input)) return bundled;
    if (input.center.latitude < 0.8293 || input.center.latitude > 55.8271
      || input.center.longitude < 72.004 || input.center.longitude > 137.8347) return null;
    if (!Number.isFinite(input.radiusKm) || input.radiusKm < 2 || input.radiusKm > 50) throw new Error("terrain_overlay_request_invalid");
    return (await this.resolve(input))?.publication ?? null;
  }

  private resolve(input: TerrainOverlayRequest) {
    input = normalizeTerrainRequest(input);
    if (this.closed) throw new Error("terrain_service_closed");
    return this.cache.get(terrainRequestKey(input), async () => {
      const cached = await this.readCached(input);
      if (cached) return cached;
      // Do not let unrelated viewport changes create unbounded DEM work.
      // A later ordinary retry shares any completed result for its identity.
      if (this.active.size >= 2) throw new Error("terrain_busy_retry");
      const controller = new AbortController();
      this.active.add(controller);
      // Leave transport headroom below the client's 18 s terrain-only timeout.
      const timer = setTimeout(() => controller.abort(new Error("terrain_source_deadline_exceeded")), 16_000);
      try {
        const result = await this.renderer(input, controller.signal);
        controller.signal.throwIfAborted();
        if (result) {
          validateTerrainPublication(result.publication);
          validateTerrainAsset(result.bytes, result.publication);
          const write = this.cacheWrite.then(() => this.writeCached(input, result));
          this.cacheWrite = write.catch(() => { console.warn("terrain_cache_write_failed"); });
          await this.cacheWrite;
        }
        return result;
      } finally { clearTimeout(timer); this.active.delete(controller); }
    }, result => Date.now() + (result && result.publication.unavailableSourceTiles.length === 0 ? ttlMs : 60_000));
  }

  private async readCached(input: TerrainOverlayRequest): Promise<RenderedTerrain | null> {
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

  private async writeCached(input: TerrainOverlayRequest, result: RenderedTerrain) {
    await mkdir(this.directory, { recursive: true });
    const image = path.join(this.directory, result.publication.image.file);
    const manifest = path.join(this.directory, `${terrainRequestKey(input)}.json`);
    const temporary = `${manifest}.${randomUUID()}.tmp`;
    try {
      await writeFile(image, result.bytes);
      await writeFile(temporary, JSON.stringify(result.publication));
      await rename(temporary, manifest);
      await this.prune(image, manifest);
    } finally { await rm(temporary, { force: true }); }
  }

  private async prune(image: string, manifest: string) {
    const entries = await Promise.all((await readdir(this.directory)).filter(file => /\.(?:png|json)$/u.test(file)).map(async file => {
      const full = path.join(this.directory, file), info = await stat(full);
      return { full, size: info.size, at: info.mtimeMs };
    }));
    let bytes = entries.reduce((sum, item) => sum + item.size, 0);
    for (const entry of entries.sort((a, b) => a.at - b.at)) {
      if (bytes <= 128 * 1024 * 1024) break;
      if (entry.full === image || entry.full === manifest) continue;
      await rm(entry.full, { force: true }); bytes -= entry.size;
    }
  }

  async getAsset(file: string) {
    const bundled = await terrainPublication().catch(() => null);
    if (bundled && file === bundled.image.file) return { bytes: validateTerrainAsset(await readFile(terrainImageUrl(file)), bundled), publicationId: bundled.publicationId };
    const match = assetPattern.exec(file);
    if (!match) throw new Error("terrain_asset_not_found");
    const input: TerrainOverlayRequest = { purpose: "MAP", center: { system: "GCJ02", latitude: Number(match[1]) / 1e7, longitude: Number(match[2]) / 1e7 }, radiusKm: Number(match[3]) / 1000 };
    // Recover an evicted asset from its bounded request identity. Never serve
    // regenerated different bytes under an immutable previous image URL.
    const publication = await this.getPublication(input);
    if (!publication || publication.image.file !== file) throw new Error("terrain_asset_not_found");
    const result = await this.resolve(input);
    if (!result || result.publication.image.file !== file) throw new Error("terrain_asset_not_found");
    return { bytes: validateTerrainAsset(result.bytes, result.publication), publicationId: result.publication.publicationId };
  }

  close() {
    this.closed = true;
    for (const controller of this.active) controller.abort(new Error("terrain_service_closed"));
    this.cache.clear();
  }
}
