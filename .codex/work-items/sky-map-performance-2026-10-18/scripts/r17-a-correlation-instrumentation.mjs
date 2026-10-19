// Pure task-local materialization. It does not write/build/deliver a candidate.
// Historical v3 templates and their existing manifests remain unchanged.
function one(source, before, after) {
  if (source.split(before).length !== 2) throw Error('a_correlation_boundary_changed:' + before.slice(0, 60));
  return source.replace(before, after);
}
export function addR17ACorrelation({ runtime, pageObserver }) {
  runtime = 'import { r17ACorrelation, type R17APreparation } from "./r17-a-correlation-runtime";\n' + runtime;
  runtime = one(runtime, 'type Preparation = {', 'type Preparation = R17APreparation & {');
  runtime = one(runtime, 'function now(): Stamp {', 'function readClockValue(): number | null {');
  runtime = one(runtime, '  return { value, epoch: clockEpoch, windowId: sequence };\n}',
    '  return value;\n}\nfunction now(): Stamp {\n  const value = readClockValue();\n  return { value, epoch: clockEpoch, windowId: sequence };\n}');
  runtime = one(runtime, 'function relative(at = now()): number | null {',
    'function relative(at = now()): number | null { return relativeRaw(at.value, at.epoch, at.windowId); }\n' +
    'function relativeRaw(value: number | null, epoch: number, windowId: number): number | null {\n' +
    '  const at = { value, epoch, windowId };');
  // The public relativeRaw above would allocate. Keep the new request path
  // scalar-only while retaining exactly the original relative-time checks.
  runtime = one(runtime, '  const at = { value, epoch, windowId };\n  if (!runId || at.value === null || armedAt.value === null || at.windowId !== armedAt.windowId || at.epoch !== armedAt.epoch) return null;\n  const value = at.value - armedAt.value;\n  return Number.isFinite(value) && value >= 0 && value <= 60000 ? value : null;',
    '  if (!runId || value === null || armedAt.value === null || windowId !== armedAt.windowId || epoch !== armedAt.epoch) return null;\n' +
    '  const elapsed = value - armedAt.value;\n  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 60000 ? elapsed : null;');
  runtime = one(runtime, '    binding = { ...configuration, windowId: sequence }; armedAt = now();',
    '    r17ACorrelation.start(configuration.mode === "normal");\n    binding = { ...configuration, windowId: sequence }; armedAt = now();');
  runtime = one(runtime, '    const input = source as Record<string, unknown>;',
    '    const input = source as Record<string, unknown>;\n    if (owner === "page") r17ACorrelation.pageState(input.submitted, input.completed, input.pending, input.available);');
  runtime = one(runtime, '  measure<T>(stage: Stage, work: () => T, after?: (result: T) => void): T {',
    '  pageState(submitted: number, completed: number, pending: number, available: number) {\n' +
    '    if ((active || armed) && !sealed) r17ACorrelation.pageState(submitted, completed, pending, available);\n  },\n' +
    '  measure<T>(stage: Stage, work: () => T, after?: (result: T) => void): T {');
  runtime = one(runtime, '      requests: 0, paints: 0, consumed: null, used: false, accepted: null, acceptedOnce: false, synthetic: 0, duplicates: 0 };',
    '      aFinishedValue: null, aFinishedEpoch: 0, aFinishedRun: 0,\n' +
    '      aRequestValue: null, aRequestEpoch: 0, aRequestRun: 0, aRequestRelativeMs: null, aRequestObserved: false,\n' +
    '      aPaintValue: null, aPaintEpoch: 0, aPaintRun: 0, aPaintObserved: false,\n' +
    '      aFinishedSubmitted: null, aFinishedCompleted: null, aFinishedPending: null,\n' +
    '      aRequestSubmitted: null, aRequestCompleted: null, aRequestPending: null,\n' +
    '      aPaintSubmitted: null, aPaintCompleted: null, aPaintPending: null,\n' +
    '      requests: 0, paints: 0, consumed: null, used: false, accepted: null, acceptedOnce: false, synthetic: 0, duplicates: 0 };');
  runtime = one(runtime, '    const stamp = now(); value.finished = relative(stamp); value.completed = completed;',
    '    const stamp = now(); value.finished = relative(stamp); value.completed = completed;\n    r17ACorrelation.finished(value, stamp);');
  runtime = one(runtime, '    links.requests = add(links.requests);',
    '    if (preparation && !preparation.aRequestObserved) {\n      const value = readClockValue();\n' +
    '      r17ACorrelation.requested(preparation, value, clockEpoch, binding.windowId, relativeRaw(value, clockEpoch, binding.windowId));\n    }\n' +
    '    links.requests = add(links.requests);');
  runtime = one(runtime, '    const value = getPreparation(facts.token); if (value) { value.paints',
    '    const value = getPreparation(facts.token); if (value) { r17ACorrelation.painted(value, facts.attempt); value.paints');
  runtime = one(runtime, 'linkage: summarizeLinks() };',
    'linkage: summarizeLinks(), ...(binding.mode === "normal" ? { aCorrelation: r17ACorrelation.snapshot(prepareRing.filter((value): value is Preparation => Boolean(value)).sort((a, b) => a.id - b.id)) } : {}) };');
  pageObserver = 'import { r17Probe } from "./r17-phone-probe-runtime";\n' + pageObserver;
  pageObserver = one(pageObserver, '    try { return original.apply(this, args); }',
    '    r17Probe.pageState(state.submitted, state.completed, state.pending, state.available);\n    try { return original.apply(this, args); }');
  pageObserver = one(pageObserver, '        // Preserve every invocation, callback receiver, arguments, return and throw.',
    '        r17Probe.pageState(state.submitted, state.completed, state.pending, state.available);\n        // Preserve every invocation, callback receiver, arguments, return and throw.');
  pageObserver = one(pageObserver, '      throw error;',
    '      r17Probe.pageState(state.submitted, state.completed, state.pending, state.available);\n      throw error;');
  pageObserver = one(pageObserver, '    installed = false; state.available = 0; state.sampling = false;',
    '    installed = false; state.available = 0; state.sampling = false;\n    r17Probe.pageState(state.submitted, state.completed, state.pending, state.available);');
  return { runtime, pageObserver };
}
