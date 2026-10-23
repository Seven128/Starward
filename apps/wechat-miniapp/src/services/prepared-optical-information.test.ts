import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { skyResourceOriginTestOwner } from "./sky-resource-origin-test-support";
import * as contracts from "@starward/miniapp-contracts";
import { matchingCelestialInformationResponse } from "./celestial-information-response";
import { celestialInformationPartialDetail } from "./celestial-information-presentation";
import { transportHarness } from "./api-request-test-support";
import {sourceCompositionTestScope,sourceRecoveryTestScope} from "../sky/sources/source-recovery-test-support";

function actualFunction(file: string, name: string, bindings: object) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  const scope=sourceRecoveryTestScope();
  const actual:(...args:any[])=>any=vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export\s+(?:default\s+)?/u, "") + `\n${name};`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, { ...contracts, ...scope.bindings, ...bindings });
  return (...args:any[])=>scope.render(actual,...args);
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
const manifestUrl = () => actualFunction("./sky-catalog-api.ts", "deepSkyManifestUrl", {
  __MINIAPP_API_BASE__: "https://api.example.test/", ...skyResourceOriginTestOwner("https://api.example.test/"), MINIAPP_API_BASE_PATH: "/v2",
});

test("the actual information client preserves the bound Prepared BFF credit and rejects a later optical version", async () => {
  const { response, source, hash } = selected(), calls: { key: string; query: string; signal?: AbortSignal }[] = [], invalidations: string[] = [];
  const get = actualFunction("./sky-celestial-client.ts", "getCelestialObjectInformation", {
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
    assert.match(celestialInformationPartialDetail({ dataState, warnings: ["prepared_optical_publication_unavailable", "deep_sky_image_publication_unavailable"] })!, /红外与光学影像来源/u);
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
    const get = actualFunction("./sky-celestial-client.ts", "getCelestialObjectInformation", {
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

test("the actual source page renders original Prepared credit and copies its exact publication, retaining partial retry and selection fences", async () => {
  const { response, source, hash } = selected(), scope=sourceCompositionTestScope();
  const selectedParams={reference:"M%3A51",opticalPublicationHash:hash};
  const expectedUrl=`https://api.example.test/v2/sky/prepared-optical/${hash}/manifest`;
  const assertSelectedRequest=()=>{
    const operation=scope.operationCalls.at(-1)!;
    assert.equal(operation.operation,"celestialObjectGet");assert.equal(operation.options.pathParams.reference,"M:51");
    assert(operation.key.includes(`:optical:${hash}:M:51`));
    assert(new URLSearchParams(operation.options.query).get("opticalPublicationHash")===hash);
    const url=new URL(scope.transport.calls.at(-1)!.url);
    assert.equal(decodeURIComponent(url.pathname),"/v2/celestial-objects/M:51");
    assert.equal(url.searchParams.get("opticalPublicationHash"),hash);
    assert(!url.pathname.includes("/prepared-optical/"),"the source query must not acquire image bytes");
  };
  const assertCredit=()=>{
    assert(scope.text.includes(source.attribution!.name));
    assert(scope.text.includes(source.attribution!.url));
    for(const statement of source.attribution!.statements)assert(scope.text.includes(statement),`missing original statement: ${statement}`);
    assert(scope.text.includes(source.license));assert(scope.text.includes(source.precision));
    for(const limitation of source.limitations)assert(scope.text.includes(limitation));
  };
  try{
    await scope.object(selectedParams);assertSelectedRequest();await scope.respond(response);assertCredit();
    const cached=scope.transport.queryClient.getQueryCache().find({queryKey:["celestial-object-information"],exact:false})?.state.data as typeof response;
    assert.equal(cached.data.sources.find(item=>item.id===source.id),source,"the page query retains the admitted original credit record");
    const downloads=scope.buttons().filter(button=>button.ariaLabel==="复制本次使用的数据下载链接");
    assert(downloads.length>0);
    for(let index=0;index<downloads.length;index++)await scope.click("复制本次使用的数据下载链接",index);
    assert(scope.clipboard.includes(expectedUrl),"the actual Provenance copy action keeps the exact Prepared family/hash");
    assert(!scope.clipboard.some(url=>url.includes("/display/manifest")));

    const partial=structuredClone(response);partial.dataState="PARTIAL";partial.warnings=["prepared_optical_publication_unavailable"];
    partial.etag=response.etag+":partial";
    partial.data.sources=partial.data.sources.filter(item=>!item.id.startsWith("prepared-optical-imagery:"));partial.sources=partial.data.sources;
    await scope.refreshInformation();assertSelectedRequest();await scope.respond(partial);
    assert.match(scope.text,/光学影像来源暂不可用/u);assert(!scope.text.includes(source.attribution!.name));
    const queuedRetry=scope.button("重试资料"),before=scope.transport.calls.length;
    await scope.hide();queuedRetry.onClick({});assert.equal(scope.transport.calls.length,before,"hide fences a queued source retry");
    await scope.show();await scope.click("重试资料");
    assert.equal(scope.transport.calls.length,before+1);assertSelectedRequest();await scope.respond(response);assertCredit();

    const other=hash==="0".repeat(64)?"1".repeat(64):"0".repeat(64);
    await scope.object({...selectedParams,opticalPublicationHash:other});
    const replaced=scope.transport.calls.length;queuedRetry.onClick({});assert.equal(scope.transport.calls.length,replaced,"an old button cannot retry a replacement edition");
    assert(!scope.text.includes(source.attribution!.name),"old credit must leave while the new edition is unresolved");
    await scope.respond(response);
    assert(!scope.text.includes(source.attribution!.name),"a response for the previous hash cannot be relabelled as the new edition");
    assert.match(scope.text,/来源暂时无法加载/u);
    await scope.object({...selectedParams,opticalPublicationHash:"../outside"});
    assert.equal(scope.transport.calls.length,replaced,"invalid identities cannot request a fallback edition");
    assert.match(scope.text,/请从天体说明中的来源入口打开/u);
  }finally{await scope.dispose();}
});
