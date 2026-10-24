import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { assertNightReportRequest, isNightReport, nightReportMatchesRequest, nightReportRequestIdentity, type NightReport, type NightReportRequest, type PersistedNightReport } from "@starward/contracts/night-report";
import { createPendingApiCommand, type PendingCommandStorage } from "./pending-api-command";

export type NightReportContext = Omit<NightReportRequest, "requestId">;
export type NightReportClient = {
  create(request: NightReportRequest, signal?: AbortSignal): Promise<NightReport>;
  load(context: NightReportContext, signal?: AbortSignal): Promise<NightReport>;
};
type Attempt = { idempotencyKey: string; input: NightReportContext };
export class NightReportRequestError extends Error {
  constructor(readonly code: string, readonly rejected = false) { super(code); }
}

export function createNightReportClient(options: { baseUrl?: string; fetcher?: typeof fetch; storage?: PendingCommandStorage; newKey?: () => string } = {}): NightReportClient {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL;
  const fetcher = options.fetcher ?? fetch;
  const storage = options.storage ?? AsyncStorage;
  const inFlight = new Map<string, Promise<NightReport>>();
  const create = async (raw: NightReportRequest, signal?: AbortSignal) => {
      const request = JSON.parse(JSON.stringify(assertNightReportRequest(raw))) as NightReportRequest;
      if (!baseUrl) throw new Error("night_report_api_base_url_missing");
      const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}/v1/night-reports`, {
        method: "POST", headers: { "content-type": "application/json", "x-request-id": request.requestId }, body: JSON.stringify(request), signal,
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new NightReportRequestError(failure.code ?? `night_report_http_${response.status}`, failure.outcome === "rejected" && response.status === 422);
      }
      const value: unknown = await response.json();
      if (!isNightReport(value)) throw new Error("night_report_response_invalid");
      if (!nightReportMatchesRequest(value, request)) throw new Error("night_report_response_context_mismatch");
      // Older servers and guest queries may return a valid report without
      // persistence. Only the explicit owner protocol authorizes private readback.
      if (response.headers.get("x-night-report-storage") === "local-owner-poc-v1") {
        let saved: PersistedNightReport;
        try {
          const read = await fetcher(`${baseUrl.replace(/\/$/u, "")}/v1/night-report-requests/${encodeURIComponent(request.requestId)}`, { signal, headers: { accept: "application/json" } });
          if (!read.ok) throw new Error("readback_rejected");
          saved = await read.json();
        } catch { throw new Error("night_report_readback_unconfirmed"); }
        if (saved.schemaVersion !== "starward-night-report-persistence-v1" || saved.scope !== "local-owner-poc" || !saved.receipt || saved.receipt.requestId !== request.requestId || saved.receipt.reportId !== value.id || saved.receipt.revision !== value.revision
          || !isNightReport(saved.report) || !nightReportMatchesRequest(saved.report, request) || JSON.stringify(saved.report) !== JSON.stringify(value)) throw new Error("night_report_readback_unconfirmed");
      }
      return value;
  };
  return {
    create,
    load(raw, signal) {
      const input = JSON.parse(JSON.stringify(raw)) as NightReportContext;
      const identity = nightReportRequestIdentity({ ...input, requestId: "context" });
      if (!baseUrl) return Promise.reject(new Error("night_report_api_base_url_missing"));
      const active = inFlight.get(identity);
      if (active) return active;
      const owner = createPendingApiCommand<Attempt, NightReport>({
        storage, storageKey: `starward-night-report-pending-v1:${baseUrl}:${identity}`, newKey: options.newKey ?? randomUUID,
        parse(value) {
          const attempt = value as Attempt;
          const request = assertNightReportRequest({ ...attempt?.input, requestId: attempt?.idempotencyKey });
          if (nightReportRequestIdentity({ ...request, requestId: "context" }) !== identity) throw new Error("night_report_pending_context_mismatch");
          return attempt;
        },
        error: reason => new Error(`night_report_${reason}`),
        canDiscard: (error, retry) => !retry && error instanceof NightReportRequestError && error.rejected,
        dispatch: (attempt) => create({ ...attempt.input, requestId: attempt.idempotencyKey }, signal),
      });
      const work = (async () => await owner.pending() ? owner.retry() : owner.command({ input }))();
      inFlight.set(identity, work);
      void work.finally(() => { if (inFlight.get(identity) === work) inFlight.delete(identity); }).catch(() => undefined);
      return work;
    },
  };
}
