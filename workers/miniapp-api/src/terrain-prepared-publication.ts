import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { mapStaticHash, mapStaticSourceId, type MapStaticDescriptor } from "./map-static-manifest.ts";
import { MapStaticPublicationIndex, type MapStaticSelectedSource } from "./map-static-index.ts";
import { validateTerrainFixedInventory, validateTerrainFixedProof, type TerrainFixedInventory } from "./terrain-fixed-publication.ts";
import { validateTerrainAsset } from "./terrain-publication.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

type Selection = { source: MapStaticSelectedSource; inventory: TerrainFixedInventory; sourcePath: string };
function fail(code: string): never { throw new Error(`terrain_prepared_${code}`); }
const comparable = (value: string) => process.platform === "win32" ? value.toLowerCase() : value;

/** Only files named by the existing sealed export can enter the terrain owner. */
async function pinnedFile(directory: string, relative: string, maximum: number, signal: AbortSignal,
  descriptor?: Pick<MapStaticDescriptor, "bytes" | "sha256">) {
  signal.throwIfAborted();
  const root = path.resolve(directory);
  if (comparable(await realpath(root)) !== comparable(root)) fail("file_type_invalid");
  if (path.isAbsolute(relative) || relative.includes("\\") || relative.split("/").some(part => !part || part === "." || part === "..")) fail("file_path_invalid");
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) fail("file_type_invalid");
  let selected = root;
  const parts = relative.split("/");
  for (const [index, part] of parts.entries()) {
    selected = path.join(selected, part);
    const info = await lstat(selected), file = index === parts.length - 1;
    if (info.isSymbolicLink() || (file ? !info.isFile() : !info.isDirectory())) fail("file_type_invalid");
    if (file && (info.size < 1 || info.size > maximum || descriptor && info.size !== descriptor.bytes)) fail("file_size_invalid");
  }
  const bytes = await readFile(selected, { signal }).catch(error => { signal.throwIfAborted(); throw error; });
  signal.throwIfAborted();
  if (bytes.length < 1 || bytes.length > maximum || descriptor &&
    (bytes.length !== descriptor.bytes || mapStaticHash(bytes) !== descriptor.sha256)) fail("file_identity_invalid");
  return bytes;
}

/** Current terrain selection from the already pinned Map export. No pointer,
 * source read, composition, image cache or publication is created here. */
export class PreparedTerrainPublication {
  private selection: Promise<Selection | null> | undefined;
  private readonly lifetime = new AbortController();
  private readonly index: MapStaticPublicationIndex;

  constructor(private readonly publication: NonNullable<MiniappRuntimeConfig["mapStaticPublication"]>) {
    if (!path.isAbsolute(publication.directory) || !/^[a-f0-9]{64}$/u.test(publication.publicationHash)) fail("configuration_invalid");
    this.index = new MapStaticPublicationIndex((file, maximum, signal, descriptor) =>
      pinnedFile(publication.directory, file, maximum, signal, descriptor), publication.publicationHash, fail);
  }

  private declaration() {
    this.lifetime.signal.throwIfAborted();
    // Metadata discovery is shared without letting one cancelled reader cancel
    // another. Failure is retryable; close aborts the owner and prevents adoption.
    this.selection ??= this.discover().catch(error => { this.selection = undefined; this.lifetime.signal.throwIfAborted(); throw error; });
    return this.selection;
  }

  private async discover(): Promise<Selection | null> {
    const signal = this.lifetime.signal;
    const manifest = await this.index.root();
    const sources = manifest.sources.filter(source => source.family === "terrain");
    if (!sources.length) return null;
    if (sources.length !== 1) fail("selection_ambiguous");
    const source = sources[0]!, sourcePath = `publications/${mapStaticSourceId(source)}`;
    const descriptor = (await this.index.metadata(source, "inventory.json", signal))[0];
    if (!descriptor) fail("inventory_missing");
    const inventoryRaw = await pinnedFile(this.publication.directory, `${sourcePath}/inventory.json`, 2 * 1024 * 1024, signal, descriptor);
    const inventory = validateTerrainFixedInventory(JSON.parse(inventoryRaw.toString("utf8")));
    if (inventory.publicationVersion !== source.publicationVersion) fail("inventory_mismatch");
    signal.throwIfAborted();
    return { source, inventory, sourcePath };
  }

  async current(signal?: AbortSignal) {
    signal?.throwIfAborted();
    const selected = await this.declaration();
    signal?.throwIfAborted(); this.lifetime.signal.throwIfAborted();
    return selected?.inventory ?? null;
  }

  async readAsset(entry: TerrainFixedInventory["assets"][number], signal?: AbortSignal) {
    signal?.throwIfAborted();
    const selected = await this.declaration();
    signal?.throwIfAborted();
    if (!selected || ![...selected.inventory.assets, ...(selected.inventory.retainedAssets ?? [])].some(candidate =>
      candidate.key === entry.key && candidate.file === entry.file && candidate.publicationSha256 === entry.publicationSha256)) fail("asset_not_selected");
    const descriptor = (await this.index.metadata(selected.source, entry.file + ".json", this.lifetime.signal))[0];
    if (!descriptor || descriptor.sha256 !== entry.publicationSha256) fail("proof_mismatch");
    const raw = await pinnedFile(this.publication.directory, `${selected.sourcePath}/${descriptor.file}`, 1024 * 1024, this.lifetime.signal, descriptor);
    const publication = validateTerrainFixedProof(entry, raw);
    const record = await this.index.record(`/v2/terrain/assets/${entry.file}`, this.lifetime.signal);
    if (!record || record.bytes !== publication.image.byteSize || record.sha256 !== publication.image.sha256 ||
      record.headers["x-starward-terrain-publication"] !== publication.publicationId) fail("record_mismatch");
    const bytes = validateTerrainAsset(await pinnedFile(this.publication.directory, `${selected.sourcePath}/${entry.file}`,
      16 * 1024 * 1024, this.lifetime.signal, record), publication);
    signal?.throwIfAborted(); this.lifetime.signal.throwIfAborted();
    return { publication, bytes };
  }

  close() {
    const reason = new Error("terrain_service_closed");
    this.lifetime.abort(reason); this.index.close(reason); this.selection = undefined;
  }
}
