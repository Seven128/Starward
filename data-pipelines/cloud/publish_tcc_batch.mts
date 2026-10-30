/** Local numeric publication/activation. No downloads, DB writes, image
 * processing, worker execution, cloud uploads or deployment are performed. */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, open, unlink, rename, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CloudNumericPublication, type CloudFile } from "../../workers/miniapp-api/src/cloud-publication.ts";
import { assertCloudCurrent, type CloudCurrentPublication } from "../../workers/miniapp-api/src/cloud-publication-registry.ts";

const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
async function immutable(file: string, bytes: Buffer | string) {
  try { await writeFile(file, bytes, { flag: "wx" }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const info = await lstat(file);
    if (info.isSymbolicLink() || !info.isFile() || !(await readFile(file)).equals(Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes))) throw error;
  }
}

async function ordinaryDirectory(directory: string) {
  const resolved = path.resolve(directory), actual = await realpath(resolved);
  if (process.platform === "win32" ? actual.toLowerCase() !== resolved.toLowerCase() : actual !== resolved)
    throw new Error("cloud_publication_directory_alias_invalid");
}

export async function publishCloudBatch(input: {
  directory: string; manifestSha256: string; root: string;
  activate: boolean; expectedCurrentManifestSha256: string | null;
}, now: () => number = Date.now) {
  if (!path.isAbsolute(input.root) || !path.isAbsolute(input.directory) || typeof input.activate !== "boolean"
    || input.expectedCurrentManifestSha256 !== null && !/^[a-f0-9]{64}$/u.test(input.expectedCurrentManifestSha256))
    throw new Error("cloud_publication_request_invalid");
  const root = path.resolve(input.root);
  await mkdir(root, { recursive: true });
  await ordinaryDirectory(root);
  const lockFile = path.join(root, ".publication.lock"), lock = await open(lockFile, "wx");
  let publication: CloudNumericPublication | undefined;
  try {
    const currentFile = path.join(root, "current.json");
    let previous: CloudCurrentPublication | null = null;
    try {
      const info = await lstat(currentFile);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 4096) throw new Error("cloud_current_publication_invalid");
      previous = assertCloudCurrent(JSON.parse(await readFile(currentFile, "utf8")));
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (input.activate && (previous?.manifestSha256 ?? null) !== input.expectedCurrentManifestSha256)
      throw new Error("cloud_publication_activation_conflict");
    publication = await CloudNumericPublication.open(input.directory, input.manifestSha256);
    if (input.activate && !publication.supports240Hours(now())) throw new Error("cloud_publication_coverage_expired");
    const descriptor: CloudCurrentPublication = { schemaVersion: "starward-cloud-current-v1", publicationId: publication.manifest.publicationId,
      manifestSha256: input.manifestSha256 };
    const destination = path.join(root, "publications", input.manifestSha256);
    await mkdir(destination, { recursive: true });
    await ordinaryDirectory(destination);
    let numericBytes = 0;
    const copied = new Set<string>();
    const copy = async (item: CloudFile) => {
      if (copied.has(item.file)) return;
      const source = path.join(input.directory, item.file), info = await lstat(source);
      if (info.isSymbolicLink() || !info.isFile() || info.size !== item.bytes) throw new Error("cloud_publication_source_changed");
      const bytes = await readFile(source);
      if (bytes.length !== item.bytes || hash(bytes) !== item.sha256) throw new Error("cloud_publication_source_changed");
      await immutable(path.join(destination, item.file), bytes);
      numericBytes += bytes.length; copied.add(item.file);
    };
    for (const [index, frame] of publication.manifest.frames.entries()) {
      await publication.frame(index); // Actual bytes, value bounds, mask and count.
      await copy(frame.values); await copy(frame.mask);
    }
    const manifest = await readFile(path.join(input.directory, "manifest.json"));
    if (hash(manifest) !== input.manifestSha256) throw new Error("cloud_publication_source_changed");
    await immutable(path.join(destination, "manifest.json"), manifest);
    // Marker is written only after every numeric member passed and copied.
    await immutable(path.join(destination, "ready.json"), JSON.stringify(descriptor, null, 2) + "\n");
    if (input.activate) {
      // A failed qualification above leaves the former pointer and every older
      // immutable directory intact. The lock covers qualification and this CAS.
      const temporary = path.join(root, `.current-${randomUUID()}.json`);
      const handle = await open(temporary, "wx");
      try { await handle.writeFile(JSON.stringify(descriptor, null, 2) + "\n"); await handle.sync(); }
      finally { await handle.close(); }
      try { await rename(temporary, currentFile); }
      catch (error) { await unlink(temporary).catch(() => undefined); throw error; }
      const readback = assertCloudCurrent(JSON.parse(await readFile(currentFile, "utf8")));
      if (JSON.stringify(readback) !== JSON.stringify(descriptor)) throw new Error("cloud_publication_activation_readback_failed");
    }
    return { descriptor, previous, directory: destination, numericFiles: copied.size, numericBytes,
      activated: input.activate, scope: "local configured numeric publication; no image/CDN or deployment result" };
  } finally { await publication?.close(); await lock.close(); await unlink(lockFile); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [spec] = process.argv.slice(2);
  if (!spec) throw new Error("Usage: publish_tcc_batch.mts <absolute-spec.json>");
  const result = await publishCloudBatch(JSON.parse(await readFile(spec, "utf8")));
  console.log(JSON.stringify(result));
}
