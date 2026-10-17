import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../apps/wechat-miniapp/package.json", import.meta.url));
const runnerRequire = createRequire(require.resolve("@tarojs/webpack5-runner/package.json"));
const webpack = runnerRequire("webpack"), Chain = require("webpack-chain");
const { assertContractReexports, assertContractInitialization, applyContractReexportRule } = require("./config/contracts-reexports.cjs");

test("the actual contract entry remains forwarding-only; initialization cannot acquire the purity hint", async () => {
  const entry = new URL("../../packages/miniapp-contracts/src/index.ts", import.meta.url);
  assertContractReexports(await readFile(entry, "utf8"), "index.ts");
  assertContractInitialization(fileURLToPath(entry));
  for (const code of ["import './setup'; export * from './value';", "globalThis.registered = true; export * from './value';",
    "export const value = register();", "export * from './value' with { type: 'json' };", "export * from '"])
    assert.throws(() => assertContractReexports(code, "index.ts"), /miniapp_contract_entry_requires_pure_reexports/u);
});

async function compile(root, hint) {
  const chain = new Chain();
  if (hint) applyContractReexportRule(chain, path.join(root, "index.js"));
  else chain.module.rule("conservative-contract-entry").test(resource => resource === path.join(root, "index.js")).sideEffects(true);
  const rules = chain.toConfig().module?.rules ?? [];
  if (hint) {
    assert.equal(rules[0].test(path.join(root, "index.js")), true);
    for (const resource of ["registration.js", "sky.js", "main.js", "style.css", "index.js.other"])
      assert.equal(rules[0].test(path.join(root, resource)), false);
  }
  const compiler = webpack({ mode: "production", context: root, target: "web", devtool: false,
    entry: { main: "./main-entry.js", sky: "./sky-entry.js" }, module: { rules },
    output: { path: path.join(root, hint ? "hinted" : "baseline"), filename: "[name].js", globalObject: "globalThis" },
    optimization: { runtimeChunk: { name: "runtime" }, splitChunks: { chunks: "all", minSize: 0,
      cacheGroups: { default: { minChunks: 2, name: "common" }, defaultVendors: false } } } });
  try {
    return await new Promise((resolve, reject) => compiler.run((error, stats) => {
      if (error || !stats || stats.hasErrors()) reject(Error("contract_reexport_fixture_compile_failed"));
      else resolve({ stats: stats.toJson({ all: false, chunks: true, chunkModules: true, nestedModules: true }), directory: compiler.options.output.path });
    }));
  } finally { await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve())); }
}

async function runMain(directory) {
  const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  // Loading only the main route must retain its dependency initialization;
  // the unused sky route is deliberately never launched in this context.
  for (const file of ["runtime.js", "common.js", "main.js"]) {
    const source = await readFile(path.join(directory, file), "utf8").catch(error => {
      if (error.code === "ENOENT" && file === "common.js") return "";
      throw error;
    });
    vm.runInContext(source, context, { timeout: 1000 });
  }
  return JSON.parse(vm.runInContext("JSON.stringify({result: mainResult, registrations: registrations})", context));
}

test("real webpack separates sky-only exports, preserves main behavior/setup, and rejects a side-effectful contract graph", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-contract-reexports-"));
  try {
    await writeFile(path.join(root, "index.js"), "export * from './main.js'; export * from './sky.js';\n");
    await writeFile(path.join(root, "main.js"), "export const mainValue = 42;\n");
    await writeFile(path.join(root, "sky.js"), "export const skyValue = 'sky-only-validator-marker';\n");
    await writeFile(path.join(root, "registration.js"), "globalThis.registrations = (globalThis.registrations || 0) + 1; export const unused = true;\n");
    await writeFile(path.join(root, "main-entry.js"), "import './registration.js'; import {mainValue} from './index.js'; globalThis.mainResult = mainValue;\n");
    await writeFile(path.join(root, "sky-entry.js"), "import './registration.js'; import {skyValue} from './index.js'; globalThis.skyResult = skyValue;\n");
    const baseline = await compile(root, false), hinted = await compile(root, true);
    assert.deepEqual(await runMain(baseline.directory), { result: 42, registrations: 1 });
    assert.deepEqual(await runMain(hinted.directory), { result: 42, registrations: 1 });
    assert.equal((await readFile(path.join(baseline.directory, "common.js"), "utf8")).includes("sky-only-validator-marker"), true,
      "a conservatively shared barrel retains sky-only content in common");
    assert.equal((await readFile(path.join(hinted.directory, "common.js"), "utf8")).includes("sky-only-validator-marker"), false,
      "the audited forwarding hint removes sky-only content from common");
    assert.equal((await readFile(path.join(hinted.directory, "sky.js"), "utf8")).includes("sky-only-validator-marker"), true);
    const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
    for (const file of ["runtime.js", "common.js", "sky.js"])
      vm.runInContext(await readFile(path.join(hinted.directory, file), "utf8"), context, { timeout: 1000 });
    assert.equal(vm.runInContext("skyResult", context), "sky-only-validator-marker");
    await writeFile(path.join(root, "index.js"), "export * from './main.js'; export * from './sky.js'; export * from './registration.js';\n");
    assert.throws(() => applyContractReexportRule(new Chain(), path.join(root, "index.js")), /miniapp_contract_initialization_requires_review/u,
      "a forwarding-only entry cannot vouch for transitive global initialization");
    for (const initialization of ["globalThis.changed = true; export const value = 1;",
      "export const value = register();", "import './setup.css'; export const value = 1;",
      "export const value = Object.freeze(globalThis.shared);", "const Set = () => {}; export const value = new Set();",
      "const FILTER_OPTIONS = [1]; export const value = FILTER_OPTIONS.map(() => { globalThis.changed = true; return 1; });"] ) {
      await writeFile(path.join(root, "registration.js"), initialization);
      assert.throws(() => applyContractReexportRule(new Chain(), path.join(root, "index.js")), /miniapp_contract_initialization_requires_review|ENOENT/u);
    }
  } finally {
    const resolved = path.resolve(root), temporary = path.resolve(os.tmpdir());
    if (path.dirname(resolved) !== temporary || !path.basename(resolved).startsWith("starward-contract-reexports-"))
      throw Error("contract_reexport_fixture_cleanup_scope_invalid");
    await rm(resolved, { recursive: true, force: true });
  }
});
