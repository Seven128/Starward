import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { tsImport } from "tsx/esm/api";
import { fileURLToPath } from "node:url";
import { createAdminJournalFixture } from "./admin-journal-fixture.mjs";

test("real admin page retries lost responses with frozen inputs and retires late mutation/readback after logout", async () => {
  const dom = new JSDOM('<div id="app"></div>', { url: "http://localhost/#case" });
  const journal = createAdminJournalFixture();
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, indexedDB: journal.indexedDB, IS_REACT_ACT_ENVIRONMENT: true };
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const oldFetch = globalThis.fetch;
  let root;
  const { createElement, act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { default: AdminPage } = await tsImport("../../apps/admin-web/src/app/page.tsx", {
    parentURL: import.meta.url,
    tsconfig: fileURLToPath(new URL("../../apps/admin-web/tsconfig.json", import.meta.url)),
  });
  const writes = [];
  let committed = false;
  let committedState = "APPROVED";
  let lateResolve;
  let lateReadback;
  let deferDashboard = false;
  let requestMode = "lost-first";
  let authentications = 0;
  let dashboardReads = 0;
  let hideCommittedReadback = false;
  const submission = { submissionId: "contribution:one", kind: "FIELD_REPORT", revision: 7, detail: "PRIVATE origin content", topics: [], media: [], spotNameSnapshot: "Original place" };
  const caseRow = () => ({ case_id: "case:one", state: committed && !hideCommittedReadback ? committedState : "PENDING", subject_type: "USER_CONTRIBUTION", payload: { submission } });
  const response = data => Response.json({ data, requestId: "test-request", dataState: "FRESH" });
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url);
    if (path === "/v2/admin/session") { ++authentications; return response({ actorId: "admin:verified" }); }
    if (path === "/v2/admin/dashboard") {
      ++dashboardReads;
      if (deferDashboard) return new Promise(resolve => { lateReadback = resolve; });
      return response({ spots: [], moderation: [caseRow()], audits: [] });
    }
    if (path === "/v2/admin/moderation/queue") return response({ items: [{ caseId: "case:one", state: committed ? committedState : "PENDING", kind: "FIELD_REPORT" }] });
    if (path === "/v2/admin/moderation/cases/case%3Aone") return response({ state: committed ? committedState : "PENDING", submission });
    if (path.endsWith("/resolve") || path.endsWith("/request-changes")) {
      assert.ok(journal.rows.size > 1, "a committed journal row must precede the mutation HTTP");
      writes.push({ body: init.body, key: new Headers(init.headers).get("idempotency-key") });
      if (requestMode === "retry-denied") return Response.json({ code: "PERMISSION_DENIED" }, { status: 403 });
      committed = true;
      committedState = path.endsWith("/request-changes") ? "CHANGES_REQUESTED" : "APPROVED";
      if (requestMode === "late") return new Promise(resolve => { lateResolve = resolve; });
      if (writes.length === 1) throw new TypeError("lost response");
      if (requestMode === "readback-late") deferDashboard = true;
      const data = { receipt: { receiptId: "receipt:one", actorId: "admin:verified", idempotencyKey: new Headers(init.headers).get("idempotency-key"), status: "REPLAYED" } };
      if (requestMode === "cache-failed") return Response.json({ data, postCommit: { cacheInvalidation: "FAILED" } });
      if (requestMode === "cache-recovered") return Response.json({ data, postCommit: { cacheInvalidation: "COMPLETE" } });
      if (requestMode === "cache-unknown") return Response.json({ data, postCommit: { cacheInvalidation: "UNKNOWN" } });
      if (requestMode === "cache-malformed") return Response.json({ data, postCommit: { cacheInvalidation: ["COMPLETE"] } });
      return response(data);
    }
    throw new Error(`Unexpected request ${path}`);
  };
  const tick = () => act(async () => { await new Promise(resolve => setImmediate(resolve)); });
  const waitFor = async predicate => {
    const deadline = Date.now() + 5000;
    while (!predicate() && Date.now() < deadline) await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
    assert.ok(predicate(), `expected page transition; visible controls: ${[...dom.window.document.querySelectorAll("button")].map(element => element.textContent.trim()).join(", ")}`);
  };
  const button = label => [...dom.window.document.querySelectorAll("button")].find(element => element.textContent.trim() === label);
  const click = async label => { const element = button(label); assert.ok(element, label); assert.equal(element.disabled, false, label); await act(async () => element.click()); await tick(); };
  const fill = async (selector, value) => {
    const input = dom.window.document.querySelector(selector); assert.ok(input, selector);
    const prototype = input.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    await act(async () => { Object.getOwnPropertyDescriptor(prototype, "value").set.call(input, value); input.dispatchEvent(new dom.window.Event("input", { bubbles: true })); });
  };
  const login = async credential => {
    await fill('input[type="password"]', credential);
    await click("连接真实工作台");
    await waitFor(() => button("接收投稿") && !/正在读取本机操作记录/u.test(dom.window.document.body.textContent));
  };
  const remount = async ({ failOpen = false } = {}) => {
    await act(async () => root.unmount());
    if (failOpen) journal.failNextOpen();
    root = createRoot(dom.window.document.getElementById("app"));
    await act(async () => root.render(createElement(AdminPage))); await tick();
    assert.equal(button("重试原操作"), undefined, "private recovery stays hidden until authentication");
    assert.equal(dom.window.sessionStorage.getItem("starward.admin.session.token"), null);
    await login("test-credential");
  };
  try {
    dom.window.sessionStorage.setItem("starward.admin.session.token", "retired-legacy-credential");
    dom.window.sessionStorage.setItem("unrelated.application.key", "preserved");
    root = createRoot(dom.window.document.getElementById("app"));
    await act(async () => root.render(createElement(AdminPage))); await tick(); await tick();
    assert.equal(authentications, 0, "do not import old persisted credentials");
    assert.equal(dom.window.sessionStorage.getItem("unrelated.application.key"), "preserved");
    await login("test-credential");
    assert.match(dom.window.document.body.textContent, /admin:verified/u);
    await fill("textarea", "original review reason");
    await click("接收投稿");
    await waitFor(() => button("重试原操作") && !button("重试原操作").disabled);
    // A fresh React owner models the page losing all window-local state on
    // refresh, while the origin's durable browser storage remains intact.
    const savedRecoveryRows = [...journal.rows];
    const readsBeforeRemount = dashboardReads;
    await remount({ failOpen: true });
    await waitFor(() => button("重试读取操作记录") && dashboardReads > readsBeforeRemount);
    assert.ok(button("结束会话"), "journal storage failure must preserve the server-confirmed identity and reads");
    assert.match(dom.window.document.body.textContent, /admin:verified/u);
    assert.match(dom.window.document.body.textContent, /操作记录尚未恢复/u);
    await fill("textarea", "blocked while recovery storage is unavailable");
    await click("接收投稿");
    assert.equal(writes.length, 1, "storage-unavailable commands must not send HTTP");
    assert.deepEqual([...journal.rows], savedRecoveryRows, "unreadable recovery material must stay intact");
    await click("重试读取操作记录");
    await waitFor(() => button("重试原操作") && !button("重试原操作").disabled);
    assert.deepEqual([...journal.rows], savedRecoveryRows, "explicit journal recovery only restores the pending operation");
    assert.ok(button("重试原操作"), "refresh must retain the original unknown command");
    assert.equal(writes.length, 1, "restoration must not dispatch a mutation");
    await fill("textarea", "edited after uncertain result");
    requestMode = "retry-denied"; await click("重试原操作");
    await waitFor(() => writes.length === 2 && !button("重试原操作").disabled);
    assert.ok(button("重试原操作"), "a later rejection cannot erase the first unknown commit");
    assert.deepEqual(writes[1], writes[0]);
    requestMode = "recovered";
    hideCommittedReadback = true;
    await click("重试原操作");
    await waitFor(() => button("重试原操作") && !button("重试原操作").disabled);
    assert.equal(writes.length, 3);
    assert.deepEqual(writes[2], writes[0]);
    assert.equal(JSON.parse(writes[2].body).expectedRevision, 7);
    assert.equal(JSON.parse(writes[2].body).reason, "original review reason");
    assert.match(dom.window.document.body.textContent, /当前读回尚未证明预期结果/u, "restored checks cannot silently become true");
    hideCommittedReadback = false;
    await click("重试原操作"); await waitFor(() => !button("重试原操作"));
    assert.equal(writes.length, 4);
    assert.deepEqual(writes[3], writes[0]);
    assert.match(dom.window.document.body.textContent, /已确认/u);
    assert.equal(button("重试原操作"), undefined);

    requestMode = "cache-failed";
    await fill("textarea", "new cache-dependent action"); await click("接收投稿");
    await waitFor(() => button("重试原操作") && !button("重试原操作").disabled);
    assert.match(dom.window.document.body.textContent, /变更已提交且管理读回已确认，但公共缓存刷新未完成/u);
    assert.ok(button("重试原操作"));
    const cacheAttempt = writes.at(-1);
    await remount();
    assert.match(dom.window.document.body.textContent, /先前提交已获服务端回执/u);
    assert.match(dom.window.document.body.textContent, /曾有公共缓存刷新失败/u);
    requestMode = "retry-denied"; await click("重试原操作");
    await waitFor(() => !button("重试原操作").disabled);
    assert.ok(button("重试原操作"));
    assert.deepEqual(writes.at(-1), cacheAttempt);
    assert.match(dom.window.document.body.textContent, /先前提交已获服务端回执/u);
    for (const mode of ["cache-missing", "cache-unknown", "cache-malformed"]) {
      requestMode = mode;
      await click("重试原操作");
      await waitFor(() => button("重试原操作") && !button("重试原操作").disabled);
      assert.deepEqual(writes.at(-1), cacheAttempt, `${mode} must keep the original input and key`);
      assert.ok(journal.rows.size > 1, `${mode} must keep the unresolved durable journal`);
      assert.match(dom.window.document.body.textContent, /变更已提交且管理读回已确认，但公共缓存刷新未完成/u);
      assert.doesNotMatch(dom.window.document.body.textContent, /回执与服务端读回均匹配本次操作/u);
    }
    const writesBeforeCacheRemount = writes.length;
    await remount();
    assert.equal(writes.length, writesBeforeCacheRemount, "unqualified responses cannot turn restoration into an automatic retry");
    assert.match(dom.window.document.body.textContent, /曾有公共缓存刷新失败/u);
    requestMode = "cache-recovered"; await click("重试原操作");
    await waitFor(() => !button("重试原操作"));
    assert.deepEqual(writes.at(-1), cacheAttempt);
    assert.equal(button("重试原操作"), undefined);
    assert.equal(journal.rows.size, 1, "explicit COMPLETE closes the same operation and keeps only the scope salt");

    const beforeStorageFailure = writes.length;
    journal.failNextWrite();
    await fill("textarea", "storage write failure action");
    await click("接收投稿");
    await waitFor(() => /本机操作恢复记录不可读写/u.test(dom.window.document.body.textContent));
    assert.equal(writes.length, beforeStorageFailure, "an aborted pre-dispatch journal must prevent HTTP");

    requestMode = "late";
    await fill("textarea", "a later action"); await click("拒绝");
    await waitFor(() => typeof lateResolve === "function");
    assert.equal(typeof lateResolve, "function");
    await click("结束会话");
    await act(async () => lateResolve(response({ receipt: { receiptId: "receipt:late", status: "COMMITTED" } }))); await tick();
    assert.match(dom.window.document.body.textContent, /先建立管理员会话/u);
    assert.doesNotMatch(dom.window.document.body.textContent, /PRIVATE origin content|receipt:late|回执与服务端读回均匹配/u);
    assert.equal(dom.window.sessionStorage.getItem("starward.admin.session.token"), null);

    requestMode = "readback-late";
    await login("other-test-credential");
    assert.equal(button("重试原操作"), undefined, "same actor with another credential cannot inherit the command");
    await fill("textarea", "new session reason"); await click("接收投稿");
    await waitFor(() => typeof lateReadback === "function");
    assert.equal(typeof lateReadback, "function");
    await click("结束会话");
    await act(async () => lateReadback(response({ spots: [], moderation: [caseRow()], audits: [] }))); await tick();
    assert.match(dom.window.document.body.textContent, /先建立管理员会话/u);
    assert.doesNotMatch(dom.window.document.body.textContent, /PRIVATE origin content|回执与服务端读回均匹配/u);

    // Requesting changes keeps the same Case in the real repository's queue.
    // Its current detail must not keep presenting the pre-command PENDING state.
    requestMode = "recovered"; deferDashboard = false; committed = false;
    await login("case-readback-credential");
    const caseStatus = () => dom.window.document.querySelector('[data-testid="moderation-case"] > .ops-header .status-pill')?.textContent.trim();
    await waitFor(() => caseStatus() === "PENDING");
    await fill("textarea", "supported same-case request for additional evidence");
    await click("请求补充");
    await waitFor(() => !button("重试原操作") && /回执与服务端读回均匹配本次操作/u.test(dom.window.document.body.textContent));
    assert.equal(committedState, "CHANGES_REQUESTED");
    assert.equal(caseStatus(), "CHANGES_REQUESTED", "confirmed current Case state must follow the durable request-changes readback without navigation");
    assert.ok([...journal.rows].every(([key, value]) => !/test-credential|original review reason|new cache-dependent action|PRIVATE origin content/u.test(key + value)), "storage contains no plaintext credential or private command");
    assert.ok(journal.transactions.every(tx => tx.mode === "readwrite" && tx.durability === "strict"));
  } finally {
    if (root) await act(async () => root.unmount());
    globalThis.fetch = oldFetch;
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
    dom.window.close();
  }
});
