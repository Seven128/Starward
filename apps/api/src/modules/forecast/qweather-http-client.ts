import { createPrivateKey, sign } from "node:crypto";
import { assertHttpsHost, requestJson, type HttpTransport } from "../../../../../packages/data-source-runtime/src/index";
import type { ProviderUse } from "../../../../../packages/weather-schema/src/index";
import { normalizeQWeather, type QWeatherAdapterInput, type QWeatherHourlyPayload, type QWeatherWarningPayload } from "./qweather-adapter";
import type { WeatherProviderGateRecord } from "./provider-gate";

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function createQWeatherJwt(input: {
  credentialId: string;
  projectId: string;
  privateKeyPem: string;
  nowEpochSeconds: number;
  ttlSeconds?: number;
}): string {
  const ttlSeconds = input.ttlSeconds ?? 900;
  if (ttlSeconds < 60 || ttlSeconds > 86_400) throw new RangeError("qweather_jwt_ttl_out_of_range");
  const iat = Math.floor(input.nowEpochSeconds) - 30;
  const header = base64UrlJson({ alg: "EdDSA", kid: input.credentialId });
  const payload = base64UrlJson({ sub: input.projectId, iat, exp: iat + ttlSeconds });
  const unsigned = `${header}.${payload}`;
  const signature = sign(null, Buffer.from(unsigned), createPrivateKey(input.privateKeyPem)).toString("base64url");
  return `${unsigned}.${signature}`;
}

export interface QWeatherHttpClientOptions {
  apiHost: string;
  credentialId: string;
  projectId: string;
  privateKeyPem: string;
  licenseVersion: string;
  rawRetentionAllowed: boolean;
  gate: WeatherProviderGateRecord;
  use: ProviderUse;
  transport?: HttpTransport;
  now?: () => Date;
}

interface QWeatherAlertV1Payload {
  metadata?: { attributions?: string[] };
  alerts?: Array<{
    id?: string;
    senderName?: string;
    issuedTime?: string;
    effectiveTime?: string;
    onsetTime?: string;
    expireTime?: string;
    headline?: string;
    description?: string;
    severity?: string;
    eventType?: { name?: string };
    messageType?: { code?: string };
  }>;
}

function alertV1ToAdapterPayload(input: QWeatherAlertV1Payload): QWeatherWarningPayload {
  return {
    warning: (input.alerts ?? []).map((alert) => ({
      id: alert.id,
      title: alert.headline ?? ([alert.senderName, alert.eventType?.name].filter(Boolean).join(" · ") || undefined),
      pubTime: alert.issuedTime,
      startTime: alert.onsetTime ?? alert.effectiveTime,
      endTime: alert.expireTime,
      severity: alert.severity,
      status: alert.messageType?.code === "cancel" ? "cancel" : "active",
    })),
    refer: { sources: input.metadata?.attributions ?? [] },
  };
}

export class QWeatherHttpClient {
  private readonly baseUrl: URL;
  private readonly now: () => Date;

  constructor(private readonly options: QWeatherHttpClientOptions) {
    this.baseUrl = new URL(`https://${options.apiHost.replace(/^https?:\/\//u, "").replace(/\/$/u, "")}/`);
    assertHttpsHost(this.baseUrl, ["*.qweatherapi.com"]);
    this.now = options.now ?? (() => new Date());
  }

  async load(input: { latitude: number; longitude: number; runId: string; expiresAt: string }) {
    const now = this.now();
    const token = createQWeatherJwt({
      credentialId: this.options.credentialId,
      projectId: this.options.projectId,
      privateKeyPem: this.options.privateKeyPem,
      nowEpochSeconds: Math.floor(now.getTime() / 1000),
    });
    const location = `${input.longitude.toFixed(2)},${input.latitude.toFixed(2)}`;
    const forecastUrl = new URL("v7/weather/168h", this.baseUrl);
    forecastUrl.search = new URLSearchParams({ location, lang: "zh" }).toString();
    const alertUrl = new URL(`weatheralert/v1/current/${input.latitude.toFixed(2)}/${input.longitude.toFixed(2)}`, this.baseUrl);
    alertUrl.search = new URLSearchParams({ localTime: "false", lang: "zh" }).toString();
    const init = { headers: { authorization: `Bearer ${token}`, accept: "application/json", "accept-encoding": "gzip" } } satisfies RequestInit;
    const [forecast, alertResult] = await Promise.all([
      requestJson<QWeatherHourlyPayload>({ provider: "qweather-forecast", url: forecastUrl, init, transport: this.options.transport }),
      requestJson<QWeatherAlertV1Payload>({ provider: "qweather-alert", url: alertUrl, init, transport: this.options.transport })
        .then((value) => ({ ok: true as const, value }))
        .catch((error: unknown) => ({ ok: false as const, error })),
    ]);
    const adapterInput: QWeatherAdapterInput = {
      forecast,
      warning: alertResult.ok ? alertV1ToAdapterPayload(alertResult.value) : undefined,
      use: this.options.use,
      gate: this.options.gate,
      latitude: input.latitude,
      longitude: input.longitude,
      fetchedAt: now.toISOString(),
      expiresAt: input.expiresAt,
      runId: input.runId,
      model: "qweather-168h",
      licenseVersion: this.options.licenseVersion,
      rawRetentionAllowed: this.options.rawRetentionAllowed,
      warningFetchFailed: !alertResult.ok,
    };
    return normalizeQWeather(adapterInput);
  }
}
