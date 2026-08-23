export const FEATURE_FLAG_KEYS = [
  "GLOBAL_NIGHT_TAB_ENABLED",
  "ORDINARY_PLACE_SKY_ENABLED",
  "DARK_SKY_CANDIDATES_ENABLED",
  "SKY_EVENT_ENABLED",
  "REAL_WEATHER_ENABLED",
  "LAYERED_CLOUD_ENABLED",
  "WEATHER_MODEL_COMPARISON_ENABLED",
  "LIGHT_POLLUTION_LAYER_ENABLED",
  "SKY_OPPORTUNITY_LAYER_ENABLED",
  "DYNAMIC_SKY_MAP_ENABLED",
  "WECHAT_AUTH_ENABLED",
  "EVENT_SUBSCRIPTION_ENABLED",
  "PROFILE_LINKS_ENABLED",
  "OWN_POST_IMPORT_ENABLED",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];
export type FeatureFlags = Readonly<Record<FeatureFlagKey, boolean>>;

/** Runtime prerequisites may only turn a capability off; they must never
 * revive a product surface superseded by the current selected topology. */
export const SELECTED_FEATURE_FLAGS: FeatureFlags = Object.freeze({
  GLOBAL_NIGHT_TAB_ENABLED: false,
  ORDINARY_PLACE_SKY_ENABLED: false,
  DARK_SKY_CANDIDATES_ENABLED: false,
  SKY_EVENT_ENABLED: true,
  REAL_WEATHER_ENABLED: true,
  LAYERED_CLOUD_ENABLED: true,
  WEATHER_MODEL_COMPARISON_ENABLED: false,
  LIGHT_POLLUTION_LAYER_ENABLED: true,
  SKY_OPPORTUNITY_LAYER_ENABLED: true,
  DYNAMIC_SKY_MAP_ENABLED: true,
  WECHAT_AUTH_ENABLED: true,
  EVENT_SUBSCRIPTION_ENABLED: false,
  PROFILE_LINKS_ENABLED: false,
  OWN_POST_IMPORT_ENABLED: false,
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
  for (const key of FEATURE_FLAG_KEYS)
    if (typeof (flags as Record<string, unknown>)[key] !== "boolean")
      throw new Error(`feature_flag_invalid:${key}`);
}
