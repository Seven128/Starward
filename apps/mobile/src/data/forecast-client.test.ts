import { describe, expect, it, vi } from "vitest";
import { createForecastClient } from "./forecast-client";

const query = { latitude: 22.529, longitude: 113.9468, timezone: "Asia/Shanghai", nightDate: "2026-07-20", target: "milky-way-core" as const };

describe("forecast client", () => {
  it("calls the aggregate API and accepts only the versioned bundle", async () => {
    const body = { schemaVersion: "starward-forecast-bundle-v1", primary: { hours: [] }, trends: [], astronomy: { algorithmVersion: "test" } };
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(body), { status: 200 }));
    await expect(createForecastClient({ baseUrl: "http://127.0.0.1:4318", fetcher }).get(query)).resolves.toMatchObject(body);
    expect(fetcher.mock.calls[0][0]).toContain("/v1/forecast/hourly?");
  });

  it("fails closed when endpoint configuration or response structure is absent", async () => {
    await expect(createForecastClient({ baseUrl: "" }).get(query)).rejects.toThrow("forecast_api_base_url_missing");
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    await expect(createForecastClient({ baseUrl: "http://127.0.0.1:4318", fetcher }).get(query)).rejects.toThrow("forecast_response_invalid");
  });
});
