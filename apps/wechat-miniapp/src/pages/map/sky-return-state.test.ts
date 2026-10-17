import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionSubmission, SpotSummary } from "@starward/miniapp-contracts";
import { createMapSkyReturnState, type MapSkyReturnPanel } from "./sky-return-state";

const scope = { accountOwnerId: "account:a", mapResetVersion: 3, selectedSpotId: "spot:a", spotOpenRequestVersion: 2 };
const panel: MapSkyReturnPanel = { extent: "large", selected: { spotId: "spot:a" } as SpotSummary,
  proposal: null, position: { identity: "spot:a", top: 472, galleryIdentity: "spot:a:photo", left: 190 } };

test("a recreated Map recovers its selected panel and reading position once without copying shared state", () => {
  const state = createMapSkyReturnState();
  const store = { ...scope, viewport: { zoom: 8 }, nativeResource: () => {} };
  const saved = state.save(store, panel);
  assert.deepEqual(Object.keys(saved.scope).sort(), Object.keys(scope).sort(), "picking the scope must not retain the entire app store");
  assert.deepEqual(state.take(scope), panel);
  assert.equal(state.take(scope), null);
});

test("new account, reset, selection and explicit open invalidate a suspended panel", () => {
  for (const changed of [{ accountOwnerId: "account:b" }, { mapResetVersion: 4 },
    { selectedSpotId: "spot:b" }, { spotOpenRequestVersion: 3 }]) {
    const state = createMapSkyReturnState();
    state.save(scope, panel);
    state.invalidate({ ...scope, ...changed });
    assert.equal(state.take(scope), null, "returning to an old scope must not resurrect retired private state");
  }
});

test("pending selection stays account scoped and cannot restore after authentication is cleared", () => {
  const state = createMapSkyReturnState();
  const pendingScope = { ...scope, selectedSpotId: null };
  const pending = { ...panel, selected: null, proposal: { submissionId: "submission:a" } as ContributionSubmission };
  state.save(pendingScope, pending);
  assert.deepEqual(state.take(pendingScope), pending);
  state.save(pendingScope, pending);
  assert.equal(state.take({ ...pendingScope, accountOwnerId: null }), null);
});

test("an old navigation failure cannot clear a newer saved return", () => {
  const state = createMapSkyReturnState();
  const old = state.save(scope, panel);
  const current = state.save(scope, { ...panel, extent: "medium" });
  state.discard(old);
  assert.equal(state.take(scope)?.extent, "medium");
  state.save(scope, panel);
  state.discard(current);
  assert.deepEqual(state.take(scope), panel);
});

test("scope subscription exists only while the return snapshot is held", () => {
  const state = createMapSkyReturnState();
  let changed: ((value: typeof scope) => void) | null = null;
  let unsubscribed = 0;
  const observe = (listener: (value: typeof scope) => void) => {
    changed = listener;
    return () => { unsubscribed++; };
  };
  state.save(scope, panel, observe);
  changed!({ ...scope, accountOwnerId: "account:b" });
  assert.equal(unsubscribed, 1);
  assert.equal(state.take(scope), null);
  state.save(scope, panel, observe);
  assert.deepEqual(state.take(scope), panel);
  assert.equal(unsubscribed, 2);
});
