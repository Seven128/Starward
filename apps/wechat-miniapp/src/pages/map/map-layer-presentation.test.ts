import assert from "node:assert/strict";
import test from "node:test";
import { controls, harness } from "../../features/sky/sky-overlay-test-support";

const props = { open: false, enabled: true, reducedMotion: false, children: "current layer" };
const phase = (tree: any) => tree?.props?.className;

test("closing immediately rejects input but retains the last layer until its downward exit completes", () => {
  const ui = harness("MapLayerPresentation");
  assert.equal(ui.render(props), null);
  assert.match(phase(ui.render({ ...props, open: true })), /--opening$/);
  ui.tick(); assert.match(phase(ui.advance(16)), /--open$/);
  const closed = ui.render({ ...props, children: "replacement panel" });
  assert.match(phase(closed), /--closing$/);
  assert.equal(closed.children[0], "current layer", "business replacement must not rewrite the exiting content");
  const shield = controls(closed).find(node => node.props?.className === "map-layer-motion-shield");
  assert.ok(shield?.props.catchMove);
  let stopped = false; shield.props.onClick({ stopPropagation() { stopped = true; } }); assert.ok(stopped);
  assert.ok(ui.advance(239));
  assert.equal(ui.advance(1), null); assert.equal(ui.timers, 0);
  ui.unmount();
});

test("reopening takes over the retained layer and an old exit cannot retire the new content", () => {
  const ui = harness("MapLayerPresentation");
  ui.render({ ...props, open: true }); ui.tick(); ui.advance(16);
  ui.render(props); ui.advance(120);
  const reopened = ui.render({ ...props, open: true, children: "new layer" });
  assert.match(phase(reopened), /--open$/); assert.equal(reopened.children[0], "new layer");
  assert.equal(controls(reopened).some(node => node.props?.className === "map-layer-motion-shield"), false);
  assert.ok(ui.advance(240)); assert.equal(ui.timers, 0);
  ui.unmount();
});

test("hide, reduced motion and unload retire presentation without a delayed business effect", () => {
  for (const next of [{ enabled: false }, { open: false, reducedMotion: true }]) {
    const ui = harness("MapLayerPresentation");
    ui.render({ ...props, open: true }); ui.tick(); ui.advance(16);
    assert.equal(ui.render({ ...props, open: true, ...next }), null);
    assert.equal(ui.timers, 0); ui.unmount();
  }
  const ui = harness("MapLayerPresentation");
  ui.render({ ...props, open: true }); ui.tick(); ui.advance(16); ui.render(props);
  assert.equal(ui.timers, 1); ui.unmount(); assert.equal(ui.timers, 0);
  const pending = harness("MapLayerPresentation");
  pending.render({ ...props, open: true });
  assert.equal(pending.render({ ...props, open: true, enabled: false }), null);
  pending.tick(); assert.equal(pending.advance(300), null);
  assert.equal(pending.timers, 0, "a native tick from the hidden page cannot revive entry");
  pending.unmount();
});
