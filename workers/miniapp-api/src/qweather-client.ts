import { createPrivateKey, sign } from "node:crypto";
import { wgs84ToGcj02 } from "@starward/coordinate-system";
import type { SourceSummary, Wgs84Point } from "@starward/miniapp-contracts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";
import { WEATHER_DEADLINES, withDeadline } from "./provider-deadline.ts";

/** Keep source statements verbatim: licensing text is not presentation prose. */
export function qweatherAttribution(values: unknown): NonNullable<SourceSummary["attribution"]> {
  return { name: "和风天气", url: "https://www.qweather.com",
    statements: Array.isArray(values) ? values.filter((value): value is string => typeof value === "string" && Boolean(value.trim())) : [] };
}

export function qweatherJwt(config: MiniappRuntimeConfig) {
  const { credentialId, developerId, projectId, privateKeyPem } = config.qweather;
  if (!credentialId || !developerId || !projectId || !privateKeyPem) throw new Error("qweather_credentials_required");
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1_000) - 30;
  const unsigned = `${encode({ alg: "EdDSA", kid: credentialId })}.${encode({ iss: developerId, sub: projectId, iat: now, exp: now + 900 })}`;
  return `${unsigned}.${sign(null, Buffer.from(unsigned), createPrivateKey(privateKeyPem)).toString("base64url")}`;
}

export function qweatherRequestPoint(input: { point: Wgs84Point }) {
  const converted = wgs84ToGcj02({ lat: input.point.latitude, lon: input.point.longitude, system: "WGS84" });
  return { latitude: converted.lat, longitude: converted.lon };
}

/** Explicit-offset ISO instant with a real source calendar date; Date.parse alone rolls invalid days forward. */
export { sourceInstant as qweatherInstant } from "@starward/miniapp-contracts";

export async function fetchJson<T>(url: URL, init: RequestInit, transport: typeof fetch,
  deadlineMs: number = WEATHER_DEADLINES.requestMs): Promise<T> {
  return withDeadline(async signal => {
    const response = await transport(url, { ...init, signal });
    signal.throwIfAborted();
    if (!response.ok) throw new Error(`provider_http_${response.status}`);
    if (!(response.headers.get("content-type") ?? "").includes("json")) throw new Error("provider_non_json_response");
    return await response.json() as T;
  }, deadlineMs, init.signal);
}
