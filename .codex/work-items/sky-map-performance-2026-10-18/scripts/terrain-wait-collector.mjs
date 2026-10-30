// TASK ONLY pure store factory. It never opens a port or replays old collectors.
import fs from 'node:fs/promises';
import path from 'node:path';
import { TERRAIN_WAIT_SCHEMA, validateTerrainWait } from './terrain-wait-protocol.mjs';

export function createTerrainWaitCollector(directory, { fallback } = {}) {
  if (typeof directory !== 'string' || !path.isAbsolute(directory)) throw Error('terrain_wait_directory_required');
  if (fallback !== undefined && typeof fallback?.store !== 'function') throw Error('terrain_wait_fallback_invalid');
  let tail = Promise.resolve();
  const read = file => fs.readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  async function store(value) {
    if (value?.schemaVersion !== TERRAIN_WAIT_SCHEMA) return fallback ? fallback.store(value) : 400;
    if (!validateTerrainWait(value)) return 400;
    await fs.mkdir(directory, { recursive: true });
    if ((await fs.lstat(directory)).isSymbolicLink()) throw Error('terrain_wait_directory_symlink');
    const file = path.join(directory, `${value.variant}-${value.runId}.json`), body = JSON.stringify(value, null, 2);
    const existing = await read(file);
    if (existing !== null) return existing === body ? 200 : 409;
    if ((await fs.readdir(directory)).filter(name => name.endsWith('.json')).length >= 32) return 429;
    try { await fs.writeFile(file, body, { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; return await read(file) === body ? 200 : 409; }
    return 200;
  }
  return { store(value) {
    const result = tail.then(() => store(value));
    tail = result.then(() => undefined, () => undefined);
    return result;
  } };
}
