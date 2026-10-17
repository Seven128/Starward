import { randomUUID } from "node:crypto";
// The adopted Mini Program scheme has no configured hard monthly ceiling.
// Planning scenarios are estimates, not authorization or replacement limits.
export const MINIAPP_VENDOR_BUDGET_CNY = null;
// Estimates follow the public calculator; they are not invoice or entitlement
// assertions. Persist dimensions only, never coordinates, dates, URLs or keys.
export function describeVendorRequest(url) {
    const base = { estimatedRequestUnits: 1, unitBasis: "HTTP_ATTEMPT", dimensions: {} };
    if (url.pathname.startsWith("/weather/v1/hourly/"))
        return { ...base, provider: "QWEATHER", operation: "HOURLY", capability: "WEATHER" };
    if (url.pathname.startsWith("/weatheralert/v1/current/"))
        return { ...base, provider: "QWEATHER", operation: "CURRENT_ALERTS", capability: "ALERTS" };
    if (url.pathname.startsWith("/airquality/v1/current/"))
        return { ...base, provider: "QWEATHER", operation: "AIR_CURRENT", capability: "AIR_QUALITY" };
    if (url.pathname.startsWith("/airquality/v1/hourly/"))
        return { ...base, provider: "QWEATHER", operation: "AIR_HOURLY", capability: "AIR_QUALITY" };
    if (url.pathname === "/geo/v2/city/lookup")
        return { ...base, provider: "QWEATHER", operation: "WEATHER_REGION", capability: "WEATHER" };
    if (url.pathname === "/v7/historical/weather")
        return { ...base, provider: "QWEATHER", operation: "RECENT_HISTORY", capability: "WEATHER" };
    throw new Error("provider_usage_operation_unclassified");
}
async function boundedRecord(work, timeoutMs) {
    let timer;
    try {
        await Promise.race([work, new Promise((_resolve, reject) => {
                timer = setTimeout(() => reject(new Error("provider_usage_record_timeout")), timeoutMs);
            })]);
    }
    finally {
        clearTimeout(timer);
    }
}
/** Counts transport invocations, including retries, below provider caches.
 * Redirect hops, body validation, billing and provider receipt are separate facts. */
export function createVendorUsageTransport(store, transport = fetch, recordTimeoutMs = 1_000) {
    return async (input, init) => {
        const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
        signal?.throwIfAborted();
        const description = describeVendorRequest(new URL(input instanceof Request ? input.url : input.toString()));
        const requestId = randomUUID();
        try {
            await boundedRecord(store.begin({ ...description, requestId }), recordTimeoutMs);
        }
        catch {
            throw new Error("provider_usage_record_unavailable");
        }
        const finish = async (outcome) => {
            // A committed PENDING row survives if the update fails. Do not convert a
            // successful provider response to a retryable failure of the provider.
            try {
                await boundedRecord(store.finish(requestId, outcome), recordTimeoutMs);
            }
            catch { /* outcome unknown */ }
        };
        if (signal?.aborted) {
            await finish({ status: "NOT_SENT", httpStatus: null, latencyMs: 0 });
            signal.throwIfAborted();
        }
        const startedAt = performance.now();
        let response;
        try {
            response = await transport(input, init);
        }
        catch (error) {
            await finish({ status: signal?.aborted ? "ABORTED" : "TRANSPORT_FAILURE", httpStatus: null,
                latencyMs: Math.round(performance.now() - startedAt) });
            throw error;
        }
        await finish({ status: "HTTP_RESPONSE", httpStatus: response.status, latencyMs: Math.round(performance.now() - startedAt) });
        return response;
    };
}
//# sourceMappingURL=vendor-usage.js.map