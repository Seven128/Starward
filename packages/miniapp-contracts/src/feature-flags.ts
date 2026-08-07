export const FEATURE_FLAG_KEYS = [
  "TRIAL_REGION",
  "ENABLED_PROVIDERS",
  "UGC_MODE",
  "LIGHT_LAYER_MODE",
  "SKY_CATALOG_LEVEL",
  "NOTIFICATION_ENABLED",
  "COMMERCIAL_LICENSE_MODE",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export interface FeatureFlags {
  TRIAL_REGION: "SHENZHEN_3H_V1";
  ENABLED_PROVIDERS: readonly ("LOCAL_DEMO_BFF" | "WECHAT_NATIVE_MAP")[];
  UGC_MODE: "WHITELIST_MANUAL_IMPORT";
  LIGHT_LAYER_MODE: "COARSE_ESTIMATE";
  SKY_CATALOG_LEVEL: "BRIGHT_OBJECTS";
  NOTIFICATION_ENABLED: false;
  COMMERCIAL_LICENSE_MODE: false;
}

const ENABLED_DEMO_PROVIDERS: FeatureFlags["ENABLED_PROVIDERS"] = Object.freeze(
  ["LOCAL_DEMO_BFF", "WECHAT_NATIVE_MAP"],
);

export const DEMO_FEATURE_FLAGS: Readonly<FeatureFlags> = Object.freeze({
  TRIAL_REGION: "SHENZHEN_3H_V1",
  ENABLED_PROVIDERS: ENABLED_DEMO_PROVIDERS,
  UGC_MODE: "WHITELIST_MANUAL_IMPORT",
  LIGHT_LAYER_MODE: "COARSE_ESTIMATE",
  SKY_CATALOG_LEVEL: "BRIGHT_OBJECTS",
  NOTIFICATION_ENABLED: false,
  COMMERCIAL_LICENSE_MODE: false,
});

export function assertFeatureFlagClosure(
  flags: unknown,
): asserts flags is FeatureFlags {
  if (flags === null || typeof flags !== "object" || Array.isArray(flags)) {
    throw new Error("feature_flag_set_mismatch:not_an_object");
  }
  const actual = Object.keys(flags).sort();
  const expected = [...FEATURE_FLAG_KEYS].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`feature_flag_set_mismatch:${actual.join(",")}`);
  }
}
