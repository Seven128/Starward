// TASK ONLY. Observe actual local receipts during the one bounded phone trial.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateR25MemoryCheckpoint, R25_MEMORY_CHECKPOINT_SCHEMA } from './r25-memory-checkpoint-protocol.mjs';
import { validateR26MemoryCheckpoint, R26_MEMORY_CHECKPOINT_SCHEMA } from './r26-memory-checkpoint-protocol.mjs';
import { validateR27MemoryCheckpoint, R27_MEMORY_CHECKPOINT_SCHEMA } from './r27-memory-checkpoint-protocol.mjs';

export function checkpointWatchMode(args) {
  if (!Array.isArray(args) || new Set(args).size !== args.length ||
    args.some(arg => !['--review-r26', '--review-r27', '--current-ui', '--r27-sky-package'].includes(arg)) ||
    args.includes('--review-r26') && args.includes('--review-r27') ||
    args.includes('--current-ui') && !args.includes('--review-r27') ||
    args.includes('--r27-sky-package') && (!args.includes('--review-r27') || !args.includes('--current-ui'))) throw Error('finite_review_required');
  const revision = args.includes('--review-r27') ? 27 : args.includes('--review-r26') ? 26 : 25;
  const currentUi = args.includes('--current-ui');
  const skyPackage = args.includes('--r27-sky-package');
  return { revision, currentUi, ...(skyPackage ? { skyPackage: true } : {}),
    trial: `r17-normal-a1-review-r${revision}-usb${skyPackage ? '-sky-package' : currentUi ? '-current-ui' : ''}` };
}

export function checkpointArrivalRecord(mode, manifest, name, raw, elapsedMs) {
  if (mode.skyPackage && manifest.buildGeneration !== 33) throw Error('unexpected_checkpoint_binding');
  let value;
  try { value = JSON.parse(raw); } catch { return null; } // Concurrent writes are retried on the next tick.
  if (value?.observation?.binding?.generation !== manifest.buildGeneration) return null;
  const validSchema = mode.revision === 27 ? value.schemaVersion === R27_MEMORY_CHECKPOINT_SCHEMA && validateR27MemoryCheckpoint(value)
    : mode.revision === 26 ? value.schemaVersion === R26_MEMORY_CHECKPOINT_SCHEMA && validateR26MemoryCheckpoint(value)
      : value.schemaVersion === R25_MEMORY_CHECKPOINT_SCHEMA && validateR25MemoryCheckpoint(value);
  if (!validSchema || value.observation.binding.sourceHash !== manifest.buildSourceSha256 ||
    name !== `baseline-${value.runId}-checkpoint-${value.sequence}.json`) throw Error('unexpected_checkpoint_binding');
  const point = value.observation.checkpoints[0];
  return { hostObservedAt: new Date().toISOString(), hostWatchElapsedMs: Math.round(elapsedMs),
    name, sequence: value.sequence, runId: value.runId, phase: point.phase, relativeMs: point.relativeMs,
    bytes: raw.length, sha256: createHash('sha256').update(raw).digest('hex'),
    ownerTiles: value.owners.tiles.length, ownerAggregates: value.owners.aggregates.length,
    arrayAllocations: point.sites[0].allocations, currentEndAlreadyPresent: point.phase === 'end',
    ...(mode.revision >= 26 ? { frameworkPhase: value.ownerLinks.framework?.phase ?? null,
      frameworkStatus: value.ownerLinks.framework?.observation.status ?? null,
      matchedIds: [...new Set(value.ownerLinks.framework?.observation.matches.map(row => row.aggregateId) ?? [])] } : {}),
    ...(mode.revision === 27 ? { callbackPhase: value.queryCallbacks.observation?.phase ?? null,
      callbackCapability: value.queryCallbacks.observation?.value.capability ?? null,
      callbackSamples: value.queryCallbacks.observation?.value.samples.length ?? 0 } : {}) };
}

async function watch() {
const mode = checkpointWatchMode(process.argv.slice(2));
const { revision } = mode;
const privateRoot = 'C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume';
const runtime = JSON.parse(await fs.readFile(path.join(privateRoot, 'runtime-usb.private.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(new URL(`../tmp/${mode.trial}/manifest.json`, import.meta.url), 'utf8'));
const file = path.join(privateRoot, 'r24-independent-20261021/performance-alternatives', `r${revision}-checkpoint-arrivals-${Date.now()}.private.jsonl`);
await fs.writeFile(file, '', { flag: 'wx' });
const seen = new Set(), start = performance.now(); let ended = false;
console.log(JSON.stringify({ watching: true, revision, generation: manifest.buildGeneration,
  currentUi: mode.currentUi, ...(mode.skyPackage ? { skyPackage: true } : {}), durationLimitMs: 120000, receiptPath: file }));
while (performance.now() - start < 120000 && !ended) {
  for (const name of await fs.readdir(runtime.collectorDirectory)) {
    if (!/^baseline-r25-[1-9][0-9]*-[a-z0-9]+-checkpoint-[0-9]+\.json$/.test(name) || seen.has(name)) continue;
    let raw;
    try { raw = await fs.readFile(path.join(runtime.collectorDirectory, name)); }
    catch { continue; } // A concurrent write is checked on the next bounded tick.
    const record = checkpointArrivalRecord(mode, manifest, name, raw, performance.now() - start);
    if (!record) continue;
    seen.add(name);
    await fs.appendFile(file, JSON.stringify(record) + '\n');
    console.log(JSON.stringify(record));
    if (record.phase === 'end') ended = true;
  }
  if (!ended) await new Promise(resolve => setTimeout(resolve, 250));
}
console.log(JSON.stringify({ finished: true, ended, observed: seen.size, receiptPath: file }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await watch();
