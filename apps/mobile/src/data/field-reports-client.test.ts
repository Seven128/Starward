import { describe, expect, it, vi } from "vitest";
vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "field-client-key" }));
import { createFieldReportsClient } from "./field-reports-client";
import { fieldReportInput, fieldReportResult, savedFieldReport } from "../../../../tests/fixtures/field-reports";

const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
function storage() { const values = new Map<string, string>(); return { values, getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } }; }
describe("private field report client intent and receipts", () => {
  it.each(["invalid_field_report", "field_report_request_body_too_large"])("retains an uncertain committed attempt when a retry is refused before receipt lookup: %s", async code => {
    const local = storage(), posts: string[] = []; let post = 0;
    const fetcher = (async (_url, init) => {
      if (init?.method === "POST") {
        posts.push(String(init.body)); post += 1;
        if (post === 1) throw new Error("reply_lost");
        if (post === 2) return response({ code, outcome: "rejected" }, code.includes("large") ? 413 : 400);
        return response({ ...fieldReportResult("field-key"), replayed: true });
      }
      return response({ schemaVersion: "starward-field-reports-v2", report: savedFieldReport(2, { ...fieldReportInput(), note: "new current revision" }) });
    }) as typeof fetch;
    const first = createFieldReportsClient({ baseUrl: "http://local", storage: local, fetcher, newKey: () => "field-key" });
    await expect(first.command({ command: "create-report-draft", input: fieldReportInput() })).rejects.toThrow("reply_lost");
    const retained = await first.pending(), restarted = createFieldReportsClient({ baseUrl: "http://local", storage: local, fetcher, newKey: () => "must-not-be-used" });
    await expect(restarted.retry()).rejects.toMatchObject({ code, rejected: false }); expect(await restarted.pending()).toEqual(retained);
    await expect(restarted.command({ command: "create-report-draft", input: { ...fieldReportInput(), note: "other form" } })).rejects.toMatchObject({ code: "field_report_pending_requires_retry" });
    await expect(restarted.retry()).resolves.toMatchObject({ revision: 2, input: { note: "new current revision" } });
    expect(new Set(posts).size).toBe(1); expect(await restarted.pending()).toBeNull();
  });
  it.each(["field_report_revision_conflict", "field_report_not_found"])("permits correction only after a receipt-absent transaction rejection: %s", async code => {
    const local = storage(); let post = 0;
    const fetcher = (async (_url, init) => {
      if (init?.method === "POST") { post += 1; if (post === 1) throw new Error("unknown_first_request"); return response({ code, outcome: "rejected" }, code.includes("not_found") ? 404 : 409); }
      throw new Error("unexpected_readback");
    }) as typeof fetch;
    const client = createFieldReportsClient({ baseUrl: "http://local", storage: local, fetcher, newKey: () => "field-key" });
    await expect(client.command({ command: "update-report-draft", reportId: "private-note-a", baseRevision: 1, input: fieldReportInput() })).rejects.toThrow("unknown_first_request");
    await expect(client.retry()).rejects.toMatchObject({ code, rejected: true }); expect(await client.pending()).toBeNull();
  });
  it("rejects a mismatching receipt body and retains the exact attempt instead of treating any saved report as its effect", async () => {
    const local = storage();
    const client = createFieldReportsClient({ baseUrl: "http://local", storage: local, newKey: () => "field-key", fetcher: (async () => response(fieldReportResult("field-key", savedFieldReport(1, { ...fieldReportInput(), note: "different content" })))) as typeof fetch });
    await expect(client.command({ command: "create-report-draft", input: fieldReportInput() })).rejects.toMatchObject({ code: "field_report_receipt_input_mismatch" });
    expect((await client.pending())?.input).toEqual(fieldReportInput());
  });
  it("keeps a failed authoritative readback pending and does not submit anything without an API base URL", async () => {
    const local = storage(); const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => init?.method === "POST" ? response(fieldReportResult("field-key")) : response({ code: "unavailable" }, 503));
    const client = createFieldReportsClient({ baseUrl: "http://local", storage: local, newKey: () => "field-key", fetcher: fetcher as typeof fetch });
    await expect(client.command({ command: "create-report-draft", input: fieldReportInput() })).rejects.toMatchObject({ code: "field_report_readback_unconfirmed" }); expect(await client.pending()).not.toBeNull();
    const missing = createFieldReportsClient({ baseUrl: "", storage: storage(), fetcher: fetcher as typeof fetch });
    await expect(missing.command({ command: "create-report-draft", input: fieldReportInput() })).rejects.toMatchObject({ code: "field_report_api_base_url_missing" }); expect(await missing.pending()).toBeNull(); expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
