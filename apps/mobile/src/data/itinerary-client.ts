import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import type { ItineraryDraft, ItineraryDraftCommand, ItineraryDraftLibrary, ItineraryDraftResult } from "../../../../packages/domain/src/itinerary/draft";
import { createPendingApiCommand, type PendingCommandStorage } from "./pending-api-command";
export type { ItineraryDraft, ItineraryDraftCommand, ItineraryDraftInputs, ItineraryDraftLibrary } from "../../../../packages/domain/src/itinerary/draft";
export type ItineraryCommandInput = ItineraryDraftCommand extends infer T ? T extends { idempotencyKey: string } ? Omit<T, "idempotencyKey"> : never : never;
// Only mutate's rejections follow an absent actor/key receipt. Input parsing
// and HTTP limits precede that lookup and say nothing about an earlier attempt.
const receiptCheckedRejections = new Set(["itinerary_invalid_timeline", "itinerary_stages_require_review", "itinerary_revision_conflict"]);
const nonCommittingCodes = new Set(["invalid_itinerary_input", "unexpected_itinerary_field", "invalid_itinerary_stages", "invalid_itinerary_timezone", "empty_itinerary_patch", "invalid_itinerary_command", "itinerary_collaboration_unavailable", "itinerary_request_body_too_large", ...receiptCheckedRejections]);
export class ItineraryRequestError extends Error {
  constructor(readonly code: string, readonly rejected = false) { super(code); }
}

export function createItineraryClient(options: { baseUrl?: string; fetcher?: typeof fetch; storage?: PendingCommandStorage; newKey?: () => string } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL;
  const fetcher = options.fetcher ?? fetch;
  const storage = options.storage ?? AsyncStorage;
  const key = `starward-itinerary-pending-v2:${baseUrl ?? "unconfigured"}`;
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    if (!baseUrl) throw new ItineraryRequestError("itinerary_api_base_url_missing");
    const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}${path}`, { ...init, headers: { accept: "application/json", "content-type": "application/json", ...init?.headers } });
    const value = await response.json();
    if (!response.ok) throw new ItineraryRequestError(value.code ?? `itinerary_http_${response.status}`, value.outcome === "rejected" && nonCommittingCodes.has(value.code));
    if (value.schemaVersion !== "starward-itinerary-v2") throw new ItineraryRequestError("itinerary_response_invalid");
    return value as T;
  };
  const parsePending = (value: unknown): ItineraryDraftCommand => {
    const command = value as ItineraryDraftCommand;
    if (!command.idempotencyKey || !["create-draft", "patch-draft"].includes(command.command)
      || command.command === "create-draft" && (typeof command.input?.title !== "string" || typeof command.input?.inputs?.date !== "string")
      || command.command === "patch-draft" && (typeof command.itineraryId !== "string" || !Number.isSafeInteger(command.baseRevision) || !command.patch)) throw new ItineraryRequestError("itinerary_pending_invalid");
    return command;
  };
  const get = async (id: string, signal?: AbortSignal) => {
    const value = (await request<{ itinerary: ItineraryDraft }>(`/v2/itineraries/${encodeURIComponent(id)}`, { signal })).itinerary;
    if (value?.id !== id || value.schemaVersion !== "starward-itinerary-draft-v1" || !Number.isSafeInteger(value.revision) || value.revision < 1) throw new ItineraryRequestError("itinerary_response_invalid");
    return value;
  };
  const send = async (command: ItineraryDraftCommand, retry = false): Promise<ItineraryDraft> => {
    let result: ItineraryDraftResult;
    try {
      result = await request<ItineraryDraftResult>("/v2/itineraries/commands", { method: "POST", body: JSON.stringify(command) });
    } catch (error) {
      // A parser refusal only proves that this HTTP request did not execute.
      // A persisted retry may already have committed before a lost reply or a
      // changed server limit; do not discard its original key or show "unsaved".
      if (retry && error instanceof ItineraryRequestError && error.rejected && !receiptCheckedRejections.has(error.code)) throw new ItineraryRequestError(error.code);
      throw error;
    }
    if (result.status !== "saved" || result.receipt.idempotencyKey !== command.idempotencyKey || result.itinerary.id !== result.receipt.itineraryId || command.command === "patch-draft" && result.itinerary.id !== command.itineraryId) throw new ItineraryRequestError("itinerary_response_invalid");
    // A replay contains this command's historical result. A failed/rejected
    // readback cannot undo a committed effect: keep the original retry identity.
    let current: ItineraryDraft;
    try { current = await get(result.itinerary.id); } catch { throw new ItineraryRequestError("itinerary_readback_unconfirmed"); }
    if (current.revision < result.receipt.revision) throw new ItineraryRequestError("itinerary_readback_incomplete");
    return current;
  };
  const owner = createPendingApiCommand<ItineraryDraftCommand, ItineraryDraft>({ storage, storageKey: key, newKey: options.newKey ?? randomUUID, parse: parsePending, error: reason => new ItineraryRequestError(`itinerary_${reason}`), dispatch: send, canDiscard: error => error instanceof ItineraryRequestError && error.rejected });
  return {
    pending: owner.pending, get,
    list: (signal?: AbortSignal, cursor?: string) => request<ItineraryDraftLibrary>(`/v2/itineraries${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { signal }),
    command: (input: ItineraryCommandInput) => {
      if (!baseUrl) return Promise.reject(new ItineraryRequestError("itinerary_api_base_url_missing"));
      return owner.command(input);
    },
    retry: owner.retry,
  };
}
