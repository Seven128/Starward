import { randomUUID } from "node:crypto";
import { linkSync, unlinkSync } from "node:fs";
import { lstat, mkdir, open, opendir, readFile, realpath, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { CLOUD_DISPLAY_MAXIMUM_WINDOWS, CLOUD_DISPLAY_MAXIMUM_TIMES } from "@starward/miniapp-contracts";
import { CloudDisplayDeadline } from "./cloud-display-execution.mts";

const failure = (code: string) => new Error("cloud_display_" + code);
// A single finite batch can own two files per image plus its two final records.
// Existing residue and temporary commit files count against this same finite
// directory scan, rather than allowing empty files to bypass a byte budget.
const maximumEntries = 2 * CLOUD_DISPLAY_MAXIMUM_WINDOWS * CLOUD_DISPLAY_MAXIMUM_TIMES + 4;
const lockName = ".cloud-display-output.lock";

/** Flat, exclusively owned batch output. Existing/partial bytes are charged
 * before work, and failed writes never become free capacity for another run. */
export class CloudDisplayOutput {
  private readonly files = new Map<string, number>();
  private bytes = 0;
  private failed = false;
  private released = false;
  private releasing: Promise<{ lockReleased: boolean }> | null = null;
  private constructor(readonly directory: string, private readonly maximumBytes: number,
    private readonly token: string, private readonly deadline: CloudDisplayDeadline, private readonly signal?: AbortSignal) {}

  static async open(directory: string, maximumBytes: number, deadline: CloudDisplayDeadline, signal?: AbortSignal) {
    deadline.check(signal);
    if (!path.isAbsolute(directory) || !Number.isSafeInteger(maximumBytes) || maximumBytes < 1) throw failure("output_invalid");
    const root = path.resolve(directory);
    await mkdir(root, { recursive: true }); deadline.check(signal);
    const real = await realpath(root), info = await lstat(root);
    if (info.isSymbolicLink() || !info.isDirectory()
      || (process.platform === "win32" ? root.toLowerCase() !== real.toLowerCase() : root !== real)) throw failure("output_invalid");
    const token = randomUUID() + "\n", lock = path.join(root, lockName);
    try { await writeFile(lock, token, { flag: "wx" }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw failure("output_busy"); throw error; }
    const output = new CloudDisplayOutput(root, maximumBytes, token, deadline, signal);
    try {
      const entries = await opendir(root);
      for await (const entry of entries) {
        deadline.check(signal);
        if (!entry.isFile() || entry.isSymbolicLink() || output.files.size >= maximumEntries) throw failure("output_entry_invalid");
        const info = await lstat(path.join(root, entry.name));
        if (!info.isFile() || info.isSymbolicLink() || !Number.isSafeInteger(info.size)) throw failure("output_entry_invalid");
        output.files.set(entry.name, info.size); output.bytes += info.size;
        if (!Number.isSafeInteger(output.bytes) || output.bytes > maximumBytes) throw failure("output_budget_exceeded");
      }
      if (output.files.has("inventory.json")) throw failure("existing_inventory");
      return output;
    } catch (error) { await output.release(); throw error; }
  }

  private check(file: string) {
    this.deadline.check(this.signal);
    if (this.failed || this.released || !/^[a-zA-Z0-9._-]+$/u.test(file) || file === "." || file === ".." || file === lockName)
      throw failure("output_unavailable");
  }

  private reserve(file: string, bytes: number) {
    if (this.files.has(file)) throw failure("output_conflict");
    if (this.files.size >= maximumEntries || bytes + this.bytes > this.maximumBytes) throw failure("output_budget_exceeded");
    this.files.set(file, bytes); this.bytes += bytes;
  }

  async write(file: string, data: Buffer | string) {
    this.check(file);
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const target = path.join(this.directory, file), existing = this.files.get(file);
    if (existing !== undefined) {
      const info = await lstat(target);
      if (info.isSymbolicLink() || !info.isFile() || info.size !== existing || existing !== bytes.length
        || !(await readFile(target)).equals(bytes)) throw failure("output_conflict");
      this.deadline.check(this.signal); return;
    }
    this.reserve(file, bytes.length);
    try {
      // A short/failed write leaves its exact owned residue. The next process
      // must rescan and charge it; no optimistic decrement or broad cleanup.
      const handle = await open(target, "wx");
      try { await handle.writeFile(bytes); } finally { await handle.close(); }
      this.deadline.check(this.signal);
    } catch (error) { this.failed = true; throw error; }
  }

  async sealInventory(data: string) {
    const pending = ".cloud-display-inventory-" + randomUUID() + ".part";
    await this.write(pending, data);
    this.check("inventory.json");
    const bytes = Buffer.byteLength(data);
    this.reserve("inventory.json", bytes);
    // No await between the last cancellation/deadline check and the atomic
    // exclusive commit. link never replaces a pre-existing manifest.
    linkSync(path.join(this.directory, pending), path.join(this.directory, "inventory.json"));
    let pendingRemoved = false;
    try {
      unlinkSync(path.join(this.directory, pending)); pendingRemoved = true;
      this.files.delete(pending); this.bytes -= bytes;
    } catch { /* Complete inventory is committed; disclose the charged residue. */ }
    return { bytes: this.bytes, files: this.files.size, pendingInventoryRemoved: pendingRemoved };
  }

  usage() { return { bytes: this.bytes, files: this.files.size }; }

  release(): Promise<{ lockReleased: boolean }> {
    if (this.releasing) return this.releasing;
    this.released = true;
    this.releasing = (async () => {
      const lock = path.join(this.directory, lockName);
      try {
        const info = await lstat(lock);
        if (info.isSymbolicLink() || !info.isFile() || info.size !== Buffer.byteLength(this.token)
          || await readFile(lock, "utf8") !== this.token) return { lockReleased: false };
        await unlink(lock);
        this.bytes -= this.files.get(lockName) ?? 0; this.files.delete(lockName);
        return { lockReleased: true };
      } catch { return { lockReleased: false }; }
    })();
    return this.releasing;
  }
}
