import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Planning assumptions, not measured usage or a supplier quotation.
// GB below is a decimal-equivalent budgeting unit. Reconcile COS metering
// units and account-level discounts/free allowances against the actual bill.
const assumptions = {
  date: '2026-09-22', currency: 'CNY', days: 30,
  storageBudgetGB: 500, storagePerGBMonth: 0.118,
  byteCacheHit: 0.9, requestCacheHit: 0.9,
  averageResponseBytes: 64000,
  cosOriginPerGB: 0.15, cosReadPer10000: 0.01,
  httpsPer10000: 0.05, httpsFreeRequestsRemaining: 3000000,
  existingAccountCdnGB: 0,
  sources: {
    cdn: 'https://cloud.tencent.com/document/product/228/75562',
    https: 'https://cloud.tencent.com/document/product/228/75563',
    cos: 'https://cloud.tencent.com/document/product/436/6241',
    cosStorage: 'https://cloud.tencent.com/document/product/436/50201'
  }
};

function cdnCharge(gb) {
  let remaining = gb, total = 0;
  for (const [width, rate] of [[2000, .21], [8000, .20], [40000, .18], [50000, .15], [Infinity, .11]]) {
    const used = Math.min(remaining, width);
    total += used * rate;
    remaining -= used;
    if (remaining <= 0) break;
  }
  return total;
}

function estimate(skyDau, newMBPerUserDay, overrides = {}) {
  const p = { ...assumptions, ...overrides };
  const bytes = skyDau * p.days * newMBPerUserDay * 1e6;
  const cdnGB = bytes / 1e9;
  const requests = bytes / p.averageResponseBytes;
  const storage = p.storageBudgetGB * p.storagePerGBMonth;
  const cdn = cdnCharge(p.existingAccountCdnGB + cdnGB) - cdnCharge(p.existingAccountCdnGB);
  const origin = cdnGB * (1 - p.byteCacheHit) * p.cosOriginPerGB;
  const https = Math.max(0, requests - p.httpsFreeRequestsRemaining) / 10000 * p.httpsPer10000;
  const cosReads = requests * (1 - p.requestCacheHit) / 10000 * p.cosReadPer10000;
  return { skyDau, newMBPerUserDay, cdnGB, requests, storage, cdn, origin, https, cosReads,
    monthlyCny: storage + cdn + origin + https + cosReads };
}

const scenarios = [100, 500, 1000, 10000].flatMap(dau => [10, 30, 100].map(mb => estimate(dau, mb)));
// Fresh task-level planning estimates for one agent-led development stream.
// These are NOT human-hours divided by an assumed AI productivity multiplier.
// No hourly/day-rate monetary conversion is applied to agent or human effort.
const work = [
  { responsibility: 'runtime_and_rendering', stellariumNative: [16, 40], extendCurrent: [24, 56] },
  { responsibility: 'visuals_and_controls', stellariumNative: [12, 28], extendCurrent: [48, 96] },
  { responsibility: 'data_search_details', stellariumNative: [20, 40], extendCurrent: [24, 48] },
  { responsibility: 'miniapp_product_integration', stellariumNative: [12, 24], extendCurrent: [12, 24] },
  { responsibility: 'dynamic_objects', stellariumNative: [12, 24], extendCurrent: [24, 48] },
  { responsibility: 'device_quality_and_recovery', stellariumNative: [24, 56], extendCurrent: [32, 72] }
];
const sumWork = key => [0, 1].map(i => work.reduce((sum, row) => sum + row[key][i], 0));
const addRange = (a, b) => a.map((n, i) => n + b[i]);
const nativeBase = sumWork('stellariumNative');
const customBase = sumWork('extendCurrent');
const agentWork = {
  unit: 'active_agent_hours', hoursPerPlanningDay: 8,
  estimateConfidence: 'low; uncalibrated against a native prototype',
  work, nativeBase, customBase,
  commercialNative: addRange(nativeBase, [4, 8]),
  agplNative: addRange(nativeBase, [8, 16]),
  extendCurrent: addRange(customBase, [4, 8]),
  conditionalRawDataPipelineExtra: [32, 80],
  nativeFeasibilityTrialIncludedIfReused: [8, 16],
  monthlyMaintenance: { stellariumNative: [4, 12], extendCurrent: [6, 16] },
  agplSourceDeliveryPerRelevantRelease: [1, 3],
  projectOwnerParticipationHours: {
    commercialNative: [6, 12], agplNative: [8, 16], extendCurrent: [8, 16]
  },
  notes: [
    'One primary agent stream; no parallel-agent speedup is assumed or authorized by this estimate.',
    'Active time includes investigation, editing, builds, automated checks, debugging and repairs.',
    'Elapsed time also depends on account limits, downloads, data generation, devices and supplier replies.',
    'Project owner time covers device assistance, visual acceptance and decisions, not external legal services.',
    'No completed agent benchmark supports a fixed AI speedup or a guaranteed completion deadline.',
    'Base assumes lawful complete datasets in usable formats, not the small repository sample.',
    'Agent platform cash spend is actual incremental subscription/API/credit spend, not hours times a rate.',
    'Web-view and hosted-site embedding are excluded by the user.'
  ]
};
const baseline = estimate(1000, 30);
const sensitivity = {
  baseline,
  noHttpsFreeAllowance: estimate(1000, 30, { httpsFreeRequestsRemaining: 0 }),
  lowerByteAndRequestHit: estimate(1000, 30, { byteCacheHit: .5, requestCacheHit: .5 }),
  smallerResponses: estimate(1000, 30, { averageResponseBytes: 16000 }),
  largerStorage: estimate(1000, 30, { storageBudgetGB: 2000 })
};
const annualCash = {
  operatingMonths: 12,
  storageAndDeliveryOnly: [100, 500, 1000, 10000].map(skyDau => ({
    skyDau, newMBPerUserDay: 30, annualCny: estimate(skyDau, 30).monthlyCny * 12
  })),
  unknownCostsAreNotZero: {
    L: 'First-year commercial engine licence including any recurring fee; route A only.',
    D: 'First-year dataset and/or hosted API rights; may differ between routes.',
    X: 'Incremental build/data processing compute, service capacity, required external services and other setup spend.',
    A: 'Actual incremental agent subscription, credits or API charges; no token forecast available.'
  },
  formulas: {
    commercialNative: 'storageAndDelivery + L + D_A + X_A + A_A',
    agplNative: 'storageAndDelivery + D_B + X_B + A_B',
    extendCurrent: 'storageAndDelivery + D_C + X_C + A_C'
  },
  nonCashCost: 'Core-source openness and business impact are recorded separately, never assigned a guessed CNY value.'
};
const result = { assumptions, agentWork, annualCash, scenarios, sensitivity };
const target = name => fileURLToPath(new URL(name, import.meta.url));
writeFileSync(target('cost-model.json'), JSON.stringify(result, null, 2) + '\n');
const columns = Object.keys(scenarios[0]);
writeFileSync(target('monthly-scenarios.csv'), columns.join(',') + '\n' + scenarios.map(row =>
  columns.map(key => Number.isInteger(row[key]) ? row[key] : row[key].toFixed(4)).join(',')).join('\n') + '\n');
console.log(JSON.stringify({ agentWork: { unit: agentWork.unit, nativeBase, customBase,
  commercialNative: agentWork.commercialNative, agplNative: agentWork.agplNative,
  extendCurrent: agentWork.extendCurrent }, annualCash: annualCash.storageAndDeliveryOnly,
  scenarios: scenarios.map(({skyDau, newMBPerUserDay, monthlyCny}) => ({skyDau, newMBPerUserDay, monthlyCny: Math.round(monthlyCny)})),
  sensitivity: Object.fromEntries(Object.entries(sensitivity).map(([key, row]) => [key, Number(row.monthlyCny.toFixed(2))])) }, null, 2));
