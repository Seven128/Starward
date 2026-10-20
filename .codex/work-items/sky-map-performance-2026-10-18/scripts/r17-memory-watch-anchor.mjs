// Task-only host-clock association. This module never imports or contacts a device.
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const configuredRoot = process.env.STARWARD_R17_MEMORY_ROOT;
if (configuredRoot && !path.isAbsolute(configuredRoot)) throw Error('memory_probe_absolute_private_root_required');
export const MEMORY_EVIDENCE_ROOT = configuredRoot ?? path.join(os.homedir(), '.starward-private', 'sky-map-performance-2026-10-18', 'memory');
const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const relativeRoot = path.relative(repositoryRoot, MEMORY_EVIDENCE_ROOT);
if (!relativeRoot || (!relativeRoot.startsWith('..' + path.sep) && !path.isAbsolute(relativeRoot)))
  throw Error('memory_probe_root_must_be_outside_checkout');
const sourceKeys = ['watcherSha256', 'anchorSha256', 'adbSha256'];
const finite = value => Number.isFinite(value) ? value : null;

function readAnchor(clock) {
  const before = clock.monotonicNow(), wall = clock.wallNow(), after = clock.monotonicNow();
  const valid = Number.isFinite(before) && before >= 0 && Number.isFinite(after) && after >= before
    && Number.isSafeInteger(wall) && wall >= 0;
  return { monotonicBeforeMs: finite(before), wallEpochMs: finite(wall), monotonicAfterMs: finite(after),
    state: valid ? 'read_bracket_valid' : 'invalid_clock',
    // Only the order of these reads is bounded, not wall-clock accuracy/resolution.
    wallMinusMonotonicReadBracketMs: valid ? [wall - after, wall - before] : null };
}

export async function createMemoryWatchAnchor({ label, startedMonotonicMs, sourceBindings, io, clock, newId = randomUUID }) {
  if (!/^[a-z][a-z0-9-]{0,47}$/.test(label) || !sourceBindings
    || Object.keys(sourceBindings).length !== sourceKeys.length
    || sourceKeys.some(key => !/^[a-f0-9]{64}$/.test(sourceBindings[key] ?? '')))
    throw Error('memory_probe_anchor_binding_invalid');
  const watchId = newId();
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(watchId))
    throw Error('memory_probe_anchor_id_invalid');
  const file = path.join(MEMORY_EVIDENCE_ROOT, `${label}-${watchId}.ndjson`);
  const privateFile = `${file}.anchor.private.ndjson`;
  const start = readAnchor(clock);
  const originValid = Number.isFinite(startedMonotonicMs) && startedMonotonicMs >= 0
    && start.state === 'read_bracket_valid' && startedMonotonicMs <= start.monotonicBeforeMs;
  async function write(record, flag) {
    try { await io.writeFile(privateFile, JSON.stringify(record) + '\n', { flag, mode: 0o600 }); }
    catch { throw Error('memory_probe_anchor_write_failed'); }
  }
  await write({ schema: 'starward-r17-memory-watch-anchor-v1', kind: 'start', watchId,
    observationsFile: path.basename(file), sourceBindings: Object.fromEntries(sourceKeys.map(key => [key, sourceBindings[key]])),
    productRunId: null, productCandidateVerified: false,
    clocks: { elapsed: 'host.performance.now', wall: 'host.Date.now', unit: 'ms',
      startedMonotonicMs: finite(startedMonotonicMs), originState: originValid ? 'valid' : 'invalid_clock',
      wallResolutionMs: null, monotonicResolutionMs: null }, anchor: start,
    limits: 'Host read brackets only; endpoint offset changes do not bound intermediate drift, clock steps, capture latency or device presentation. watchId identifies this observer, not a product run.' }, 'wx');
  let finished = false;
  return { file, watchId, async finish({ outcome, sampleCount, completedRowsSha256 }) {
    if (finished) throw Error('memory_probe_anchor_already_finished');
    if (!['observer_returned', 'observer_failed'].includes(outcome) || !Number.isInteger(sampleCount)
      || sampleCount < 0 || sampleCount > 13 || !/^[a-f0-9]{64}$/.test(completedRowsSha256))
      throw Error('memory_probe_anchor_finish_invalid');
    finished = true;
    const end = readAnchor(clock);
    const readsValid = originValid && end.state === 'read_bracket_valid';
    const ordered = readsValid && end.monotonicBeforeMs >= start.monotonicAfterMs
      && end.wallEpochMs >= start.wallEpochMs;
    const startOffset = start.wallMinusMonotonicReadBracketMs, endOffset = end.wallMinusMonotonicReadBracketMs;
    await write({ schema: 'starward-r17-memory-watch-anchor-v1', kind: 'end', watchId,
      outcome, sampleCount, completedRowsSha256, anchor: end,
      associationState: ordered ? 'host_endpoints_only' : 'invalid_clock',
      // This observed change is not an assumed zero-drift calibration or error bound.
      endpointOffsetChangeReadBracketMs: readsValid
        ? [endOffset[0] - startOffset[1], endOffset[1] - startOffset[0]] : null }, 'a');
  } };
}
