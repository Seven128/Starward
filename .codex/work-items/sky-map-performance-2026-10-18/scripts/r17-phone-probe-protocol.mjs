// Collector-side allowlist for the task-only Android comparison probe.
export const R17_PHONE_PROBE_ROUTE = '/__development_r17_phone_probe_metrics';
export const R17_PHONE_PROBE_MAX_BYTES = 32768;
const stageNames = ['presentation','base','selection','supplement','constellations','draw','nativePaintOwner','displayCopy','publishAccepted'];
const counterNames = ['timeIntentPublications','preparedRequests','paintAttempts','nativeCallbacks','acceptedCopies','sceneFinishes','glDrawSubmissions','bscSubmittedStars','saoSubmittedStars','acceptedBscObjects','acceptedSaoObjects','failedFrames','invalidations'];
const object = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
const number = (value, minimum=0, maximum=1e12) => typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
const nullableNumber = value => value === null || number(value,-1e12,1e12);
const counts = (value, keys) => object(value,keys) && keys.every(key => Number.isSafeInteger(value[key]) && number(value[key]));
const samples = value => object(value,['calls','totalMs','minMs','maxMs','keptSamples','p50Ms','p95Ms','overflow']) &&
  counts({calls:value.calls,keptSamples:value.keptSamples},['calls','keptSamples']) && value.keptSamples <= 2048 &&
  ['totalMs','minMs','maxMs','p50Ms','p95Ms'].every(key => number(value[key])) && typeof value.overflow === 'boolean';
const time = value => object(value,['events','distinct','firstRelativeMs','lastRelativeMs','minRelativeMs','maxRelativeMs','overflow']) &&
  counts({events:value.events,distinct:value.distinct},['events','distinct']) && value.distinct <= 2048 &&
  ['firstRelativeMs','lastRelativeMs','minRelativeMs','maxRelativeMs'].every(key => nullableNumber(value[key])) && typeof value.overflow === 'boolean';
const identifiers = value => Array.isArray(value) && value.length <= 8 && value.every(item => typeof item === 'string' && /^[A-Za-z0-9_.:+/-]{1,160}$/.test(item));
export function validateR17PhoneProbeMetrics(value) {
  if (Buffer.byteLength(JSON.stringify(value),'utf8') > R17_PHONE_PROBE_MAX_BYTES) return false;
  if (!object(value,['schemaVersion','variant','runId','caseKey','clock','window','sampleLimit','counters','cpu','timing','time','scene','viewport'])) return false;
  if (value.schemaVersion !== 'starward-r17-phone-probe-v1' || !['baseline','candidate'].includes(value.variant) ||
      !/^r17-[1-9][0-9]{0,5}-[a-z0-9]{1,12}$/.test(value.runId) ||
      !/^(wide|narrow)-(camera|time|play)$/.test(value.caseKey) || !['performance.now','Date.now'].includes(value.clock) || value.sampleLimit !== 2048) return false;
  if (!object(value.window,['startDelayMs','durationLimitMs','elapsedMs','reason']) || value.window.startDelayMs !== 1000 ||
      value.window.durationLimitMs !== 45000 || !number(value.window.elapsedMs,0,60000) || !['limit','manual'].includes(value.window.reason)) return false;
  if (!counts(value.counters,counterNames) || !object(value.cpu,stageNames) || !stageNames.every(key => samples(value.cpu[key]))) return false;
  if (!object(value.timing,['nativeCallbackMs','acceptedGapMs','intentToAcceptedWallMs']) || !Object.values(value.timing).every(samples)) return false;
  if (!object(value.time,['intent','prepared','painted','accepted','lastRequestedMinusAcceptedMs','maximumRequestedMinusAcceptedMs']) ||
      !['intent','prepared','painted','accepted'].every(key => time(value.time[key])) || !nullableNumber(value.time.lastRequestedMinusAcceptedMs) || !nullableNumber(value.time.maximumRequestedMinusAcceptedMs)) return false;
  if (!object(value.scene,['baseRowsMin','baseRowsMax','saoRowsMin','saoRowsMax','selectedTilesMin','selectedTilesMax','catalogVersions','saoPublicationHashes','modelAlgorithms','modes']) ||
      !['baseRowsMin','baseRowsMax','saoRowsMin','saoRowsMax','selectedTilesMin','selectedTilesMax'].every(key => Number.isSafeInteger(value.scene[key]) && number(value.scene[key])) ||
      !['catalogVersions','saoPublicationHashes','modelAlgorithms','modes'].every(key => identifiers(value.scene[key]))) return false;
  if (!object(value.viewport,['widthMin','widthMax','heightMin','heightMax','fovMin','fovMax']) || !Object.values(value.viewport).every(item => number(item,0,10000))) return false;
  return true;
}
