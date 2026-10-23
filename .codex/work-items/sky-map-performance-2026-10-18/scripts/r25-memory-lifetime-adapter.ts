// TASK ONLY adapter: product objects reach weak observers only. Every queued
// checkpoint is an immutable scalar string, exported before the final deadline.
import Taro from "@tarojs/taro";
import { createR25MemoryLifetimeObserver, R25_MEMORY_SITES } from "./r25-memory-lifetime-observer";
import { createR25StellarOwnerObserver } from "./r25-stellar-owner-observer";
import { r17ProbePayloadBytes } from "./r17-ruler-entry-runtime";
const probe = createR25MemoryLifetimeObserver();
const owners = createR25StellarOwnerObserver();
probe.configure({ generation: __R25_BUILD_GENERATION__, sourceHash: "__R25_BUILD_SOURCE_HASH__" });
type Phase = Parameters<typeof probe.checkpoint>[0];
type Packet = { text: string; stored: boolean; automaticAttempts: number; manualReady: boolean; withinBudget: boolean };
let timers: ReturnType<typeof setTimeout>[] = [], tracking = false, pauseSeen = false, retiredSeen = false, hideSeen = false, scopeEnded = false;
let packets: Packet[] = [], pump: Promise<void> | null = null, localFailure = false;
const clearTimers = () => { for (const timer of timers) clearTimeout(timer); timers = []; };
function later(ms: number, callback: () => void) {
  const timer = setTimeout(() => { timers = timers.filter(value => value !== timer); if (probe.active()) callback(); }, ms);
  timers.push(timer);
}
function stopTracking() { tracking = false; owners.stopTracking(); }
export function r25MemoryStatus() {
  const stored = packets.filter(packet => packet.stored).length;
  const progress = `${stored}/${packets.length}`;
  const state = localFailure ? "检查点生成失败，原记录保留" : packets.some(packet => !packet.withinBudget)
    ? "超出导出预算，原记录保留" : pump ? `分段导出中 ${progress}`
    : packets.some(packet => !packet.stored) ? `导出失败，可重送原件 ${progress}`
    : probe.active() ? `观察中，分段已保存 ${progress}` : packets.length ? `寿命记录已保存 ${progress}` : "未开始";
  return `内存WeakRef:${probe.capability().weakRef ? "可用" : "不支持"}；${state}`;
}
export function r25MemoryTrack(site: typeof R25_MEMORY_SITES[number], value: object, quantity: number) {
  if (tracking) probe.track(site, value, quantity);
}
export function r25MemoryTile(tile: object, entry: { transform: object }) {
  if (tracking) owners.observeTile(tile, entry);
}
export function r25MemoryAggregate(aggregate: object, entries: readonly { cached: object }[]) {
  if (tracking) owners.observeAggregate(aggregate, entries);
}
function sendQueued(): Promise<void> {
  if (pump) return pump;
  // A request gets at most two automatic attempts over its entire lifetime.
  // An exhausted packet does not prevent later checkpoints from being saved.
  const work = async () => {
    for (;;) {
      const current = packets.find(packet => !packet.stored && packet.withinBudget &&
        (packet.manualReady || packet.automaticAttempts < 2));
      if (!current) return;
      if (current.manualReady) current.manualReady = false;
      else current.automaticAttempts++;
      try {
        const result = await Taro.request({ url: `${__MINIAPP_API_BASE__}/__development_r17_phone_probe_metrics`, method: "POST",
          data: current.text, header: { "content-type": "application/json" }, timeout: 10000 });
        current.stored = result.statusCode === 200 && (result.data as { stored?: boolean })?.stored === true;
      } catch { /* exact bytes remain queued; no workload replay */ }
    }
  };
  pump = work().finally(() => { pump = null; });
  return pump;
}
function queueLatest() {
  if (packets.length >= 10) { localFailure = true; return; }
  try {
    const observation = probe.snapshot();
    if (!observation || observation.checkpoints.length !== 1) { localFailure = true; return; }
    const text = JSON.stringify({ schemaVersion: "starward-r25-memory-checkpoint-v1", variant: "baseline",
      runId: observation.runId, sequence: packets.length + 1, observation, owners: owners.snapshot() });
    packets.push({ text, stored: false, automaticAttempts: 0, manualReady: false,
      withinBudget: r17ProbePayloadBytes(text) <= 32768 });
    void sendQueued();
  } catch { localFailure = true; }
}
function checkpoint(phase: Phase) { if (probe.checkpoint(phase)) queueLatest(); }
function seal() {
  if (!probe.active()) return;
  stopTracking(); clearTimers(); checkpoint("end");
  probe.seal(); owners.release();
}
export function r25MemoryExport(): Promise<void> {
  const wasSending = pump !== null;
  seal();
  // An in-flight result is still unknown. A repeated button press neither adds
  // another POST nor changes that packet's retry budget.
  if (wasSending) return pump ?? Promise.resolve();
  for (const packet of packets) if (!packet.stored && packet.automaticAttempts >= 2) packet.manualReady = true;
  return sendQueued();
}
export function r25MemoryStarted() {
  if (probe.active() || pump || localFailure || packets.some(packet => !packet.stored)) return false;
  clearTimers(); packets = []; pauseSeen = retiredSeen = hideSeen = scopeEnded = false;
  if (!probe.start()) return false;
  owners.start(); tracking = probe.capability().weakRef;
  queueLatest(); // baseline is produced by start(), and immediately durable when acknowledged.
  if (!tracking) { probe.seal(); owners.release(); return false; }
  later(5000, () => { if (tracking) checkpoint("active-5"); });
  later(15000, () => { if (tracking) checkpoint("active-15"); });
  later(30000, () => { if (tracking) checkpoint("active-30"); });
  later(90000, seal);
  return true;
}
export function r25MemoryPaused() {
  if (!probe.active() || pauseSeen) return;
  pauseSeen = true; stopTracking(); probe.mark("pause"); checkpoint("paused");
  later(10000, () => checkpoint("drain-10"));
}
export function r25MemoryRetired() {
  if (!probe.active() || retiredSeen) return;
  retiredSeen = true; stopTracking(); probe.mark("retire"); checkpoint("retired");
  later(10000, () => checkpoint("drain-10"));
}
export function r25MemoryHidden() {
  if (!probe.active() || hideSeen) return;
  hideSeen = true; stopTracking(); probe.mark("hide"); checkpoint("hidden");
}
export function r25MemoryScopeEnded() {
  if (!probe.active() || scopeEnded) return;
  scopeEnded = true; stopTracking(); probe.mark("scope"); checkpoint("scope-ended");
}
