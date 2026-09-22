import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createStellarCatalogClient } from "./stellar-catalog-client";
import { createAuthenticatedOperationRequester } from "./authenticated-operation";
import { transportHarness } from "./api-request-test-support";
import { STELLAR_GEOMETRY_FORMAT, STELLAR_GEOMETRY_REFERENCE_AT, type ApiEnvelope, type StellarCatalogPublication } from "@starward/miniapp-contracts";

const reference = { catalogVersion: "bsc5p-bright-stars.v1", catalogHash: "a".repeat(64) };
const group = `stellar-catalog:${reference.catalogVersion}:${reference.catalogHash}`;
const path = `/v2/sky/catalogs/${reference.catalogVersion}/${reference.catalogHash}`;
const key = `${group}:${path}:anonymous`;
function fixture(h: ReturnType<typeof transportHarness>): ApiEnvelope<StellarCatalogPublication> {
  // Cache/failure mechanism fixture; astronomical accuracy is covered with real HTTP publication.
  const sources = [{ id: "test:publication", kind: "OPEN_DATA" as const, title: "Synthetic contract test", provider: "Test",
    sourceUrl: "https://example.invalid/catalog", license: "Test", licenseUrl: "https://example.invalid/terms",
    publishedAt: null, retrievedAt: "2026-09-19T00:00:00Z", validFrom: null, validTo: null, state: "FRESH" as const,
    confidence: 1, precision: "Synthetic", limitations: [] }];
  return { ...h.response, apiVersion: "v2", dataState: "FRESH", validAt: null, sources,
    data: { ...reference, format: STELLAR_GEOMETRY_FORMAT, referenceAt: STELLAR_GEOMETRY_REFERENCE_AT,
      magnitudeLimit: 5, magnitudeBand: "V", colorIndexBand: "B-V", sources,
      rows: Array.from({ length: 1630 }, (_, i) => [`HR:${i + 1}`, null, 4, null, 1, 0, 0, 0, 0, 0]) } };
}
function client(h: ReturnType<typeof transportHarness>) {
  return createStellarCatalogClient({
    request: (_reference, signal) => h.request(group, path, signal ? { signal } : {}) as unknown as Promise<ApiEnvelope<StellarCatalogPublication>>,
    invalidate: () => h.invalidateApiCache(`${group}:`),
  });
}

test("catalog survives chunked cache restart and validates both offline and 304 representations", async () => {
  const old = transportHarness(), data = fixture(old);
  const initial = client(old)(reference);
  old.calls.at(-1)!.success({ statusCode: 200, data });
  await initial; await old.flush();
  assert.ok(old.storage.size > 1, "body chunks and manifest were written");
  for (const mode of ["offline", "304"]) {
    const current = transportHarness();
    for (const [name, value] of old.storage) current.storage.set(name, structuredClone(value));
    const pending = client(current)(reference);
    assert.equal(current.calls.at(-1)!.header["If-None-Match"], data.etag);
    if (mode === "304") current.calls.at(-1)!.success({ statusCode: 304, data: undefined });
    else current.calls.at(-1)!.fail({ errMsg: "offline" });
    assert.deepEqual((await pending).data, data.data);
    current.queryClient.clear();
  }
  old.queryClient.clear();
});

test("invalid publication cannot survive network or offline validation and cache is evicted", async () => {
  for (const mode of ["200", "304", "offline"]) {
    const h = transportHarness(), data = fixture(h);
    const wrong = structuredClone(data);
    wrong.data.catalogHash = "b".repeat(64);
    if (mode !== "200") {
      const seed = h.request(group, path);
      h.calls.at(-1)!.success({ statusCode: 200, data: wrong });
      await seed; await h.flush();
    }
    const pending = client(h)(reference);
    if (mode === "offline") h.calls.at(-1)!.fail({ errMsg: "offline" });
    else h.calls.at(-1)!.success({ statusCode: Number(mode), data: mode === "200" ? wrong : undefined });
    await assert.rejects(pending, /catalog_binding/);
    assert.equal(h.responseCache.get(key), undefined);
    await h.flush();
    h.queryClient.clear();
  }
});

test("invalid references never request; cancellation cannot turn into stale catalog success", async () => {
  const h = transportHarness(), get = client(h);
  await assert.rejects(get({ ...reference, catalogVersion: "../../private" }), /reference/);
  assert.equal(h.calls.length, 0);
  const initial = get(reference);
  h.calls.at(-1)!.success({ statusCode: 200, data: fixture(h) });
  await initial;
  const abort = new AbortController(), pending = get(reference, abort.signal);
  abort.abort();
  await assert.rejects(pending, /miniapp_request_cancelled/);
  assert.equal(h.counts().aborts, 1);
  h.queryClient.clear();
});

test("public API facade uses generated version/hash route and evicts its exact cached representation", async () => {
  const h = transportHarness();
  const requestOperation = createAuthenticatedOperationRequester({
    resolveSession: async () => null, readStoredSession: () => null, clearStoredSession: () => {}, isPermissionDenied: () => false,
    request: h.request as never,
  });
  const source = ts.createSourceFile("api-client.ts", readFileSync(new URL("./api-client.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(item => item.name.getText(source) === "getStellarCatalog"));
  assert.ok(declaration);
  const get = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u, "") + "\ngetStellarCatalog;",
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    createStellarCatalogClient, requestOperation, invalidateApiCache: h.invalidateApiCache,
  }) as ReturnType<typeof createStellarCatalogClient>;
  const pending = get(reference);
  await new Promise<void>(resolve => setImmediate(resolve));
  const data = fixture(h);
  h.calls.at(-1)!.success({ statusCode: 200, data });
  await pending;
  assert.deepEqual(h.responseCache.get(key)?.envelope.data, data.data, "generated URL and resource group bind the persisted key");
  const bad = get(reference);
  await new Promise<void>(resolve => setImmediate(resolve));
  const invalid = structuredClone(data);
  invalid.data.rows = invalid.data.rows.slice(1);
  h.calls.at(-1)!.success({ statusCode: 200, data: invalid });
  await assert.rejects(bad, /publication_invalid/);
  assert.equal(h.responseCache.get(key), undefined);
  await h.flush(); h.queryClient.clear();
});

test("callers cannot change published star facts or replace a cached envelope before 304 reuse", async () => {
  const h = transportHarness(), get = client(h), data = fixture(h);
  const initial = get(reference);
  h.calls.at(-1)!.success({ statusCode: 200, data });
  const result = await initial;
  assert.throws(() => { (result.data.rows[0] as unknown as number[])[2] = 1; }, TypeError);
  assert.throws(() => { result.data.sources[0]!.title = "changed"; }, TypeError);
  assert.throws(() => { (result.data.sources[0]!.limitations as string[]).push("changed"); }, TypeError);
  assert.throws(() => { (result as ApiEnvelope<StellarCatalogPublication>).data = { ...result.data, magnitudeLimit: 4 }; }, TypeError);
  assert.throws(() => { (result as ApiEnvelope<StellarCatalogPublication>).etag = "changed"; }, TypeError);
  const reused = get(reference);
  h.calls.at(-1)!.success({ statusCode: 304, data: undefined });
  assert.equal((await reused).data.rows[0]![2], 4);
  await h.flush(); h.queryClient.clear();
});

test("page query passes its actual AbortSignal to transport and aborts native work on cancellation", async () => {
  const h = transportHarness(), getStellarCatalog = client(h);
  let text = readFileSync(new URL("../features/sky/spot-sky-page.tsx", import.meta.url), "utf8");
  if (process.env.MUTATE_STELLAR_SIGNAL === "1") text = text.replace("getStellarCatalog(stellarReference!, signal)", "getStellarCatalog(stellarReference!, { signal })");
  const source = ts.createSourceFile("sky.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let options = "";
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "stellarCatalog" && node.initializer && ts.isCallExpression(node.initializer))
      options = node.initializer.arguments[0]!.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(options);
  const query = vm.runInNewContext(ts.transpileModule("(" + options + ");", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText,
    { stellarReference: reference, getStellarCatalog, pageVisible: true });
  const controller = new AbortController();
  const pending = query.queryFn(controller.signal);
  // Observe the rejection even if the guard below catches the original broken wiring.
  const observed = pending.catch((error: unknown) => { throw error; });
  observed.catch(() => {});
  assert.equal(h.calls.length, 1, "the page must actually reach the native request boundary");
  controller.abort();
  await assert.rejects(observed, /miniapp_request_cancelled/);
  assert.equal(h.counts().aborts, 1);
  h.queryClient.clear();
});
