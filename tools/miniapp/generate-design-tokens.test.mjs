import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as sass from "sass";
import postcss from "postcss";
import pxtransform from "postcss-pxtransform";
import { generateDesignTokens, readDesignTokens, renderDesignTokens } from "./generate-design-tokens.mjs";
import { contrastRatio } from "../verify-miniapp-design-support.mjs";

const source = await readFile(new URL("../../DESIGN.md", import.meta.url), "utf8");
const tokens = readDesignTokens(source);

test("generated files match the single current Mini Program design source", async () => {
  await generateDesignTokens({ check: true });
  assert.throws(() => readDesignTokens(source + source), /exactly one/);
});

test("the pinned Taro transform preserves logical typography, icons and touch targets", async () => {
  const scss = renderDesignTokens(tokens).get("apps/wechat-miniapp/src/styles/tokens.scss");
  const css = sass.compileString(scss + "\n.unit-control { width: 44px; }").css;
  const result = await postcss([pxtransform({ platform: "weapp", designWidth: 750 })]).process(css, { from: undefined });
  const declarations = new Map();
  result.root.walkRules((rule) => {
    const values = new Map();
    rule.walkDecls((decl) => values.set(decl.prop, decl.value.toLowerCase()));
    declarations.set(rule.selector, values);
  });
  const base = [...declarations].find(([selector, values]) => selector.split(/,\s*/u).includes("page") && values.has("--type-body-size"))[1];
  assert.equal(base.get("--type-body-size"), "15px");
  assert.equal(base.get("--icon-medium"), "20px");
  assert.equal(base.get("--target-min"), "44px");
  assert.equal(declarations.get(".unit-control").get("width"), "44rpx");
  const large = declarations.get(".large-text");
  for (const [name, role] of Object.entries(tokens.type)) {
    assert.equal(large.get(`--type-${name}-size`), `${role.size * 2}px`);
    assert.equal(large.get(`--type-${name}-line`), `${role.line * 2}px`);
  }
});

test("detached modal roots own the current type and geometry variables without painting a page", () => {
  const scss = renderDesignTokens(tokens).get("apps/wechat-miniapp/src/styles/tokens.scss");
  const stylesheet = postcss.parse(sass.compileString(scss).css);
  let scope;
  let large;
  stylesheet.walkRules(rule => {
    if (rule.selector.split(/,\s*/u).includes(".theme-token-scope")) scope = rule;
    if (rule.selector === ".large-text") large = rule;
  });
  assert(scope, "a detached modal surface needs its own current token scope");
  const values = new Map(scope.nodes.map(decl => [decl.prop, decl.value.toLowerCase()]));
  for (const [name, role] of Object.entries(tokens.type)) {
    assert.equal(values.get(`--type-${name}-size`), `${role.size}px`);
    assert.equal(values.get(`--type-${name}-line`), `${role.line}px`);
    assert.equal(values.get(`--type-${name}-weight`), String(role.weight));
  }
  for (const [name, value] of Object.entries(tokens.geometry)) assert.equal(values.get(`--${name}`), `${value}px`);
  assert(scope.nodes.every(decl => decl.prop.startsWith("--")), "token scope must not add a page's background, size or overflow");
  assert(scope.source.start.line < large.source.start.line, "the same root's large-text preference must override its defaults");
});

test("supporting text stays readable in all three modes, including red-light mode", () => {
  for (const [mode, theme] of Object.entries(tokens.themes)) {
    for (const text of ["text-primary", "text-secondary", "text-tertiary"]) {
      assert(contrastRatio(theme[text], theme.canvas) >= 4.5, `${mode}/${text}`);
    }
  }
});
