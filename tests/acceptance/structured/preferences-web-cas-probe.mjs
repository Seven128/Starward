import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";

// A browser storage-boundary probe, not whole-App or Expo native acceptance.
// Use an already installed Playwright CLI and Chrome; this runner installs nothing.
const root = fileURLToPath(new URL("../../../", import.meta.url));
const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const require = createRequire(import.meta.url);
const cli = option("--cli") ?? require.resolve("@playwright/cli/playwright-cli.js");
const executablePath = option("--chrome");
if (!executablePath) throw new Error("Supply --chrome with an already installed Chrome executable");
const artifactParent = resolve(root, option("--output") ?? ".codex/work-items/sky-map-performance-2026-10-18/tmp");
await mkdir(artifactParent, { recursive: true });
const artifactDir = await mkdtemp(join(artifactParent, "r20-preferences-web-cas-"));
const session = `r20-pref-${randomUUID().slice(0, 8)}`;
const bundlePath = join(artifactDir, "bundle.js");
const cliConfigPath = join(artifactDir, "playwright-cli.json");
const runCodePath = join(artifactDir, "browser-probe.js");
const stateKey = "starward-preferences-runtime-web-v1:preferences-runtime-state";

const bundled = await build({
  absWorkingDir: root, bundle: true, platform: "browser", format: "iife",
  mainFields: ["browser", "module", "main"], metafile: true, outfile: bundlePath,
  stdin: {
    resolveDir: root, sourcefile: "preferences-web-cas-entry.js", contents: `
      import { createPreferenceStorage } from "./apps/mobile/src/state/preferences-storage.web.ts";
      import { createPreferencesRuntime } from "./packages/domain/src/preferences/runtime.ts";
      import { createUnrestrictedProfile } from "./packages/domain/src/preferences/index.ts";
      (async () => {
        const actorId = "isolated-web-cas";
        const storage = await createPreferenceStorage();
        const runtime = await createPreferencesRuntime({ storage });
        const profile = id => {
          const value = createUnrestrictedProfile("2026-10-23T08:00:00.000Z");
          value.id = id; value.name = "Web CAS " + id;
          value.targets = id === "beta" ? ["planets"] : ["milky-way"];
          value.travel.maxOneWayMinutes = id === "beta" ? 45 : 120;
          return value;
        };
        window.preferenceWebProbe = {
          profile, storage, createPreferenceStorage,
          createRuntime: port => createPreferencesRuntime({ storage: port }),
          prepare: (id, nonce) => runtime.prepare({
            outcome: "mobile-shell-and-preferences", actorId,
            operation: "preference.save", idempotencyKey: nonce,
            payload: { token: id, profile: profile(id) },
          }),
          execute: request => runtime.execute(request),
          projection: () => runtime.getProjection({ actorId }),
          read: entityId => runtime.read({ outcome: "mobile-shell-and-preferences", actorId, entityId }),
        };
        document.body.textContent = "Preference Web CAS boundary ready";
      })().catch(error => { document.body.textContent = error.message; throw error; });
    `,
  },
});
const inputs = Object.keys(bundled.metafile.inputs).filter(path => path !== "preferences-web-cas-entry.js");
assert(inputs.includes("apps/mobile/src/state/preferences-storage.web.ts"));
assert(inputs.includes("packages/domain/src/preferences/runtime.ts"));
assert(inputs.some(path => path.endsWith("@react-native-async-storage/async-storage/lib/module/AsyncStorage.js")));
assert(!inputs.some(path => path.includes("AsyncStorage.native")));
const hashes = async () => Object.fromEntries(await Promise.all(inputs.map(async path => [path, createHash("sha256").update(await readFile(resolve(root, path))).digest("hex")])));
const sourceBefore = await hashes();
await writeFile(join(artifactDir, "bundle-metafile.json"), JSON.stringify(bundled.metafile, null, 2));
await writeFile(cliConfigPath, JSON.stringify({
  browser: { browserName: "chromium", isolated: true, launchOptions: { executablePath, headless: true } },
  outputDir: join(artifactDir, "output", "playwright"),
}, null, 2));

// Real two-page transactions establish concurrency. Failure injection is kept
// separate and labelled; it is never used to establish successful atomicity.
async function browserProbe(page) {
  const key = "starward-preferences-runtime-web-v1:preferences-runtime-state";
  const domainKey = "preferences-runtime-state";
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const canonical = value => JSON.stringify(value, (_key, item) => item && !Array.isArray(item) && typeof item === "object"
    ? Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]])) : item);
  const equal = (a, b, message) => check(canonical(a) === canonical(b), message);
  const first = page;
  const second = await page.context().newPage();
  await second.goto(first.url());
  const pages = [first, second];
  await Promise.all(pages.map(tab => tab.waitForFunction(() => !!window.preferenceWebProbe)));
  const environment = await Promise.all(pages.map(tab => tab.evaluate(storageKey => ({
    origin: location.origin, secureContext: isSecureContext, userAgent: navigator.userAgent,
    indexedDBOpenNative: Function.prototype.toString.call(indexedDB.open),
    transactionNative: Function.prototype.toString.call(IDBDatabase.prototype.transaction),
    putNative: Function.prototype.toString.call(IDBObjectStore.prototype.put),
    localStorageSetNative: Function.prototype.toString.call(Storage.prototype.setItem),
    initialRaw: localStorage.getItem(storageKey),
  }), key)));
  check(environment.every(item => item.secureContext && item.initialRaw === null), "fresh secure origin required");
  check(environment[0].origin === environment[1].origin, "tabs must share their origin");
  check(environment.every(item => [item.indexedDBOpenNative, item.transactionNative, item.putNative, item.localStorageSetNative].every(source => source.includes("[native code]"))), "native browser primitives required");

  const race = async commands => {
    return { results: await Promise.all(pages.map((tab, index) => tab.evaluate(command =>
      window.preferenceWebProbe.execute(command).then(
        value => ({ status: "fulfilled", value }),
        error => ({ status: "rejected", message: error.message }),
      ), commands[index]))) };
  };

  // Call the production CAS port with a shared expected value directly as well:
  // even a sequential browser scheduling choice cannot bypass CAS through the
  // domain's stale-command fence and accidentally make this regression pass.
  const atomicKey = "probe-atomic-cas";
  const initial = await Promise.all(pages.map(tab => tab.evaluate(storageKey => window.preferenceWebProbe.storage.read(storageKey), atomicKey)));
  equal(initial, [null, null], "isolated CAS key must start empty");
  const inserts = await Promise.all(pages.map((tab, index) => tab.evaluate(({ storageKey, value }) =>
    window.preferenceWebProbe.storage.compareAndSwap(storageKey, null, value), { storageKey: atomicKey, value: `initial-${index}` })));
  check(inserts.filter(Boolean).length === 1, "same expected null must permit exactly one real cross-page CAS");
  const sharedExpected = `initial-${inserts.indexOf(true)}`;
  const updates = await Promise.all(pages.map((tab, index) => tab.evaluate(({ storageKey, expected, value }) =>
    window.preferenceWebProbe.storage.compareAndSwap(storageKey, expected, value), { storageKey: atomicKey, expected: sharedExpected, value: `next-${index}` })));
  check(updates.filter(Boolean).length === 1, "same prior bytes must permit exactly one real cross-page CAS update");
  const current = await Promise.all(pages.map(tab => tab.evaluate(storageKey => window.preferenceWebProbe.storage.read(storageKey), atomicKey)));
  equal(current, [`next-${updates.indexOf(true)}`, `next-${updates.indexOf(true)}`], "both pages must read the winning real CAS update");
  const directCAS = { initial, inserts, sharedExpected, updates, current };

  const prepared = await Promise.all(pages.map((tab, index) => tab.evaluate(id => window.preferenceWebProbe.prepare(id, `initial-${id}`), index === 0 ? "alpha" : "beta")));
  equal(prepared.map(command => command.baseRevision), [0, 0], "both distinct commands must prepare against base zero");
  const distinct = await race(prepared);
  const acceptedIndex = distinct.results.findIndex(item => item.status === "fulfilled");
  const rejectedIndex = distinct.results.findIndex(item => item.status === "rejected");
  if (distinct.results.filter(item => item.status === "fulfilled").length !== 1) {
    const beforeRefresh = await Promise.all(pages.map(tab => tab.evaluate(() => window.preferenceWebProbe.projection())));
    const rawBeforeRefresh = await Promise.all(pages.map(tab => tab.evaluate(storageKey => window.preferenceWebProbe.storage.read(storageKey), domainKey)));
    await Promise.all(pages.map(tab => tab.reload()));
    await Promise.all(pages.map(tab => tab.waitForFunction(() => !!window.preferenceWebProbe)));
    const restored = await Promise.all(pages.map(tab => tab.evaluate(() => window.preferenceWebProbe.projection())));
    const rawAfterRefresh = await Promise.all(pages.map(tab => tab.evaluate(storageKey => window.preferenceWebProbe.storage.read(storageKey), domainKey)));
    return {
      passes: false, failure: "both different base-zero commands acknowledged; cross-tab CAS did not reject a conflicting write",
      environment, preparedVersions: prepared.map(command => command.baseRevision), distinct,
      beforeRefresh, rawBeforeRefresh, restored, rawAfterRefresh,
    };
  }
  check(["preference_runtime_conflict", "preference_runtime_stale_command"].includes(distinct.results[rejectedIndex].message), "loser must report explicit CAS conflict or a stale prepared command");
  const winner = distinct.results[acceptedIndex].value;
  check(winner.status === "succeeded" && winner.stateVersion === 1 && winner.sideEffects.length === 1, "one acknowledged version-one effect required");
  const afterRace = await Promise.all(pages.map(tab => tab.evaluate(() => window.preferenceWebProbe.projection())));
  const winningProfile = prepared[acceptedIndex].payload.profile;
  for (const projection of afterRace) equal(projection, { profiles: [winningProfile], activeProfileId: winningProfile.id, revision: 1 }, "both clients must observe only the winning profile after conflict");

  const loserId = prepared[rejectedIndex].payload.profile.id;
  const retry = await pages[rejectedIndex].evaluate(id => window.preferenceWebProbe.prepare(id, "explicit-new-intent"), loserId);
  check(retry.baseRevision === 1 && retry.idempotencyKey !== prepared[rejectedIndex].idempotencyKey, "explicit retry must prepare a new command against current state");
  const retried = await pages[rejectedIndex].evaluate(command => window.preferenceWebProbe.execute(command), retry);
  check(retried.status === "succeeded" && retried.stateVersion === 2, "newly prepared loser must commit version two");
  const both = await Promise.all(pages.map(tab => tab.evaluate(() => window.preferenceWebProbe.projection())));
  const expectedProfiles = [winningProfile, prepared[rejectedIndex].payload.profile];
  for (const projection of both) equal(projection, { profiles: expectedProfiles, activeProfileId: loserId, revision: 2 }, "explicit retry must retain both full profiles");

  const shared = await first.evaluate(() => window.preferenceWebProbe.prepare("gamma", "shared-intent"));
  const same = await race([shared, shared]);
  check(same.results.every(item => item.status === "fulfilled"), "same prepared intent must resolve in both clients");
  equal(same.results.map(item => item.value.status).sort(), ["replayed", "succeeded"], "one new effect and one replay required");
  const sameReceipts = same.results.map(item => item.value);
  check(new Set(sameReceipts.map(receipt => receipt.entityId)).size === 1, "same intent must resolve to one entity");
  check(sameReceipts.every(receipt => receipt.stateVersion === 3), "same intent must increment the state once");
  check(sameReceipts.reduce((count, receipt) => count + receipt.sideEffects.length, 0) === 1, "only the new commit may report a side effect");
  const beforeReload = await first.evaluate(storageKey => window.preferenceWebProbe.storage.read(storageKey), domainKey);
  const expectedFinal = { profiles: [...expectedProfiles, shared.payload.profile], activeProfileId: "gamma", revision: 3 };
  await Promise.all(pages.map(tab => tab.reload()));
  await Promise.all(pages.map(tab => tab.waitForFunction(() => !!window.preferenceWebProbe)));
  const restored = await Promise.all(pages.map(tab => tab.evaluate(() => window.preferenceWebProbe.projection())));
  for (const projection of restored) equal(projection, expectedFinal, "fresh page runtimes must restore every full profile and active choice");
  const durableRaw = await Promise.all(pages.map(tab => tab.evaluate(storageKey => window.preferenceWebProbe.storage.read(storageKey), domainKey)));
  check(durableRaw.every(raw => raw === beforeReload), "reload must not rewrite or lose the durable state");
  const receipts = [winner, retried, sameReceipts[0]];
  const readback = await Promise.all(pages.map(tab => tab.evaluate(async ids => Promise.all(ids.map(id => window.preferenceWebProbe.read(id))), receipts.map(receipt => receipt.entityId))));
  for (const records of readback) for (let i = 0; i < records.length; i += 1) {
    check(records[i].status === "succeeded" && records[i].entityId === receipts[i].entityId, "receipt readback must preserve entity identity");
    equal(records[i].result, receipts[i].result, "receipt readback must preserve complete saved input");
    equal(records[i].projection, expectedFinal, "receipt readback must include current projection");
  }
  const replay = await Promise.all(pages.map(tab => tab.evaluate(command => window.preferenceWebProbe.execute(command), shared)));
  check(replay.every(receipt => receipt.status === "replayed" && receipt.sideEffects.length === 0), "post-reload same-key retry must replay without another effect");
  for (const receipt of replay) equal(receipt.projection, expectedFinal, "post-reload replay must preserve current projection");
  const rawAfterReplay = await first.evaluate(storageKey => window.preferenceWebProbe.storage.read(storageKey), domainKey);
  check(rawAfterReplay === beforeReload, "replay must leave stored bytes unchanged");
  const localAfterSaves = await Promise.all(pages.map(tab => tab.evaluate(storageKey => localStorage.getItem(storageKey), key)));
  check(localAfterSaves.every(raw => raw === null), "new saves must never create a second current state in localStorage");

  // Abort a real transaction after its put request succeeds. This establishes
  // the difference between a successful request and a completed transaction.
  const aborted = await first.evaluate(async storageKey => {
    const probe = window.preferenceWebProbe;
    const command = await probe.prepare("aborted", "aborted-intent");
    const before = await probe.storage.read(storageKey);
    const originalPut = IDBObjectStore.prototype.put;
    let injected = 0;
    IDBObjectStore.prototype.put = function(value, recordKey) {
      const request = originalPut.call(this, value, recordKey);
      if (recordKey === storageKey && !injected++) request.addEventListener("success", () => this.transaction.abort(), { once: true });
      return request;
    };
    let result;
    try { await probe.execute(command); result = "unexpected_success"; }
    catch (error) { result = error.message; }
    finally { IDBObjectStore.prototype.put = originalPut; }
    return { command, result, injected, unchanged: before === await probe.storage.read(storageKey), restoredNative: Function.prototype.toString.call(IDBObjectStore.prototype.put).includes("[native code]") };
  }, domainKey);
  check(aborted.injected === 1 && aborted.result === "preference_runtime_commit_unknown" && aborted.unchanged && aborted.restoredNative, "aborted put must not acknowledge, persist or silently retry the command");
  const abortRetry = await first.evaluate(command => window.preferenceWebProbe.execute(command), aborted.command);
  check(abortRetry.status === "succeeded" && abortRetry.stateVersion === 4 && abortRetry.sideEffects.length === 1, "same-command retry after an aborted transaction must commit once");
  const abortReplay = await second.evaluate(command => window.preferenceWebProbe.execute(command), aborted.command);
  check(abortReplay.status === "replayed" && abortReplay.sideEffects.length === 0, "other tab must replay the retried aborted intent");

  // The storage really commits before the injected reply loss. Runtime recovery
  // must read that same database, not execute an unconditional replacement.
  const lostReply = await second.evaluate(async () => {
    const probe = window.preferenceWebProbe;
    const storage = await probe.createPreferenceStorage();
    let calls = 0;
    const runtime = await probe.createRuntime({ ...storage, async compareAndSwap(...args) {
      const changed = await storage.compareAndSwap(...args);
      calls += 1;
      if (changed) throw new Error("probe_commit_reply_lost");
      return changed;
    } });
    try {
      const command = await probe.prepare("lost-reply", "lost-reply-intent");
      const recovered = await runtime.execute(command);
      return { command, recovered, calls };
    } finally { await runtime.close(); }
  });
  check(lostReply.calls === 1 && lostReply.recovered.status === "replayed" && lostReply.recovered.stateVersion === 5 && lostReply.recovered.sideEffects.length === 0, "lost response must recover the committed receipt through real readback");
  const lostReplyReadback = await first.evaluate(command => window.preferenceWebProbe.execute(command), lostReply.command);
  check(lostReplyReadback.status === "replayed" && lostReplyReadback.stateVersion === 5 && lostReplyReadback.sideEffects.length === 0, "lost-response retry must not duplicate the effect");

  const migrationContext = await page.context().browser().newContext();
  let migration;
  try {
    const legacyFirst = await migrationContext.newPage();
    await legacyFirst.goto(first.url().replace(/\/$/, "") + "/seed");
    const legacyRecord = Object.fromEntries(Object.entries(winner).filter(([name]) => !["status", "replayed", "projection", "sideEffects"].includes(name)));
    const legacyRaw = JSON.stringify({ schemaVersion: "starward-preferences-runtime-v1", revision: 1,
      records: { [winner.entityId]: legacyRecord }, idempotency: { [winner.idempotencyKey]: winner.entityId } }, null, 2);
    const oldArchiveKey = domainKey + ":legacy:previous-backup";
    const oldArchiveRaw = "  original recovery archive bytes  ";
    await legacyFirst.evaluate(({ key, legacyRaw, oldArchiveKey, oldArchiveRaw }) => {
      localStorage.setItem(key, legacyRaw);
      localStorage.setItem("starward-preferences-runtime-web-v1:" + oldArchiveKey, oldArchiveRaw);
    }, { key, legacyRaw, oldArchiveKey, oldArchiveRaw });
    await legacyFirst.goto(first.url());
    const legacySecond = await migrationContext.newPage();
    await legacySecond.goto(first.url());
    const legacyPages = [legacyFirst, legacySecond];
    await Promise.all(legacyPages.map(tab => tab.waitForFunction(() => !!window.preferenceWebProbe)));
    const projections = await Promise.all(legacyPages.map(tab => tab.evaluate(() => window.preferenceWebProbe.projection())));
    for (const projection of projections) equal(projection, { profiles: [winningProfile], activeProfileId: winningProfile.id, revision: 1 }, "concurrent legacy readers must retain the full old profile");
    const migratedRaw = await legacyFirst.evaluate(storageKey => window.preferenceWebProbe.storage.read(storageKey), domainKey);
    check(JSON.parse(migratedRaw).schemaVersion === "starward-preferences-runtime-v2", "domain must migrate v1 on the same current key");
    const archiveKey = await legacyFirst.evaluate(async raw => "preferences-runtime-state:legacy:" + Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))), byte => byte.toString(16).padStart(2, "0")).join(""), legacyRaw);
    const archived = await Promise.all(legacyPages.map(tab => tab.evaluate(storageKey => window.preferenceWebProbe.storage.read(storageKey), archiveKey)));
    check(archived.every(raw => raw === legacyRaw), "same-key domain migration must archive exact original bytes in IndexedDB");
    const previousArchive = await legacyFirst.evaluate(storageKey => window.preferenceWebProbe.storage.read(storageKey), oldArchiveKey);
    check(previousArchive === oldArchiveRaw, "preexisting legacy archive keys must import without reinterpretation");
    const untouched = await legacyFirst.evaluate(storageKey => localStorage.getItem(storageKey), key);
    check(untouched === legacyRaw, "legacy localStorage original must remain a recovery copy");
    const nullInitialized = await Promise.all(legacyPages.map(tab => tab.evaluate(() => window.preferenceWebProbe.storage.read("probe-empty"))));
    check(nullInitialized.every(value => value === null), "initial absence must import as null");
    await legacyFirst.evaluate(({ key, oldArchiveKey }) => {
      localStorage.setItem(key, "later obsolete writer");
      localStorage.setItem("starward-preferences-runtime-web-v1:" + oldArchiveKey, "later obsolete archive");
      localStorage.setItem("starward-preferences-runtime-web-v1:probe-empty", "must not resurrect");
    }, { key, oldArchiveKey });
    await Promise.all(legacyPages.map(tab => tab.reload()));
    await Promise.all(legacyPages.map(tab => tab.waitForFunction(() => !!window.preferenceWebProbe)));
    const afterReload = await Promise.all(legacyPages.map(tab => tab.evaluate(async ({ domainKey, oldArchiveKey }) => ({
      state: await window.preferenceWebProbe.storage.read(domainKey),
      archive: await window.preferenceWebProbe.storage.read(oldArchiveKey),
      empty: await window.preferenceWebProbe.storage.read("probe-empty"),
      projection: await window.preferenceWebProbe.projection(),
    }), { domainKey, oldArchiveKey })));
    for (const result of afterReload) {
      check(result.state === migratedRaw && result.archive === oldArchiveRaw && result.empty === null, "initialized state/archive/null must not reimport obsolete localStorage after reload");
      equal(result.projection, projections[0], "legacy recovery must survive fresh runtime creation");
    }
    migration = { passes: true, legacyBytes: legacyRaw.length, archiveKey, projections, exactOriginalRetained: untouched === legacyRaw,
      exactArchiveRetained: archived.every(raw => raw === legacyRaw), previousArchiveRetained: previousArchive === oldArchiveRaw,
      nullInitialized, afterReload: afterReload.map(item => ({ projection: item.projection, empty: item.empty, bytesUnchanged: item.state === migratedRaw, archiveUnchanged: item.archive === oldArchiveRaw })) };
  } finally { await migrationContext.close(); }

  // The replaced Web Locks adapter already wrote v2 JSON to localStorage.
  // Import those exact bytes too, without running a second schema migration.
  const v2Context = await page.context().browser().newContext();
  let v2Import;
  try {
    const tab = await v2Context.newPage();
    await tab.goto(first.url().replace(/\/$/, "") + "/seed");
    await tab.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: beforeReload });
    await tab.goto(first.url());
    await tab.waitForFunction(() => !!window.preferenceWebProbe);
    const imported = await tab.evaluate(async storageKey => ({
      raw: await window.preferenceWebProbe.storage.read(storageKey),
      projection: await window.preferenceWebProbe.projection(),
    }), domainKey);
    check(imported.raw === beforeReload, "previous Web Locks v2 bytes must import exactly");
    equal(imported.projection, expectedFinal, "previous v2 current state must restore every profile and active choice");
    const command = await tab.evaluate(() => window.preferenceWebProbe.prepare("after-import", "after-v2-import"));
    const receipt = await tab.evaluate(command => window.preferenceWebProbe.execute(command), command);
    check(receipt.status === "succeeded" && receipt.stateVersion === 4, "v2 import must remain writable from its current revision");
    await tab.reload();
    await tab.waitForFunction(() => !!window.preferenceWebProbe);
    const restored = await tab.evaluate(() => window.preferenceWebProbe.projection());
    equal(restored, { profiles: [...expectedFinal.profiles, command.payload.profile], activeProfileId: "after-import", revision: 4 }, "IDB state after v2 import must survive reload without reverting to the legacy backup");
    const legacyUnchanged = await tab.evaluate(storageKey => localStorage.getItem(storageKey), key);
    check(legacyUnchanged === beforeReload, "continued v2 writes must leave the original recovery copy unchanged");
    v2Import = { passes: true, exactBytesImported: imported.raw === beforeReload, originalBytesRetained: legacyUnchanged === beforeReload, restored, receiptStatus: receipt.status };
  } finally { await v2Context.close(); }

  return {
    passes: true, environment, directCAS, preparedVersions: prepared.map(command => command.baseRevision),
    distinct, afterRace, explicitRetry: { command: retry, receipt: retried }, both,
    sameIntent: same, restored, readback, replayStatuses: replay.map(receipt => receipt.status),
    durableBytes: beforeReload.length, localAfterSaves,
    abort: { ...aborted, retry: abortRetry, replay: abortReplay }, lostReply, migration, v2Import,
  };
}

await writeFile(runCodePath, browserProbe.toString());
const bundle = await readFile(bundlePath);
const html = "<!doctype html><html><head><meta charset=utf-8><title>Preference Web CAS boundary</title></head><body>Loading<script src=/bundle.js></script></body></html>";
const server = createServer((request, response) => {
  if (request.url === "/bundle.js") { response.writeHead(200, { "Content-Type": "text/javascript", "Cache-Control": "no-store" }); response.end(bundle); }
  else if (request.url === "/") { response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" }); response.end(html); }
  else if (request.url === "/seed") { response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" }); response.end("<!doctype html><title>Isolated legacy storage seed</title>"); }
  else { response.writeHead(404); response.end(); }
});
await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolveListen); });
const origin = `http://127.0.0.1:${server.address().port}`;
const execute = promisify(execFile);
const cliCall = async (label, command) => {
  let result;
  let error;
  try { result = await execute(process.execPath, [cli, `-s=${session}`, ...command], { cwd: root, timeout: 60_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }); }
  catch (caught) { error = caught; result = { stdout: caught.stdout ?? "", stderr: caught.stderr ?? "" }; }
  await writeFile(join(artifactDir, `${label}.stdout.txt`), result.stdout);
  await writeFile(join(artifactDir, `${label}.stderr.txt`), result.stderr);
  if (error) throw new Error(`${label} failed: ${result.stdout}\n${result.stderr}`, { cause: error });
  return result.stdout;
};
let result;
let failure;
let closed = false;
try {
  await cliCall("open", ["open", origin, `--config=${cliConfigPath}`]);
  const stdout = await cliCall("run-code", ["run-code", `--filename=${runCodePath}`, "--raw"]);
  result = JSON.parse(stdout.trim());
  assert.equal(result.passes, true, result.failure);
  assert.deepEqual(await hashes(), sourceBefore, "bundled production sources changed during this probe");
} catch (error) {
  failure = String(error.stack ?? error);
} finally {
  try { await cliCall("close", ["close"]); closed = true; }
  catch (error) { failure ??= `Owned browser close failed: ${String(error)}`; }
  await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
}
const report = {
  scope: "Actual browser IndexedDB transactions + production preference storage/domain runtime and AsyncStorage legacy read; not Expo native or whole-App acceptance. Abort/reply-loss injection is separately labelled.",
  at: new Date().toISOString(), origin, stateKey, session, cli, executablePath,
  sourceHashes: sourceBefore, bundleSha256: createHash("sha256").update(bundle).digest("hex"),
  ...result, cleanup: { ownedBrowserClosed: closed, ownedServerClosed: !server.listening },
  ...(failure ? { passes: false, failure } : {}),
};
const reportPath = join(artifactDir, "result.json");
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passes: report.passes, reportPath, cleanup: report.cleanup, failure }, null, 2));
if (failure) process.exitCode = 1;
