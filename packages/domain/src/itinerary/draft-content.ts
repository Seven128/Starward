import { isObservingNight, normalizeUtcMoment } from "../../../contracts/src/observing-time";
import type { ItineraryDraft, ItineraryDraftCommand, ItineraryDraftEditableContent, ItineraryDraftInputs } from "./draft";
import { validateTimeline } from "./index";

export const itineraryDraftEditableFields = { title: true, inputs: true, stages: true } satisfies Record<keyof ItineraryDraftEditableContent, true>;
export const itineraryDraftInputFields = {
  date: true, origin: true, people: true, transport: true, target: true, userType: true,
  latestReturnLocal: true, overnight: true, collaborative: true,
} satisfies Record<keyof ItineraryDraftInputs, true>;
export type ItineraryDraftContentField = "title" | `inputs.${keyof ItineraryDraftInputs}` | "stages";
export type ItineraryDraftContentRevision = ItineraryDraftEditableContent & Pick<ItineraryDraft, "id" | "ownerId" | "revision" | "timezone">;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === "string" && !!value.trim() && !/[\u0000-\u001f]/u.test(value);
const instant = (value: unknown): value is string => typeof value === "string" && normalizeUtcMoment(value) !== null;
const integer = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 1;

/** Qualify the identity and complete supported editable content before preview or
 * restore. Unrecognized editable fields/stages require a compatible client. */
export function isRestorableItineraryRevision(value: unknown, expected: { id: string; ownerId: string; revision: number }): value is ItineraryDraft {
  if (!object(value) || value.schemaVersion !== "starward-itinerary-draft-v1" || !nonempty(value.id) || !nonempty(value.ownerId) || value.id !== expected.id || value.ownerId !== expected.ownerId
    || value.revision !== expected.revision || !integer(value.revision) || !integer(value.sequence) || !nonempty(value.title)
    || typeof value.timezone !== "string" || !instant(value.updatedAt) || !instant(value.createdAt) || value.state !== "draft") return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value.timezone }).format(); } catch { return false; }
  return isSupportedItineraryDraftContent(value);
}

function isSupportedItineraryDraftContent(value: Record<string, unknown>): boolean {
  if (!nonempty(value.title)) return false;
  const input = value.inputs;
  if (!object(input) || Object.keys(input).length !== Object.keys(itineraryDraftInputFields).length || Object.keys(input).some(key => !Object.hasOwn(itineraryDraftInputFields, key))
    || typeof input.date !== "string" || !isObservingNight(input.date) || !nonempty(input.origin) || !integer(input.people)
    || typeof input.transport !== "string" || !["drive", "walk", "mixed"].includes(input.transport) || !nonempty(input.target) || !nonempty(input.userType)
    || input.latestReturnLocal !== null && (typeof input.latestReturnLocal !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/u.test(input.latestReturnLocal))
    || typeof input.overnight !== "boolean" || input.collaborative !== false || !Array.isArray(value.stages)) return false;
  const ids = new Set<string>();
  for (const stage of value.stages) {
    if (!object(stage) || Object.keys(stage).length !== 4 || Object.keys(stage).some(key => !["id", "kind", "startsAt", "endsAt"].includes(key))
      || !nonempty(stage.id) || ids.has(stage.id) || typeof stage.kind !== "string" || !["departure", "scouting", "observation", "return"].includes(stage.kind)
      || !instant(stage.startsAt) || !instant(stage.endsAt) || Date.parse(stage.startsAt) >= Date.parse(stage.endsAt)) return false;
    ids.add(stage.id);
  }
  return validateTimeline(value.stages as ItineraryDraft["stages"]).valid;
}

export function projectItineraryDraftContent(draft: ItineraryDraftEditableContent): ItineraryDraftEditableContent {
  return { title: draft.title, inputs: { ...draft.inputs }, stages: draft.stages.map(stage => ({ ...stage })) };
}

export function snapshotItineraryDraftContentRevision(draft: ItineraryDraftContentRevision): ItineraryDraftContentRevision {
  return { id: draft.id, ownerId: draft.ownerId, revision: draft.revision, timezone: draft.timezone, ...projectItineraryDraftContent(draft) };
}

export function compareItineraryDraftContent(current: ItineraryDraftEditableContent, historical: ItineraryDraftEditableContent) {
  const present = projectItineraryDraftContent(current), restored = projectItineraryDraftContent(historical);
  const changedFields: ItineraryDraftContentField[] = [];
  if (present.title !== restored.title) changedFields.push("title");
  for (const key of Object.keys(itineraryDraftInputFields) as Array<keyof ItineraryDraftInputs>) {
    if (present.inputs[key] !== restored.inputs[key]) changedFields.push(`inputs.${key}`);
  }
  // Compare every retained stage property; object serialization order is not a change.
  const sameStages = present.stages.length === restored.stages.length && present.stages.every((stage, index) => {
    const other = restored.stages[index];
    const keys = [...new Set([...Object.keys(stage), ...Object.keys(other)])] as Array<keyof typeof stage>;
    return keys.every(key => stage[key] === other[key]);
  });
  if (!sameStages) changedFields.push("stages");
  return { current: present, historical: restored, changedFields };
}

function requireRestorePair(current: ItineraryDraftContentRevision, historical: ItineraryDraftContentRevision) {
  if (!nonempty(current.id) || !nonempty(current.ownerId) || historical.id !== current.id || historical.ownerId !== current.ownerId
    || historical.timezone !== current.timezone || !integer(current.revision) || !integer(historical.revision) || historical.revision >= current.revision
    || !isSupportedItineraryDraftContent(current as unknown as Record<string, unknown>) || !isSupportedItineraryDraftContent(historical as unknown as Record<string, unknown>)) throw new TypeError("itinerary_history_incompatible");
}

/** The selected immutable version and compared base are the complete wire intent.
 * Its legal stored content need not fit into one new command request body. */
export function itineraryDraftRestoreInput(current: ItineraryDraftContentRevision, historical: ItineraryDraftContentRevision): Omit<Extract<ItineraryDraftCommand, { command: "restore-draft" }>, "idempotencyKey"> {
  requireRestorePair(current, historical);
  return { command: "restore-draft", itineraryId: current.id, baseRevision: current.revision, sourceRevision: historical.revision };
}

/** Server-side resolution uses the same supported content/identity rule as the
 * preview, after loading this exact version under the trusted actor. */
export function itineraryDraftRestoreContent(current: ItineraryDraftContentRevision, historical: ItineraryDraftContentRevision): ItineraryDraftEditableContent {
  requireRestorePair(current, historical);
  return projectItineraryDraftContent(historical);
}
