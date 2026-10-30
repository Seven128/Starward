import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { validateTerrainAsset, validateTerrainPublication } from "./terrain-publication.ts";
import { DISPLAY_RASTER_GRID, type RasterBounds } from "@starward/coordinate-system";
import { terrainFixedRequest, terrainWindowRequest, terrainRequestKey, type RenderedTerrain } from "./terrain-request.ts";

export interface TerrainFixedInventory {
  schemaVersion: "starward-fixed-terrain-inventory-v1";
  publicationVersion: string;
  createdAt: string;
  targets: { name: string; boundsGcj02: RasterBounds }[];
  assets: { key: string; file: string; publicationSha256: string }[];
  /** Previous immutable URLs remain resolvable after a release switch. */
  retainedAssets?: { key: string; file: string; publicationSha256: string }[];
}
const sha256 = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Discover geometry from the hash-bound inventory's existing identity before
 * reading any image. A proof and its actual bytes still need normal validation. */
export function terrainFixedInventoryRequest(entry: TerrainFixedInventory["assets"][number]) {
  const fixed = /^terrarium-cn-v2-fixed-(\d{1,2})-(\d+)-(\d+)-(1|2|4)$/u.exec(entry.key);
  const window = /^terrarium-cn-v2-window-(\d{1,2})-(\d+)-(\d+)-([1-5])-([1-5])$/u.exec(entry.key);
  try {
    const request = window ? terrainWindowRequest({ grid: DISPLAY_RASTER_GRID, tilePixels: 256,
      zoom: Number(window[1]), x: Number(window[2]), y: Number(window[3]), columns: Number(window[4]), rows: Number(window[5]) })
      : fixed ? terrainFixedRequest({ grid: DISPLAY_RASTER_GRID, tilePixels: 256,
        zoom: Number(fixed[1]), x: Number(fixed[2]), y: Number(fixed[3]), span: Number(fixed[4]) as 1 | 2 | 4 }) : null;
    return request && terrainRequestKey(request) === entry.key ? request : null;
  } catch { return null; }
}

export function terrainInventoryVersion(inventory: Pick<TerrainFixedInventory, "targets" | "assets" | "retainedAssets">) {
  return `terrain-fixed:${sha256(JSON.stringify({ targets: inventory.targets, assets: inventory.assets,
    ...(inventory.retainedAssets?.length ? { retainedAssets: inventory.retainedAssets } : {}) }))}`;
}

export async function readTerrainFixedInventory(directory: string): Promise<TerrainFixedInventory> {
  const file = path.join(directory, "inventory.json");
  if ((await stat(file)).size > 2 * 1024 * 1024) throw new Error("terrain_inventory_invalid");
  return validateTerrainFixedInventory(JSON.parse(await readFile(file, "utf8")));
}

/** The sealed Map consumer validates the same inventory from hash-bound bytes. */
export function validateTerrainFixedInventory(input: unknown): TerrainFixedInventory {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("terrain_inventory_invalid");
  const value = input as TerrainFixedInventory;
  const all = [...(Array.isArray(value.assets) ? value.assets : []), ...(Array.isArray(value.retainedAssets) ? value.retainedAssets : [])];
  if (value.schemaVersion !== "starward-fixed-terrain-inventory-v1" || !Array.isArray(value.targets) || !value.targets.length
    || !Array.isArray(value.assets) || !value.assets.length || all.length > 4096
    || (value.retainedAssets !== undefined && !Array.isArray(value.retainedAssets))
    || !Number.isFinite(Date.parse(value.createdAt)) || value.publicationVersion !== terrainInventoryVersion(value)
    || all.some(asset => !asset || !/^terrarium-cn-v2-(?:fixed|window)-[\da-f-]+$/u.test(asset.key)
      || !/^[a-z0-9][a-z0-9.-]*\.png$/u.test(asset.file) || !asset.file.startsWith(asset.key + "-")
      || !/^[a-f0-9]{64}$/u.test(asset.publicationSha256))
    || new Set(value.assets.map(asset => asset.key)).size !== value.assets.length
    || new Set(all.map(asset => asset.file)).size !== all.length) throw new Error("terrain_inventory_invalid");
  return value;
}

/** Static publication and regenerable cache use the same TerrainService owner.
 * Immutable published bytes do not acquire a 24-hour cache expiry. */
export async function readTerrainFixedAsset(directory: string, entry: TerrainFixedInventory["assets"][number]): Promise<RenderedTerrain> {
  const proof = await readFile(path.join(directory, entry.file + ".json"));
  const publication = validateTerrainFixedProof(entry, proof);
  const bytes = validateTerrainAsset(await readFile(path.join(directory, entry.file)), publication);
  return { publication, bytes };
}

/** Keep file/manifest selection separate from the common publication owner. */
export function validateTerrainFixedProof(entry: TerrainFixedInventory["assets"][number], proof: Buffer) {
  if (proof.length > 1024 * 1024 || sha256(proof) !== entry.publicationSha256) throw new Error("terrain_publication_hash_mismatch");
  const publication = validateTerrainPublication(JSON.parse(proof.toString("utf8")));
  if (publication.schemaVersion !== "starward-terrain-publication-v4" || publication.image.file !== entry.file
    || publication.sourceIssues?.some(issue => issue.reason !== "NOT_FOUND")) throw new Error("terrain_fixed_publication_invalid");
  return publication;
}
