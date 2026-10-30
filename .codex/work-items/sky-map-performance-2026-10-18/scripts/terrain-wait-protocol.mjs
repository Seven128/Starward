// TASK ONLY. New finite current-source packet; historical terrain v2 is not
// reinterpreted. The existing R17 HTTP byte/route owner remains unchanged.
export const TERRAIN_WAIT_SCHEMA = 'starward-terrain-wait-v3';
export const TERRAIN_WAIT_MAX_BYTES = 32768;
const interpretation = 'native_ack_is_not_visible; native_returned_is_not_physical_release; inputSeq_is_latest_observed_input; requestInputSeq_is_request_start_or_null; resource_counts_cover_shared_map_files; async_marker_order_unknown';
const resourceKeys = ['entries', 'readyBytes', 'activeDownloads', 'queued', 'nativePins', 'failedRemovals', 'activeReaders', 'physicalFiles'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const integer = (value, maximum = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= 0 && value <= maximum;
const positive = (value, maximum = Number.MAX_SAFE_INTEGER) => integer(value, maximum) && value > 0;
const optional = (value, check) => value === null || check(value);
const bool = value => typeof value === 'boolean';
const identity = value => optional(value, n => positive(n, 64));
const origin = (value, max) => optional(value, n => positive(n, max));
const resourceFields = ['resource_observed', ...resourceKeys.map(key => 'resource_' + key)];
function resources(value, prefix = '') {
  const observed = value[prefix + 'observed'];
  return bool(observed) && resourceKeys.every(key => observed ? integer(value[prefix + key]) : value[prefix + key] === null);
}
const rowFields = {
  action: ['request', 'asset', 'metadataAvailable', 'fetching', 'imageReady', 'imagePending', ...resourceFields],
  metadata_start: ['attempt', 'request', 'kind', 'requestInputSeq'],
  metadata_returned: ['attempt', 'inherited', 'request', 'asset', 'kind', 'requestInputSeq'],
  metadata_failed: ['attempt', 'inherited', 'request', 'asset', 'kind', 'requestInputSeq'],
  file_acquire: ['asset', 'cache', 'requestInputSeq'],
  download_returned: ['asset', 'ok', 'requestInputSeq'],
  file_ready: ['asset', 'file', 'fileBytes', 'fileSha256', 'requestInputSeq'],
  native_dispatch: ['opToken', 'nativeOwner', 'nativeSlot', 'operation', 'file', 'asset', 'requestInputSeq'],
  native_returned: ['opToken', 'ok', 'late', ...resourceFields],
  native_timeout: ['opToken'],
};
for (const phase of ['native_pending', 'native_presentation_unknown', 'native_failure', 'native_ack'])
  rowFields[phase] = ['map', 'file', 'asset', 'requestInputSeq', 'current', 'cleanup', 'presentationUnknown'];
const base = ['seq', 'phase', 'wallMs', 'relativeMs', 'clockEpoch', 'inputSeq'];

export function validateTerrainWait(value) {
  try {
    if (!exact(value, ['schemaVersion', 'variant', 'runId', 'sourceSha256', 'action', 'started', 'active', 'sealed', 'stopReason', 'overflow', 'inputCount', 'nativePending', 'resources', 'clock', 'rows', 'limits', 'interpretation'])
      || value.schemaVersion !== TERRAIN_WAIT_SCHEMA || value.variant !== 'terrain-wait'
      || typeof value.runId !== 'string' || !/^tw-[a-z0-9]{1,20}-[a-z0-9]{1,20}$/u.test(value.runId)
      || typeof value.sourceSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(value.sourceSha256)
      || !['gesture', 'enable'].includes(value.action) || value.started !== true || value.active !== false || value.sealed !== true
      || !['deadline', 'event_limit', 'byte_limit', 'hidden', 'unmount', 'manual'].includes(value.stopReason) || !bool(value.overflow)
      || !positive(value.inputCount, 80) || !integer(value.nativePending, 80)
      || !exact(value.resources, ['observed', ...resourceKeys]) || !resources(value.resources)
      || !exact(value.limits, ['eventCount', 'identityCount', 'observationDeadlineMs', 'serializedBytes'])
      || value.limits.eventCount !== 80 || value.limits.identityCount !== 64 || value.limits.observationDeadlineMs !== 15000 || value.limits.serializedBytes !== 32768
      || value.interpretation !== interpretation || Buffer.byteLength(JSON.stringify(value)) > TERRAIN_WAIT_MAX_BYTES) return false;
    const clock = value.clock;
    if (!exact(clock, ['source', 'unit', 'kind', 'monotonic', 'nominalResolutionMs', 'effectiveResolutionMs', 'invalidReads', 'backwardReads', 'originWallMs'])
      || clock.source !== 'Date.now' || clock.unit !== 'ms' || clock.kind !== 'wall-elapsed' || clock.monotonic !== false
      || clock.nominalResolutionMs !== 1 || clock.effectiveResolutionMs !== null || !integer(clock.invalidReads) || !integer(clock.backwardReads)
      || !optional(clock.originWallMs, integer)) return false;
    if (!Array.isArray(value.rows) || !value.rows.length || value.rows.length > 80 || value.rows[0].phase !== 'action') return false;
    const attempts = new Map(), operations = new Set();
    let input = 0, requestSequence = 0, nativeSequence = 0, epoch = 0;
    for (const [index, row] of value.rows.entries()) {
      if (!rowFields[row?.phase] || !exact(row, [...base, ...rowFields[row.phase]]) || row.seq !== index + 1
        || !optional(row.wallMs, integer) || !optional(row.relativeMs, integer) || !integer(row.clockEpoch)
        || row.clockEpoch < epoch || !positive(row.inputSeq, value.inputCount)) return false;
      epoch = row.clockEpoch;
      if (epoch === 0 && row.wallMs !== null && clock.originWallMs !== null) {
        if (row.relativeMs !== row.wallMs - clock.originWallMs) return false;
      } else if (row.relativeMs !== null) return false;
      if (row.phase === 'action') input++;
      if (row.inputSeq !== input) return false;
      for (const key of ['asset', 'file', 'request', 'map']) if (Object.hasOwn(row, key) && !identity(row[key])) return false;
      if (Object.hasOwn(row, 'requestInputSeq') && !origin(row.requestInputSeq, input)) return false;
      if (Object.hasOwn(row, 'resource_observed') && !resources(row, 'resource_')) return false;
      if (row.phase === 'action' && !['metadataAvailable', 'fetching', 'imageReady', 'imagePending'].every(key => bool(row[key]))) return false;
      if (row.phase.startsWith('metadata_')) {
        if (!['fine', 'preview'].includes(row.kind)) return false;
        if (row.phase === 'metadata_start') {
          if (row.attempt !== ++requestSequence || row.requestInputSeq !== input) return false;
          attempts.set(row.attempt, row);
        } else {
          if (!bool(row.inherited) || row.inherited !== (row.attempt === null)) return false;
          const start = attempts.get(row.attempt);
          if (row.attempt !== null && (!start || row.kind !== start.kind || row.request !== start.request || row.requestInputSeq !== start.requestInputSeq)) return false;
          if (row.attempt === null && row.requestInputSeq !== null) return false;
          attempts.delete(row.attempt);
          if (row.phase === 'metadata_failed' && row.asset !== null) return false;
        }
      }
      if (row.phase === 'file_acquire' && !['miss', 'queued', 'loading', 'ready'].includes(row.cache)) return false;
      if (row.phase === 'download_returned' && !bool(row.ok)) return false;
      if (row.phase === 'file_ready' && (!optional(row.fileBytes, positive) || !optional(row.fileSha256, s => typeof s === 'string' && /^[a-f0-9]{64}$/u.test(s)))) return false;
      if (row.phase === 'native_dispatch') {
        if (row.opToken !== ++nativeSequence || !positive(row.nativeOwner, 64) || !integer(row.nativeSlot, 2147483647)
          || !['add', 'update', 'remove'].includes(row.operation)) return false;
        operations.add(row.opToken);
      }
      if (['native_returned', 'native_timeout'].includes(row.phase)) {
        if (!operations.has(row.opToken)) return false;
        if (row.phase === 'native_returned') {
          if (!bool(row.ok) || !bool(row.late)) return false;
          operations.delete(row.opToken);
        }
      }
      if (Object.hasOwn(row, 'presentationUnknown') && (!bool(row.current) || !bool(row.cleanup) || !bool(row.presentationUnknown)
        || row.phase === 'native_ack' && row.presentationUnknown || row.phase === 'native_presentation_unknown' && !row.presentationUnknown)) return false;
    }
    return input === value.inputCount && (value.overflow ? value.nativePending >= operations.size : value.nativePending === operations.size);
  } catch { return false; }
}
