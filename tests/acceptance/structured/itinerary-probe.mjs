import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const remaining = ["qualified-place-and-route-generation", "weather-and-astronomy-evidence", "share-export-and-offline-handoff", "collaboration-and-field-conflict-resolution", "native-target-acceptance"];

/** A draft persistence check is bounded evidence, never whole-family completion. */
export async function itineraryDraftPersistenceEvidence(factory) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "starward-itinerary-probe-"));
  const owner = { id: "structured-local-owner", scope: "local-owner-poc" };
  const commands = ["广州", "成都"].map((origin, index) => ({ command: "create-draft", idempotencyKey: `create-${index}`, input: { title: `${origin} 观星意向`, timezone: "Asia/Shanghai", inputs: { date: index ? "2026-12-12" : "2026-11-01", origin, people: index + 1, transport: "drive", target: index ? "jupiter" : "moon", userType: "family", latestReturnLocal: null, overnight: false, collaborative: false } } }));
  let runtime;
  try {
    runtime = await factory({ dataDir, releaseProfile: { id: "individual-personal-trial", productionTrafficAllowed: false, externalServicesBudgetCny: 200 } });
    const before = runtime.service.list(owner);
    if (before.items.length !== 0) return { passes: false, evidence: null };
    const created = commands.map(command => runtime.service.command(owner, command));
    if (created[0].itinerary.id === created[1].itinerary.id || created.some((result, index) => result.status !== "saved" || JSON.stringify(result.itinerary.inputs) !== JSON.stringify(commands[index].input.inputs))) return { passes: false, evidence: null };
    const edit = { command: "patch-draft", idempotencyKey: "rename-first", itineraryId: created[0].itinerary.id, baseRevision: 1, patch: { title: "用户确认的修改" } };
    const changed = runtime.service.command(owner, edit);
    const written = [runtime.service.get(owner, created[0].itinerary.id), runtime.service.get(owner, created[1].itinerary.id)];
    if (written[0].revision !== 2 || written[0].title !== edit.patch.title) return { passes: false, evidence: null };
    await runtime.close();
    runtime = null;
    runtime = await factory({ dataDir });
    const restored = created.map(result => runtime.service.get(owner, result.itinerary.id));
    const history = runtime.service.get(owner, created[0].itinerary.id, 1);
    const replay = runtime.service.command(owner, commands[0]);
    if (digest(restored) !== digest(written) || digest(history) !== digest(created[0].itinerary) || !replay.replayed || digest(replay.itinerary) !== digest(created[0].itinerary)) return { passes: false, evidence: null };
    let rejected = false;
    try { runtime.service.command(owner, { ...edit, idempotencyKey: "stale-revision" }); } catch (error) { rejected = error.code === "itinerary_revision_conflict"; }
    if (!rejected || digest(runtime.service.get(owner, created[0].itinerary.id)) !== digest(changed.itinerary)) return { passes: false, evidence: null };
    return {
      passes: false,
      evidence: {
        scope: "explicit-draft-create-patch-readback-only", representative_path_passes: true, remaining,
        state_delta: { before_sha256: digest(before), after_sha256: digest(written), changed_fields: ["itinerary.inputs", "itinerary.title", "revision", "history"] },
        durable_readback: { write_session_id: "itinerary-write-instance", read_session_id: "itinerary-restarted-instance", written_sha256: digest(written), read_sha256: digest(restored) },
        boundary_invocation: null,
        external_side_effect: { boundary: "sqlite", effect_id: changed.receipt.idempotencyKey, effect_sha256: digest(changed) },
        failure_injection: { fault: "stale-domain-revision", failure_observed: true, recovery_state_sha256: digest(restored) },
        input_variation: { cases: created.map((value, index) => ({ input_sha256: digest(commands[index]), output_sha256: digest(value.itinerary) })), failure_case_observed: true },
      },
    };
  } catch {
    return { passes: false, evidence: null };
  } finally {
    if (runtime) await runtime.close();
    if (path.dirname(path.resolve(dataDir)) !== path.resolve(tmpdir()) || !path.basename(dataDir).startsWith("starward-itinerary-probe-")) throw new Error("itinerary_probe_temporary_directory_outside_scope");
    await rm(dataDir, { recursive: true, force: true });
  }
}
