import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Actual report snapshots are a representative path, not the complete Tonight outcome. */
export async function nightReportPersistenceEvidence(factory, NightReportService) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "starward-night-report-probe-"));
  const owner = { id: "structured-local-owner", scope: "local-owner-poc" };
  const at = "2026-10-24T10:00:00.000Z", samples = Array.from({ length: 8 }, (_, i) => ({ at: new Date(Date.parse(at) + i * 900_000).toISOString(), eligible: true }));
  const location = { lat: 31.2, lon: 121.4, system: "WGS84", label: "Synthetic place A" };
  const inputs = [
    { requestId: "complete", location, timezone: "Asia/Shanghai", nightDate: "2026-10-24", profile: "neutral", target: "milky-way-core", route: { origin: location, maxTravelMinutes: 120, modes: ["drive"] } },
    { requestId: "partial", location: { ...location, lat: 32, label: "Synthetic place B" }, timezone: "Asia/Shanghai", nightDate: "2026-10-25", profile: "family", target: "milky-way-core", route: { origin: location, maxTravelMinutes: 90, modes: ["walk"] } },
  ];
  const invocations = [];
  const providers = {
    weather: { load: async input => { invocations.push({ source: "weather", requestId: input.requestId }); return { score: 80, confidence: 0.9, version: "synthetic-weather-v1", generatedAt: at, samples }; } },
    astronomy: { load: async () => ({ score: 80, confidence: 0.9, version: "synthetic-astronomy-v1", generatedAt: at, samples, targets: [{ id: "milky-way-core", name: "Synthetic target", visible: true, window: { start: samples[0].at, end: samples.at(-1).at }, peak: { at: samples[3].at, altitudeDeg: 40, azimuthDeg: 150 }, difficulty: "easy", impact: "synthetic" }] }) },
    spots: { find: async input => ({ version: "synthetic-spots-v1", generatedAt: at, candidates: [{ id: `spot-${input.requestId}`, name: input.location.label, sky: 80, access: 80, safety: 90, preference: 80, risks: [] }] }) },
    routes: { load: async input => { if (input.requestId === "partial") throw new Error("synthetic_route_unavailable"); return [{ spotId: "spot-complete", distanceKm: 10, travelMinutes: 15, accessScore: 80, version: "synthetic-route-v1", generatedAt: at, state: "fresh" }]; } },
  };
  let runtime, next = 0;
  try {
    runtime = await factory({ dataDir, generator: new NightReportService(providers, undefined, () => new Date(at), () => `structured-night-${++next}`) });
    const values = [];
    for (const input of inputs) values.push(await runtime.service.create(owner, input));
    const written = values.map(value => runtime.service.get(owner, value.report.id));
    if (written[0]?.status !== "ready" || !written[0].primarySpot || written[0].targets.length !== 1 || written[0].observationWindow?.durationMinutes !== 120 || written[0].provenance.length !== 4
      || written[1]?.status !== "partial" || written[1].parts.route.state !== "missing" || written[1].primarySpot?.travelMinutes !== null || written[1].parts.weather.state !== "fresh") return { passes: false, evidence: null };
    await runtime.close(); runtime = null;
    runtime = await factory({ dataDir, generator: { generate: async () => { throw new Error("replay_must_not_refresh_sources"); } } });
    const restored = values.map(value => runtime.service.get(owner, value.report.id));
    const replay = await runtime.service.create(owner, inputs[0]);
    const receipt = runtime.service.result(owner, inputs[0].requestId);
    if (digest(written) !== digest(restored) || !replay.replayed || digest(replay.report) !== digest(written[0]) || digest(receipt.report) !== digest(written[0]) || receipt.ownerId !== owner.id || invocations.length !== 2) return { passes: false, evidence: null };
    let conflict = false, isolated = false;
    try { await runtime.service.create(owner, { ...inputs[0], route: { ...inputs[0].route, modes: ["walk"] } }); } catch (error) { conflict = error.code === "night_report_idempotency_conflict"; }
    try { runtime.service.get({ ...owner, id: "other-owner" }, values[0].report.id); } catch (error) { isolated = error.code === "night_report_not_found"; }
    if (!conflict || !isolated || digest(runtime.service.get(owner, values[0].report.id)) !== digest(written[0])) return { passes: false, evidence: null };
    return { passes: false, evidence: {
      scope: "night-report-aggregation-snapshot-receipt-restart-replay-only", representative_path_passes: true,
      remaining: ["real-provider-coverage-rights-and-complete-tonight-content", "production-identity-and-deployment", "native-device-query-refresh-recovery-and-navigation", "full-tonight-acceptance"],
      state_delta: { before_sha256: digest([]), after_sha256: digest(written), changed_fields: ["report.snapshot", "report.receipt"] },
      durable_readback: { write_session_id: "night-write-instance", read_session_id: "night-restarted-instance", written_sha256: digest(written), read_sha256: digest(restored) },
      boundary_invocation: { boundary: "synthetic-provider-adapters", request_sha256: digest(inputs), response_sha256: digest(written) },
      external_side_effect: { boundary: "sqlite", effect_id: receipt.receipt.requestId, effect_sha256: digest(receipt) },
      failure_injection: { fault: "missing-route-full-input-conflict-and-other-owner", failure_observed: true, recovery_state_sha256: digest(restored) },
      input_variation: { cases: values.map((value, index) => ({ input_sha256: digest(inputs[index]), output_sha256: digest(value.report) })), failure_case_observed: true },
    } };
  } catch { return { passes: false, evidence: null }; }
  finally {
    if (runtime) await runtime.close();
    if (path.dirname(path.resolve(dataDir)) !== path.resolve(tmpdir()) || !path.basename(dataDir).startsWith("starward-night-report-probe-")) throw new Error("night_report_probe_temporary_directory_outside_scope");
    await rm(dataDir, { recursive: true, force: true });
  }
}
