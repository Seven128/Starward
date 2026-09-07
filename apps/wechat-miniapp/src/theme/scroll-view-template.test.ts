import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
const { stripDefaultScrollPadding } = createRequire(import.meta.url)("../../config/scroll-view-template.cjs");

test("WebView templates omit only ScrollView's generated Skyline padding default", () => {
  const input = '<scroll-view padding="{{i.p12||[0,0,0,0]}}" scroll-y="{{i.y}}" bindscroll="eh"><view padding="keep" /></scroll-view><textarea disable-default-padding="true" />';
  const output = stripDefaultScrollPadding(input);
  assert.equal(output, '<scroll-view scroll-y="{{i.y}}" bindscroll="eh"><view padding="keep" /></scroll-view><textarea disable-default-padding="true" />');
  assert.equal(stripDefaultScrollPadding(output), output);
  assert.equal(stripDefaultScrollPadding('<scroll-view padding="{{custom}}" />'), '<scroll-view padding="{{custom}}" />');
});
