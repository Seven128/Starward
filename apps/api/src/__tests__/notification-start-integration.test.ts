import { createServer } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { notificationForecastQuery, notificationWeatherPayload, notificationWeatherRule } from "../../../../tests/fixtures/notification-weather";

describe("actual native API start notification composition", () => {
  it("publishes its normalized primary acquisition and restores a useful inbox across process restart", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "starward-notification-start-"));
    let cloud = 80, weatherRequests = 0, aqRequests = 0;
    const upstream = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      response.setHeader("content-type", "application/json");
      if (url.pathname === "/v1/forecast" && url.searchParams.get("__starward_upstream") === "api.open-meteo.com") {
        weatherRequests++; response.end(JSON.stringify(notificationWeatherPayload(cloud))); return;
      }
      if (url.pathname === "/v1/air-quality" && url.searchParams.get("__starward_upstream") === "air-quality-api.open-meteo.com") {
        aqRequests++; response.end(JSON.stringify({ hourly: { time: [] }, hourly_units: {} })); return;
      }
      response.statusCode = 404; response.end("{}");
    });
    await new Promise<void>(resolve => upstream.listen(0, "127.0.0.1", resolve));
    const upstreamAddress = upstream.address();
    if (!upstreamAddress || typeof upstreamAddress === "string") throw Error("test_upstream_not_bound");
    const owned: ChildProcess[] = [];
    const stop = async (child: ChildProcess) => {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
      const exited = once(child, "exit");
      if (!child.kill()) throw Error("owned_api_stop_failed");
      await exited;
    };
    const start = async (now: string) => {
      const reservation = createServer();
      await new Promise<void>(resolve => reservation.listen(0, "127.0.0.1", resolve));
      const address = reservation.address(); if (!address || typeof address === "string") throw Error("test_api_port_unavailable");
      const port = address.port; await new Promise<void>((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
      const child = spawn(process.execPath, ["--import", "tsx", fileURLToPath(new URL("../../../../tests/fixtures/native-api-fixed-clock.mjs", import.meta.url))], {
        cwd: fileURLToPath(new URL("../../", import.meta.url)), windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, STARWARD_DATA_DIR: dataDir, STARWARD_API_HOST: "127.0.0.1", STARWARD_API_PORT: String(port),
          STARWARD_WEATHER_MODE: "noncommercial-poc", STARWARD_WEATHER_LOOPBACK_PROXY: `http://127.0.0.1:${upstreamAddress.port}`,
          STARWARD_FIXTURE_NOW: now },
      });
      owned.push(child); let diagnostic = "";
      child.stdout?.on("data", () => undefined); child.stderr?.on("data", chunk => { diagnostic = (diagnostic + String(chunk)).slice(-1000); });
      const url = `http://127.0.0.1:${port}`;
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        if (child.exitCode !== null) throw Error(`actual_api_start_failed:${diagnostic}`);
        try { if ((await fetch(`${url}/health/live`)).ok) return { child, url }; } catch {}
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw Error("actual_api_start_readiness_timeout");
    };
    const request = async (url: string, path: string, body?: unknown) => {
      const response = await fetch(url + path, body === undefined ? undefined : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      expect(response.status).toBe(200); return response.json();
    };
    try {
      const first = await start("2026-10-24T19:00:00.000Z");
      const rule = await request(first.url, "/v2/notification-rules/commands", { command: "create-rule", idempotencyKey: "start-rule", input: notificationWeatherRule() });
      const state = (await request(first.url, "/v2/notifications/controls")).controls;
      await request(first.url, "/v2/notifications/controls/commands", { command: "set-controls", idempotencyKey: "start-controls", baseRevision: state.revision, expectedOwnerId: state.ownerId, enabled: true, categories: { pretrip: true, "long-term": false } });
      const query = new URLSearchParams(Object.entries(notificationForecastQuery).map(([key, value]) => [key, String(value)]));
      const baseline = await request(first.url, `/v1/forecast/hourly?${query}`);
      expect(baseline.primary.hours[0].totalCloudPct).toBe(80);
      expect((await request(first.url, "/v2/notifications/inbox")).items).toEqual([]);
      await stop(first.child); cloud = 10;
      const second = await start("2026-10-24T19:01:00.000Z");
      const current = await request(second.url, `/v1/forecast/hourly?${query}`);
      expect(current.primary.hours[0].totalCloudPct).toBe(10);
      let inbox = await request(second.url, "/v2/notifications/inbox");
      for (let i = 0; i < 20 && inbox.evaluationStatus === "processing"; i++) { await new Promise(resolve => setTimeout(resolve, 10)); inbox = await request(second.url, "/v2/notifications/inbox"); }
      expect(inbox.items).toHaveLength(1);
      expect(inbox.items[0]).toMatchObject({ trigger: { ruleId: rule.rule.id, previousValue: 80, value: 10,
        source: { provider: "open-meteo", model: "gfs_seamless", acquiredAt: "2026-10-24T19:01:00.000Z" } }, boundary: "in-app-inbox-only" });
      expect(weatherRequests).toBe(4); expect(aqRequests).toBe(2);
    } finally {
      for (const child of owned) await stop(child);
      await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve()));
      if (dirname(resolve(dataDir)) !== resolve(tmpdir()) || !basename(dataDir).startsWith("starward-notification-start-")) throw Error("unexpected_test_directory");
      rmSync(dataDir, { recursive: true, force: true });
    }
  }, 35_000);
});
