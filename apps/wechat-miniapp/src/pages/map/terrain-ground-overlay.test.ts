import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { mapGroundOverlayKey } from "./map-ground-overlay";
import { createTerrainGroundOverlayCoordinator, type TerrainGroundOverlayTarget } from "./terrain-ground-overlay";

const target = (src: string): TerrainGroundOverlayTarget => ({
  src,
  bounds: {
    southwest: { latitude: 22, longitude: 113 },
    northeast: { latitude: 23, longitude: 114 },
  },
  opacity: 0.62,
  zIndex: 0,
});

test("controlled suspension waits for native remove, retains failed pins, and remains reusable", async () => {
  const pins = new Set<string>(), removes: { success(): void; fail(error: unknown): void }[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(120, () => ({
    addGroundOverlay: options => options.success(), updateGroundOverlay: options => options.success(),
    removeGroundOverlay: options => { removes.push(options); },
  }), () => undefined, { retainPath: path => { pins.add(path); return () => { pins.delete(path); }; } });
  await coordinator.apply(target("a"));
  let completed = false;
  const failed = coordinator.suspend().then(value => { completed = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(completed, false); assert.deepEqual([...pins], ["a"]);
  removes.shift()!.fail(new Error("native map still owns the image"));
  assert.deepEqual(await failed, { complete: false, remainingIds: [120] }); assert.deepEqual([...pins], ["a"]);
  const retry = coordinator.suspend(); await new Promise(resolve => setImmediate(resolve));
  removes.shift()!.success(); assert.deepEqual(await retry, { complete: true, remainingIds: [] }); assert.equal(pins.size, 0);
  await coordinator.apply(target("b")); assert.deepEqual([...pins], ["b"], "a cancelled departure can resume normal installation");
  const done = coordinator.dispose(); await new Promise(resolve => setImmediate(resolve)); removes.shift()!.success(); await done;
});

test("a newer target invalidates clearance while a late remove still releases only its owned file", async () => {
  let finishRemove: (() => void) | undefined;
  const pins = new Set<string>();
  const coordinator = createTerrainGroundOverlayCoordinator(120, () => ({
    addGroundOverlay: options => options.success(), updateGroundOverlay: options => options.success(),
    removeGroundOverlay: options => { finishRemove = options.success; },
  }), () => undefined, { retainPath: path => { pins.add(path); return () => { pins.delete(path); }; } });
  await coordinator.apply(target("a"));
  const stale = coordinator.suspend(); await new Promise(resolve => setImmediate(resolve));
  const latest = coordinator.apply(target("b"));
  finishRemove!(); assert.equal((await stale).complete, false); await latest;
  assert.deepEqual([...pins], ["b"]);
  const done = coordinator.dispose(); await new Promise(resolve => setImmediate(resolve)); finishRemove!(); await done;
});

test("native replacement holds both files until update ack and releases obsolete queued candidates", async () => {
  const pins = new Map<string, number>();
  let finishUpdate: (() => void) | undefined;
  const coordinator = createTerrainGroundOverlayCoordinator(120, () => ({
    addGroundOverlay: options => options.success(),
    updateGroundOverlay: options => { if (options.src === "b") finishUpdate = options.success; else options.success(); },
    removeGroundOverlay: options => options.success(),
  }), () => undefined, { retainPath: path => {
    pins.set(path, (pins.get(path) ?? 0) + 1);
    return () => pins.set(path, pins.get(path)! - 1);
  } });
  await coordinator.apply(target("a"));
  const replacement = coordinator.apply(target("b"));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pins.get("a"), 1); assert.equal(pins.get("b"), 1);
  const obsolete = coordinator.apply(target("c")), latest = coordinator.apply(target("d"));
  assert.equal(pins.get("c"), 0, "superseded queued pins retire even while the native update is unresolved");
  assert.equal(pins.get("a"), 1); assert.equal(pins.get("b"), 1); assert.equal(pins.get("d"), 1);
  assert.ok(finishUpdate); finishUpdate(); await replacement;
  await Promise.all([obsolete, latest]);
  assert.equal(pins.get("a"), 0);
  assert.equal(pins.get("c"), 0); assert.equal(pins.get("d"), 1); assert.equal(pins.get("b"), 0);
  await coordinator.dispose(); assert.equal(pins.get("d"), 0);
});

test("cross-coverage parent and final fine use one id with their own bounds and retire every native pin", async () => {
  const pins = new Set<string>(), commands: { operation: string; id: number; src: string; east: number }[] = [];
  let finishParent: (() => void) | undefined;
  const coordinator = createTerrainGroundOverlayCoordinator(120, () => ({
    addGroundOverlay: options => { commands.push({ operation: "add", id: options.id, src: options.src,
      east: options.bounds.northeast.longitude }); options.success(); },
    updateGroundOverlay: options => { commands.push({ operation: "update", id: options.id, src: options.src,
      east: options.bounds.northeast.longitude }); if (options.src === "parent-b") finishParent = options.success; else options.success(); },
    removeGroundOverlay: options => options.success(),
  }), () => undefined, { retainPath: path => { pins.add(path); return () => { pins.delete(path); }; } });
  assert.equal(coordinator.canReplace(), false, "a type declaration is not an observed native capability");
  await coordinator.apply(target("fine-a")); assert.equal(coordinator.canReplace(), true);
  const parent = { ...target("parent-b"), bounds: { southwest: { latitude: 21, longitude: 113 }, northeast: { latitude: 24, longitude: 116 } } };
  const fine = { ...target("fine-b"), bounds: { southwest: { latitude: 22, longitude: 114 }, northeast: { latitude: 23, longitude: 115 } } };
  const pending = coordinator.apply(parent, "display", "same-id-only"); await new Promise(resolve => setImmediate(resolve));
  assert.equal(coordinator.canReplace(), false); assert.deepEqual([...pins], ["fine-a", "parent-b"]);
  finishParent!(); await pending; assert.deepEqual([...pins], ["parent-b"]);
  await coordinator.apply(fine); assert.deepEqual([...pins], ["fine-b"]);
  assert.deepEqual(commands, [{ operation: "add", id: 120, src: "fine-a", east: 114 },
    { operation: "update", id: 120, src: "parent-b", east: 116 }, { operation: "update", id: 120, src: "fine-b", east: 115 }]);
  const clearance = await coordinator.suspend(); assert.equal(clearance.complete, true); assert.equal(pins.size, 0);
  assert.equal(coordinator.canReplace(), false); await coordinator.dispose();
});

test("a same-id-only parent never falls back to a second translucent id after capability disappears", async () => {
  const pins = new Set<string>(), additions: string[] = [], presented: string[] = [];
  const context: import("./terrain-ground-overlay").TerrainGroundOverlayContext = {
    addGroundOverlay: options => { additions.push(options.src); options.success(); },
    updateGroundOverlay: options => options.success(), removeGroundOverlay: options => options.success(),
  };
  const coordinator = createTerrainGroundOverlayCoordinator(120, () => context, result => {
    if (!result.error) presented.push(result.target?.src ?? "empty");
  }, { retainPath: path => { pins.add(path); return () => { pins.delete(path); }; } });
  await coordinator.apply(target("fine-a")); assert.equal(coordinator.canReplace(), true);
  delete context.updateGroundOverlay;
  await coordinator.apply(target("parent-b"), "display", "same-id-only");
  assert.deepEqual(additions, ["fine-a"]); assert.deepEqual([...pins], ["fine-a"]);
  assert.equal(presented.at(-1), "fine-a", "rejected optional coverage cannot claim the parent was installed");
  assert.equal(coordinator.canReplace(), false);
  await coordinator.apply(target("fine-b")); assert.deepEqual(additions, ["fine-a", "fine-b"]);
  assert.deepEqual([...pins], ["fine-b"], "ordinary fine data retains the old compatible fallback");
  await coordinator.dispose(); assert.equal(pins.size, 0);
});

test("native Map failure preserves the downloaded terrain image for its ordinary retry", async () => {
  const page = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const installation = ts.createSourceFile("installation.ts", readFileSync(new URL("./use-map-raster-installation.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  let callback: ts.Node | undefined, options: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isBinaryExpression(node) && node.left.getText(installation) === "resultHandler.current") callback = node.right;
    ts.forEachChild(node, visit);
  };
  const visitPage = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(page) === "terrainInstallation" && node.initializer && ts.isCallExpression(node.initializer))
      options = node.initializer.arguments[0];
    ts.forEachChild(node, visitPage);
  };
  visit(installation); visitPage(page);
  assert.ok(callback && options, "exercise the current shared raster result handler with Map's actual terrain consumer");
  let imagePath: string | null = "/local/valid-terrain.png", nativeError: unknown = null, imageFailures = 0, announcement = "", imageReadable = true, delayImageRead = true;
  let lateImageFailure: ((error: Error) => void) | undefined;
  const nativeMap = { mapId: "map:test", isCurrent: () => true };
  const input = vm.runInNewContext(ts.transpileModule(`(${options.getText(page)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    TERRAIN_GROUND_OVERLAY_ID: 91301, nativeMap, pageVisible: true, terrainEnabled: true, mapRuntimeError: null, terrainNativeRetry: 0,
    terrain: { identity: "terrain:1", candidate: { imagePath, data: { state: "READY", imageBoundsGcj02: { south: 22, west: 113, north: 23, east: 114 } } },
      reportRasterImageFailure: (_error: unknown, path: string) => { assert.equal(path, imagePath); imageFailures++; imagePath = null; } },
    setAnnouncement: (text: string) => { announcement = text; },
  });
  const onResult = vm.runInNewContext(ts.transpileModule(`(${callback.getText(installation)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    setError: (error: unknown) => { nativeError = error; },
    reportRuntimeError() {}, rasterImageDiagnostic: () => ({ code: "raster_image_read_failed" }),
    setRequiresMapRecovery() {}, setInstalled() {}, setPresented() {}, candidates: { current: new Map() }, mapGroundOverlayKey,
    Taro: { getImageInfo: async () => {
      if (delayImageRead) return new Promise((_resolve, reject) => { lateImageFailure = reject; });
      if (!imageReadable) throw new Error("image decode failed"); return { width: 512, height: 512 };
    } }, nativeMap, input,
  });
  const failure = new Error("An object could not be cloned.");
  let rejectNative = true, additions = 0;
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => { additions++; if (rejectNative) return Promise.reject(failure); options.success(); },
    updateGroundOverlay: options => { if (rejectNative) return Promise.reject(failure); options.success(); },
    removeGroundOverlay: options => options.success(),
  }), onResult);
  await coordinator.apply(target(imagePath));
  assert.equal(nativeError, failure);
  assert.match(announcement, /重试/u);
  assert.equal(imageFailures, 0, "a native publish rejection is not an image decode failure");
  assert.equal(imagePath, "/local/valid-terrain.png");
  rejectNative = false; delayImageRead = false;
  await coordinator.apply(target(imagePath));
  assert.equal(additions, 2);
  assert.equal(nativeError, null);
  lateImageFailure!(new Error("late old image read failure"));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(imageFailures, 0, "an earlier failed attempt cannot evict the image after a successful retry");
  assert.equal(imagePath, "/local/valid-terrain.png");
  rejectNative = true; imageReadable = false; imagePath = "/local/bad-new-terrain.png";
  await coordinator.apply(target(imagePath));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal((nativeError as Error).cause, failure);
  assert.equal(imageFailures, 1, "confirmed image read failure still retires the bad local path");
  assert.equal(imagePath, null);
  await coordinator.dispose();
});

test("hidden cleanup failure is quiet while hidden but cannot certify the old image on return", async () => {
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  let additions = 0;
  let rejectRemoval = true;
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => {
      additions++;
      options.success();
    },
    updateGroundOverlay: options => options.success(),
    removeGroundOverlay: options => { if (rejectRemoval) options.fail(new Error("hidden native map unavailable")); else options.success(); },
  }), result => results.push(result));
  await coordinator.apply(target("/terrain.png"));
  results.length = 0;
  await coordinator.apply(null, "suspend");
  assert.equal(results.length, 0, "hidden cleanup cannot become the next visible error");
  await coordinator.apply(target("/terrain.png"));
  assert.equal(additions, 1, "an uncertain removal cannot be followed by a second native image");
  assert.match(String(results.at(-1)?.error), /未能清理/u);
  rejectRemoval = false;
  await coordinator.apply(target("/terrain-new.png"));
  assert.equal(additions, 2); assert.equal(results.at(-1)?.error, null);
  await coordinator.dispose();
});

test("a failed native removal remains installed and a retry removes the old overlay", async () => {
  let removalAttempts = 0;
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => options.success(),
    updateGroundOverlay: options => options.success(),
    removeGroundOverlay: options => {
      removalAttempts++;
      if (removalAttempts === 1) options.fail(new Error("native remove failed"));
      else options.success();
    },
  }), result => results.push(result));

  await coordinator.apply(target("/terrain.png"));
  await coordinator.apply(null);
  assert.equal(removalAttempts, 1);
  assert.match(String(results.at(-1)?.error), /地形未能清理/u);
  assert.equal(results.at(-1)?.target, null);

  await coordinator.apply(null);
  assert.equal(removalAttempts, 2);
  assert.equal(results.at(-1)?.error, null);
  assert.equal(results.at(-1)?.target, null);
});

test("a queued obsolete target never touches the native map", async () => {
  const added: string[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => { added.push(options.src); options.success(); },
    updateGroundOverlay: options => { added.push(options.src); options.success(); },
    removeGroundOverlay: options => options.success(),
  }), () => undefined);

  const obsolete = coordinator.apply(target("/obsolete.png"));
  const current = coordinator.apply(target("/current.png"));
  await Promise.all([obsolete, current]);
  assert.deepEqual(added, ["/current.png"]);
});

test("synchronous native context failure is recoverable and an already empty target needs no context", async () => {
  let createAttempts = 0;
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  const context: import("./terrain-ground-overlay").TerrainGroundOverlayContext = {
    addGroundOverlay: options => options.success(),
    updateGroundOverlay: options => options.success(),
    removeGroundOverlay: options => options.success(),
  };
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => {
    createAttempts++;
    if (createAttempts === 1) throw new Error("native context unavailable");
    return context;
  }, result => results.push(result));

  await coordinator.apply(null);
  assert.equal(createAttempts, 0);
  await coordinator.apply(target("/terrain.png"));
  assert.match(String(results.at(-1)?.error), /native context unavailable/u);
  await coordinator.apply(target("/terrain.png"));
  assert.ok(createAttempts >= 2);
  assert.equal(results.at(-1)?.error, null);
});

test("a void native return cannot acknowledge terrain before its callback, including a missing callback", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  let callbacks: { success(): void; fail(error: unknown): void } | undefined;
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => { callbacks = options; },
    updateGroundOverlay: options => { callbacks = options; },
    removeGroundOverlay: options => options.success(),
  }), result => results.push(result));
  const first = coordinator.apply(target("/terrain.png"));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(results.length, 0, "returning void is not native success");
  callbacks!.success();
  await first;
  assert.equal(results.at(-1)?.error, null);
  const missing = coordinator.apply(target("/terrain-new.png"));
  await new Promise<void>(resolve => setImmediate(resolve));
  t.mock.timers.tick(10000);
  await missing;
  assert.match(String((results.at(-1)?.error as Error).cause), /地形叠加超时/u);
});

test("a failed first native add retains cleanup but the ordinary retry installs again", async () => {
  let additions = 0, updates = 0, removals = 0;
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => {
      if (++additions === 1) throw new Error("native add rejected");
      options.success();
    },
    updateGroundOverlay: options => { updates++; options.success(); },
    removeGroundOverlay: options => {
      removals++;
      if (additions === 1) options.fail(new Error("no installed overlay"));
      else options.success();
    },
  }), result => results.push(result));
  await coordinator.apply(target("/terrain.png"));
  assert.match(String(results.at(-1)?.error), /native add rejected/u);
  await coordinator.apply(null);
  assert.equal(removals, 1, "uncertain installation still owns cleanup");
  await coordinator.apply(target("/terrain.png"));
  assert.equal(additions, 2, "retry cannot update an unconfirmed first installation");
  assert.equal(updates, 0);
  assert.equal(results.at(-1)?.error, null);
  await coordinator.dispose();
  assert.equal(removals, 3, "uncertain first id and confirmed second id both retain cleanup ownership");
});

test("native Promise acknowledgments control installation and report asynchronous rejection", async () => {
  let acknowledge: (() => void) | undefined, removed = 0, added = 0;
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: () => ++added === 1 ? new Promise<void>(resolve => { acknowledge = resolve; }) : Promise.reject(new Error("native asynchronous rejection")),
    updateGroundOverlay: () => Promise.reject(new Error("native asynchronous rejection")),
    removeGroundOverlay: () => { removed++; return Promise.resolve(); },
  }), result => results.push(result));
  const pending = coordinator.apply(target("/terrain.png"));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(results.length, 0, "a pending Promise is not native success");
  acknowledge!(); await pending;
  assert.equal(results.at(-1)?.error, null);
  await coordinator.apply(target("/terrain-new.png"));
  assert.match(String((results.at(-1)?.error as Error).cause), /native asynchronous rejection/u);
  await coordinator.dispose();
  assert.equal(removed, 1, "an uncertain update and its two files still belong to one native id");
});

test("an absent update API retains the acknowledged two-slot replacement fallback", async () => {
  const visible = new Map<number, TerrainGroundOverlayTarget>(), commands: string[] = [];
  let acknowledge: (() => void) | undefined, additions = 0;
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => {
      additions++; commands.push(`add:${options.id}`);
      if (additions === 1) { visible.set(options.id, options); options.success(); }
      else acknowledge = () => { visible.set(options.id, options); options.success(); };
    },
    removeGroundOverlay: options => { commands.push(`remove:${options.id}`); visible.delete(options.id); options.success(); },
  }), () => undefined);
  await coordinator.apply(target("/first.png"));
  const next = target("/second.png"); next.bounds.northeast.longitude = 118;
  const pending = coordinator.apply(next);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(visible.size, 1); assert.equal(visible.get(91301)?.src, "/first.png");
  assert.deepEqual(commands, ["add:91301", "add:91302"], "no empty gap before the actual acknowledgment");
  acknowledge!(); await pending;
  assert.equal(visible.size, 1); assert.equal(visible.get(91302)?.bounds.northeast.longitude, 118);
  await coordinator.dispose(); assert.equal(visible.size, 0);
});

test("a timed-out old add cannot reuse its id or replace the latest image when its callback arrives late", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let lateSuccess: (() => void) | undefined;
  const added: { id: number; src: string }[] = [], removed: number[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => {
      added.push({ id: options.id, src: options.src });
      if (added.length === 1) lateSuccess = options.success; else options.success();
    },
    updateGroundOverlay: () => assert.fail("uncertain ids cannot be updated or reused"),
    removeGroundOverlay: options => { removed.push(options.id); options.success(); },
  }), () => undefined);
  const timedOut = coordinator.apply(target("/old.png"));
  await new Promise<void>(resolve => setImmediate(resolve)); t.mock.timers.tick(10000); await timedOut;
  await coordinator.apply(target("/current.png"));
  assert.deepEqual(added, [{ id: 91301, src: "/old.png" }, { id: 91302, src: "/current.png" }]);
  assert.deepEqual(removed, [], "an unfinished add stays quarantined rather than declaring its id reusable");
  lateSuccess!(); await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(removed, [91301]);
  await coordinator.dispose(); assert.deepEqual(removed, [91301, 91302]);
});

test("a failed same-id parent update keeps both pins and repeated failed cleanup never adds more native files", async () => {
  const commands: string[] = [], results: import("./terrain-ground-overlay").TerrainGroundOverlayResult[] = [];
  const pins = new Map<string, number>();
  let rejectRemoval = true;
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => { commands.push(`add:${options.id}`); options.success(); },
    updateGroundOverlay: options => { commands.push(`update:${options.id}`); options.fail(new Error("update rejected")); },
    removeGroundOverlay: options => { commands.push(`remove:${options.id}`);
      if (rejectRemoval) options.fail(new Error("native cleanup failed")); else options.success(); },
  }), result => results.push(result), { retainPath: path => {
    pins.set(path, (pins.get(path) ?? 0) + 1); return () => pins.set(path, pins.get(path)! - 1);
  } });
  await coordinator.apply(target("/first.png"));
  await coordinator.apply(target("/replacement.png"), "display", "same-id-only");
  assert.equal(results.at(-1)?.presentationUnknown, true);
  assert.deepEqual([...pins.values()], [1, 1]);
  for (let index = 0; index < 12; index++) await coordinator.apply(target(`/new-${index}.png`));
  assert.equal(results.at(-1)?.requiresMapRecovery, true, "ordinary retry cannot silently loop on an id it cannot safely retire");
  assert.equal(commands.filter(value => value.startsWith("add:")).length, 1);
  assert.equal(commands.filter(value => value.startsWith("update:")).length, 1);
  assert.equal([...pins.values()].reduce((a, b) => a + b, 0), 2);
  assert.deepEqual(await coordinator.dispose(), { complete: false, remainingIds: [91301] });
  assert.equal([...pins.values()].reduce((a, b) => a + b, 0), 2);
  rejectRemoval = false;
  assert.deepEqual(await coordinator.dispose(), { complete: true, remainingIds: [] });
  assert.equal([...pins.values()].reduce((a, b) => a + b, 0), 0);
});

test("an in-flight update is serialized, never acknowledges a superseded target, and keeps one coverage id", async () => {
  const callbacks = new Map<string, () => void>(), visible = new Map<number, string>(), removed: number[] = [];
  const results: import("./terrain-ground-overlay").TerrainGroundOverlayResult[] = [];
  const commands: string[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => {
      commands.push(`add:${options.id}`); visible.set(options.id, options.src); options.success();
    },
    updateGroundOverlay: options => {
      commands.push(`update:${options.id}`);
      assert.equal(options.opacity, .62); assert.equal(options.zIndex, 0); assert.equal(options.visible, true);
      callbacks.set(options.src, () => { visible.set(options.id, options.src); options.success(); });
    },
    removeGroundOverlay: options => { removed.push(options.id); visible.delete(options.id); options.success(); },
  }), result => results.push(result));
  await coordinator.apply(target("/a.png"));
  const obsolete = coordinator.apply(target("/b.png"));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(results.at(-1)?.phase, "pending"); assert.equal(results.at(-1)?.presentationUnknown, true);
  const next = target("/c.png"); next.bounds.northeast.longitude = 118;
  const current = coordinator.apply(next);
  assert.equal(callbacks.has("/c.png"), false, "native mutations never overlap");
  callbacks.get("/b.png")!(); await obsolete;
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(results.some(result => result.target?.src === "/b.png" && !result.error && result.phase === "display"), false);
  assert.equal(visible.size, 1); assert.deepEqual(removed, []);
  callbacks.get("/c.png")!(); await current;
  assert.deepEqual([...visible.values()], ["/c.png"]);
  assert.equal(results.at(-1)?.target?.bounds.northeast.longitude, 118);
  assert.deepEqual(commands, ["add:91301", "update:91301", "update:91301"]);
  await coordinator.dispose();
});

test("a timed-out update retains both files until the actual late callback and cannot retire a newer installation", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pins = new Map<string, number>(), native = new Map<number, string>();
  let late: (() => void) | undefined;
  const coordinator = createTerrainGroundOverlayCoordinator(120, () => ({
    addGroundOverlay: options => { native.set(options.id, options.src); options.success(); },
    updateGroundOverlay: options => { late = () => { native.set(options.id, options.src); options.success(); }; },
    removeGroundOverlay: options => { native.delete(options.id); options.success(); },
  }), () => undefined, { retainPath: path => {
    pins.set(path, (pins.get(path) ?? 0) + 1); return () => pins.set(path, pins.get(path)! - 1);
  } });
  await coordinator.apply(target("a"));
  const timedOut = coordinator.apply(target("b"));
  await new Promise<void>(resolve => setImmediate(resolve)); t.mock.timers.tick(10000); await timedOut;
  assert.deepEqual([...pins.values()], [1, 1]);
  // Queue a live replacement before the real callback: late cleanup must retain
  // the identity of its own old command, not remove the same id after reuse.
  const current = coordinator.apply(target("c")); late!(); await current;
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual([...native.values()], ["c"]);
  assert.deepEqual([...pins.values()], [0, 0, 1]);
  assert.deepEqual(await coordinator.dispose(), { complete: true, remainingIds: [] });
  assert.equal(pins.get("c"), 0);
});

test("suspend during a pending update waits for its ack and remove before releasing either file", async () => {
  const pins = new Map<string, number>(), results: import("./terrain-ground-overlay").TerrainGroundOverlayResult[] = [];
  let update: (() => void) | undefined, remove: (() => void) | undefined;
  const coordinator = createTerrainGroundOverlayCoordinator(120, () => ({
    addGroundOverlay: options => options.success(), updateGroundOverlay: options => { update = options.success; },
    removeGroundOverlay: options => { remove = options.success; },
  }), result => results.push(result), { retainPath: path => {
    pins.set(path, (pins.get(path) ?? 0) + 1); return () => pins.set(path, pins.get(path)! - 1);
  } });
  await coordinator.apply(target("a"));
  const updating = coordinator.apply(target("b")); await new Promise<void>(resolve => setImmediate(resolve));
  const hidden = coordinator.apply(null, "suspend");
  assert.deepEqual([...pins.values()], [1, 1]); assert.equal(Boolean(remove), false);
  update!(); await updating; await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual([...pins.values()], [0, 1]); assert.ok(remove);
  assert.equal(results.filter(result => result.phase === "display" && result.target?.src === "b").length, 0);
  remove(); await hidden; assert.deepEqual([...pins.values()], [0, 0]);
  assert.deepEqual(await coordinator.dispose(), { complete: true, remainingIds: [] });
});

for (const lateOutcome of ["success", "failure"]) test(`dispose returns unresolved update debt and late ${lateOutcome} still retires the slot`, async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pins = new Map<string, number>(); let update: (() => void) | undefined;
  const coordinator = createTerrainGroundOverlayCoordinator(120, () => ({
    addGroundOverlay: options => options.success(), updateGroundOverlay: options => {
      update = lateOutcome === "success" ? options.success : () => options.fail(new Error("late update failure"));
    },
    removeGroundOverlay: options => options.success(),
  }), () => undefined, { retainPath: path => {
    pins.set(path, (pins.get(path) ?? 0) + 1); return () => pins.set(path, pins.get(path)! - 1);
  } });
  await coordinator.apply(target("a"));
  const updating = coordinator.apply(target("b")); await new Promise<void>(resolve => setImmediate(resolve));
  const disposed = coordinator.dispose(); t.mock.timers.tick(10000); await updating;
  assert.deepEqual(await disposed, { complete: false, remainingIds: [120] });
  assert.deepEqual([...pins.values()], [1, 1]);
  await coordinator.apply(target("c")); assert.equal(pins.has("c"), false);
  update!(); await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual([...pins.values()], [0, 0]);
  assert.deepEqual(await coordinator.dispose(), { complete: true, remainingIds: [] });
});
