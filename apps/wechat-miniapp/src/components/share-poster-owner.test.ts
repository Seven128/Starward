import assert from "node:assert/strict";
import test from "node:test";
import { createSharePosterOwner } from "./share-poster-owner";

const flush = async () => { for (let turn = 0; turn < 12; turn++) await Promise.resolve(); };
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  const ticks: (() => void)[] = [], deadlines = new Map<number, () => void>();
  let timer = 0;
  const draws: { frame: string; done: () => void; fail: (cause: unknown) => void; current: () => boolean }[] = [];
  const exported: string[] = [], written: string[] = [], errors: string[] = [], busy: boolean[] = [], retired: string[] = [], releasedImages: string[] = [], releasedPreviews: string[] = [], readyPreviews: string[] = [], presentedImages: { frame: string; image: string }[] = [];
  let saved = 0, settingsRead = 0;
  let automaticRemount = false, drawFailure = false;
  let holdPreview = false;
  const previewResult = deferred<void>(), previews: { frame: string; current: () => boolean }[] = [];
  const exportResult = deferred<string>(), albumResult = deferred<void>(), settingsResult = deferred<"permission" | "export">();
  const owner = createSharePosterOwner<string>({
    nextTick: callback => ticks.push(callback),
    draw: (frame, done, fail, current) => { draws.push({ frame, done, fail, current }); if (drawFailure) throw new Error("native unavailable"); },
    preview: async (frame, current) => { previews.push({ frame, current }); if (holdPreview) await previewResult.promise; if (current()) readyPreviews.push(frame); },
    presentImage: (frame, image) => presentedImages.push({ frame, image }),
    releasePreview: frame => releasedPreviews.push(frame),
    export: frame => { exported.push(frame); return exportResult.promise; },
    releaseImage: image => releasedImages.push(image),
    save: image => { written.push(image); return albumResult.promise; },
    albumFailure: () => { settingsRead++; return settingsResult.promise; },
    retire: frame => {
      retired.push(frame);
      if (automaticRemount) ticks.push(() => owner.update(`${frame}/newCanvas`, false));
    },
    busy: value => busy.push(value), error: value => errors.push(value), saved: () => saved++,
  }, { set: callback => { deadlines.set(++timer, callback); return timer; }, clear: handle => { deadlines.delete(handle as number); } });
  return { owner, ticks, deadlines, draws, exported, written, errors, busy, retired, releasedImages, releasedPreviews, readyPreviews, presentedImages, previews, previewResult, exportResult, albumResult, settingsResult,
    holdPreview: () => { holdPreview = true; },
    finish: (index: number) => { const draw = draws[index]; assert.ok(draw, "expected native draw was not submitted"); draw.done(); },
    remount: () => { const old = retired.at(-1); assert.ok(old); owner.update(`${old}/newCanvas`, false); },
    automaticNativeFailure: () => { automaticRemount = true; drawFailure = true; },
    tick: async () => { const current = ticks.splice(0); for (const callback of current) callback(); await flush(); },
    timeout: async () => { const current = [...deadlines.values()]; for (const callback of current) callback(); await flush(); },
    get saved() { return saved; }, get settingsRead() { return settingsRead; } };
}

test("preview and save draw serially; one same-turn save writes once and keeps its completed bitmap", async () => {
  const f = fixture();
  f.owner.update("spot-day"); await f.tick();
  const first = f.owner.save(), duplicate = f.owner.save(); await flush();
  assert.equal(f.draws.length, 1); assert.deepEqual(f.busy, [true]);
  f.finish(0); await flush();
  assert.equal(f.draws.length, 2); assert.deepEqual(f.exported, []);
  f.finish(1); await flush();
  f.exportResult.resolve("this-poster.png"); await flush();
  assert.deepEqual(f.written, ["this-poster.png"]);
  f.albumResult.resolve(); await Promise.all([first, duplicate]);
  assert.equal(f.saved, 1); assert.deepEqual(f.busy, [true, false]);
  await f.tick(); assert.equal(f.draws.length, 2, "completed same-content save must not repaint its bitmap");
  assert.deepEqual(f.retired, [], "successful handoff must not clear the visible Canvas");
  assert.equal(f.ticks.length, 0); assert.equal(f.deadlines.size, 0);
  const second = f.owner.save(); await flush();
  assert.equal(f.draws.at(-1)?.frame, "spot-day");
  f.finish(2); await second;
  assert.deepEqual(f.written, ["this-poster.png", "this-poster.png"]);
  assert.equal(f.saved, 2); assert.deepEqual(f.retired, []);
  await f.tick(); assert.equal(f.draws.length, 3); assert.equal(f.deadlines.size, 0);
});

test("save cancels a not-yet-run preview tick even when the handoff finishes before nextTick", async () => {
  const f = fixture(); f.owner.update("spot-day");
  const save = f.owner.save(); await flush(); f.finish(0); await flush();
  f.exportResult.resolve("poster.png"); await flush(); f.albumResult.resolve(); await save;
  await f.tick();
  assert.deepEqual(f.presentedImages, [{ frame: "spot-day", image: "poster.png" }], "save before first preview must still present its exported bitmap");
  assert.equal(f.draws.length, 1, "late preview tick must not resize or paint the completed Canvas");
  assert.deepEqual(f.retired, []); assert.equal(f.saved, 1); assert.equal(f.deadlines.size, 0);
});

test("data/theme replacement coalesces pending ticks and cannot paint the expired snapshot", async () => {
  const f = fixture();
  f.owner.update("old-spot-day"); f.owner.update("new-plan-night"); await f.tick();
  assert.deepEqual(f.draws.map(draw => draw.frame), ["new-plan-night"]);
  f.finish(0); await flush(); assert.equal(f.deadlines.size, 0);
});

test("late preview export cannot install an old image after timeout or lifecycle retirement", async () => {
  for (const boundary of ["timeout", "hide", "replacement", "dispose"] as const) {
    const f = fixture(); f.holdPreview(); f.owner.update("old-plan"); await f.tick();
    f.finish(0); await flush(); assert.equal(f.previews[0]!.current(), true);
    if (boundary === "timeout") await f.timeout();
    else if (boundary === "hide") f.owner.hide();
    else if (boundary === "replacement") f.owner.update("new-spot");
    else f.owner.dispose();
    await flush();
    assert.equal(f.previews[0]!.current(), false, `${boundary} must fence the late exported image`);
    f.previewResult.resolve(); await flush();
    assert.deepEqual(f.readyPreviews, []); assert.deepEqual(f.releasedPreviews, ["old-plan"]);
    f.owner.dispose();
    assert.deepEqual(f.exported, []); assert.deepEqual(f.written, []);
  }
});

test("draw timeout releases save; a late native draw cannot start export or album write", async () => {
  const f = fixture(); f.owner.update("spot");
  const save = f.owner.save(); await flush(); await f.timeout(); await save;
  assert.deepEqual(f.errors, ["export"]); assert.deepEqual(f.busy, [true, false]);
  assert.deepEqual(f.retired, ["spot"]);
  f.finish(0); await flush();
  assert.deepEqual(f.exported, []); assert.deepEqual(f.written, []); assert.equal(f.saved, 0);
});

test("hidden poster rejects a late export; show repaints the live snapshot", async () => {
  const f = fixture(); f.owner.update("plan"); const save = f.owner.save(); await flush();
  f.finish(0); await flush(); assert.deepEqual(f.exported, ["plan"]);
  f.owner.hide(); f.exportResult.resolve("stale.png"); await save;
  assert.deepEqual(f.written, []); assert.deepEqual(f.errors, []); assert.equal(f.saved, 0);
  f.owner.show(); await f.tick(); assert.equal(f.draws.length, 1, "show cannot reuse the retired node");
  assert.deepEqual(f.retired, ["plan"]);
  f.remount(); await f.tick(); assert.equal(f.draws.at(-1)?.frame, "plan/newCanvas");
  f.draws.at(-1)!.done(); await flush(); assert.equal(f.deadlines.size, 0);
});

test("already-issued album write stays locked through replacement, then redraws only the new frame", async () => {
  const f = fixture(); f.owner.update("old-plan"); const save = f.owner.save(); await flush();
  f.finish(0); await flush(); f.exportResult.resolve("old-public.png"); await flush();
  assert.deepEqual(f.written, ["old-public.png"]);
  assert.deepEqual(f.releasedImages, [], "an issued album handoff retains its file until settlement");
  f.owner.update("new-spot"); await f.tick(); await f.owner.save();
  assert.deepEqual(f.busy, [true]); assert.equal(f.draws.length, 1);
  f.albumResult.resolve(); await save; assert.equal(f.saved, 0); assert.deepEqual(f.errors, []);
  assert.deepEqual(f.releasedImages, ["old-public.png"]);
  assert.deepEqual(f.releasedPreviews, ["old-plan"]);
  await f.tick(); assert.equal(f.draws.at(-1)?.frame, "new-spot");
  f.draws.at(-1)!.done(); await flush();
});

test("album denial keeps permission meaning and valid bitmap; late settings after disposal do not update UI", async () => {
  for (const dispose of [false, true]) {
    const f = fixture(); f.owner.update("spot"); const save = f.owner.save(); await flush();
    f.finish(0); await flush(); f.exportResult.resolve("poster.png"); await flush();
    f.albumResult.reject(new Error("denied")); await flush(); assert.equal(f.settingsRead, 1);
    if (dispose) f.owner.dispose();
    f.settingsResult.resolve("permission"); await save;
    await f.tick();
    assert.deepEqual(f.errors, dispose ? [] : ["permission"]);
    assert.deepEqual(f.presentedImages, [{ frame: "spot", image: "poster.png" }], "album denial retains the completed public preview");
    assert.equal(f.saved, 0); assert.equal(f.draws.length, 1); assert.deepEqual(f.retired, []);
    assert.equal(f.deadlines.size, 0);
  }
});

test("export failure does not inspect permission; expiry/unmount cancels pending draw and all timers", async () => {
  const f = fixture(); f.owner.update("plan"); const save = f.owner.save(); await flush();
  f.finish(0); await flush(); f.exportResult.reject(new Error("decode")); await save;
  assert.deepEqual(f.errors, ["export"]); assert.equal(f.settingsRead, 0);
  f.owner.dispose(); await f.tick(); assert.equal(f.draws.length, 1); assert.equal(f.deadlines.size, 0);
  const expired = fixture(); expired.owner.update("expires-now"); const staleSave = expired.owner.save(); await flush();
  expired.owner.dispose(); expired.finish(0); await staleSave; await expired.tick();
  assert.deepEqual(expired.exported, []); assert.deepEqual(expired.written, []); assert.equal(expired.deadlines.size, 0);
});

test("a persistent native failure with automatic React remount stops instead of retrying forever", async () => {
  const f = fixture(); f.automaticNativeFailure(); f.owner.update("spot");
  for (let turn = 0; turn < 6; turn++) await f.tick();
  assert.equal(f.draws.length, 1); assert.deepEqual(f.errors, ["export"]);
  assert.equal(f.deadlines.size, 0); assert.equal(f.ticks.length, 0);
  const retry = f.owner.save(); await retry;
  for (let turn = 0; turn < 6; turn++) await f.tick();
  assert.equal(f.draws.length, 2, "one explicit retry, then stop until another user action");
  assert.deepEqual(f.exported, []); assert.deepEqual(f.written, []);
  f.owner.dispose(); assert.equal(f.deadlines.size, 0);
});

test("late native node lookup is fenced by timeout, hiding, replacement and disposal before it can paint", async () => {
  for (const boundary of ["timeout", "hide", "replacement", "dispose"] as const) {
    const f = fixture(); f.owner.update("old-plan"); const save = f.owner.save(); await flush();
    const lookup = f.draws[0]; assert.ok(lookup); assert.equal(lookup.current(), true);
    if (boundary === "timeout") await f.timeout();
    else if (boundary === "hide") f.owner.hide();
    else if (boundary === "replacement") f.owner.update("new-spot");
    else f.owner.dispose();
    assert.equal(lookup.current(), false, `${boundary} must block late native resize/paint`);
    lookup.done(); await save;
    assert.deepEqual(f.exported, []); assert.deepEqual(f.written, []);
    f.owner.dispose(); assert.equal(f.deadlines.size, 0);
  }
});

test("late export file is released after timeout or retirement without an album handoff", async () => {
  for (const boundary of ["timeout", "dispose"] as const) {
    const f = fixture(); f.owner.update("plan"); const save = f.owner.save(); await flush();
    f.finish(0); await flush(); assert.deepEqual(f.exported, ["plan"]);
    if (boundary === "timeout") await f.timeout(); else f.owner.dispose();
    await save;
    f.exportResult.resolve("late-public.png"); await flush();
    assert.deepEqual(f.releasedImages, ["late-public.png"]);
    assert.deepEqual(f.written, []); assert.equal(f.saved, 0);
    f.owner.dispose();
  }
});

test("native node lookup failure releases save promptly without export or album effects", async () => {
  const f = fixture(); f.owner.update("spot"); const save = f.owner.save(); await flush();
  const lookup = f.draws[0]; assert.ok(lookup);
  lookup.fail(new Error("poster_canvas_unavailable")); await save;
  assert.equal(lookup.current(), false); assert.equal(f.deadlines.size, 0);
  assert.deepEqual(f.errors, ["export"]); assert.deepEqual(f.busy, [true, false]);
  assert.deepEqual(f.exported, []); assert.deepEqual(f.written, []);
  f.owner.dispose();
});
