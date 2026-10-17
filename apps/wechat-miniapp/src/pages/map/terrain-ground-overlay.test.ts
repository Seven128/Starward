import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createTerrainGroundOverlayCoordinator, terrainGroundOverlayKey, type TerrainGroundOverlayTarget } from "./terrain-ground-overlay";

const target = (src: string): TerrainGroundOverlayTarget => ({
  src,
  bounds: {
    southwest: { latitude: 22, longitude: 113 },
    northeast: { latitude: 23, longitude: 114 },
  },
  opacity: 0.62,
  zIndex: 0,
});

test("native file pins retire only after removal ack, including an obsolete queued candidate", async () => {
  const pins = new Map<string, number>();
  let finishOldRemoval: (() => void) | undefined;
  const coordinator = createTerrainGroundOverlayCoordinator(120, () => ({
    addGroundOverlay: options => options.success(),
    updateGroundOverlay: options => options.success(),
    removeGroundOverlay: options => { if (options.id === 120 && !finishOldRemoval) finishOldRemoval = options.success; else options.success(); },
  }), () => undefined, { retainPath: path => {
    pins.set(path, (pins.get(path) ?? 0) + 1);
    return () => pins.set(path, pins.get(path)! - 1);
  } });
  await coordinator.apply(target("a"));
  const replacement = coordinator.apply(target("b"));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pins.get("a"), 1); assert.equal(pins.get("b"), 1);
  assert.ok(finishOldRemoval); finishOldRemoval(); await replacement;
  assert.equal(pins.get("a"), 0); assert.equal(pins.get("b"), 1);
  const obsolete = coordinator.apply(target("c")), latest = coordinator.apply(target("d"));
  await Promise.all([obsolete, latest]);
  assert.equal(pins.get("c"), 0); assert.equal(pins.get("d"), 1); assert.equal(pins.get("b"), 0);
  await coordinator.dispose(); assert.equal(pins.get("d"), 0);
});

test("native Map failure preserves the downloaded terrain image for its ordinary retry", async () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isBinaryExpression(node) && node.left.getText(source) === "terrainOverlayResult.current") callback = node.right;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(callback, "exercise the production Map result handler");
  let imagePath: string | null = "/local/valid-terrain.png", nativeError: unknown = null, imageFailures = 0, announcement = "", imageReadable = true, delayImageRead = true;
  let lateImageFailure: ((error: Error) => void) | undefined;
  const onResult = vm.runInNewContext(ts.transpileModule(`(${callback.getText(source)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    setTerrainNativeError: (error: unknown) => { nativeError = error; },
    setTerrainNativeNeedsMapRecovery() {}, setTerrainInstalledKey() {}, setTerrainPresented() {}, terrainCandidates: { current: new Map() }, terrainGroundOverlayKey,
    setAnnouncement: (text: string) => { announcement = text; },
    Taro: { getImageInfo: async () => {
      if (delayImageRead) return new Promise((_resolve, reject) => { lateImageFailure = reject; });
      if (!imageReadable) throw new Error("image decode failed"); return { width: 512, height: 512 };
    } },
    nativeMap: { isCurrent: () => true },
    terrain: { reportImageFailure: () => { imageFailures++; imagePath = null; } },
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
  assert.equal(nativeError, failure);
  assert.equal(imageFailures, 1, "confirmed image read failure still retires the bad local path");
  assert.equal(imagePath, null);
  await coordinator.dispose();
});

test("hidden cleanup failure is not reported as a visible terrain failure on return", async () => {
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  let additions = 0;
  let rejectAddition = false;
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => {
      additions++;
      if (rejectAddition) options.fail(new Error("visible addition failed"));
      else options.success();
    },
    updateGroundOverlay: () => assert.fail("a changed viewport must not mutate installed bounds"),
    removeGroundOverlay: options => options.fail(new Error("hidden native map unavailable")),
  }), result => results.push(result));
  await coordinator.apply(target("/terrain.png"));
  results.length = 0;
  await coordinator.apply(null, "suspend");
  assert.equal(results.length, 0, "hidden cleanup cannot become the next visible error");
  await coordinator.apply(target("/terrain.png"));
  assert.equal(additions, 1, "failed removal retains the confirmed image without republishing its bounds");
  assert.equal(results.at(-1)?.error, null);
  rejectAddition = true;
  await coordinator.apply(target("/terrain-new.png"));
  assert.match(String(results.at(-1)?.error), /visible addition failed/u);
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
  assert.match(String(results.at(-1)?.error), /地形叠加超时/u);
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
  assert.match(String(results.at(-1)?.error), /native asynchronous rejection/u);
  await coordinator.dispose();
  assert.equal(removed, 2);
});

test("a changed viewport retains the old image until the new id acknowledges its own new bounds", async () => {
  const visible = new Map<number, TerrainGroundOverlayTarget>(), commands: string[] = [];
  let acknowledge: (() => void) | undefined, additions = 0;
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => {
      additions++; commands.push(`add:${options.id}`);
      if (additions === 1) { visible.set(options.id, options); options.success(); }
      else acknowledge = () => { visible.set(options.id, options); options.success(); };
    },
    updateGroundOverlay: () => assert.fail("bounds replacement uses a confirmed new id"),
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

test("a failed replacement and failed cleanup offer new-Map recovery without reusing the uncertain id", async () => {
  const commands: string[] = [], results: import("./terrain-ground-overlay").TerrainGroundOverlayResult[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => { commands.push(`add:${options.id}`); if (options.id === 91301) options.success(); else options.fail(new Error("add rejected")); },
    updateGroundOverlay: () => assert.fail("an uncertain id is not reusable"),
    removeGroundOverlay: options => { commands.push(`remove:${options.id}`); options.fail(new Error("id absent or native cleanup failed")); },
  }), result => results.push(result));
  await coordinator.apply(target("/first.png"));
  await coordinator.apply(target("/replacement.png"));
  await coordinator.apply(target("/replacement.png"));
  assert.equal(results.at(-1)?.requiresMapRecovery, true, "ordinary retry cannot silently loop on an id it cannot safely retire");
  assert.deepEqual(commands, ["add:91301", "add:91302", "remove:91302"]);
  await coordinator.dispose();
});

test("an in-flight candidate superseded before acknowledgment cannot retire the displayed image", async () => {
  const callbacks = new Map<string, () => void>(), visible = new Map<number, string>(), removed: number[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => {
      const acknowledge = () => { visible.set(options.id, options.src); options.success(); };
      if (options.src === "/a.png") acknowledge(); else callbacks.set(options.src, acknowledge);
    },
    updateGroundOverlay: () => assert.fail("superseded images cannot update the current extent"),
    removeGroundOverlay: options => { removed.push(options.id); visible.delete(options.id); options.success(); },
  }), () => undefined);
  await coordinator.apply(target("/a.png"));
  const obsolete = coordinator.apply(target("/b.png"));
  await new Promise<void>(resolve => setImmediate(resolve));
  const current = coordinator.apply(target("/c.png"));
  callbacks.get("/b.png")!(); await obsolete;
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual([...visible.values()], ["/a.png"]); assert.deepEqual(removed, [91302]);
  callbacks.get("/c.png")!(); await current;
  assert.deepEqual([...visible.values()], ["/c.png"]);
  await coordinator.dispose();
});
