export const platformBoundary = {
  productPurpose: "stargazing-decision-and-field-execution",
  primaryProduct: "react-native-ios-android",
  auxiliaryPlatforms: [
    { id: "pwa", allowedCapabilities: ["historical-validation"], canSatisfyFinalGate: false },
    { id: "mini-program", allowedCapabilities: ["share", "light-query", "invite"], canSatisfyFinalGate: false },
  ],
  mvpExcludedCapabilities: ["general-feed", "followers", "direct-messages", "full-navigation", "full-ar", "precision-composition", "device-control"],
  releasePhases: ["foundation", "data", "decision", "closed-loop", "professional-ecosystem"].map((id) => ({ id })),
} as const;

export interface PermissionStates {
  preciseLocation: "granted" | "denied" | "undetermined";
  backgroundLocation: "granted" | "denied" | "undetermined";
  camera: "granted" | "denied" | "undetermined";
  notifications: "granted" | "denied" | "undetermined";
}

export function resolvePermissionFallbacks(states: PermissionStates) {
  return {
    manualLocation: states.preciseLocation !== "granted",
    staticSky: states.camera !== "granted",
    foregroundTimer: states.backgroundLocation !== "granted",
    localSettings: states.notifications !== "granted",
    repeatPrompts: false,
    transmittedPreciseLocation: states.preciseLocation === "granted",
  };
}

export function classifyReleaseScope(input: { proposals: string[] }) {
  const deferredIds = new Set<string>(["v3-ar", "mini-program-share"]);
  const deferrable = input.proposals.filter((item) => deferredIds.has(item));
  return {
    requiredNow: input.proposals.filter((item) => !deferrable.includes(item)),
    deferrable,
    finalProduct: platformBoundary.primaryProduct,
  };
}

const providerGates = ["provenance", "quality", "stability", "commercial-license", "safe-degradation"] as const;

export function selectQualifiedProvider(input: { candidates: Array<{ id: string; productionEnabled?: boolean; passedGates?: string[]; tco12Month?: { totalCny?: number } }> }) {
  const qualified = input.candidates.filter((candidate) => candidate.productionEnabled === true || providerGates.every((gate) => candidate.passedGates?.includes(gate)));
  if (!qualified.length) return { status: "blocked", reason: "no-provider-passed-all-production-gates" };
  const selected = [...qualified].sort((left, right) => (left.tco12Month?.totalCny ?? Number.POSITIVE_INFINITY) - (right.tco12Month?.totalCny ?? Number.POSITIVE_INFINITY))[0];
  return { status: "selected", providerId: selected.id, basis: "qualified-lowest-12m-tco", tco12Month: selected.tco12Month };
}

export function updateDecisionContext(input: { current: { revision: number; spotId: string; instant: string }; change: { spotId: string; instant: string }; consumers: string[] }) {
  const revision = input.current.revision + 1;
  return {
    ...input.current,
    ...input.change,
    revision,
    consumers: input.consumers.map((id) => ({ id, contextRevision: revision, state: "recompute-required" as const })),
  };
}

export function composeDataState(input: Record<string, { state: string; version?: string; sourceTime?: string; confidence?: number }>) {
  const parts = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, {
    state: value.state,
    version: value.version ?? null,
    sourceTime: value.sourceTime ?? null,
    confidence: value.confidence ?? (value.state === "missing" ? 0 : 0.65),
  }]));
  const unavailable = Object.entries(parts).filter(([, value]) => ["missing", "failed", "stale", "cached", "estimated"].includes(value.state));
  return {
    overall: unavailable.length ? "partial" : "fresh",
    parts,
    missingImpact: unavailable.length ? `受影响的数据层：${unavailable.map(([key]) => key).join("、")}` : "无",
    language: unavailable.length ? "部分数据不可用，结果按现有来源降级展示" : "数据已更新",
  };
}

export function normalizeObservationContext(input: { authoritative: { lat: number; lon: number; system: string }; timezone: string; localStart: string; localEnd: string; mapSystem: string }) {
  return {
    storage: { coordinateSystem: "WGS84", lat: input.authoritative.lat, lon: input.authoritative.lon, startUtc: new Date(input.localStart).toISOString(), endUtc: new Date(input.localEnd).toISOString() },
    astronomy: { coordinateSystem: "WGS84", lat: input.authoritative.lat, lon: input.authoritative.lon },
    display: { timezone: input.timezone },
    map: { coordinateSystem: input.mapSystem },
    authoritativeUnchanged: input.authoritative.system === "WGS84",
  };
}

export function resolveVersionConflict(input: { original: unknown; saved: unknown; incoming: unknown; retryKey: string }) {
  return {
    status: "conflict",
    original: input.original,
    saved: input.saved,
    incoming: input.incoming,
    preview: { retryKey: input.retryKey, choices: ["keep-saved", "accept-incoming", "merge"] },
    recoveryPoint: { retryKey: input.retryKey, retained: true },
    duplicateWrite: false,
  };
}

export function evaluateReleasePromotion(input: { currentRuntimeVersion: string; candidateRuntimeVersion: string; nativeModulesChanged: string[]; schemaReversible: boolean; iosBinaryId?: string; androidBinaryId?: string; channel: "development" | "internal" | "staging" | "production" }) {
  const nativeChange = input.nativeModulesChanged.length > 0;
  const runtimeChanged = input.currentRuntimeVersion !== input.candidateRuntimeVersion;
  const binariesReady = Boolean(input.iosBinaryId && input.androidBinaryId);
  const otaAllowed = !nativeChange && !runtimeChanged && input.schemaReversible;
  return {
    promotion: nativeChange && (!runtimeChanged || !binariesReady) ? "blocked-native-binary-required" : input.schemaReversible ? "eligible" : "blocked-irreversible-migration",
    otaAllowed,
    requiresNewBinaries: nativeChange,
    runtimeVersion: input.candidateRuntimeVersion,
    channel: input.channel,
    rollbackAllowed: input.schemaReversible,
  };
}

export type DeferredReleaseGate = "production-slo" | "native-field-matrix" | "china-production-compliance";

const acceptedGateStatuses: Record<DeferredReleaseGate, string> = {
  "production-slo": "passed",
  "native-field-matrix": "passed",
  "china-production-compliance": "confirmed",
};

const pendingGateStatuses: Record<DeferredReleaseGate, string> = {
  "production-slo": "pending-production-measurement",
  "native-field-matrix": "pending-native-and-field-validation",
  "china-production-compliance": "pending",
};

export function evaluateDeferredReleaseGate(input: { gate: DeferredReleaseGate; status: string; releaseBlocked: boolean }) {
  const fullyAccepted = input.status === acceptedGateStatuses[input.gate] && input.releaseBlocked === false;
  const truthfullyDeferred = input.status === pendingGateStatuses[input.gate] && input.releaseBlocked === true;
  return {
    currentMachineDeliveryAccepted: fullyAccepted || truthfullyDeferred,
    productionPromotionAllowed: fullyAccepted,
    disposition: fullyAccepted ? "confirmed" : truthfullyDeferred ? "external-pending" : "invalid-evidence",
    reminderRequired: truthfullyDeferred,
  } as const;
}

export function evaluateRestoreEvidence(input: { targetAt: string; latestDurableAt: string; startedAt: string; completedAt: string; databaseVerified: boolean; objectVersionsVerified: boolean; referencesVerified: boolean; permissionsVerified: boolean; redisRestored: boolean }) {
  const rpoMinutes = Math.max(0, (Date.parse(input.targetAt) - Date.parse(input.latestDurableAt)) / 60_000);
  const rtoMinutes = Math.max(0, (Date.parse(input.completedAt) - Date.parse(input.startedAt)) / 60_000);
  const integrityPassed = input.databaseVerified && input.objectVersionsVerified && input.referencesVerified && input.permissionsVerified;
  return { rpoMinutes, rtoMinutes, integrityPassed, redisRequiredForTruth: false, redisLossAccepted: !input.redisRestored, objectivesMet: integrityPassed && rpoMinutes <= 15 && rtoMinutes <= 120 };
}
