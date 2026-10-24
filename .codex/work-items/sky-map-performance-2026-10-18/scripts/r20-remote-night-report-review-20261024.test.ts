// Review-only diagnostic. These assertions reproduce the current WIP failure;
// passing them is not product acceptance. Only synthetic data is used.
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "unused-default-key" }));
import { buildApi } from "../../../../apps/api/src/server";
import { NightReportService, type NightReportProviders } from "../../../../apps/api/src/modules/night-report/night-report-service";
import { createNightReportRuntime } from "../../../../apps/api/src/modules/night-report/runtime";
import { createNightReportClient } from "../../../../apps/mobile/src/data/night-report-client";
import type { NightReportRequest } from "../../../../packages/contracts/src/night-report";

const input: Omit<NightReportRequest, "requestId"> = {
  location: { lat: 31.23, lon: 121.47, system: "WGS84", label: "Synthetic origin" },
  timezone: "Asia/Shanghai", nightDate: "2026-10-24", profile: "neutral", target: "milky-way-core",
  route: { origin: { lat: 31.23, lon: 121.47, system: "WGS84", label: "Synthetic origin" }, maxTravelMinutes: 120, modes: ["drive"] },
};

function providers(): NightReportProviders {
  const generatedAt = "2026-10-24T10:00:00Z";
  const samples = Array.from({ length: 8 }, (_, i) => ({ at: new Date(Date.parse("2026-10-24T12:00:00Z") + i * 900_000).toISOString(), eligible: true }));
  return {
    weather: { load: async () => ({ score: 80, confidence: 0.9, version: "synthetic-weather", generatedAt, samples }) },
    astronomy: { load: async () => ({ score: 80, confidence: 0.9, version: "synthetic-astronomy", generatedAt, samples, targets: [{ id: "milky-way-core", name: "Synthetic target", visible: true, window: { start: samples[0]!.at, end: samples.at(-1)!.at }, peak: { at: samples[3]!.at, altitudeDeg: 40, azimuthDeg: 150 }, difficulty: "easy", impact: "synthetic" }] }) },
    spots: { find: async () => ({ version: "synthetic-spots", generatedAt, candidates: [{ id: "synthetic-spot", name: "Synthetic spot", sky: 80, access: 80, safety: 90, preference: 80, risks: [] }] }) },
    routes: { load: async () => [{ spotId: "synthetic-spot", distanceKm: 10, travelMinutes: 15, accessScore: 80, version: "synthetic-route", generatedAt, state: "fresh" }] },
  };
}

describe("remote NightReport WIP review", () => {
  it("reproduces lost owner confirmation being discarded after an ephemeral retry", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "starward-night-report-review-"));
    let generated = 0, keys = 0, owned = true, loseReply = true;
    const owner = { id: "local-owner", scope: "local-owner-poc" as const };
    const generator = new NightReportService(providers(), undefined, () => new Date("2026-10-24T10:00:00Z"), () => `review-report-${++generated}`);
    const runtime = await createNightReportRuntime({ dataDir, generator });
    const app = await buildApi({
      nightReports: generator, nightReportRuntime: runtime, resolveNightReportActor: async () => owned ? owner : null,
      spots: { getDetail: async () => { throw new Error("unused_spot_route"); } }, resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }),
      allowedOrigins: ["http://review.invalid"], logger: false,
    });
    const pending = new Map<string, string>();
    const requests: Array<{ requestId: string; storage: string | undefined }> = [];
    const client = createNightReportClient({
      baseUrl: "http://review.invalid", newKey: () => `review-request-${++keys}`,
      storage: { getItem: async key => pending.get(key) ?? null, setItem: async (key, value) => { pending.set(key, value); }, removeItem: async key => { pending.delete(key); } },
      fetcher: (async (url, init) => {
        const response = await app.inject({ method: init?.method === "POST" ? "POST" : "GET", url: new URL(String(url)).pathname, headers: init?.headers as Record<string, string>, payload: init?.body ? String(init.body) : undefined });
        if (init?.method === "POST") {
          requests.push({ requestId: JSON.parse(String(init.body)).requestId, storage: response.headers["x-night-report-storage"] as string | undefined });
          if (loseReply) { loseReply = false; throw new Error("synthetic_committed_reply_lost"); }
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(response.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
        return new Response(response.body, { status: response.statusCode, headers });
      }) as typeof fetch,
    });
    try {
      await expect(client.load(input)).rejects.toThrow("synthetic_committed_reply_lost");
      expect(pending.size).toBe(1);
      const committed = runtime.service.result(owner, "review-request-1");
      expect(committed.report.status).toBe("ready");
      expect(committed.report.primarySpot?.id).toBe("synthetic-spot");
      owned = false;
      const privateRead = await app.inject({ method: "GET", url: "/v1/night-report-requests/review-request-1" });
      expect(privateRead.statusCode).toBe(403);
      const guest = await client.load(input);
      expect(guest.id).not.toBe(committed.report.id);
      expect(requests).toEqual([{ requestId: "review-request-1", storage: "local-owner-poc-v1" }, { requestId: "review-request-1", storage: "ephemeral" }]);
      expect(pending.size).toBe(0); // Defect: old owner attempt is still unconfirmed.
      owned = true;
      await client.load(input);
      expect(keys).toBe(2); // The unknown original has been replaced by a new attempt.
      expect(runtime.service.result(owner, "review-request-1").report.id).toBe(committed.report.id);
      console.log(JSON.stringify({ evidence: "OWNER_PENDING_CLEARED_BY_EPHEMERAL_RETRY", priorReportId: committed.report.id, ephemeralReportId: guest.id, pendingAfterGuest: 0, keysAfterOwnerReturns: keys, syntheticDatabase: dataDir }));
    } finally { await app.close(); await runtime.close(); }
  });
});
