import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as contracts from "@starward/miniapp-contracts";
import { matchingCelestialInformationResponse } from "./celestial-information-response";
import { celestialInformationPartialDetail } from "./celestial-information-presentation";
import { transportHarness } from "./api-request-test-support";

function actualFunction(file: string, name: string, bindings: object) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  return vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export\s+(?:default\s+)?/u, "") + `\n${name};`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, { ...contracts, ...bindings });
}
function information(): contracts.ApiEnvelope<contracts.CelestialObjectInformationData> {
  if (process.env.CLOUD_SKY_PREPARED_SOURCE_TRACE_PATH)
    return JSON.parse(readFileSync(process.env.CLOUD_SKY_PREPARED_SOURCE_TRACE_PATH, "utf8")).fresh;
  const hash = "b".repeat(64), source: contracts.SourceSummary = {
    id: `prepared-optical-imagery:prepared-test:${hash}`, kind: "OPEN_DATA", provider: "example.invalid", title: "Historical observation",
    license: "CC BY 4.0", sourceUrl: "https://example.invalid/image/", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution: { name: "Full portable test credit", url: "https://example.invalid/image/", statements: ["Full portable test credit", "Modified display geometry"] },
    publishedAt: null, retrievedAt: null, validFrom: null, validTo: null, state: "FRESH", confidence: null,
    precision: "Portable test source; not source-quality evidence",
    limitations: ["Encoded historical RGB; scientific availability UNKNOWN"],
  };
  return { apiVersion: "v2", dataState: "FRESH", generatedAt: "2026-10-03T00:00:00Z", validAt: null, etag: "test-prepared-info", warnings: [],
    requestId: "portable-test", sources: [source], data: { reference: "M:51", kind: "GALAXY", displayName: "M 51", catalogId: "M51",
      aliases: [], introduction: null, facts: [{ label: "类型", value: "星系", unit: null }], contentState: "BASIC_ONLY", contentRevision: "test",
      sources: [source], limitations: [] } };
}
function selected() {
  const response = information(), source = response.data.sources.find(item => item.id.startsWith("prepared-optical-imagery:"))!;
  assert.ok(source); return { response, source, hash: source.id.split(":").at(-1)! };
}
const manifestUrl = () => actualFunction("./api-client.ts", "deepSkyManifestUrl", {
  __MINIAPP_API_BASE__: "https://api.example.test/", MINIAPP_API_BASE_PATH: "/v2",
});

test("the actual information client preserves the bound Prepared BFF credit and rejects a later optical version", async () => {
  const { response, source, hash } = selected(), calls: { key: string; query: string; signal?: AbortSignal }[] = [], invalidations: string[] = [];
  const get = actualFunction("./api-client.ts", "getCelestialObjectInformation", {
    ADOPTED_SKY_REPORT_CATALOG_VERSION: "bsc5p-bright-stars.v3", matchingCelestialInformationResponse,
    requestOperation: (key: string, _operation: string, options: { query: string; signal?: AbortSignal }) => {
      calls.push({ key, ...options }); return Promise.resolve(response);
    }, invalidateApiCache: (key: string) => invalidations.push(key),
  });
  const signal = new AbortController().signal;
  assert.equal(await get("M:51", signal, undefined, hash), response);
  assert.equal(calls[0]!.signal, signal); assert.ok(calls[0]!.query.includes(`opticalPublicationHash=${hash}`));
  assert.ok(calls[0]!.key.includes(`:optical:${hash}:M:51`));
  assert.deepEqual(response.data.sources.find(item => item.id === source.id), source);
  const other = hash === "0".repeat(64) ? "1".repeat(64) : "0".repeat(64);
  await assert.rejects(get("M:51", undefined, undefined, other), /optical_source_invalid/u);
  assert.deepEqual(invalidations, [calls.at(-1)!.key + ":"]);
});

test("Prepared source links require the exact painted hash and retain their own manifest family", () => {
  const { source, hash } = selected(), url = manifestUrl(), infrared = "a".repeat(64);
  assert.equal(url(source.id), undefined);
  assert.equal(url(source.id, hash), `https://api.example.test/v2/sky/prepared-optical/${hash}/manifest`);
  assert.equal(url(source.id, infrared), undefined);
  for (const bad of [`prepared-optical-imagery:../escape:${hash}`, `prepared-optical-imagery:bad\\name:${hash}`,
    `prepared-optical-imagery:bad:extra:${hash}`, `prepared-optical-imagery:prepared:${hash.toUpperCase()}`])
    assert.equal(url(bad, hash), undefined);
  assert.equal(url(`imagery:w3:${infrared}`, hash), `https://api.example.test/v2/sky/deep-sky/${infrared}/manifest`);
  for (const offer of Object.values(contracts.SDSS_OPTICAL_PUBLICATIONS)) {
    const id = `optical-imagery:${offer.publicationId}:${offer.publicationHash}`;
    assert.equal(url(id, offer.publicationHash), url(id));
    assert.ok(url(id).includes("/sky/sdss-optical/"));
  }
});

test("Prepared response identity rejects mixed or malformed optical families and retains explicit missing-source facts", () => {
  const { response, source, hash } = selected();
  assert.equal(matchingCelestialInformationResponse(response, "M:51", undefined, hash), response);
  const mixed = structuredClone(response);
  mixed.data.sources = [...mixed.data.sources, { ...source, id: `optical-imagery:wrong-family:${hash}` }]; mixed.sources = mixed.data.sources;
  assert.throws(() => matchingCelestialInformationResponse(mixed, "M:51", undefined, hash), /optical_source_invalid/u);
  for (const id of [`prepared-optical-imagery:../escape:${hash}`, `prepared-optical-imagery:prepared:${"f".repeat(64)}`]) {
    const wrong = structuredClone(response);
    wrong.data.sources.find(item => item.id.startsWith("prepared-optical-imagery:"))!.id = id; wrong.sources = wrong.data.sources;
    assert.throws(() => matchingCelestialInformationResponse(wrong, "M:51", undefined, hash), /optical_source_invalid/u);
  }
  const wrongEnvelope = structuredClone(response);
  wrongEnvelope.sources = wrongEnvelope.sources.filter(item => !item.id.startsWith("prepared-optical-imagery:"));
  assert.throws(() => matchingCelestialInformationResponse(wrongEnvelope, "M:51", undefined, hash), /optical_source_invalid/u);
  const partial = structuredClone(response);
  partial.data.sources = partial.data.sources.filter(item => !item.id.startsWith("prepared-optical-imagery:")); partial.sources = partial.data.sources;
  assert.throws(() => matchingCelestialInformationResponse(partial, "M:51", undefined, hash), /optical_source_invalid/u);
  partial.dataState = "PARTIAL"; partial.warnings = ["prepared_optical_publication_unavailable"];
  assert.equal(matchingCelestialInformationResponse(partial, "M:51", undefined, hash), partial);
  assert.deepEqual(partial.data.facts, response.data.facts);
});

test("both information consumers disclose missing Prepared optical credit and preserve stale/retry meaning", () => {
  for (const dataState of ["PARTIAL", "STALE_USABLE"] as const) {
    assert.match(celestialInformationPartialDetail({ dataState, warnings: ["prepared_optical_publication_unavailable"] })!, /光学影像来源暂不可用/u);
    assert.match(celestialInformationPartialDetail({ dataState, warnings: ["prepared_optical_publication_unavailable", "deep_sky_image_publication_unavailable"] })!, /红外影像与光学影像/u);
  }
  assert.equal(celestialInformationPartialDetail({ dataState: "FRESH", warnings: [] }), null);
});

test("actual cache fallback keeps explicit missing-source facts through STALE_USABLE and recovers the same selected versions", async () => {
  const { response, source, hash } = selected();
  const fresh = structuredClone(response);
  if (!fresh.data.sources.some(item => item.id.startsWith("imagery:"))) {
    fresh.data.sources = [...fresh.data.sources, { ...source, id: `imagery:portable-w3:${"a".repeat(64)}` }]; fresh.sources = fresh.data.sources;
  }
  const infrared = fresh.data.sources.find(item => item.id.startsWith("imagery:"))!.id.split(":").at(-1)!;
  for (const [missingOptical, missingInfrared] of [[true, false], [false, true], [true, true]]) {
    const partial = structuredClone(fresh); partial.dataState = "PARTIAL";
    partial.warnings = [...(missingOptical ? ["prepared_optical_publication_unavailable"] : []),
      ...(missingInfrared ? ["deep_sky_image_publication_unavailable"] : [])];
    partial.data.sources = partial.data.sources.filter(item => !(missingOptical && /^(?:prepared-)?optical-imagery:/u.test(item.id)) &&
      !(missingInfrared && item.id.startsWith("imagery:"))); partial.sources = partial.data.sources;
    const harness = transportHarness();
    const get = actualFunction("./api-client.ts", "getCelestialObjectInformation", {
      ADOPTED_SKY_REPORT_CATALOG_VERSION: "bsc5p-bright-stars.v3", matchingCelestialInformationResponse,
      invalidateApiCache: harness.invalidateApiCache,
      requestOperation: (key: string, _operation: string, options: { query: string }) => harness.request(key, "/information?" + options.query),
    });
    const initial = get("M:51", undefined, infrared, hash);
    harness.calls.at(-1)!.success({ statusCode: 200, data: partial }); assert.equal(await initial, partial);
    await harness.flush();
    const next = get("M:51", undefined, infrared, hash); harness.calls.at(-1)!.fail({ errMsg: "request:fail offline" });
    const stale = await next;
    assert.equal(stale.dataState, "STALE_USABLE"); assert.deepEqual(stale.data.facts, partial.data.facts);
    for (const warning of partial.warnings) assert.ok(stale.warnings.includes(warning));
    assert.ok(celestialInformationPartialDetail(stale));
    const unmarked = structuredClone(stale); unmarked.warnings = [];
    assert.throws(() => matchingCelestialInformationResponse(unmarked, "M:51", infrared, hash), /(?:image|optical)_source_invalid/u);
    if (missingOptical && missingInfrared) for (const warning of partial.warnings) {
      const partlyMarked = structuredClone(stale); partlyMarked.warnings = [warning];
      assert.throws(() => matchingCelestialInformationResponse(partlyMarked, "M:51", infrared, hash), /(?:image|optical)_source_invalid/u);
    }
    const advertisedFresh = structuredClone(stale); advertisedFresh.dataState = "FRESH";
    assert.throws(() => matchingCelestialInformationResponse(advertisedFresh, "M:51", infrared, hash), /(?:image|optical)_source_invalid/u);
    const retried = get("M:51", undefined, infrared, hash);
    harness.calls.at(-1)!.success({ statusCode: 200, data: fresh }); assert.equal(await retried, fresh);
    harness.queryClient.clear();
  }
});

test("the actual source page passes original Prepared credit and its exact link to Provenance, retaining partial retry", () => {
  const { response, source, hash } = selected(), requests: unknown[][] = [];
  let retries = 0, current = response;
  const render = actualFunction("../sky/sources/index.tsx", "CelestialSourcesPage", {
    React: { createElement: (type: string, props: object, ...children: unknown[]) => ({ type, props: props ?? {}, children }) },
    View: "View", ScrollView: "ScrollView", CustomNav: "CustomNav", Provenance: "Provenance", StatusPanel: "StatusPanel",
    useRouter: () => ({ params: { reference: "M%3A51", opticalPublicationHash: hash } }),
    useState: (value: unknown) => [value, () => {}], useDidHide() {}, useDidShow() {}, useThemeClass: () => "mode-night",
    isProductSource: () => true, deepSkyManifestUrl: manifestUrl(), celestialInformationPartialDetail,
    useResourceQuery: (options: { enabled: boolean }) => { assert.equal(options.enabled, false); return { isPending: false, isError: false }; },
    useCelestialInformation: (...args: unknown[]) => { requests.push(args); return { isPending: false, isError: false, refreshError: null,
      data: current, refetch: () => { retries++; return Promise.resolve(); } }; },
  });
  function find(node: any, predicate: (item: any) => boolean): any {
    if (Array.isArray(node)) { for (const child of node) { const value = find(child, predicate); if (value) return value; } return null; }
    if (predicate(node)) return node;
    for (const child of node?.children ?? []) { const value = find(child, predicate); if (value) return value; }
    return null;
  }
  const tree = render(), credit = find(tree, item => item?.type === "Provenance" && item.props.source.id === source.id);
  assert.ok(credit); assert.equal(credit.props.source, source);
  assert.equal(credit.props.downloadUrl, `https://api.example.test/v2/sky/prepared-optical/${hash}/manifest`);
  assert.deepEqual(Array.from(requests[0]!), ["M:51", true, undefined, hash]);
  current = structuredClone(response); current.dataState = "PARTIAL"; current.warnings = ["prepared_optical_publication_unavailable"];
  current.data.sources = current.data.sources.filter(item => !item.id.startsWith("prepared-optical-imagery:")); current.sources = current.data.sources;
  const partial = find(render(), item => item?.type === "StatusPanel" && item.props.state === "PARTIAL");
  assert.ok(partial); assert.match(partial.props.detail, /光学影像来源/u); partial.props.onRecover();
  assert.equal(retries, 1); assert.deepEqual(Array.from(requests.at(-1)!), ["M:51", true, undefined, hash]);
});
