// Task-only store for the existing bounded LAN collector. No new route/service.
import fs from 'node:fs/promises';
import path from 'node:path';
import { R25_MEMORY_SCHEMA, validateR25MemoryLifetime } from './r25-memory-lifetime-protocol.mjs';
import { R25_MEMORY_CHECKPOINT_SCHEMA, validateR25MemoryCheckpoint } from './r25-memory-checkpoint-protocol.mjs';
import { D2_DECODE_CHECKPOINT_SCHEMA, validateD2DecodeCheckpoint } from './d2-decode-checkpoint-protocol.mjs';
import { D2_TIME_OBSERVATION_SCHEMA, validateD2TimeObservation } from './d2-time-observation-protocol.mjs';
import { R26_MEMORY_CHECKPOINT_SCHEMA, validateR26MemoryCheckpoint } from './r26-memory-checkpoint-protocol.mjs';
import { R27_MEMORY_CHECKPOINT_SCHEMA, validateR27MemoryCheckpoint } from './r27-memory-checkpoint-protocol.mjs';
import {
  validateR17PhoneProbeMetrics,
  validateR17PhoneProbeTerminal,
  matchR17PhoneProbeTerminal,
} from './r17-normal-input-protocol.mjs';

// The original optional input is absent on this host. Its schemas are fixed in
// the existing builder; load its exact validator only for those packets. A
// missing input remains MISSING/503, never a fabricated validator or a pass.
const nativeRegionSchemas = ['starward-r17-native-region-v1', 'starward-r17-native-region-v2'];
let nativeRegionDependency;
function nativeRegionProtocol() {
  return nativeRegionDependency ??= import('../tmp/r17-native-region-probe-protocol.mjs').then(protocol =>
    protocol.R17_NATIVE_REGION_SCHEMA === nativeRegionSchemas[0] && protocol.R17_NATIVE_REGION_SCHEMA_V2 === nativeRegionSchemas[1]
      && typeof protocol.validateNativeRegionProbe === 'function'
      ? { status: 'AVAILABLE', validate: protocol.validateNativeRegionProbe } : { status: 'FAILED' },
  error => ({ status: error?.code === 'ERR_MODULE_NOT_FOUND' ? 'MISSING' : 'FAILED' }));
}
// Qualification is fixed for this loaded collector; restoring the old input
// requires its owner's bounded reload, not repeated import/retry on requests.
export async function nativeRegionProbeDependencyStatus() { return (await nativeRegionProtocol()).status; }

export function createR17PhoneProbeCollector(directory) {
  if (typeof directory !== 'string' || !path.isAbsolute(directory)) throw Error('metrics_directory_required');
  let tail = Promise.resolve();
  const filename = (value, terminal = false) => path.join(directory,
    value.variant + '-' + value.runId + ([R25_MEMORY_CHECKPOINT_SCHEMA, D2_DECODE_CHECKPOINT_SCHEMA, R26_MEMORY_CHECKPOINT_SCHEMA, R27_MEMORY_CHECKPOINT_SCHEMA].includes(value.schemaVersion)
      ? '-checkpoint-' + value.sequence : terminal ? '-terminal' : '') + '.json');
  const read = async file => fs.readFile(file, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  async function store(value) {
    // Validate before using any incoming value in a path or touching disk.
    let nativeRegion = false, memoryLifetime = false, memoryCheckpoint = false, decodeCheckpoint = false, ownerCheckpoint = false, callbackCheckpoint = false, timeObservation = false;
    try {
      nativeRegion = nativeRegionSchemas.includes(value?.schemaVersion);
      memoryLifetime = value?.schemaVersion === R25_MEMORY_SCHEMA;
      memoryCheckpoint = value?.schemaVersion === R25_MEMORY_CHECKPOINT_SCHEMA;
      decodeCheckpoint = value?.schemaVersion === D2_DECODE_CHECKPOINT_SCHEMA;
      ownerCheckpoint = value?.schemaVersion === R26_MEMORY_CHECKPOINT_SCHEMA;
      callbackCheckpoint = value?.schemaVersion === R27_MEMORY_CHECKPOINT_SCHEMA;
      timeObservation = value?.schemaVersion === D2_TIME_OBSERVATION_SCHEMA;
      let nativeValidator;
      if (nativeRegion) {
        const dependency = await nativeRegionProtocol();
        if (dependency.status !== 'AVAILABLE') return 503;
        nativeValidator = dependency.validate;
      }
      if (!(timeObservation ? validateD2TimeObservation(value) : decodeCheckpoint ? validateD2DecodeCheckpoint(value) : callbackCheckpoint ? validateR27MemoryCheckpoint(value) : ownerCheckpoint ? validateR26MemoryCheckpoint(value) : memoryCheckpoint ? validateR25MemoryCheckpoint(value) : memoryLifetime ? validateR25MemoryLifetime(value)
        : nativeRegion ? nativeValidator(value) : validateR17PhoneProbeMetrics(value))) return 400;
    }
    catch { return 400; }
    const terminal = !nativeRegion && !memoryLifetime && !memoryCheckpoint && !decodeCheckpoint && !ownerCheckpoint && !callbackCheckpoint && !timeObservation && validateR17PhoneProbeTerminal(value);
    await fs.mkdir(directory, { recursive: true });
    if ((await fs.lstat(directory)).isSymbolicLink()) throw Error('metrics_directory_symlink');
    const file = filename(value, terminal), body = JSON.stringify(value, null, 2);
    if (terminal) {
      const metrics = await read(filename(value));
      if (metrics === null) return 424;
      let linked = false;
      try { linked = matchR17PhoneProbeTerminal(JSON.parse(metrics), value); } catch {}
      if (!linked) return 409;
    }
    const existing = await read(file);
    if (existing !== null) return existing === body ? 200 : 409;
    if ((await fs.readdir(directory)).filter(name => name.endsWith('.json')).length >= 32) return 429;
    try { await fs.writeFile(file, body, { flag: 'wx', mode: 0o600 }); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      return await read(file) === body ? 200 : 409;
    }
    return 200;
  }
  return {
    store(value) {
      const result = tail.then(() => store(value));
      tail = result.then(() => undefined, () => undefined);
      return result;
    },
  };
}
