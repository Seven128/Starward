import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { boundWechatProtocol, boundedWechatConnect } from "./wechat-protocol.mjs";
import { observerFail, observerReceiptPath, validateObserverReceipt, validAutomationPort } from "./development-automation.mjs";

const hash = value => createHash("sha256").update(value).digest("hex");
const activeObservers = new Map();
const connectingObservers = new Map();
import { redactDevelopmentValue } from './development-redaction.mjs';
export { redactDevelopmentValue } from './development-redaction.mjs';
function selector(value) {
  if (typeof value !== "string" || value.length > 240 || !/^[.#[]/u.test(value) || /[\r\n]/u.test(value)) observerFail("stable_selector_required");
  return value;
}
function pagePath(value) { return String(value ?? "").replace(/^\//u, ""); }
function timeout(value, fallback = 5000) {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < 1 || result > 30_000) observerFail("timeout_out_of_bounds");
  return result;
}
const attributes = value => {
  const names = value ?? [];
  if (!Array.isArray(names) || names.length > 6 || names.some(name => typeof name !== "string" || !/^(?:aria-[a-z-]+|data-[a-z-]+|class|id|role|disabled)$/u.test(name))) observerFail("attribute_selection_invalid");
  return names;
};

/** Small injectable boundary; production callers use connectDevelopmentObserver. */
export async function createBoundDevelopmentObserver(program, receipt, { verify, operationTimeoutMs = 5000, onDisconnect = () => {} } = {}) {
  const deadlineMs = timeout(operationTimeoutMs);
  let closed = false, consoleEnabled = false, tail = Promise.resolve();
  const logs = [];
  const check = () => { if (closed) observerFail("disconnected_explicit_reattach_required"); };
  const remember = (kind, event) => {
    const sanitized = redactDevelopmentValue(event);
    const encoded = JSON.stringify(sanitized);
    logs.push({ kind, at: new Date().toISOString(), value: encoded.length <= 4096 ? sanitized : { summary: encoded.slice(0, 2048), truncated: true } });
    if (logs.length > 80) logs.shift();
  };
  const consoleListener = event => remember("console", event);
  const exceptionListener = event => remember("exception", event);
  const disconnect = () => {
    if (closed) return;
    closed = true;
    program.removeListener("console", consoleListener);
    program.removeListener("exception", exceptionListener);
    try { program.disconnect(); } finally { onDisconnect(); }
  };
  async function alive(full = false) {
    check();
    await verify?.(full);
    check();
  }
  function serial(operation, duration = deadlineMs) {
    const result = tail.then(async () => {
      check();
      let timer;
      try {
        return await Promise.race([
          operation(),
          new Promise((_, reject) => { timer = setTimeout(() => {
            try { disconnect(); } catch {}
            reject(new Error("development_observer_operation_deadline"));
          }, duration); }),
        ]);
      } catch (error) {
        const message = String(error?.message ?? error);
        if (/closed|deadline|disconnect|owner_or_project_changed|session_identity_changed/iu.test(message)) { try { disconnect(); } catch {} }
        if (/^development_observer_[a-z_]+$/u.test(message)) throw error;
        const failure = new Error("development_observer_operation_failed_" + hash(message).slice(0, 16));
        failure.diagnostic = redactDevelopmentValue(message);
        throw failure;
      } finally { clearTimeout(timer); }
    });
    tail = result.catch(() => {});
    return result;
  }
  async function currentPage(expected) {
    check();
    const page = await program.currentPage();
    check();
    if (!page || (expected && pagePath(page.path) !== pagePath(expected))) observerFail("expected_page_not_active");
    return page;
  }
  async function query(specs, expectedPage) {
    if (!Array.isArray(specs) || specs.length < 1 || specs.length > 8) observerFail("bounded_selectors_required");
    for (const spec of specs) { selector(spec.selector); attributes(spec.attributes); }
    const page = await currentPage(expectedPage);
    let count = 0;
    const elements = await Promise.all(specs.map(async spec => {
      const matches = await page.$$(spec.selector);
      check();
      if (!Array.isArray(matches) || matches.length > 8 || (count += matches.length) > 32) observerFail("selection_too_broad");
      const values = await Promise.all(matches.map(async element => {
        const pairs = await Promise.all(attributes(spec.attributes).map(async name => [name, redactDevelopmentValue(await element.attribute(name))]));
        return { ...(spec.text ? { text: redactDevelopmentValue(await element.text()) } : {}),
          ...(spec.size ? { size: await element.size() } : {}), attributes: Object.fromEntries(pairs) };
      }));
      return { selector: spec.selector, count: matches.length, elements: values };
    }));
    const after = await currentPage(expectedPage);
    if (after !== page) observerFail("page_changed_during_read");
    return { scope: "development_observation", path: page.path, elements };
  }
  async function unique(expectedPage, select) {
    if (!expectedPage) observerFail("expected_page_required_for_action");
    const page = await currentPage(expectedPage);
    const elements = await page.$$(selector(select));
    if (!Array.isArray(elements) || elements.length !== 1) observerFail("action_selector_not_unique");
    if (await currentPage(expectedPage) !== page) observerFail("page_changed_before_action");
    check();
    return elements[0];
  }
  async function nativeLayout(selectors, expectedPage) {
      if (!expectedPage) observerFail("expected_page_required_for_layout");
      if (!Array.isArray(selectors) || selectors.length < 1 || selectors.length > 8) observerFail("bounded_selectors_required");
      selectors.forEach(selector);
      await alive(); const page = await currentPage(expectedPage);
      // Explicit native read; no Page.* query or synthesized event-handler call.
      const result = await program.evaluate(function (selections, expected) {
        const pages = getCurrentPages(), active = pages[pages.length - 1];
        if (!active || active.route !== expected) return { error: "expected_page_not_active" };
        return new Promise(resolve => {
          const query = wx.createSelectorQuery();
          for (const selection of selections) query.selectAll(selection).boundingClientRect();
          query.exec(groups => {
            const now = getCurrentPages();
            if (now[now.length - 1] !== active) return resolve({ error: "page_changed_during_read" });
            if (!Array.isArray(groups) || groups.length !== selections.length ||
                groups.some(group => !Array.isArray(group) || group.length > 8) ||
                groups.reduce((sum, group) => sum + group.length, 0) > 32) return resolve({ error: "selection_too_broad" });
            resolve({ elements: groups.map((group, index) => ({ selector: selections[index], count: group.length,
              elements: group.map(rect => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })) })) });
          });
        });
      }, selectors, pagePath(expectedPage));
      check();
      if (result?.error) observerFail(result.error);
      if (await currentPage(expectedPage) !== page) observerFail("page_changed_during_read");
      return { scope: "development_observation", method: "native_selector_query", path: page.path, elements: result.elements };
  }
  // Avoid MiniProgram.on('console')'s unobserved enableLog promise. Logging is
  // optional: an unavailable log service must not prevent layout/screenshots.
  EventEmitter.prototype.on.call(program, "console", consoleListener);
  EventEmitter.prototype.on.call(program, "exception", exceptionListener);
  return {
    enableConsole: () => serial(async () => {
      await alive();
      if (!consoleEnabled) { await program.connection.send("App.enableLog"); check(); consoleEnabled = true; }
      return { scope: "development_observation", consoleEnabled };
    }),
    status: () => serial(async () => { await alive(true); const page = await program.currentPage(); check(); return { scope: "development_observation", connected: true, project: receipt.projectPath, port: receipt.port, path: page?.path ?? null }; }, Math.max(deadlineMs, 10_000)),
    snapshot: (specs, { expectedPage } = {}) => serial(async () => { await alive(); return query(specs, expectedPage); }),
    layout: (selectors, { expectedPage } = {}) => serial(() => nativeLayout(selectors, expectedPage)),
    waitFor: ({ selector: select, attribute, equals, minimum = 1, expectedPage, timeoutMs = 10_000, read = "elements", minimumWidth = 0, minimumHeight = 0 }) => {
      selector(select); if (attribute) attributes([attribute]);
      if (!Number.isInteger(minimum) || minimum < 0 || minimum > 8) observerFail("condition_invalid");
      if (!["elements", "layout"].includes(read) ||
          ![minimumWidth, minimumHeight].every(value => Number.isFinite(value) && value >= 0 && value <= 10000) ||
          (read === "layout" && (attribute || !expectedPage)) ||
          (read === "elements" && (minimumWidth || minimumHeight))) observerFail("condition_invalid");
      const duration = timeout(timeoutMs);
      return serial(async () => {
        await alive(); const deadline = Date.now() + duration;
        while (Date.now() < deadline) {
          check();
          try {
            const result = read === "layout" ? await nativeLayout([select], expectedPage) :
              await query([{ selector: select, ...(attribute ? { attributes: [attribute] } : {}) }], expectedPage);
            const match = result.elements[0];
            const matches = read === "layout" ? match.elements.filter(element => element.width >= minimumWidth && element.height >= minimumHeight).length : match.count;
            if (matches >= minimum && (!attribute || match.elements.some(element => element.attributes[attribute] === equals))) return result;
          } catch (error) { if (error?.message !== "development_observer_expected_page_not_active") throw error; }
          await new Promise(resolve => setTimeout(resolve, Math.min(100, Math.max(1, deadline - Date.now()))));
        }
        observerFail("condition_timeout");
      }, duration + 100);
    },
    tap: (select, { expectedPage } = {}) => serial(async () => { await alive(); const element = await unique(expectedPage, select); await element.tap(); return { scope: "development_observation", action: "tap", completed: true }; }),
    input: (select, value, { expectedPage } = {}) => serial(async () => {
      if (typeof value !== "string" || value.length > 2000) observerFail("input_out_of_bounds");
      await alive(); const element = await unique(expectedPage, select);
      if (typeof element.input !== "function") observerFail("element_not_input");
      await element.input(value); return { scope: "development_observation", action: "input", completed: true };
    }),
    navigateTo: route => serial(async () => {
      if (typeof route !== "string" || !/^\/[a-zA-Z0-9_/-]+(?:\?[^\r\n]*)?$/u.test(route) || route.length > 2000) observerFail("local_route_required");
      await alive(); check(); await program.navigateTo(route);
      return { scope: "development_observation", action: "navigateTo", completed: true };
    }),
    screenshot: (outputPath, { expectedPage } = {}) => serial(async () => {
      if (!path.isAbsolute(outputPath ?? "") || path.extname(outputPath).toLowerCase() !== ".png") observerFail("absolute_png_path_required");
      await alive(); const page = await currentPage(expectedPage);
      const base64 = await program.screenshot();
      check(); if (await currentPage(expectedPage) !== page) observerFail("page_changed_during_screenshot");
      if (typeof base64 !== "string" || base64.length > 16 * 1024 * 1024) observerFail("screenshot_size_invalid");
      const bytes = Buffer.from(base64, "base64");
      if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) observerFail("screenshot_not_png");
      await mkdir(path.dirname(outputPath), { recursive: true }); check();
      await writeFile(outputPath, bytes, { flag: "wx", mode: 0o600 });
      return { scope: "development_observation", path: outputPath, bytes: bytes.length };
    }),
    console: () => logs.map(item => ({ ...item })),
    disconnect,
  };
}

export async function connectDevelopmentObserver({ projectPath, automationPort, timeoutMs = 5000, receiptFile = observerReceiptPath(projectPath) }, dependencies = {}) {
  automationPort = validAutomationPort(automationPort); timeout(timeoutMs);
  if (/(?:automator|\*)/iu.test(process.env.DEBUG ?? "")) observerFail("protocol_debug_logging_must_be_disabled");
  const verify = dependencies.validateReceipt ?? validateObserverReceipt;
  const receipt = await verify(projectPath, automationPort, { receiptFile });
  if (activeObservers.has(receipt.id)) return activeObservers.get(receipt.id);
  if (connectingObservers.has(receipt.id)) return connectingObservers.get(receipt.id);
  const connecting = (async () => {
  const sdk = dependencies.automator ?? (await import("miniprogram-automator")).default;
  let program;
  try {
    if (typeof sdk.launcher?.connectTool !== "function") observerFail("official_sdk_connection_unsupported");
    program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: `ws://127.0.0.1:${automationPort}` }), timeoutMs);
    boundWechatProtocol(program, timeoutMs);
    await program.checkVersion();
    const after = await verify(projectPath, automationPort, { receiptFile });
    if (after.id !== receipt.id) observerFail("session_identity_changed");
    const observer = await createBoundDevelopmentObserver(program, receipt, {
      operationTimeoutMs: timeoutMs,
      onDisconnect: () => activeObservers.delete(receipt.id),
      verify: async full => {
        if (full) { const current = await verify(projectPath, automationPort, { receiptFile }); if (current.id !== receipt.id) observerFail("session_identity_changed"); }
        else {
          try {
            const current = JSON.parse(await readFile(receiptFile, "utf8"));
            if (current.id !== receipt.id || current.phase !== "ready") observerFail("session_identity_changed");
            process.kill(receipt.owner.pid, 0);
            if (hash(await readFile(path.join(projectPath, "project.config.json"))) !== receipt.configSha256) observerFail("session_identity_changed");
          } catch { observerFail("session_identity_changed"); }
        }
      },
    });
    activeObservers.set(receipt.id, observer);
    return observer;
  } catch (error) {
    try { program?.disconnect(); } catch {}
    if (/^development_observer_[a-z_]+$/u.test(String(error?.message))) throw error;
    const message = String(error?.message ?? error);
    const failure = new Error("development_observer_connect_failed_" + hash(message).slice(0, 16));
    failure.diagnostic = redactDevelopmentValue(message);
    throw failure;
  }
  })();
  connectingObservers.set(receipt.id, connecting);
  try { return await connecting; } finally { connectingObservers.delete(receipt.id); }
}

export async function observerCli(argv) {
  if (argv.includes('--official-ide')) {
    const { officialObserverCli } = await import('./development-official.mjs');
    return officialObserverCli(argv);
  }
  const command = argv[0];
  if (!command || command === "--help") {
    // Official mode shares this entrypoint; detailed flags live beside it.
    const official = "status|text|tap|input|console|network|screenshot --official-ide <absolute installation> --project <absolute project>; see tools/miniapp/development-observer.md";
    return { official, commands: ["status", "layout", "snapshot", "wait", "screenshot"], usage: "miniapp:observe <command> --project <absolute project> --automation-port <owned port> [--selector <stable selector>] [--attribute <attribute> --equals <value>] [--output <absolute png>]", persistent: "import { connectDevelopmentObserver } from tools/miniapp/development-observer.mjs; retain the returned observer between calls" };
  }
  if (!["status", "layout", "snapshot", "wait", "screenshot"].includes(command)) observerFail("unknown_command");
  const values = new Map(), selectors = [];
  for (let i = 1; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1];
    if (!value || !["--project", "--automation-port", "--selector", "--attribute", "--equals", "--output", "--expected-page"].includes(key)) observerFail("invalid_cli_option");
    if (key === "--selector") selectors.push(value); else values.set(key, value);
  }
  const projectPath = values.get("--project");
  if (!path.isAbsolute(projectPath ?? "")) observerFail("absolute_project_required");
  const observer = await connectDevelopmentObserver({ projectPath, automationPort: values.get("--automation-port") });
  try {
    if (command === "status") return await observer.status();
    if (command === "layout") return await observer.layout(selectors, { expectedPage: values.get("--expected-page") });
    if (command === "snapshot") return await observer.snapshot(selectors.map(select => ({ selector: select, text: true, size: true, attributes: values.has("--attribute") ? [values.get("--attribute")] : [] })), { expectedPage: values.get("--expected-page") });
    if (command === "wait") return await observer.waitFor({ selector: selectors[0], attribute: values.get("--attribute"), equals: values.get("--equals"), expectedPage: values.get("--expected-page") });
    return await observer.screenshot(values.get("--output"), { expectedPage: values.get("--expected-page") });
  } finally { observer.disconnect(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  observerCli(process.argv.slice(2)).then(result => process.stdout.write(JSON.stringify(result) + "\n"), error => {
    process.stderr.write(JSON.stringify({ error: /^development_observer_[a-z0-9_]+$/u.test(error?.message ?? "") ? error.message : "development_observer_failed", diagnostic: error.diagnostic }) + "\n");
    process.exitCode = 1;
  });
}
