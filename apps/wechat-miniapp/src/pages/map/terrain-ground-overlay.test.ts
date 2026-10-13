import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
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
  rejectNative = true; imageReadable = false;
  await coordinator.apply(target(imagePath));
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(nativeError, failure);
  assert.equal(imageFailures, 1, "confirmed image read failure still retires the bad local path");
  assert.equal(imagePath, null);
  await coordinator.dispose();
});

test("hidden cleanup failure is not reported as a visible terrain failure on return", async () => {
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  let updates = 0;
  let rejectUpdate = false;
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: options => options.success(),
    updateGroundOverlay: options => {
      updates++;
      if (rejectUpdate) options.fail(new Error("visible update failed"));
      else options.success();
    },
    removeGroundOverlay: options => options.fail(new Error("hidden native map unavailable")),
  }), result => results.push(result));
  await coordinator.apply(target("/terrain.png"));
  results.length = 0;
  await coordinator.apply(null, "suspend");
  assert.equal(results.length, 0, "hidden cleanup cannot become the next visible error");
  await coordinator.apply(target("/terrain.png"));
  assert.equal(updates, 1, "failed removal retains the installed overlay for recovery");
  assert.equal(results.at(-1)?.error, null);
  rejectUpdate = true;
  await coordinator.apply(target("/terrain.png"));
  assert.match(String(results.at(-1)?.error), /visible update failed/u);
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
  assert.match(String(results.at(-1)?.error), /native remove failed/u);
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
  assert.equal(createAttempts, 2);
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
  assert.equal(removals, 2);
});

test("native Promise acknowledgments control installation and report asynchronous rejection", async () => {
  let acknowledge: (() => void) | undefined, removed = 0;
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: () => new Promise<void>(resolve => { acknowledge = resolve; }),
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
  assert.equal(removed, 1);
});
