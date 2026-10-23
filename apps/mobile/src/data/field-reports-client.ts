import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { parseFieldReportCommand, parseFieldReportInput, type FieldReportCommand, type FieldReportDraft, type FieldReportLibrary, type FieldReportResult } from "../../../../packages/domain/src/offline/field-reports";
import { createPendingApiCommand, type CommandInput, type PendingCommandStorage } from "./pending-api-command";
export type { FieldReportDraft, FieldReportInput } from "../../../../packages/domain/src/offline/field-reports";
export type FieldReportCommandInput = CommandInput<FieldReportCommand>;

// Only these failures arise after the transaction proved this key had no receipt.
const receiptCheckedRejections = new Set(["field_report_revision_conflict", "field_report_not_found"]);
const rejectedCodes = new Set(["invalid_field_report", "unexpected_field_report_field", "invalid_field_report_time", "invalid_field_report_timezone", "invalid_field_report_command", "field_report_request_body_too_large", ...receiptCheckedRejections]);
export class FieldReportRequestError extends Error {
  constructor(readonly code: string, readonly rejected = false) { super(code); }
}
export function createFieldReportsClient(options: { baseUrl?: string; fetcher?: typeof fetch; storage?: PendingCommandStorage; newKey?: () => string } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL, fetcher = options.fetcher ?? fetch;
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    if (!baseUrl) throw new FieldReportRequestError("field_report_api_base_url_missing");
    const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}${path}`, { ...init, headers: { accept: "application/json", "content-type": "application/json", ...init?.headers } });
    const value = await response.json();
    if (!response.ok) throw new FieldReportRequestError(value.code ?? `field_report_http_${response.status}`, value.outcome === "rejected" && rejectedCodes.has(value.code));
    if (value.schemaVersion !== "starward-field-reports-v2") throw new FieldReportRequestError("field_report_response_invalid");
    return value as T;
  };
  const validate = (value: FieldReportDraft, id: string) => {
    if (value?.id !== id || value.schemaVersion !== "starward-field-report-draft-v1" || !Number.isSafeInteger(value.revision) || value.revision < 1 || value.visibility !== "private" || value.publication !== "not-submitted" || typeof value.ownerId !== "string" || !value.ownerId) throw new FieldReportRequestError("field_report_response_invalid");
    try { parseFieldReportInput(value.input); } catch { throw new FieldReportRequestError("field_report_response_invalid"); }
    return value;
  };
  const get = async (id: string, signal?: AbortSignal) => validate((await request<{ report: FieldReportDraft }>(`/v2/field-reports/${encodeURIComponent(id)}`, { signal })).report, id);
  const owner = createPendingApiCommand<FieldReportCommand, FieldReportDraft>({
    storage: options.storage ?? AsyncStorage, storageKey: `starward-field-report-pending-v2:${baseUrl ?? "unconfigured"}`, newKey: options.newKey ?? randomUUID,
    parse: value => { try { parseFieldReportCommand(value); } catch { throw new FieldReportRequestError("field_report_pending_invalid"); } return value as FieldReportCommand; },
    error: reason => new FieldReportRequestError(`field_report_${reason}`),
    canDiscard: error => error instanceof FieldReportRequestError && error.rejected,
    dispatch: async (command, retry) => {
      let result: FieldReportResult;
      try { result = await request<FieldReportResult>("/v2/field-reports/commands", { method: "POST", body: JSON.stringify(command) }); }
      catch (error) {
        // A retry rejected before receipt lookup cannot prove whether the old
        // request committed. Retain its full original bytes and key.
        if (retry && error instanceof FieldReportRequestError && error.rejected && !receiptCheckedRejections.has(error.code)) throw new FieldReportRequestError(error.code);
        throw error;
      }
      if (result.status !== "saved" || !result.receipt || result.receipt.idempotencyKey !== command.idempotencyKey || result.report?.id !== result.receipt.reportId
        || result.report.revision !== result.receipt.revision || command.command !== "create-report-draft" && result.report.id !== command.reportId) throw new FieldReportRequestError("field_report_response_invalid");
      validate(result.report, result.receipt.reportId);
      if (JSON.stringify(parseFieldReportInput(result.report.input)) !== JSON.stringify(parseFieldReportInput(command.input))) throw new FieldReportRequestError("field_report_receipt_input_mismatch");
      let current: FieldReportDraft;
      try { current = await get(result.report.id); } catch { throw new FieldReportRequestError("field_report_readback_unconfirmed"); }
      if (current.revision < result.receipt.revision) throw new FieldReportRequestError("field_report_readback_incomplete");
      return current;
    },
  });
  return {
    ...owner, get,
    command: (input: FieldReportCommandInput) => baseUrl ? owner.command(input) : Promise.reject(new FieldReportRequestError("field_report_api_base_url_missing")),
    list: async (signal?: AbortSignal, cursor?: string) => {
      const result = await request<FieldReportLibrary>(`/v2/field-reports${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { signal });
      if (!Array.isArray(result.items) || result.scope !== "local-owner-poc") throw new FieldReportRequestError("field_report_response_invalid");
      result.items.forEach(item => validate(item, item.id));
      return result;
    },
  };
}
