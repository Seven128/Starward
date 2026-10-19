import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('package.json'));
const { TraceMap, originalPositionFor } = require('@jridgewell/trace-mapping');
const taskRoot = path.resolve('.codex/work-items/sky-map-performance-2026-10-18');
const candidateRoot = path.join(taskRoot, 'tmp/r17-normal-baseline-v3-review-r2');
const privateRoot = 'E:/Dev/Starward-data';
const profileFile = path.join(privateRoot, 'verification/sky-map-20261018/normal-v3-r2/normal-sky-main.cpuprofile');
const profileBytes = fs.readFileSync(profileFile);
const profile = JSON.parse(profileBytes);
const manifest = JSON.parse(fs.readFileSync(path.join(candidateRoot, 'manifest.json'), 'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readPrivate = rel => JSON.parse(fs.readFileSync(path.join(privateRoot, rel), 'utf8'));
const artifacts = {
  metrics: readPrivate('verification/sky-map-20261018/probe-metrics/baseline-r17-1-kld3md55q3.json'),
  terminal: readPrivate('verification/sky-map-20261018/probe-metrics/baseline-r17-1-kld3md55q3-terminal.json'),
  playEvent: readPrivate('development/r17-normal-profile/normal-v3-r2-play-event.private.json'),
  profileEvent: readPrivate('development/r17-normal-profile/normal-v3-r2-profile.private.json'),
};

function shape(value, depth = 0) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return { array: value.length, item: value.length && depth < 4 ? shape(value[0], depth + 1) : undefined };
  if (typeof value === 'object') return depth > 1 ? { objectKeys: Object.keys(value).slice(0, 12), keyCount: Object.keys(value).length } : Object.fromEntries(Object.entries(value).slice(0, 30).map(([k, v]) => [k, shape(v, depth + 1)]));
  return typeof value;
}

const scriptInfo = new Map();
for (const node of profile.nodes) {
  const frame = node.callFrame;
  const key = frame.scriptId;
  const item = scriptInfo.get(key) ?? { scriptId: key, urlHash: sha256(frame.url ?? ''), nodeCount: 0, sampledHits: 0, basename: null };
  item.nodeCount++;
  item.sampledHits += node.hitCount ?? 0;
  item.minLine = Math.min(item.minLine ?? Infinity, frame.lineNumber);
  item.maxLine = Math.max(item.maxLine ?? -Infinity, frame.lineNumber);
  item.maxColumn = Math.max(item.maxColumn ?? -Infinity, frame.columnNumber);
  const normalized = (frame.url ?? '').replaceAll('\\', '/').split(/[?#]/)[0];
  const tail = normalized.split('/').pop();
  item.basename = tail && /^[a-zA-Z0-9_.-]{1,100}$/.test(tail) ? tail : (frame.url ? 'non-file-script' : 'no-url');
  scriptInfo.set(key, item);
}

if (process.argv.includes('--inspect')) {
  console.log(JSON.stringify({
    profile: { bytes: profileBytes.length, sha256: sha256(profileBytes), keys: Object.keys(profile), nodes: profile.nodes.length, samples: profile.samples?.length, deltas: profile.timeDeltas?.length, startTimeType: typeof profile.startTime, durationUs: profile.endTime - profile.startTime, deltaSumUs: profile.timeDeltas?.reduce((a, b) => a + b, 0), scripts: [...scriptInfo.values()] },
    manifest: { mode: manifest.mode, variant: manifest.variant, buildGeneration: manifest.buildGeneration, probeVersion: manifest.probeVersion, buildSourceSha256: manifest.buildSourceSha256, keys: Object.keys(manifest) },
    artifacts: Object.fromEntries(Object.entries(artifacts).map(([k, v]) => [k, shape(v)])),
  }, null, 2));
}

function safeFunctionName(value) {
  return value === '' ? '(anonymous)' : /^[\w$ .:<>()\[\]/=-]{1,80}$/.test(value) ? value : '(unprinted name)';
}
function walkFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walkFiles(path.join(root, d.name)) : [path.join(root, d.name)]);
}
const nodes = new Map(profile.nodes.map(n => [n.id, n]));
const weighted = new Map();
const counts = new Map();
let elapsedUs = 0;
let invalidSampleReferences = 0;
const deltaStats = { negative: 0, zero: 0, above10ms: 0, above100ms: 0, min: Infinity, max: -Infinity };
for (let i = 0; i < profile.samples.length; i++) {
  const id = profile.samples[i];
  const delta = profile.timeDeltas[i];
  if (!nodes.has(id)) invalidSampleReferences++;
  weighted.set(id, (weighted.get(id) ?? 0) + delta);
  counts.set(id, (counts.get(id) ?? 0) + 1);
  elapsedUs += delta;
  deltaStats.negative += delta < 0;
  deltaStats.zero += delta === 0;
  deltaStats.above10ms += delta > 10000;
  deltaStats.above100ms += delta > 100000;
  deltaStats.min = Math.min(deltaStats.min, delta);
  deltaStats.max = Math.max(deltaStats.max, delta);
}
const safeFrame = n => ({ nodeId: n.id, scriptId: n.callFrame.scriptId, script: scriptInfo.get(n.callFrame.scriptId)?.basename, function: safeFunctionName(n.callFrame.functionName), line0: n.callFrame.lineNumber, column0: n.callFrame.columnNumber, samples: counts.get(n.id) ?? 0, weightedMs: (weighted.get(n.id) ?? 0) / 1000 });

if (process.argv.includes('--mapping-inspect')) {
  const mapFiles = walkFiles(path.join(candidateRoot, 'source-maps'));
  const mapStats = mapFiles.map(file => {
    const map = JSON.parse(fs.readFileSync(file));
    const relative = path.relative(path.join(candidateRoot, 'source-maps'), file).replaceAll('\\', '/');
    const js = path.join(candidateRoot, 'project/weapp', relative.slice(0, -4));
    const code = fs.existsSync(js) ? fs.readFileSync(js, 'utf8') : '';
    return { map: relative, file: map.file, sourceCount: map.sources.length, jsExists: fs.existsSync(js), lineLengths: code.split('\n').map((s, i) => ({ line0: i, chars: s.length })).filter(v => v.chars > 100), mappingLines: map.mappings.split(';').length };
  });
  console.log(JSON.stringify({ deltaStats, invalidSampleReferences, hitCountSum: profile.nodes.reduce((a, n) => a + (n.hitCount ?? 0), 0), topSelf: [...profile.nodes].sort((a, b) => (weighted.get(b.id) ?? 0) - (weighted.get(a.id) ?? 0)).slice(0, 45).map(safeFrame), mapStats }, null, 2));
}

if (process.argv.includes('--offset-inspect')) {
  const { parse } = require('@babel/parser');
  const relevant = ['app.js', 'common.js', 'vendors.js', 'taro.js', 'runtime.js', 'sky/detail/index.js', 'sky/sub-vendors.js'];
  const anchors = [];
  const fnTypes = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod', 'ClassMethod']);
  for (const relative of relevant) {
    const code = fs.readFileSync(path.join(candidateRoot, 'project/weapp', relative), 'utf8');
    const ast = parse(code, { sourceType: 'unambiguous', tokens: true });
    const found = [];
    function visit(node, parent) {
      if (!node || typeof node !== 'object') return;
      if (fnTypes.has(node.type)) {
        const name = node.id?.name ?? node.key?.name ?? (parent?.type === 'ObjectProperty' ? parent.key?.name ?? parent.key?.value : parent?.type === 'VariableDeclarator' ? parent.id?.name : undefined);
        if (['motionAt', 'forEachProjected', 'mayProjectVector', 'batchRender', 'startCpuProfiling'].includes(name)) found.push({ name, start: node.start, line0: node.loc.start.line - 1, column: node.loc.start.column, priorCommentChars: ast.comments.filter(c => c.end < node.start && c.loc.start.line === node.loc.start.line).reduce((sum, c) => sum + c.end - c.start, 0) });
      }
      for (const [key, value] of Object.entries(node)) {
        if (['loc', 'tokens', 'comments', 'extra'].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(v => visit(v, node));
        else if (value && typeof value === 'object') visit(value, node);
      }
    }
    visit(ast, null);
    anchors.push({ file: relative, bytes: Buffer.byteLength(code), sha256: sha256(code), commentChars: ast.comments.reduce((sum, c) => sum + c.end - c.start, 0), lineLengths: code.split('\n').map((s, i) => ({ line0: i, chars: s.length })).filter(v => v.chars > 100), found });
  }
  const byLine = new Map();
  for (const n of profile.nodes) {
    if (![30, 33, 38].includes(n.callFrame.scriptId)) continue;
    const key = `${n.callFrame.scriptId}:${n.callFrame.lineNumber}`;
    const row = byLine.get(key) ?? { scriptId: n.callFrame.scriptId, line0: n.callFrame.lineNumber, samples: 0, nodes: 0, minColumn: Infinity, maxColumn: 0 };
    row.samples += counts.get(n.id) ?? 0; row.nodes++; row.minColumn = Math.min(row.minColumn, n.callFrame.columnNumber); row.maxColumn = Math.max(row.maxColumn, n.callFrame.columnNumber);
    byLine.set(key, row);
  }
  const negative = profile.timeDeltas.filter(v => v < 0);
  console.log(JSON.stringify({ anchors, profileLines: [...byLine.values()].sort((a, b) => b.samples - a.samples).slice(0, 12), negativeDeltaTotalUs: negative.reduce((a, b) => a + b, 0) }, null, 2));
}

if (process.argv.includes('--reformat-inspect')) {
  const { parse } = require('@babel/parser');
  const { minify } = require('terser');
  const original = fs.readFileSync(path.join(candidateRoot, 'project/weapp/sky/detail/index.js'), 'utf8');
  const results = [];
  const variants = [
    ['formatOnly', { compress: false, mangle: false, format: { comments: false } }],
    ['compressOnly', { compress: true, mangle: false, format: { comments: false } }],
    ['compressAndMangle', { compress: true, mangle: true, format: { comments: false } }],
  ];
  for (const [label, options] of variants) {
    const result = await minify(original, options);
    const ast = parse(result.code, { sourceType: 'unambiguous' });
    const anchors = [];
    function visit(node, parent) {
      if (!node || typeof node !== 'object') return;
      if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod'].includes(node.type)) {
        const name = node.id?.name ?? node.key?.name ?? (parent?.type === 'ObjectProperty' ? parent.key?.name ?? parent.key?.value : parent?.type === 'VariableDeclarator' ? parent.id?.name : undefined);
        if (['motionAt', 'forEachProjected', 'mayProjectVector'].includes(name)) anchors.push({ name, column: node.loc.start.column });
      }
      for (const [key, value] of Object.entries(node)) {
        if (['loc', 'tokens', 'comments', 'extra'].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(v => visit(v, node));
        else if (value && typeof value === 'object') visit(value, node);
      }
    }
    visit(ast, null);
    results.push({ label, chars: result.code.length, anchors });
  }
  console.log(JSON.stringify(results, null, 2));
}

const boundSourceBySha = new Map();
for (const [relative, hash] of Object.entries(manifest.sourceBindings)) {
  if (typeof hash !== 'string') continue;
  boundSourceBySha.set(hash, [...(boundSourceBySha.get(hash) ?? []), relative]);
}
function normalizeSource(value, content) {
  if (!value) return null;
  if (typeof content === 'string') {
    const candidates = boundSourceBySha.get(sha256(content));
    if (candidates?.length === 1) return candidates[0];
  }
  const normalized = value.replaceAll('\\', '/');
  for (const prefix of ['apps/', 'packages/', 'node_modules/']) {
    const at = normalized.indexOf(prefix);
    if (at >= 0) return normalized.slice(at);
  }
  const at = normalized.indexOf('/src/');
  if (at >= 0) return `apps/wechat-miniapp${normalized.slice(at)}`;
  return /^(webpack\/|webpack\/runtime\/)/.test(normalized) ? normalized : `unresolved-source:${sha256(normalized).slice(0, 12)}`;
}

function makeFunctionCatalog() {
  const { parse } = require('@babel/parser');
  const entries = [];
  const mapsRoot = path.join(candidateRoot, 'source-maps');
  for (const mapFile of walkFiles(mapsRoot)) {
    const rawMap = JSON.parse(fs.readFileSync(mapFile));
    const relative = path.relative(mapsRoot, mapFile).replaceAll('\\', '/').slice(0, -4);
    const code = fs.readFileSync(path.join(candidateRoot, 'project/weapp', relative), 'utf8');
    const trace = new TraceMap(rawMap);
    const ast = parse(code, { sourceType: 'unambiguous' });
    function visit(node, parent) {
      if (!node || typeof node !== 'object') return;
      if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod', 'ClassMethod'].includes(node.type)) {
        const name = node.id?.name ?? node.key?.name ?? (parent?.type === 'ObjectProperty' ? parent.key?.name ?? parent.key?.value : parent?.type === 'VariableDeclarator' ? parent.id?.name : undefined);
        const original = originalPositionFor(trace, { line: node.loc.start.line, column: node.loc.start.column });
        const sourceIndex = trace.resolvedSources.indexOf(original.source);
        const content = trace.sourcesContent?.[sourceIndex];
        entries.push({ name, compiledFile: relative, compiledLine0: node.loc.start.line - 1, compiledColumn0: node.loc.start.column, source: normalizeSource(original.source, content), sourceLine: original.line, sourceColumn: original.column, originalName: safeFunctionName(original.name ?? ''), sourceContentBound: typeof content === 'string' && (boundSourceBySha.get(sha256(content)) ?? []).length === 1 });
      }
      for (const [key, value] of Object.entries(node)) {
        if (['loc', 'tokens', 'comments', 'extra'].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(v => visit(v, node));
        else if (value && typeof value === 'object') visit(value, node);
      }
    }
    visit(ast, null);
  }
  return entries;
}

const parents = new Map();
let duplicateParents = 0;
let invalidChildReferences = 0;
for (const n of profile.nodes) {
  for (const child of n.children ?? []) {
    if (parents.has(child)) duplicateParents++;
    if (!nodes.has(child)) invalidChildReferences++;
    parents.set(child, n.id);
  }
}
const ancestryCache = new Map();
function ancestry(id) {
  if (ancestryCache.has(id)) return ancestryCache.get(id);
  const result = []; const seen = new Set(); let current = id;
  while (nodes.has(current)) {
    if (seen.has(current)) throw new Error('Cycle in profile tree');
    seen.add(current); result.push(current); current = parents.get(current);
  }
  ancestryCache.set(id, result); return result;
}
const inclusive = new Map();
for (const [id, count] of counts) for (const ancestor of ancestry(id)) inclusive.set(ancestor, (inclusive.get(ancestor) ?? 0) + count);

if (process.argv.includes('--semantic-inspect')) {
  const functions = makeFunctionCatalog();
  const summaries = new Map();
  const byName = new Map();
  for (const entry of functions) if (entry.name) byName.set(entry.name, [...(byName.get(entry.name) ?? []), entry]);
  for (const n of profile.nodes) {
    const name = n.callFrame.functionName;
    if (!/^[A-Za-z_$][\w$]{5,80}$/.test(name)) continue;
    const entry = summaries.get(name) ?? { name, selfSamples: 0, inclusiveUpperBoundSamples: 0, runtimeLocations: new Set(), candidateOwners: byName.get(name) ?? [] };
    entry.selfSamples += counts.get(n.id) ?? 0;
    entry.inclusiveUpperBoundSamples += inclusive.get(n.id) ?? 0;
    entry.runtimeLocations.add(`${n.callFrame.scriptId}:${n.callFrame.lineNumber}:${n.callFrame.columnNumber}`);
    summaries.set(name, entry);
  }
  console.log(JSON.stringify({ functionCount: functions.length, sourceBindingValueTypes: [...new Set(Object.values(manifest.sourceBindings).map(v => typeof v))], tree: { duplicateParents, invalidChildReferences }, names: [...summaries.values()].sort((a, b) => b.inclusiveUpperBoundSamples - a.inclusiveUpperBoundSamples).slice(0, 23).map(v => ({ ...v, runtimeLocations: [...v.runtimeLocations], candidateOwners: v.candidateOwners.slice(0, 5), candidateOwnerCount: v.candidateOwners.length })) }, null, 2));
}

if (process.argv.includes('--tree-inspect')) {
  const topLocations = new Map();
  for (const n of profile.nodes) {
    if (!n.callFrame.url || (counts.get(n.id) ?? 0) === 0) continue;
    const f = n.callFrame; const key = `${f.scriptId}:${f.lineNumber}:${f.columnNumber}`;
    const row = topLocations.get(key) ?? { frame: safeFrame(n), selfSamples: 0, contexts: [] };
    row.selfSamples += counts.get(n.id) ?? 0;
    row.contexts.push({ samples: counts.get(n.id) ?? 0, parents: ancestry(n.id).slice(1, 11).map(id => { const v = nodes.get(id); return { function: safeFunctionName(v.callFrame.functionName), scriptId: v.callFrame.scriptId, line0: v.callFrame.lineNumber, column0: v.callFrame.columnNumber }; }) });
    topLocations.set(key, row);
  }
  const namedUnions = new Map();
  for (const [id, count] of counts) {
    const names = new Set(ancestry(id).map(v => nodes.get(v).callFrame.functionName));
    for (const name of names) if (/^[A-Za-z_$][\w$]{5,80}$/.test(name)) namedUnions.set(name, (namedUnions.get(name) ?? 0) + count);
  }
  console.log(JSON.stringify({ topLocations: [...topLocations.values()].sort((a, b) => b.selfSamples - a.selfSamples).slice(0, 9).map(v => ({ frame: v.frame, selfSamples: v.selfSamples, contexts: v.contexts.sort((a, b) => b.samples - a.samples).slice(0, 1).map(c => ({ samples: c.samples, parents: c.parents.map(p => `${p.scriptId}:${p.line0}:${p.column0} ${p.function}`) })) })), namedUnions: [...namedUnions].sort((a, b) => b[1] - a[1]).slice(0, 25) }, null, 2));
}

if (process.argv.includes('--windows-inspect')) {
  const deviceEvidenceRoot = path.join(privateRoot, 'verification/sky-map-20261018/normal-v3-r2/bound-device-session');
  const prefixes = ['screen-02bcd502', 'screen-ebd17776-c717-4995-93e0-957d1c312866', 'screen-9415ce82-21b3-460f-a838-042a8dd176f3', 'screen-83ae6800-aa05-4132-aead-de959ba1932c'];
  const captures = prefixes.map((prefix, i) => {
    const file = fs.readdirSync(deviceEvidenceRoot).find(v => v.startsWith(prefix) && v.endsWith('.json'));
    return { index: i, found: Boolean(file), structure: file ? shape(JSON.parse(fs.readFileSync(path.join(deviceEvidenceRoot, file), 'utf8'))) : null };
  });
  const resultFile = path.join(taskRoot, 'R17-NORMAL-BASELINE-V3-RESULT.json');
  const result = fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile, 'utf8')) : {};
  const memoryFile = path.join(privateRoot, 'verification/sky-map-20261018/normal-v3-r2/normal-v3-r2-cpu-1792360492564.ndjson');
  const memory = fs.existsSync(memoryFile) ? fs.readFileSync(memoryFile, 'utf8').trim().split('\n').map(v => JSON.parse(v)) : [];
  console.log(JSON.stringify({ captures, rootResultKeys: Object.keys(result), rootResultMemoryShape: shape(result.memory ?? result.processMemory), memoryRows: memory.length, memoryFirstShape: shape(memory[0]), profileMtimeType: typeof artifacts.profileEvent.source.mtime, profileMtimeMinusPlayStartMs: artifacts.profileEvent.source.mtime * 1000 - artifacts.playEvent.inputStartAt, playInputBracketWidthMs: artifacts.playEvent.inputEndAt - artifacts.playEvent.inputStartAt, terminalControls: artifacts.terminal.controls, metricControls: artifacts.metrics.controls, metricWindow: artifacts.metrics.window }, null, 2));
}

if (process.argv.includes('--write')) {
  const rootResultFile = path.join(taskRoot, 'R17-NORMAL-BASELINE-V3-RESULT.json');
  const rootResultBytes = fs.readFileSync(rootResultFile);
  const rootResult = JSON.parse(rootResultBytes);
  if (rootResult.bundleSha256 !== manifest.result.bundleSha256 || rootResult.buildSourceSha256 !== manifest.buildSourceSha256 || artifacts.metrics.binding.buildSourceSha256 !== manifest.buildSourceSha256) throw new Error('Candidate/phone/probe identity mismatch');
  if (sha256(profileBytes) !== artifacts.profileEvent.sha256 || profileBytes.length !== artifacts.profileEvent.source.bytes) throw new Error('Private profile copy identity mismatch');
  if (invalidSampleReferences || invalidChildReferences || duplicateParents) throw new Error('Malformed sample tree');
  const { fingerprintBundle } = await import('../../../../tools/miniapp/release-bundle-artifact.mjs');
  const bundleReadback = await fingerprintBundle(path.join(candidateRoot, 'project/weapp'));
  if (bundleReadback.sha256 !== manifest.result.bundleSha256) throw new Error('Current source-map companion bundle mismatch');
  const mapReadback = manifest.result.sourceMaps.records.map(record => {
    const file = path.resolve(candidateRoot, 'source-maps', record.file);
    if (!file.startsWith(`${path.resolve(candidateRoot, 'source-maps')}${path.sep}`)) throw new Error('Map path escaped candidate');
    const bytes = fs.readFileSync(file);
    if (bytes.length !== record.bytes || sha256(bytes) !== record.sha256) throw new Error('Source-map readback mismatch');
    return { file: record.file, bytes: bytes.length, sha256: record.sha256 };
  });
  const functions = makeFunctionCatalog();
  const durationMs = (profile.endTime - profile.startTime) / 1000;
  const captureRoot = path.join(privateRoot, 'verification/sky-map-20261018/normal-v3-r2/bound-device-session');
  const prefixes = ['screen-02bcd502', 'screen-ebd17776-c717-4995-93e0-957d1c312866', 'screen-9415ce82-21b3-460f-a838-042a8dd176f3', 'screen-83ae6800-aa05-4132-aead-de959ba1932c'];
  const captures = prefixes.map(prefix => {
    const file = fs.readdirSync(captureRoot).find(v => v.startsWith(prefix) && v.endsWith('.json'));
    if (!file) throw new Error('Missing existing capture sidecar');
    const bytes = fs.readFileSync(path.join(captureRoot, file));
    const capture = JSON.parse(bytes);
    return { capturedAtMs: Date.parse(capture.capturedAt), sidecarSha256: sha256(bytes), imageSha256: capture.sha256 };
  });
  const startLower = Math.max(captures[0].capturedAtMs, captures[2].capturedAtMs - durationMs);
  const startUpper = Math.min(captures[1].capturedAtMs, captures[3].capturedAtMs - durationMs);
  if (startLower > startUpper) throw new Error('Capture and profile duration brackets do not intersect');
  const playEarliest = artifacts.playEvent.inputStartAt - startUpper;
  const playLatest = artifacts.playEvent.inputEndAt - startLower;
  const controls = artifacts.terminal.controls.events;
  const productPlayDurationMs = controls.pauseSuccess.firstRelativeMs - controls.actualPlay.firstRelativeMs;
  const pauseEarliest = playEarliest + productPlayDurationMs;
  const pauseLatest = playLatest + productPlayDurationMs;
  const windows = [
    { key: 'prePlayCapture', startMs: 0, endMs: playEarliest, meaning: 'Definitely before Play under host/capture clock association; includes profiler startup and control interaction, not a clean idle baseline.' },
    { key: 'possiblePlayEnvelope', startMs: playEarliest, endMs: pauseLatest, meaning: 'Contains the entire real Play run under host/capture clock association; includes uncertain ready/drain margins. Not the exact 14,006ms metrics window.' },
    { key: 'postPauseCapture', startMs: pauseLatest, endMs: durationMs, meaning: 'Definitely after original product Pause under host/capture clock association; includes Stop-menu overhead, not pure quiescent drain.' },
  ];
  const targetNames = ['forEachProjected', 'motionAt', 'mayProjectVector', 'updateValues', '_updateValues', 'commitUpdate', 'prepareUpdate', 'batchRender', 'paint', 'artwork', 'solarLight', 'galacticBand', 'measure', 'drawImage', 'bufferData'];
  const targetSet = new Set(targetNames);
  const categoryFor = node => {
    const f = node.callFrame;
    if (f.functionName === '(idle)') return 'idle';
    if (f.functionName === '(garbage collector)') return 'sampledGc';
    if (f.functionName === 'CallCollectSample' || f.functionName === 'startCpuProfiling') return 'profilerNamed';
    if (f.scriptId === 38) return 'skyRuntimeScript';
    if ([30, 33].includes(f.scriptId)) return 'appServiceRuntimeScript';
    if (f.scriptId === 29) return 'runtimeCommonScript';
    if ([13, 23, 46].includes(f.scriptId)) return 'wechatRuntimeScripts';
    if (f.url) return 'otherScript';
    return 'noUrlOther';
  };
  function blankAccumulator() { return { samples: 0, leafCategories: {}, namedSubtreeSamples: Object.fromEntries(targetNames.map(n => [n, 0])) }; }
  function addSample(acc, node, ancestors) {
    acc.samples++;
    const category = categoryFor(node); acc.leafCategories[category] = (acc.leafCategories[category] ?? 0) + 1;
    const names = new Set(ancestors.map(id => nodes.get(id).callFrame.functionName));
    for (const name of names) if (targetSet.has(name)) acc.namedSubtreeSamples[name]++;
  }
  const overall = blankAccumulator();
  windows.forEach(w => Object.assign(w, blankAccumulator()));
  const bins = Array.from({ length: Math.ceil(durationMs / 10000) }, (_, i) => ({ startMs: i * 10000, endMs: Math.min((i + 1) * 10000, durationMs), ...blankAccumulator() }));
  let currentUs = 0; let outsideTimestampSamples = 0; let minTimestampMs = Infinity; let maxTimestampMs = -Infinity;
  for (let i = 0; i < profile.samples.length; i++) {
    currentUs += profile.timeDeltas[i];
    const tMs = currentUs / 1000; minTimestampMs = Math.min(minTimestampMs, tMs); maxTimestampMs = Math.max(maxTimestampMs, tMs);
    const node = nodes.get(profile.samples[i]); const chain = ancestry(node.id);
    addSample(overall, node, chain);
    const bin = bins[Math.floor(tMs / 10000)];
    if (bin && tMs >= 0 && tMs <= durationMs) addSample(bin, node, chain); else outsideTimestampSamples++;
    for (const window of windows) if (tMs >= window.startMs && tMs < window.endMs) addSample(window, node, chain);
  }
  const nonIdle = overall.samples - (overall.leafCategories.idle ?? 0);
  const nameSummaries = targetNames.map(name => {
    const runtimeNodes = profile.nodes.filter(n => n.callFrame.functionName === name);
    const locations = new Map();
    for (const n of runtimeNodes) {
      const f = n.callFrame; const key = `${f.scriptId}:${f.lineNumber}:${f.columnNumber}`;
      const location = locations.get(key) ?? { scriptId: f.scriptId, script: scriptInfo.get(f.scriptId)?.basename, line0: f.lineNumber, column0: f.columnNumber, selfSamples: 0 };
      location.selfSamples += counts.get(n.id) ?? 0; locations.set(key, location);
    }
    const candidates = functions.filter(f => f.name === name);
    return { name, selfSamples: runtimeNodes.reduce((sum, n) => sum + (counts.get(n.id) ?? 0), 0), subtreeUnionSamples: overall.namedSubtreeSamples[name], percentOfNonIdleSamples: 100 * overall.namedSubtreeSamples[name] / nonIdle, runtimeLocations: [...locations.values()], currentAstSourceCandidates: candidates, mappingScope: candidates.length === 1 && candidates[0].sourceContentBound ? 'Unique current semantic method and hash-bound source owner; runtime generated position is NOT directly mapped.' : candidates.length ? 'Shared or ambiguous current semantic name; candidate owners only, no direct runtime position mapping.' : 'No current Taro AST source mapping; runtime name and stack only.' };
  });
  const locationSummaries = new Map();
  for (const n of profile.nodes) {
    const f = n.callFrame; if (!f.url) continue;
    const key = `${f.scriptId}:${f.lineNumber}:${f.columnNumber}`;
    const item = locationSummaries.get(key) ?? { scriptId: f.scriptId, script: scriptInfo.get(f.scriptId)?.basename, function: safeFunctionName(f.functionName), line0: f.lineNumber, column0: f.columnNumber, selfSamples: 0 };
    item.selfSamples += counts.get(n.id) ?? 0; locationSummaries.set(key, item);
  }
  const selectMemory = row => ({ sampleStartElapsedMs: row.sampleStartElapsedMs, sampleEndElapsedMs: row.sampleEndElapsedMs, totalPssKiB: row.totalPssKiB, totalRssKiB: row.totalRssKiB, totalSwapPssKiB: row.totalSwapPssKiB, unknownPssKiB: row.unknownPssKiB, nativeHeapPssKiB: row.nativeHeapPssKiB, dalvikHeapPssKiB: row.dalvikHeapPssKiB, glMtrackPssKiB: row.glMtrackPssKiB, eglMtrackPssKiB: row.eglMtrackPssKiB });
  const memory = rootResult.memory;
  const summary = {
    schemaVersion: 'r17-normal-cpu-attribution-v1', status: 'useful-target-cpu-sample-with-explicit-clock-and-runtime-map-gaps',
    binding: { generation: manifest.buildGeneration, probeVersion: manifest.probeVersion, mode: manifest.mode, variant: manifest.variant, bundleSha256: manifest.result.bundleSha256, localBundleReadbackSha256: bundleReadback.sha256, buildSourceSha256: manifest.buildSourceSha256, manifestSha256: sha256(fs.readFileSync(path.join(candidateRoot, 'manifest.json'))), rootResultSha256: sha256(rootResultBytes), profileSha256: sha256(profileBytes), profileBytes: profileBytes.length, originalPhoneProfilePreserved: artifacts.profileEvent.phoneOriginalPreserved, operatorBound: rootResult.operatorBound, phoneBundleBytesVerified: rootResult.phoneBundleBytesVerified, runtimeAppIdVerified: rootResult.runtimeAppIdVerified, sourceAssociation: 'Official delivery/operator binding plus actual embedded probe source identity. Local bundle and maps have exact readback; no phone bundle byte readback or runtime AppID verification is claimed.' },
    profileValidity: { nodeCount: profile.nodes.length, sampleCount: profile.samples.length, timeDeltaCount: profile.timeDeltas.length, invalidSampleReferences, invalidChildReferences, duplicateParents, hitCountSum: profile.nodes.reduce((a, n) => a + (n.hitCount ?? 0), 0), sampleMinusHitCount: profile.samples.length - profile.nodes.reduce((a, n) => a + (n.hitCount ?? 0), 0), durationUs: profile.endTime - profile.startTime, deltaSumUs: elapsedUs, uncoveredTailUs: profile.endTime - profile.startTime - elapsedUs, timeDeltas: { ...deltaStats, negativeTotalUs: profile.timeDeltas.filter(v => v < 0).reduce((a, b) => a + b, 0) }, timestampRangeMs: { min: minTimestampMs, max: maxTimestampMs }, outsideTimestampSamples, interpretation: 'Actual samples[] count is primary. timeDeltas contain negative values: do not turn signed intervals or hitCount into precise CPU milliseconds, pause durations or rates. Ten-second bins use the as-exported signed cumulative timestamps and are coarse observations only.' },
    alignment: { method: 'Intersect Start capture bracket with Stop capture bracket minus exported duration; locate Play inside its existing host input bracket. This is conditional elapsed-clock association, not exact target-clock synchronization.', startBracketWidthMs: startUpper - startLower, playInputBracketWidthMs: artifacts.playEvent.inputEndAt - artifacts.playEvent.inputStartAt, earliestPlayRelativeToProfileMs: playEarliest, latestPlayRelativeToProfileMs: playLatest, productPauseAfterPlayMs: productPlayDurationMs, earliestPauseRelativeToProfileMs: pauseEarliest, latestPauseRelativeToProfileMs: pauseLatest, exactMetricsWindowRelativeToActualPlayMs: { start: artifacts.metrics.controls.recordingStartRelativeMs - controls.actualPlay.firstRelativeMs, end: artifacts.metrics.controls.sealRelativeMs - controls.actualPlay.firstRelativeMs, elapsed: artifacts.metrics.window.elapsedMs }, guaranteedPlayOnlyIntersectionMs: Math.max(0, pauseEarliest - playLatest), fileMtimeMinusHostPlayStartMs: artifacts.profileEvent.source.mtime * 1000 - artifacts.playEvent.inputStartAt, fileMtimeIsNotStopTimestamp: true, captureEvidence: captures.map(c => ({ sidecarSha256: c.sidecarSha256, imageSha256: c.imageSha256 })), exactCpuAndProbeSameWindow: false },
    overall: { ...overall, nonIdleSamples: nonIdle, gcPercentOfAllSamples: 100 * (overall.leafCategories.sampledGc ?? 0) / overall.samples, gcPercentOfNonIdleSamples: 100 * (overall.leafCategories.sampledGc ?? 0) / nonIdle, profilerNamedPercentOfNonIdleSamples: 100 * (overall.leafCategories.profilerNamed ?? 0) / nonIdle },
    windows, coarseBins: bins,
    mapping: { currentMapCount: walkFiles(path.join(candidateRoot, 'source-maps')).length, mapReadback, currentAstFunctionCount: functions.length, directRuntimePositionSourceMapping: false, reason: 'Official phone packaging changes script names, lines, function ordering and columns. Original Taro maps cannot be applied directly to runtime coordinates. Pure reformat/compress trials did not reproduce the runtime positions and were not adopted.', evidenceExamples: { motionAt: { runtime: { scriptId: 38, line0: 62, column0: 447575 }, currentTaro: { file: 'sky/detail/index.js', line0: 1, column0: 475009 } }, mayProjectVector: { runtime: { scriptId: 38, line0: 62, column0: 46158 }, currentTaro: { file: 'sky/detail/index.js', line0: 1, column0: 49801 } } }, semanticOwners: nameSummaries, topUnmappedOrPartlyMappedRuntimeLocations: [...locationSummaries.values()].sort((a, b) => b.selfSamples - a.selfSamples).slice(0, 24), nativeAndGenericFrameLimit: 'Named native wrappers, generic minified functions and generated tmpl_* stacks are not exact TS-line, native allocator or GPU execution attribution.' },
    actualWorkload: { metricWindow: artifacts.metrics.window, counters: artifacts.metrics.counters, scene: artifacts.metrics.scene, viewport: artifacts.metrics.viewport, stageElapsed: artifacts.metrics.stageElapsed, clock: artifacts.terminal.clock, productPause: { attempts: controls.pauseAttempt.calls, successCalls: controls.pauseSuccess.calls, success: controls.pauseSuccess.lastResult, afterPlayMs: productPlayDurationMs }, pageLast: artifacts.metrics.observations.page.last, surfaceLast: artifacts.metrics.observations.scene.last, textLast: artifacts.metrics.observations.tm.last, textCoverageLimit: 'nativeGlyphCalls and lifetime counter are zero in this capture. Full source path is retained, but active name/text rendering workload is not established; do not generalize these rankings to text-heavy Sky.' },
    processFootprint: { source: 'Root current normal-baseline result, same guarded process watch; root report retains raw evidence hashes.', unit: 'KiB', samples: memory.rows.length, playHostRelativeBracketMs: memory.playInputHostRelativeBracketMs, before: selectMemory(memory.before), peak: selectMemory(memory.peak), firstDefinitelyAfterProductPause: selectMemory(memory.firstDefinitelyAfterProductPause), last: selectMemory(memory.last), pssPeakDelta: memory.pssPeakDeltaFromBefore, unknownPeakDelta: memory.unknownPeakDeltaFromBefore, pssDrainDelta: memory.pssDrainDeltaFromBefore, unknownDrainDelta: memory.unknownDrainDeltaFromBefore, interpretation: 'Growth persists under this profiling condition and remains high during bounded paused drain. Starting footprint is already warm/high. Android Unknown is not JS heap or a named allocator; CPU does not assign this growth to a source owner. No per-frame growth ratio is computed from mismatched windows.' },
    decisions: [
      { claim: 'A/CPU', finding: 'Both stellar projection and actual WeChat data/template update paths have substantial samples. Stellar transform ownership is semantically attributable; generic render/memo and template nodes still need the official packaged-script mapping before exact-line optimization.', nextAction: 'Use these owners for a focused responsiveness investigation when A is next. Preserve accepted identity, complete BSC/SAO and resource demand. Do not claim a CPU improvement or change page-state ownership from this one sample.' },
      { claim: 'B/memory', finding: 'The normal run reproduces process growth with real accepted/copy/GPU work; CPU stacks and GC samples do not explain allocation volume or retention.', nextAction: 'Keep the validated ordinary true-debug allocation-sampling route as the next discriminating B observation, coupled to actual Sky and the current packaged script/source mapping. Do not run another adjacent disable or parked scene-memo variant merely because it is prepared.' },
      { claim: 'tool economy', finding: 'This CPU file is a useful nonempty Sky capture. Another CPU recording or failed heavy heap/native route would repeat a qualified boundary without resolving B.', nextAction: 'Reuse this sample. Obtain the narrow official runtime-to-Taro map or exported packaged script only through an existing supported route if exact-line attribution changes the next decision; keep the gap until available.' },
    ],
    limitations: ['CPU sample counts are not allocation sizes, retained objects, precise thread CPU duration, native/GPU duration or physical FPS.', 'GC sampled stacks are activity evidence, not complete GC events or exact pauses.', 'Inclusive subtrees overlap; each named union is deduplicated per sample and rows must not be summed.', 'No exact same-window alignment between the CPU file and the 14,006ms receipt is established.', 'The high warm process footprint, profiler samples and inactive glyph/name workload constrain representativeness.', 'No product source, build, device session, service or authoritative plan was changed by this analysis.'],
  };
  fs.writeFileSync(path.join(taskRoot, 'R17-NORMAL-CPU-ATTRIBUTION.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify({ written: 'R17-NORMAL-CPU-ATTRIBUTION.json', profileValidity: summary.profileValidity, alignment: { ...summary.alignment, captureEvidence: undefined }, overall: summary.overall, windows: summary.windows.map(w => ({ key: w.key, startMs: w.startMs, endMs: w.endMs, samples: w.samples, categories: w.leafCategories, stellarSamples: w.namedSubtreeSamples.forEachProjected, updateValuesSamples: w.namedSubtreeSamples.updateValues })), bins: bins.map(b => ({ startMs: b.startMs, samples: b.samples, idle: b.leafCategories.idle ?? 0, gc: b.leafCategories.sampledGc ?? 0, stellar: b.namedSubtreeSamples.forEachProjected, updateValues: b.namedSubtreeSamples.updateValues })) }, null, 2));
}
