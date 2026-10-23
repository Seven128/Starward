import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
const digest = value => createHash("sha256").update(canonical(value)).digest("hex");
const remaining = [
  "real-offline-component-bytes-license-checksum-resume-atomic-activation-rollback",
  "native-sqlite-first-offline-writes-media-dependencies-conflict-and-replay",
  "device-encryption-retention-revocation-and-migration",
  "parking-fix-accuracy-route-and-confirmed-backup-context-switch",
  "native-safety-permission-timer-background-location-expiry-and-stop",
  "explicit-share-recipient-policy-preview-expiry-revoke-and-real-result",
  "field-weather-astronomy-return-guidance-and-tool-capability-integration",
  "native-red-light-keyboard-tool-continuity-and-device-offline-restart-acceptance",
  "community-submission-moderation-and-publication",
];

/** A private note's database effect supplies no evidence of a verified offline pack or safety service. */
export async function fieldReportDraftPersistenceEvidence(factory) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "starward-field-report-probe-"));
  const owner = { id: "structured-local-owner", scope: "local-owner-poc" };
  const context = { revision: 12, observingNight: "2026-10-24", moment: "2026-10-24T13:24:35.000Z", timezone: "Asia/Shanghai", target: "moon", profileId: "user-profile", profileRevision: 3 };
  const inputs = [
    { observedAt: context.moment, place: { label: "用户明确填写的地点A", spotId: "user-selected-id" }, category: "sky", note: "用户填写：西侧有薄云，尚未测量。", context },
    { observedAt: "2026-10-25T01:02:03.000Z", place: { label: "用户明确填写的地点B" }, category: "access", note: "用户填写的到达记录，不是公开道路事实。", context: { ...context, revision: 13, moment: "2026-10-25T01:02:03.000Z", target: "jupiter" } },
  ];
  const commands = inputs.map((input, index) => ({ command: "create-report-draft", idempotencyKey: `create-${index}`, input }));
  let runtime;
  try {
    runtime = await factory({ dataDir, releaseProfile: { id: "individual-personal-trial", productionTrafficAllowed: false, externalServicesBudgetCny: 200 } });
    const before = runtime.service.list(owner);
    if (before.items.length) return { passes: false, evidence: null };
    const created = commands.map(command => runtime.service.command(owner, command));
    if (created[0].report.id === created[1].report.id || created.some((value, index) => value.status !== "saved" || digest(value.report.input) !== digest(inputs[index]))) return { passes: false, evidence: null };
    const edited = runtime.service.command(owner, { command: "update-report-draft", idempotencyKey: "edit-first", reportId: created[0].report.id, baseRevision: 1, input: { ...inputs[0], note: "用户更正：薄云在西南侧。" } });
    const written = created.map(value => runtime.service.get(owner, value.report.id));
    if (written[0].revision !== 2 || written[0].input.note !== "用户更正：薄云在西南侧。" || written.some(value => value.visibility !== "private" || value.publication !== "not-submitted")) return { passes: false, evidence: null };
    await runtime.close(); runtime = null; runtime = await factory({ dataDir });
    const restored = created.map(value => runtime.service.get(owner, value.report.id));
    const history = runtime.service.get(owner, created[0].report.id, 1), replay = runtime.service.command(owner, commands[0]);
    if (digest(restored) !== digest(written) || digest(history) !== digest(created[0].report) || !replay.replayed || digest(replay.report) !== digest(created[0].report)) return { passes: false, evidence: null };
    let stale = false, changedKey = false;
    try { runtime.service.command(owner, { command: "update-report-draft", idempotencyKey: "stale", reportId: created[0].report.id, baseRevision: 1, input: inputs[1] }); } catch (error) { stale = error.code === "field_report_revision_conflict"; }
    try { runtime.service.command(owner, { ...commands[0], input: inputs[1] }); } catch (error) { changedKey = error.code === "field_report_idempotency_conflict"; }
    if (!stale || !changedKey || digest(runtime.service.get(owner, created[0].report.id)) !== digest(edited.report) || runtime.service.list({ id: "other-owner", scope: "local-owner-poc" }).items.length) return { passes: false, evidence: null };
    return { passes: false, evidence: {
      scope: "private-field-note-create-update-current-history-restart-replay-only", representative_path_passes: true, remaining,
      state_delta: { before_sha256: digest(before), after_sha256: digest(written), changed_fields: ["private-note.input", "revision", "history"] },
      durable_readback: { write_session_id: "private-note-write-instance", read_session_id: "private-note-restarted-instance", written_sha256: digest(written), read_sha256: digest(restored) },
      boundary_invocation: null,
      external_side_effect: { boundary: "sqlite", effect_id: edited.receipt.idempotencyKey, effect_sha256: digest(edited) },
      failure_injection: { fault: "stale-revision-and-changed-key", failure_observed: true, recovery_state_sha256: digest(restored) },
      input_variation: { cases: created.map((value, index) => ({ input_sha256: digest(commands[index]), output_sha256: digest(value.report) })), failure_case_observed: true },
      visibility: "private", publication: "not-submitted", offline_pack: "unavailable", safety_session: "unavailable", sharing: "unavailable",
    } };
  } catch { return { passes: false, evidence: null }; }
  finally {
    if (runtime) await runtime.close();
    if (path.dirname(path.resolve(dataDir)) !== path.resolve(tmpdir()) || !path.basename(dataDir).startsWith("starward-field-report-probe-")) throw new Error("field_report_probe_temporary_directory_outside_scope");
    await rm(dataDir, { recursive: true, force: true });
  }
}
