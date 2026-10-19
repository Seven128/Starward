// TASK ONLY r5. One immediate wide-time observation, not a presentation probe.
// Values are scalar event facts; no node, row, callback, frame or payload is kept.
type Stamp = { value: number | null; epoch: number; windowId: number };
type Event = (number | null)[];
const CAPACITY = 128, LIMIT = 1e12, MAX_BYTES = 32768;
let enabled = false, selected = false, observed = 0, identity = 0, rejectedWindowEvents = 0;
let start: Stamp = { value: null, epoch: 0, windowId: 0 };
let clock: (() => Stamp) | null = null;
let ring: Event[] = [];
const scalar = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) &&
  Math.abs(value) <= Number.MAX_SAFE_INTEGER ? value : typeof value === "boolean" ? Number(value) : null;
function bytes(value: string) {
  let size = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 128) size++;
    else if (code < 2048) size += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length &&
      value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) { size += 4; i++; }
    else size += 3;
  }
  return size;
}
function record(code: number, values: readonly unknown[], expectedWindow = start.windowId) {
  if (!enabled || !clock || observed >= LIMIT) return;
  if (expectedWindow !== start.windowId) { rejectedWindowEvents = Math.min(LIMIT, rejectedWindowEvents + 1); return; }
  const at = clock();
  const elapsed = at.value !== null && start.value !== null && at.windowId === start.windowId &&
    at.epoch === start.epoch && at.value >= start.value && at.value - start.value <= 60000 ? at.value - start.value : null;
  const event: Event = [++observed, code, elapsed, at.value, at.epoch, at.windowId];
  for (const value of values) event.push(scalar(value));
  ring[(observed - 1) % CAPACITY] = event;
}
export const r17RulerEntry = {
  active: () => enabled,
  window: () => enabled ? start.windowId : 0,
  current: (window: number) => enabled && window === start.windowId,
  id: () => identity < LIMIT ? ++identity : 0,
  start(allow: boolean, armedAt: Stamp, now: () => Stamp) {
    selected = enabled = allow; observed = rejectedWindowEvents = 0; ring = []; start = { ...armedAt }; clock = allow ? now : null;
    record(1, []);
  },
  record,
  stop(reason: number) {
    record(23, [reason]); enabled = false; clock = null;
  },
  attach<T extends object>(payload: T): T | (T & { rulerEntry: object }) {
    if (!selected) return payload;
    const retained = Math.min(observed, CAPACITY);
    const rows: Event[] = [];
    for (let sequence = observed - retained + 1; sequence <= observed; sequence++) {
      const row = ring[(sequence - 1) % CAPACITY];
      if (row) rows.push([...row]);
    }
    const extension = (count: number) => ({ schemaVersion: "starward-r17-ruler-entry-v1",
      collection: "immediate-wide-time", meaning: "requests-offsets-not-presentation", capacity: CAPACITY,
      observed, dropped: observed - retained, overflow: observed > CAPACITY, exportOmitted: retained - count, rejectedWindowEvents,
      start: { ...start }, entries: rows.slice(0, count) });
    // Export-only serialization preserves the existing single 32 KiB writer.
    // If base metrics alone are too large, its original refusal still applies.
    let low = 0, high = retained;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (bytes(JSON.stringify({ ...payload, rulerEntry: extension(middle) })) <= MAX_BYTES) low = middle;
      else high = middle - 1;
    }
    return { ...payload, rulerEntry: extension(low) };
  },
};
