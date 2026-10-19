// Task-only store for the existing bounded LAN collector. No new route/service.
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  validateR17PhoneProbeMetrics,
  validateR17PhoneProbeTerminal,
  matchR17PhoneProbeTerminal,
} from './r17-a-correlation-protocol.mjs';

export function createR17PhoneProbeCollector(directory) {
  if (typeof directory !== 'string' || !path.isAbsolute(directory)) throw Error('metrics_directory_required');
  let tail = Promise.resolve();
  const filename = (value, terminal = false) => path.join(directory,
    value.variant + '-' + value.runId + (terminal ? '-terminal' : '') + '.json');
  const read = async file => fs.readFile(file, 'utf8').catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  async function store(value) {
    // Validate before using any incoming value in a path or touching disk.
    try { if (!validateR17PhoneProbeMetrics(value)) return 400; }
    catch { return 400; }
    const terminal = validateR17PhoneProbeTerminal(value);
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
