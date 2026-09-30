import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as contextRecovery from "./observation-context-recovery";
import type { ObservationContext, SpotId } from "@starward/miniapp-contracts";

const source = ts.createSourceFile(
  "api-client.ts",
  readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
const declaration = source.statements.find(
  (node) =>
    ts.isFunctionDeclaration(node) &&
    node.name?.text === "updateObservationContext",
);
assert.ok(declaration);
const code = ts.transpileModule(
  declaration.getText(source).replace(/^export /u, "") +
    "\nupdateObservationContext;",
  { compilerOptions: { target: ts.ScriptTarget.ES2020 } },
).outputText;

class ApiError extends Error {
  constructor(readonly code: string, readonly statusCode = 409) {
    super(code);
  }
}
class RequestCancelled extends Error {}
const dependencies = () => ({
  MiniappApiError: ApiError,
  MiniappRequestCancelled: RequestCancelled,
  confirmedObservationContextEdit: contextRecovery.confirmedObservationContextEdit,
});

function fullContext(): ObservationContext {
  return {
    schemaVersion: "observation-context-v2", contextId: "ctx:current" as ObservationContext["contextId"],
    contextFingerprint: "same-night", revision: 3,
    location: { kind: "FORMAL_SPOT", spotId: "spot:current" as SpotId, locationVersion: 1 },
    routeOrigin: null, timezone: "Asia/Shanghai", localDate: "2026-09-13",
    nightStartUtc: "2026-09-13T04:00:00.000Z", nightEndUtc: "2026-09-14T04:00:00.000Z",
    selectedAtUtc: "2026-09-13T13:00:00.000Z", eventInstanceId: null, targetProfile: "DAILY",
    weatherView: { primaryPolicy: "QWEATHER", comparisonModels: [], selectedModel: null, cloudLayer: "TOTAL" },
    algorithmVersions: { astronomy: "a", opportunity: "o", tripDecision: "t", darkSky: "d", eventCatalog: "e" },
    privacyClass: "PUBLIC_REFERENCE", createdAt: "2026-09-13T03:00:00.000Z", expiresAt: "2026-09-15T03:00:00.000Z",
  };
}

test("an observation edit recovers a server-lost context once and preserves the requested change", async () => {
  const calls: Array<{ id: string; revision: number; localDate: string }> = [];
  let recoveries = 0;
  const update = vm.runInNewContext(code, {
    ...dependencies(),
    idempotencyKey: () => "test-key",
    invalidateApiCache: () => undefined,
    restoreObservationContext: async (context: { contextId: string }) => {
      recoveries++;
      assert.equal(context.contextId, "ctx:old");
      return { dataState: "FRESH", data: { ...fullContext(), contextId: "ctx:new", revision: 1 } };
    },
    requestOperation: async (
      _key: string,
      operation: string,
      options: {
        pathParams: { contextId: string };
        body: { expectedRevision: number; localDate: string };
      },
    ) => {
      assert.equal(operation, "observationContextPut");
      calls.push({
        id: options.pathParams.contextId,
        revision: options.body.expectedRevision,
        localDate: options.body.localDate,
      });
      if (calls.length === 1) throw new ApiError("NOT_FOUND");
      return { dataState: "FRESH", data: { ...fullContext(), contextId: "ctx:new", revision: 2 } };
    },
  });

  const result = await update(
    { ...fullContext(), contextId: "ctx:old", revision: 7 },
    { localDate: "2026-09-13" },
  );
  assert.equal(result.data.revision, 2);
  assert.equal(recoveries, 1);
  assert.deepEqual(calls, [
    { id: "ctx:old", revision: 7, localDate: "2026-09-13" },
    { id: "ctx:new", revision: 1, localDate: "2026-09-13" },
  ]);
});

test("a non-expiry update failure is not replayed", async () => {
  let requests = 0;
  const update = vm.runInNewContext(code, {
    ...dependencies(),
    idempotencyKey: () => "test-key",
    invalidateApiCache: () => undefined,
    restoreObservationContext: () => assert.fail("must not recover"),
    requestOperation: async (_key: string, operation: string) => {
      if (operation === "observationContextPut") requests++;
      throw new ApiError("CONFLICT");
    },
  });
  await assert.rejects(
    update(
      { contextId: "ctx:current", revision: 3 },
      { localDate: "2026-09-13" },
    ),
    /CONFLICT/u,
  );
  assert.equal(requests, 1);
});

test("a lost successful edit response confirms the actual time with one fresh read and no replay", async () => {
  const initial = fullContext(), next = { ...initial, revision: 4, selectedAtUtc: "2026-09-13T13:30:00.000Z" };
  const calls: string[] = [], invalidations: string[] = [];
  const update = vm.runInNewContext(code, {
    ...dependencies(), idempotencyKey: () => "unused-by-context-server",
    restoreObservationContext: () => assert.fail("a response loss cannot rebuild or move the context"),
    invalidateApiCache: (key: string) => invalidations.push(key),
    requestOperation: async (_key: string, operation: string, options: { cache?: boolean; pathParams: { contextId: string } }) => {
      calls.push(operation); assert.equal(options.pathParams.contextId, initial.contextId);
      if (operation === "observationContextPut") throw new Error("successful response lost");
      assert.equal(operation, "observationContextGet"); assert.equal(options.cache, false, "old cached data cannot acknowledge an edit");
      return { dataState: "FRESH", data: next };
    },
  });
  const result = await update(initial, { selectedAt: "2026-09-13T13:30:00Z" });
  assert.equal(result.data, next);
  assert.deepEqual(calls, ["observationContextPut", "observationContextGet"]);
  assert.deepEqual(invalidations, ["map-scene", "spot-overview", "spot-sky"]);
});

test("a conflict can confirm the requested state but cannot overwrite a different server intent", async () => {
  const initial = fullContext(), desired = "2026-09-13T13:30:00.000Z";
  for (const selectedAtUtc of [desired, "2026-09-13T14:00:00.000Z"]) {
    let writes = 0, reads = 0;
    const failure = new ApiError("CONFLICT");
    const update = vm.runInNewContext(code, {
      ...dependencies(), idempotencyKey: () => "key", invalidateApiCache: () => {},
      restoreObservationContext: () => assert.fail("conflict must not rebuild"),
      requestOperation: async (_key: string, operation: string) => {
        if (operation === "observationContextPut") { writes++; throw failure; }
        reads++; return { dataState: "FRESH", data: { ...initial, revision: 4, selectedAtUtc } };
      },
    });
    if (selectedAtUtc === desired) assert.equal((await update(initial, { selectedAt: desired })).data.selectedAtUtc, desired);
    else await assert.rejects(update(initial, { selectedAt: desired }), error => error === failure);
    assert.equal(writes, 1); assert.equal(reads, 1);
  }
});

test("fresh edit recovery rejects wrong identity, unsolicited night/event changes and stale readback", async () => {
  const initial = fullContext(), desired = "2026-09-13T13:30:00.000Z";
  const expected = { ...initial, revision: 4, selectedAtUtc: desired };
  const invalid = [
    { ...expected, contextFingerprint: undefined },
    { ...expected, contextFingerprint: "" },
    { ...expected, contextId: "ctx:other" },
    { ...expected, location: { ...initial.location, spotId: "spot:other" } },
    { ...expected, localDate: "2026-09-14" },
    { ...expected, eventInstanceId: "event:unsolicited" },
    { ...expected, revision: initial.revision },
    { ...expected, routeOrigin: { contextId: "ctx:foreign", displayName: "other", source: "USER_LOCATION", wgs84: { system: "WGS84", latitude: 22, longitude: 114 } } },
  ];
  for (const latest of [...invalid, expected]) {
    const stale = latest === expected, failure = new Error("response lost"); let writes = 0, reads = 0;
    const update = vm.runInNewContext(code, {
      ...dependencies(), idempotencyKey: () => "key", invalidateApiCache: () => assert.fail("unconfirmed state cannot invalidate as success"),
      restoreObservationContext: () => assert.fail("uncertain edits do not rebuild"),
      requestOperation: async (_key: string, operation: string) => {
        if (operation === "observationContextPut") { writes++; throw failure; }
        reads++; return { dataState: stale ? "STALE_USABLE" : "FRESH", data: latest };
      },
    });
    await assert.rejects(update(initial, { selectedAt: desired }), error => error === failure);
    assert.equal(writes, 1); assert.equal(reads, 1);
  }
});

test("cancelled and definite rejected edits neither read back nor replay", async () => {
  for (const failure of [new RequestCancelled("cancelled"), new ApiError("PERMISSION_DENIED",403), new ApiError("INVALID_INPUT",400)]) {
    let requests = 0;
    const update = vm.runInNewContext(code, {
      ...dependencies(), idempotencyKey: () => "key", invalidateApiCache: () => assert.fail("not successful"),
      restoreObservationContext: () => assert.fail("not expired"),
      requestOperation: async (_key: string, operation: string) => { assert.equal(operation,"observationContextPut"); requests++; throw failure; },
    });
    await assert.rejects(update(fullContext(),{selectedAt:"2026-09-13T13:30:00Z"}),error=>error===failure);
    assert.equal(requests,1);
  }
});

test("a lost date reply preserves location/profile and confirms the requested night and event reset", async () => {
  const initial = { ...fullContext(), eventInstanceId: "event:previous" }, next = {
    ...initial, revision: 4, localDate: "2026-09-14", selectedAtUtc: "2026-09-14T13:00:00.000Z", eventInstanceId: null,
    nightStartUtc: "2026-09-14T04:00:00.000Z", nightEndUtc: "2026-09-15T04:00:00.000Z",
  };
  let writes = 0, reads = 0;
  const update = vm.runInNewContext(code, {
    ...dependencies(), idempotencyKey: () => "key", invalidateApiCache: () => {},
    restoreObservationContext: () => assert.fail("no rebuild after a lost reply"),
    requestOperation: async (_key: string, operation: string) => {
      if (operation === "observationContextPut") { writes++; throw new ApiError("PROVIDER_UNAVAILABLE",503); }
      reads++; return { dataState: "FRESH", data: next };
    },
  });
  const result = await update(initial,{localDate:next.localDate,selectedAt:next.selectedAtUtc,eventInstanceId:null});
  assert.equal(result.data,next); assert.equal(writes,1); assert.equal(reads,1);
});

test("a matching normal edit response completes without an unnecessary readback", async () => {
  const initial = fullContext(), desired = "2026-09-13T13:30:00.000Z";
  const next = { ...initial, revision: 4, selectedAtUtc: desired };
  for (const binding of [{ validAt: desired, contextRevision: 4 }, { validAt: null }]) {
    let writes = 0;
    const update = vm.runInNewContext(code, {
      ...dependencies(), idempotencyKey: () => "key", invalidateApiCache: () => {},
      restoreObservationContext: () => assert.fail("normal success must not rebuild"),
      requestOperation: async (_key: string, operation: string) => {
        assert.equal(operation, "observationContextPut"); writes++;
        return { dataState: "FRESH", ...binding, data: next };
      },
    });
    assert.equal((await update(initial, { selectedAt: desired })).data, next);
    assert.equal(writes, 1, "the established nullable/optional envelope bindings remain compatible");
  }
});

test("a mismatched 2xx response cannot publish old time, foreign identity, or contradictory binding", async () => {
  const initial = fullContext(), desired = "2026-09-13T13:30:00.000Z";
  const correct = { dataState: "FRESH", validAt: desired, contextRevision: 4,
    data: { ...initial, revision: 4, selectedAtUtc: desired } };
  const invalid = [
    { ...correct, data: { ...correct.data, selectedAtUtc: initial.selectedAtUtc } },
    { ...correct, data: initial },
    { ...correct, data: { ...correct.data, contextId: "ctx:foreign" } },
    { ...correct, data: { ...correct.data, location: { ...initial.location, spotId: "spot:foreign" } } },
    { ...correct, data: { ...correct.data, localDate: "2026-09-14" } },
    { ...correct, data: { ...correct.data, eventInstanceId: "event:unsolicited" } },
    { ...correct, dataState: "STALE_USABLE" },
    { ...correct, validAt: initial.selectedAtUtc },
    { ...correct, contextRevision: 3 },
    { ...correct, data: null },
  ];
  for (const response of invalid) {
    const calls: string[] = [], invalidations: string[] = [];
    const update = vm.runInNewContext(code, {
      ...dependencies(), idempotencyKey: () => "key",
      restoreObservationContext: () => assert.fail("an invalid response cannot rebuild the context"),
      invalidateApiCache: (key: string) => invalidations.push(key),
      requestOperation: async (_key: string, operation: string, options: { cache?: boolean }) => {
        calls.push(operation);
        if (operation === "observationContextPut") return response;
        assert.equal(options.cache, false); return correct;
      },
    });
    const result = await update(initial, { selectedAt: desired });
    assert.equal(result.data, correct.data, "only the actual requested state may be returned to Map/Sky");
    assert.deepEqual(calls, ["observationContextPut", "observationContextGet"]);
    assert.deepEqual(invalidations, ["map-scene", "spot-overview", "spot-sky"]);
  }
});

test("invalid direct and readback replies remain failed without replay or success invalidation", async () => {
  const initial = fullContext(), desired = "2026-09-13T13:30:00.000Z";
  for (const readbackFails of [false, true]) {
    const calls: string[] = [];
    const update = vm.runInNewContext(code, {
      ...dependencies(), idempotencyKey: () => "key",
      restoreObservationContext: () => assert.fail("uncertain state cannot authorize a new context"),
      invalidateApiCache: () => assert.fail("unconfirmed response cannot mark success"),
      requestOperation: async (_key: string, operation: string) => {
        calls.push(operation);
        if (operation === "observationContextGet" && readbackFails) throw new Error("readback unavailable");
        return { dataState: "FRESH", data: initial };
      },
    });
    await assert.rejects(update(initial, { selectedAt: desired }), /bff_observation_context_update_invalid/);
    assert.deepEqual(calls, ["observationContextPut", "observationContextGet"]);
  }
});
