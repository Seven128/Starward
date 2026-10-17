import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { skyResourceOriginTestOwner } from "./sky-resource-origin-test-support";
import * as contracts from "@starward/miniapp-contracts";

function module(file: string, bindings: Record<string, unknown>) {
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, Promise, Error, __MINIAPP_API_BASE__: "https://prepared.fixture.invalid/",
    require(name: string) { if(name === "./sky-resource-origin" || name === "./sky-image-diagnostics") return skyResourceOriginTestOwner("https://prepared.fixture.invalid/");
      assert.ok(name in bindings, name); return bindings[name]; } });
  return exports;
}

test("real client uses same-origin current discovery and exact selected metadata; malformed discovery does not start images", async () => {
  const calls: any[] = [], requests: any[] = [];
  const bare = module("./bare-sky-resource.ts", { "@starward/miniapp-contracts": contracts, "@tarojs/taro": { default: {
    request(options: any) { calls.push(options); requests.push(options); return { abort() { options.fail(); } }; },
  } } });
  const client = module("./prepared-optical-client.ts", { "@starward/miniapp-contracts": contracts, "./bare-sky-resource": bare });
  const discovery: contracts.PreparedOpticalDiscovery = { schemaVersion: "prepared-optical-discovery-v1", publications: [
    { kind: "prepared-native-optical-v1", reference: "NGC:253", publicationHash: "a".repeat(64) },
  ] };
  const pending = client.getPreparedOpticalDiscovery();
  assert.equal(calls[0].url, "https://prepared.fixture.invalid" + contracts.PREPARED_OPTICAL_DISCOVERY_PATH);
  requests.shift().success({ statusCode: 200, data: discovery }); assert.equal(await pending, discovery);
  const selected = contracts.selectedPreparedOpticalPublication(discovery, "NGC:253")!;
  const metadata = client.getPreparedOpticalManifest(selected.reference, selected.publicationHash);
  assert.equal(calls[1].url, `https://prepared.fixture.invalid/v2/sky/prepared-optical/${selected.publicationHash}/manifest`);
  requests.shift().success({ statusCode: 404, data: {} });
  await assert.rejects(metadata, /manifest_unavailable/u);
  assert.equal(calls.length, 2, "missing selected metadata must never retry mutable discovery or borrow another edition");
  const invalid = client.getPreparedOpticalDiscovery();
  requests.shift().success({ statusCode: 200, data: { ...discovery, publications: [discovery.publications[0], discovery.publications[0]] } });
  await assert.rejects(invalid, /discovery_invalid/u);
  for (const path of [contracts.PREPARED_OPTICAL_DISCOVERY_PATH + "?hash=anything", "/v2/sky/prepared-optical/../manifest",
    "https://foreign.invalid/v2/sky/prepared-optical/manifest", "/v2/sky/prepared-optical/current"])
    assert.throws(() => bare.skyResourceUrl(path, "prepared-optical"), /path_invalid/u);
});

test("current discovery cancellation retires a late response and remains recoverable", async () => {
  const calls: any[] = []; let aborts = 0;
  const bare = module("./bare-sky-resource.ts", { "@starward/miniapp-contracts": contracts, "@tarojs/taro": { default: {
    request(options: any) { calls.push(options); return { abort() { aborts++; options.fail(); } }; },
  } } });
  const client = module("./prepared-optical-client.ts", { "@starward/miniapp-contracts": contracts, "./bare-sky-resource": bare });
  const controller = new AbortController(), request = client.getPreparedOpticalDiscovery(controller.signal);
  controller.abort(); calls[0].success({ statusCode: 200, data: { schemaVersion: "prepared-optical-discovery-v1", publications: [] } });
  await assert.rejects(request, /request_cancelled/u); assert.equal(aborts, 1);
  const retry = client.getPreparedOpticalDiscovery();
  calls[1].success({ statusCode: 200, data: { schemaVersion: "prepared-optical-discovery-v1", publications: [] } });
  assert.equal((await retry).publications.length, 0, "a genuinely empty set is a valid result, unlike failure");
});
