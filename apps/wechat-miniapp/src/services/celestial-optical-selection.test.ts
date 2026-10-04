import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as contracts from "@starward/miniapp-contracts";
import { matchingCelestialInformationResponse } from "./celestial-information-response";

function actualFunction(file: string, name: string, bindings: object) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  return vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u, "") + `\n${name};`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { ...contracts, ...bindings });
}

test("actual information client partitions optical/W3 caches, propagates cancellation and rejects stale source identities", async () => {
  const infrared = "a".repeat(64), paintedOptical = "b".repeat(64), newOptical = "c".repeat(64);
  const requests: { key: string; operation: string; options: { query: string; signal?: AbortSignal } }[] = [];
  const invalidations: string[] = [];
  const source = { id: "catalog", kind: "OPEN_DATA", provider: "catalog", title: "catalog", license: "open", limitations: [] };
  const response = { dataState: "FRESH", sources: [source,
    { ...source, id: `imagery:w3:${infrared}` }, { ...source, id: `optical-imagery:science:${paintedOptical}` }],
    data: { reference: "M:51", kind: "GALAXY", displayName: "M 51", catalogId: "M51", aliases: [],
      introduction: null, facts: [{ label: "类型", value: "星系", unit: null }], contentState: "BASIC_ONLY", contentRevision: "info",
      limitations: [], sources: [] as object[] } };
  response.data.sources = response.sources;
  const get = actualFunction("./api-client.ts", "getCelestialObjectInformation", {
    ADOPTED_SKY_REPORT_CATALOG_VERSION: "bsc5p-bright-stars.v3",
    requestOperation: (key: string, operation: string, options: typeof requests[number]["options"]) => {
      requests.push({ key, operation, options }); return Promise.resolve(response);
    }, matchingCelestialInformationResponse, invalidateApiCache: (key: string) => invalidations.push(key),
  });
  const signal = new AbortController().signal;
  assert.equal(await get("M:51", signal, infrared, paintedOptical), response);
  const first = requests[0]!;
  assert.equal(first.operation, "celestialObjectGet"); assert.equal(first.options.signal, signal);
  assert.ok(first.options.query.includes(`deepSkyPublicationHash=${infrared}`));
  assert.ok(first.options.query.includes(`opticalPublicationHash=${paintedOptical}`));
  assert.ok(first.key.includes(`:${infrared}:optical:${paintedOptical}:M:51`));
  await get("M:51", undefined, infrared);
  assert.ok(requests.at(-1)!.key.startsWith("celestial-object:v5:"));
  assert.ok(!requests.at(-1)!.options.query.includes("opticalPublicationHash="));
  await assert.rejects(get("M:51", undefined, infrared, newOptical), /optical_source_invalid/u);
  assert.notEqual(requests.at(-1)!.key, first.key);
  assert.deepEqual(invalidations, [requests.at(-1)!.key + ":"]);
  const callCount = requests.length;
  assert.throws(() => get("M:51", undefined, infrared, ""), /hash_invalid/u);
  assert.throws(() => get("HR:7001", undefined, undefined, paintedOptical), /hash_invalid/u);
  assert.equal(requests.length, callCount, "invalid identity cannot start an API request");
});

test("actual shared information hook keeps independent query identities and selected hash through refetch", async () => {
  const infrared = "a".repeat(64), optical = "b".repeat(64), calls: unknown[][] = [];
  const use = actualFunction("../hooks/use-celestial-information.ts", "useCelestialInformation", {
    useResourceQuery: (value: unknown) => value,
    getCelestialObjectInformation: (...args: unknown[]) => { calls.push(args); return Promise.resolve(); },
  });
  const old = use("M:51", true, infrared), selected = use("M:51", true, infrared, optical);
  assert.equal(selected.enabled, true);
  assert.notDeepEqual(Array.from(selected.queryKey), Array.from(old.queryKey));
  const signal = new AbortController().signal; await selected.queryFn(signal);
  assert.deepEqual(calls, [["M:51", signal, infrared, optical]]);
  assert.equal(use("HR:7001", true, undefined, optical).enabled, false);
  assert.equal(use("M:51", true, infrared, "").enabled, false);
  assert.equal(use("M:51", false, infrared, optical).enabled, false);
  assert.deepEqual(Array.from(use("HR:7001").queryKey).slice(-1), ["current"]);
});

test("actual source links require the selected science version and cannot relabel a registered old version", () => {
  const url = actualFunction("./api-client.ts", "deepSkyManifestUrl", {
    __MINIAPP_API_BASE__: "https://api.example.test/", MINIAPP_API_BASE_PATH: "/v2",
  });
  const optical = "b".repeat(64), infrared = "a".repeat(64);
  const sourceId = `optical-imagery:science-optical:${optical}`;
  assert.equal(url(sourceId), undefined);
  assert.equal(url(sourceId, optical), `https://api.example.test/v2/sky/sdss-optical/${optical}/manifest`);
  assert.equal(url(sourceId, infrared), undefined);
  assert.equal(url(`optical-imagery:../escape:${optical}`, optical), undefined);
  for (const offer of Object.values(contracts.SDSS_OPTICAL_PUBLICATIONS)) {
    const id = `optical-imagery:${offer.publicationId}:${offer.publicationHash}`;
    assert.ok(url(id)); assert.equal(url(id, optical), undefined);
    assert.equal(url(id, offer.publicationHash), url(id));
  }
  assert.equal(url(`imagery:w3:${infrared}`, optical), `https://api.example.test/v2/sky/deep-sky/${infrared}/manifest`);
});
