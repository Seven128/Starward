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
  path.resolve(repoRoot, "packages/astronomy-core/src/stellar-vectors.ts"),
];

const adoptedBRuntimeIconRoot = path.resolve(
  repoRoot,
  "docs/design-resources/wechat-miniapp/shared/icons/adopted/b-matte-256/platform/weapp-runtime/assets",
);
const adoptedBTabBarIconRoot = path.resolve(
  repoRoot,
  "docs/design-resources/wechat-miniapp/shared/icons/adopted/b-matte-256/platform/weapp-tabbar/assets",
);
const bTabBarIconFiles = [
  "map--day--default.png", "map--day--selected.png",
  "account-user--day--default.png", "account-user--day--selected.png",
] as const;
const retainedLegacyIconFiles = [
  "account-user-night.svg", "account-user-observation.svg",
  "arrow-left-light.png", "bulb-night.svg", "bulb-observation.svg",
  "chevron-right-night.svg", "chevron-right-observation.svg",
  "cloud-night.svg", "cloud-observation.svg", "download-night.svg",
  "download-observation.svg", "draft-marker.png", "eye-night.svg",
  "eye-observation.svg", "filter-night.svg", "filter-observation.svg",
  "formal-spot-marker-night.png", "formal-spot-marker-observation.png",
  "formal-spot-marker-selected-night.png", "formal-spot-marker-selected-observation.png",
  "images-night.svg", "images-observation.svg", "pencil-night.svg",
  "pencil-observation.svg", "proposal-marker.png", "settings-night.svg",
  "settings-observation.svg", "share-night.svg", "share-observation.svg",
  "tab-map-night.png", "tab-map-observation.png", "tab-map-selected-night.png",
  "tab-map-selected-observation.png", "tab-my-night.png", "tab-my-observation.png",
  "tab-my-selected-night.png", "tab-my-selected-observation.png",
  "trash-2-night.svg", "trash-2-observation.svg", "wifi-off-night.svg",
  "wifi-off-observation.svg",
  "wind-night.svg", "wind-observation.svg",
  "telescope-night.svg", "telescope-observation.svg",
  "sun-night.svg", "sun-observation.svg", "moon-night.svg", "moon-observation.svg",
] as const;
const bIconFiles = {
  main: [
    "account-user--day--default.png", "account-user--day--selected.png",
    "arrow-left--day--default.png", "check--day--default.png",
    "chevron-down--day--default.png", "chevron-right--day--default.png",
    "chevron-up--day--default.png", "close--day--default.png",
    "cloud--day--default.png", "compass--day--default.png",
    "eye--day--default.png", "filter--day--default.png",
    "four-point-star--day--default.png", "horizon--day--default.png",
    "images--day--default.png", "layers--day--default.png",
    "low-cloud--day--default.png", "bulb--day--default.png",
    "location--day--default.png", "map--day--default.png",
    "map--day--selected.png", "meteor--day--default.png", "moon--day--default.png",
    "pencil--day--default.png", "plan-suv--day--default.png",
    "search--day--default.png", "settings--day--default.png",
    "share--day--default.png", "spot-marker--day--default.png",
    "spot-marker--day--draft.png", "spot-marker--day--pending.png",
    "spot-marker--day--selected.png", "sun--day--default.png",
    "terrain--day--default.png", "clock--day--default.png",
  ],
  content: [
    "cloud--day--default.png", "wind--day--default.png", "telescope--day--default.png",
    "account-user--day--default.png", "arrow-left--day--default.png",
    "bell--day--default.png", "bell-off--day--default.png",
    "calendar--day--default.png", "check--day--default.png",
    "checklist--day--default.png", "chevron-right--day--default.png",
    "close--day--default.png", "compass--day--default.png",
    "download--day--default.png", "four-point-star--day--default.png",
    "horizon--day--default.png", "images--day--default.png",
    "info--day--default.png", "location--day--default.png",
    "low-cloud--day--default.png", "moon--day--default.png",
    "meteor--day--default.png", "note--day--default.png",
    "pencil--day--default.png", "plan-suv--day--default.png",
    "refresh--day--default.png", "save--day--default.png",
    "sun--day--default.png", "trash--day--default.png",
    "wifi-off--day--default.png",
  ],
  spot: [
    "arrow-left--day--default.png", "chevron-right--day--default.png",
    "chevron-down--day--default.png", "chevron-up--day--default.png",
    "close--day--default.png", "compass--day--default.png",
    "filter--day--default.png", "horizon--day--default.png",
    "images--day--default.png", "info--day--default.png",
    "location--day--default.png", "low-cloud--day--default.png",
    "search--day--default.png", "wifi-off--day--default.png",
  ],
  sky: [
    "arrow-left--day--default.png", "close--day--default.png",
    "compass--day--default.png", "horizon--day--default.png",
  ],
} as const;

function adoptedBIconCopyPatterns(outputRoot: string) {
  return [
    ...Object.entries(bIconFiles).flatMap(([packageName, files]) => files.map((file) => ({
    from: path.resolve(adoptedBRuntimeIconRoot, file),
    to: path.resolve(
      here,
      "..",
      outputRoot,
      packageName === "main" ? "assets/b-icons" : `${packageName}/assets/b-icons`,
      file,
    ),
    }))),
    ...bTabBarIconFiles.map((file) => ({
      from: path.resolve(adoptedBTabBarIconRoot, file),
      to: path.resolve(here, "..", outputRoot, "assets/b-icons/weapp-tabbar", file),
    })),
  ];
}

function operatorPreviewToken() {
  const selected = process.env.MINIAPP_OPERATOR_PREVIEW_TOKEN?.trim() ?? "";
  if (selected && !/^[A-Za-z0-9_-]{43,128}$/u.test(selected))
    throw new Error("miniapp_operator_preview_token_invalid");
  return selected;
}

const createConfig: UserConfigFn = async (_merge, { command }) => {
  const target = process.env.TARO_ENV ?? "weapp";
  if (target !== "weapp")
    throw new Error("wechat_miniapp_web_target_removed");
  // Keep fixture compilation away from the live development watch output.
  // This switch deliberately accepts no caller-supplied filesystem path.
  const isolatedFixtureBuild = process.env.MINIAPP_ISOLATED_FIXTURE_BUILD === "1";
  if (isolatedFixtureBuild && process.env.MINIAPP_DEVELOPMENT_FIXTURE_MODE !== "1")
    throw new Error("miniapp_isolated_build_requires_fixture_mode");
  const isolatedCheckBuild = process.env.MINIAPP_ISOLATED_CHECK_BUILD === "1";
  if (isolatedCheckBuild && (command !== "build" || process.argv.includes("--watch") || isolatedFixtureBuild ||
      process.env.MINIAPP_DEVELOPMENT_FIXTURE_MODE === "1" ||
      process.env.MINIAPP_ACCEPTANCE_DIAGNOSTICS === "1" ||
      process.env.MINIAPP_DEVICE_REQUEST_DIAGNOSTICS === "1"))
    throw new Error("miniapp_isolated_check_requires_plain_build");
  const outputRoot = isolatedCheckBuild ? "dist/weapp-check" :
    isolatedFixtureBuild ? "dist/weapp-fixture" : "dist/weapp";
  const config: UserConfigExport = {
    projectName: "tonight-stargazing-wechat-miniapp",
    date: "2026-08-06",
    designWidth: 750,
    deviceRatio: { 320: 2.34375, 375: 2, 430: 1.744186, 750: 1 },
    sourceRoot: "src",
    outputRoot,
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
      path.resolve(here, "./scroll-view-template.cjs"),
      path.resolve(here, "./accessibility-template.cjs"),
    ],
    alias: {
      "@starward/astronomy-core/stellar-vectors$": path.resolve(repoRoot, "packages/astronomy-core/src/stellar-vectors.ts"),
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
      __MINIAPP_OPERATOR_PREVIEW_TOKEN__: JSON.stringify(
        operatorPreviewToken(),
      ),
      __DELIVERY_TARGET__: JSON.stringify(
        "target-miniapp-field-signal-i21-selected-constraint-2026-09-03",
      ),
      __MINIAPP_ACCEPTANCE_DIAGNOSTICS__: JSON.stringify(
        process.env.MINIAPP_ACCEPTANCE_DIAGNOSTICS === "1",
      ),
      __MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__: JSON.stringify(
        process.env.MINIAPP_DEVICE_REQUEST_DIAGNOSTICS === "1",
      ),
      __MINIAPP_DEVELOPMENT_FIXTURE_MODE__: JSON.stringify(
        process.env.MINIAPP_DEVELOPMENT_FIXTURE_MODE === "1",
      ),
    },
    copy: {
      patterns: [
        ...["moon", "ornaments"].map((directory) => ({
          from: path.resolve(here, "../src/assets", directory),
          to: path.resolve(here, "..", outputRoot, "assets", directory),
        })),
        ...retainedLegacyIconFiles.map((file) => ({
          from: path.resolve(here, "../src/assets/icons", file),
          to: path.resolve(here, "..", outputRoot, "assets/icons", file),
        })),
        ...["night", "observation"].map((theme) => ({
          from: path.resolve(here, "../src/assets/semantic", `five-point-star-${theme}.svg`),
          to: path.resolve(here, "..", outputRoot, "assets/semantic", `five-point-star-${theme}.svg`),
        })),
        {
          from: path.resolve(here, "../src/assets/media"),
          to: path.resolve(here, "..", outputRoot, "sky/assets/media"),
        },
        ...["twgl", "quaternion"].map((name) => ({
          from: path.resolve(here, `../src/assets/licenses/${name}.json`),
          to: path.resolve(here, "..", outputRoot, `sky/assets/licenses/${name}.json`),
        })),
        ...["noble-hashes", "runtime-dependencies"].map((name) => ({
          from: path.resolve(here, `../src/assets/licenses/${name}.json`),
          to: path.resolve(here, "..", outputRoot, `assets/licenses/${name}.json`),
        })),
        ...adoptedBIconCopyPatterns(outputRoot),
      ],
      options: {},
    },
    mini: {
      compile: { include: sharedSourceInclude },
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
