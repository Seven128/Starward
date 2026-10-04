// Real public local BFF state, production generated operation/transport/cache/
// Context owners. Only the Taro I/O delivery uses fetch; no native UI or phone.
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import ts from "typescript";
import { transportHarness } from "../../../../apps/wechat-miniapp/src/services/api-request-test-support.ts";
import { createAuthenticatedOperationRequester } from "../../../../apps/wechat-miniapp/src/services/authenticated-operation.ts";
import { MiniappRequestCancelled } from "../../../../apps/wechat-miniapp/src/services/request-lifecycle.ts";
import * as recovery from "../../../../apps/wechat-miniapp/src/services/observation-context-recovery.ts";

const phase = process.argv[2]; assert(["before", "after"].includes(phase));
const root = process.cwd(), item = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const output = path.join(item, `evidence/experience-context-ack-http-${phase}-2026-09-29.json`);
await assert.rejects(fs.access(output), { code: "ENOENT" });
const digest = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const clientFile = "apps/wechat-miniapp/src/services/api-client.ts";
const clientText = await fs.readFile(path.join(root, clientFile), "utf8");
const source = ts.createSourceFile(clientFile, clientText, ts.ScriptTarget.Latest, true);
const names = ["getObservationContext", "restoreObservationContext", "updateObservationContext"];
const declarations = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text ?? ""));
assert.equal(declarations.length, names.length);
const compiled = ts.transpileModule(declarations.map(node => node.getText(source).replace(/^export /u, "")).join("\n")
  + "\n({getObservationContext, updateObservationContext});", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
await fs.writeFile(path.join(item, `evidence/experience-context-ack-http-${phase}-domain-2026-09-29.js`), compiled, { flag: "wx" });
const origin = "http://127.0.0.1:8789";
async function json(relative: string, body?: unknown) {
  const response = await fetch(origin + relative, { signal: AbortSignal.timeout(8000),
    ...(body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) });
  assert([200, 201].includes(response.status)); return response.json();
}
const places = await json("/v2/places/search?q=" + encodeURIComponent("示例观星点"));
const spot = places.data.formalSpots.find((value: any) => value.name === "示例观星点");
assert(spot && spot.wgs84.latitude === 22.4826799 && spot.wgs84.longitude === 114.5557147);
const rows: any[] = [];
for (const mode of ["normal", "old-time", "foreign-location", "wrong-night", "wrong-envelope-binding", "unchanged-write"] as const) {
  const initialEnvelope = await json("/v2/observation-contexts/resolve", { location: { kind: "FORMAL_SPOT", spotId: spot.spotId },
    localDate: "2026-09-28", selectedAt: "2026-09-28T16:00:00.000Z" });
  const initial = initialEnvelope.data, desired = "2026-09-28T16:30:00.000Z";
  const calls: { method: string; status: number; hasIfNoneMatch: boolean; mutated: boolean }[] = [], invalidations: string[] = [];
  const pending = new Set<Promise<void>>();
  let dispatchEnabled = true;
  const h = transportHarness(false, () => {
    const delivery = Promise.resolve().then(async () => {
      const call = h.calls.at(-1)!; assert(dispatchEnabled);
      const url = new URL(call.url), headers = { ...call.header };
      if (call.data !== undefined) headers["Content-Type"] = "application/json";
      let status: number, envelope: any;
      if (mode === "unchanged-write" && call.method === "PUT") {
        status = 200; envelope = initialEnvelope; // Explicit false acknowledgement: no upstream write.
      } else {
        const response = await fetch(origin + url.pathname + url.search, { method: call.method, headers,
          ...(call.data === undefined ? {} : { body: JSON.stringify(call.data) }), signal: AbortSignal.timeout(8000) });
        status = response.status; envelope = status === 304 ? null : await response.json();
      }
      let mutated = false;
      if (call.method === "PUT" && status === 200 && mode !== "normal" && mode !== "unchanged-write") {
        envelope = structuredClone(envelope); mutated = true;
        if (mode === "old-time") envelope.data.selectedAtUtc = initial.selectedAtUtc;
        if (mode === "foreign-location") envelope.data.location.spotId = "spot:foreign-response";
        if (mode === "wrong-night") envelope.data.localDate = "2026-09-29";
        if (mode === "wrong-envelope-binding") { envelope.validAt = initial.selectedAtUtc; envelope.contextRevision = initial.revision; }
      }
      calls.push({ method: call.method, status, hasIfNoneMatch: Boolean(headers["If-None-Match"]), mutated });
      call.success({ statusCode: status, data: envelope });
    }).catch(() => h.calls.at(-1)!.fail({ errMsg: "local_http_delivery_failed" }));
    pending.add(delivery); void delivery.finally(() => pending.delete(delivery));
  }, true);
  const requestOperation = createAuthenticatedOperationRequester({ request: h.request as any, resolveSession: async () => null,
    readStoredSession: () => null, clearStoredSession: () => assert.fail("public Context edit cannot reauthenticate"),
    isPermissionDenied: (error: unknown) => error instanceof h.MiniappApiError && error.code === "PERMISSION_DENIED" });
  const domain = vm.runInNewContext(compiled, { MiniappApiError: h.MiniappApiError, MiniappRequestCancelled,
    requestOperation, confirmedObservationContextEdit: recovery.confirmedObservationContextEdit,
    observationContextRecoveryInput: recovery.observationContextRecoveryInput, idempotencyKey: () => "synthetic-context-ack",
    invalidateApiCache: (prefix: string) => { invalidations.push(prefix); h.invalidateApiCache(prefix); } });
  try {
    // A real old response lives in the actual cache. Reconciliation must bypass
    // it and its conditional header instead of returning that previous value.
    const seeded = await domain.getObservationContext(initial.contextId);
    assert.equal(seeded.data.revision, initial.revision); calls.length = 0;
    let accepted: any = null, failure: any = null;
    try { accepted = await domain.updateObservationContext(initial, { selectedAt: desired }); } catch (error) { failure = error; }
    const durable = (await json("/v2/observation-contexts/" + encodeURIComponent(initial.contextId))).data;
    const expectedFailure = mode === "unchanged-write";
    const aligned = expectedFailure
      ? !accepted && Boolean(failure) && durable.revision === initial.revision && invalidations.length === 0
      : accepted?.data.selectedAtUtc === desired && accepted?.data.revision === initial.revision + 1
        && accepted?.data.location.spotId === initial.location.spotId && accepted?.data.localDate === initial.localDate
        && accepted?.validAt === desired && accepted?.contextRevision === durable.revision
        && durable.selectedAtUtc === desired && durable.revision === initial.revision + 1;
    const bounded = calls.filter(call => call.method === "PUT").length === 1
      && calls.filter(call => call.method === "GET").length === (mode === "normal" ? 0 : 1)
      && calls.every(call => call.method !== "GET" || !call.hasIfNoneMatch);
    rows.push({ mode, ok: aligned && bounded, calls, invalidations,
      result: accepted ? { selectedAtUtc: accepted.data?.selectedAtUtc, revision: accepted.data?.revision,
        sameLocation: accepted.data?.location?.spotId === initial.location.spotId, sameNight: accepted.data?.localDate === initial.localDate,
        matchingEnvelopeBinding: accepted.validAt === durable.selectedAtUtc && accepted.contextRevision === durable.revision } : null,
      failure: failure ? { name: failure.name, message: String(failure.message).slice(0, 160) } : null,
      durable: { selectedAtUtc: durable.selectedAtUtc, revision: durable.revision, sameLocation: durable.location.spotId === initial.location.spotId },
      oldCacheSeeded: true });
  } finally {
    dispatchEnabled = false; await Promise.allSettled([...pending]); h.requests.cancelAll("manual");
    await h.clearTemporaryApiCache(); h.queryClient.clear();
  }
}
const sourceFiles = [clientFile, "apps/wechat-miniapp/src/services/observation-context-recovery.ts", "apps/wechat-miniapp/src/services/api-request-test-support.ts",
  "apps/wechat-miniapp/src/services/authenticated-operation.ts", "apps/wechat-miniapp/src/services/response-cache.ts", "workers/miniapp-api/src/observation-context-service.ts"];
const sourceHashes = await Promise.all(sourceFiles.map(async file => ({ file, sha256: digest(await fs.readFile(path.join(root, file))) })));
const record = { at: new Date().toISOString(), phase, scope: "Production Context domain, generated operation and real transport/cache functions with actual public LOCAL/MEMORY_TEST BFF HTTP state. Taro delivery is a Node fetch boundary with explicit response faults. No native UI, GUI Context, phone, private identifiers, headers, services, cloud deployment, exact-once/replay or final acceptance claim.",
  sourceHashes, domainCodeSha256: digest(compiled), rows };
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ phase, rows }));
assert(rows.every(row => row.ok), "a 2xx acknowledgement must establish only the actual requested Context result without replay");
