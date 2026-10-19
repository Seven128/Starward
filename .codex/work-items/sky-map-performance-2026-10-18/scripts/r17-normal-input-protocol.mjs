// Finite r6 dispatcher. Historical v1/v2/v3/A1/r5 receipts keep their bytes.
import { validateR17PhoneProbeMetrics as priorMetrics, validateR17PhoneProbeTerminal as priorTerminal,
  matchR17PhoneProbeTerminal as priorMatch, validateR17RulerEntryExtension, R17_RULER_ENTRY_EVENTS,
  R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES } from './r17-ruler-entry-protocol.mjs';
import { validateR17PhoneProbeMetrics as a1Metrics } from './r17-a-correlation-protocol.mjs';
export { R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES };
export const R17_MANUAL_INPUT_SCHEMA = 'starward-r17-phone-probe-v3-manual-input';
export const R17_RULER_ENTRY_V2_EVENTS = {
  ...Object.fromEntries(Object.entries(R17_RULER_ENTRY_EVENTS).filter(([code]) => ![2,3,4,12,22].includes(Number(code)))),
  15: ['nativeMoveRequested','owner','revision','left','animated'],
  24: ['props','owner','rowsVersion','rowCount','activeIndex','committedIndex','selectionReady','layoutReady','preparing','alignedRowsCurrent','alignmentRequired','ticksVisible','positionFailed','reducedMotion','firstRowAt','lastRowAt'],
  25: ['positionTarget','owner','rowsVersion','revision','index','left','verify','measured','nativeRowsCurrent'],
  26: ['positionObservedBeforeGuard','owner','rowsVersion','revision','pendingRevision','pendingIndex','rowsCurrent','nativeRowsCurrent','visible','selectionReady','interactionAllowed','dragging','left','finished'],
  27: ['alignmentAdmitted','owner','rowsVersion','revision','index','left'],
  28: ['alignmentUnavailable','owner','rowsVersion','revision','index','left','finished'],
  29: ['pendingReadRequested','owner','rowsVersion','revision','index','finished'],
  30: ['pendingReadReturned','owner','rowsVersion','revision','current','left'],
  31: ['nativeOffsetReadRequested','owner','expectedRevision','revision','retry'],
  32: ['nativeOffsetReadReturned','owner','expectedRevision','revision','current','left'],
};
const object = (v, keys) => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v,key));
const count = v => Number.isSafeInteger(v) && v >= 0 && v <= 1e12;
const budget = v => { try { return Buffer.byteLength(JSON.stringify(v),'utf8') <= R17_PHONE_PROBE_MAX_BYTES; } catch { return false; } };
const withoutEntry = value => { const { rulerEntry, ...base } = value; return base; };
function rulerV2(value) {
  if (!validateR17RulerEntryExtension(value, { schemaVersion: 'starward-r17-ruler-entry-v2', events: R17_RULER_ENTRY_V2_EVENTS, phases: [1,2,3,4,5] })) return false;
  const booleans = ['preparing','alignedRowsCurrent','alignmentRequired','ticksVisible','positionFailed','verify','measured','nativeRowsCurrent','interactionAllowed','finished','retry'];
  return value.rulerEntry.entries.every(row => R17_RULER_ENTRY_V2_EVENTS[row[1]].slice(1).every((name,index) => {
    const item = row[index+6];
    if (booleans.includes(name)) return item === 0 || item === 1;
    if (name === 'pendingRevision') return item === null || count(item);
    return true;
  }));
}
function manual(value) {
  if (value.schemaVersion !== R17_MANUAL_INPUT_SCHEMA || value.caseKey !== 'manual-input' || value.binding?.mode !== 'normal' ||
    value.window?.startDelayMs !== 0 || ![null,0].includes(value.controls?.recordingStartRelativeMs) ||
    Object.hasOwn(value,'rulerEntry') || !Object.hasOwn(value,'aCorrelation') ||
    !object(value.manualInput,['schemaVersion','trigger','boundary']) ||
    value.manualInput.schemaVersion !== 'starward-r17-manual-input-v1' || ![1,2].includes(value.manualInput.trigger) ||
    value.manualInput.boundary !== 'legal-onPreview-before-preview-intent' ||
    !['actualPlay','pauseAttempt','pauseSuccess','terminalExport'].every(key => value.controls?.events?.[key]?.calls === 0)) return false;
  // Validation-only reuse of unchanged scalar/Scene/linkage rules. This copy
  // is never emitted, persisted or interpreted as a delayed historical run.
  const { manualInput: _input, ...base } = value;
  return a1Metrics({ ...base, schemaVersion: 'starward-r17-phone-probe-v3', caseKey: 'wide-time',
    window: { ...base.window, startDelayMs: 1000 } });
}
export function validateR17PhoneProbeMetrics(value) {
  if (!value || typeof value !== 'object' || !budget(value)) return false;
  if (value.schemaVersion === R17_MANUAL_INPUT_SCHEMA) return manual(value);
  if (value.rulerEntry?.schemaVersion === 'starward-r17-ruler-entry-v2') return rulerV2(value) && a1Metrics(withoutEntry(value));
  return priorMetrics(value);
}
export function validateR17PhoneProbeTerminal(value) { return priorTerminal(value); }
export function matchR17PhoneProbeTerminal(metrics, terminal) {
  if (!validateR17PhoneProbeMetrics(metrics) || metrics.schemaVersion === R17_MANUAL_INPUT_SCHEMA) return false;
  return priorMatch(metrics.rulerEntry?.schemaVersion === 'starward-r17-ruler-entry-v2' ? withoutEntry(metrics) : metrics,terminal);
}
