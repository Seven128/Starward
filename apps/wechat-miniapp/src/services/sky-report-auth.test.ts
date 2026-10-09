import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { ApiEnvelope, AuthSessionData } from "@starward/miniapp-contracts";
import { createAuthenticatedOperationRequester, type AuthPolicy } from "./authenticated-operation";
import { transportHarness } from "./api-request-test-support";

const source = ts.createSourceFile(
  "api-client.ts",
  readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const declaration = source.statements.find(
  (node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === "getSkyReport",
);
if (!declaration) throw new Error("getSkyReport declaration missing");
const reportCode = ts.transpileModule(
  declaration.getText(source).replace(/^export /u, "") + "\ngetSkyReport;",
  { compilerOptions: { target: ts.ScriptTarget.ES2020 } },
).outputText;
const getSkyReport = vm.runInNewContext(
  reportCode,
  {
    ADOPTED_SKY_REPORT_CATALOG_VERSION: "bsc5p-bright-stars.v3",
    requestOperation: (
      key: string,
      operation: string,
      options: Record<string, unknown>,
    ) => Promise.resolve({ key, operation, options }),
    projectAdoptedSkyCatalog: (value: unknown) => value,
  },
) as (spotId: string, contextId: string) => Promise<{
  options: { auth: string; query: string };
}>;

test("pending proposal sky requires owner authentication", async () => {
  assert.equal(
    (await getSkyReport("contribution:proposal-1", "context:one")).options.auth,
    "REQUIRED",
  );
});

test("published spot sky remains publicly readable", async () => {
  const result = await getSkyReport("spot:published-1", "context:one");
  assert.equal(result.options.auth, "OPTIONAL", "a formal spot may still be addressed by its contributor's owned Context");
  assert.equal(result.options.query, "contextId=context%3Aone&catalogVersion=bsc5p-bright-stars.v3");

  const resolveDeclaration = source.statements.find(
    (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "resolveSession",
  );
  assert.ok(resolveDeclaration);
  const resolveCode = ts.transpileModule(resolveDeclaration.getText(source) + "\nresolveSession;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  for (const loggedIn of [false, true]) {
    const session: AuthSessionData = { userId: "user:synthetic-reader" as AuthSessionData["userId"], accessToken: "synthetic:reader", expiresAt: "2999-01-01T00:00:00Z" };
    const unavailable = new Error("native login unavailable");
    const resolveSession = vm.runInNewContext(resolveCode, {
      ensureSession: async () => { if (!loggedIn) throw unavailable; return session; },
    }) as (policy: AuthPolicy) => Promise<AuthSessionData | null>;
    const transport = transportHarness();
    const requestOperation = createAuthenticatedOperationRequester({
      resolveSession, readStoredSession: () => loggedIn ? session : null,
      clearStoredSession: () => assert.fail("a successful public read cannot clear identity"),
      isPermissionDenied: () => false,
      request: <T>(key: string, path: string, options: Parameters<Parameters<typeof createAuthenticatedOperationRequester>[0]["request"]>[2]) => {
        const { session: requestSession, ...rest } = options;
        return transport.request(key, path, { ...rest, ...(requestSession ? { session: requestSession } : {}) }) as unknown as Promise<ApiEnvelope<T>>;
      },
    });
    const readReport = vm.runInNewContext(reportCode, {
      ADOPTED_SKY_REPORT_CATALOG_VERSION: "bsc5p-bright-stars.v3", requestOperation,
      projectAdoptedSkyCatalog: (value: unknown) => value,
    }) as (spotId: string, contextId: string) => Promise<unknown>;
    const pending = readReport("spot:published-1", "context:one");
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(transport.calls.length, 1, "a public report dispatches even when native login is unavailable");
    const call = transport.calls[0]!;
    assert.equal(call.header.Authorization, loggedIn ? "Bearer synthetic:reader" : undefined,
      "available identity must survive the formal-spot projection of an owned Context");
    assert.match(call.url, /\/spots\/spot%3Apublished-1\/sky\?contextId=context%3Aone&catalogVersion=bsc5p-bright-stars\.v3$/);
    call.success({ statusCode: 200, data: transport.response });
    assert.deepEqual(await pending, transport.response);
    if (!loggedIn) {
      await assert.rejects(readReport("contribution:private-1", "context:private"), unavailable);
      assert.equal(transport.calls.length, 1, "private proposal failure must not dispatch an anonymous report");
    }
    transport.queryClient.clear();
  }
});

test("planet, SAO and deep-sky positions request the same report catalog as the Sky page", async () => {
  const positionDeclaration = source.statements.find(
    (node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === "getCelestialObjectPosition",
  );
  assert.ok(positionDeclaration);
  const getPosition = vm.runInNewContext(
    ts.transpileModule(
      positionDeclaration.getText(source).replace(/^export /u, "") + "\ngetCelestialObjectPosition;",
      { compilerOptions: { target: ts.ScriptTarget.ES2020 } },
    ).outputText,
    {
      ADOPTED_SKY_REPORT_CATALOG_VERSION: "bsc5p-bright-stars.v3",
      isCelestialObjectReference: () => true,
      requestOperation: (_key: string, _operation: string, options: Record<string, unknown>) => Promise.resolve(options),
      matchingCelestialPositionResponse: (value: unknown) => value,
    },
  ) as (binding: Record<string, string>, catalog: { catalogVersion: string; catalogHash: string }) =>
    Promise<{ query: string }>;
  const skyQuery = (await getSkyReport("spot:published-1", "context:one")).options.query;
  const skyCatalogVersion = new URLSearchParams(skyQuery).get("catalogVersion");
  for (const [reference, objectCatalog] of ([
    ["PLANET:SATURN", "sky-planets.v1"],
    ["SAO:1", "sao-visual-supplement.v2"],
    ["M:31", "deep-sky-messier.v1"],
  ] as const)) {
    const result = await getPosition(
      { reference, spotId: "spot:published-1", contextId: "context:one", at: "2026-09-25T00:00:00Z" },
      { catalogVersion: objectCatalog, catalogHash: "test-hash" },
    );
    assert.equal(new URLSearchParams(result.query).get("catalogVersion"), skyCatalogVersion,
      `${reference} must select the report catalog, independently of its object catalog`);
  }
});
