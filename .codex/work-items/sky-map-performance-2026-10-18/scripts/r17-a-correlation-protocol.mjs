// Optional, explicitly versioned extension. The original v1/v2/v3 protocols
// and historical receipt bytes keep their original meanings.
import {
  validateR17PhoneProbeMetrics as legacyMetrics,
  validateR17PhoneProbeTerminal as legacyTerminal,
  matchR17PhoneProbeTerminal as legacyMatch,
  R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES,
} from './r17-phone-probe-v3-protocol.mjs';
export { R17_PHONE_PROBE_ROUTE, R17_PHONE_PROBE_MAX_BYTES };
const reasons = ['belowResolution','clockUnavailable','clockDiscontinuity','outOfRange','notObserved'];
const object = (v, keys) => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v,key));
const count = v => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= 1e12;
const optionalCount = v => v === null || count(v);
const relative = v => v === null || count(v) && v <= 60000;
const duration = v => count(v) && v >= 1 && v <= 60000;
const budget = v => { try { return Buffer.byteLength(JSON.stringify(v),'utf8') <= R17_PHONE_PROBE_MAX_BYTES; } catch { return false; } };
function phase(v, retained) {
  return object(v, ['observedCalls','validCalls','unknownCalls','unknown','knownSubtotalMs','minMs','maxMs','p50Ms','p95Ms']) &&
    ['observedCalls','validCalls','unknownCalls','knownSubtotalMs'].every(k => count(v[k])) &&
    v.observedCalls === retained && v.validCalls + v.unknownCalls === retained &&
    object(v.unknown,reasons) && reasons.every(k => count(v.unknown[k])) &&
    Object.values(v.unknown).reduce((sum,x) => sum+x,0) === v.unknownCalls &&
    (v.validCalls === 0 ? v.knownSubtotalMs === 0 && ['minMs','maxMs','p50Ms','p95Ms'].every(k => v[k] === null) :
      ['minMs','maxMs','p50Ms','p95Ms'].every(k => duration(v[k])) &&
      v.minMs <= v.p50Ms && v.p50Ms <= v.p95Ms && v.p95Ms <= v.maxMs && v.knownSubtotalMs >= v.maxMs);
}
function page(v) {
  return Array.isArray(v) && v.length === 3 && v.every(optionalCount) &&
    (v.every(x => x === null) || v.every(count));
}
function validExtension(value) {
  const a = value.aCorrelation, retained = value.linkage?.retainedPreparations;
  if (value.schemaVersion !== 'starward-r17-phone-probe-v3' || value.binding?.mode !== 'normal' ||
    !object(a,['schemaVersion','coverage','linkLimit','retainedPreparations','linkSampleTruncated','preparationToRequest','requestToPaint','links']) ||
    a.schemaVersion !== 'starward-r17-a-correlation-v1' || a.coverage !== 'retained-preparations' ||
    a.linkLimit !== 8 || a.retainedPreparations !== retained || a.linkSampleTruncated !== (retained > 8) ||
    !phase(a.preparationToRequest,retained) || !phase(a.requestToPaint,retained) ||
    !Array.isArray(a.links) || a.links.length !== Math.min(retained,8)) return false;
  const expected = value.linkage.links;
  const selected = expected.length <= 8 ? expected : [...expected.slice(0,4), ...expected.slice(-4)];
  return a.links.every((row,index) => {
    const linked = selected[index];
    return object(row,['prepareToken','firstRequestRelativeMs','firstRequestObserved','firstPaintObserved','pageAtPreparationFinish','pageAtRequest','pageAtPaint']) &&
      linked?.prepareToken === row.prepareToken && relative(row.firstRequestRelativeMs) &&
      row.firstRequestObserved === (linked.requests > 0) && row.firstPaintObserved === linked.consumed &&
      (row.firstRequestObserved || row.firstRequestRelativeMs === null) &&
      ['pageAtPreparationFinish','pageAtRequest','pageAtPaint'].every(k => page(row[k])) &&
      (row.firstRequestObserved || row.pageAtRequest.every(x => x === null)) &&
      (row.firstPaintObserved || row.pageAtPaint.every(x => x === null));
  });
}
function withoutExtension(value) { const { aCorrelation: _extension, ...base } = value; return base; }
export function validateR17PhoneProbeMetrics(value) {
  if (!value || typeof value !== 'object' || !budget(value)) return false;
  if (!Object.hasOwn(value,'aCorrelation')) return legacyMetrics(value);
  return legacyMetrics(withoutExtension(value)) && validExtension(value);
}
export function validateR17PhoneProbeTerminal(value) { return legacyTerminal(value); }
export function matchR17PhoneProbeTerminal(metrics, terminal) {
  if (!validateR17PhoneProbeMetrics(metrics)) return false;
  return legacyMatch(Object.hasOwn(metrics,'aCorrelation') ? withoutExtension(metrics) : metrics,terminal);
}
