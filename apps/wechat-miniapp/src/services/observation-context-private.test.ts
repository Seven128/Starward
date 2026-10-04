import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as recovery from "./observation-context-recovery";
import type { ObservationContext } from "@starward/miniapp-contracts";

const ast = ts.createSourceFile("api-client.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const names = ["resolveObservationContext", "getObservationContext", "restoreObservationContext", "updateObservationContext"];
const functions = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text ?? ""));
assert.equal(functions.length, 4);
const code = ts.transpileModule(functions.map(node => node.getText(ast).replace(/^export /u, "")).join("\n") + `\n({${names.join(",")}});`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
class ApiError extends Error { constructor(readonly code: string, readonly statusCode = 409) { super(code); } }
class Cancelled extends Error {}
function context(): ObservationContext {
  return { schemaVersion: "observation-context-v3", contextId: "ctx:owned" as ObservationContext["contextId"], contextFingerprint: "pending", revision: 1,
    privateProposal: { ownerId: "user:a" as never, submissionId: "contribution:one" as never, attemptId: "contribution-attempt:one", attemptBaseRevision: 1 },
    location: { kind: "PENDING_PROPOSAL", displayName: "冻结位置", wgs84: { system: "WGS84", latitude: 22.6, longitude: 114.2 } },
    routeOrigin: null, timezone: "Asia/Shanghai", localDate: "2026-10-05", nightStartUtc: "2026-10-05T04:00:00.000Z", nightEndUtc: "2026-10-06T04:00:00.000Z",
    selectedAtUtc: "2026-10-05T13:00:00.000Z", eventInstanceId: null, targetProfile: "DAILY",
    weatherView: { primaryPolicy: "QWEATHER", comparisonModels: [], selectedModel: null, cloudLayer: "TOTAL" },
    algorithmVersions: { astronomy: "a", opportunity: "o", tripDecision: "t", darkSky: "d", eventCatalog: "e" },
    privacyClass: "ACCOUNT_PRIVATE", createdAt: "2026-10-05T00:00:00.000Z", expiresAt: "2026-10-05T02:00:00.000Z" };
}
function load(requestOperation: (...args: any[]) => Promise<any>, state = { user: "user:a", reset: 1 }) {
  const api = vm.runInNewContext(code, { ...recovery, MiniappApiError: ApiError, MiniappRequestCancelled: Cancelled,
    currentDraftUserId: () => state.user, useAppStore: { getState: () => ({ mapResetVersion: state.reset }) },
    requestOperation, idempotencyKey: () => "context-key", invalidateApiCache: () => {} });
  return { api, state };
}
test("supported private expiry sends only original attempt under the owner and cannot downgrade coordinates", async () => {
  const initial = context(), calls: any[] = [];
  const { api } = load(async (...args) => { calls.push(args); if (args[1] === "observationContextGet") throw new ApiError("STALE_REJECTED", 410);
    return { dataState: "FRESH", data: { ...initial, contextId: "ctx:recovered" } }; });
  const result = await api.restoreObservationContext(initial);
  assert.equal(result.data.contextId, "ctx:recovered"); assert.equal(calls.length, 2);
  assert.equal(calls[1][2].body.location.kind, "PENDING_PROPOSAL");
  assert.equal(calls[1][2].body.location.attemptId, initial.privateProposal!.attemptId);
  assert.equal(calls[1][2].body.location.wgs84, undefined); assert.equal(calls[1][4], "user:a");
});
test("late private reads and expiry cannot survive account departure or A-B-A", async () => {
  for (const reply of ["FRESH", "STALE_REJECTED"] as const) for (const aba of [false, true]) {
    let settle!: () => void; const initial = context(); let posts = 0;
    const pendingRead = new Promise<any>((resolve, reject) => { settle = () => reply === "FRESH" ? resolve({ dataState: "FRESH", data: initial }) : reject(new ApiError(reply, 410)); });
    const { api, state } = load(async (_key, operation) => { if (operation === "observationContextPost") posts++; return pendingRead; });
    const pending = api.restoreObservationContext(initial); state.user = aba ? "user:a" : "user:b"; state.reset += aba ? 2 : 1;
    settle(); await assert.rejects(pending, /账户已变化/); assert.equal(posts, 0);
  }
});
test("an explicit publication conflict permits one requested time edit; an uncertain write or another attempt never replays", async () => {
  for (const scenario of ["published", "unknown", "other-attempt"] as const) {
    const initial = context(), mapped: ObservationContext = { ...initial, revision: 2, contextFingerprint: "formal",
      location: { kind: "FORMAL_SPOT", spotId: "spot:mapped" as never, locationVersion: 1 },
      ...(scenario === "other-attempt" ? { privateProposal: { ...initial.privateProposal!, attemptId: "contribution-attempt:other" } } : {}) };
    let writes = 0, reads = 0; const at = "2026-10-05T13:30:00.000Z";
    const { api } = load(async (_key, operation, options) => {
      if (operation === "observationContextGet") { reads++; return { dataState: "FRESH", data: mapped }; }
      writes++; if (writes === 1) throw new ApiError(scenario === "unknown" ? "PROVIDER_UNAVAILABLE" : "CONFLICT", scenario === "unknown" ? 503 : 409);
      assert.equal(options.body.expectedRevision, 2); return { dataState: "FRESH", data: { ...mapped, revision: 3, selectedAtUtc: at } };
    });
    if (scenario === "published") { const result = await api.updateObservationContext(initial, { selectedAt: at }); assert.equal(result.data.selectedAtUtc, at); assert.equal(writes, 2); }
    else { await assert.rejects(api.updateObservationContext(initial, { selectedAt: at })); assert.equal(writes, 1); }
    assert.equal(reads, 1);
  }
});
