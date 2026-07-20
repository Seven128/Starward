export const structuredContracts = Object.freeze({
  "admin-data-operations": {
    "domain-and-entities": "admin-domain-trace",
    "api-data-status": "admin-api-envelope",
    "no-public-api-or-schema-change": "api-contract-boundary",
    "cache-policy": "admin-cache-policy",
    "carrier-integrity": "carrier-integrity",
    "no-security-boundary-change": "security-boundary",
    "no-full-population-operation": "admin-population-coverage",
  },
  "community-contribution": {
    "carrier-integrity": "carrier-integrity",
    "no-persistent-data-change": "persistent-data-boundary",
    "no-security-boundary-change": "security-boundary",
  },
  "field-offline-safety": {
    "carrier-integrity": "carrier-integrity",
    "no-data-migration": "data-migration-boundary",
    "no-permission-boundary-change": "permission-boundary",
  },
  "forecast-and-astronomy": {
    "astronomy-provenance": "astronomy-provenance",
    "experimental-atmosphere-label": "experimental-atmosphere-violation",
    "carrier-integrity": "carrier-integrity",
    "no-public-api-or-schema-change": "api-contract-boundary",
  },
  GLOBAL: {
    "context-atomicity": "global-context-atomicity",
    "partial-data-language": "global-partial-data",
    "time-coordinate-consistency": "global-time-coordinate",
    "permission-denial-and-privacy": "global-permission-denial",
    "offline-restart-recovery": "global-offline-recovery",
    "accessible-mode-state": "global-accessible-mode",
    "versioned-conflict-recovery": "global-conflict-recovery",
    "release-scope-boundary": "global-release-scope",
    "personal-trial-boundary": "global-personal-trial-boundary",
    "guard-generic-weather-dashboard": "guard-product-kind",
    "guard-pwa-as-final-product": "guard-native-primary",
    "guard-mini-program-full-parity": "guard-mini-program-scope",
    "guard-mvp-general-social-network": "guard-mvp-social-scope",
    "guard-mvp-heavy-professional-suite": "guard-mvp-professional-scope",
    "guard-client-side-source-stitching": "guard-client-source-stitching",
    "guard-unexplained-single-score": "guard-explainable-score",
    "guard-fake-or-guaranteed-data": "guard-truthful-data",
    "guard-lowest-sticker-price-provider": "guard-provider-selection",
    "guard-coordinate-mixing": "guard-coordinate-boundary",
    "guard-ai-invented-exposure": "guard-ai-exposure",
    "guard-ar-only-core": "guard-ar-fallback",
    "guard-online-only-field-mode": "guard-field-offline",
    "guard-static-screen-completion": "guard-runtime-completion",
  },
  "identity-profile-privacy": {
    "carrier-integrity": "carrier-integrity",
    "no-data-migration": "data-migration-boundary",
    "no-security-boundary-change": "security-boundary",
  },
  "itinerary-and-collaboration": {
    "carrier-integrity": "carrier-integrity",
    "no-data-migration": "data-migration-boundary",
    "no-security-boundary-change": "security-boundary",
  },
  "map-route-discovery": {
    "coordinate-round-trip": "coordinate-round-trip-violation",
    "no-public-api-or-schema-change": "api-contract-boundary",
    "carrier-integrity": "carrier-integrity",
    "no-permission-boundary-change": "permission-boundary",
  },
  "mobile-shell-and-preferences": {
    "global-data-states": "mobile-data-states",
    "carrier-integrity": "carrier-integrity",
    "native-app-shape": "native-app-shape-violation",
    "no-permission-boundary-change": "permission-boundary",
  },
  "notifications-and-toolbox": {
    "batch-dedup": "notification-batch-violation",
    "carrier-integrity": "carrier-integrity",
    "no-permission-boundary-change": "permission-boundary",
    "no-full-population-operation": "notification-population-coverage",
  },
  "quality-release-observability": {
    "official-source-production-gates": "official-source-gates",
    "carrier-integrity": "carrier-integrity",
    "architecture-baseline": "architecture-baseline-violation",
    "interaction-direct-manipulation": "interaction-direct-manipulation",
    "interaction-gesture-arbitration": "interaction-gesture-arbitration",
    "interaction-accessibility-variants": "interaction-accessibility",
    "interaction-red-light-continuity": "interaction-red-light",
    "environment-production-isolation": "environment-isolation",
    "slo-evaluation": "slo-evaluation",
    "delivery-order-and-platform": "delivery-order",
    "test-coverage": "test-coverage-violation",
    "china-compliance-readiness": "china-compliance",
    "security-baseline": "security-baseline",
    "no-data-migration": "data-migration-boundary",
  },
  "shooting-assistant": {
    "carrier-integrity": "carrier-integrity",
    "no-security-boundary-change": "security-boundary",
  },
  "sky-orientation-ar": {
    "carrier-integrity": "carrier-integrity",
    "no-public-api-or-schema-change": "api-contract-boundary",
    "no-permission-boundary-change": "permission-boundary",
  },
  "spot-detail-and-trust": {
    "carrier-integrity": "carrier-integrity",
    "no-persistent-data-change": "persistent-data-boundary",
    "no-security-boundary-change": "security-boundary",
  },
  "tonight-decision": {
    "hard-safety-block": "tonight-hard-safety",
    "profile-sensitive-ranking": "tonight-profile-ranking",
    "continuous-window-selection": "tonight-continuous-window",
    "learning-cannot-override-safety": "tonight-learning-boundary",
    "no-score-only-completion": "tonight-score-only-violation",
    "carrier-integrity": "carrier-integrity",
    "no-public-api-or-schema-change": "api-contract-boundary",
  },
});

export const productionModules = Object.freeze({
  adminContracts: "packages/contracts/src/admin.ts",
  adminDataStatus: "apps/api/src/modules/admin/data-status.ts",
  adminCachePolicy: "apps/api/src/modules/admin/cache-policy.ts",
  adminPopulation: "apps/api/src/modules/admin/replay-population.ts",
  astronomy: "packages/domain/src/forecast/index.ts",
  coordinate: "packages/coordinate-system/src/index.ts",
  mobileDataState: "packages/ui-system/src/data-state.ts",
  notificationBatch: "workers/notification/src/evaluate-batch.ts",
  notificationPopulation: "workers/notification/src/select-population.ts",
  platform: "packages/contracts/src/platform-boundary.ts",
  interaction: "packages/ui-system/src/interaction-runtime.ts",
  scoring: "packages/scoring-engine/src/index.ts",
  shooting: "packages/domain/src/shooting/index.ts",
  sky: "packages/astronomy-core/src/sky-capabilities.ts",
  fieldOffline: "packages/domain/src/offline/index.ts",
  security: "packages/contracts/src/security-policy.ts",
});

export function validateStructuredContracts(spec) {
  const contracts = structuredContracts[spec.outcome];
  if (!contracts) throw new Error(`missing_structured_contract_group:${spec.outcome}`);
  const expected = spec.assertions.filter((item) => item.surface !== "ui_browser").map((item) => item.key).sort();
  const actual = Object.keys(contracts).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`structured_contract_key_mismatch:${spec.outcome}:expected=${expected.join(",")}:actual=${actual.join(",")}`);
  }
}
