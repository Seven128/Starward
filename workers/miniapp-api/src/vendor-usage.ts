import { randomUUID } from "node:crypto";

export const MINIAPP_VENDOR_BUDGET_CNY = 350;

export interface VendorRequestDescription {
  provider: "QWEATHER" | "OPEN_METEO" | "AMAP" | "NASA_SKYVIEW";
  operation: string;
  capability: "WEATHER" | "ALERTS" | "PLACE_SEARCH" | "ROUTE" | "DEEP_SKY_IMAGE";
  estimatedRequestUnits: number | null;
  unitBasis: "HTTP_ATTEMPT" | "OPEN_METEO_PUBLIC_ESTIMATE_2026_09" | "UNKNOWN";
  dimensions: Readonly<Record<string, number>>;
}
export interface VendorUsageAttempt extends VendorRequestDescription { requestId: string }
export interface VendorUsageOutcome {
  status: "NOT_SENT" | "HTTP_RESPONSE" | "TRANSPORT_FAILURE" | "ABORTED";
  httpStatus: number | null;
  latencyMs: number;
}
export interface VendorUsageStore {
  begin(attempt: VendorUsageAttempt): Promise<void>;
  finish(requestId: string, outcome: VendorUsageOutcome): Promise<void>;
}

const count = (value: string | null) => value?.split(",").filter(Boolean).length ?? 0;
// Estimates follow the public calculator; they are not invoice or entitlement
// assertions. Persist dimensions only, never coordinates, dates, URLs or keys.
export function describeVendorRequest(url: URL): VendorRequestDescription {
  const base = { estimatedRequestUnits: 1, unitBasis: "HTTP_ATTEMPT" as const, dimensions: {} };
  if (url.pathname.startsWith("/weather/v1/hourly/"))
    return { ...base, provider: "QWEATHER", operation: "HOURLY", capability: "WEATHER" };
  if (url.pathname.startsWith("/weatheralert/v1/current/"))
    return { ...base, provider: "QWEATHER", operation: "CURRENT_ALERTS", capability: "ALERTS" };
  if (url.hostname.endsWith(".open-meteo.com") && url.pathname === "/v1/forecast") {
    const variables = count(url.searchParams.get("hourly"));
    const models = count(url.searchParams.get("models")) || 1;
    const locations = count(url.searchParams.get("latitude")) || 1;
    const start = Date.parse(`${url.searchParams.get("start_hour")}Z`);
    const end = Date.parse(`${url.searchParams.get("end_hour")}Z`);
    const hours = Number.isFinite(start) && Number.isFinite(end) ? (end - start) / 3_600_000 + 1
      : Number(url.searchParams.get("forecast_days") ?? 7) * 24;
    const valid = variables > 0 && hours > 0 && hours <= 24 * 16 && models <= 20 && locations <= 100;
    return { provider: "OPEN_METEO", operation: "FORECAST", capability: "WEATHER",
      estimatedRequestUnits: valid ? Math.round(Math.max(1, variables * models / 10) * Math.max(1, hours / (14 * 24)) * locations * 1e6) / 1e6 : null,
      unitBasis: valid ? "OPEN_METEO_PUBLIC_ESTIMATE_2026_09" : "UNKNOWN",
      dimensions: valid ? { variables, models, locations, hours } : {},
    };
  }
  if (url.hostname === "restapi.amap.com") {
    const operations: Record<string, string> = {
      "/v5/place/text": "PLACE_TEXT", "/v3/geocode/regeo": "REVERSE_GEOCODE",
      "/v5/direction/driving": "DRIVING", "/v5/direction/walking": "WALKING",
      "/v5/direction/transit/integrated": "TRANSIT",
    };
    const operation = operations[url.pathname];
    if (operation) return { ...base, provider: "AMAP", operation, capability: operation === "PLACE_TEXT" ? "PLACE_SEARCH" : "ROUTE" };
  }
  if (url.hostname === "skyview.gsfc.nasa.gov")
    return { ...base, provider: "NASA_SKYVIEW", operation: "ARCHIVAL_IMAGE", capability: "DEEP_SKY_IMAGE" };
  throw new Error("provider_usage_operation_unclassified");
}

async function boundedRecord(work: Promise<void>, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([work, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("provider_usage_record_timeout")), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

/** Counts transport invocations, including retries, below provider caches.
 * Redirect hops, body validation, billing and provider receipt are separate facts. */
export function createVendorUsageTransport(store: VendorUsageStore, transport: typeof fetch = fetch, recordTimeoutMs = 1_000): typeof fetch {
  return async (input, init) => {
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    signal?.throwIfAborted();
    const description = describeVendorRequest(new URL(input instanceof Request ? input.url : input.toString()));
    const requestId = randomUUID();
    try { await boundedRecord(store.begin({ ...description, requestId }), recordTimeoutMs); }
    catch { throw new Error("provider_usage_record_unavailable"); }
    const finish = async (outcome: VendorUsageOutcome) => {
      // A committed PENDING row survives if the update fails. Do not convert a
      // successful provider response to a retryable failure of the provider.
      try { await boundedRecord(store.finish(requestId, outcome), recordTimeoutMs); } catch { /* outcome unknown */ }
    };
    if (signal?.aborted) {
      await finish({ status: "NOT_SENT", httpStatus: null, latencyMs: 0 });
      signal.throwIfAborted();
    }
    const startedAt = performance.now();
    let response: Response;
    try { response = await transport(input, init); }
    catch (error) {
      await finish({ status: signal?.aborted ? "ABORTED" : "TRANSPORT_FAILURE", httpStatus: null,
        latencyMs: Math.round(performance.now() - startedAt) });
      throw error;
    }
    await finish({ status: "HTTP_RESPONSE", httpStatus: response.status, latencyMs: Math.round(performance.now() - startedAt) });
    return response;
  };
}
