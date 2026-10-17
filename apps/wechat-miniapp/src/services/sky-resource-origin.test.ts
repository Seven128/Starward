import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PREPARED_OPTICAL_DISCOVERY_PATH } from "@starward/miniapp-contracts";
import { skyResourceOriginTestOwner } from "./sky-resource-origin-test-support";

const api = "https://api.fixture.invalid", resource = "https://images.fixture.invalid", hash = "a".repeat(64);
function bare() {
  const calls: any[] = [], exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./bare-sky-resource.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, Error, Promise, __MINIAPP_API_BASE__: api, __MINIAPP_SKY_RESOURCE_BASE__: resource,
    __MINIAPP_OPERATOR_PREVIEW_TOKEN__: "controlled-preview", require(name: string) {
      if (name === "./sky-resource-origin" || name === "./sky-image-diagnostics") return skyResourceOriginTestOwner(api, resource, "controlled-preview");
      if (name === "@starward/miniapp-contracts") return { PREPARED_OPTICAL_DISCOVERY_PATH };
      assert.equal(name, "@tarojs/taro");
      return { default: { request(options: any) { calls.push(options); queueMicrotask(() => options.success({ statusCode: 200, data: {} }));
        return { abort() {} }; } } };
    } });
  return { calls, ...exports };
}

test("real bare consumers separate fixed publication bytes from current discovery and do not retry the API", async () => {
  const h = bare();
  const fixed = [
    [`/v2/sky/prepared-optical/${hash}/region-test-detail.png`, "prepared-optical"],
    [`/v2/sky/sdss-optical/${hash}/manifest`, "sdss-optical"],
    [`/v2/sky/moon/coverage/${hash}/global-1024.png`, "moon"],
    [`/v2/sky/deep-sky/${hash}/M-42/M-42-detail.jpg`, "deep-sky"],
    [`/v2/sky/landscape/${hash}/panorama-1024.alpha-rle.json`, "landscape"],
  ];
  for (const [path, kind] of fixed) assert.equal(h.skyResourceUrl(path, kind), resource + path);
  for (const [path, kind] of [[PREPARED_OPTICAL_DISCOVERY_PATH, "prepared-optical"],
    ["/v2/sky/deep-sky/selected/M%3A42?imageVersion=source-finite-v3", "deep-sky"],
    ["/v2/sky/sdss-optical/manifest", "sdss-optical"]]) assert.equal(h.skyResourceUrl(path, kind), api + path);
  await h.requestBareSkyResource(`/v2/sky/sdss-optical/${hash}/manifest`, "sdss-optical");
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].url, resource + `/v2/sky/sdss-optical/${hash}/manifest`);
  assert.equal(h.calls[0].header, undefined);
  await h.requestBareSkyResource(PREPARED_OPTICAL_DISCOVERY_PATH, "prepared-optical");
  assert.equal(h.calls[1].url, api + PREPARED_OPTICAL_DISCOVERY_PATH);
  assert.equal(h.calls[1].header["X-Starward-Operator-Preview"], "controlled-preview");
});

test("publication address and preview policy reject discovery, traversal and origin lookalikes", () => {
  const h = skyResourceOriginTestOwner(api + "/", resource + "/", "controlled-preview");
  const path = `/v2/sky/constellations/${hash}/assets/geometry-v2.json`;
  assert.equal(h.skyPublishedResourceUrl(path), resource + path);
  assert.equal(h.skyPublishedResourceUrl(`/v2/sky/deep-sky/${hash}/manifest`), api + `/v2/sky/deep-sky/${hash}/manifest`,
    "legacy W3 metadata keeps API-relative download links while displayed files use the resource origin");
  assert.equal(h.skyPublishedResourceUrl(`/v2/sky/supplements/sao/v2/${hash}/assets/10-12-9-1`),
    resource + `/v2/sky/supplements/sao/v2/${hash}/assets/10-12-9-1`);
  for (const invalid of [PREPARED_OPTICAL_DISCOVERY_PATH, path + "?x=1", path.replace("geometry-v2.json", "../image.png"),
    path.replace("geometry-v2.json", "//image.png"), "https://another.invalid" + path])
    assert.throws(() => h.skyPublishedResourceUrl(invalid), /path_invalid/u);
  for (const url of [resource + path, api + ".attacker.invalid" + path, api + ":8443" + path, "https://another.invalid" + path])
    assert.equal(h.skyResourcePreviewHeaders(url).header, undefined);
  assert.equal(h.skyResourcePreviewHeaders(api + path).header?.["X-Starward-Operator-Preview"], "controlled-preview");
  assert.equal(h.skyResourceEnvironmentIdentity(), api + "\n" + resource);
  assert.equal(skyResourceOriginTestOwner(api).skyResourceEnvironmentIdentity(), api);
});
