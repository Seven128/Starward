import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
const { bindAccessibility } = createRequire(import.meta.url)("../../apps/wechat-miniapp/config/accessibility-template.cjs");

test("Taro templates bind names, native roles and hidden state without truthy defaults", () => {
  for (const tag of ["view", "text", "image", "button", "input", "textarea", "picker", "scroll-view"]) {
    const source = `<${tag} value="{{i.value > 0}}" data-sid="{{i.sid}}" />`;
    const result = bindAccessibility(source);
    assert.ok(result.includes('aria-label="{{i.ariaLabel}}"'));
    assert.ok(result.includes('aria-role="{{i.ariaRole || i.role}}"'));
    assert.ok(result.includes('aria-hidden="{{i.ariaHidden}}"'));
    assert.ok(result.includes('aria-expanded="{{i.ariaExpanded}}"'));
    assert.equal(bindAccessibility(result), result);
  }
});
test("native markup and existing accessibility expressions are preserved", () => {
  const source = '<view aria-label="已有名称" data-sid="{{i.sid}}"></view><view aria-hidden="true" />';
  const result = bindAccessibility(source);
  assert.equal((result.match(/aria-label=/g) || []).length, 1);
  assert.ok(result.endsWith('<view aria-hidden="true" />'));
});
