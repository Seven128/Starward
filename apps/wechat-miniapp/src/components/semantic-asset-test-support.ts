import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import type { DisplayMode } from "@starward/miniapp-contracts";
import type { SemanticIcon, adoptedBIconPath } from "./semantic-asset";
import { primaryMapIconPath } from "../navigation/primary-navigation";

type IconProps = Parameters<typeof SemanticIcon>[0];
type RenderedIcon = { type: string; props: Record<string, any> };

const source = readFileSync(new URL("./semantic-asset.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
} }).outputText;

/** Load the real component and declaration; substitute only its runtime ports.
 * useStackRoute deliberately models the retired top-page route binding. */
export function semanticIconRenderer(route: string, mode: DisplayMode = "DAY", useStackRoute = false) {
  let topRoute = route.replace(/^\//u, "");
  const ownedRouter = { path: route };
  const exports: Record<string, unknown> = {};
  const React = { createElement: (type: string, props: Record<string, unknown>) => ({ type, props }) };
  vm.runInNewContext(code, {
    exports, React,
    require(name: string) {
      if (name === "@tarojs/components") return { Image: "image", View: "view" };
      if (name === "@tarojs/taro") return {
        // Taro's default hook captures the mounting page, even when a child is on top.
        useRouter: () => useStackRoute ? { path: `/${topRoute}` } : ownedRouter,
        default: { getCurrentPages: () => [{ route: topRoute }] },
      };
      if (name === "@/state/app-store") return { useAppStore: (select: (state: { mode: DisplayMode }) => unknown) => select({ mode }) };
      if (name === "@/navigation/primary-navigation") return { primaryMapIconPath };
      if (name === "./main-b-icon-files.json") return { default: JSON.parse(readFileSync(new URL("./main-b-icon-files.json", import.meta.url), "utf8")) };
      throw Error(`unexpected_semantic_icon_dependency:${name}`);
    },
  });
  return {
    render: exports.SemanticIcon as (props: IconProps) => RenderedIcon,
    resolvePath: exports.adoptedBIconPath as typeof adoptedBIconPath,
    navigate: (nextRoute: string) => { topRoute = nextRoute.replace(/^\//u, ""); },
  };
}
