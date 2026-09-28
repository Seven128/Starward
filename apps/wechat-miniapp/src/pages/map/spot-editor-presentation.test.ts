import assert from "node:assert/strict";
import test from "node:test";
import {createSpotEditorPresentation, SPOT_EDITOR_EXIT_MS, type SpotEditorPhase} from "./spot-editor-presentation";

function fixture() {
  let now = 0, scope: string | null = "owner A / Map generation 1";
  const phases: SpotEditorPhase[] = [];
  const timers: Array<{at: number; run(): void; cancelled: boolean}> = [];
  const presentation = createSpotEditorPresentation({getScope: () => scope, onPhase: phase => phases.push(phase),
    schedule(callback, milliseconds) {
      const timer = {at: now + milliseconds, run: callback, cancelled: false};
      timers.push(timer);
      return () => {timer.cancelled = true;};
    },
  });
  return {presentation, phases, timers, changeScope: (next: string | null) => {scope = next;},
    advance(milliseconds: number) {
      now += milliseconds;
      for (const timer of timers) if (!timer.cancelled && timer.at <= now) {timer.cancelled = true; timer.run();}
    },
  };
}

test("normal exit retains the same editor before committing once, then moving to the requested consumer", () => {
  const f = fixture(), effects: string[] = [];
  f.presentation.enter(false); f.advance(32);
  assert.deepEqual(f.phases, ["entering", "open"]);
  assert.equal(f.presentation.close(() => {effects.push("close editor", "move camera", "open medium panel");}, false), true);
  assert.equal(f.presentation.close(() => effects.push("duplicate selection"), false), false);
  f.advance(SPOT_EDITOR_EXIT_MS);
  assert.deepEqual(effects, [], "a bridge frame retains the editor through its adopted exit");
  f.advance(32);
  assert.deepEqual(effects, ["close editor", "move camera", "open medium panel"]);
  f.advance(1000);
  assert.equal(effects.length, 3);
});

test("reduced motion and close before the first presented frame have no delayed translation", () => {
  for (const reducedMotion of [true, false]) {
    const f = fixture(); let closed = 0;
    f.presentation.enter(reducedMotion);
    assert.equal(f.presentation.close(() => closed++, reducedMotion), true);
    assert.equal(closed, 1);
    f.advance(1000);
    assert.equal(closed, 1);
  }
});

test("hidden, replaced and disposed presentations cannot apply an old exit callback", () => {
  for (const interruption of ["hidden", "account", "new intent", "disposed"]) {
    const f = fixture(); let oldCommit = 0;
    f.presentation.enter(false); f.advance(32);
    f.presentation.close(() => oldCommit++, false);
    const late = f.timers.at(-1)!.run;
    if (interruption === "hidden") {f.changeScope(null); f.presentation.cancel();}
    if (interruption === "account") f.changeScope("owner B / Map generation 1");
    if (interruption === "new intent") f.presentation.enter(false);
    if (interruption === "disposed") f.presentation.dispose();
    late(); f.advance(1000);
    assert.equal(oldCommit, 0, interruption);
  }
});

test("a cancelled opening callback cannot reopen an editor during or after exit", () => {
  const f = fixture(); let closed = 0;
  f.presentation.enter(false);
  const oldEnter = f.timers[0]!.run;
  f.presentation.close(() => closed++, false);
  oldEnter(); f.advance(1000);
  assert.equal(closed, 1);
  assert.deepEqual(f.phases, ["entering", "closing", "open"]);
});

test("an identity change during entry cannot strand the current form offscreen", () => {
  const f = fixture();
  f.presentation.enter(false);
  f.changeScope("owner B / Map generation 2");
  f.advance(32);
  assert.deepEqual(f.phases, ["entering", "open"], "the form owns its account error; presentation must remain recoverable");
  let closed = 0;
  f.presentation.close(() => closed++, true);
  assert.equal(closed, 1, "the current host can still leave the form");
});
