/** Independent saved-output reader: no GPU/browser/HTTP/test execution. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { builtinModules } from 'node:module';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const source = 'output/playwright/cloud-sky-complete-resource-1003-r2';
const out = process.argv[2];
assert.match(out ?? '', /^output\/complete-resource-independent-1003-r\d+$/u);
fs.mkdirSync(path.resolve(ROOT, out));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = file => fs.readFileSync(path.resolve(ROOT, file));
const text = file => bytes(file).toString('utf8');
const json = file => JSON.parse(text(file));
const identity = b => ({ path: b.path, bytes: b.bytes, sha256: b.sha256 });
const bindings = new Map();
function admit(file, expected) {
  const b = bytes(file), result = { path: file, bytes: b.length, sha256: hash(b) };
  if (expected?.bytes !== undefined) assert.equal(result.bytes, expected.bytes, file);
  if (expected?.sha256) assert.equal(result.sha256, expected.sha256, file);
  const prior = bindings.get(file); if (prior) assert.deepEqual(result, prior, file);
  bindings.set(file, result); return result;
}
function read(file, expected) { admit(file, expected); return json(file); }
fs.copyFileSync(fileURLToPath(import.meta.url), path.resolve(ROOT, out, 'executed-reader.mjs.txt'), fs.constants.COPYFILE_EXCL);

// Independent PNG CRC, inflate, five inverse filters, and full Y-flip oracle.
function crc(b) { let c = 0xffffffff; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return (c ^ 0xffffffff) >>> 0; }
function pngDecode(b) {
  assert.deepEqual(b.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  let at = 8, width = 0, height = 0, ended = false; const chunks = [];
  while (at < b.length) {
    assert(at + 12 <= b.length); const n = b.readUInt32BE(at), end = at + n + 12;
    assert(end <= b.length); assert.equal(crc(b.subarray(at + 4, end - 4)), b.readUInt32BE(end - 4));
    const tag = b.toString('ascii', at + 4, at + 8), data = b.subarray(at + 8, end - 4);
    if (tag === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); assert.deepEqual([...data.subarray(8)], [8, 6, 0, 0, 0]); }
    if (tag === 'IDAT') chunks.push(data); at = end;
    if (tag === 'IEND') { assert.equal(n, 0); ended = true; break; }
  }
  assert(ended); assert.equal(at, b.length); assert.equal(width, 390); assert.equal(height, 844);
  const stride = width * 4, z = inflateSync(Buffer.concat(chunks), { maxOutputLength: (stride + 1) * height });
  assert.equal(z.length, (stride + 1) * height); const result = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = z[y * (stride + 1)]; assert(filter <= 4);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? result[y * stride + x - 4] : 0, up = y ? result[(y - 1) * stride + x] : 0, ul = x >= 4 && y ? result[(y - 1) * stride + x - 4] : 0;
      let p = 0; if (filter === 1) p = a; if (filter === 2) p = up; if (filter === 3) p = (a + up) >> 1;
      if (filter === 4) { const q = a + up - ul, da = Math.abs(q - a), db = Math.abs(q - up), dc = Math.abs(q - ul); p = da <= db && da <= dc ? a : db <= dc ? up : ul; }
      result[y * stride + x] = (z[y * (stride + 1) + x + 1] + p) & 255;
    }
  }
  return result;
}
function differences(a, b) { assert.equal(a.length, b.length); let changedBytes = 0, changedPixels = 0, maxChannelDifference = 0; for (let i = 0; i < a.length; i += 4) { let changed = false; for (let k = 0; k < 4; k++) { const d = Math.abs(a[i + k] - b[i + k]); if (d) { changed = true; changedBytes++; maxChannelDifference = Math.max(maxChannelDifference, d); } } if (changed) changedPixels++; } return { changedBytes, changedPixels, maxChannelDifference, fullBytesExact: changedBytes === 0 }; }

try {
  const r = read(source + '/result.json', { bytes: 16556714, sha256: '80a2270a1d922f86019a9518ba7ef249aeff0603e9676ca709df6b7d9b8c04c3' });
  assert.equal(r.status, 'MEASURED_WITH_FAILURES'); assert.deepEqual(r.errors, []);
  assert.deepEqual(r.retirementFailures, [{ kind: 'native-owner-current-after-hide' }]);
  const before = read(source + '/source-binding-before.json'), after = read(source + '/source-binding-after.json');
  assert.equal(path.resolve(before.absWorkingDir), path.resolve(ROOT)); assert.deepEqual(before.sourceBindings, r.sourceBindings);
  assert.deepEqual(before.sourceBindings.map(identity), after.sourceBindings); assert.deepEqual(after.inputs, r.inputs.map(identity));
  assert.equal(before.inputs.length, 663); assert.equal(r.inputs.length, 733);
  for (const b of [...r.sourceBindings, ...r.inputs, ...before.preserved]) admit(b.path, b);
  assert.deepEqual(before.preserved.map(b => ({ path: b.path, sha256: b.sha256 })), after.preserved.map(b => ({ path: b.path, sha256: b.sha256 })));
  assert.equal(before.preserved.length, 6);
  for (const b of r.sourceBindings) admit(source + '/source-inputs/' + b.path, b);
  const publishedInputs = read(source + '/inputs.json');
  assert.deepEqual(publishedInputs.inputs, before.inputs); assert.deepEqual(publishedInputs.sourceBindings, r.sourceBindings);
  admit(source + '/bundle.js', { sha256: r.compiledSha256 });
  const meta = read(source + '/metafile.json'); assert.equal(r.virtualInputs.length, 5);
  const virtual = new Set(r.virtualInputs.map(b => b.inputKey)); assert.deepEqual(before.virtualInputs, r.virtualInputs);
  for (const key of Object.keys(meta.inputs).filter(k => !virtual.has(k))) { const b = r.sourceBindings.find(b => b.metafileInput === key); assert(b, key); assert.equal(b.resolvedAbsolute, path.resolve(ROOT, key)); }
  const realBrowserGraph = Object.keys(meta.inputs).filter(k => !virtual.has(k));
  const additionalBoundSources = r.sourceBindings.filter(b => !realBrowserGraph.includes(b.metafileInput));
  assert.equal(realBrowserGraph.length, 156); assert.equal(additionalBoundSources.length, 2);
  const node = read(source + '/node-preparation-binding.json'), nodeMeta = read(source + '/node-preparation-metafile.json');
  assert.deepEqual(node.bindings, r.nodePreparationBindings); assert.deepEqual(node.bindings, before.nodePreparationBindings);
  for (const b of node.bindings) admit(source + '/' + b.snapshot, b);
  assert.deepEqual(Object.keys(nodeMeta.inputs).filter(k => k !== 'task-node-preparation.ts').sort(), node.bindings.map(b => b.nodeMetafileInput).sort());
  for (const name of node.externalImports) assert(builtinModules.includes(name) || builtinModules.includes(name.replace(/^node:/u, '')) || ['class-validator', 'class-transformer'].includes(name), name);
  for (const name of ['node-preparation-entry.ts.txt', 'node-preparation-unexecuted-bundle.js', 'executed-script.mts.txt', 'executor-runtime.js.txt', 'executor-gpu.js.txt', 'executor-stable-context.js.txt', 'executor-journey.js.txt', 'executor-final.js.txt']) admit(source + '/' + name);
  assert.deepEqual(read(source + '/toolchain-before.json'), read(source + '/toolchain-after.json'));
  for (const b of r.toolchain.bindings) admit(b.resolvedAbsolute, b);
  const runtime = read(source + '/runtime-metadata-and-offers.json'), offers = new Map();
  for (const a of runtime.assets) { admit(a.path, a); assert(!offers.has(a.id)); offers.set(a.id, a); }
  for (const [route, m] of Object.entries(runtime.metadata)) { const b = r.inputs.find(i => i.route === route); assert(b, route); assert.equal(m.bytes, b.bytes); assert.equal(m.sha256, b.sha256); assert.deepEqual(m.body, read(b.path, b)); }
  const indexEnvelope = read(source + '/sao-index-envelope.json'), saoPub = indexEnvelope.data.publicationHash, saoIndex = indexEnvelope.data.index;
  const dynamic = read(source + '/dynamic-sao-inputs.json'); assert.deepEqual(dynamic, r.dynamicSaoBindings); assert.equal(dynamic.length, 35);
  for (const b of dynamic) { const raw = read(b.source.path, b.source), envelope = read(b.envelope.path, b.envelope); assert.equal(envelope.data.publicationHash, saoPub); assert.deepEqual(envelope.data.tile, raw); assert.equal(raw.tileId, b.id); const tile = saoIndex.tiles.find(t => t.id === b.id || t.tileId === b.id); assert(tile); assert.equal(tile.sha256, b.source.sha256); assert.equal(tile.bytes, b.source.bytes); assert.equal(tile.rowCount, raw.rows.length); assert.equal(b.bindingTime, 'actual requested local tile bound before browser delivery; not initial run source inventory'); }
  const diagnosticFiles = ['diagnostic-loader.ts.txt', 'diagnostic-scene.ts.txt', 'diagnostic-stellar-hook.ts.txt', 'diagnostic-hook.ts.txt', 'diagnostic-cache.ts.txt', 'diagnostic-stellar-loader.ts.txt'];
  for (let i = 0; i < r.instrumented.length; i++) { const entry = r.instrumented[i]; admit(entry.path, { sha256: entry.originalSha256 }); admit(source + '/' + diagnosticFiles[i], { sha256: entry.taskDiagnosticSha256 }); }
  const knownImages = new Map();
  const sourceInfo = s => { if (!s) return null; const a = offers.get(s.offeredId); assert(a, s.offeredId); for (const k of ['sha256', 'width', 'height']) assert.equal(s[k], a[k]); assert.equal(s.status, 'decoded'); const fact = { objectId: s.objectId, offeredId: s.offeredId, sha256: s.sha256, path: s.path, width: s.width, height: s.height, status: s.status }; const old = knownImages.get(s.objectId); if (old) assert.deepEqual(fact, old); else knownImages.set(s.objectId, fact); return fact; };
  // Reconstruct every actual GL handle's logical allocation without consulting author totals.
  const full = r.final.fullGlLedger, records = new Map(), attaches = new Map(), cumulative = { texture: 0, buffer: 0, renderbuffer: 0 }, peaks = { ...cumulative }, atIndex = new Map();
  let uploadBytes = 0, copyBytes = 0, attachmentChecks = 0, staleDiagnosticDrawBindings = 0;
  for (let i = 0; i < full.events.length; i++) {
    const e = full.events[i]; assert.equal(e.index, i); assert(!e.threw, 'actual GL threw');
    if (/^create/u.test(e.operation)) { assert(e.id > 0); assert(!records.has(e.id)); records.set(e.id, { id: e.id, kind: e.kind, alive: true, bytes: ['texture', 'buffer', 'renderbuffer'].includes(e.kind) ? 0 : null, source: null }); }
    if (/^delete/u.test(e.operation)) { const rec = records.get(e.id); if (e.id !== null) { assert(rec); rec.alive = false; } }
    if (e.operation === 'source-upload') { const rec = records.get(e.textureId); assert(rec?.alive && rec.kind === 'texture'); const comps = e.format === 6408 ? 4 : e.format === 6407 ? 3 : e.format === 6410 ? 2 : [6406, 6409].includes(e.format) ? 1 : null; const bpp = e.type === 5121 ? comps : [32819, 32820, 33635].includes(e.type) ? 2 : e.type === 5126 && comps !== null ? comps * 4 : null; assert.equal(e.bytes, bpp === null ? null : e.width * e.height * bpp); rec.bytes = e.bytes; rec.source = sourceInfo(e.source); uploadBytes += e.bytes ?? 0; }
    if (e.operation === 'gpu-copy') { const rec = records.get(e.textureId); assert(rec?.alive); const attach = attaches.get(e.framebufferId)?.get(36064); assert.equal(attach?.objectId ?? null, e.attachmentTextureId); const parent = records.get(e.attachmentTextureId); assert.deepEqual(sourceInfo(e.source), parent?.source ?? null); rec.bytes = e.bytes; rec.source = sourceInfo(e.source); copyBytes += e.bytes; }
    if (e.operation === 'bufferData') { const rec = records.get(e.bufferId); assert(rec?.alive && rec.kind === 'buffer'); rec.bytes = e.bytes; }
    if (e.operation === 'bufferSubData') { const rec = records.get(e.bufferId); assert(rec?.alive); assert.equal(rec.bytes, e.capacity); assert.equal(e.outOfRange, false); assert(e.offset + e.bytes <= rec.bytes); }
    if (e.operation === 'renderbufferStorage') { const rec = records.get(e.renderbufferId); assert(rec?.alive); rec.bytes = e.bytes; }
    if (e.operation === 'attachment') { assert(records.has(e.framebufferId)); let map = attaches.get(e.framebufferId); if (!map) attaches.set(e.framebufferId, map = new Map()); map.set(e.attachment, { kind: e.kind, objectId: e.objectId }); attachmentChecks++; }
    if (['drawArrays', 'drawElements'].includes(e.operation)) { assert(records.get(e.programId)?.alive); for (const t of e.textures) { const rec = records.get(t.textureId); assert(rec); if (!rec.alive) staleDiagnosticDrawBindings++; assert.deepEqual(sourceInfo(t.source), rec.source); } }
    const now = { texture: 0, buffer: 0, renderbuffer: 0 }; for (const rec of records.values()) if (rec.alive && rec.kind in now && rec.bytes !== null) now[rec.kind] += rec.bytes;
    assert.deepEqual(now, e.live, 'full actual handle ledger at ' + i); for (const k of Object.keys(now)) peaks[k] = Math.max(peaks[k], now[k]);
    atIndex.set(i, { live: now, records: [...records.values()].map(rec => ({ ...rec })), peak: { ...peaks } });
  }
  assert.deepEqual(peaks, full.snapshot.totalPeak); assert.deepEqual(full.snapshot.live, { texture: 0, buffer: 0, renderbuffer: 0 }); assert(full.snapshot.handles.every(h => !h.alive));
  const frameFacts = [], rowFacts = [], pixels = new Map(); let accepted = 0;
  for (const row of r.rows) {
    assert.deepEqual(read(source + '/' + row.condition.name + '.json'), row); assert.deepEqual(row.identity, r.rows[0].identity);
    assert.equal(row.ready.hooks.length, 13); assert.equal(row.ready.sao.publicationHash, saoPub); assert(!row.ready.sao.failed && !row.ready.sao.loading); assert.deepEqual(row.gpuFailures, []);
    const scopes = [row.ready, ...row.states, ...row.passes.map(p => p.state)];
    for (const state of scopes) {
      const refs = state.hooks.flatMap(h => h.entries.filter(e => e.current).map(e => e.image)); const unique = new Map(refs.map(s => [s.objectId, sourceInfo(s)]));
      if (state.selected.image && state.selected.state === 'READY') { const s = sourceInfo(state.selected.image); if (!unique.has(s.objectId)) unique.set(s.objectId, s); }
      assert.equal(state.decodedOwnerReferences, refs.length); assert.equal(state.decodedUniqueImages, unique.size); assert.equal(state.decodedSourceRgbaModel, [...unique.values()].reduce((n, i) => n + i.width * i.height * 4, 0));
      for (const l of state.sao.allLoaders) { assert(l.pending.length <= 3); assert.equal(l.viewEncodedByteBudget, 6291456); let used = 0; for (const a of l.loaded) { used += a.encodedSourceBytes; assert.equal(a.tupleNumericPayloadModel, a.tuples * 7 * 8); assert.equal(a.jsObjectBytes, null); } assert(used <= l.viewEncodedByteBudget); }
      for (const c of state.cache) assert(c.running <= 2 && c.reserved >= 0 && c.bytes >= 0);
    }
    const metric = []; for (const p of row.passes) {
      const stem = source + '/' + row.condition.name + '-' + p.label, raw = bytes(stem + '.rgba'), png = bytes(stem + '.png');
      admit(stem + '.rgba', { sha256: p.rgbaSha256 }); admit(stem + '.png', { sha256: p.pngSha256 }); assert.equal(raw.length, 1316640);
      const decoded = pngDecode(png); for (let y = 0; y < 844; y++) assert.deepEqual(decoded.subarray(y * 1560, (y + 1) * 1560), raw.subarray((843 - y) * 1560, (844 - y) * 1560)); pixels.set(row.condition.name + '/' + p.label, raw);
      assert.equal(p.glError, 0); assert.equal(p.publication.lifecycleNotifications, ++accepted); assert.equal(p.publication.actualPublishCount, accepted); assert.equal(p.publication.stagedSnapshotId, p.publication.publishedSnapshotId);
      const kinds = p.stagedAccepted.map(x => x.kind); assert(kinds.indexOf('staged') < kinds.indexOf('done')); assert(kinds.indexOf('done') < kinds.indexOf('lifecycle-presented-notification')); assert(kinds.indexOf('lifecycle-presented-notification') < kinds.indexOf('actual-page-publish'));
      for (const e of p.gpu.events) assert.deepEqual(e, full.events[e.index]); const first = p.gpu.events[0]?.index, last = p.gpu.events.at(-1)?.index; assert(first !== undefined && last !== undefined);
      const snap = atIndex.get(last), initial = first ? atIndex.get(first - 1).live : { texture: 0, buffer: 0, renderbuffer: 0 }; const peak = { ...initial };
      for (const e of p.gpu.events) for (const k of Object.keys(peak)) peak[k] = Math.max(peak[k], e.live[k]); assert.deepEqual(peak, p.gpu.framePeak); assert.deepEqual(snap.live, p.gpu.live); assert.equal(p.gpu.liveBytes, snap.live.texture);
      const liveTex = snap.records.filter(t => t.alive && t.kind === 'texture'); assert.equal(liveTex.length, p.gpu.aliveTextures); assert.deepEqual(p.gpu.retained.map(t => [t.id, t.bytes]).sort((a, b) => a[0] - b[0]), liveTex.map(t => [t.id, t.bytes]).sort((a, b) => a[0] - b[0]));
      for (const a of p.gpu.attachments) { const recorded = snap.records.find(t => t.id === a.framebufferId); assert.equal(a.alive, recorded.alive); for (const x of a.attachments) { const object = snap.records.find(t => t.id === x.objectId); assert.equal(x.objectAlive, object?.alive ?? false); assert.equal(x.bytes, object?.bytes ?? null); } }
      assert.equal(p.gpu.ordinaryDrawingBuffer.rgba8ReadbackModel, 1316640); assert.equal(p.gpu.ordinaryDrawingBuffer.alphaBits, 0); assert.equal(p.gpu.driverBytes, null); assert.equal(p.gpu.processRssBytes, null);
      const f = { name: row.condition.name, label: p.label, uploadBytes: p.gpu.events.filter(e => e.operation === 'source-upload').reduce((n, e) => n + (e.bytes ?? 0), 0), copyBytes: p.gpu.events.filter(e => e.operation === 'gpu-copy').reduce((n, e) => n + e.bytes, 0), logicalPeak: peak, logicalFrameEnd: snap.live, decodedRgbaModel: p.state.decodedSourceRgbaModel, fileLeases: p.state.cache[0].leased, saoResolved: p.saoSceneObservation.resolvedPoints, saoProjected: p.saoSceneObservation.projectedRendered, presentedSdss: p.presented.sdss, credit: p.sourceCredit };
      metric.push(f); frameFacts.push(f);
    }
    const transfers = {}; for (const t of row.transfers) { assert(t.completed); transfers[t.resourceFamily] ??= { requests: 0, deliveredBytes: 0, failed: 0, aborted: 0 }; const group = transfers[t.resourceFamily]; group.requests++; if (t.failed) group.failed++; else if (t.aborted) group.aborted++; else group.deliveredBytes += t.bytes; if (t.type === 'image') assert(runtime.assets.some(a => a.sha256 === t.sha256 && a.bytes === t.bytes)); }
    rowFacts.push({ name: row.condition.name, submits: row.passes.length, wanted: row.ready.hooks.map(h => ({ name: h.name, ids: h.wanted.map(a => a.id) })), readyDecodedRgbaModel: row.ready.decodedSourceRgbaModel, encodedCache: row.ready.cache[0].bytes, resolvedSao: row.ready.sao.points, transfers, warmUploadBytes: metric.at(-1).uploadBytes, warmCopyBytes: metric.at(-1).copyBytes });
  }
  assert.equal(accepted, 38); assert.deepEqual(r.rows.map(row => row.passes.length), [4, 4, 19, 7, 4]);
  const detail = r.rows[3]; const failed = detail.passes.find(p => p.label === 'detail-once-failed-coarse-live'), recovered = detail.passes.find(p => p.label === 'detail-real-retry-recovered');
  assert.deepEqual(failed.state.sdss, { requested: true, loading: false, failed: false, updateFailed: true, renderedLevel: 'MEDIUM', parent: 'OVERVIEW' });
  assert.equal(failed.presented.sdss.image.objectId, 25); assert.equal(failed.presented.sdss.kind, 'legacy'); assert.equal(recovered.state.sdss.renderedLevel, 'DETAIL'); assert.equal(recovered.state.sdss.updateFailed, false);
  assert.equal(detail.transfers.filter(t => t.held && t.failed).length, 1); assert(detail.transfers.some(t => t.sha256 === 'a9f3884874773293589bedac159ac0d1d479f9cf8130e21c74ebcaf6a7cc9447' && !t.failed));
  assert.deepEqual(read(source + '/actual-final-owner.json'), r.final); assert.deepEqual(read(source + '/retirement-observations.json').failures ?? r.retirementFailures, r.retirementFailures);
  for (const key of ['afterHide', 'afterClear']) { assert(r.final[key].cache.every(c => !c.leased && !c.running && !c.pending && !c.reserved)); assert.equal(r.final[key].counters.nativeRunning, 0); assert.equal(r.final[key].counters.decodedPending, 0); assert(r.final[key].sao.every(l => l.disposed && !l.pending.length && !l.loaded.length)); assert(r.final[key].gpu.handles.every(h => !h.alive)); }
  assert(r.final.afterClear.cache.every(c => !c.bytes && !c.entries));
  const diagnosticCurrent = r.final.afterHide.nativeCurrent.filter(s => s.current); assert.equal(diagnosticCurrent.length, 1); assert.equal(diagnosticCurrent[0].objectId, 26);
  const candidateRefs = r.rows.flatMap(row => [...row.states, row.ready, ...row.passes.map(p => p.state)].flatMap(s => s.hooks.flatMap(h => h.entries.filter(e => e.image?.objectId === 26))));
  const candidateGpu = full.events.filter(e => e.source?.objectId === 26 || e.textures?.some(t => t.source?.objectId === 26)); assert.equal(candidateRefs.length, 0); assert.equal(candidateGpu.length, 0);
  // Read-only join of the separate real owner/controlled image cancellation witness.
  const cpuPath = 'output/native-image-membership-observation-1003-r1', cpu = read(cpuPath + '/result.json', { sha256: 'cb96a155d802e0ac0f080e1db92d4bc7ae29590e92120773b3dbbbe95f1ce47f' });
  const cpuBefore = read(cpuPath + '/bindings-before.json'), cpuAfter = read(cpuPath + '/bindings-after.json'); assert.deepEqual(cpuBefore, cpuAfter); assert.deepEqual(cpu.bindings, cpuBefore);
  for (const b of cpu.bindings) admit(b.path, b);
  for (const name of ['actual-entry.ts.txt', 'actual-registry-readonly.ts.txt', 'bundle.mjs', 'metafile.json', 'executed-script.mts.txt']) admit(cpuPath + '/' + name);
  const loaderPath = 'apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts', loaderRaw = text(loaderPath), readonlyTail = '\nexport function taskNativeLifetime(image:object){const value=nativeImageLifetimes.get(image);return {registered:Boolean(value),retired:value?.retired??null,callbackCurrent:value?.current?.()??null,apiCurrent:skyNativeImageIsCurrent(image)};}\n';
  assert.equal(text(cpuPath + '/actual-registry-readonly.ts.txt'), loaderRaw + readonlyTail); assert.equal(hash(loaderRaw), cpu.registryObservation.originalSha256);
  assert.equal(hash(loaderRaw + readonlyTail), cpu.registryObservation.taskReadonlySha256);
  assert.deepEqual(cpu.observations.slice(0, 3).map(o => o.lifetime), Array(3).fill({ registered: false, retired: null, callbackCurrent: null, apiCurrent: true }));
  assert.deepEqual(cpu.observations[3].lifetime, { registered: true, retired: false, callbackCurrent: true, apiCurrent: true }); assert.deepEqual(cpu.observations[4].lifetime, { registered: true, retired: true, callbackCurrent: null, apiCurrent: false });
  assert.equal(cpu.observations[0].productionCallbackAttached, true); assert.equal(cpu.observations[1].productionCallbackAttached, false); assert(cpu.observations.slice(1, 3).every(o => o.cache.leased === 0 && !o.currentOwnerImages.length));
  assert(cpu.mutant.oldAllCreatedApiCurrentWouldFlagUnownedImage && cpu.mutant.registeredOwnerPredicateCorrectlyExcludesIt); assert.equal(cpu.cleanup.cache.bytes, 0);
  assert.equal(cpu.originalR2.directImage26WeakMapEvidence, 'UNKNOWN; this new CPU control does not retrospectively observe that old browser instance');
  const warmReturns = differences(pixels.get('moon45-cold-and-warm/normal-warm'), pixels.get('return-moon45/normal-warm'));
  const limits = [
    'R2 keeps MEASURED_WITH_FAILURES and its one retirement-oracle failure. Bitmap26 WeakMap membership was not captured: absence from ready/submitted/uploaded records is observed; unregistered cancellation classification remains inference, not historical membership evidence.',
    'Actual page AST/React/query/lifecycle/MapFS/Taro transport and HTMLImage/browser WebGL are controlled execution. Source/bytes identities are real; no WeChat/native/device/gesture/TanStack/HTTP authorization/cache-capacity/FPS/200DAU claim.',
    'Native callback peak is a mixed metadata+image+SAO transport count; public compressed-image cache running<=2 is checked independently. SAO 6MiB counts index tile encoded bytes, not tuple JS heap or resolved/projected memory.',
    'Logical storage includes active textures and source-copy overlap; FBO attachments reference allocations without double counting. Drawing-buffer readback plane is separate; shader delete request, driver reclaim, RSS/GC/native texture memory unknown.',
    'Science-v2 and LOCAL optical fixture remain inactive. Legacy SDSS JPEG coverage/quality unknown, W3 does not acquire optical credit. Actual source priority/availability can coexist with valid independent decoded images.',
    'Strong retained diagnostic HTMLImage/readPixels/PNG/base64/metadata/JSON copies are measurement overhead; decoded reference RGBA estimates are not measured physical memory. First-paint transitions are controlled camera qualification feedback, not touch/sensor timing.',
    'Node metadata-only unexecuted graph and declared unused Nest optionals are bounded preparation binding, not a whole server loaded-module or reproducible-environment certification.'
  ];
  const result = { status: 'INDEPENDENT_SAVED_OUTPUT_READBACK_WITH_UNRESOLVED_RETIREMENT_ORACLE', actual: admit(source + '/result.json'), sourceBindings: r.sourceBindings.length, realBrowserGraphInputs: realBrowserGraph.length, additionalBoundSources: additionalBoundSources.map(identity), nodeGraphBindings: node.bindings.length, explicitVirtualInputs: r.virtualInputs.length, actualInputs: r.inputs.length, dynamicSaoSources: dynamic.length, actualOffers: offers.size, fullPngRgbaPairs: accepted, fullGlEvents: full.events.length, fullLogicalLedgerRecomputed: true, fboAttachmentReferencesChecked: attachmentChecks, staleDiagnosticDrawBindings, sourceUploadBytes: uploadBytes, gpuCopyBytes: copyBytes, logicalPeak: peaks, frameFacts, rows: rowFacts, sameReportCanvasRendererIdentity: r.rows[0].identity, sameNormalCameraReturnPixelDifferences: warmReturns, final: { cacheAfterHide: r.final.afterHide.cache, cacheAfterClear: r.final.afterClear.cache, actualHandlesAllDeleted: true, saoAllDisposed: true, diagnosticCurrent, bitmap26InHookReadyOrEntry: candidateRefs.length, bitmap26InAnyGlEvent: candidateGpu.length, bitmap26HistoricalWeakMembership: null }, controlledCpuCancellationWitness: { result: admit(cpuPath + '/result.json'), bindings: cpu.bindings.length, readOnlyWeakMapAppendExact: true, lateUnregisteredApiTrue: true, registeredDisposeApiFalse: true, lastPublishedMapAfterDisposeIsHistoricalNotCurrentEntries: true, oldR2MembershipRemainsUnknown: true }, preservedFiles: 6, limits };
  const beforeReadback = [...bindings.values()], afterReadback = beforeReadback.map(b => { const current = bytes(b.path); return { path: b.path, bytes: current.length, sha256: hash(current) }; }); assert.deepEqual(afterReadback, beforeReadback);
  fs.writeFileSync(path.resolve(ROOT, out, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  fs.writeFileSync(path.resolve(ROOT, out, 'binding.json'), JSON.stringify({ inputsBefore: beforeReadback, inputsAfter: afterReadback, unchanged: true }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ result: admit(out + '/result.json'), binding: admit(out + '/binding.json'), pairs: accepted, peaks, currentDiagnostic: diagnosticCurrent.map(s => s.objectId), warmReturns }));
} catch (cause) { fs.writeFileSync(path.resolve(ROOT, out, 'failed.json'), JSON.stringify({ status: 'FAILED_INDEPENDENT_READER', message: String(cause), stack: cause?.stack, bindings: [...bindings.values()] }, null, 2) + '\n', { flag: 'wx' }); throw cause; }
