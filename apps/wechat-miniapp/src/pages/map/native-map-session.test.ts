import assert from "node:assert/strict";
import test from "node:test";
import { createNativeMapSessions, type NativeMapRasterOwner } from "./native-map-session";

function resource() {
  let remaining = true, finish!: () => void, disposals = 0;
  const owner: NativeMapRasterOwner = {
    retired: new Promise<void>(resolve => { finish = resolve; }),
    hasResources: () => remaining,
    dispose: async () => { disposals++; },
  };
  return { owner, disposals: () => disposals,
    confirmNativeRemoval() { remaining = false; finish(); } };
}

test("one direct fault successor preserves unknown ownership; external reentry waits for real old removals", async () => {
  const sessions = createNativeMapSessions(), original = sessions.create(), old = resource();
  let changes = 0; const unsubscribe = sessions.subscribe(() => { changes++; });
  original.registerRaster(old.owner);
  const successor = original.recover()!;
  assert.ok(successor); assert.equal(old.disposals(), 1);
  assert.equal(original.isCurrent(), false); assert.equal(successor.canInstallRasters(), true);
  assert.equal(successor.recover(), null);
  const next = resource(); successor.registerRaster(next.owner); successor.retire();
  const external = sessions.create();
  assert.equal(external.canInstallRasters(), false, "external unmount cannot reset the unresolved native lifetime");
  const blockedChanges = changes;
  old.confirmNativeRemoval(); await old.owner.retired; await Promise.resolve();
  assert.equal(external.canInstallRasters(), false, "the successor's own resources remain independently owned");
  next.confirmNativeRemoval(); await next.owner.retired; await Promise.resolve();
  assert.equal(external.canInstallRasters(), true); assert.ok(changes > blockedChanges, "actual cleanup wakes the mounted consumer");
  assert.notEqual(external.mapId, original.mapId); assert.notEqual(external.mapId, successor.mapId);
  assert.equal(external.recover(), null, "native-instance uncertainty survives successful overlay removals and route reentry");
  unsubscribe(); external.retire();
});

test("a normal resource cleanup leaves no retirement debt and native identities are not reused by another page", async () => {
  const sessions = createNativeMapSessions(), first = sessions.create(), raster = resource();
  const unregister = first.registerRaster(raster.owner); unregister();
  raster.confirmNativeRemoval(); await raster.owner.retired; await Promise.resolve();
  first.retire();
  const returned = sessions.create(); assert.equal(returned.canInstallRasters(), true);
  assert.notEqual(returned.mapId, first.mapId); assert.ok(returned.recover());
});

test("a fault without raster files still owns one unknown native instance and cannot repeatedly remount Maps", () => {
  const sessions = createNativeMapSessions(), first = sessions.create(), successor = first.recover()!;
  assert.ok(successor); assert.notEqual(successor.mapId, first.mapId);
  assert.equal(successor.canInstallRasters(), true);
  for (let attempt = 0; attempt < 4; attempt++) assert.equal(successor.recover(), null);
  successor.retire();
  const anotherPage = sessions.create(); assert.equal(anotherPage.recover(), null);
});
