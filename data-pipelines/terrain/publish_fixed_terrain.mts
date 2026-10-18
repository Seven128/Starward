#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { TerrainService } from "../../workers/miniapp-api/src/terrain-service.ts";
import { validateTerrainPublication, validateTerrainAsset, type TerrainPublication } from "../../workers/miniapp-api/src/terrain-publication.ts";
import { terrainFixedRequest, terrainWindowRequest, terrainRequestKey } from "../../workers/miniapp-api/src/terrain-request.ts";
import { terrainInventoryVersion, readTerrainFixedInventory, readTerrainFixedAsset, type TerrainFixedInventory } from "../../workers/miniapp-api/src/terrain-fixed-publication.ts";
import type { TerrainOverlayRequest } from "@starward/miniapp-contracts";
import { displayRasterWindowForBounds, type RasterBounds } from "@starward/coordinate-system";

const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
async function publicationRoot(value: string): Promise<string> {
  let parent = path.resolve(value);
  const missing: string[] = [];
  for (;;) {
    try { return path.resolve(await realpath(parent), ...missing); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" || path.dirname(parent) === parent) throw error;
      missing.unshift(path.basename(parent));
      parent = path.dirname(parent);
    }
  }
}
function rootsOverlap(left: string, right: string): boolean {
  const inside = (parent: string, child: string) => {
    const relative = path.relative(parent, child);
    return !relative || !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(".." + path.sep);
  };
  return inside(left, right) || inside(right, left);
}
async function immutableWrite(file: string, bytes: Buffer) {
  try { await writeFile(file, bytes, { flag: "wx" }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST" || !(await readFile(file)).equals(bytes)) throw error;
  }
}
async function preserveProof(file: string, proof: Buffer, publication: TerrainPublication, bytes: Buffer) {
  try {
    const existing = await readFile(file);
    const previous = validateTerrainPublication(JSON.parse(existing.toString("utf8")));
    validateTerrainAsset(bytes, previous);
    if (previous.publicationId !== publication.publicationId) throw new Error("terrain_publication_identity_conflict");
    proof = existing;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  await immutableWrite(file, proof);
  return proof;
}

/** Operator-selected finite targets. Source manifests and PNGs are copied into
 * an immutable static-HTTP directory; inventory.json is the final commit. */
export async function publishFixedTerrain(input: { output: string; cache: string; previous?: string; targets: { name: string; boundsGcj02: RasterBounds }[] }) {
  if (!path.isAbsolute(input.output) || !path.isAbsolute(input.cache) || path.resolve(input.output) === path.resolve(input.cache)
    || (input.previous !== undefined && (!path.isAbsolute(input.previous) || path.resolve(input.previous) === path.resolve(input.output)
      || path.resolve(input.previous) === path.resolve(input.cache)))
    || !input.targets.length || input.targets.length > 16) throw new Error("terrain_publication_targets_invalid");
  // Resolve existing ancestors too: a future child or a junction must not let
  // cache/output writes enter an immutable previous publication (or each other).
  const roots = await Promise.all([input.output, input.cache, ...(input.previous ? [input.previous] : [])].map(publicationRoot));
  if (roots.some((left, index) => roots.slice(index + 1).some(right => rootsOverlap(left, right))))
    throw new Error("terrain_publication_targets_invalid");
  const previous = input.previous ? await readTerrainFixedInventory(input.previous) : undefined;
  const previousAssets = [...(previous?.assets ?? []), ...(previous?.retainedAssets ?? [])];
  await mkdir(input.output, { recursive: true });
  const terrain = new TerrainService({ directory: input.cache });
  const reusePrevious = async (key: string) => {
    const entry = previous?.assets.find(asset => asset.key === key);
    if (!entry) return;
    const pointer = path.join(input.cache, key + ".json");
    try { await stat(pointer); return; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const { publication, bytes } = await readTerrainFixedAsset(input.previous!, entry);
    await mkdir(input.cache, { recursive: true });
    await immutableWrite(path.join(input.cache, entry.file), bytes);
    const proof = await preserveProof(path.join(input.cache, entry.file + ".json"),
      await readFile(path.join(input.previous!, entry.file + ".json")), publication, bytes);
    // An explicitly populated newer cache pointer wins. Never replace it with
    // the previous release merely because that release remains readable.
    try { await writeFile(pointer, proof, { flag: "wx" }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  };
  try {
    // Previous final products are immutable inputs too. They need not have a
    // regenerable-cache pointer and must not trigger source work just to carry
    // a still-current spatial identity into the next release.
    const prepared = new Map<string, TerrainPublication>();
    for (const target of input.targets) {
      const b = target.boundsGcj02;
      if (typeof target.name !== "string" || !target.name.trim() || target.name.length > 120) throw new Error("terrain_publication_targets_invalid");
      const request: TerrainOverlayRequest = { purpose: "MAP", center: { system: "GCJ02", latitude: (b.south + b.north) / 2,
        longitude: (b.west + b.east) / 2 }, viewportBounds: b };
      const window = displayRasterWindowForBounds(b);
      for (let row = 0; row < window.rows; row++) for (let column = 0; column < window.columns; column++) {
        const region = { grid: window.grid, zoom: window.zoom,
          x: window.x + column, y: window.y + row, tilePixels: 256 as const, span: 1 as const };
        await reusePrevious(terrainRequestKey(terrainFixedRequest(region)));
        const cell = await terrain.prepareFixedCell(region);
        if (!cell || cell.sourceIssues?.some(issue => issue.reason !== "NOT_FOUND")) throw new Error("terrain_publication_sources_incomplete");
        prepared.set(terrainRequestKey(terrainFixedRequest(region)), cell);
      }
      await reusePrevious(terrainRequestKey(terrainWindowRequest(window)));
      const publication = await terrain.getPublication(request);
      if (!publication?.fixedWindow || publication.sourceIssues?.some(issue => issue.reason !== "NOT_FOUND")) throw new Error("terrain_publication_sources_incomplete");
      prepared.set(terrainRequestKey(terrainWindowRequest(publication.fixedWindow)), publication);
    }
    const assets: TerrainFixedInventory["assets"] = [];
    const copy = async (directory: string, file: string, key: string, expectedHash?: string) => {
      const proof = await readFile(path.join(directory, file + ".json"));
      if (expectedHash && hash(proof) !== expectedHash) throw new Error("terrain_publication_hash_mismatch");
      const publication = validateTerrainPublication(JSON.parse(proof.toString("utf8")));
      if (publication.schemaVersion !== "starward-terrain-publication-v4"
        || publication.image.file !== file || publication.sourceIssues?.some(issue => issue.reason !== "NOT_FOUND")) throw new Error("terrain_fixed_publication_invalid");
      const request = publication.fixedWindow ? terrainWindowRequest(publication.fixedWindow) : terrainFixedRequest(publication.fixedRaster!);
      if (key !== terrainRequestKey(request)) throw new Error("terrain_publication_identity_conflict");
      const bytes = validateTerrainAsset(await readFile(path.join(directory, file)), publication);
      await immutableWrite(path.join(input.output, publication.image.file), bytes);
      const stableProof = await preserveProof(path.join(input.output, file + ".json"), proof, publication, bytes);
      return { key, file: publication.image.file, publicationSha256: hash(stableProof) };
    };
    // Current pointers select one version per requested spatial identity. Old
    // per-image cache proofs must never become competing current publications.
    for (const key of [...prepared.keys()].sort()) {
      const publication = prepared.get(key)!;
      const predecessor = previousAssets.find(asset => asset.file === publication.image.file);
      assets.push(await copy(predecessor ? input.previous! : input.cache, publication.image.file, key, predecessor?.publicationSha256));
    }
    const currentFiles = new Set(assets.map(asset => asset.file));
    const retainedAssets: TerrainFixedInventory["assets"] = [];
    for (const entry of previousAssets.filter(asset => !currentFiles.has(asset.file)).sort((a, b) => a.file.localeCompare(b.file))) {
      await readTerrainFixedAsset(input.previous!, entry);
      retainedAssets.push(await copy(input.previous!, entry.file, entry.key, entry.publicationSha256));
    }
    if (assets.length + retainedAssets.length > 4096) throw new Error("terrain_publication_asset_budget_exceeded");
    const inventory: TerrainFixedInventory = { schemaVersion: "starward-fixed-terrain-inventory-v1", publicationVersion: "",
      createdAt: new Date().toISOString(), targets: input.targets, assets, ...(retainedAssets.length ? { retainedAssets } : {}) };
    inventory.publicationVersion = terrainInventoryVersion(inventory);
    try {
      const existing = await readTerrainFixedInventory(input.output);
      if (existing.publicationVersion !== inventory.publicationVersion) throw new Error("terrain_publication_use_new_directory");
      return existing;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    await immutableWrite(path.join(input.output, "inventory.json"), Buffer.from(JSON.stringify(inventory, null, 2) + "\n"));
    return readTerrainFixedInventory(input.output);
  } finally { terrain.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    if (!["--spec", "--output", "--cache", "--previous"].includes(args[index]!) || !args[index + 1] || options.has(args[index]!)) throw new Error("terrain_publication_arguments_invalid");
    options.set(args[index]!, args[index + 1]!);
  }
  if (!["--spec", "--output", "--cache"].every(key => options.has(key))) throw new Error("usage: --spec absolute-targets.json --output absolute-new-directory --cache absolute-owned-cache [--previous absolute-published-directory]");
  const targets = JSON.parse(await readFile(options.get("--spec")!, "utf8"));
  const inventory = await publishFixedTerrain({ targets, output: options.get("--output")!, cache: options.get("--cache")!,
    ...(options.has("--previous") ? { previous: options.get("--previous")! } : {}) });
  console.log(JSON.stringify({ publicationVersion: inventory.publicationVersion, targets: inventory.targets.length, assets: inventory.assets.length }));
}
