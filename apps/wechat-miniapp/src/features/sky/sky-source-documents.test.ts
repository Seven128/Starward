import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { MELLINGER_OPTICAL_MILKY_WAY } from "@starward/miniapp-contracts";
import type * as adapters from "./sky-source-documents";

const exports: Record<string, unknown> = {};
const origin = "https://owned.example";
const dependencies: Record<string, object> = {
  "@starward/miniapp-contracts": { MINIAPP_API_BASE_PATH: "/v2" },
  "@/services/sky-catalog-api": { constellationAssetUrl: (hash: string, file: string) => `${origin}/constellations/${hash}/${file}` },
  "@/services/galactic-image-client": { galacticImageManifestUrl: (hash: string) => `${origin}/galactic/${hash}/manifest` },
  "@/services/sky-landscape-client": { skyLandscapeAssetUrl: (path: string) => origin + path },
  "@/services/wide-field-w3-client": { wideFieldW3TileUrl: (path: string) => origin + path },
};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./sky-source-documents.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
{ exports, require: (name: string) => { assert(name in dependencies, name); return dependencies[name]; } });
const api = exports as typeof adapters;

test("asset reading templates preserve conflicting rights, selected downloads and unknown optical meaning", () => {
  const hash = "a".repeat(64);
  const photo = { publication: { publicationHash: hash, source: { title: "Historical panorama", author: "Original author",
    credit: "Full original credit", packageLicense: "CC BY 4.0", registryLicense: "CC BY-SA 4.0", derivativeLicense: "CC BY-SA 4.0",
    rightsUrl: "https://source.example/rights", originalUrl: "https://source.example/panorama", originalDownloadUrl: `/landscape/${hash}/original.zip` },
    processing: "Complete processing statement", limitations: ["Complete original limitation"] },
  resource: { image: { downloadUrl: `/landscape/${hash}/detail.png` } } } as Parameters<typeof api.skyLandscapeSourceDocument>[0];
  const document = api.skyLandscapeSourceDocument(photo), text = JSON.stringify(document);
  assert(text.includes("Full original credit") && text.includes("CC BY 4.0") && text.includes("CC BY-SA 4.0"));
  assert(text.includes("Complete processing statement") && text.includes("Complete original limitation"));
  assert(text.includes(`${origin}/landscape/${hash}/detail.png`) && text.includes(`${origin}/landscape/${hash}/original.zip`));
  assert(text.includes("不是所选观星点的现场照片或遮挡测量"));

  const optical = { schemaVersion: "starward-mellinger-optical-milky-way-v1", publicationHash: hash,
    source: MELLINGER_OPTICAL_MILKY_WAY.source, processing: "Retain original PNG", limitations: ["Original uncertainty"] } as Parameters<typeof api.skyGalacticSourceDocument>[0];
  const opticalText = JSON.stringify(api.skyGalacticSourceDocument(optical));
  assert(opticalText.includes(MELLINGER_OPTICAL_MILKY_WAY.source.credit));
  assert(opticalText.includes(MELLINGER_OPTICAL_MILKY_WAY.source.grant));
  assert(opticalText.includes("科学有效性和绝对配准尚未验证") && opticalText.includes("黑像素不表示真实零亮度或缺测"));
  assert(opticalText.includes(`${origin}/galactic/${hash}/manifest`));
});

test("catalog reading keeps all source records and versioned machine-readable members", () => {
  const hash = "b".repeat(64), sources = [{ id: "constellation-geometry:geometry", retrievedAt: "first" },
    { id: "constellation:names", retrievedAt: "first" }, { id: "constellation:names", retrievedAt: "second" }];
  const document = api.skyConstellationSourceDocument({ data: { catalogHash: hash, geometryAsset: { file: "geometry-v2.json" } },
    sources } as unknown as Parameters<typeof api.skyConstellationSourceDocument>[0]);
  assert.equal(document.sources, sources, "presentation cannot collapse same-ID editions");
  const links = document.sections?.flatMap(section => section.kind === "links" ? section.items : []) ?? [];
  assert(links.some(link => link.url === `${origin}/constellations/${hash}/geometry-v2.json` && link.download));
  assert(links.some(link => link.url === `${origin}/constellations/${hash}/constellation_names.eng.fab` && link.download));
});
