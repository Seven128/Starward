// TASK ONLY: exact parsed-number memoization, used only by a frozen CPU diagnostic surface.
import type { SkyCanvasTextMetrics } from "./sky-canvas-surface";

const capacity = 256; // Temporary experiment bound, not an adopted product budget.
type Counts = { hits: number; misses: number; evictions: number; nativeGlyphCalls: number };
type Stats = Counts & { lifetimeHits: number; lifetimeMisses: number; lifetimeEvictions: number;
  lifetimeNativeGlyphCalls: number; entries: number; capacity: number; observationResets: number;
  retired: boolean; available: boolean };
const empty = (): Counts => ({ hits: 0, misses: 0, evictions: 0, nativeGlyphCalls: 0 });
const increment = (value: number) => Math.min(Number.MAX_SAFE_INTEGER, value + 1);
const clone = (value: SkyCanvasTextMetrics): SkyCanvasTextMetrics => ({ width: value.width, left: value.left,
  right: value.right, ascent: value.ascent, descent: value.descent });
const validNumbers = (value: SkyCanvasTextMetrics) => [value.width, value.left, value.right, value.ascent, value.descent]
  .every(number => typeof number === "number" && Number.isFinite(number) && number >= 0);
function key(text: string, font: string, lineHeight: number, letterSpacing: number) {
  if (typeof text !== "string" || typeof font !== "string" || !Number.isFinite(lineHeight) || lineHeight <= 0 ||
    !Number.isFinite(letterSpacing) || letterSpacing < 0) return undefined;
  // Existing callers use these two complete valid declarations. Canvas ignores
  // invalid font assignments and inherits previous state: never memoize those,
  // or any other unverified font syntax, by the requested string alone.
  if (font !== "12px sans-serif" && font !== "600 14px sans-serif") return undefined;
  return JSON.stringify([font, text, lineHeight, letterSpacing]);
}
type Owner = { reset(): void; stats(): Stats };
let current: Owner | undefined;
let last: Stats = { ...empty(), lifetimeHits: 0, lifetimeMisses: 0, lifetimeEvictions: 0,
  lifetimeNativeGlyphCalls: 0, entries: 0, capacity, observationResets: 0, retired: false, available: false };

export function createR17CpuTextMetricsCache() {
  const entries = new Map<string, Readonly<SkyCanvasTextMetrics>>();
  const lifetime = empty();
  let observation = empty(), observationResets = 0, retired = false;
  const live = () => { if (retired) throw new Error("r17_cpu_text_metrics_cache_retired"); };
  const count = (field: keyof Counts) => {
    lifetime[field] = increment(lifetime[field]); observation[field] = increment(observation[field]);
  };
  const owner: Owner = {
    reset() { live(); observation = empty(); observationResets = increment(observationResets); },
    stats() { return { ...observation, lifetimeHits: lifetime.hits, lifetimeMisses: lifetime.misses,
      lifetimeEvictions: lifetime.evictions, lifetimeNativeGlyphCalls: lifetime.nativeGlyphCalls,
      entries: entries.size, capacity, observationResets, retired, available: true }; },
  };
  current = owner;
  return {
    read(text: string, font: string, lineHeight: number, letterSpacing: number): SkyCanvasTextMetrics | undefined {
      live();
      const entryKey = key(text, font, lineHeight, letterSpacing);
      const value = entryKey === undefined ? undefined : entries.get(entryKey);
      if (!value) { count("misses"); return undefined; }
      count("hits");
      entries.delete(entryKey!); entries.set(entryKey!, value);
      // Neither the original native TextMetrics nor a caller-owned mutable object is retained/returned.
      return clone(value);
    },
    remember(text: string, font: string, lineHeight: number, letterSpacing: number,
      value: SkyCanvasTextMetrics): SkyCanvasTextMetrics {
      live();
      const entryKey = key(text, font, lineHeight, letterSpacing);
      if (entryKey === undefined || !validNumbers(value)) return value;
      if (!entries.has(entryKey) && entries.size >= capacity) {
        entries.delete(entries.keys().next().value!); count("evictions");
      }
      entries.delete(entryKey); entries.set(entryKey, Object.freeze(clone(value)));
      return value;
    },
    nativeGlyphCall() { live(); count("nativeGlyphCalls"); },
    dispose() {
      if (retired) return;
      retired = true; entries.clear();
      if (current === owner) { last = owner.stats(); current = undefined; }
    },
    stats: owner.stats,
  };
}
// Reset only measurement counters. Entries, capacity and lifetime counters survive Play reset.
export function r17ResetCpuTextMetricsObservation() { current?.reset(); }
export function r17CpuTextMetricsStats(): Stats { return current ? current.stats() : { ...last }; }
