// TASK ONLY coordination. The stored identities are empty diagnostic tokens;
// no Page, time owner, frame, native object or product callback is retained.
import { r25MemoryStarted, r25MemoryPaused, r25MemoryHidden, r25MemoryScopeEnded,
  r25MemoryRetired, r25MemoryExport, r25MemoryStatus } from "./r25-memory-lifetime-adapter";

export type D2NormalOwner = { timeToken: object; mounted: boolean; visible: boolean;
  bound: boolean; playing: boolean; armed: boolean; readySurfaceId: number;
  recordingSurfaceId: number; start: "idle" | "armed" | "started" | "blocked" };
let current: D2NormalOwner | null = null, recording: D2NormalOwner | null = null;
let creatingTimeToken: object | null = null, readyTimeToken: object | null = null, readySurfaceId = 0;
const surfaceId = (value: number) => Number.isSafeInteger(value) && value > 0 && value <= 1e12;
const optional = (work: () => void) => { try { work(); } catch { /* optional observation */ } };

export function createD2NormalOwner(timeToken: object, bound: boolean, playing: boolean): D2NormalOwner {
  return { timeToken, mounted: false, visible: false, bound, playing, armed: false,
    readySurfaceId: readyTimeToken === timeToken ? readySurfaceId : 0, recordingSurfaceId: 0, start: "idle" };
}
export function mountD2NormalOwner(owner: D2NormalOwner) {
  if (current && current !== owner) endD2NormalOwner(current);
  owner.mounted = true;
  if (readyTimeToken === owner.timeToken) owner.readySurfaceId = readySurfaceId;
  current = owner;
}
export function hideD2NormalOwner(owner: D2NormalOwner) {
  if (current !== owner || !owner.mounted) return;
  owner.visible = false; owner.armed = false;
  if (recording === owner) optional(r25MemoryHidden);
}
export function endD2NormalOwner(owner: D2NormalOwner) {
  owner.mounted = false; owner.visible = false; owner.armed = false;
  if (recording === owner) optional(r25MemoryScopeEnded);
  if (current === owner) current = null;
}
export function armD2NormalOwner(owner: D2NormalOwner): boolean {
  if (!d2NormalOwnerCanInteract(owner) || !owner.bound || owner.playing || !surfaceId(owner.readySurfaceId)) return false;
  owner.armed = true; owner.start = "armed"; return true;
}
/** Called after the actual time owner's publish, without changing its result. */
export function d2NormalTimeChanged(timeToken: object, before: string, after: string) {
  try {
    const owner = current;
    if (!owner || !owner.mounted || owner.timeToken !== timeToken) return;
    owner.playing = after === "PLAYING";
    if (before === after) return;
    if (before === "PLAYING" && after !== "PLAYING") {
      if (recording === owner) r25MemoryPaused();
      return;
    }
    if (after !== "PLAYING" || !owner.armed || !owner.visible || !owner.bound || !surfaceId(owner.readySurfaceId)) return;
    owner.armed = false;
    if (r25MemoryStarted()) {
      owner.start = "started"; owner.recordingSurfaceId = owner.readySurfaceId; recording = owner;
    } else owner.start = "blocked";
  } catch { /* observer failure must not alter the published time or product */ }
}
/** Synchronous scope only: the original factory value/throw is preserved. */
export function d2NormalSurfaceCreation<T>(timeToken: object, work: () => T): T {
  const previous = creatingTimeToken; creatingTimeToken = timeToken;
  try { return work(); } finally { creatingTimeToken = previous; }
}
export function d2NormalSurfaceReady(id: number) {
  if (!surfaceId(id) || !creatingTimeToken) return;
  readyTimeToken = creatingTimeToken; readySurfaceId = id;
  if (current?.timeToken === creatingTimeToken && current.mounted) {
    current.readySurfaceId = id;
    if (recording === current) current.recordingSurfaceId = id;
  }
}
export function d2NormalSurfaceRetired(id: number) {
  if (!surfaceId(id)) return;
  if (readySurfaceId === id) { readySurfaceId = 0; readyTimeToken = null; }
  if (current?.readySurfaceId === id) {
    current.readySurfaceId = 0;
    if (current.armed) { current.armed = false; current.start = "idle"; }
  }
  if (recording?.recordingSurfaceId === id) {
    recording.recordingSurfaceId = 0; optional(r25MemoryRetired);
  }
}
export function d2NormalOwnerCanInteract(owner: D2NormalOwner): boolean {
  return current === owner && owner.mounted && owner.visible;
}
export function exportD2NormalObservation(owner: D2NormalOwner): Promise<void> {
  if (!d2NormalOwnerCanInteract(owner)) return Promise.resolve();
  try { return r25MemoryExport(); } catch { return Promise.resolve(); }
}
export function d2NormalObservationStatus(owner: D2NormalOwner): string {
  const state = owner.start === "armed" ? "等待下一次普通Play" : owner.start === "blocked"
    ? "原记录未结束或尚未保存，未开始新观察" : owner.start === "started" ? "本次普通Play已开始观察" : "尚未准备观察";
  try { return `${state}；${r25MemoryStatus()}`; } catch { return `${state}；观察状态未知`; }
}
