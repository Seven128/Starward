import assert from "node:assert/strict";
import test from "node:test";
import { createAccountOperationOwner } from "@/hooks/account-operation";
import { createAccountExportCleanup } from "./account-export-cleanup";
import { createAccountExport, type AccountExportState } from "./account-export";

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const deferred = () => { let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject }; };
let sequence = 0;
function setup({ delayedWrite = false, delayedLoad = false, filesOwner: sharedFiles = undefined as ReturnType<typeof createAccountExportCleanup> | undefined } = {}) {
  let identity = { userId: "synthetic:A" as string | null, ownerId: "synthetic:A" as string | null,
    reset: 1, page: {}, target: "account-export" };
  let controller!: ReturnType<typeof createAccountExport>;
  const operations = createAccountOperationOwner(() => identity, busy => { if (!busy) controller?.retire(); });
  const states: AccountExportState[] = [], files = new Map<string, string>();
  const calls = { load: 0, write: 0, share: [] as string[], remove: [] as string[], warning: 0 };
  const nativeWrite = deferred(), nativeLoad = deferred(), shares: ReturnType<typeof deferred>[] = [];
  let signal: AbortSignal | undefined, removeFails = false, responseUser = "synthetic:A";
  const filesOwner = sharedFiles ?? createAccountExportCleanup(async path => {
    calls.remove.push(path); if (removeFails) throw Error("device denied"); files.delete(path);
  });
  controller = createAccountExport({ begin: () => operations.begin(), userId: () => identity.userId,
    load: async abort => { signal = abort; calls.load++; if (delayedLoad) await nativeLoad.promise;
      return { data: { generatedAt: "2026-10-15T00:00:00Z", account: { userId: responseUser } } }; },
    destination: () => { const fileName = `account-${++sequence}.json`; return { fileName, filePath: `/private/${fileName}` }; },
    write: async (path, data) => { calls.write++; if (delayedWrite) await nativeWrite.promise; files.set(path, data); },
    files: filesOwner,
    share: path => { calls.share.push(path); const handoff = deferred(); shares.push(handoff); return handoff.promise; },
    changed: state => states.push(state), message: () => "synthetic failure", cleanupWarning: () => calls.warning++,
  });
  return { controller, operations, states, calls, files, filesOwner, nativeWrite, nativeLoad, shares,
    get signal() { return signal; }, set responseUser(value: string) { responseUser = value; },
    set removeFails(value: boolean) { removeFails = value; },
    owner(value: string) { identity = { ...identity, userId: value, ownerId: value, reset: identity.reset + 1 }; operations.observe(); },
    hide() { operations.hide(); }, show() { operations.show(); },
  };
}

test("preparation creates a readable account file and requires a separate explicit handoff", async () => {
  const h = setup(); await h.controller.prepare();
  assert.equal(h.calls.load, 1); assert.equal(h.calls.write, 1); assert.equal(h.calls.share.length, 0);
  assert.equal(h.states.at(-1)?.phase, "READY");
  assert.equal(JSON.parse([...h.files.values()][0]!).account.userId, "synthetic:A");
  assert.doesNotMatch(JSON.stringify(h.states), /filePath|\/private/u);
  const pending = h.controller.share(); await tick();
  assert.equal(h.calls.share.length, 1); assert.equal(h.calls.remove.length, 0);
  h.shares[0]!.resolve(); await pending;
  assert.equal(h.states.at(-1)?.phase, "COMPLETE"); assert.equal(h.files.size, 0);
});

test("cancelled and failed native handoffs retain exactly the prepared file for an explicit retry", async () => {
  const h = setup(); await h.controller.prepare();
  for (const [index, message] of ["shareFileMessage:fail cancel", "shareFileMessage:fail unavailable"].entries()) {
    const pending = h.controller.share(); await tick(); h.shares[index]!.reject(Error(message)); await pending;
    assert.equal(h.states.at(-1)?.phase, "READY");
    assert.equal((h.states.at(-1) as { outcome: string }).outcome, index ? "failed" : "cancelled");
    assert.equal(h.files.size, 1); assert.equal(h.calls.remove.length, 0);
  }
  const pending = h.controller.share(); await tick(); h.shares[2]!.resolve(); await pending;
  assert.equal(new Set(h.calls.share).size, 1); assert.equal(h.calls.load, 1); assert.equal(h.calls.write, 1);
});

for (const callbackBeforeShow of [false, true]) test(`native handoff survives hide and callback/show order ${callbackBeforeShow}`, async () => {
  const h = setup(); await h.controller.prepare(); const pending = h.controller.share(); await tick(); h.hide();
  if (!callbackBeforeShow) h.show();
  h.shares[0]!.reject(Error("cancel")); await pending;
  if (callbackBeforeShow) h.show();
  assert.equal(h.states.at(-1)?.phase, "READY"); assert.equal(h.files.size, 1);
  h.controller.close(); await tick(); assert.equal(h.files.size, 0);
});

for (const boundary of ["account", "ABA", "hide-return", "unmount"]) test(`late native write at ${boundary} cannot share and cleans only its owned file`, async () => {
  const h = setup({ delayedWrite: true }); const pending = h.controller.prepare(); await tick();
  assert.equal(h.calls.write, 1);
  if (boundary === "account" || boundary === "ABA") { h.owner("synthetic:B"); if (boundary === "ABA") h.owner("synthetic:A"); }
  else if (boundary === "unmount") { h.controller.dispose(); h.operations.dispose(); }
  else { h.hide(); h.show(); }
  assert.equal(h.signal?.aborted, true); assert.equal(h.calls.remove.length, 0);
  const count = h.states.length; h.nativeWrite.resolve(); await pending;
  assert.equal(h.calls.share.length, 0); assert.equal(h.files.size, 0); assert.equal(h.calls.remove.length, 1);
  if (boundary === "unmount") assert.equal(h.states.length, count);
});

test("retiring an API request aborts it and ignores an uncooperative late response", async () => {
  const h = setup({ delayedLoad: true }); const pending = h.controller.prepare(); h.controller.close();
  assert.equal(h.signal?.aborted, true); h.nativeLoad.resolve(); await pending;
  assert.equal(h.calls.write, 0); assert.equal(h.calls.share.length, 0);
});

test("file cleanup after a successful handoff has its own retry and never reshares", async () => {
  const h = setup(); await h.controller.prepare(); h.removeFails = true;
  const pending = h.controller.share(); await tick(); h.shares[0]!.resolve(); await pending;
  assert.equal(h.states.at(-1)?.phase, "CLEANUP_REQUIRED");
  await h.controller.retryCleanup(); assert.equal(h.states.at(-1)?.phase, "CLEANUP_REQUIRED");
  h.removeFails = false; await h.controller.retryCleanup();
  assert.equal(h.states.at(-1)?.phase, "COMPLETE"); assert.equal(h.files.size, 0);
  assert.equal(h.calls.share.length, 1); assert.equal(h.calls.load, 1);
});

test("a later account never receives old success or filenames; failed retirement cleanup gives a generic warning", async () => {
  const h = setup(); await h.controller.prepare(); const pending = h.controller.share(); await tick();
  h.owner("synthetic:B"); h.removeFails = true; const count = h.states.length;
  h.shares[0]!.resolve(); await pending;
  assert.equal(h.states.length, count); assert.equal(h.calls.warning, 1); assert.equal(h.calls.remove.length, 1);
});

test("a different snapshot account is rejected before creating a private file", async () => {
  const h = setup(); h.responseUser = "synthetic:B"; await h.controller.prepare();
  assert.equal(h.calls.write, 0); assert.equal(h.states.at(-1)?.phase, "FAILED");
});

test("equal server timestamps on successive pages still give distinct cleanup destinations", async () => {
  const a = setup(), b = setup(); await a.controller.prepare(); await b.controller.prepare();
  assert.notEqual([...a.files.keys()][0], [...b.files.keys()][0]);
  a.controller.close(); await tick(); assert.equal(a.files.size, 0); assert.equal(b.files.size, 1);
  b.controller.close(); await tick(); assert.equal(b.files.size, 0);
});

test("a failed close keeps the exact file cleanup retry and blocks another export", async () => {
  const h = setup(); await h.controller.prepare(); h.removeFails = true;
  h.controller.close(); await tick(); assert.equal(h.files.size, 1);
  h.controller.open(); assert.equal(h.states.at(-1)?.phase, "CLEANUP_REQUIRED");
  await h.controller.prepare(); assert.equal(h.calls.write, 1); assert.equal(h.calls.load, 1);
  h.removeFails = false; await h.controller.retryCleanup();
  assert.equal(h.files.size, 0); assert.equal(h.states.at(-1)?.phase, "IDLE");
});

test("a new page and later account can clean an old retired file but cannot read or share it", async () => {
  const a = setup(); await a.controller.prepare(); a.removeFails = true;
  a.controller.dispose(); a.operations.dispose(); await tick();
  const b = setup({ filesOwner: a.filesOwner }); b.owner("synthetic:B"); b.controller.open();
  assert.equal(b.states.at(-1)?.phase, "CLEANUP_REQUIRED");
  await b.controller.prepare(); await b.controller.share();
  assert.equal(b.calls.write, 0); assert.equal(b.calls.load, 0); assert.equal(b.calls.share.length, 0);
  assert.doesNotMatch(JSON.stringify(b.states), /synthetic:A|fileName|filePath/u);
  a.removeFails = false; await b.controller.retryCleanup(); assert.equal(a.files.size, 0);
});

test("a successor cleanup waits for the retired native write terminal before removing its file", async () => {
  const a = setup({ delayedWrite: true }); const writing = a.controller.prepare(); await tick();
  a.controller.dispose(); a.operations.dispose();
  const b = setup({ filesOwner: a.filesOwner }); b.controller.open();
  const cleaning = b.controller.retryCleanup(); await tick(); assert.equal(a.calls.remove.length, 0);
  await b.controller.prepare(); assert.equal(b.calls.write, 0);
  a.nativeWrite.resolve(); await writing; await cleaning;
  assert.equal(a.files.size, 0); assert.equal(a.calls.remove.length, 1);
});
