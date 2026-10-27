import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadSnapshot } from './diagnose-target-heap.mjs';

// Offline analysis of an already preserved graph. No snapshot strings, source
// code, object IDs, account values, paths or exact sky times are emitted.
const labels = new Set(['Object', 'Array', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise',
  'ArrayBuffer', 'Float32Array', 'Float64Array', 'Uint8Array', 'Uint16Array', 'Uint32Array',
  'system / Context', 'system / JSArrayBufferData', 'WebGLRenderingContext', 'OffscreenCanvas',
  'CanvasRenderingContext2D', '(GC roots)', '(Stack roots)', '(Global handles)', '(Strong roots)']);
const properties = new Set(['current', 'memoizedState', 'memoizedProps', 'pendingProps', 'stateNode',
  'alternate', 'return', 'child', 'sibling', 'next', 'baseState', 'baseQueue', 'queue', 'pending',
  'updateQueue', 'lastEffect', 'create', 'destroy', 'deps', 'callback', 'queryFn', 'options',
  'state', 'data', 'observers', 'result', 'children', 'props', 'ref', 'context', 'previous',
  'geometry', 'frame', 'frames', 'transform', 'pointAt', 'points', 'displayDirection', 'displayTransmission',
  'forEachProjected', 'publicationHash', 'catalogVersion', 'publication', 'catalog', 'source', 'scope',
  'report', 'skyScene', 'observationFrames', 'hourly', 'timeModel', 'at', 'model', 'layers',
  'accepted', 'latest', 'supplement', 'stellarSupplement', 'drawing', 'nativeContext',
  'map', 'elements', 'properties', 'table', 'closure', 'function', 'shared', 'feedback_cell']);
const queryPrefixes = new Set(['observation-context', 'spot-overview', 'spot-sky', 'spot-sky-geometry',
  'spot-sky-target-instant', 'stellar-catalog', 'constellation-catalog', 'celestial-search',
  'deep-sky-image-discovery', 'sky-landscape-manifest', 'prepared-optical-discovery',
  'prepared-optical-manifest', 'sdss-optical-manifest']);

const [input, expectedSha256, output] = process.argv.slice(2);
if (!input || !/^[a-f0-9]{64}$/.test(expectedSha256 ?? '') || !output
  || resolve(input).toLowerCase() === resolve(output).toLowerCase()) throw Error('ARGUMENTS_INVALID');
const s = await loadSnapshot(input);
if (s.sha256 !== expectedSha256) throw Error('SNAPSHOT_IDENTITY_MISMATCH');
const type = node => s.types[s.nodes[node * s.stride + s.typeOffset]];
const name = node => s.strings[s.nodes[node * s.stride + s.nameOffset]];
const edgeType = edge => s.edgeTypes[s.edges[edge * s.edgeStride + s.edgeTypeOffset]];
const edgeTarget = edge => s.edges[edge * s.edgeStride + s.edgeTargetOffset] / s.stride;
const edgeName = edge => s.strings[s.edges[edge * s.edgeStride + s.edgeNameOffset]];
const own = (node, wanted) => {
  for (let edge = s.starts[node]; edge < s.starts[node + 1]; edge++) {
    if (edgeType(edge) === 'property' && edgeName(edge) === wanted) return edgeTarget(edge);
  }
  return -1;
};
const matches = (node, keys) => keys.every(key => own(node, key) >= 0);
const runtimeShape = (node, kind) => {
  if (kind === 'supplementFrame' || kind === 'tileTransform') {
    const geometry = own(node, 'geometry'), at = own(geometry, 'at');
    if (at < 0 || !type(at).includes('string') || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(name(at))) return false;
  }
  if (kind === 'supplementFrame' || kind === 'stellarTransform')
    return ['forEachProjected', 'displayDirection'].every(key => type(own(node, key)) === 'closure');
  if (kind === 'tileTransform') return type(own(node, 'pointAt')) === 'closure';
  return type(own(node, 'skyScene')) === 'object' && type(own(node, 'context')) === 'object';
};
const kinds = {
  supplementFrame: ['publicationHash', 'catalogVersion', 'geometry', 'forEachProjected', 'displayDirection'],
  tileTransform: ['geometry', 'transform', 'pointAt'],
  stellarTransform: ['position', 'displayDirection', 'displayTransmission', 'forEachProjected'],
  skyReport: ['skyScene', 'context', 'hourly', 'observationFrames'],
};
const found = Object.fromEntries(Object.keys(kinds).map(key => [key, []]));
for (let node = 0; node < s.nodeCount; node++) {
  if (type(node) !== 'object') continue;
  for (const [kind, keys] of Object.entries(kinds)) if (matches(node, keys) && runtimeShape(node, kind)) found[kind].push(node);
}

// One shortest recorded non-weak path. This does not reconstruct ephemeron,
// VM/host or native liveness and does not prove a growing retention trend.
const parent = new Int32Array(s.nodeCount); parent.fill(-1);
const via = new Uint32Array(s.nodeCount), queue = new Uint32Array(s.nodeCount);
parent[0] = 0; queue[0] = 0; let read = 0, write = 1;
while (read < write) {
  const node = queue[read++];
  for (let edge = s.starts[node]; edge < s.starts[node + 1]; edge++) {
    if (edgeType(edge) === 'weak') continue;
    const target = edgeTarget(edge);
    if (parent[target] >= 0) continue;
    parent[target] = node; via[target] = edge; queue[write++] = target;
  }
}
const nodeLabel = node => {
  if (type(node) === 'object' && matches(node, ['memoizedState', 'alternate', 'return'])) return 'object: fiber-shaped';
  const key = type(node) === 'object' ? own(node, 'queryKey') : -1;
  if (key >= 0 && own(node, 'options') >= 0) {
    for (let edge = s.starts[key]; edge < s.starts[key + 1]; edge++) {
      if (edgeType(edge) === 'element' && s.edges[edge * s.edgeStride + s.edgeNameOffset] === 0) {
        const value = name(edgeTarget(edge));
        return `object: query-shaped:${queryPrefixes.has(value) ? value : 'other'}`;
      }
    }
  }
  return `${type(node)}: ${labels.has(name(node)) ? name(node) : 'other'}`;
};
const pathTo = node => {
  if (parent[node] < 0) return { reachable: false, path: [] };
  const path = []; let current = node;
  while (current !== 0 && path.length < 80) {
    const edge = via[current], kind = edgeType(edge);
    const key = !['element', 'hidden'].includes(kind) && properties.has(edgeName(edge)) ? edgeName(edge) : null;
    path.push({ node: nodeLabel(current), via: key ? `${kind}:${key}` : kind,
      ...(name(current) === 'system / Context' ? { contextSelfSizeBytes: s.nodes[current * s.stride + s.sizeOffset] } : {}) });
    current = parent[current];
  }
  return { reachable: true, truncated: current !== 0, path: path.reverse() };
};
const times = new Map();
const timeGroup = node => {
  const geometry = own(node, 'geometry'), at = own(geometry >= 0 ? geometry : node, 'at');
  if (at < 0 || !type(at).includes('string')) return null;
  // The string is used only as a private equality key; emit an ordinal group.
  const value = name(at);
  if (!times.has(value)) times.set(value, times.size + 1);
  return times.get(value);
};
const result = { schema: 'starward-offline-sky-heap-owners-v1', at: new Date().toISOString(),
  snapshotSha256: s.sha256, nodeCount: s.nodeCount, edgeCount: s.edgeCount,
  totalSelfSizeBytes: s.summary.totalSelfSizeBytes,
  limits: { samplesPerKind: 12, maximumPathLength: 80 },
  privacy: 'Fixed source/framework labels and equality groups only; no raw snapshot values or IDs.',
  scope: 'One historical isolate graph; no growth, leak, current-device or native-resource conclusion.',
  targets: Object.fromEntries(Object.entries(found).map(([kind, nodes]) => [kind, {
    count: nodes.length, samples: nodes.slice(0, 12).map((node, index) => ({ sample: index + 1,
      timeGroup: timeGroup(node), selfSizeBytes: s.nodes[node * s.stride + s.sizeOffset], ...pathTo(node) })),
  }])) };
await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ snapshotSha256: s.sha256, counts: Object.fromEntries(Object.entries(found).map(([key, nodes]) => [key, nodes.length])),
  sampledTimeGroups: times.size, outputWritten: true }));
