import assert from "node:assert/strict";
import test from "node:test";
import { panelSpringStyle } from "./panel-spring-style";
test("CSS trajectory preserves endpoints, reversal and bounds without per-frame updates", () => {
  const frames = [{height: 350, offset: 0}, {height: 330, offset: .25}, {height: 700, offset: 1}];
  const style = panelSpringStyle(frames, 320, 1);
  assert.equal(style["--panel-spring-0"], "350px");
  assert.equal(style["--panel-spring-10"], "330px");
  assert.equal(style["--panel-spring-40"], "700px");
  for (let i=0;i<=40;i++) { const height=parseFloat(style[`--panel-spring-${i}`]!); assert.ok(height>=330 && height<=700); }
  assert.equal(style["--panel-spring-duration"], "320ms");
  assert.notEqual(style["--panel-spring-name"], panelSpringStyle(frames,320,2)["--panel-spring-name"]);
});
