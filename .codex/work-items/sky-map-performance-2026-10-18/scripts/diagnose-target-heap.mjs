import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Private input boundary: never emit strings, property names, IDs or raw paths
// from a snapshot. Only this fixed allowlist can become an output label.
const NODE_TYPES = new Set(['hidden', 'array', 'string', 'object', 'code', 'closure', 'regexp',
  'number', 'native', 'synthetic', 'concatenated string', 'sliced string', 'symbol', 'bigint', 'object shape']);
const KNOWN_NAMES = new Set(['Object', 'Array', 'Date', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise',
  'ArrayBuffer', 'SharedArrayBuffer', 'Float32Array', 'Float64Array', 'Uint8Array', 'Uint8ClampedArray',
  'Uint16Array', 'Uint32Array', 'Int8Array', 'Int16Array', 'Int32Array', 'BigInt64Array', 'BigUint64Array',
  'DataView', 'RegExp', 'Error', 'TypeError', 'Function', 'system / Context', 'system / JSArrayBufferData',
  'JSArrayBufferData', 'WebGLRenderingContext', 'WebGLBuffer', 'WebGLTexture', 'WebGLProgram',
  'WebGLShader', 'CanvasRenderingContext2D', 'HTMLCanvasElement', 'OffscreenCanvas',
  'createSkyGpuRenderer', 'createSkyCanvasFrameClock', 'createSkyCanvasLifecycle',
  'createPoseFramePublisher', 'createSkyObservationTime', 'skyPresentedTimeCurrent']);

function fail(code) { throw new Error(code); }
function add(group, label, size = 0) {
  const value = group[label] ??= { count: 0, selfSizeBytes: 0 };
  value.count++; value.selfSizeBytes += size;
}
function label(snapshot, node) {
  const type = snapshot.types[snapshot.nodes[node * snapshot.stride + snapshot.typeOffset]];
  const name = snapshot.strings[snapshot.nodes[node * snapshot.stride + snapshot.nameOffset]];
  return KNOWN_NAMES.has(name) ? `${type}: ${name}` : `${type}: other`;
}

export async function loadSnapshot(path) {
  const bytes = await readFile(path);
  const digest = createHash('sha256').update(bytes).digest('hex');
  let input;
  try { input = JSON.parse(bytes.toString('utf8')); } catch { fail('SNAPSHOT_JSON_INVALID'); }
  const meta = input?.snapshot?.meta;
  const fields = meta?.node_fields, edgeFields = meta?.edge_fields;
  if (!Array.isArray(fields) || !Array.isArray(edgeFields) || !Array.isArray(input.nodes)
    || !Array.isArray(input.edges) || !Array.isArray(input.strings)) fail('SNAPSHOT_SCHEMA_INVALID');
  for (const name of ['type', 'name', 'id', 'self_size', 'edge_count']) if (!fields.includes(name)) fail('SNAPSHOT_NODE_FIELDS_INVALID');
  for (const name of ['type', 'name_or_index', 'to_node']) if (!edgeFields.includes(name)) fail('SNAPSHOT_EDGE_FIELDS_INVALID');
  const types = meta.node_types?.[fields.indexOf('type')];
  const edgeTypes = meta.edge_types?.[edgeFields.indexOf('type')];
  if (!Array.isArray(types) || types.some(type => !NODE_TYPES.has(type))
    || !Array.isArray(edgeTypes) || edgeTypes.indexOf('weak') < 0) fail('SNAPSHOT_TYPE_SCHEMA_INVALID');
  const snapshot = { nodes: input.nodes, edges: input.edges, strings: input.strings,
    stride: fields.length, edgeStride: edgeFields.length, types, edgeTypes,
    typeOffset: fields.indexOf('type'), nameOffset: fields.indexOf('name'), idOffset: fields.indexOf('id'),
    sizeOffset: fields.indexOf('self_size'), edgeCountOffset: fields.indexOf('edge_count'),
    edgeTypeOffset: edgeFields.indexOf('type'), edgeTargetOffset: edgeFields.indexOf('to_node'),
    edgeNameOffset: edgeFields.indexOf('name_or_index'),
    weak: edgeTypes.indexOf('weak'), byteLength: bytes.length, sha256: digest };
  snapshot.nodeCount = snapshot.nodes.length / snapshot.stride;
  snapshot.edgeCount = snapshot.edges.length / snapshot.edgeStride;
  if (!Number.isSafeInteger(snapshot.nodeCount) || !Number.isSafeInteger(snapshot.edgeCount)
    || snapshot.nodeCount !== input.snapshot.node_count || snapshot.edgeCount !== input.snapshot.edge_count)
    fail('SNAPSHOT_STRIDE_COUNT_MISMATCH');
  snapshot.starts = new Uint32Array(snapshot.nodeCount + 1);
  const byType = {}, knownNames = {}, stringSizeBuckets = {};
  let totalSelfSizeBytes = 0, edgeCountSum = 0;
  for (let node = 0; node < snapshot.nodeCount; node++) {
    const offset = node * snapshot.stride;
    const type = types[snapshot.nodes[offset + snapshot.typeOffset]];
    const size = snapshot.nodes[offset + snapshot.sizeOffset];
    const count = snapshot.nodes[offset + snapshot.edgeCountOffset];
    const nameIndex = snapshot.nodes[offset + snapshot.nameOffset];
    const id = snapshot.nodes[offset + snapshot.idOffset];
    if (!NODE_TYPES.has(type) || !Number.isSafeInteger(size) || size < 0 || !Number.isSafeInteger(count) || count < 0
      || !Number.isSafeInteger(nameIndex) || nameIndex < 0 || nameIndex >= snapshot.strings.length
      || !Number.isSafeInteger(id) || id < 0) fail('SNAPSHOT_NODE_INVALID');
    snapshot.starts[node] = edgeCountSum;
    edgeCountSum += count; totalSelfSizeBytes += size;
    add(byType, type, size);
    const name = snapshot.strings[nameIndex];
    if (KNOWN_NAMES.has(name)) add(knownNames, `${type}: ${name}`, size);
    if (type.includes('string')) {
      const bucket = size === 0 ? 'zero' : size < 128 ? '1-127' : size < 1024 ? '128-1023'
        : size < 16384 ? '1024-16383' : size < 262144 ? '16384-262143' : '262144-plus';
      add(stringSizeBuckets, bucket, size);
    }
  }
  snapshot.starts[snapshot.nodeCount] = edgeCountSum;
  if (edgeCountSum !== snapshot.edgeCount) fail('SNAPSHOT_EDGE_SUM_MISMATCH');
  let weakEdges = 0;
  for (let edge = 0; edge < snapshot.edgeCount; edge++) {
    const offset = edge * snapshot.edgeStride;
    const type = snapshot.edges[offset + snapshot.edgeTypeOffset];
    const target = snapshot.edges[offset + snapshot.edgeTargetOffset];
    if (!Number.isSafeInteger(type) || type < 0 || type >= snapshot.edgeTypes.length
      || !Number.isSafeInteger(target) || target < 0 || target % snapshot.stride !== 0
      || target / snapshot.stride >= snapshot.nodeCount) fail('SNAPSHOT_EDGE_INVALID');
    if (type === snapshot.weak) weakEdges++;
  }
  snapshot.summary = { byteLength: snapshot.byteLength, sha256: snapshot.sha256,
    validation: { nodeStride: snapshot.stride, nodeCount: snapshot.nodeCount,
      edgeStride: snapshot.edgeStride, edgeCount: snapshot.edgeCount, edgeCountSum,
      declaredCountsMatch: true, allReferencesAlignedAndInRange: true, weakEdgeCount: weakEdges },
    totalSelfSizeBytes, byType, knownNames, stringSizeBuckets };
  return snapshot;
}

// Lengauer-Tarjan dominators over the recorded graph with weak edges excluded.
// This is a graph observation, not a claim about ephemeron/host/other-VM liveness.
export function strongGraph(snapshot) {
  const n = snapshot.nodeCount;
  const number = new Uint32Array(n), vertex = new Uint32Array(n + 1), parent = new Uint32Array(n + 1);
  const next = new Uint32Array(snapshot.starts);
  const stack = new Uint32Array(n);
  number[0] = 1; vertex[1] = 0; stack[0] = 0;
  let top = 0, reached = 1;
  while (top >= 0) {
    const node = stack[top];
    if (next[node] >= snapshot.starts[node + 1]) { top--; continue; }
    const edge = next[node]++, offset = edge * snapshot.edgeStride;
    if (snapshot.edges[offset + snapshot.edgeTypeOffset] === snapshot.weak) continue;
    const target = snapshot.edges[offset + snapshot.edgeTargetOffset] / snapshot.stride;
    if (number[target] !== 0) continue;
    number[target] = ++reached; vertex[reached] = target;
    parent[reached] = number[node]; stack[++top] = target;
  }
  const predStarts = new Uint32Array(n + 1);
  let strongEdges = 0;
  for (let node = 0; node < n; node++) {
    if (!number[node]) continue;
    for (let edge = snapshot.starts[node]; edge < snapshot.starts[node + 1]; edge++) {
      const offset = edge * snapshot.edgeStride;
      if (snapshot.edges[offset + snapshot.edgeTypeOffset] === snapshot.weak) continue;
      const target = snapshot.edges[offset + snapshot.edgeTargetOffset] / snapshot.stride;
      predStarts[target + 1]++; strongEdges++;
    }
  }
  for (let i = 1; i <= n; i++) predStarts[i] += predStarts[i - 1];
  const predCursor = new Uint32Array(predStarts), predecessors = new Uint32Array(strongEdges);
  for (let node = 0; node < n; node++) {
    if (!number[node]) continue;
    for (let edge = snapshot.starts[node]; edge < snapshot.starts[node + 1]; edge++) {
      const offset = edge * snapshot.edgeStride;
      if (snapshot.edges[offset + snapshot.edgeTypeOffset] === snapshot.weak) continue;
      const target = snapshot.edges[offset + snapshot.edgeTargetOffset] / snapshot.stride;
      predecessors[predCursor[target]++] = number[node];
    }
  }
  const semi = new Uint32Array(reached + 1), ancestor = new Uint32Array(reached + 1),
    labels = new Uint32Array(reached + 1), idom = new Uint32Array(reached + 1),
    bucket = new Uint32Array(reached + 1), bucketNext = new Uint32Array(reached + 1), path = new Uint32Array(reached + 1);
  for (let i = 1; i <= reached; i++) semi[i] = labels[i] = i;
  function evaluate(v) {
    if (!ancestor[v]) return labels[v];
    let x = v, depth = 0;
    while (ancestor[ancestor[x]]) { path[depth++] = x; x = ancestor[x]; }
    while (depth) {
      x = path[--depth];
      if (semi[labels[ancestor[x]]] < semi[labels[x]]) labels[x] = labels[ancestor[x]];
      ancestor[x] = ancestor[ancestor[x]];
    }
    return labels[v];
  }
  for (let w = reached; w >= 2; w--) {
    const node = vertex[w];
    for (let p = predStarts[node]; p < predStarts[node + 1]; p++) {
      const u = evaluate(predecessors[p]);
      if (semi[u] < semi[w]) semi[w] = semi[u];
    }
    bucketNext[w] = bucket[semi[w]]; bucket[semi[w]] = w;
    ancestor[w] = parent[w];
    let v = bucket[parent[w]]; bucket[parent[w]] = 0;
    while (v) {
      const u = evaluate(v); idom[v] = semi[u] < semi[v] ? u : parent[w];
      v = bucketNext[v];
    }
  }
  for (let w = 2; w <= reached; w++) if (idom[w] !== semi[w]) idom[w] = idom[idom[w]];
  const retained = new Float64Array(reached + 1), descendants = new Uint32Array(reached + 1);
  for (let i = 1; i <= reached; i++) {
    retained[i] = snapshot.nodes[vertex[i] * snapshot.stride + snapshot.sizeOffset]; descendants[i] = 1;
  }
  for (let i = reached; i >= 2; i--) {
    retained[idom[i]] += retained[i]; descendants[idom[i]] += descendants[i];
  }
  const topRetainers = [];
  for (let i = 2; i <= reached; i++) {
    const node = vertex[i], type = snapshot.types[snapshot.nodes[node * snapshot.stride + snapshot.typeOffset]];
    if (!['object', 'array', 'closure', 'hidden', 'native'].includes(type)) continue;
    const entry = { label: label(snapshot, node), retainedSizeBytes: retained[i],
      selfSizeBytes: snapshot.nodes[node * snapshot.stride + snapshot.sizeOffset], reachableDescendantCount: descendants[i] };
    if (topRetainers.length < 24 || entry.retainedSizeBytes > topRetainers.at(-1).retainedSizeBytes) {
      topRetainers.push(entry); topRetainers.sort((a, b) => b.retainedSizeBytes - a.retainedSizeBytes);
      if (topRetainers.length > 24) topRetainers.pop();
    }
  }
  snapshot.reachable = number;
  snapshot.retained = retained;
  snapshot.summary.strongGraph = { method: 'recorded directed edges excluding weak; root index zero; Lengauer-Tarjan dominators',
    reachableNodeCount: reached, reachableSelfSizeBytes: retained[1],
    unreachableNodeCount: n - reached, unreachableSelfSizeBytes: snapshot.summary.totalSelfSizeBytes - retained[1],
    reachableStrongEdgeCount: strongEdges, topRetainers };
}

function compare(before, after) {
  const initial = new Map();
  let duplicateInitialIds = 0;
  for (let node = 0; node < before.nodeCount; node++) {
    const id = before.nodes[node * before.stride + before.idOffset];
    if (initial.has(id)) duplicateInitialIds++;
    initial.set(id, node);
  }
  const added = {}, removed = {}, surviving = {}, survivingSizeChange = {}, addedKnownNames = {};
  let newCount = 0, newBytes = 0, removedCount = 0, removedBytes = 0,
    survivorCount = 0, survivorBeforeBytes = 0, survivorAfterBytes = 0,
    commonIdsWithChangedType = 0, newStronglyReachableCount = 0, newStronglyReachableBytes = 0;
  const seen = new Uint8Array(before.nodeCount);
  for (let node = 0; node < after.nodeCount; node++) {
    const offset = node * after.stride;
    const id = after.nodes[offset + after.idOffset], size = after.nodes[offset + after.sizeOffset],
      type = after.types[after.nodes[offset + after.typeOffset]];
    if (!initial.has(id)) {
      newCount++; newBytes += size; add(added, type, size);
      const name = after.strings[after.nodes[offset + after.nameOffset]];
      if (KNOWN_NAMES.has(name)) add(addedKnownNames, `${type}: ${name}`, size);
      if (after.reachable[node]) { newStronglyReachableCount++; newStronglyReachableBytes += size; }
      continue;
    }
    const prior = initial.get(id), priorOffset = prior * before.stride, priorSize = before.nodes[priorOffset + before.sizeOffset];
    seen[prior] = 1; survivorCount++; survivorBeforeBytes += priorSize; survivorAfterBytes += size;
    add(surviving, type, size);
    if (before.types[before.nodes[priorOffset + before.typeOffset]] !== type) commonIdsWithChangedType++;
    if (priorSize !== size) add(survivingSizeChange, type, size - priorSize);
  }
  for (let node = 0; node < before.nodeCount; node++) {
    if (seen[node]) continue;
    const offset = node * before.stride, size = before.nodes[offset + before.sizeOffset],
      type = before.types[before.nodes[offset + before.typeOffset]];
    removedCount++; removedBytes += size; add(removed, type, size);
  }
  const byTypeDelta = {};
  for (const type of NODE_TYPES) {
    const a = before.summary.byType[type] ?? { count: 0, selfSizeBytes: 0 },
      b = after.summary.byType[type] ?? { count: 0, selfSizeBytes: 0 };
    byTypeDelta[type] = { countDelta: b.count - a.count, selfSizeBytesDelta: b.selfSizeBytes - a.selfSizeBytes };
  }
  return { method: 'same-isolate V8 node-id comparison; raw IDs remain private',
    duplicateInitialIds, commonIdsWithChangedType,
    totalSelfSizeBytesDelta: after.summary.totalSelfSizeBytes - before.summary.totalSelfSizeBytes,
    totalNodeCountDelta: after.nodeCount - before.nodeCount,
    added: { count: newCount, selfSizeBytes: newBytes, stronglyReachableCount: newStronglyReachableCount,
      stronglyReachableSelfSizeBytes: newStronglyReachableBytes, byType: added, knownNames: addedKnownNames },
    removed: { count: removedCount, selfSizeBytes: removedBytes, byType: removed },
    surviving: { count: survivorCount, beforeSelfSizeBytes: survivorBeforeBytes,
      afterSelfSizeBytes: survivorAfterBytes, selfSizeBytesDelta: survivorAfterBytes - survivorBeforeBytes,
      byType: surviving, nodesWithSizeChange: survivingSizeChange }, byTypeDelta };
}

async function main() {
  const args = process.argv.slice(2), snapshots = [];
  let out;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--snapshot' && args[i + 1]) snapshots.push(resolve(args[++i]));
    else if (args[i] === '--out' && args[i + 1]) out = resolve(args[++i]);
    else fail('ARGUMENTS_INVALID');
  }
  if (snapshots.length < 1 || snapshots.length > 2 || !out) fail('ARGUMENTS_REQUIRED');
  if (snapshots.some(path => path.toLowerCase() === out.toLowerCase())) fail('OUTPUT_CANNOT_REPLACE_INPUT');
  const loaded = [];
  for (const path of snapshots) {
    const snapshot = await loadSnapshot(path); strongGraph(snapshot); loaded.push(snapshot);
  }
  const report = { schemaVersion: 1, createdAt: new Date().toISOString(),
    status: snapshots.length === 1 ? 'INITIAL_SNAPSHOT_ONLY' : 'TWO_SNAPSHOT_OBSERVATION',
    privacy: 'Only fixed known type/code labels and numeric aggregations are emitted. No raw names, IDs, property values or retaining paths.',
    limitations: ['One V8 isolate snapshot does not measure native, GPU, other VMs, all external allocations or total process memory.',
      'Recorded non-weak graph reachability is not a complete host/ephemeron liveness model.',
      'Taking a snapshot can alter collection timing; a post-snapshot plateau does not prove absence of transient allocation pressure.',
      'Node-ID comparison assumes the same isolate and is accompanied by overlap/type-consistency observations.'],
    snapshots: loaded.map(snapshot => snapshot.summary),
    ...(loaded.length === 2 ? { comparison: compare(loaded[0], loaded[1]) } : {}) };
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: report.status, snapshots: report.snapshots.map(snapshot => ({
    sha256: snapshot.sha256, nodeCount: snapshot.validation.nodeCount, totalSelfSizeBytes: snapshot.totalSelfSizeBytes,
    stronglyReachableBytes: snapshot.strongGraph.reachableSelfSizeBytes })),
    ...(report.comparison ? { comparison: { totalSelfSizeBytesDelta: report.comparison.totalSelfSizeBytesDelta,
      addedBytes: report.comparison.added.selfSizeBytes, removedBytes: report.comparison.removed.selfSizeBytes,
      survivorCount: report.comparison.surviving.count, commonIdsWithChangedType: report.comparison.commonIdsWithChangedType } } : {}) })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await main(); } catch (error) {
    const safe = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'HEAP_ANALYSIS_FAILED';
    process.stderr.write(`${safe}\n`); process.exitCode = 1;
  }
}
