import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { assertNightReportRequest, isNightReport, nightReportMatchesRequest, nightReportRequestIdentity, type NightReport, type NightReportRequest, type NightReportSession, type PersistedNightReport } from "@starward/contracts/night-report";
import { createPendingApiCommand, type PendingCommandStorage } from "./pending-api-command";

export type NightReportContext = Omit<NightReportRequest, "requestId">;
export type NightReportClient = {
  create(request: NightReportRequest, signal?: AbortSignal): Promise<NightReport>;
  load(context: NightReportContext, signal?: AbortSignal): Promise<NightReport>;
};
type Qualification = NightReportSession | { storage: "unknown" };
type Attempt = { idempotencyKey: string; input: NightReportContext; qualification: Qualification };
export class NightReportRequestError extends Error {
  constructor(readonly code: string, readonly rejected = false) { super(code); }
}
// Returning an independent guest query must not confirm the saved owner attempt.
class TemporaryReport extends Error { constructor(readonly report: NightReport) { super("night_report_temporary_result"); } }

export function createNightReportClient(options: { baseUrl?: string; fetcher?: typeof fetch; storage?: PendingCommandStorage; newKey?: () => string } = {}): NightReportClient {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL;
  const fetcher = options.fetcher ?? fetch;
  const storage = options.storage ?? AsyncStorage;
  const newKey = options.newKey ?? randomUUID;
  const inFlight = new Map<string, { work: Promise<NightReport>; signal?: AbortSignal }>();
  const url = (path: string) => {
    if (!baseUrl) throw new Error("night_report_api_base_url_missing");
    return `${baseUrl.replace(/\/$/u, "")}${path}`;
  };
  const checkSignal = (signal?: AbortSignal) => { if (signal?.aborted) throw signal.reason ?? new Error("night_report_cancelled"); };
  const qualify = async (signal?: AbortSignal): Promise<NightReportSession> => {
    const response = await fetcher(url("/v1/night-report-session"), { signal, headers: { accept: "application/json" } });
    const value = await response.json();
    if (!response.ok || value?.schemaVersion !== "starward-night-report-session-v1" || (value.storage !== "ephemeral" && !(value.storage === "local-owner-poc-v1" && typeof value.ownerId === "string" && value.ownerId.trim()))) throw new Error("night_report_session_unconfirmed");
    checkSignal(signal);
    return value as NightReportSession;
  };
  const readback = async (request: NightReportRequest, ownerId: string, signal?: AbortSignal): Promise<NightReport> => {
    try {
      const response = await fetcher(url(`/v1/night-report-requests/${encodeURIComponent(request.requestId)}`), { signal, headers: { accept: "application/json" } });
      const saved: PersistedNightReport = await response.json();
      if (!response.ok || saved.schemaVersion !== "starward-night-report-persistence-v1" || saved.scope !== "local-owner-poc" || saved.ownerId !== ownerId || !saved.receipt
        || !isNightReport(saved.report) || !nightReportMatchesRequest(saved.report, request)
        || saved.receipt.requestId !== request.requestId || saved.receipt.reportId !== saved.report.id || saved.receipt.revision !== saved.report.revision
        || !Number.isFinite(Date.parse(saved.receipt.committedAt))) throw new Error("invalid_readback");
      checkSignal(signal);
      return saved.report;
    } catch { checkSignal(signal); throw new Error("night_report_readback_unconfirmed"); }
  };
  const send = async (raw: NightReportRequest, signal?: AbortSignal, qualification?: NightReportSession) => {
    const request = JSON.parse(JSON.stringify(assertNightReportRequest(raw))) as NightReportRequest;
    checkSignal(signal);
    const response = await fetcher(url("/v1/night-reports"), {
      method: "POST", headers: { "content-type": "application/json", "x-request-id": request.requestId,
        ...(qualification ? { "x-night-report-storage-required": qualification.storage } : {}),
        ...(qualification?.storage === "local-owner-poc-v1" ? { "x-night-report-owner": qualification.ownerId } : {}),
      }, body: JSON.stringify(request), signal,
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      throw new NightReportRequestError(failure.code ?? `night_report_http_${response.status}`, failure.outcome === "rejected" && response.status === 422);
    }
    const value: unknown = await response.json();
    if (!isNightReport(value)) throw new Error("night_report_response_invalid");
    if (!nightReportMatchesRequest(value, request)) throw new Error("night_report_response_context_mismatch");
    const mode = response.headers.get("x-night-report-storage");
    if (qualification && mode !== qualification.storage) throw new Error("night_report_storage_unconfirmed");
    if (mode === "local-owner-poc-v1") {
      const ownerId = response.headers.get("x-night-report-owner");
      if (!ownerId || (qualification?.storage === "local-owner-poc-v1" && ownerId !== qualification.ownerId)) throw new Error("night_report_owner_unconfirmed");
      const saved = await readback(request, ownerId, signal);
      if (JSON.stringify(saved) !== JSON.stringify(value)) throw new Error("night_report_readback_unconfirmed");
    }
    checkSignal(signal);
    return value;
  };
  const load = (raw: NightReportContext, signal?: AbortSignal): Promise<NightReport> => {
    const input = JSON.parse(JSON.stringify(raw)) as NightReportContext;
    const identity = nightReportRequestIdentity({ ...input, requestId: "context" });
    if (!baseUrl) return Promise.reject(new Error("night_report_api_base_url_missing"));
    const active = inFlight.get(identity);
    if (active) return active.signal?.aborted
      ? active.work.catch(() => undefined).then(() => load(input, signal)) : active.work;
    const owner = createPendingApiCommand<Attempt, NightReport>({
      storage, storageKey: `starward-night-report-pending-v1:${baseUrl}:${identity}`, newKey,
      parse(value) {
        const attempt = value as Attempt;
        const request = assertNightReportRequest({ ...attempt?.input, requestId: attempt?.idempotencyKey });
        if (nightReportRequestIdentity({ ...request, requestId: "context" }) !== identity) throw new Error("night_report_pending_context_mismatch");
        // Old WIP records have no provable original owner. Keep them unknown;
        // even a current owner's same-key receipt cannot supply that history.
        const qualification = attempt.qualification ?? { storage: "unknown" as const };
        if (!["unknown", "ephemeral", "local-owner-poc-v1"].includes(qualification.storage) || (qualification.storage === "local-owner-poc-v1" && !qualification.ownerId?.trim())) throw new Error("night_report_pending_qualification_invalid");
        return { ...attempt, qualification };
      },
      error: reason => new Error(`night_report_${reason}`),
      canDiscard: (error, retry) => !retry && error instanceof NightReportRequestError && error.rejected,
      async dispatch(attempt, retry) {
        const request = { ...attempt.input, requestId: attempt.idempotencyKey };
        const required = attempt.qualification;
        if (retry && required.storage !== "ephemeral") {
          const current = await qualify(signal);
          if (current.storage !== "local-owner-poc-v1" || (required.storage === "local-owner-poc-v1" && required.ownerId !== current.ownerId)) {
            const temporary = await send({ ...attempt.input, requestId: newKey() }, signal, { schemaVersion: "starward-night-report-session-v1", storage: "ephemeral" });
            throw new TemporaryReport(temporary);
          }
          if (required.storage === "unknown") {
            const temporary = await send({ ...attempt.input, requestId: newKey() }, signal, { schemaVersion: "starward-night-report-session-v1", storage: "ephemeral" });
            throw new TemporaryReport(temporary);
          }
        }
        if (required.storage === "unknown") throw new Error("night_report_original_attempt_unconfirmed");
        return send(request, signal, required);
      },
    });
    const work = (async () => {
      try {
        if (await owner.pending()) return await owner.retry();
        const qualification = await qualify(signal);
        return await owner.command({ input, qualification });
      } catch (error) { if (error instanceof TemporaryReport) return error.report; throw error; }
    })();
    inFlight.set(identity, { work, signal });
    void work.finally(() => { if (inFlight.get(identity)?.work === work) inFlight.delete(identity); }).catch(() => undefined);
    return work;
  };
  // Legacy direct callers still receive a valid ephemeral v1 report, with no
  // claim that it confirms a saved pending command.
  return { create: (request, signal) => send(request, signal), load };
}
