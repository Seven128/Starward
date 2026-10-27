import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import type * as owner from "./sky-resource-origin";
import { reportSkyImageError } from "./sky-image-diagnostics";

/** Execute the full address owner with explicit environment values. No
 * duplicate URL/header policy in declaration-extraction or native fixtures. */
export function skyResourceOriginTestOwner(api: string, resource = "", preview = ""): typeof owner & { reportSkyImageError: typeof reportSkyImageError } {
  const exports = {};
  const previewExports = {};
  const environment = { __MINIAPP_API_BASE__: api, __MINIAPP_SKY_RESOURCE_BASE__: resource,
    __MINIAPP_OPERATOR_PREVIEW_TOKEN__: preview, Error };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('./sky-resource-preview.ts', import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, {exports: previewExports, ...environment});
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./sky-resource-origin.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, ...environment, require(name: string) {
    if (name !== './sky-resource-preview') throw Error('unexpected_sky_origin_dependency');
    return previewExports;
  } });
  return Object.assign(exports as typeof owner, { reportSkyImageError });
}
