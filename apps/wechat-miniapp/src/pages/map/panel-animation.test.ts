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
      assert.ok(duration <= 280); assert.ok(frames.every(frame => Number.isFinite(frame.height) && frame.height >= 148 && frame.height <= 772));
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

test("native playback is not retired by the preceding bridge delay, and missing/stale start acknowledgements stay bounded", context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let finished = 0, errors = 0;
  const starts: (() => void)[] = [];
  const controller = createPanelAnimation(() => errors++);
  const host: PanelAnimationHost = {
    reportsStart: true,
    animate: (_selector, _frames, _duration, _done, started) => { starts.push(started); },
    clearAnimation() {},
  };
  const frames = [{height:368,duration:0},{height:661,duration:240}];
  controller.start(host, frames, () => finished++);
  context.mock.timers.tick(60); starts[0]!();
  context.mock.timers.tick(230); assert.equal(finished, 0, "dispatch+duration+50 must not truncate late native playback");
  context.mock.timers.tick(60); assert.equal(finished, 1);
  controller.start(host, frames, () => finished++);
  controller.cancel();
  controller.start(host, frames, () => finished++);
  starts[1]!();
  context.mock.timers.tick(699); assert.equal(finished, 1, "a retired start cannot arm a successor's completion");
  context.mock.timers.tick(1); assert.equal(finished, 2); assert.equal(errors, 1, "missing native start retires as unavailable");
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
