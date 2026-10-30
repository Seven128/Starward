import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { displayRasterWindowKey, type DisplayRasterWindow } from "@starward/coordinate-system";
import { mapStaticHash, mapStaticSourceId, type MapStaticDescriptor } from "./map-static-manifest.ts";
import { MapStaticPublicationIndex, type MapStaticSelectedSource } from "./map-static-index.ts";
import type { FixedNightLightDataset, FixedNightLightRaster } from "./night-light-publication.ts";
import { nightLightWindowView, validateNightLightWindow, type NightLightWindow, type NightLightView } from "./night-light-window.ts";
import { nightLightContrastView } from "./night-light-display-image.ts";
import type { ShardedNightLightPublication } from "./night-light-sharded-publication.ts";

export type PreparedNightLightPublication = { directory: string; publicationHash: string };
const fail = (code: string): never => { throw new Error(`nightlight_prepared_${code}`); };
const comparable = (value: string) => process.platform === "win32" ? value.toLowerCase() : value;

/** Runtime file boundary. The explicit local root and every component must be
 * ordinary files/directories; the sealed declaration supplies all names. */
async function readFileWithin(directory: string, relative: string, maximum: number, signal: AbortSignal,
  descriptor?: Pick<MapStaticDescriptor, "bytes" | "sha256">) {
  signal.throwIfAborted();
  const root = path.resolve(directory);
  if (comparable(await realpath(root)) !== comparable(root)) fail("file_type_invalid");
  if (path.isAbsolute(relative) || relative.includes("\\") || relative.split("/").some(part => !part || part === "." || part === "..")) fail("file_path_invalid");
  let selected = root;
  const parts = relative.split("/");
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) fail("file_type_invalid");
  for (const [index, part] of parts.entries()) {
    selected = path.join(selected, part);
    const info = await lstat(selected), file = index === parts.length - 1;
    if (info.isSymbolicLink() || (file ? !info.isFile() : !info.isDirectory())) fail("file_type_invalid");
    if (file && (info.size < 1 || info.size > maximum || descriptor && info.size !== descriptor.bytes)) fail("file_size_invalid");
  }
  const bytes = await readFile(selected, { signal });
  signal.throwIfAborted();
  if (bytes.length < 1 || bytes.length > maximum || descriptor &&
      (bytes.length !== descriptor.bytes || mapStaticHash(bytes) !== descriptor.sha256)) fail("file_identity_invalid");
  return bytes;
}

/** Optional image-only consumer of the existing sealed Map manifest. There is
 * no second registry, current pointer, numerical publication or DB activation.
 * A configured hash is necessary: image-only window proofs are not themselves
 * in the DB's numerical inventory, so a self-rehashed directory is insufficient.
 */
export class PreparedNightLightWindows {
  private readonly index: MapStaticPublicationIndex;

  constructor(private readonly publication: PreparedNightLightPublication) {
    if (!path.isAbsolute(publication.directory) || !/^[a-f0-9]{64}$/u.test(publication.publicationHash)) fail("configuration_invalid");
    this.index = new MapStaticPublicationIndex((file, maximum, signal, descriptor) =>
      readFileWithin(publication.directory, file, maximum, signal, descriptor), publication.publicationHash, fail);
  }

  async read(dataset: FixedNightLightDataset, proofs: FixedNightLightRaster[], window: DisplayRasterWindow,
    signal: AbortSignal): Promise<NightLightWindow | null> {
    validateNightLightWindow(window); signal.throwIfAborted();
    const manifest = await this.index.root(), inventory = dataset.payload.rasterInventory;
    signal.throwIfAborted();
    const key = displayRasterWindowKey(window), exact = proofs.find(proof => displayRasterWindowKey(proof.grid.window) === key);
    const prefix = `nightlight-v2-window-${key}-${inventory.sha256}-`;
    const candidates: { source: MapStaticSelectedSource; entry: MapStaticDescriptor }[] = [];
    for (const source of manifest.sources) {
      if (source.family !== "night-light" || source.datasetVersion !== dataset.datasetVersion || source.publicationVersion !== inventory.publicationVersion) continue;
      if ((await this.index.metadata(source, "inventory.json", signal))[0]?.sha256 !== inventory.sha256) continue;
      for (const entry of await this.index.metadata(source, exact ? exact.image.file + ".json" : prefix, signal, !exact)) candidates.push({ source, entry });
    }
    if (!candidates.length) return null; // Unprepared area/version retains the bounded compatibility owner.
    if (candidates.some(({ entry }) => entry.file !== candidates[0].entry.file || entry.bytes !== candidates[0].entry.bytes ||
        entry.sha256 !== candidates[0].entry.sha256)) fail("window_conflict");
    const { source, entry } = candidates[0], sourcePath = `publications/${mapStaticSourceId(source)}`;
    const raw = await readFileWithin(this.publication.directory, `${sourcePath}/${entry.file}`, 2 * 1024 * 1024, signal, entry);
    const proof = JSON.parse(raw.toString("utf8")) as NightLightView;
    if (!proof?.image || !/^[a-f0-9]{64}$/u.test(proof.image.sha256) || !Number.isSafeInteger(proof.image.bytes) ||
        proof.image.bytes < 1 || proof.image.bytes > 16 * 1024 * 1024 || entry.file !== proof.image.file + ".json") fail("proof_invalid");
    const expected = nightLightWindowView(inventory.sha256, proofs, window, proof.image);
    if (!expected || !isDeepStrictEqual(proof, expected)) fail("proof_mismatch");
    const route = `/v2/night-light/assets/${dataset.datasetVersion}/${proof.image.file}`;
    const record = await this.index.record(route, signal);
    if (!record || record.bytes !== proof.image.bytes || record.sha256 !== proof.image.sha256 ||
        record.headers["x-starward-night-light-publication"] !== proof.publicationId) fail("record_mismatch");
    const bytes = await readFileWithin(this.publication.directory, `${sourcePath}/${proof.image.file}`, 16 * 1024 * 1024, signal, proof.image);
    // The trusted sealed producer already fully decodes these exact hash-bound
    // PNG bytes. Check dimensions without decoding/composing pixels on a hit.
    if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR" ||
        bytes.readUInt32BE(16) !== proof.grid.width || bytes.readUInt32BE(20) !== proof.grid.height) fail("image_dimensions_invalid");
    signal.throwIfAborted();
    return { proof, bytes };
  }

  /** Image-only derived windows keep the original sharded numerical authority.
   * Read only their bounded proof/route pages and at most nine declared cells;
   * neither source PNGs nor numerical TIFFs are decoded on this path. */
  async readSharded(publication: ShardedNightLightPublication, window: DisplayRasterWindow,
    signal: AbortSignal): Promise<NightLightWindow | null> {
    validateNightLightWindow(window); signal.throwIfAborted();
    const original = await publication.metadata(signal), manifest = await this.index.root();
    signal.throwIfAborted();
    const key = displayRasterWindowKey(window), rootHash = original.index.sha256;
    const prefix = `windows/nightlight-contrast-v1-window-${key}-${rootHash}-`;
    const candidates: { source: MapStaticSelectedSource; entry: MapStaticDescriptor }[] = [];
    for (const source of manifest.sources) {
      if (source.family !== "night-light" || source.datasetVersion !== original.datasetVersion ||
        source.publicationVersion !== original.indexVersion || source.admission !== "DEVELOPMENT_ONLY") continue;
      const pin = (await this.index.metadata(source, "index.json", signal))[0];
      if (!pin || pin.bytes !== original.index.bytes || pin.sha256 !== rootHash) continue;
      for (const entry of await this.index.metadata(source, prefix, signal, true))
        if (entry.file.endsWith(".png.json")) candidates.push({ source, entry });
    }
    if (!candidates.length) return null;
    if (candidates.some(({ entry }) => entry.file !== candidates[0].entry.file ||
      entry.bytes !== candidates[0].entry.bytes || entry.sha256 !== candidates[0].entry.sha256)) fail("window_conflict");
    const { source, entry } = candidates[0], sourcePath = `publications/${mapStaticSourceId(source)}`;
    const proof = JSON.parse((await readFileWithin(this.publication.directory, `${sourcePath}/${entry.file}`,
      2 * 1024 * 1024, signal, entry)).toString("utf8")) as NightLightView;
    if (!proof?.image || !/^[a-f0-9]{64}$/u.test(proof.image.sha256) || !Number.isSafeInteger(proof.image.bytes) ||
      proof.image.bytes < 1 || proof.image.bytes > 16 * 1024 * 1024 || entry.file !== `windows/${proof.image.file}.json` ||
      !proof.displaySource || !/^[a-f0-9]{64}$/u.test(proof.displaySource.imageSha256)) return fail("proof_invalid");
    const legacyName = `windows/nightlight-v2-window-${key}-${rootHash}-${proof.displaySource.imageSha256}.png.json`;
    const legacyEntries = await this.index.metadata(source, legacyName, signal);
    if (legacyEntries.length !== 1) fail("proof_invalid");
    const legacy = JSON.parse((await readFileWithin(this.publication.directory, `${sourcePath}/${legacyName}`,
      2 * 1024 * 1024, signal, legacyEntries[0])).toString("utf8")) as NightLightView;
    if (!legacy?.image || !Number.isSafeInteger(legacy.image.bytes) || legacy.image.bytes < 1 ||
      legacy.image.bytes > 16 * 1024 * 1024) fail("proof_invalid");
    const proofs: FixedNightLightRaster[] = [];
    for (let row = 0; row < window.rows; row++) for (let column = 0; column < window.columns; column++) {
      const cell = await publication.window(displayRasterWindowKey({ ...window, x: window.x + column,
        y: window.y + row, columns: 1, rows: 1 }), signal);
      if (!cell) return fail("window_source_unpublished");
      proofs.push(cell.proof);
    }
    const expected = nightLightWindowView(rootHash, proofs, window, legacy.image);
    if (!expected || !isDeepStrictEqual(legacy, expected) ||
      !isDeepStrictEqual(proof, nightLightContrastView(expected, rootHash, proof.image))) fail("proof_mismatch");
    const route = `/v2/night-light/assets/${original.datasetVersion}/${proof.image.file}`;
    const record = await this.index.record(route, signal);
    if (!record || record.bytes !== proof.image.bytes || record.sha256 !== proof.image.sha256 ||
      record.headers["x-starward-night-light-publication"] !== proof.publicationId) fail("record_mismatch");
    const bytes = await readFileWithin(this.publication.directory, `${sourcePath}/windows/${proof.image.file}`,
      16 * 1024 * 1024, signal, proof.image);
    if (bytes.length < 33 || bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a" || bytes.readUInt32BE(8) !== 13 ||
      bytes.toString("ascii", 12, 16) !== "IHDR" || bytes.readUInt32BE(16) !== proof.grid.width ||
      bytes.readUInt32BE(20) !== proof.grid.height) fail("image_dimensions_invalid");
    signal.throwIfAborted();
    return { proof, bytes };
  }

  close() { this.index.close(new Error("nightlight_service_closed")); }
}
