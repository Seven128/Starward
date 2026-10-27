import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

/** Load the real singleton owner alongside a resource-client fixture. Only
 * that fixture's native boundaries are injected; cache/epoch code is not
 * replaced with a mock merely because the production module was split. */
export function withSkyPublicImageOwner(load: (name: string) => unknown, globals: Record<string, unknown> = {}) {
  let owner: Record<string, any> | undefined;
  return (name: string): unknown => {
    if (name !== './sky-public-image-owner') return load(name);
    if (owner) return owner;
    const exports: Record<string, any> = {};
    const file = new URL('./sky-public-image-owner.ts', import.meta.url);
    vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8') +
      '\nexport const readPendingMetadataListenersForTest = () => pendingDemands.size;', {
      fileName: file.pathname, compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS},
    }).outputText, {exports, require: (name: string) => load(name === './sky-resource-preview' ? './sky-resource-origin' : name), ArrayBuffer, Uint8Array, DataView,
      Date, Math, Set, Promise, setTimeout, clearTimeout, ...globals});
    return owner = exports;
  };
}
