import assert from "node:assert/strict";
import test from "node:test";
import { skyHasDisclosure } from "./sky-disclosure-commands";
import { disclosureFixture, committedAt } from "./sky-disclosure-test-support";

for (const kind of ["time", "list", "layers", "calibration", "menu"] as const) {
  test(`${kind} retires a cross-midnight playback/located preview when leaving time`, () => {
    for (const intent of ["playing", "paused", "located"] as const) {
      const page = disclosureFixture("time");
      if (intent === "located") page.time.preview("2026-09-30T16:30:00.000Z");
      else {
        page.time.play(1000);
        assert.equal(page.time.tick(4500).at, "2026-09-30T16:00:01.500Z");
        if (intent === "paused") page.time.pause();
      }
      page.commands.toggle(kind);
      assert.equal(page.time.snapshot().at, committedAt, intent);
      assert.equal(page.time.snapshot().mode, "FIXED");
      assert.equal(page.time.tick(9000).at, committedAt, "retired playback cannot revive a closed preview");
      assert.equal(page.state.panel, kind === "list" ? null : kind === "time" ? "menu" : kind);
      assert.equal(page.state.list, kind === "list");
      assert.equal(page.state.date, false);
      assert.equal(page.state.object, false);
      assert.equal(page.left, 0);
    }
  });
}

test("closing time preserves the newly committed Context", () => {
  const page = disclosureFixture("time");
  const selectedAt = "2026-09-30T16:30:00.000Z";
  page.time.bind("revision2", selectedAt, { startAt: committedAt, endAt: "2026-09-30T17:00:00.000Z" });
  page.commands.toggle("time");
  assert.equal(page.time.snapshot().at, selectedAt);
  assert.equal(page.time.snapshot().binding, "revision2");
});

test("opening time preserves its preview; opening list pauses the existing reading", () => {
  const page = disclosureFixture(null);
  page.time.preview("2026-09-30T16:30:00.000Z");
  page.commands.toggle("time");
  assert.equal(page.state.panel, "time");
  assert.equal(page.time.snapshot().at, "2026-09-30T16:30:00.000Z");
  page.state.panel = null;
  page.time.play(1000); const at = page.time.tick(4500).at;
  page.commands.toggle("list");
  assert.equal(page.time.snapshot().at, at);
  assert.equal(page.time.snapshot().mode, "PAUSED");
});

test("live edit locks reject queued switches; Back cancels calibration through its original owner", () => {
  const page = disclosureFixture("calibration");
  page.editing = true;
  for (const panel of ["time", "list", "layers", "menu"] as const) page.commands.toggle(panel);
  page.commands.leave();
  assert.equal(page.left, 0, "a queued menu Return cannot leave while calibration edits are frozen");
  page.commands.date(true);
  let revealed = false;
  page.commands.openObject(() => { revealed = true; });
  assert.equal(revealed, false);
  assert.equal(page.state.panel, "calibration");
  assert.equal(page.calibrationCancelled, 0);
  page.commands.back();
  assert.equal(page.state.panel, "menu");
  assert.equal(page.calibrationCancelled, 1);
  assert.equal(page.left, 0);
});

test("Back consumes date, object, list and each control before leaving the route", async () => {
  const page = disclosureFixture("time");
  page.state.date = true;
  page.state.object = true;
  page.time.preview("2026-09-30T16:30:00.000Z");
  await page.commands.back();
  assert.equal(page.state.date, false);
  assert.equal(page.state.object, true);
  assert.equal(page.time.snapshot().at, "2026-09-30T16:30:00.000Z", "calendar Back does not cancel its parent");
  await page.commands.back();
  assert.equal(page.state.object, false);
  assert.equal(page.state.panel, "menu");
  assert.equal(page.time.snapshot().at, committedAt, "closing the outer object also cancels its underlying unapplied time");
  await page.commands.back();
  assert.equal(page.time.snapshot().at, committedAt);
  assert.equal(page.state.panel, null);
  assert.equal(page.left, 0);
  for (const disclosure of ["list", "layers", "calibration", "menu"] as const) {
    page.commands.toggle(disclosure);
    assert.equal(skyHasDisclosure(page.state), true);
    await page.commands.back();
    if (disclosure !== "menu") {
      assert.equal(page.state.panel, "menu", "a disclosure returns to the expanded rail");
      await page.commands.back();
    }
    assert.equal(skyHasDisclosure(page.state), false);
    assert.equal(page.left, 0);
  }
  await page.commands.back();
  assert.equal(page.left, 1);
});

test("menu remains usable during context recovery and its explicit Return leaves the route", async () => {
  const page = disclosureFixture(null);
  page.busy = true;
  page.commands.toggle("list");
  assert.equal(page.state.list, false);
  page.commands.toggle("menu");
  assert.equal(page.state.panel, "menu");
  await page.commands.back();
  assert.equal(page.state.panel, null);
  assert.equal(page.left, 0, "system Back only closes the menu");
  page.commands.toggle("menu");
  await page.commands.leave();
  assert.equal(skyHasDisclosure(page.state), false);
  assert.equal(page.left, 1, "explicit menu Return leaves instead of only closing itself");
  page.visible = false;
  await page.commands.leave();
  assert.equal(page.left, 1);
});

test("rapid toggles use live state and hidden callbacks cannot close or leave", () => {
  const page = disclosureFixture(null);
  page.commands.toggle("time"); page.commands.toggle("list"); page.commands.toggle("layers");
  assert.equal(page.state.panel, "layers"); assert.equal(page.state.list, false);
  page.commands.toggle("layers");
  assert.equal(page.state.panel, "menu");
  page.commands.toggle("menu");
  assert.equal(skyHasDisclosure(page.state), false);
  page.visible = false;
  page.commands.toggle("time"); page.commands.back(); page.commands.closeObject();
  assert.equal(skyHasDisclosure(page.state), false); assert.equal(page.left, 0);
});

test("search-origin object Back preserves the list, while outside close restores the menu", () => {
  const page = disclosureFixture(null);
  page.state.list = true; page.state.object = true;
  page.commands.returnToList();
  assert.equal(page.state.list, true); assert.equal(page.state.object, false);
  page.state.object = true; page.commands.closeObject();
  assert.equal(page.state.object, false); assert.equal(page.state.list, false); assert.equal(page.state.panel, "menu");
});

test("closing direct information preserves an already expanded menu", () => {
  for (const close of ["closeObject", "back"] as const) {
    const page = disclosureFixture("menu"); page.state.object = true;
    page.commands[close]();
    assert.equal(page.state.object, false); assert.equal(page.state.panel, "menu");
  }
});

test("a retained close button cannot switch or dismiss the replacement panel", () => {
  const page = disclosureFixture("calibration");
  const close = () => page.commands.close("calibration");
  page.commands.toggle("time");
  page.time.preview("2026-09-30T16:30:00.000Z");
  close();
  assert.equal(page.state.panel, "time");
  assert.equal(page.time.snapshot().at, "2026-09-30T16:30:00.000Z");
});
