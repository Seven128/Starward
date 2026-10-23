import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as documents from "../utils/source-document";

/** Execute the shared navigation owner; replace only native navigation and current identity. */
export function sourceNavigationForTest(taro: {
  getCurrentPages(): unknown[];
  navigateTo(options: { url: string; success(result: { eventChannel: { emit(event: string, value: unknown): void } }): void }): unknown;
}, getState: () => Parameters<typeof documents.sourceReadingIdentity>[0]) {
  const owner = { exports: {} };
  const source = readFileSync(new URL("./source-navigation.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText, { module: owner, exports: owner.exports, require(name: string) {
    if (name === "@tarojs/taro") return { __esModule: true, default: taro };
    if (name === "@/state/app-store") return { useAppStore: { getState } };
    if (name === "@/utils/source-document") return documents;
    throw new Error(`Unexpected source navigation dependency: ${name}`);
  } });
  return owner.exports as typeof import("./source-navigation");
}
