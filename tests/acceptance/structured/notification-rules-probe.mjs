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
const remaining = ["intrip-itinerary-revision-binding", "global-and-category-controls", "event-driven-evaluation-edge-quiet-hours-cooldown", "native-permission-local-scheduling", "channel-token-delivery-and-inbox-history", "astronomy-tools-real-inputs", "native-target-acceptance"];

/** Configuration effects are real; they do not complete notification delivery or this family. */
export async function notificationRuleConfigurationEvidence(factory) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "starward-rule-probe-"));
  const owner = { id: "structured-local-owner", scope: "local-owner-poc" };
  const inputs = [
    { location: { kind: "place", label: "明确填写的位置", latitude: 23.1, longitude: 113.2 }, category: "pretrip", target: "moon", threshold: { metric: "cloud-cover", direction: "below", value: 25, unit: "%" }, leadMinutes: 60, quietHours: { start: "22:00", end: "08:00", timezone: "Asia/Shanghai" }, cooldownMinutes: 120, channel: "local", enabled: false, expiresAt: null },
    { location: { kind: "grid", grid: "explicit-grid" }, category: "long-term", target: "jupiter", threshold: { metric: "altitude", direction: "above", value: 40, unit: "degree" }, leadMinutes: 30, quietHours: { start: "23:00", end: "07:00", timezone: "Europe/London" }, cooldownMinutes: 1440, channel: "inbox", enabled: false, expiresAt: "2026-12-12T00:00:00.000Z" },
  ];
  const commands = inputs.map((input, index) => ({ command: "create-rule", idempotencyKey: `create-${index}`, input }));
  let runtime;
  try {
    runtime = await factory({ dataDir, releaseProfile: { id: "individual-personal-trial", productionTrafficAllowed: false, externalServicesBudgetCny: 200 } });
    const before = runtime.service.list(owner);
    if (before.items.length) return { passes: false, evidence: null };
    const created = commands.map(command => runtime.service.command(owner, command));
    if (created[0].rule.id === created[1].rule.id || created.some((value, index) => value.status !== "saved" || digest(value.rule.definition) !== digest(inputs[index]))) return { passes: false, evidence: null };
    const edited = runtime.service.command(owner, { command: "update-rule", idempotencyKey: "edit-first", ruleId: created[0].rule.id, baseRevision: 1, input: { ...inputs[0], threshold: { ...inputs[0].threshold, value: 35 }, enabled: true } });
    const stopped = runtime.service.command(owner, { command: "set-rule-enabled", idempotencyKey: "stop-first", ruleId: created[0].rule.id, baseRevision: 2, enabled: false });
    const written = created.map(value => runtime.service.get(owner, value.rule.id));
    if (written[0].revision !== 3 || written[0].definition.threshold.value !== 35 || written.some(value => value.evaluation !== "not-evaluated" || value.delivery !== "not-configured")) return { passes: false, evidence: null };
    await runtime.close(); runtime = null;
    runtime = await factory({ dataDir });
    const restored = created.map(value => runtime.service.get(owner, value.rule.id));
    const history = runtime.service.get(owner, created[0].rule.id, 1);
    const replay = runtime.service.command(owner, commands[0]);
    if (digest(restored) !== digest(written) || digest(history) !== digest(created[0].rule) || !replay.replayed || digest(replay.rule) !== digest(created[0].rule)) return { passes: false, evidence: null };
    let stale = false, changedKey = false;
    try { runtime.service.command(owner, { command: "set-rule-enabled", idempotencyKey: "stale", ruleId: created[0].rule.id, baseRevision: 1, enabled: true }); } catch (error) { stale = error.code === "notification_rule_revision_conflict"; }
    try { runtime.service.command(owner, { ...commands[0], input: { ...inputs[0], enabled: true } }); } catch (error) { changedKey = error.code === "notification_rule_idempotency_conflict"; }
    if (!stale || !changedKey || digest(runtime.service.get(owner, created[0].rule.id)) !== digest(stopped.rule) || runtime.service.list({ id: "other-owner", scope: "local-owner-poc" }).items.length) return { passes: false, evidence: null };
    return { passes: false, evidence: {
      scope: "explicit-rule-configuration-create-update-stop-readback-only", representative_path_passes: true, remaining,
      state_delta: { before_sha256: digest(before), after_sha256: digest(written), changed_fields: ["rule.definition", "rule.enabled", "revision", "history"] },
      durable_readback: { write_session_id: "rule-write-instance", read_session_id: "rule-restarted-instance", written_sha256: digest(written), read_sha256: digest(restored) },
      boundary_invocation: null,
      external_side_effect: { boundary: "sqlite", effect_id: stopped.receipt.idempotencyKey, effect_sha256: digest(stopped) },
      failure_injection: { fault: "stale-revision-and-changed-key", failure_observed: true, recovery_state_sha256: digest(restored) },
      input_variation: { cases: created.map((value, index) => ({ input_sha256: digest(commands[index]), output_sha256: digest(value.rule) })), failure_case_observed: true },
      evaluation: "not-evaluated", delivery: "not-configured", edited_revision: edited.rule.revision,
    } };
  } catch { return { passes: false, evidence: null }; }
  finally {
    if (runtime) await runtime.close();
    if (path.dirname(path.resolve(dataDir)) !== path.resolve(tmpdir()) || !path.basename(dataDir).startsWith("starward-rule-probe-")) throw new Error("rule_probe_temporary_directory_outside_scope");
    await rm(dataDir, { recursive: true, force: true });
  }
}
