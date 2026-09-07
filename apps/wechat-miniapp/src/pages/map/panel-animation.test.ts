import assert from "node:assert/strict";
import test from "node:test";
import { createPanelAnimation, type PanelAnimationHost } from "./panel-animation";
import { panelSpringFrames } from "./panel-spring";
test("spring renderer receives one bounded animation and stale completion cannot clear its successor", () => {
  const callbacks: (() => void)[] = [];
  let clears = 0, finishes = 0;
  const host: PanelAnimationHost = {
    animate: (_selector, frames, duration, done) => {
      assert.equal(frames[0]!.offset, 0); assert.equal(frames.at(-1)!.offset, 1);
      assert.ok(duration <= 640); assert.ok(frames.every(frame => frame.height >= 220 && frame.height <= 700));
      callbacks.push(done);
    },
    clearAnimation: (selector, done) => { assert.equal(selector, ".spot-panel"); assert.equal(typeof done, "function"); clears++; done(); },
  };
  const controller = createPanelAnimation();
  const frames = panelSpringFrames({ from: 350, to: 700, velocity: 1, min: 220, max: 700 });
  controller.start(host, frames, () => finishes++);
  controller.cancel();
  controller.start(host, frames, () => finishes++);
  callbacks[0]!();
  assert.equal(finishes, 0); assert.equal(clears, 1);
  callbacks[1]!();
  assert.equal(finishes, 1); assert.equal(clears, 2);
  controller.cancel(); assert.equal(clears, 2);
});


test("renderer exceptions still release settling and do not retain a failed owner", () => {
  let errors = 0, finished = 0, clearCalls = 0;
  const controller = createPanelAnimation(() => errors++);
  const frames = panelSpringFrames({ from: 350, to: 700, velocity: 1, min: 220, max: 700 });
  const host: PanelAnimationHost = {
    animate: () => { throw new Error("native rejected"); },
    clearAnimation: () => { clearCalls++; throw new Error("native cleared after disposal"); },
  };
  assert.doesNotThrow(() => controller.start(host, frames, () => finished++));
  assert.equal(finished, 1); assert.equal(errors, 2); assert.equal(clearCalls, 1);
  controller.cancel(); assert.equal(clearCalls, 1);
});


test("CSS duration releases presentation when animationend is unavailable", async () => {
  let cleared = 0, errors = 0;
  const controller = createPanelAnimation(() => errors++);
  await new Promise<void>(resolve => controller.start({
    animate: () => {}, clearAnimation: () => { cleared++; },
  }, [{ height: 350, duration: 0 }, { height: 351, duration: 16 }], resolve));
  assert.equal(cleared, 1); assert.equal(errors, 0);
  controller.cancel(); assert.equal(cleared, 1);
});

test("cancelled timer cannot retire a replacement motion", context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const controller = createPanelAnimation();
  let cleared = 0, finished = 0;
  const host: PanelAnimationHost = { animate() {}, clearAnimation() { cleared++; } };
  controller.start(host, [{height:350,duration:0},{height:351,duration:16}], () => finished++);
  context.mock.timers.tick(20);
  controller.start(host, [{height:351,duration:0},{height:700,duration:160}], () => finished++);
  assert.equal(cleared,1);
  context.mock.timers.tick(46);
  assert.equal(cleared,1);
  assert.equal(finished,0);
  context.mock.timers.tick(164);
  assert.equal(cleared,2);
  assert.equal(finished,1);
  controller.cancel();
});
