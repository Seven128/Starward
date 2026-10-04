import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { MINIAPP_API_BASE_PATH, SDSS_OPTICAL_PUBLICATIONS, SDSS_OPTICAL_LEVELS, sdssOpticalPublication, assertSdssOpticalManifest,
  assertSdssScienceOpticalManifest, type SdssEncodedScienceOpticalManifest } from "@starward/miniapp-contracts";
import { createSyntheticSdssSciencePublication } from "../../../../workers/miniapp-api/src/test-fixtures/sdss-science-publication.ts";

function declaration(file: string, name: string) {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  return source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === name)!
    .getText(source).replace(/^export\s+/u, "");
}

test("actual client requests the admitted immutable target through the existing bare resource boundary", async () => {
  const calls: Array<{path:string;kind:string;signal:unknown}> = [];
  let response: unknown;
  const get = vm.runInNewContext(ts.transpileModule(declaration("./sdss-optical-client.ts", "getSdssOpticalManifest") + "\ngetSdssOpticalManifest;",
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, {
    MINIAPP_API_BASE_PATH, sdssOpticalPublication, assertSdssOpticalManifest,
    requestBareSkyResource: async (path:string,kind:string,signal:unknown) => { calls.push({path,kind,signal}); return {status:200,body:response}; },
  }) as typeof import("./sdss-optical-client").getSdssOpticalManifest;
  const url = vm.runInNewContext(ts.transpileModule(declaration("./bare-sky-resource.ts", "skyResourceUrl") + "\nskyResourceUrl;",
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, {__MINIAPP_API_BASE__: "http://127.0.0.1:8791"}) as (path:string,kind:string)=>string;
  const signal = new AbortController().signal;
  for (const [reference, offer] of Object.entries(SDSS_OPTICAL_PUBLICATIONS)) {
    const original = JSON.parse(readFileSync(new URL(`../../../../workers/miniapp-api/assets/deep-sky/sdss-${reference.replace(":", "").toLowerCase()}/manifest.json`, import.meta.url), "utf8"));
    response = { ...original, publicationHash: offer.publicationHash,
      levels: Object.fromEntries(Object.entries(original.levels).map(([level, value]) => {
        const asset = value as {file:string}; return [level,{...asset,downloadUrl:`/v2/sky/sdss-optical/${offer.publicationHash}/${asset.file}`}];
      })) };
    assert.strictEqual(await get(signal, reference), response);
    const last = calls.at(-1)!;
    assert.equal(last.kind, "sdss-optical"); assert.strictEqual(last.signal, signal);
    assert.equal(last.path, `/v2/sky/sdss-optical/${reference === "M:51" ? "manifest" : `${offer.publicationHash}/manifest`}`);
    assert.equal(url(last.path,last.kind), "http://127.0.0.1:8791" + last.path, "native bare URL validation accepts the real request");
  }
  await assert.rejects(get(signal, "M:51"), /sdss_optical_manifest_invalid/u, "M87 can never replace requested M51");
  const before = calls.length;
  await assert.rejects(get(signal, "M:31"), /sdss_optical_manifest_unavailable/u);
  assert.equal(calls.length,before,"an unadmitted target makes no image discovery request");
});

test("source download links exist for each real target and reject forged publication identities", () => {
  const download = vm.runInNewContext(ts.transpileModule(declaration("./api-client.ts", "deepSkyManifestUrl") + "\ndeepSkyManifestUrl;",
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, {SDSS_OPTICAL_PUBLICATIONS, MINIAPP_API_BASE_PATH,
    __MINIAPP_API_BASE__: "http://127.0.0.1:8791"}) as (id:string)=>string|undefined;
  for (const offer of Object.values(SDSS_OPTICAL_PUBLICATIONS)) {
    assert.equal(download(`optical-imagery:${offer.publicationId}:${offer.publicationHash}`),
      `http://127.0.0.1:8791/v2/sky/sdss-optical/${offer.publicationHash}/manifest`);
  }
  assert.equal(download(`optical-imagery:sdss-dr17-m82.v20260929:${"0".repeat(64)}`),undefined);
  assert.equal(download(`imagery:legacy:${"a".repeat(64)}`),`http://127.0.0.1:8791/v2/sky/deep-sky/${"a".repeat(64)}/manifest`);
});

test("explicit science client pins its optical hash, source reference and exact URLs without changing default discovery", async () => {
  const directory = mkdtempSync(join(tmpdir(), "starward-science-client-"));
  try {
    const fixture = createSyntheticSdssSciencePublication(directory), hash = fixture.expectedHash;
    const manifest: SdssEncodedScienceOpticalManifest = { ...fixture.value, publicationHash: hash,
      levels: Object.fromEntries(SDSS_OPTICAL_LEVELS.map(level => [level, { ...fixture.value.levels[level],
        downloadUrl: `/v2/sky/sdss-optical/${hash}/${fixture.value.levels[level].file}` }])) as SdssEncodedScienceOpticalManifest["levels"] };
    let body: unknown = manifest, status = 200;
    const calls: Array<{ path: string; kind: string; signal: unknown }> = [];
    const get = vm.runInNewContext(ts.transpileModule(declaration("./sdss-optical-client.ts", "requestSdssPinnedOpticalManifest") + "\n" + declaration("./sdss-optical-client.ts", "getSdssScienceOpticalManifest") + "\ngetSdssScienceOpticalManifest;",
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { MINIAPP_API_BASE_PATH, assertSdssScienceOpticalManifest,
      requestBareSkyResource: async (path: string, kind: string, signal: unknown) => { calls.push({ path, kind, signal }); return { status, body }; },
    }) as typeof import("./sdss-optical-client").getSdssScienceOpticalManifest;
    const signal = new AbortController().signal;
    assert.strictEqual(await get("M:51", hash, signal), manifest);
    assert.deepEqual(calls[0], { path: `/v2/sky/sdss-optical/${hash}/manifest`, kind: "sdss-optical", signal });
    const before = calls.length;
    await assert.rejects(get("M:51", "bad", signal), /manifest_unavailable/u);
    await assert.rejects(get("M:51/../M:82", hash, signal), /manifest_unavailable/u);
    assert.equal(calls.length, before, "malformed identities cause no request");
    await assert.rejects(get("M:82", hash, signal), /publication_invalid/u);
    await assert.rejects(get("M:51", "3".repeat(64), signal), /publication_invalid/u, "a W3 or another optical identity cannot pin this publication");
    const changed = structuredClone(manifest); changed.levels.DETAIL.downloadUrl = "/somewhere-else.png"; body = changed;
    await assert.rejects(get("M:51", hash, signal), /manifest_invalid/u);
    body = JSON.parse(readFileSync(new URL("../../../../workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json", import.meta.url), "utf8"));
    await assert.rejects(get("M:51", hash, signal), /publication_invalid/u, "legacy data never serves as a v2 fallback");
    body = manifest; status = 404; await assert.rejects(get("M:51", hash, signal), /manifest_unavailable/u);
  } finally {
    assert.equal(dirname(realpathSync(directory)), realpathSync(tmpdir())); assert.match(basename(directory), /^starward-science-client-/u);
    rmSync(directory, { recursive: true }); // Regenerated, owned fixture files only.
  }
});
