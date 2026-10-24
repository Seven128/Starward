import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { FieldReportValidationError, parseFieldReportCommand, parseFieldReportInput, type FieldReportCommand, type FieldReportDraft, type FieldReportLibrary, type FieldReportResult } from "../../../../packages/domain/src/offline/field-reports";
import type { CommandInput, PendingCommandStorage } from "./pending-api-command";
import { createOwnerQualifiedApiCommand } from "./owner-qualified-api-command";
import { createPrivateOwnerObservation } from "./private-owner-observation";
import { isPrivateCommandOwnerQualification } from "../../../../packages/contracts/src/private-command-owner";
export type { FieldReportDraft, FieldReportInput } from "../../../../packages/domain/src/offline/field-reports";
export type FieldReportCommandInput = CommandInput<FieldReportCommand>;

// Only these failures arise after the transaction proved this key had no receipt.
const receiptCheckedRejections = new Set(["field_report_revision_conflict", "field_report_not_found"]);
const rejectedCodes = new Set(["invalid_field_report", "unexpected_field_report_field", "invalid_field_report_time", "invalid_field_report_timezone", "invalid_field_report_command", "field_report_request_body_too_large", ...receiptCheckedRejections]);
export class FieldReportRequestError extends Error {
  constructor(readonly code: string, readonly rejected = false, readonly statusCode?: number, readonly expectedOwnerId?: string) { super(code); }
}
export function createFieldReportsClient(options: { baseUrl?: string; fetcher?: typeof fetch; storage?: PendingCommandStorage; newKey?: () => string } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL, fetcher = options.fetcher ?? fetch;
  const observation = createPrivateOwnerObservation();
  const request = async <T>(path: string, init?: RequestInit, expectedOwnerId?: string): Promise<T> => {
    if (!baseUrl) throw new FieldReportRequestError("field_report_api_base_url_missing");
    const startedAt = observation.authority();
    const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}${path}`, { ...init, headers: { accept: "application/json", "content-type": "application/json", ...init?.headers,
      ...(expectedOwnerId ? { "x-private-command-owner": expectedOwnerId } : {}) } });
    if (!response.ok) observation.deny(response.status, startedAt, expectedOwnerId);
    let value;
    try { value = await response.json(); }
    catch { throw new FieldReportRequestError(response.ok ? "field_report_response_invalid" : `field_report_http_${response.status}`, false, response.status, expectedOwnerId); }
    if (!response.ok) {
      throw new FieldReportRequestError(value?.code ?? `field_report_http_${response.status}`, value?.outcome === "rejected" && rejectedCodes.has(value?.code), response.status, expectedOwnerId);
    }
    if (value?.schemaVersion !== "starward-field-reports-v2") throw new FieldReportRequestError("field_report_response_invalid", false, response.status, expectedOwnerId);
    return value as T;
  };
  const validate = (value: FieldReportDraft, id: string) => {
    if (value?.id !== id || value.schemaVersion !== "starward-field-report-draft-v1" || !Number.isSafeInteger(value.revision) || value.revision < 1 || value.visibility !== "private" || value.publication !== "not-submitted" || typeof value.ownerId !== "string" || !value.ownerId) throw new FieldReportRequestError("field_report_response_invalid");
    try { parseFieldReportInput(value.input); } catch { throw new FieldReportRequestError("field_report_response_invalid"); }
    return value;
  };
  const readCurrent = async (id: string, signal?: AbortSignal, expectedOwnerId?: string) => {
    const value = validate((await request<{ report: FieldReportDraft }>(`/v2/field-reports/${encodeURIComponent(id)}`, { signal }, expectedOwnerId)).report, id);
    if (expectedOwnerId && value.ownerId !== expectedOwnerId) throw new FieldReportRequestError("field_report_readback_unconfirmed");
    return value;
  };
  const get = async (id: string, signal?: AbortSignal, expectedOwnerId = observation.currentOwner()) => {
    const value = await readCurrent(id, signal, expectedOwnerId);
    if (expectedOwnerId && !observation.canPublish(value)) throw new FieldReportRequestError("field_report_owner_changed");
    return value;
  };
  const list = async (signal?: AbortSignal, cursor?: string, expectedOwnerId = cursor ? observation.currentOwner() : undefined) => {
    const token = observation.begin();
    let page: FieldReportLibrary;
    try { page = await request<FieldReportLibrary>(`/v2/field-reports${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { signal }, expectedOwnerId); }
    catch (error) { if (error instanceof FieldReportRequestError && error.statusCode === 200) observation.unconfirm(token); throw error; }
    if (!Array.isArray(page.items) || page.scope !== "local-owner-poc" || !isPrivateCommandOwnerQualification(page.ownerQualification)) {
      observation.unconfirm(token); throw new FieldReportRequestError("field_report_owner_unconfirmed");
    }
    try { page.items.forEach(item => { validate(item, item?.id); if (item.ownerId !== page.ownerQualification!.ownerId) throw new FieldReportRequestError("field_report_response_invalid"); }); }
    catch (error) { observation.unconfirm(token); throw error; }
    if (!observation.accept(page.ownerQualification.ownerId, token, expectedOwnerId)) throw new FieldReportRequestError("field_report_owner_changed");
    return page;
  };
  const owner = createOwnerQualifiedApiCommand<FieldReportCommand, FieldReportDraft, "starward-private-command-owner-v1">({
    schemaVersion: "starward-private-command-owner-v1",
    storage: options.storage ?? AsyncStorage, storageKey: `starward-field-report-pending-v2:${baseUrl ?? "unconfigured"}`, newKey: options.newKey ?? randomUUID,
    parseCommand: value => { parseFieldReportCommand(value); return value as FieldReportCommand; },
    currentOwner: observation.currentOwner,
    qualify: async (command, expectedOwnerId) => {
      try { parseFieldReportCommand(command); } catch (error) { throw new FieldReportRequestError(error instanceof FieldReportValidationError ? error.code : "invalid_field_report_command", true); }
      return (await list(undefined, undefined, expectedOwnerId)).ownerQualification!.ownerId;
    },
    error: reason => new FieldReportRequestError(`field_report_${reason}`),
    canDiscard: error => error instanceof FieldReportRequestError && error.rejected,
    dispatch: async (command, retry, originalOwnerId) => {
      let result: FieldReportResult;
      try { result = await request<FieldReportResult>("/v2/field-reports/commands", { method: "POST", body: JSON.stringify(command) }, originalOwnerId); }
      catch (error) {
        // A retry rejected before receipt lookup cannot prove whether the old
        // request committed. Retain its full original bytes and key.
        if (retry && error instanceof FieldReportRequestError && error.rejected && !receiptCheckedRejections.has(error.code)) throw new FieldReportRequestError(error.code, false, error.statusCode, originalOwnerId);
        throw error;
      }
      if (result.status !== "saved" || !result.receipt || result.receipt.idempotencyKey !== command.idempotencyKey || result.report?.id !== result.receipt.reportId
        || result.report.revision !== result.receipt.revision || command.command !== "create-report-draft" && result.report.id !== command.reportId) throw new FieldReportRequestError("field_report_response_invalid");
      validate(result.report, result.receipt.reportId);
      if (result.report.ownerId !== originalOwnerId) throw new FieldReportRequestError("field_report_readback_unconfirmed");
      if (JSON.stringify(parseFieldReportInput(result.report.input)) !== JSON.stringify(parseFieldReportInput(command.input))) throw new FieldReportRequestError("field_report_receipt_input_mismatch");
      let current: FieldReportDraft;
      try { current = await readCurrent(result.report.id, undefined, originalOwnerId); } catch { throw new FieldReportRequestError("field_report_readback_unconfirmed"); }
      if (current.revision < result.receipt.revision) throw new FieldReportRequestError("field_report_readback_incomplete");
      return current;
    },
  });
  return {
    ...owner, get, list, authority: observation.authority, subscribeAuthority: observation.subscribeAuthority, canPublish: observation.canPublish,
    canPublishLibrary: (page: FieldReportLibrary) => !!page.ownerQualification && observation.canPublish(page.ownerQualification),
    command: (input: FieldReportCommandInput, expectedOwnerId = observation.currentOwner()) => baseUrl ? owner.command(input, expectedOwnerId) : Promise.reject(new FieldReportRequestError("field_report_api_base_url_missing")),
  };
}
