import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { semanticIconRenderer } from "./semantic-asset-test-support";
import { loadPosterIcons } from "./share-poster-icons";

test("the content-page poster decodes its actual package-local and shared icons before drawing", async () => {
  const paths: string[] = [];
  const available = new Set([
    "/assets/b-icons/favorite-star--day--default.png",
    "/assets/b-icons/meteor--day--default.png",
    "/content/assets/b-icons/place-pin--day--default.png",
  ]);
  // The built-candidate owner checks emitted package bytes. Here the actual
  // injected native-image port rejects the wrong package instead of accepting any src.
  for (const file of available) {
    const bytes = readFileSync(new URL(`../../runtime-assets/b-icons/${file.split("/").at(-1)}`, import.meta.url));
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  }
  const canvas = { createImage() {
    const image = { onload: null as (() => void) | null, onerror: null as (() => void) | null,
      set src(value: string) {
        paths.push(value);
        queueMicrotask(() => available.has(value) ? image.onload?.() : image.onerror?.());
      } };
    return image;
  } };
  let draw: (...args: any[]) => void = () => { throw new Error("poster_owner_not_created"); };
  let painted = false;
  const exports: Record<string, any> = {};
  const code = ts.transpileModule(readFileSync(new URL("./share-poster.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(code, { exports, React: { createElement: () => null },
    require(name: string) {
      if (name === "@tarojs/taro") return { default: {}, useRouter: () => ({ path: "content/share/index" }), useDidShow() {}, useDidHide() {} };
      if (name === "@tarojs/components") return {};
      if (name === "react") return { useRef: (current: unknown) => ({ current }), useState: (value: unknown) => [value, () => {}],
        useMemo: (read: () => unknown) => read(), useLayoutEffect() {} };
      if (name === "@/state/app-store") return { useAppStore: (select: (state: unknown) => unknown) => select({ mode: "DAY" }) };
      if (name === "./semantic-asset") return { adoptedBIconPath: semanticIconRenderer("content/share/index").resolvePath };
      if (name === "./adopted-share-poster") return { adoptedSharePosterLayout: () => ({ height: 400 }), drawAdoptedSharePoster: () => { painted = true; } };
      if (name === "./share-poster-icons") return { loadPosterIcons };
      if (name === "./share-poster-owner") return { createSharePosterOwner: (port: { draw: typeof draw }) => { draw = port.draw; return {}; } };
      if (name === "./share-poster-files") return { createSharePosterFiles: () => ({}) };
      if (name === "./share-poster-drawing") return { POSTER_WIDTH: 320, POSTER_EXPORT_SCALE: 2 };
      if (["./status-panel", "./public-share-presentation", "./share-poster.scss"].includes(name)) return {};
      throw new Error(`unexpected_poster_dependency:${name}`);
    },
  });
  exports.SharePoster({ data: { kind: "SPOT" } });
  await new Promise<void>((resolve, reject) => draw({ mode: "DAY", canvas, icons: null }, resolve, reject, () => true));
  assert.equal(painted, true);
  assert.deepEqual(paths, [...available]);
});
