// Task-only extension. The enclosing dispatcher retains the whole-message
// budget and historical metrics/terminal contracts; this module has no cycle
// back to that dispatcher and never converts a receipt for storage.
export const R28_FIRST_ACCEPTED_COSTS_SCHEMA = 'starward-r28-phone-probe-first-accepted-costs-v1';

const LIMIT = 1e12, CAPACITY = 8, IDENTITY_LIMIT = 256;
const STAGES = ['nativePaintOwner','draw','bscTraversal','saoTraversal','rendererSubmit',
  'displayCopy','publishAccepted','nativeCallback'];
const COUNTERS = ['paints','firstAccepted','missingFirstAccepted','evictedRows','identityRotations',
  'unboundCosts','nestedScopes','invalidIntervals','invalidIdentities','duplicateAccepted'];
const object = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= LIMIT;
const id = value => count(value) && value > 0;
const tuple = (value, length) => Array.isArray(value) && value.length === length;

// [observed, valid, known subtotal, five explicit unknown counts, threw].
// A zero observed count means no observation. Unknown-only and wholly absent
// stages cannot acquire invented elapsed cost, including a fabricated zero.
function cost(value) {
  if (!tuple(value, 5) || ![value[0], value[1], value[2], value[4]].every(count) ||
      !tuple(value[3], 5) || !value[3].every(count)) return false;
  const [observed, valid, known, unknown, threw] = value;
  return observed === valid + unknown.reduce((sum, item) => sum + item, 0) && threw <= observed &&
    (valid === 0 ? known === 0 : known >= valid && known <= 60000 * valid);
}

export function validateR28FirstAcceptedCosts(value) {
  if (value?.schemaVersion !== R28_FIRST_ACCEPTED_COSTS_SCHEMA) return false;
  const extension = value.firstAcceptedCosts;
  if (!object(extension, ['schemaVersion','metricsSchema','meaning','nesting','capacity','identityLimit','stages','counters','rows']) ||
      extension.schemaVersion !== 'starward-r28-first-accepted-costs-v1' ||
      extension.metricsSchema !== 'starward-r20-phone-probe-draw-costs-v1' ||
      extension.meaning !== 'existing-inclusive-wall-spans-at-first-accepted-identity-not-cpu-gpu-or-pixels' ||
      extension.nesting !== 'submit-may-overlap-traversals-and-draw-native-owner-encloses-sync-paint-do-not-add' ||
      extension.capacity !== CAPACITY || extension.identityLimit !== IDENTITY_LIMIT ||
      !tuple(extension.stages, STAGES.length) || !extension.stages.every((stage, index) => stage === STAGES[index]) ||
      !object(extension.counters, COUNTERS) || !COUNTERS.every(key => count(extension.counters[key])) ||
      !Array.isArray(extension.rows)) return false;

  const { counters, rows } = extension;
  const available = counters.firstAccepted - counters.missingFirstAccepted;
  if (available < 0 || rows.length !== Math.min(CAPACITY, available) ||
      counters.evictedRows !== Math.max(0, available - CAPACITY) ||
      rows.length + counters.evictedRows + counters.missingFirstAccepted !== counters.firstAccepted ||
      counters.firstAccepted !== value.linkage?.firstAcceptedIntents ||
      !count(value.counters?.paintAttempts) || counters.paints > value.counters.paintAttempts) return false;

  const intents = new Set(), preparations = new Set(), paints = new Set();
  let priorOrder = 0;
  for (const row of rows) {
    if (!object(row, ['order','intentSequence','prepareToken','canvasOwner','canvasGeneration','paintOrdinal',
      'superseded','scopeAmbiguous','costs','cache']) ||
        !['order','intentSequence','prepareToken','canvasOwner','paintOrdinal'].every(key => id(row[key])) ||
        !count(row.canvasGeneration) || row.order <= priorOrder || row.order <= counters.evictedRows || row.order > counters.firstAccepted ||
        row.paintOrdinal > counters.paints || typeof row.superseded !== 'boolean' || typeof row.scopeAmbiguous !== 'boolean' ||
        row.scopeAmbiguous && counters.nestedScopes === 0 ||
        !tuple(row.costs, STAGES.length) || !row.costs.every(cost) ||
        !object(row.cache, ['bsc','sao']) || !['bsc','sao'].every(key => tuple(row.cache[key], 3) && row.cache[key].every(count)) ||
        intents.has(row.intentSequence) || preparations.has(row.prepareToken) || paints.has(row.paintOrdinal)) return false;

    // The original linkage ring can be trimmed or expire an intent. Require
    // consistency only where that original preparation is still exported;
    // absence is not a made-up match or proof of full linkage coverage.
    const link = Array.isArray(value.linkage.links)
      ? value.linkage.links.find(item => item?.prepareToken === row.prepareToken) : undefined;
    if (link && (link.intentSequence !== row.intentSequence || link.firstAcceptedObserved !== true ||
        link.intentFirstAcceptedObserved === false ||
        typeof link.intentSuperseded === 'boolean' && link.intentSuperseded !== row.superseded)) return false;
    intents.add(row.intentSequence); preparations.add(row.prepareToken); paints.add(row.paintOrdinal);
    priorOrder = row.order;
  }
  return true;
}

export function withoutR28FirstAcceptedCosts(value) {
  const { firstAcceptedCosts, ...base } = value;
  return { ...base, schemaVersion: firstAcceptedCosts.metricsSchema };
}
