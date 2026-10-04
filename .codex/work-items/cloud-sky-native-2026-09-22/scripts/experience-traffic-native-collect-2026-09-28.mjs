import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const filename = process.argv[2];
assert.match(filename ?? "", /^experience-traffic-native-(?:epoch[12]|final)-2026-09-28\.json$/);
const traffic = await (await fetch("http://127.0.0.1:8791/__sky_test/traffic-status")).json();
const contextFaultControl = await (await fetch("http://127.0.0.1:8791/__sky_test/context-status")).json();
const allowed = new Set(["sequence", "phase", "resourceKind", "method", "agentProbe", "conditional", "upstreamBodyBytes", "upstreamChunks", "upstreamEnded", "downstreamFinished", "status", "upstreamHeadersMs", "declaredContentLength", "contentEncoding", "immutable", "maxAgeSeconds", "imageFieldDegrees", "upstreamEndedMs", "downstreamFinishedMs", "observedDurationMs", "downstreamClosedBeforeFinish", "upstreamAborted", "upstreamError", "controlledFault", "controlledResourceDelayMs", "controlledResourceOutcome"]);
for (const record of [...traffic.records, ...traffic.active]) {
  assert.ok(Object.keys(record).every(key => allowed.has(key)), "unknown measurement field");
}
assert.equal(contextFaultControl.mode, "pass");
const value = { scope: "task-owned loopback proxy measurements during public DevTools operations",
  limits: ["Body bytes observed by this proxy, not total TCP wire bytes, native memory or cloud billing.",
    "agentProbe=true rows are separate transport checks, not native user-flow traffic.",
    "Unmarked rows are correlated with the sole candidate's public operations; another client cannot be identified solely by HTTP metadata.",
    "Warm resources can bypass this proxy. A DevTools request row reporting 200 does not itself establish a network transfer.",
    "Controlled resource pauses do not measure ordinary performance; bytes already queued in upstream sockets are not counted before stream reads."],
  capturedAtUtc: new Date().toISOString(), contextFaultControl, traffic };
await writeFile(new URL(`../evidence/${filename}`, import.meta.url), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const clients = traffic.records.filter(record => !record.agentProbe);
console.log(JSON.stringify({ filename, epochStartedAt: traffic.epochStartedAt, totalObserved: traffic.totalObserved,
  retained: traffic.records.length, active: traffic.active.length,
  unmarkedBodyBytes: clients.reduce((bytes, record) => bytes + record.upstreamBodyBytes, 0),
  resourceMode: traffic.resourceMode ?? "not_supported_in_first_loaded_epoch" }));
