import { describe, expect, it } from "vitest";
import { OpenMeteoHttpClient } from "../modules/forecast/open-meteo-http-client";
import type { WeatherProviderGateRecord } from "../modules/forecast/provider-gate";
import type { HttpTransport } from "../../../../packages/data-source-runtime/src/index";

const gate: WeatherProviderGateRecord = { id: "open-meteo", productionEnabled: false, passedGates: ["provenance", "authenticity", "target-region-stability", "safe-degradation"], licenseStatus: "noncommercial-poc-only" };
const hour = "2026-09-14T04:00";
const input = { latitude: 23.13, longitude: 113.26, runId: "primary", issuedAt: "2026-09-14T03:00:00Z", expiresAt: "2026-09-14T05:00:00Z" };
const air = () => new Response(JSON.stringify({ hourly: { time: [hour], european_aqi: [42], pm2_5: [15], pm10: [24], aerosol_optical_depth: [0.12] }, hourly_units: {} }));
const weather = (url: URL) => new Response(JSON.stringify({ latitude: Number(url.searchParams.get("latitude")), longitude: Number(url.searchParams.get("longitude")), utc_offset_seconds: 0,
  hourly: { time: [hour], cloud_cover: [url.searchParams.get("models") === "gfs_seamless" ? 12 : 27] }, hourly_units: {} }));
function options(transport: HttpTransport, now = () => new Date("2026-09-14T03:00:00Z")) {
  return { endpointClass: "free" as const, models: ["gfs_seamless"], licenseVersion: "4.0", rawRetentionAllowed: false, gate, use: "noncommercial-poc" as const, transport, now };
}

describe("native Open-Meteo model-family AQ requests", () => {
  it("shares only pending model-independent AQ while preserving each normalized weather run", async () => {
    const urls: URL[] = [];
    let release!: () => void;
    const pending = new Promise<Response>(resolve => { release = () => resolve(air()); });
    const primary = new OpenMeteoHttpClient(options(async raw => {
      const url = new URL(raw); urls.push(url);
      return url.pathname.includes("air-quality") ? pending : weather(url);
    }));
    const comparison = primary.withModels(["ecmwf_ifs025"]);
    const results = Promise.all([primary.load(input), comparison.load({ ...input, runId: "comparison" })]);
    expect(urls.filter(url => url.pathname.includes("air-quality"))).toHaveLength(1);
    release();
    const [gfs, ifs] = await results;
    expect(gfs.hours[0]).toMatchObject({ aqi: 42, pm25UgM3: 15, totalCloudPct: 12, providerRunId: "primary" });
    expect(ifs.hours[0]).toMatchObject({ aqi: 42, pm25UgM3: 15, totalCloudPct: 27, providerRunId: "comparison" });
    expect(urls.filter(url => url.pathname.includes("forecast"))).toHaveLength(2);
  });

  it("isolates coordinates, unrelated clients and a changed UTC horizon", async () => {
    let clock = new Date("2026-09-14T23:59:59Z");
    const releases: (() => void)[] = [];
    const transport: HttpTransport = async raw => {
      const url = new URL(raw);
      if (!url.pathname.includes("air-quality")) return weather(url);
      return new Promise<Response>(resolve => releases.push(() => resolve(air())));
    };
    const config = options(transport, () => clock);
    const primary = new OpenMeteoHttpClient(config);
    const sibling = primary.withModels(["ecmwf_ifs025"]);
    const requests = [primary.load(input), sibling.load({ ...input, latitude: 23.14 }), new OpenMeteoHttpClient(config).load(input)];
    clock = new Date("2026-09-15T00:00:01Z");
    requests.push(sibling.load(input));
    expect(releases).toHaveLength(4);
    releases.forEach(release => release());
    await Promise.all(requests);
  });

  it("shares one failure, keeps weather usable and retries after the failed request settles", async () => {
    let calls = 0;
    let failing = true;
    const primary = new OpenMeteoHttpClient(options(async raw => {
      const url = new URL(raw);
      if (!url.pathname.includes("air-quality")) return weather(url);
      calls++;
      return failing ? new Response("{}", { status: 401 }) : air();
    }));
    const sibling = primary.withModels(["ecmwf_ifs025"]);
    const failed = await Promise.all([primary.load(input), sibling.load(input)]);
    expect(calls).toBe(1);
    expect(failed.map(run => run.hours[0]?.aqi)).toEqual([null, null]);
    expect(failed.map(run => run.hours[0]?.totalCloudPct)).toEqual([12, 27]);
    failing = false;
    expect((await sibling.load(input)).hours[0]?.aqi).toBe(42);
    expect(calls).toBe(2);
    await primary.load(input);
    expect(calls).toBe(3); // Settled raw data is not retained or re-dated.
  });
});
