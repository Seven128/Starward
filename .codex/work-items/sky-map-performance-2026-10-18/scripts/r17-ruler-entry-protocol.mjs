// Optional task-only r5 extension. Old A1/v3 and terminal bytes retain meaning.
import { validateR17PhoneProbeMetrics as legacyMetrics, validateR17PhoneProbeTerminal as legacyTerminal,
  matchR17PhoneProbeTerminal as legacyMatch, R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES } from './r17-a-correlation-protocol.mjs';
export { R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES };
// Each entry begins [sequence, code, relativeMs, Date.now value, clock epoch,
// windowId]. null relativeMs means the shared wall clock cannot associate it.
// node return and nextTick explicitly do not signify physical presentation.
export const R17_RULER_ENTRY_EVENTS = {
  1: ['start'],
  2: ['props','owner','rowsVersion','rowCount','activeIndex','committedIndex','selectionReady','layoutReady','reducedMotion','scrollLeft','animated','firstRowAt','lastRowAt'],
  3: ['initialOffsetScheduled','owner','rowsVersion','positionRevision'],
  4: ['initialOffsetNextTick','owner','rowsVersion','positionRevision','current'],
  5: ['motionPhase','phase','active','present','ready','reducedMotion'],
  6: ['motionFinish','phase','active','ready'],
  7: ['measureScheduled','owner','queryId','rowsVersion'],
  8: ['measureNextTick','owner','queryId','rowsVersion','current'],
  9: ['measureResult','owner','queryId','rowsVersion','current','axisLeft','axisWidth','firstLeft','firstWidth','secondLeft','secondWidth','scrollLeft'],
  10: ['projection','owner','expectedRevision','revision','stepPx','zeroOffsetPx'],
  11: ['positionIndex','owner','rowsVersion','revision','index','afterNativeUpdate','visible','layoutReady','selectionReady','dragging'],
  12: ['setScrollLeft','owner','rowsVersion','revision','index','left'],
  13: ['moveGuard','owner','rowsVersion','expectedRevision','revision','rowsCurrent','visible','layoutReady','selectionReady','dragging'],
  14: ['nativeCancel','owner','revision'],
  15: ['nativeMoveRequested','owner','revision','left'],
  16: ['nativeNodeCallback','owner','expectedRevision','revision','node','scrollTo'],
  17: ['nativeScrollToRequested','owner','revision','left','animated'],
  18: ['nativeScrollToReturned','owner','revision'],
  19: ['onScrollBeforeGuard','owner','rowsVersion','revision','scrollLeft','disabled','dragging'],
  20: ['lifecycle','owner','boundary','rowsVersion','revision'],
  21: ['layoutAction','owner','action','revision','retainProjection','pending','needsMeasure'],
  22: ['initialOffsetResult','owner','rowsVersion','positionRevision','current','scrollLeft'],
  23: ['stop','reason'],
};
// phase: opening=1/open=2/closing=3/closed=4. boundary: gesture=1,
// layout-gate-or-rows=2, resize=3, hide=4, unmount=5, show=6,
// page-hide=8/page-unmount=9. layout action: retire=1/invalidate=2/measure=3.
const object = (v, keys) => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v,key));
const count = v => Number.isSafeInteger(v) && v >= 0 && v <= 1e12;
const scalar = v => v === null || typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER;
const wall = v => v === null || Number.isSafeInteger(v) && v >= 0;
const relative = v => v === null || count(v) && v <= 60000;
const budget = v => { try { return Buffer.byteLength(JSON.stringify(v),'utf8') <= R17_PHONE_PROBE_MAX_BYTES; } catch { return false; } };
const without = value => { const { rulerEntry, ...base } = value; return base; };
export function validateR17RulerEntryExtension(value, { schemaVersion = 'starward-r17-ruler-entry-v1',
  events = R17_RULER_ENTRY_EVENTS, phases = [1,2,3,4] } = {}) {
  const entry = value.rulerEntry;
  if (value.schemaVersion !== 'starward-r17-phone-probe-v3' || value.caseKey !== 'wide-time' || value.binding?.mode !== 'normal' ||
    !object(entry,['schemaVersion','collection','meaning','capacity','observed','dropped','overflow','exportOmitted','rejectedWindowEvents','start','entries']) ||
    entry.schemaVersion !== schemaVersion || entry.collection !== 'immediate-wide-time' ||
    entry.meaning !== 'requests-offsets-not-presentation' || entry.capacity !== 128 ||
    !['observed','dropped','exportOmitted','rejectedWindowEvents'].every(key => count(entry[key])) ||
    entry.overflow !== (entry.observed > 128) || entry.dropped !== Math.max(0,entry.observed - 128) ||
    !object(entry.start,['value','epoch','windowId']) || !wall(entry.start.value) || !count(entry.start.epoch) ||
    entry.start.windowId !== value.binding.windowId || !Array.isArray(entry.entries) || entry.entries.length > 128 ||
    entry.entries.length + entry.dropped + entry.exportOmitted !== entry.observed) return false;
  let previous = entry.dropped;
  return entry.entries.every(row => {
    if (!Array.isArray(row) || !count(row[0]) || row[0] !== previous + 1 || row[0] > entry.observed ||
      !Object.hasOwn(events,row[1]) || row.length !== 5 + events[row[1]].length ||
      !relative(row[2]) || !wall(row[3]) || !count(row[4]) || row[5] !== entry.start.windowId ||
      !row.slice(6).every(scalar)) return false;
    previous = row[0];
    const expectedRelative = row[3] !== null && entry.start.value !== null && row[4] === entry.start.epoch &&
      row[3] >= entry.start.value && row[3] - entry.start.value <= 60000 ? row[3] - entry.start.value : null;
    if (row[2] !== expectedRelative || row[2] !== null && row[2] > (value.controls?.sealRelativeMs ?? 60000)) return false;
    // Boolean, enum and identity domains are checked by field name. Rects and
    // supplied time/index values remain signed finite scalars or explicit null.
    const names = events[row[1]].slice(1);
    return names.every((name,index) => {
      const item = row[index + 6];
      if (['node','scrollTo'].includes(name)) return row[7] !== row[8] ? item === null : item === 0 || item === 1;
      if (['selectionReady','layoutReady','reducedMotion','animated','current','active','present','ready','afterNativeUpdate','visible','dragging','rowsCurrent','disabled','retainProjection','pending','needsMeasure'].includes(name)) return item === 0 || item === 1;
      if (['owner','rowsVersion','rowCount','positionRevision','queryId','expectedRevision','revision'].includes(name)) return count(item);
      if (name === 'phase') return phases.includes(item);
      if (name === 'boundary') return [1,2,3,4,5,6,8,9].includes(item);
      if (name === 'action') return [1,2,3].includes(item);
      if (name === 'reason') return [0,1].includes(item);
      return true;
    });
  });
}
export function validateR17PhoneProbeMetrics(value) {
  if (!value || typeof value !== 'object' || !budget(value)) return false;
  if (!Object.hasOwn(value,'rulerEntry')) return legacyMetrics(value);
  return validateR17RulerEntryExtension(value) && legacyMetrics(without(value));
}
export function validateR17PhoneProbeTerminal(value) { return legacyTerminal(value); }
export function matchR17PhoneProbeTerminal(metrics, terminal) {
  return validateR17PhoneProbeMetrics(metrics) && legacyMatch(Object.hasOwn(metrics,'rulerEntry') ? without(metrics) : metrics,terminal);
}
