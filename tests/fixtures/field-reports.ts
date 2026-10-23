import type { FieldReportDraft, FieldReportInput, FieldReportResult } from "../../packages/domain/src/offline/field-reports";
/** Synthetic user-written inputs; never an observed product place or weather fact. */
export function fieldReportInput(): FieldReportInput {
  return { observedAt: "2026-10-24T13:24:35.000Z", place: { label: "用户输入的测试地点", spotId: "synthetic-selected-spot" }, category: "sky", note: "西侧云层增多\n尚未测量云量。", context: { revision: 12, observingNight: "2026-10-24", moment: "2026-10-24T13:24:35.000Z", timezone: "Asia/Shanghai", target: "moon", profileId: "user-profile", profileRevision: 3 } };
}
export function savedFieldReport(revision = 1, input = fieldReportInput()): FieldReportDraft {
  return { schemaVersion: "starward-field-report-draft-v1", id: "private-note-a", ownerId: "local-owner", revision, createdAt: "2026-10-24T13:25:00.000Z", updatedAt: "2026-10-24T13:26:00.000Z", input, visibility: "private", publication: "not-submitted" };
}
export function fieldReportResult(key: string, report = savedFieldReport()): FieldReportResult {
  return { schemaVersion: "starward-field-reports-v2", status: "saved", replayed: false, report, receipt: { idempotencyKey: key, reportId: report.id, revision: report.revision, committedAt: report.updatedAt } };
}
