import { isObservingNight, normalizeUtcMoment } from "../../../../../packages/contracts/src/observing-time";
import type { ItineraryStage } from "../../../../../packages/domain/src/itinerary/index";
import type { ItineraryDraftCommand, ItineraryDraftInputs } from "../../../../../packages/domain/src/itinerary/draft";
import { itineraryDraftEditableFields, itineraryDraftInputFields } from "../../../../../packages/domain/src/itinerary/draft-content";

export class ItineraryCommandError extends Error {
  constructor(readonly code: string, readonly statusCode = 400, readonly details?: Record<string, unknown>) { super(code); }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ItineraryCommandError("invalid_itinerary_input");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new ItineraryCommandError("unexpected_itinerary_field");
}
function text(value: unknown): string {
  // The host's existing 64-KiB body limit bounds input size; no new product
  // title/key/participant/stage cap is introduced by this draft path.
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f]/u.test(value)) throw new ItineraryCommandError("invalid_itinerary_input");
  return value.trim();
}
function integer(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new ItineraryCommandError("invalid_itinerary_input");
  return value;
}
function inputs(value: unknown): ItineraryDraftInputs {
  const input = object(value);
  keys(input, Object.keys(itineraryDraftInputFields));
  if (typeof input.date !== "string" || !isObservingNight(input.date) || typeof input.transport !== "string" || !["drive", "walk", "mixed"].includes(input.transport)
    || typeof input.overnight !== "boolean" || input.collaborative !== false
    || input.latestReturnLocal !== null && (typeof input.latestReturnLocal !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/u.test(input.latestReturnLocal))) {
    throw new ItineraryCommandError(input.collaborative === true ? "itinerary_collaboration_unavailable" : "invalid_itinerary_input");
  }
  return { date: input.date, origin: text(input.origin), people: integer(input.people, 1), transport: input.transport as ItineraryDraftInputs["transport"], target: text(input.target), userType: text(input.userType), latestReturnLocal: input.latestReturnLocal as string | null, overnight: input.overnight, collaborative: false };
}
function stages(value: unknown): ItineraryStage[] {
  if (!Array.isArray(value)) throw new ItineraryCommandError("invalid_itinerary_stages");
  const ids = new Set<string>();
  return value.map(item => {
    const stage = object(item);
    keys(stage, ["id", "kind", "startsAt", "endsAt"]);
    const id = text(stage.id);
    // Computed twilight/moon/target windows require a qualified astronomy source.
    if (ids.has(id) || typeof stage.kind !== "string" || !["departure", "scouting", "observation", "return"].includes(stage.kind)) throw new ItineraryCommandError("invalid_itinerary_stages");
    const startsAt = typeof stage.startsAt === "string" ? normalizeUtcMoment(stage.startsAt) : null;
    const endsAt = typeof stage.endsAt === "string" ? normalizeUtcMoment(stage.endsAt) : null;
    if (!startsAt || !endsAt) throw new ItineraryCommandError("invalid_itinerary_stages");
    ids.add(id);
    return { id, kind: stage.kind as ItineraryStage["kind"], startsAt, endsAt };
  });
}

export function parseItineraryDraftCommand(value: unknown): ItineraryDraftCommand {
  const command = object(value);
  const idempotencyKey = text(command.idempotencyKey);
  if (command.command === "create-draft") {
    keys(command, ["command", "idempotencyKey", "input"]);
    const input = object(command.input);
    keys(input, ["title", "timezone", "inputs"]);
    const timezone = text(input.timezone);
    try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); } catch { throw new ItineraryCommandError("invalid_itinerary_timezone"); }
    return { command: "create-draft", idempotencyKey, input: { title: text(input.title), timezone, inputs: inputs(input.inputs) } };
  }
  if (command.command === "patch-draft") {
    keys(command, ["command", "idempotencyKey", "itineraryId", "baseRevision", "patch"]);
    const patch = object(command.patch);
    keys(patch, Object.keys(itineraryDraftEditableFields));
    if (!Object.keys(patch).length) throw new ItineraryCommandError("empty_itinerary_patch");
    return { command: "patch-draft", idempotencyKey, itineraryId: text(command.itineraryId), baseRevision: integer(command.baseRevision, 1), patch: {
      ...(patch.title === undefined ? {} : { title: text(patch.title) }),
      ...(patch.inputs === undefined ? {} : { inputs: inputs(patch.inputs) }),
      ...(patch.stages === undefined ? {} : { stages: stages(patch.stages) }),
    } };
  }
  if (command.command === "restore-draft") {
    keys(command, ["command", "idempotencyKey", "itineraryId", "baseRevision", "sourceRevision"]);
    return { command: "restore-draft", idempotencyKey, itineraryId: text(command.itineraryId), baseRevision: integer(command.baseRevision, 1), sourceRevision: integer(command.sourceRevision, 1) };
  }
  throw new ItineraryCommandError("invalid_itinerary_command");
}
