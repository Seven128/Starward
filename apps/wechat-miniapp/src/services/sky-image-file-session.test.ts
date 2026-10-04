import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyImageFileSession, type SkyImageFileSystem } from "./sky-image-file-session";

const current = "current_ab12";
const stale = ["sky-art-legacy-1.png", "sky-art-legacy-9.jpg",
  "deep-sky-M-31-MEDIUM-legacy-2.jpg", "deep-sky-M-110-DETAIL.jpg"];
const stalePng = "deep-sky-M-42-DETAIL-legacy-3.png";
const keep = [`sky-art-${current}-1.png`, `deep-sky-M-42-DETAIL-${current}-2.jpg`,
  "uploaded.jpg", "settings.json", "sky-art-legacy-0.png", "sky-art-legacy-1.png.bak",
  "../sky-art-legacy-1.png", "nested/sky-art-legacy-1.png", "deep-sky-M-111-DETAIL-legacy-1.jpg",
  "deep-sky-M-0-DETAIL-legacy-1.jpg", "deep-sky-NGC-42-DETAIL-legacy-1.jpg", "sky-art-legacy-1.png\n",
  "deep-sky-M-31-DETAIL-legacy-1.jpg\r\n"];

test("launch retires old PNG writes and preserves current PNG ownership and unrelated images", async () => {
  const currentPng = `deep-sky-M-42-DETAIL-${current}-3.png`;
  const independent = ["deep-sky-M-42-DETAIL-legacy-3.png.bak", "M-42-detail.png", "nested/" + stalePng];
  const h = filesystem([stalePng, currentPng, ...independent]);
  assert.deepEqual(await createSkyImageFileSession(current).removePreviousFiles(h.fs, "/owned"),
    { status: "complete", matched: 1, removed: 1, failed: 0 });
  assert.deepEqual([...h.files], [currentPng, ...independent]);
});

function filesystem(names: string[]) {
  const files = new Set(names), removed: string[] = [];
  let lists = 0;
  const fs: SkyImageFileSystem = {
    readdir(options) { lists++; assert.equal(options.dirPath, "/owned"); options.success({ files: [...files] }); },
    unlink(options) {
      assert(options.filePath.startsWith("/owned/"));
      const name = options.filePath.slice("/owned/".length);
      assert(files.delete(name)); removed.push(name); options.success();
    },
  };
  return { fs, files, removed, get lists() { return lists; } };
}

test("launch removes only generated files from previous runtimes, without clearing independent caches", async () => {
  const h = filesystem([...stale, ...keep]), owner = createSkyImageFileSession(current);
  assert.deepEqual(await owner.removePreviousFiles(h.fs, "/owned/"),
    { status: "complete", matched: stale.length, removed: stale.length, failed: 0 });
  assert.deepEqual([...h.files], keep);
  assert.deepEqual(h.removed, stale);
});

test("current writes during an asynchronous launch listing survive, and launch cleanup is coalesced", async () => {
  const owner = createSkyImageFileSession(current), h = filesystem(stale);
  let listing: Parameters<SkyImageFileSystem["readdir"]>[0] | undefined;
  h.fs.readdir = options => { listing = options; };
  const first = owner.removePreviousFiles(h.fs, "/owned");
  assert.equal(owner.removePreviousFiles(h.fs, "/owned"), first);
  const art = `sky-art-${owner.nextRequestSuffix()}.jpg`;
  const deep = `deep-sky-M-31-MEDIUM-${owner.nextRequestSuffix()}.jpg`;
  h.files.add(art); h.files.add(deep);
  listing!.success({ files: [...h.files, ...stale] }); // duplicate callback names do not duplicate deletion
  await first;
  assert.deepEqual([...h.files], [art, deep]);
  assert.equal(h.removed.length, stale.length);
  assert.equal(owner.removePreviousFiles(h.fs, "/owned"), first);
});

test("unavailable listing and partial deletion are distinct, bounded outcomes", async () => {
  const unavailable: SkyImageFileSystem = { readdir() { assert.fail("no native root"); }, unlink() { assert.fail("no native root"); } };
  assert.deepEqual(await createSkyImageFileSession(current).removePreviousFiles(unavailable, undefined), { status: "unavailable" });
  for (const throws of [false, true]) {
    const fs: SkyImageFileSystem = { readdir(options) {
      if (throws) throw new Error("unavailable"); options.fail();
    }, unlink() { assert.fail("a failed listing cannot authorize deletion"); } };
    assert.deepEqual(await createSkyImageFileSession(current).removePreviousFiles(fs, "/owned"), { status: "unavailable" });
  }
  const removed: string[] = [];
  const fs: SkyImageFileSystem = { readdir(options) { options.success({ files: stale }); },
    unlink(options) {
      const name = options.filePath.slice("/owned/".length);
      if (name === stale[0]) { options.fail(); return; }
      if (name === stale[1]) throw new Error("unavailable");
      removed.push(name); options.success();
    } };
  assert.deepEqual(await createSkyImageFileSession(current).removePreviousFiles(fs, "/owned"),
    { status: "partial", matched: 4, removed: 2, failed: 2 });
  assert.deepEqual(removed, stale.slice(2));
});

test("the production App launch actually invokes cleanup and still initializes native chrome", async () => {
  const source = ts.createSourceFile("app.tsx", readFileSync(new URL("../app.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === "App");
  assert(declaration);
  for (const unavailable of [false, true]) for (const publicFailure of [false, true]) {
    const h = filesystem([...stale, ...keep]), owner = createSkyImageFileSession(current);
    let launch: (() => void) | undefined, chrome = 0, warnings = 0, initialized = 0;
    const App = vm.runInNewContext(ts.transpileModule(`${declaration.getText(source).replace(/export default /, "")}\nApp`,
      { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, {
      useLaunch(callback: () => void) { launch = callback; },
      Taro: { env: { USER_DATA_PATH: "/owned" }, getFileSystemManager: () => {
        if (unavailable) throw new Error("unavailable"); return h.fs;
      } },
      skyImageFileSession: owner, useAppStore: { getState: () => ({ mode: "DAY" }) },
      // App wiring only; actual public owner/FS initialization has a separate
      // full-module integration check with real cached publication bytes.
      initializeSkyPublicImageCache: async () => { initialized++; if (publicFailure) throw Error("controlled_public_initialization_failure"); },
      syncNativeChrome: async () => { chrome++; }, console: { warn() { warnings++; } },
      React: { createElement: () => null }, QueryClientProvider: {}, miniappQueryClient: {},
    });
    App({ children: null }); assert(launch); launch();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual([...h.files], unavailable ? [...stale, ...keep] : keep, "startup must retire only known old files when storage is available");
    assert.equal(h.lists, unavailable ? 0 : 1); assert.equal(chrome, 1); assert.equal(initialized, 1);
    assert.equal(warnings, Number(unavailable) + Number(publicFailure), "independent launch failures remain visible without skipping either owner");
  }
});
