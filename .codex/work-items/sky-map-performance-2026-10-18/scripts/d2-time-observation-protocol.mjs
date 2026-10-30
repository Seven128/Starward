// Explicit current-time schema. Historical v3/manual/A1 bytes keep their rules.
import { validateR17TimeObservationCore, R17_PHONE_PROBE_MAX_BYTES } from './r17-phone-probe-v3-protocol.mjs';
import { validateR17GeometryStages } from './r17-normal-input-protocol.mjs';
export const D2_TIME_OBSERVATION_SCHEMA = 'starward-d2-time-observation-v1';
export const D2_TIME_EVENTS = {
  1: 'legalPreviewReturned', 2: 'preparationFinished', 3: 'frameRequested', 4: 'copyAndPublishReturned',
  5: 'editingStatePublished', 6: 'originalPresentationGuardRejected', 7: 'geometryOwner', 8: 'scopeRetired',
};
// Row: order,event,relativeWallMs,clockEpoch,inputSeq,intentSeq,prepareToken,
// presentationScope,timeGeneration,canvasGeneration,targetUtcMs,frameUtcMs,
// editingGeneration (geometry: actual request serial),detail,currentTimeGeneration.
// UTC instants are chosen/rendered sky times, never the device wall-clock epoch.
const object = (v, keys) => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v,key));
const count = v => Number.isSafeInteger(v) && v >= 0 && v <= 1e12;
const id = v => count(v) && v > 0;
const optional = (v, valid) => v === null || valid(v);
const utc = v => Number.isSafeInteger(v) && Math.abs(v) <= 8.64e15;
export function validateD2TimeObservation(value) {
  try {
    if (Buffer.byteLength(JSON.stringify(value), 'utf8') > R17_PHONE_PROBE_MAX_BYTES ||
      !object(value, ['schemaVersion','variant','runId','binding','clock','window','linkage','acceptedGap','coverage','timeChain','geometryStages']) ||
      value.schemaVersion !== D2_TIME_OBSERVATION_SCHEMA ||
      value.coverage !== 'legal-preview-input-preparation-request-copy-and-publish-not-pixels-cpu-or-resource-population') return false;
    const { schemaVersion, coverage, timeChain: chain, geometryStages, ...core } = value;
    if (!validateR17TimeObservationCore(core) || !validateR17GeometryStages(geometryStages) ||
      !object(chain, ['schemaVersion','capacity','identityLimit','inputCount','observed','dropped','exportOmitted','overflow','invalid','identityRotations','violations','entries']) ||
      chain.schemaVersion !== 'starward-d2-time-chain-v1' || chain.capacity !== 256 || chain.identityLimit !== 256 ||
      !['inputCount','observed','dropped','exportOmitted','invalid','identityRotations'].every(k => count(chain[k])) ||
      chain.inputCount < 1 || chain.dropped !== Math.max(0, chain.observed - 256) || chain.overflow !== (chain.observed > 256) ||
      !Array.isArray(chain.entries) || chain.entries.length + chain.exportOmitted !== Math.min(chain.observed, 256) ||
      !object(chain.violations, ['scope','timeGeneration','canvasGeneration','bounds','backwards','unlinked']) ||
      !Object.values(chain.violations).every(count)) return false;
    let prior = 0;
    const inputs = new Set();
    return chain.entries.every(row => {
      if (!Array.isArray(row) || row.length !== 15 || !id(row[0]) || row[0] <= prior || row[0] > chain.observed ||
        !Object.hasOwn(D2_TIME_EVENTS, row[1]) || !optional(row[2], n => count(n) && n <= 60000) || !count(row[3]) ||
        ![4,5,6,7].every(i => optional(row[i], id)) || row[4] > chain.inputCount ||
        ![8,9,12,14].every(i => optional(row[i], count)) || ![10,11].every(i => optional(row[i], utc)) || !count(row[13])) return false;
      prior = row[0];
      const event = row[1], detail = row[13];
      if (event === 1) {
        if (!id(row[4]) || inputs.has(row[4]) || ![0,1,2].includes(detail) || row[10] === null) return false;
        inputs.add(row[4]);
      }
      if (event === 2 && (!id(row[6]) || ![0,1].includes(detail))) return false;
      if (event === 3 && detail !== 0 || event === 4 && ![0,1].includes(detail) || event === 5 && detail > 3 ||
        event === 6 && ![1,2,3,4].includes(detail) || event === 7 && ![0,1,2,3].includes(detail) || event === 8 && ![1,2].includes(detail)) return false;
      return true;
    });
  } catch { return false; }
}
