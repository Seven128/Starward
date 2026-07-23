import Constants from "expo-constants";

export function resolveRuntimeApiBaseUrl(): string | undefined {
  const environmentUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (environmentUrl) return environmentUrl;

  const configuredUrl = Constants.expoConfig?.extra?.apiBaseUrl;
  return typeof configuredUrl === "string" && configuredUrl.trim()
    ? configuredUrl.trim()
    : undefined;
}
