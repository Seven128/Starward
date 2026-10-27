import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const miniappRequire = createRequire(new URL("../../apps/wechat-miniapp/package.json", import.meta.url));
const runnerRequire = createRequire(miniappRequire.resolve("@tarojs/webpack5-runner/package.json"));
const webpack = runnerRequire("webpack"), ts = miniappRequire("typescript");

/** Compile the actual production pure owner with the existing Taro webpack/TS
 * dependencies. Two harmless entries force a common chunk like WEAPP emits.
 * These are artifact/consumer fixtures, not native App/device acceptance. */
export async function writeCompiledSkyFixture(root, { apiOrigin, skyResourceOrigin = apiOrigin, previewToken = "", transformSource = source => source, splitOwners = false }) {
  const source = path.join(root, `.compiled-sky-fixture-${randomUUID()}`); await mkdir(source);
  const owner = ts.transpileModule(transformSource(await readFile(new URL("../../apps/wechat-miniapp/src/services/sky-resource-origin.ts", import.meta.url), "utf8")), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  await writeFile(path.join(source, "owner.js"), owner);
  const preview = ts.transpileModule(await readFile(new URL("../../apps/wechat-miniapp/src/services/sky-resource-preview.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  await writeFile(path.join(source, "sky-resource-preview.js"), preview);
  for (const file of ["first.js", "second.js"]) await writeFile(path.join(source, file),
    "import * as owner from './owner.js'; globalThis.fixtureOwner = owner;\n");
  const compiler = webpack({ mode: "production", context: source, target: "web",
    entry: { first: "./first.js", second: "./second.js" },
    output: { path: root, filename: "[name].js", globalObject: "wx", chunkLoadingGlobal: "webpackJsonp" },
    optimization: { runtimeChunk: { name: "runtime" }, splitChunks: { chunks: "all", minSize: 0,
      cacheGroups: { default: false, defaultVendors: false,
        ...(splitOwners ? {
          owner: { test: /owner\.js$/u, name: "sky/sub-vendors", enforce: true },
          preview: { test: /sky-resource-preview\.js$/u, name: "common", enforce: true },
        } : { owner: { test: /(?:owner|sky-resource-preview)\.js$/u, name: "common", enforce: true } }),
      } } },
    plugins: [new webpack.DefinePlugin({ __MINIAPP_API_BASE__: JSON.stringify(apiOrigin),
      __MINIAPP_SKY_RESOURCE_BASE__: JSON.stringify(skyResourceOrigin), __MINIAPP_OPERATOR_PREVIEW_TOKEN__: JSON.stringify(previewToken) })],
  });
  try {
    await new Promise((resolve, reject) => compiler.run((error, stats) => {
      if (error || !stats || stats.hasErrors()) reject(Error("compiled_sky_fixture_build_failed"));
      else resolve();
    }));
  } finally { await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve())); }
}
