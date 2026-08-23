import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defineConfig,
  type UserConfigExport,
  type UserConfigFn,
} from "@tarojs/cli";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const sharedSourceInclude = [
  path.resolve(repoRoot, "packages/miniapp-contracts/src"),
  path.resolve(repoRoot, "packages/coordinate-system/src"),
];

const createConfig: UserConfigFn = async (_merge, { command }) => {
  const target = process.env.TARO_ENV ?? "weapp";
  if (target !== "weapp")
    throw new Error("wechat_miniapp_web_target_removed");
  const config: UserConfigExport = {
    projectName: "tonight-stargazing-wechat-miniapp",
    date: "2026-08-06",
    designWidth: 750,
    deviceRatio: { 320: 2.34375, 375: 2, 430: 1.744186, 750: 1 },
    sourceRoot: "src",
    outputRoot: "dist/weapp",
    framework: "react",
    compiler: {
      type: "webpack5",
      // Taro 4.2.1's optional mini-program dependency prebundle can emit an
      // invalid ConcatSource during watch startup. Production builds already
      // bypass this optimization. Keep development on the same compiler path
      // instead of patching generated dependencies or node_modules.
      prebundle: { enable: false },
    },
    // Production candidates must recompute the main/subpackage graph. Taro's
    // persistent webpack cache can otherwise retain deleted cross-package
    // module ids while still reporting a successful build.
    cache: { enable: command !== "build" },
    plugins: [
      "@tarojs/plugin-framework-react",
      "@tarojs/plugin-platform-weapp",
    ],
    alias: {
      "@": path.resolve(here, "../src"),
      react: path.resolve(here, "../node_modules/react"),
      "@tarojs/plugin-framework-react": path.resolve(
        here,
        "../node_modules/@tarojs/plugin-framework-react",
      ),
      "@starward/miniapp-contracts": path.resolve(
        repoRoot,
        "packages/miniapp-contracts/src/index.ts",
      ),
      "@starward/coordinate-system": path.resolve(
        repoRoot,
        "packages/coordinate-system/src/index.ts",
      ),
    },
    defineConstants: {
      __MINIAPP_API_BASE__: JSON.stringify(
        process.env.MINIAPP_API_BASE ?? "http://127.0.0.1:8787",
      ),
      __DELIVERY_TARGET__: JSON.stringify(
        "target.system.wechat-miniapp-soft-instruments-2026-08-05",
      ),
      __MINIAPP_ACCEPTANCE_DIAGNOSTICS__: JSON.stringify(
        process.env.MINIAPP_ACCEPTANCE_DIAGNOSTICS === "1",
      ),
      __MINIAPP_DEVELOPMENT_FIXTURE_MODE__: JSON.stringify(
        process.env.MINIAPP_DEVELOPMENT_FIXTURE_MODE === "1",
      ),
    },
    copy: {
      patterns: [
        {
          from: path.resolve(here, "../src/assets"),
          to: path.resolve(here, "../dist/weapp/assets"),
        },
      ],
      options: {},
    },
    mini: {
      compile: { include: sharedSourceInclude },
      experimental: { compileMode: true },
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: {
          enable: false,
          config: {
            namingPattern: "module",
            generateScopedName: "[name]__[local]___[hash:base64:5]",
          },
        },
      },
      webpackChain(chain: { resolve: { symlinks(value: boolean): void } }) {
        chain.resolve.symlinks(false);
      },
    },
    logger: { quiet: false, stats: true },
  };
  if (command === "build") config.mode = "production";
  return config;
};

export default defineConfig(createConfig);
