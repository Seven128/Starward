// TASK ONLY. Numeric fields extend the existing bounded preparation records.
// No payload/frame/page is retained, no product state or schedule is changed.
export type R17APreparation = {
  id: number; requests: number; used: boolean;
  aFinishedValue: number | null; aFinishedEpoch: number; aFinishedRun: number;
  aRequestValue: number | null; aRequestEpoch: number; aRequestRun: number;
  aPaintValue: number | null; aPaintEpoch: number; aPaintRun: number;
  aRequestObserved: boolean; aPaintObserved: boolean;
  aRequestRelativeMs: number | null;
  aFinishedSubmitted: number | null; aFinishedCompleted: number | null; aFinishedPending: number | null;
  aRequestSubmitted: number | null; aRequestCompleted: number | null; aRequestPending: number | null;
  aPaintSubmitted: number | null; aPaintCompleted: number | null; aPaintPending: number | null;
};
type Stamp = { value: number | null; epoch: number; windowId: number };
const reasons = ['belowResolution', 'clockUnavailable', 'clockDiscontinuity', 'outOfRange', 'notObserved'] as const;
let enabled = false;
let submitted: number | null = null, completed: number | null = null, pending: number | null = null;
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1e12;
function duration(start: number | null, end: number | null, startEpoch: number, endEpoch: number,
  startRun: number, endRun: number, observed: boolean) {
  if (!observed) return 'notObserved' as const;
  if (start === null || end === null) return 'clockUnavailable' as const;
  if (startEpoch !== endEpoch || startRun !== endRun || end < start) return 'clockDiscontinuity' as const;
  if (end - start > 60000) return 'outOfRange' as const;
  if (end === start) return 'belowResolution' as const;
  return end - start;
}
function summarize(values: R17APreparation[], phase: 'preparationToRequest' | 'requestToPaint') {
  // Export only: never allocate a timing record, array or closure per frame.
  const known: number[] = [], unknown = Object.fromEntries(reasons.map(reason => [reason, 0]));
  let subtotal = 0;
  for (const value of values) {
    const result = phase === 'preparationToRequest'
      ? duration(value.aFinishedValue, value.aRequestValue, value.aFinishedEpoch, value.aRequestEpoch,
        value.aFinishedRun, value.aRequestRun, value.aFinishedRun > 0 && value.aRequestObserved)
      : duration(value.aRequestValue, value.aPaintValue, value.aRequestEpoch, value.aPaintEpoch,
        value.aRequestRun, value.aPaintRun, value.aRequestObserved && value.aPaintObserved);
    if (typeof result === 'number') { known.push(result); subtotal += result; }
    else unknown[result] = (unknown[result] ?? 0) + 1;
  }
  known.sort((a, b) => a - b);
  return { observedCalls: values.length, validCalls: known.length, unknownCalls: values.length - known.length,
    unknown, knownSubtotalMs: subtotal, minMs: known[0] ?? null, maxMs: known.at(-1) ?? null,
    p50Ms: known[Math.floor(known.length * .5)] ?? null, p95Ms: known[Math.floor(known.length * .95)] ?? null };
}
export const r17ACorrelation = {
  start(normal: boolean) { enabled = normal; submitted = completed = pending = null; },
  pageState(s: unknown, c: unknown, p: unknown, available: unknown) {
    if (!enabled) return;
    // Counts describe the actual Page observer only. They do not identify a
    // payload, React render, component update or physical presentation.
    const valid = available === 1 && count(s) && count(c) && count(p);
    submitted = valid ? s : null; completed = valid ? c : null; pending = valid ? p : null;
  },
  finished(value: R17APreparation, stamp: Stamp) {
    if (!enabled) return;
    value.aFinishedValue = stamp.value; value.aFinishedEpoch = stamp.epoch; value.aFinishedRun = stamp.windowId;
    value.aFinishedSubmitted = submitted; value.aFinishedCompleted = completed; value.aFinishedPending = pending;
  },
  requested(value: R17APreparation, at: number | null, epoch: number, run: number, relative: number | null) {
    if (!enabled || value.aRequestObserved) return;
    value.aRequestObserved = true; value.aRequestValue = at; value.aRequestEpoch = epoch; value.aRequestRun = run;
    value.aRequestRelativeMs = relative;
    value.aRequestSubmitted = submitted; value.aRequestCompleted = completed; value.aRequestPending = pending;
  },
  painted(value: R17APreparation, stamp: Stamp) {
    if (!enabled || value.aPaintObserved) return;
    value.aPaintObserved = true; value.aPaintValue = stamp.value; value.aPaintEpoch = stamp.epoch; value.aPaintRun = stamp.windowId;
    value.aPaintSubmitted = submitted; value.aPaintCompleted = completed; value.aPaintPending = pending;
  },
  snapshot(values: R17APreparation[]) {
    if (!enabled) return null;
    // Match tokens to the original v3 first/last links. Eight rows fit the
    // existing 32 KiB receipt limit; distributions include all retained rows.
    const selected = values.length <= 8 ? values : [...values.slice(0, 4), ...values.slice(-4)];
    return { schemaVersion: 'starward-r17-a-correlation-v1', coverage: 'retained-preparations', linkLimit: 8,
      retainedPreparations: values.length, linkSampleTruncated: values.length > 8,
      preparationToRequest: summarize(values, 'preparationToRequest'), requestToPaint: summarize(values, 'requestToPaint'),
      links: selected.map(value => ({ prepareToken: value.id, firstRequestRelativeMs: value.aRequestRelativeMs,
        firstRequestObserved: value.aRequestObserved, firstPaintObserved: value.aPaintObserved,
        // Ordered [submitted, completed, pending], using fixed documented
        // names at the collector. Null means no valid Page observation.
        pageAtPreparationFinish: [value.aFinishedSubmitted, value.aFinishedCompleted, value.aFinishedPending],
        pageAtRequest: [value.aRequestSubmitted, value.aRequestCompleted, value.aRequestPending],
        pageAtPaint: [value.aPaintSubmitted, value.aPaintCompleted, value.aPaintPending] })) };
  },
};
