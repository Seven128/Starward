/** Actual saved publication handoff, with the archived pre-migration owner. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { skyTargetOpticalFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame.ts";

const root = resolve(import.meta.dirname, "../../../.."), out = join(root, "output/sdss-m82-display-client-readback-1004-r1");
mkdirSync(out);
const paths = ["apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame.ts",
  "output/sdss-m82-display-client-development-1004-r1/before/apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame.ts",
  "output/sdss-m82-display-publication-1004-r2/publication/manifest.json"];
const bind = (p: string) => { const b = readFileSync(join(root, p));return { path:p, bytes:b.length, sha256:createHash("sha256").update(b).digest("hex") }; };
const before = paths.map(bind);
writeFileSync(join(out, "executed-reader.mts"), readFileSync(import.meta.filename), { flag:"wx" });
const publication = JSON.parse(readFileSync(join(root, paths[2]!), "utf8"));
assert.equal(before[2]!.sha256, "398827534fab1003b7fbe4cad29ab7ae6e0b8a1a9eb7222e12ba1e926aa47a6a");
const exports: any = {};
vm.runInNewContext(ts.transpileModule(readFileSync(join(root, paths[1]!), "utf8"), {
  compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS},
}).outputText, { exports, Object });
const loaded = { publication, image:{}, renderedLevel:"DETAIL" as const, renderedAsset:publication.levels.DETAIL,
  coarser:{image:{}, level:"MEDIUM" as const, asset:publication.levels.MEDIUM} };
assert.equal(exports.skyTargetOpticalFrame(loaded), null, "archived owner cannot hand off the newly admitted display publication");
const current = skyTargetOpticalFrame(loaded);assert(current && "displayPublication" in current);
assert.strictEqual(current.displayPublication, publication);assert.strictEqual(current.asset, publication.levels.DETAIL);
assert.strictEqual(current.coarser?.asset, publication.levels.MEDIUM);assert.equal("sciencePublication" in current, false);
assert.equal(skyTargetOpticalFrame({...loaded, renderedAsset:{...loaded.renderedAsset}}), null);
assert.deepEqual(paths.map(bind), before);
const result = { scope:"Actual saved M82 descriptor handoff only, no decode/render/page/native or quality claim",
  publicationHash:publication.publicationHash, bindings:before, beforeRejectedNewVersion:true,
  currentExplicitDisplayIdentity:true, actualParentDescriptor:true, foreignDescriptorRejected:true,
  originalBytesAfterExact:true, ordinaryAdoption:false };
writeFileSync(join(out,"result.json"),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
process.stdout.write(JSON.stringify(result)+"\n");
