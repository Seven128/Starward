import { isObservingNight, normalizeUtcMoment } from "../../../contracts/src/observing-time";

/** Private, user-written notes. These snapshots do not attest a visit or publish a report. */
export interface FieldReportContext {
  revision: number;
  observingNight: string;
  moment: string;
  timezone: string;
  target: string;
  profileId: string;
  profileRevision: number | null;
}
export interface FieldReportInput {
  observedAt: string;
  place: { label: string; spotId?: string };
  category: "sky" | "weather" | "access" | "other";
  note: string;
  context: FieldReportContext;
}
export interface FieldReportDraft {
  schemaVersion: "starward-field-report-draft-v1";
  id: string;
  ownerId: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  input: FieldReportInput;
  visibility: "private";
  publication: "not-submitted";
}
export type FieldReportCommand = {
  command: "create-report-draft";
  idempotencyKey: string;
  input: FieldReportInput;
} | {
  command: "update-report-draft";
  idempotencyKey: string;
  reportId: string;
  baseRevision: number;
  input: FieldReportInput;
};
export interface FieldReportResult {
  schemaVersion: "starward-field-reports-v2";
  status: "saved";
  replayed: boolean;
  report: FieldReportDraft;
  receipt: { idempotencyKey: string; reportId: string; revision: number; committedAt: string };
}
export interface FieldReportLibrary {
  schemaVersion: "starward-field-reports-v2";
  items: FieldReportDraft[];
  nextCursor: string | null;
  scope: "local-owner-poc";
}
export class FieldReportValidationError extends Error {
  constructor(readonly code = "invalid_field_report") { super(code); }
}
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new FieldReportValidationError();
  if (Object.keys(value).some(key => !keys.includes(key))) throw new FieldReportValidationError("unexpected_field_report_field");
  return value as Record<string, unknown>;
}
function text(value: unknown, multiline = false): string {
  if (typeof value !== "string" || !value.trim() || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u : /[\u0000-\u001f]/u).test(value)) throw new FieldReportValidationError();
  // The HTTP boundary already owns its request budget. Preserve user content
  // and identity bytes rather than impose an unrelated per-field truncation.
  return value;
}
function revision(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new FieldReportValidationError();
  return value;
}
function moment(value: unknown): string {
  const result = typeof value === "string" ? normalizeUtcMoment(value) : null;
  if (!result) throw new FieldReportValidationError("invalid_field_report_time");
  return result;
}
export function parseFieldReportInput(value: unknown): FieldReportInput {
  const input = record(value, ["observedAt", "place", "category", "note", "context"]);
  const place = record(input.place, ["label", "spotId"]);
  const context = record(input.context, ["revision", "observingNight", "moment", "timezone", "target", "profileId", "profileRevision"]);
  const observingNight = text(context.observingNight), timezone = text(context.timezone);
  if (!isObservingNight(observingNight)) throw new FieldReportValidationError("invalid_field_report_time");
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); } catch { throw new FieldReportValidationError("invalid_field_report_timezone"); }
  if (typeof input.category !== "string" || !["sky", "weather", "access", "other"].includes(input.category)) throw new FieldReportValidationError();
  return {
    observedAt: moment(input.observedAt),
    // No device fix or coordinate grant is inferred from a label or selected spot.
    place: { label: text(place.label), ...(place.spotId === undefined ? {} : { spotId: text(place.spotId) }) },
    category: input.category as FieldReportInput["category"], note: text(input.note, true),
    context: { revision: revision(context.revision), observingNight, moment: moment(context.moment), timezone, target: text(context.target), profileId: text(context.profileId), profileRevision: context.profileRevision === null ? null : revision(context.profileRevision) },
  };
}
export function parseFieldReportCommand(value: unknown): FieldReportCommand {
  const command = record(value, ["command", "idempotencyKey", "input", "reportId", "baseRevision"]);
  const idempotencyKey = text(command.idempotencyKey);
  if (command.command === "create-report-draft" && command.reportId === undefined && command.baseRevision === undefined) return { command: "create-report-draft", idempotencyKey, input: parseFieldReportInput(command.input) };
  if (command.command === "update-report-draft") return { command: "update-report-draft", idempotencyKey, reportId: text(command.reportId), baseRevision: revision(command.baseRevision), input: parseFieldReportInput(command.input) };
  throw new FieldReportValidationError("invalid_field_report_command");
}
