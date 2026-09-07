import assert from "node:assert/strict";
import test from "node:test";
import { canApplyContextRestore } from "./context-restore.ts";
import type { ObservationContext } from "@starward/miniapp-contracts";

const id = (value: string) => value as ObservationContext["contextId"];
const initial = { contextId: id("a"), revision: 1, contextFingerprint: "one" };
const updated = { contextId: id("a"), revision: 2, contextFingerprint: "two" };

test("recovery cannot overwrite a newer time or another selected context", () => {
  assert.equal(canApplyContextRestore(initial, updated, initial), false);
  assert.equal(canApplyContextRestore(initial, { ...initial, contextId: id("b") }, updated), false);
  assert.equal(canApplyContextRestore(null, initial, updated), false);
  assert.equal(canApplyContextRestore(updated, updated, initial), false);
});

test("initial bootstrap, current refresh and expired-ID recovery remain available", () => {
  assert.equal(canApplyContextRestore(null, null, initial), true);
  assert.equal(canApplyContextRestore(initial, initial, updated), true);
  assert.equal(canApplyContextRestore(updated, updated, { ...initial, contextId: id("recovered") }), true);
});
