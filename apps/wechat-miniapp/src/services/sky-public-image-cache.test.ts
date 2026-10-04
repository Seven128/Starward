import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createSkyPublicImageCache, type PublicSkyImageDescriptor, type PublicSkyFileDescriptor, type SkyPublicImageFileSystem } from "./sky-public-image-cache";

function image(seed = 1) {
  const body = new Uint8Array(64); body.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(body.buffer); view.setUint32(12, 0x49484452); view.setUint32(16, 128); view.setUint32(20, 256);
  body[40] = seed;
  const asset: PublicSkyImageDescriptor = { environment: "e".repeat(64), sha256: createHash("sha256").update(body).digest("hex"),
    bytes: body.byteLength, width: 128, height: 256, format: "png", url: "https://fixture.invalid/approved.png" };
  return { body: body.buffer, asset };
}
function harness() {
  const files = new Map<string, ArrayBuffer>(), downloads: string[] = [], removed: string[] = [];
  let clock = 0, writeHook: ((path: string, body: ArrayBuffer) => Promise<void>) | undefined;
  let transferHook: ((asset: PublicSkyFileDescriptor) => { promise: Promise<ArrayBuffer>; cancel(): void }) | undefined;
  const bodies = new Map<string, ArrayBuffer>();
  const fs: SkyPublicImageFileSystem = {
    async mkdir() {}, async list(root) { return [...files.keys()].filter(p => p.startsWith(root + "/")).map(p => p.slice(root.length + 1)); },
    async size(path) { const body = files.get(path); if (!body) throw Error("missing"); return body.byteLength; },
    async read(path) { const body = files.get(path); if (!body) throw Error("missing"); return body.slice(0); },
    async write(path, body) { if (writeHook) await writeHook(path, body); files.set(path, body.slice(0)); },
    async rename(from, to) { const body = files.get(from); if (!body) throw Error("missing"); files.set(to, body); files.delete(from); },
    async remove(path) { removed.push(path); files.delete(path); },
  };
  const make = (session = "runtime_a", byteBudget = 256) => createSkyPublicImageCache({ fs, root: "/owned/sky-public-images-v1",
    session, byteBudget, maxFileBytes: 128, now: () => ++clock, cleanupWaitMs: 10,
    transfer(asset) {
      downloads.push(asset.sha256);
      return transferHook?.(asset) ?? { promise: Promise.resolve(bodies.get(asset.sha256)!.slice(0)), cancel() {} };
    } });
  return { files, fs, make, downloads, removed, bodies,
    set writeHook(value: typeof writeHook) { writeHook = value; }, set transferHook(value: typeof transferHook) { transferHook = value; } };
}
const drain = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
async function waitFor(condition: () => boolean) { for (let i = 0; i < 200; i++) { if (condition()) return; await Promise.resolve(); } assert.fail("callback not reached"); }

function jsonFile(seed: number) {
  const body = new TextEncoder().encode(JSON.stringify({ seed, published: true, padding: "012345678901234567890123456789" }));
  const asset: PublicSkyFileDescriptor = { format: "json", bytes: body.length,
    sha256: createHash("sha256").update(body).digest("hex"), environment: "e".repeat(64), url: "https://fixture.invalid/approved.json" };
  return { asset, body: body.buffer as ArrayBuffer };
}

test("JSON and images share staging/LRU budget and independent leases; restart verifies JSON bytes", async () => {
  const h = harness(), i = image(), j = jsonFile(1), later = jsonFile(2);
  for (const v of [i, j, later]) h.bodies.set(v.asset.sha256, v.body);
  const cache = h.make("mixed", i.asset.bytes + j.asset.bytes);
  const imageLease = await cache.acquire(i.asset).promise;
  const first = await cache.acquire(j.asset).promise; first.release(); await drain();
  const last = await cache.acquire(later.asset).promise; last.release(); await drain();
  assert(imageLease.isCurrent()); assert(h.files.has(imageLease.filePath)); assert(!h.files.has(first.filePath));
  assert.equal(cache.inspect().entries, 2); assert(cache.inspect().bytes <= i.asset.bytes + j.asset.bytes);
  imageLease.release();
  const next = h.make("mixed_restart", i.asset.bytes + j.asset.bytes); await next.ready();
  const warm = await next.acquire(later.asset).promise; assert.equal(h.downloads.length, 3); warm.release();
  const corrupt = later.body.slice(0), changed = new Uint8Array(corrupt); changed[10] = changed[10]! ^ 1; h.files.set(warm.filePath, corrupt);
  const repaired = await next.acquire(later.asset).promise; assert.equal(h.downloads.length, 4); repaired.release();
  await drain(); assert.equal((await next.clear()).status, "complete"); assert.equal(next.inspect().bytes, 0);
});

test("image v1 inventory migrates without download; invalid v2 cannot revive an old v1 pointer", async () => {
  const h = harness(), i = image(); h.bodies.set(i.asset.sha256, i.body);
  const initial = h.make("migration"); const before = await initial.acquire(i.asset).promise; before.release(); await drain();
  const root = "/owned/sky-public-images-v1/", current = JSON.parse(Buffer.from(h.files.get(root + "index-v2.json")!).toString());
  const legacy = new TextEncoder().encode(JSON.stringify({ ...current, version: 1 })).buffer as ArrayBuffer;
  h.files.set(root + "index-v1.json", legacy); h.files.delete(root + "index-v2.json");
  const upgraded = h.make("upgrade"); await upgraded.ready(); const retained = await upgraded.acquire(i.asset).promise;
  assert.equal(h.downloads.length, 1); assert.equal(retained.filePath, before.filePath); retained.release(); await drain();
  assert(h.files.has(root + "index-v2.json")); assert(!h.files.has(root + "index-v1.json"));
  h.files.set(root + "index-v1.json", legacy); h.files.set(root + "index-v2.json", new TextEncoder().encode('{"version":99,"entries":[]}').buffer as ArrayBuffer);
  const invalid = h.make("invalid_v2"); await invalid.ready(); assert.equal(invalid.inspect().entries, 0);
  assert(!h.files.has(before.filePath)); assert(!h.files.has(root + "index-v1.json"));
});

// The older image-only owner knows these disposable filename families. It
// cannot read v2 metadata and must still account for/remove new cached JSON.
const legacyDisposable = (file: string) => /^stage-[a-z0-9_]+-[1-9]\d*$/.test(file) ||
  /^index-[a-z0-9_]+-[1-9]\d*\.stage$/.test(file);
function seedLegacyJsonInventory(h: ReturnType<typeof harness>, j: ReturnType<typeof jsonFile>) {
  const file = `${j.asset.environment}-${j.asset.sha256}-legacy_catalog-1.json`;
  h.files.set(`/owned/sky-public-images-v1/${file}`, j.body);
  h.files.set('/owned/sky-public-images-v1/index-v2.json', new TextEncoder().encode(JSON.stringify({version: 2,
    entries: [{environment: j.asset.environment, format: 'json', sha256: j.asset.sha256, bytes: j.asset.bytes, file, last: 1}]})).buffer as ArrayBuffer);
  return file;
}

test("committed JSON remains identifiable and disposable by an image-only rollback without posing as a raster", async () => {
  const h = harness(), j = jsonFile(1); h.bodies.set(j.asset.sha256, j.body);
  const cache = h.make('rollback_compatible'); const lease = await cache.acquire(j.asset).promise;
  const file = lease.filePath.split('/').at(-1)!;
  assert.equal(legacyDisposable(file), true, 'old cleanup must see the real committed JSON file');
  assert.deepEqual(new Uint8Array(h.files.get(lease.filePath)!), new Uint8Array(j.body));
  const entry = JSON.parse(Buffer.from(h.files.get('/owned/sky-public-images-v1/index-v2.json')!).toString()).entries[0];
  assert.equal(entry.format, 'json'); assert.equal('width' in entry || 'height' in entry, false);
  assert.equal(entry.sha256, j.asset.sha256); assert.equal(entry.bytes, j.asset.bytes);
  lease.release(); await cache.clear();
});

test("existing v2 JSON inventory migrates to rollback-disposable names without a download or changing source bytes", async () => {
  const h = harness(), j = jsonFile(1); h.bodies.set(j.asset.sha256, j.body);
  const oldFile = seedLegacyJsonInventory(h, j), cache = h.make('migrate_catalog'); await cache.ready();
  assert.equal(h.files.has('/owned/sky-public-images-v1/' + oldFile), false, 'previous JSON path cannot remain outside old cleanup');
  const lease = await cache.acquire(j.asset).promise;
  assert.equal(h.downloads.length, 0); assert.equal(legacyDisposable(lease.filePath.split('/').at(-1)!), true);
  assert.deepEqual(new Uint8Array(h.files.get(lease.filePath)!), new Uint8Array(j.body));
  lease.release(); await cache.clear();
});

test("clear during a held catalog-path migration retires the moved file and cannot restore its old generation", async () => {
  const h = harness(), j = jsonFile(1); h.bodies.set(j.asset.sha256, j.body); seedLegacyJsonInventory(h, j);
  const rename = h.fs.rename; let finish: (() => void) | undefined;
  h.fs.rename = async (from, to) => {
    if (from.endsWith('.json') && to.split('/').at(-1)!.startsWith('stage-catalog_'))
      await new Promise<void>(resolve => { finish = resolve; });
    return rename(from, to);
  };
  const cache = h.make('migration_clear'), firstReady = cache.ready(); void firstReady.catch(() => {});
  await waitFor(() => !!finish); assert.equal((await cache.clear()).status, 'pending'); finish!();
  await assert.rejects(firstReady, /cancelled/); await cache.ready();
  assert.equal(cache.inspect().entries, 0); assert.equal(cache.inspect().retired, 0);
  assert.deepEqual([...h.files.keys()], ['/owned/sky-public-images-v1/index-v2.json']);
  const fresh = await cache.acquire(j.asset).promise; assert.equal(h.downloads.length, 1); assert(fresh.isCurrent());
  fresh.release(); await cache.clear();
});

test("a failed catalog-path migration rejects readiness but retries the actual file on explicit acquisition", async () => {
  const h = harness(), j = jsonFile(1); h.bodies.set(j.asset.sha256, j.body); const file = seedLegacyJsonInventory(h, j);
  const rename = h.fs.rename; let fail = true;
  h.fs.rename = async (from, to) => {
    if (fail && from.endsWith('.json') && to.split('/').at(-1)!.startsWith('stage-catalog_')) { fail = false; throw Error('native migration rename failure'); }
    return rename(from, to);
  };
  const cache = h.make('migration_retry'); await assert.rejects(cache.ready(), /native migration rename failure/);
  assert(h.files.has('/owned/sky-public-images-v1/' + file));
  const restored = await cache.acquire(j.asset).promise;
  assert.equal(h.downloads.length, 0); assert.equal(legacyDisposable(restored.filePath.split('/').at(-1)!), true);
  restored.release(); await cache.clear();
});

test("a catalog filename cannot reassign cached bytes to another environment, hash or raster descriptor", async () => {
  for (const changed of ['environment', 'sha256', 'format'] as const) {
    const h = harness(), j = jsonFile(1); h.bodies.set(j.asset.sha256, j.body);
    const first = h.make('filename_binding'); const lease = await first.acquire(j.asset).promise; lease.release(); await drain();
    const indexPath = '/owned/sky-public-images-v1/index-v2.json';
    const value = JSON.parse(Buffer.from(h.files.get(indexPath)!).toString());
    if (changed === 'format') Object.assign(value.entries[0], {format: 'png', width: 128, height: 256});
    else value.entries[0][changed] = 'f'.repeat(64);
    h.files.set(indexPath, new TextEncoder().encode(JSON.stringify(value)).buffer as ArrayBuffer);
    const rejected = h.make('foreign_' + changed); await rejected.ready();
    assert.equal(rejected.inspect().entries, 0, changed); assert.equal(h.files.has(lease.filePath), false, changed);
    const repaired = await rejected.acquire(j.asset).promise; assert.equal(h.downloads.length, 2); repaired.release(); await rejected.clear();
  }
});

test("throwing native abort cannot interrupt clear fencing or release uncompleted I/O slots", async () => {
  const h = harness(), images = [image(1), image(2), image(3), image(4)];
  h.bodies.set(images[0]!.asset.sha256, images[0]!.body);
  const cache = h.make(), live = await cache.acquire(images[0]!.asset).promise; await drain();
  let retired = 0, aborts = 0;
  live.onRetire(() => retired++);
  const transfers: Array<(data: ArrayBuffer) => void> = [];
  h.transferHook = () => ({ promise: new Promise<ArrayBuffer>(resolve => transfers.push(resolve)),
    cancel() { aborts++; throw Error("native abort unavailable"); } });
  const waiting = images.slice(1).map(i => cache.acquire(i.asset));
  const rejected = waiting.map(a => a.promise.catch(cause => cause));
  await waitFor(() => transfers.length === 2);
  const clearing = cache.clear();
  assert.equal(live.isCurrent(), false); assert.equal(retired, 1);
  assert.equal(cache.inspect().pending, 0); assert.equal(cache.inspect().running, 2);
  assert.equal(cache.inspect().reserved, 128); assert.equal(aborts, 2);
  assert.equal((await clearing).status, "pending");
  for (const result of await Promise.all(rejected)) assert.match(result.message, /cancelled/);
  assert.ok(h.files.has(live.filePath), "retired active lease retains its file until release");
  transfers[0]!(images[1]!.body); transfers[1]!(images[2]!.body);
  live.release(); await waitFor(() => cache.inspect().running === 0); await drain();
  assert.equal(cache.inspect().entries, 0); assert.equal(cache.inspect().leased, 0);
  assert.equal(cache.inspect().reserved, 0); assert.equal(h.downloads.length, 3);
  assert.ok(!h.files.has(live.filePath)); assert.ok(cache.inspect().failures >= 2);
  assert.equal((await cache.clear()).status, "complete");
});

test("final acquisition cancellation absorbs a throwing abort and remains idempotent", async () => {
  const h = harness(), i = image(); let finish!: (body: ArrayBuffer) => void, aborts = 0;
  h.transferHook = () => ({ promise: new Promise<ArrayBuffer>(resolve => { finish = resolve; }),
    cancel() { aborts++; throw Error("native abort unavailable"); } });
  const cache = h.make(), a = cache.acquire(i.asset), rejected = a.promise.catch(cause => cause);
  await waitFor(() => !!finish);
  assert.doesNotThrow(() => a.cancel()); assert.doesNotThrow(() => a.cancel());
  assert.equal(aborts, 1); assert.match((await rejected).message, /cancelled/);
  assert.equal(cache.inspect().running, 1); assert.equal(cache.inspect().reserved, 64);
  finish(i.body); await waitFor(() => cache.inspect().running === 0); await drain();
  assert.equal(cache.inspect().entries, 0); assert.equal(cache.inspect().reserved, 0);
  assert.equal(cache.inspect().failures, 1);
});

test("two Canvas acquisitions share one file/request, independent leases survive release and restart", async () => {
  const h = harness(), i = image(); h.bodies.set(i.asset.sha256, i.body);
  const cache = h.make(); await cache.ready();
  const [a, b] = await Promise.all([cache.acquire(i.asset).promise, cache.acquire(i.asset).promise]);
  assert.equal(h.downloads.length, 1); assert.equal(a.filePath, b.filePath); assert.equal(cache.inspect().leased, 2);
  a.release(); a.release(); assert.ok(h.files.has(b.filePath)); assert.equal(cache.inspect().leased, 1);
  b.release(); await drain();
  const next = h.make("runtime_b"); await next.ready(); const c = await next.acquire(i.asset).promise;
  assert.equal(h.downloads.length, 1); assert.equal(c.filePath, b.filePath); c.release();
  assert.equal(cache.inspect().leased, 0);
});

test("same-length on-disk corruption is rejected by SHA and reacquired; valid black content is retained", async () => {
  const h = harness(), i = image(0); h.bodies.set(i.asset.sha256, i.body);
  const cache = h.make(); const a = await cache.acquire(i.asset).promise; a.release(); await drain();
  const bad = i.body.slice(0); new Uint8Array(bad)[41] = 7; h.files.set(a.filePath, bad);
  const b = await cache.acquire(i.asset).promise;
  assert.equal(h.downloads.length, 2); assert.notEqual(a.filePath, b.filePath); assert.equal(h.files.has(a.filePath), false); b.release();
});

test("clear during an unabortable write cannot publish/delete the new same-SHA attempt", async () => {
  const h = harness(), i = image(); h.bodies.set(i.asset.sha256, i.body); const cache = h.make(); await cache.ready();
  let finish!: () => void, blocked = false;
  h.writeHook = async path => { if (path.includes("/stage-") && !blocked) { blocked = true; await new Promise<void>(resolve => { finish = resolve; }); } };
  const old = cache.acquire(i.asset); const oldResult = old.promise.catch(cause => cause);
  await waitFor(() => blocked);
  assert.equal((await cache.clear()).status, "pending");
  const fresh = cache.acquire(i.asset); finish();
  assert.match((await oldResult).message, /cancelled/);
  const lease = await fresh.promise; await drain();
  assert.ok(h.files.has(lease.filePath)); assert.equal(cache.inspect().entries, 1); assert.equal(cache.inspect().reserved, 0);
  const index = JSON.parse(Buffer.from(h.files.get("/owned/sky-public-images-v1/index-v2.json")!).toString());
  assert.deepEqual(index.entries.map((entry: any) => entry.file), [lease.filePath.split("/").at(-1)]); lease.release();
});

test("clear before boot never restores old entries, and active leases retire until release", async () => {
  const h = harness(), i = image(); h.bodies.set(i.asset.sha256, i.body); const original = h.make();
  const a = await original.acquire(i.asset).promise; a.release(); await drain();
  const next = h.make("runtime_b"); assert.equal((await next.clear()).status, "complete");
  assert.equal(next.inspect().entries, 0); assert.equal(h.files.has(a.filePath), false);
  const b = await next.acquire(i.asset).promise; await drain();
  assert.equal((await next.clear()).status, "partial"); assert.ok(h.files.has(b.filePath));
  b.release(); await drain(); assert.equal((await next.clear()).status, "complete"); assert.equal(h.files.has(b.filePath), false);
});

test("clear during the boot index transaction finishes the new inventory and permits a later explicit acquisition", async () => {
  const h = harness(), i = image(); h.bodies.set(i.asset.sha256, i.body);
  let finish!: () => void, blocked = false;
  h.writeHook = async path => {
    if (path.includes("/index-") && !blocked) { blocked = true; await new Promise<void>(resolve => { finish = resolve; }); }
  };
  const cache = h.make(), staleBoot = cache.ready().catch(cause => cause);
  await waitFor(() => blocked);
  const clearing = cache.clear(); finish();
  assert.equal((await staleBoot).message, "sky_public_image_cancelled");
  assert.equal((await clearing).status, "complete"); await cache.ready();
  assert.equal(cache.inspect().entries, 0);
  const index = JSON.parse(Buffer.from(h.files.get("/owned/sky-public-images-v1/index-v2.json")!).toString());
  assert.deepEqual(index.entries, []);
  const lease = await cache.acquire(i.asset).promise;
  assert.equal(h.downloads.length, 1); assert(lease.isCurrent()); lease.release();
});

test("quota evicts only inactive LRU, includes staging, and rejects a conflicting descriptor without deleting a lease", async () => {
  const h = harness(), one = image(1), two = image(2), three = image(3);
  for (const i of [one, two, three]) h.bodies.set(i.asset.sha256, i.body);
  const cache = h.make("runtime_a", 128), a = await cache.acquire(one.asset).promise;
  const b = await cache.acquire(two.asset).promise; await drain();
  await assert.rejects(cache.acquire(three.asset).promise, /quota/); assert.ok(h.files.has(a.filePath)); assert.ok(h.files.has(b.filePath));
  await assert.rejects(cache.acquire({ ...one.asset, width: 256 }).promise, /descriptor_conflict/);
  assert.ok(h.files.has(a.filePath)); b.release(); await drain();
  const c = await cache.acquire(three.asset).promise;
  assert.equal(h.files.has(b.filePath), false); assert.ok(h.files.has(a.filePath)); assert.ok(cache.inspect().bytes <= 128); a.release(); c.release();
});

test("half-committed/orphan files cannot become a restart hit and unrelated files are untouched", async () => {
  const h = harness(), i = image(); h.bodies.set(i.asset.sha256, i.body);
  const orphan = `/owned/sky-public-images-v1/${i.asset.environment}-${i.asset.sha256}-old_run-1.png`;
  h.files.set(orphan, i.body); h.files.set("/owned/sky-public-images-v1/stage-old_run-2", i.body);
  h.files.set("/owned/sky-public-images-v1/account-export.json", i.body);
  h.files.set("/owned/avatar.png", i.body);
  const cache = h.make(); await cache.ready(); const a = await cache.acquire(i.asset).promise;
  assert.equal(h.downloads.length, 1); assert.equal(h.files.has(orphan), false);
  assert.ok(h.files.has("/owned/sky-public-images-v1/account-export.json")); assert.ok(h.files.has("/owned/avatar.png")); a.release();
});

test("one cancelled waiter does not abort a remaining consumer; final waiter aborts its request", async () => {
  const h = harness(), i = image(); let resolve!: (body: ArrayBuffer) => void, aborted = 0;
  h.transferHook = () => ({ promise: new Promise<ArrayBuffer>(yes => { resolve = yes; }), cancel() { aborted++; } });
  const cache = h.make(); const a = cache.acquire(i.asset), b = cache.acquire(i.asset);
  const cancelled = a.promise.catch(cause => cause); await waitFor(() => !!resolve); a.cancel();
  assert.match((await cancelled).message, /cancelled/); assert.equal(aborted, 0); resolve(i.body);
  const lease = await b.promise; lease.release(); await drain();
  const second = image(2), c = cache.acquire(second.asset); const rejected = c.promise.catch(cause => cause);
  await waitFor(() => h.downloads.length === 2); c.cancel(); assert.equal(aborted, 1);
  resolve(second.body); assert.match((await rejected).message, /cancelled/); await drain();
  assert.equal(cache.inspect().leased, 0);
});

test("restart trims old inventories to the current encoded budget before a warm lease", async () => {
  const h = harness(), images = [image(1), image(2), image(3)];
  const original = h.make();
  for (const i of images) { h.bodies.set(i.asset.sha256, i.body); (await original.acquire(i.asset).promise).release(); await drain(); }
  assert.equal(original.inspect().bytes, 192);
  const next = h.make("runtime_b", 128); await next.ready();
  assert.equal(next.inspect().bytes, 128); assert.equal(next.inspect().entries, 2);
  const recent = await next.acquire(images[2]!.asset).promise;
  assert.equal(h.downloads.length, 3); assert.ok(next.inspect().bytes <= 128); recent.release();
});

test("a failed native boot can recover on the next explicit acquisition without recreating the owner", async () => {
  const h = harness(), i = image(); h.bodies.set(i.asset.sha256, i.body);
  const list = h.fs.list; let unavailable = true;
  h.fs.list = path => unavailable ? Promise.reject(Error("native unavailable")) : list(path);
  const cache = h.make(); await assert.rejects(cache.acquire(i.asset).promise, /native unavailable/); await drain();
  unavailable = false; const a = await cache.acquire(i.asset).promise;
  assert.equal(h.downloads.length, 1); assert.equal(cache.inspect().entries, 1); a.release();
});

test("clear is bounded even when boot filesystem callbacks never settle; late boot cannot resurrect entries", async () => {
  const h = harness(), i = image(); h.bodies.set(i.asset.sha256, i.body); const original = h.make();
  const old = await original.acquire(i.asset).promise; old.release(); await drain();
  const list = h.fs.list; let finish!: (files: string[]) => void;
  h.fs.list = () => new Promise<string[]>(yes => { finish = yes; });
  const next = h.make("runtime_b"); await waitFor(() => !!finish);
  const result = await next.clear(); assert.equal(result.status, "pending");
  finish(await list("/owned/sky-public-images-v1")); await next.ready(); await drain();
  assert.equal(next.inspect().entries, 0); assert.equal(h.files.has(old.filePath), false);
});

test("an immediate acquire after a delivered lease cannot join an already-broadcast job and hang", async () => {
  const h = harness(), i = image(); h.bodies.set(i.asset.sha256, i.body); const cache = h.make();
  const first = await cache.acquire(i.asset).promise;
  // No drain: the previous job's Promise.finally has not yet run.
  let second: Awaited<ReturnType<typeof cache.acquire>["promise"]> | undefined;
  const acquisition = cache.acquire(i.asset); void acquisition.promise.then(value => { second = value; });
  await waitFor(() => !!second);
  assert.equal(h.downloads.length, 1); assert.equal(first.filePath, second!.filePath);
  assert.equal(cache.inspect().leased, 2); first.release(); second!.release();
});
