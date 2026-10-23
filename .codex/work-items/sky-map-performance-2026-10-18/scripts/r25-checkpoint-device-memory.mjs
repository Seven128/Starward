// TASK ONLY, read-only Android process/memory binding for the checkpoint trial.
// All raw process identifiers and meminfo remain in the existing private root.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { AdbDevice, findAdb, foregroundActivity } from '../../../../tools/miniapp/device-adb.mjs';
const label = process.argv[2];
if (!/^(?:before-preview|before-play|after-play|after-exit)$/.test(label ?? '') || process.argv.length !== 3)
  throw Error('finite_r25_checkpoint_label_required');
const directory = 'C:/Users/momoooo/.starward-private/sky-map-20261020/device-resume/r24-independent-20261021/performance-alternatives';
const d = new AdbDevice(await findAdb()); await d.select({ transport: 'usb' });
async function target() {
  const activity = await d.foreground();
  const raw = (await d.command(['shell', 'dumpsys', 'activity', 'activities'], { maxBytes: 1048576 })).toString();
  if (foregroundActivity(raw) !== activity) throw Error('foreground_changed');
  const owners = raw.split(/(?=^\s*(?:\*\s*)?Hist\s+#\d+:\s*ActivityRecord\{)/m).flatMap(section => {
    const h = section.match(/^\s*(?:\*\s*)?Hist\s+#\d+:\s*ActivityRecord\{[^\r\n]*?\s(com\.tencent\.mm\/[^\s}]+)/m)?.[1];
    if (!h) return [];
    const [pkg, c] = h.split('/');
    if (pkg + '/' + (c.startsWith('.') ? pkg + c : c) !== activity || !/\b(?:mState|state)=RESUMED\b/.test(section)) return [];
    const p = section.match(/\bapp=ProcessRecord\{[^}\r\n]*?\s(\d+):(com\.tencent\.mm:appbrand\d*)\//);
    return p ? [{ pid: Number(p[1]), name: p[2], activity }] : [];
  });
  if (owners.length !== 1) throw Error('foreground_owner_unavailable');
  const owner = owners[0];
  const stat = (await d.command(['shell', 'cat', `/proc/${owner.pid}/stat`])).toString();
  const close = stat.lastIndexOf(')');
  const startTicks = stat.slice(close + 2).trim().split(/\s+/)[19];
  if (close < 0 || !/^\d+$/.test(startTicks ?? '')) throw Error('process_start_ticks_missing');
  return { ...owner, startTicks };
}
const hostStarted = new Date().toISOString(), before = await target();
const meminfo = (await d.command(['shell', 'dumpsys', 'meminfo', '-s', String(before.pid)], { timeout: 15000, maxBytes: 131072 })).toString();
const after = await target();
if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('process_changed_during_meminfo');
const id = `r25-checkpoint-${label}-${Date.now()}`;
const rawPath = path.join(directory, id + '.meminfo.private.txt');
await fs.writeFile(rawPath, meminfo, { flag: 'wx' });
const metrics = Object.fromEntries(['PSS', 'RSS', 'SWAP PSS'].map(key => [key,
  Number(meminfo.match(new RegExp('TOTAL ' + key + ':\\s*(\\d+)'))?.[1]) || null]));
const receipt = { schema: 'starward-r25-checkpoint-process-memory-v1', label, hostStarted,
  hostFinished: new Date().toISOString(), target: before, metricsKiB: metrics, rawPath,
  rawSha256: createHash('sha256').update(meminfo).digest('hex'), scope: 'process-sample-not-js-heap-not-leak-verdict' };
const receiptPath = path.join(directory, id + '.private.json');
await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ label, metricsKiB: metrics, processStableDuringRead: true, receiptPath }));
