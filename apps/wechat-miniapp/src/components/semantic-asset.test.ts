import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function renderer(route: string, mode = "DAY") {
  const source = readFileSync(new URL("./semantic-asset.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  const exports: Record<string, any> = {};
  const React = { createElement: (type: string, props: Record<string, unknown>) => ({ type, props }) };
  vm.runInNewContext(code, {
    exports, React,
    require(name: string) {
      if (name === "@tarojs/components") return { Image: "image", View: "view" };
      if (name === "@tarojs/taro") return { useRouter: () => ({ path: route }), default: { getCurrentPages: () => [{ route: "unrelated/top-page" }] } };
      if (name.endsWith("app-store")) return { useAppStore: (select: (state: unknown) => unknown) => select({ mode }) };
      throw Error("unexpected_semantic_icon_dependency");
    },
  });
  return exports.SemanticIcon;
}

test("main-page adopted bitmaps keep geometry and accessible names through the shared native loader", () => {
  const render = renderer("pages/my/index");
  for (const name of ["images", "plan-suv", "clock", "sun", "telescope", "share"]) {
    const icon = render({ name, decorative: false, label: "进入资料", className: "owner-size" });
    assert.equal(icon.type, "packaged-icon");
    assert.equal(icon.props.kind, name);
    assert.equal(icon.props.class, `semantic-icon semantic-icon--b semantic-icon--${name} owner-size`);
    assert.equal(icon.props["aria-role"], "img");
    assert.equal(icon.props["aria-label"], "进入资料");
    assert.equal(icon.props["aria-hidden"], undefined);
  }
});

test("subpackage and theme consumers retain their existing asset paths", () => {
  const settings = renderer("pages/my/index")({ name: "settings" });
  assert.equal(settings.type, "image");
  assert.equal(settings.props.src, "/assets/b-icons/settings--day--default.png");
  const content = renderer("content/settings/index")({ name: "settings" });
  assert.equal(content.type, "image");
  assert.equal(content.props.src, "/content/assets/b-icons/settings--day--default.png");
  const selected = renderer("pages/map/index")({ name: "favorite-star", state: "selected" });
  assert.equal(selected.type, "image");
  assert.equal(selected.props.src, "/assets/b-icons/favorite-star--day--selected.png");
  assert.equal(renderer("pages/my/index", "OBSERVATION")({ name: "settings" }).type, "view");
  const weather = renderer("pages/map/index")({ name: "conditions", presentation: "forecast" });
  assert.equal(weather.type, "packaged-icon");
  assert.equal(weather.props.kind, "low-cloud");
  assert.equal(weather.props.class.includes("semantic-icon--forecast"), false);
});

test("native bitmap input admits only packaged roles and withdraws an invalid previous image", () => {
  let definition: any;
  vm.runInNewContext(readFileSync(new URL("../spot/native/packaged-icon/index.js", import.meta.url), "utf8"), {
    Component: (value: unknown) => { definition = value; },
  });
  let src = "";
  const host = { setData: (value: { src: string }) => { src = value.src; } };
  for (const kind of ["temperature", "wind", "droplet", "warning", "low-cloud", "images", "plan-suv", "clock", "sun", "telescope", "share"]) {
    definition.properties.kind.observer.call(host, kind);
    assert.equal(src, `/spot/assets/b-icons/${kind}--day--default.png`);
  }
  definition.properties.kind.observer.call(host, "../unpackaged");
  assert.equal(src, "");
});
