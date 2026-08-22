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
  const config: UserConfigExport = {
    projectName: "tonight-stargazing-wechat-miniapp",
    date: "2026-08-06",
    designWidth: 750,
    deviceRatio: { 320: 2.34375, 375: 2, 430: 1.744186, 750: 1 },
    sourceRoot: "src",
    outputRoot: `dist/${target}`,
    framework: "react",
    compiler: "webpack5",
    // Production candidates must recompute the main/subpackage graph. Taro's
    // persistent webpack cache can otherwise retain deleted cross-package
    // module ids while still reporting a successful build.
    cache: { enable: command !== "build" },
    plugins: [
      "@tarojs/plugin-framework-react",
      target === "h5"
        ? "@tarojs/plugin-platform-h5"
        : "@tarojs/plugin-platform-weapp",
    ],
    alias: {
      "@": path.resolve(here, "../src"),
      react: path.resolve(here, "../node_modules/react"),
      // TanStack Query publishes both modern private-field output and an
      // equivalent legacy build. Taro 4.2.1's production property quoting can
      // turn modern `#field` syntax into invalid `#"field"` JavaScript in the
      // H5 bundle. The WeChat compiler resolves the package's native entry
      // correctly and must not inherit this browser-only compatibility alias:
      // doing so leaves native queries permanently paused before queryFn.
      ...(target === "h5"
        ? {
            // Keep the stateful Taro router singleton on one module identity.
            // npm may otherwise place a second same-version router below
            // taro-h5; that copy never receives setHistory and navigateTo
            // fails before a production-derived child route can open.
            "@tarojs/router": path.resolve(
              here,
              "../node_modules/@tarojs/router",
            ),
            "@tanstack/query-core": path.resolve(
              here,
              "../node_modules/@tanstack/query-core/build/legacy/index.js",
            ),
            "@tanstack/react-query": path.resolve(
              here,
              "../node_modules/@tanstack/react-query/build/legacy/index.js",
            ),
          }
        : {}),
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
        process.env.MINIAPP_API_BASE ?? "http://127.0.0.1:8787/v1",
      ),
      __DELIVERY_TARGET__: JSON.stringify(
        "target.system.wechat-miniapp-soft-instruments-2026-08-05",
      ),
      __MINIAPP_ACCEPTANCE_DIAGNOSTICS__: JSON.stringify(
        process.env.MINIAPP_ACCEPTANCE_DIAGNOSTICS === "1",
      ),
    },
    copy: {
      patterns: [
        {
          from: path.resolve(here, "../src/assets"),
          to: path.resolve(here, `../dist/${target}/assets`),
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
    h5: {
      compile: { include: sharedSourceInclude },
      publicPath: "/",
      staticDirectory: "static",
      router: { mode: "hash" },
      postcss: {
        autoprefixer: { enable: true, config: {} },
        cssModules: {
          enable: false,
          config: {
            namingPattern: "module",
            generateScopedName: "[name]__[local]___[hash:base64:5]",
          },
        },
      },
    },
    logger: { quiet: false, stats: true },
  };
  if (command === "build") config.mode = "production";
  return config;
};

export default defineConfig(createConfig);
