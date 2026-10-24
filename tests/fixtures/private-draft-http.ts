import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { buildApi } from "../../apps/api/src/server";
import { createItineraryRuntime } from "../../apps/api/src/modules/itinerary/runtime";
import { createFieldReportRuntime } from "../../apps/api/src/modules/field/report-runtime";
import { createItineraryClient } from "../../apps/mobile/src/data/itinerary-client";
import { createFieldReportsClient } from "../../apps/mobile/src/data/field-reports-client";
import { fieldReportInput } from "./field-reports";

/** Synthetic private inputs through the real API/SQLite owners; no listener. */
export const itineraryDraftInput = { command: "create-draft" as const, input: {
  title: "合成行程私密内容A", timezone: "Asia/Shanghai", inputs: { date: "2026-11-01", origin: "广州", people: 2,
    transport: "drive" as const, target: "moon", userType: "family", latestReturnLocal: null, overnight: false, collaborative: false as const },
} };
export type DraftFamily = "itinerary" | "field";
export async function privateDraftHttp(setupOptions: { directory?: string } = {}) {
  const directory = setupOptions.directory ?? mkdtempSync(join(tmpdir(), "starward-private-draft-owner-"));
  if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("starward-private-draft-owner-")) throw Error("private_draft_fixture_directory_invalid");
  const itinerary = await createItineraryRuntime({ dataDir: directory });
  const field = await createFieldReportRuntime({ dataDir: directory });
  const actors: Record<DraftFamily, string | null> = { itinerary: "owner-A", field: "owner-A" };
  const actor = (family: DraftFamily) => actors[family] === null ? null : { id: actors[family]!, scope: "local-owner-poc" as const };
  const app = await buildApi({ allowedOrigins: ["http://localhost:8081"],
    nightReports: { create: async () => { throw Error("not_used"); } }, spots: { getDetail: async () => { throw Error("not_used"); } },
    resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }),
    itineraries: itinerary.service, resolveItineraryActor: async () => actor("itinerary"),
    fieldReports: field.service, resolveFieldReportActor: async () => actor("field"),
  });
  app.addHook("onClose", async () => { await itinerary.close(); await field.close(); });
  const values = new Map<string, string>();
  const storage = { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } };
  const requests: Array<{ family: DraftFamily; method: string; path: string; body: string | undefined; headers: Headers; status: number }> = [];
  let afterResponse: ((request: typeof requests[number], response: Response) => Promise<Response>) | undefined;
  const fetcher = (async (target, init) => {
    const url = new URL(String(target)); if (url.origin !== "http://private-draft.local") throw Error("external_http_forbidden");
    const headers = new Headers(init?.headers), method = init?.method ?? "GET";
    const result = await app.inject({ method: method as "GET" | "POST", url: url.pathname + url.search,
      headers: Object.fromEntries(headers.entries()), ...(init?.body === undefined ? {} : { payload: String(init.body) }) });
    const request = { family: url.pathname.startsWith("/v2/itineraries") ? "itinerary" as const : "field" as const,
      method, path: url.pathname, body: init?.body === undefined ? undefined : String(init.body), headers, status: result.statusCode };
    requests.push(request);
    const response = new Response(result.body, { status: result.statusCode });
    return afterResponse ? afterResponse(request, response) : response;
  }) as typeof fetch;
  let sequence = 0;
  const options = { baseUrl: "http://private-draft.local", fetcher, storage, newKey: () => `synthetic-key-${++sequence}` };
  return { directory, app, itinerary, field, values, storage, requests, fetcher, options,
    itineraryClient: () => createItineraryClient(options), fieldClient: () => createFieldReportsClient(options),
    actor(family: DraftFamily, id: string | null) { actors[family] = id; },
    intercept(callback: typeof afterResponse) { afterResponse = callback; },
    seedItinerary(title = itineraryDraftInput.input.title) { return itinerary.service.command(actor("itinerary"), { ...itineraryDraftInput, input: { ...itineraryDraftInput.input, title }, idempotencyKey: `seed-${++sequence}` }).itinerary; },
    seedField(note = "合成现场私密内容A", label = "用户输入的测试地点") { return field.service.command(actor("field"), { command: "create-report-draft", idempotencyKey: `seed-${++sequence}`, input: { ...fieldReportInput(), place: { label }, note } }).report; },
    async close() { await app.close(); },
  };
}
