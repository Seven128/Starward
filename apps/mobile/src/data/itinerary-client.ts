import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import type { ItineraryDraft, ItineraryDraftCommand, ItineraryDraftHistory, ItineraryDraftLibrary, ItineraryDraftResult } from "../../../../packages/domain/src/itinerary/draft";
import { isRestorableItineraryRevision } from "../../../../packages/domain/src/itinerary/draft-content";
import { normalizeUtcMoment } from "../../../../packages/contracts/src/observing-time";
import type { PendingCommandStorage } from "./pending-api-command";
import { createOwnerQualifiedApiCommand } from "./owner-qualified-api-command";
import { createPrivateOwnerObservation } from "./private-owner-observation";
import { isPrivateCommandOwnerQualification } from "../../../../packages/contracts/src/private-command-owner";
export type { ItineraryDraft, ItineraryDraftCommand, ItineraryDraftInputs, ItineraryDraftHistory, ItineraryDraftLibrary } from "../../../../packages/domain/src/itinerary/draft";
export type ItineraryCommandInput = ItineraryDraftCommand extends infer T ? T extends { idempotencyKey: string } ? Omit<T, "idempotencyKey"> : never : never;
// Only mutate's rejections follow an absent actor/key receipt. Input parsing
// and HTTP limits precede that lookup and say nothing about an earlier attempt.
const receiptCheckedRejections = new Set(["itinerary_invalid_timeline", "itinerary_stages_require_review", "itinerary_revision_conflict"]);
const restoreReceiptRejections = new Set(["itinerary_restore_source_not_found", "itinerary_restore_source_incompatible"]);
const nonCommittingCodes = new Set(["invalid_itinerary_input", "unexpected_itinerary_field", "invalid_itinerary_stages", "invalid_itinerary_timezone", "empty_itinerary_patch", "invalid_itinerary_command", "itinerary_collaboration_unavailable", "itinerary_request_body_too_large", ...receiptCheckedRejections, ...restoreReceiptRejections]);
export class ItineraryRequestError extends Error {
  constructor(readonly code: string, readonly rejected = false, readonly statusCode?: number, readonly expectedOwnerId?: string) { super(code); }
}

export function createItineraryClient(options: { baseUrl?: string; fetcher?: typeof fetch; storage?: PendingCommandStorage; newKey?: () => string } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL;
  const fetcher = options.fetcher ?? fetch;
  const storage = options.storage ?? AsyncStorage;
  const key = `starward-itinerary-pending-v2:${baseUrl ?? "unconfigured"}`;
  const observation = createPrivateOwnerObservation();
  const request = async <T>(path: string, init?: RequestInit, expectedOwnerId?: string): Promise<T> => {
    if (!baseUrl) throw new ItineraryRequestError("itinerary_api_base_url_missing");
    const startedAt = observation.authority();
    const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}${path}`, { ...init, headers: { accept: "application/json", "content-type": "application/json", ...init?.headers,
      ...(expectedOwnerId ? { "x-private-command-owner": expectedOwnerId } : {}) } });
    if (!response.ok) observation.deny(response.status, startedAt, expectedOwnerId);
    let value;
    try { value = await response.json(); }
    catch { throw new ItineraryRequestError(response.ok ? "itinerary_response_invalid" : `itinerary_http_${response.status}`, false, response.status, expectedOwnerId); }
    if (!response.ok) {
      throw new ItineraryRequestError(value?.code ?? `itinerary_http_${response.status}`, value?.outcome === "rejected" && nonCommittingCodes.has(value?.code), response.status, expectedOwnerId);
    }
    if (value?.schemaVersion !== "starward-itinerary-v2") throw new ItineraryRequestError("itinerary_response_invalid", false, response.status, expectedOwnerId);
    return value as T;
  };
  const parsePending = (value: unknown): ItineraryDraftCommand => {
    const command = value as ItineraryDraftCommand;
    if (!command.idempotencyKey || !["create-draft", "patch-draft", "restore-draft"].includes(command.command)
      || command.command === "create-draft" && (typeof command.input?.title !== "string" || typeof command.input?.inputs?.date !== "string")
      || command.command === "patch-draft" && (typeof command.itineraryId !== "string" || !Number.isSafeInteger(command.baseRevision) || !command.patch)
      || command.command === "restore-draft" && (typeof command.itineraryId !== "string" || !Number.isSafeInteger(command.baseRevision) || command.baseRevision < 1 || !Number.isSafeInteger(command.sourceRevision) || command.sourceRevision < 1)) throw new ItineraryRequestError("itinerary_pending_invalid");
    return command;
  };
  const readCurrent = async (id: string, signal?: AbortSignal, expectedOwnerId?: string) => {
    const value = (await request<{ itinerary: ItineraryDraft }>(`/v2/itineraries/${encodeURIComponent(id)}`, { signal }, expectedOwnerId)).itinerary;
    if (value?.id !== id || value.schemaVersion !== "starward-itinerary-draft-v1" || typeof value.ownerId !== "string" || !value.ownerId.trim()
      || !Number.isSafeInteger(value.revision) || value.revision < 1 || expectedOwnerId && value.ownerId !== expectedOwnerId) throw new ItineraryRequestError("itinerary_response_invalid");
    return value;
  };
  const get = async (id: string, signal?: AbortSignal, expectedOwnerId = observation.currentOwner()) => {
    const value = await readCurrent(id, signal, expectedOwnerId);
    if (expectedOwnerId && !observation.canPublish(value)) throw new ItineraryRequestError("itinerary_owner_changed");
    return value;
  };
  const list = async (signal?: AbortSignal, cursor?: string, expectedOwnerId = cursor ? observation.currentOwner() : undefined) => {
    const token = observation.begin();
    let page: ItineraryDraftLibrary;
    try { page = await request<ItineraryDraftLibrary>(`/v2/itineraries${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { signal }, expectedOwnerId); }
    catch (error) { if (error instanceof ItineraryRequestError && error.statusCode === 200) observation.unconfirm(token); throw error; }
    if (!Array.isArray(page.items) || page.scope !== "local-owner-poc" || !isPrivateCommandOwnerQualification(page.ownerQualification)
      || page.items.some(item => typeof item?.id !== "string" || !item.id || typeof item.title !== "string" || !Number.isSafeInteger(item.revision) || item.revision < 1 || typeof item.updatedAt !== "string")) {
      observation.unconfirm(token); throw new ItineraryRequestError("itinerary_owner_unconfirmed");
    }
    if (!observation.accept(page.ownerQualification.ownerId, token, expectedOwnerId)) throw new ItineraryRequestError("itinerary_owner_changed");
    return page;
  };
  const historyOwner = (expectedOwnerId?: string) => {
    if (!expectedOwnerId || observation.currentOwner() !== expectedOwnerId) throw new ItineraryRequestError("itinerary_owner_unconfirmed");
    return expectedOwnerId;
  };
  const getRevision = async (id: string, revision: number, signal?: AbortSignal, expectedOwnerId = observation.currentOwner()) => {
    const ownerId = historyOwner(expectedOwnerId);
    if (!Number.isSafeInteger(revision) || revision < 1) throw new ItineraryRequestError("invalid_itinerary_revision");
    const value = (await request<{ itinerary: unknown }>(`/v2/itineraries/${encodeURIComponent(id)}/revisions/${revision}`, { signal }, ownerId)).itinerary;
    if (!isRestorableItineraryRevision(value, { id, revision, ownerId })) throw new ItineraryRequestError("itinerary_history_response_invalid");
    if (!observation.canPublish(value)) throw new ItineraryRequestError("itinerary_owner_changed");
    return value;
  };
  const history = async (id: string, signal?: AbortSignal, cursor?: string, expectedOwnerId = observation.currentOwner()) => {
    const ownerId = historyOwner(expectedOwnerId);
    if (cursor !== undefined && (!/^[1-9]\d*$/u.test(cursor) || !Number.isSafeInteger(Number(cursor)))) throw new ItineraryRequestError("invalid_itinerary_cursor");
    const page = await request<ItineraryDraftHistory>(`/v2/itineraries/${encodeURIComponent(id)}/revisions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { signal }, ownerId);
    if (page.itineraryId !== id || page.scope !== "local-owner-poc" || !isPrivateCommandOwnerQualification(page.ownerQualification) || page.ownerQualification.ownerId !== ownerId
      || !Array.isArray(page.items) || page.items.length > 50 || page.items.some((item, index) => !item || !Number.isSafeInteger(item.revision) || item.revision < 1 || !Number.isSafeInteger(item.sequence) || item.sequence < 1
        || typeof item.title !== "string" || !item.title.trim() || typeof item.updatedAt !== "string" || !normalizeUtcMoment(item.updatedAt)
        || cursor !== undefined && item.revision >= Number(cursor) || index > 0 && item.revision >= page.items[index - 1].revision)
      || page.nextCursor !== null && (page.items.length !== 50 || page.nextCursor !== String(page.items.at(-1)!.revision))) throw new ItineraryRequestError("itinerary_history_response_invalid");
    if (!observation.canPublish(page.ownerQualification)) throw new ItineraryRequestError("itinerary_owner_changed");
    return page;
  };
  const send = async (command: ItineraryDraftCommand, retry: boolean, originalOwnerId: string): Promise<ItineraryDraft> => {
    let result: ItineraryDraftResult;
    try {
      result = await request<ItineraryDraftResult>("/v2/itineraries/commands", { method: "POST", body: JSON.stringify(command) }, originalOwnerId);
    } catch (error) {
      // A parser refusal only proves that this HTTP request did not execute.
      // A persisted retry may already have committed before a lost reply or a
      // changed server limit; do not discard its original key or show "unsaved".
      if (retry && error instanceof ItineraryRequestError && error.rejected
        && !receiptCheckedRejections.has(error.code) && !(command.command === "restore-draft" && restoreReceiptRejections.has(error.code))) throw new ItineraryRequestError(error.code, false, error.statusCode, originalOwnerId);
      throw error;
    }
    if (result.status !== "saved" || !result.receipt || result.receipt.idempotencyKey !== command.idempotencyKey || result.itinerary?.id !== result.receipt.itineraryId
      || result.itinerary.revision !== result.receipt.revision || result.itinerary.ownerId !== originalOwnerId || command.command !== "create-draft" && result.itinerary.id !== command.itineraryId) throw new ItineraryRequestError("itinerary_response_invalid");
    // A replay contains this command's historical result. A failed/rejected
    // readback cannot undo a committed effect: keep the original retry identity.
    let current: ItineraryDraft;
    try { current = await readCurrent(result.itinerary.id, undefined, originalOwnerId); } catch { throw new ItineraryRequestError("itinerary_readback_unconfirmed"); }
    if (current.revision < result.receipt.revision) throw new ItineraryRequestError("itinerary_readback_incomplete");
    return current;
  };
  const owner = createOwnerQualifiedApiCommand<ItineraryDraftCommand, ItineraryDraft, "starward-private-command-owner-v1">({
    schemaVersion: "starward-private-command-owner-v1", storage, storageKey: key, newKey: options.newKey ?? randomUUID, parseCommand: parsePending,
    currentOwner: observation.currentOwner,
    qualify: async (_command, expectedOwnerId) => (await list(undefined, undefined, expectedOwnerId)).ownerQualification!.ownerId,
    error: reason => new ItineraryRequestError(`itinerary_${reason}`), dispatch: send, canDiscard: error => error instanceof ItineraryRequestError && error.rejected,
  });
  return {
    pending: owner.pending, get, list, getRevision, history, authority: observation.authority, subscribeAuthority: observation.subscribeAuthority, canPublish: observation.canPublish,
    canPublishLibrary: (page: ItineraryDraftLibrary) => !!page.ownerQualification && observation.canPublish(page.ownerQualification),
    canPublishHistory: (page: ItineraryDraftHistory) => !!page.ownerQualification && observation.canPublish(page.ownerQualification),
    command: (input: ItineraryCommandInput, expectedOwnerId = observation.currentOwner()) => {
      if (!baseUrl) return Promise.reject(new ItineraryRequestError("itinerary_api_base_url_missing"));
      return owner.command(input, expectedOwnerId);
    },
    retry: owner.retry,
  };
}
