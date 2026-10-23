import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { tsImport } from "tsx/esm/api";
import { fileURLToPath } from "node:url";

test("real admin page retries lost responses with frozen inputs and retires late mutation/readback after logout", async () => {
  const dom = new JSDOM('<div id="app"></div>', { url: "http://localhost/#case" });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true };
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
  let lateResolve;
  let lateReadback;
  let deferDashboard = false;
  let requestMode = "lost-first";
  const submission = { submissionId: "contribution:one", kind: "FIELD_REPORT", revision: 7, detail: "PRIVATE origin content", topics: [], media: [], spotNameSnapshot: "Original place" };
  const caseRow = () => ({ case_id: "case:one", state: committed ? "APPROVED" : "PENDING", subject_type: "USER_CONTRIBUTION", payload: { submission } });
  const response = data => Response.json({ data, requestId: "test-request", dataState: "FRESH" });
  globalThis.fetch = async (url, init = {}) => {
    const path = String(url);
    if (path === "/v2/admin/session") return response({ actorId: "admin:verified" });
    if (path === "/v2/admin/dashboard") {
      if (deferDashboard) return new Promise(resolve => { lateReadback = resolve; });
      return response({ spots: [], moderation: [caseRow()], audits: [] });
    }
    if (path === "/v2/admin/moderation/queue") return response({ items: [{ caseId: "case:one", state: "PENDING", kind: "FIELD_REPORT" }] });
    if (path === "/v2/admin/moderation/cases/case%3Aone") return response({ state: committed ? "APPROVED" : "PENDING", submission });
    if (path.endsWith("/resolve")) {
      writes.push({ body: init.body, key: new Headers(init.headers).get("idempotency-key") });
      if (requestMode === "retry-denied") return Response.json({ code: "PERMISSION_DENIED" }, { status: 403 });
      committed = true;
      if (requestMode === "late") return new Promise(resolve => { lateResolve = resolve; });
      if (writes.length === 1) throw new TypeError("lost response");
      if (requestMode === "readback-late") deferDashboard = true;
      const data = { receipt: { receiptId: "receipt:one", actorId: "admin:verified", idempotencyKey: new Headers(init.headers).get("idempotency-key"), status: "REPLAYED" } };
      return requestMode === "cache-failed" ? Response.json({ data, postCommit: { cacheInvalidation: "FAILED" } }) : response(data);
    }
    throw new Error(`Unexpected request ${path}`);
  };
  const tick = () => act(async () => { await new Promise(resolve => setImmediate(resolve)); });
  const button = label => [...dom.window.document.querySelectorAll("button")].find(element => element.textContent.trim() === label);
  const click = async label => { const element = button(label); assert.ok(element, label); assert.equal(element.disabled, false, label); await act(async () => element.click()); await tick(); };
  const fill = async (selector, value) => {
    const input = dom.window.document.querySelector(selector); assert.ok(input, selector);
    const prototype = input.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    await act(async () => { Object.getOwnPropertyDescriptor(prototype, "value").set.call(input, value); input.dispatchEvent(new dom.window.Event("input", { bubbles: true })); });
  };
  try {
    dom.window.sessionStorage.setItem("starward.admin.session.token", "test-credential");
    root = createRoot(dom.window.document.getElementById("app"));
    await act(async () => root.render(createElement(AdminPage))); await tick(); await tick();
    assert.match(dom.window.document.body.textContent, /admin:verified/u);
    await fill("textarea", "original review reason");
    await click("接收投稿");
    await fill("textarea", "edited after uncertain result");
    requestMode = "retry-denied"; await click("重试原操作");
    assert.ok(button("重试原操作"), "a later rejection cannot erase the first unknown commit");
    assert.deepEqual(writes[1], writes[0]);
    requestMode = "recovered";
    await click("重试原操作");
    assert.equal(writes.length, 3);
    assert.deepEqual(writes[2], writes[0]);
    assert.equal(JSON.parse(writes[2].body).expectedRevision, 7);
    assert.equal(JSON.parse(writes[2].body).reason, "original review reason");
    assert.match(dom.window.document.body.textContent, /已确认/u);
    assert.equal(button("重试原操作"), undefined);

    requestMode = "cache-failed";
    await fill("textarea", "new cache-dependent action"); await click("接收投稿");
    assert.match(dom.window.document.body.textContent, /变更已提交且管理读回已确认，但公共缓存刷新未完成/u);
    assert.ok(button("重试原操作"));
    const cacheAttempt = writes.at(-1);
    requestMode = "retry-denied"; await click("重试原操作");
    assert.ok(button("重试原操作"));
    assert.deepEqual(writes.at(-1), cacheAttempt);
    assert.match(dom.window.document.body.textContent, /先前提交已获服务端回执/u);
    requestMode = "cache-recovered"; await click("重试原操作");
    assert.deepEqual(writes.at(-1), cacheAttempt);
    assert.equal(button("重试原操作"), undefined);

    requestMode = "late";
    await fill("textarea", "a later action"); await click("拒绝");
    assert.equal(typeof lateResolve, "function");
    await click("结束会话");
    await act(async () => lateResolve(response({ receipt: { receiptId: "receipt:late", status: "COMMITTED" } }))); await tick();
    assert.match(dom.window.document.body.textContent, /先建立管理员会话/u);
    assert.doesNotMatch(dom.window.document.body.textContent, /PRIVATE origin content|receipt:late|回执与服务端读回均匹配/u);
    assert.equal(dom.window.sessionStorage.getItem("starward.admin.session.token"), null);

    requestMode = "readback-late";
    await fill('input[type="password"]', "other-test-credential");
    await click("连接真实工作台"); await tick();
    await fill("textarea", "new session reason"); await click("接收投稿");
    assert.equal(typeof lateReadback, "function");
    await click("结束会话");
    await act(async () => lateReadback(response({ spots: [], moderation: [caseRow()], audits: [] }))); await tick();
    assert.match(dom.window.document.body.textContent, /先建立管理员会话/u);
    assert.doesNotMatch(dom.window.document.body.textContent, /PRIVATE origin content|回执与服务端读回均匹配/u);
  } finally {
    if (root) await act(async () => root.unmount());
    globalThis.fetch = oldFetch;
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
    dom.window.close();
  }
});
