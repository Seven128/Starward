import assert from "node:assert/strict";
import test from "node:test";
import { disclosureFixture, committedAt } from "./sky-disclosure-test-support";

test("calendar entry cancels the preview via its owner; retired actions cannot reopen it", () => {
  const page = disclosureFixture("time");
  page.time.preview("2026-09-30T16:30:00.000Z");
  page.commands.date(true);
  assert.equal(page.state.date, true);
  assert.equal(page.time.snapshot().at, committedAt);
  page.commands.back();
  assert.equal(page.state.date, false);
  assert.equal(page.state.panel, "time");
  page.commands.toggle("list");
  page.commands.date(true);
  assert.equal(page.state.date, false, "queued calendar opener does not bypass the active disclosure");
});

test("a busy date command can close without cancelling or replacing the submitted Context", () => {
  const page = disclosureFixture("time");
  page.commands.date(true);
  page.busy = true;
  page.commands.date(false);
  assert.equal(page.state.date, false);
  assert.equal(page.time.snapshot().binding, "revision1");
  page.commands.date(true);
  assert.equal(page.state.date, false);
});

test("a retired time owner cannot close a replacement calendar or cancel its preview", () => {
  const page = disclosureFixture("time");
  page.state.date = true;
  page.time.preview("2026-09-30T16:30:00.000Z");
  page.retired = true;
  page.commands.date(false);
  assert.equal(page.state.date, true);
  assert.equal(page.time.snapshot().at, "2026-09-30T16:30:00.000Z");
});
