import assert from "node:assert/strict";
import test from "node:test";
import {
  collectionOutcome,
  assertWechatDevtoolsLoginReady,
  boundWechatProtocol,
  boundedWechatConnect,
  classifyWechatWatchers,
  watcherProjectPath,
  inputAndTapMatchingElement,
  isTransientPageObservationError,
  performTouchSequence,
  validateSkySceneInspection,
  openNeutralAcceptancePage,
  waitForCurrentPageReady,
  waitForSelector,
  waitForSelectorSet,
  wechatCliCommand,
  wechatIdeSkillAuthenticationFlags,
  wechatToolEnvironment,
  verifyWechatProcessEnvironment,
  verifyWechatWorkspaceLocation,
  waitForRequestDiagnosticSubsequence,
} from "./run-wechat-devtools-session.mjs";

const required = [{ selector: ".ready", minimum: 1 }];

test("collector outcome reports automated collection without a product verdict", () => {
  assert.deepEqual(collectionOutcome(true), { status: "collected", collection_status: "passed" });
  assert.deepEqual(collectionOutcome(false), { status: "failed", collection_status: "failed" });
});

test("official WechatIDE skill token stays explicit, bounded and out of evidence defaults", () => {
  assert.deepEqual(
    wechatIdeSkillAuthenticationFlags({ environment: {} }),
    [],
  );
  assert.deepEqual(
    wechatIdeSkillAuthenticationFlags({
      environment: {
        STARWARD_WECHATIDE_MCP_TOKEN: "synthetic_token_1234567890",
      },
    }),
    ["--token synthetic_token_1234567890"],
  );
  assert.throws(
    () =>
      wechatIdeSkillAuthenticationFlags({
        environment: { STARWARD_WECHATIDE_MCP_TOKEN: "unsafe token" },
      }),
    /wechatide_mcp_token_invalid/u,
  );
});

test("sky scene readback accepts the current Hipparcos owner and rejects unrelated catalogs", () => {
  const current = {
    state: "READY",
    spotId: "spot:test",
    frameAt: "2026-09-11T13:00:00Z",
    catalogVersion: "hipparcos-bright-stars.v1",
    starCount: 798,
    drawRevision: 1,
  };
  assert.equal(validateSkySceneInspection(current), true);
  assert.equal(validateSkySceneInspection({ ...current, catalogVersion: "fixture-stars.v1" }), false);
  assert.equal(validateSkySceneInspection({ ...current, state: "UNAVAILABLE" }), false);
});

test("native touch sequences preserve two-touch identity and element-relative geometry", async () => {
  const events = [];
  const control = {
    async size() { return { width: 200, height: 400 }; },
    async offset() { return { left: 10, top: 20 }; },
    async touchstart(value) { events.push(["start", value]); },
    async touchmove(value) { events.push(["move", value]); },
    async touchend(value) { events.push(["end", value]); },
  };
  const observation = await performTouchSequence(control, [{
    start: [{ x: 0.4, y: 0.5 }, { x: 0.6, y: 0.5 }],
    moves: [[{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }]],
  }]);
  assert.deepEqual(observation, {
    gesture_count: 1,
    touch_count_maximum: 2,
    element_width: 200,
    element_height: 400,
  });
  assert.deepEqual(events.map(([kind]) => kind), ["start", "move", "end"]);
  assert.deepEqual(events[0][1].touches.map(({ identifier, clientX, clientY }) => ({ identifier, clientX, clientY })), [
    { identifier: 0, clientX: 90, clientY: 220 },
    { identifier: 1, clientX: 130, clientY: 220 },
  ]);
  assert.deepEqual(events[2][1].touches, []);
  assert.equal(events[2][1].changeTouches.length, 2);
});

test("request diagnostic wait requires the declared ordered subsequence", async () => {
  let reads = 0;
  const expected = [
    { key: "deep-sky-image:M:31:OVERVIEW", event: "start" },
    { key: "deep-sky-image:M:31:OVERVIEW", event: "cancel" },
    { key: "deep-sky-image:M:31:MEDIUM", event: "start" },
  ];
  const complete = [
    { sequence: 1, ...expected[0], detail: "request" },
    { sequence: 2, key: "another-owner", event: "success", detail: "ignored" },
    { sequence: 3, ...expected[1], detail: "superseded_or_unmounted" },
    { sequence: 4, ...expected[2], detail: "request" },
  ];
  const observed = await waitForRequestDiagnosticSubsequence({
    async callWxMethod() { reads += 1; return reads === 1 ? complete.slice(0, 2) : complete; },
  }, expected, 2_000);
  assert.deepEqual(observed, complete);
  assert.equal(reads, 2);
});

test("native workspace admits only the physical canonical checkout", async () => {
  const canonicalRoot = "D:\\dev\\Starward";
  const verify = (workspaceRoot, physicalRoot = workspaceRoot) =>
    verifyWechatWorkspaceLocation({
      platform: "win32",
      workspaceRoot,
      resolveRealPath: async () => physicalRoot,
    });
  const location = await verify("d:/DEV/STARWARD/", `\\\\?\\${canonicalRoot}`);
  assert.equal(location.status, "passed");
  assert.equal(location.mode, "canonical_workspace");
  assert.equal(location.root_path_sha256, location.physical_path_sha256);
  assert.equal(location.direct_physical_path, true);
  for (const copiedRoot of [
    "D:\\dev\\Starward-copy",
    "D:\\dev\\worktrees\\Starward\\candidate",
    "D:\\dev\\.starward-tmp\\run-012345abcdef\\ty-context-candidate",
  ]) {
    await assert.rejects(verify(copiedRoot), /wechat_canonical_workspace_required/u);
  }
  await assert.rejects(
    verify(canonicalRoot, "D:\\dev\\another-checkout"),
    /wechat_workspace_location_must_be_physical/u,
  );
  await assert.rejects(
    verify("Z:\\", canonicalRoot),
    /wechat_workspace_location_must_be_physical/u,
  );
  await assert.rejects(
    verifyWechatWorkspaceLocation({ platform: "linux" }),
    /wechat_workspace_location_requires_windows/u,
  );
});

test("DevTools temp remains a physical directory outside candidate and reserved run roots", async () => {
  const systemTemp = "C:\\Users\\test\\AppData\\Local\\Temp";
  const verify = (processTemp, physicalRoot = processTemp, directory = true) =>
    verifyWechatProcessEnvironment({
      processTemp,
      resolveRealPath: async () => physicalRoot,
      statPath: async () => ({ isDirectory: () => directory }),
    });
  assert.equal((await verify(systemTemp)).status, "passed");
  await assert.rejects(verify(null), /wechat_process_temp_environment_missing/u);
  await assert.rejects(
    verify(systemTemp, systemTemp, false),
    /wechat_process_temp_environment_not_directory/u,
  );
  await assert.rejects(
    verify(systemTemp, "E:\\redirected-temp"),
    /wechat_process_temp_environment_must_be_physical/u,
  );
  for (const overlappingTemp of [
    "D:\\dev\\Starward",
    "D:\\dev\\Starward\\tmp",
    "D:\\dev\\.starward-tmp",
    "D:\\dev\\.starward-tmp\\run-012345abcdef",
  ]) {
    await assert.rejects(
      verify(overlappingTemp),
      /wechat_process_temp_must_be_outside_candidate_and_run_roots/u,
    );
  }
  assert.equal((await verify("D:\\dev\\Starward-other\\temp")).status, "passed");
});

test("DevTools child environment binds both temp variables without changing the parent", () => {
  const environment = { TEMP: "run-temp", TMP: "other-run-temp", PATH: "tool-bin" };
  const processTemp = "C:\\Users\\test\\AppData\\Local\\Temp";
  assert.deepEqual(wechatToolEnvironment({ environment, processTemp }), {
    TEMP: processTemp,
    TMP: processTemp,
    PATH: "tool-bin",
  });
  assert.deepEqual(environment, { TEMP: "run-temp", TMP: "other-run-temp", PATH: "tool-bin" });
});

test("protocol deadline disposes once and rejects concurrent, late and subsequent requests", async () => {
  let disposeCount = 0;
  let sends = 0;
  let lateResolve;
  const connection = {
    send() {
      assert.equal(this, connection);
      sends++;
      return new Promise((resolve) => { lateResolve = resolve; });
    },
    dispose() { disposeCount++; },
  };
  boundWechatProtocol({ connection }, 20);
  const results = await Promise.allSettled([
    connection.send("Page.query", { sensitive: "not-in-error" }),
    connection.send("Page.other"),
  ]);
  assert.ok(results.every((result) => result.status === "rejected"));
  assert.match(results[0].reason.message, /^wechat_protocol_request_deadline:[a-f0-9]{64}$/);
  assert.equal(results[0].reason, results[1].reason);
  lateResolve("cannot rescue timeout");
  await assert.rejects(connection.send("Page.next"), /wechat_protocol_request_deadline/);
  assert.equal(disposeCount, 1);
  assert.equal(sends, 2);
});

test("bounded protocol preserves actual success and rejection including undefined", async () => {
  let disposed = false;
  const connection = {
    send(method) {
      if (method === "reject") return Promise.reject(undefined);
      if (method === "throw") throw new Error("sync failure");
      return Promise.resolve({ actual: method });
    },
    dispose() { disposed = true; },
  };
  boundWechatProtocol({ connection }, 20);
  assert.deepEqual(await connection.send("ok"), { actual: "ok" });
  assert.equal((await Promise.allSettled([connection.send("reject")]))[0].status, "rejected");
  await assert.rejects(connection.send("throw"), /sync failure/);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(disposed, false);
  assert.throws(() => boundWechatProtocol({}), /shape_unsupported/);
});

test("connection establishment deadline discards a late client and preserves prompt results", async () => {
  let resolveConnection;
  let disposed = 0;
  await assert.rejects(boundedWechatConnect(() => new Promise((resolve) => {
    resolveConnection = resolve;
  }), 20), /connection_establishment_deadline/);
  resolveConnection({ disconnect() { disposed++; } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(disposed, 1);
  const client = { disconnect() { throw new Error("should stay open"); } };
  assert.equal(await boundedWechatConnect(async () => client, 20), client);
});

test("watcher classification admits exact internal paths without waiving candidate presence", () => {
  const candidate = "E:\\Dev\\Starward\\apps\\wechat-miniapp";
  const internal = "C:\\Users\\test\\AppData\\Local\\微信开发者工具\\User Data\\0123456789abcdef0123456789abcdef\\WeappLocalData";
  const classify = (projects, processCount = projects.length) =>
    classifyWechatWatchers({ projects, processCount }, candidate, [internal]);
  assert.deepEqual(classify([candidate, internal, internal]), {
    candidateCount: 1, internalCount: 2, unknownCount: 0, bound: true,
  });
  assert.equal(classify([candidate.toUpperCase()]).bound, true);
  for (const projects of [
    [], [internal], [candidate, "E:\\OtherProject"],
    [candidate, `${internal}\\nested`], [candidate, `${internal}-fake`],
  ]) assert.equal(classify(projects).bound, false);
  assert.equal(classify([candidate], 2).bound, false, "unparsed watcher must fail");
  assert.equal(watcherProjectPath(`"C:\\tools\\wxfilewatcher_x64.exe" "${internal}"`), internal);
  assert.equal(watcherProjectPath(`wxfilewatcher_x64.exe "${candidate}" --unexpected`), null);
});

test("native launch and quit preserve the resolved official CLI and fixed port", () => {
  for (const invocation of [
    { file: "installed-node.exe", prefix: ["installed-cli.js"] },
    { file: "installed-electron.exe", prefix: ["-e", "bootstrap", "entry.js"], cwd: "installation", env: { ELECTRON_RUN_AS_NODE: "1" } },
  ]) {
    const launchArgs = ["auto", "--project", "project with spaces", "--auto-port", "9420", "--trust-project"];
    for (const args of [launchArgs, ["quit"]]) {
      const command = wechatCliCommand(invocation, args, { TEMP: "owned-temp" });
      assert.equal(command.file, invocation.file);
      assert.deepEqual(command.args, [...invocation.prefix, ...args, "--port", "23977"]);
      assert.equal(command.options.shell, false);
      assert.equal(command.options.windowsHide, true);
      assert.equal(command.options.env.TEMP, "owned-temp");
      assert.equal(command.options.env.ELECTRON_RUN_AS_NODE, invocation.env?.ELECTRON_RUN_AS_NODE);
      assert.ok(command.options.env.cwd);
      if (invocation.cwd) assert.equal(command.options.cwd, invocation.cwd);
    }
  }
  assert.throws(() => wechatCliCommand(null, ["auto"], {}), /wechat_official_cli_not_resolved/);
});

test("native acceptance fails fast when the official CLI login is unavailable", () => {
  const invocation = { file: "installed-node.exe", prefix: ["installed-cli.js"] };
  const run = (_file, args) => {
    assert.deepEqual(args, ["installed-cli.js", "islogin", "--lang", "zh"]);
    return { status: 0, stdout: 'progress\n{"login":true}\ndone\n' };
  };
  assert.deepEqual(assertWechatDevtoolsLoginReady(invocation, run), {
    status: "passed",
    login: "ready",
  });
  assert.throws(
    () => assertWechatDevtoolsLoginReady(invocation, () => ({
      status: 0,
      stdout: '{"login":false}\n',
    })),
    /wechat_devtools_login_required/u,
  );
  assert.throws(
    () => assertWechatDevtoolsLoginReady(invocation, () => ({
      status: 0,
      stdout: "progress only",
    })),
    /wechat_devtools_login_check_unreadable/u,
  );
});

test("acceptance reset reuses an already neutral auth page", async () => {
  const authPage = page("auth", "pages/auth/index", {
    ".permission-page": [{}],
  });
  let relaunches = 0;
  const miniProgram = {
    async currentPage() { return authPage; },
    async reLaunch() { relaunches += 1; throw new Error("must not relaunch"); },
  };
  assert.equal(await openNeutralAcceptancePage(miniProgram), authPage);
  assert.equal(relaunches, 0);
});

test("acceptance reset prefers the current structured WeChat IDE navigation", async () => {
  const mapPage = page("map", "pages/map/index", { ".map-page": [{}] });
  const authPage = page("auth", "pages/auth/index", {
    ".permission-page": [{}],
  });
  let current = mapPage;
  const externalCalls = [];
  const miniProgram = {
    async currentPage() { return current; },
    async reLaunch() { throw new Error("legacy navigation must not run"); },
  };
  const result = await openNeutralAcceptancePage(
    miniProgram,
    "structured-reset",
    async (action, url) => {
      externalCalls.push([action, url]);
      current = authPage;
    },
  );
  assert.equal(result, authPage);
  assert.deepEqual(externalCalls, [["reLaunch", "/pages/auth/index"]]);
});

test("acceptance reset confirms target state after an opaque startup relaunch", async () => {
  const mapPage = page("map", "pages/map/index", { ".map-page": [{}] });
  const authPage = page("auth", "pages/auth/index", {
    ".permission-page": [{}],
  });
  let current = mapPage;
  let relaunches = 0;
  const miniProgram = {
    async currentPage() { return current; },
    async reLaunch() {
      relaunches += 1;
      current = authPage;
      throw new Error("Uncaught [object Object]");
    },
  };
  assert.equal(await openNeutralAcceptancePage(miniProgram), authPage);
  assert.equal(relaunches, 1);
});

test("acceptance reset observes a completed relaunch when automator returns no page handle", async () => {
  const mapPage = page("map", "pages/map/index", { ".map-page": [{}] });
  const authPage = page("auth", "pages/auth/index", {
    ".permission-page": [{}],
  });
  let current = mapPage;
  let relaunches = 0;
  const miniProgram = {
    async currentPage() { return current; },
    async reLaunch() {
      relaunches += 1;
      current = authPage;
      return undefined;
    },
  };
  assert.equal(await openNeutralAcceptancePage(miniProgram), authPage);
  assert.equal(relaunches, 1);
});

test("acceptance reset falls back to redirect when relaunch stays on the source page", async () => {
  const mapPage = page("map", "pages/map/index", { ".map-page": [{}] });
  const authPage = page("auth", "pages/auth/index", {
    ".permission-page": [{}],
  });
  let current = mapPage;
  let relaunches = 0;
  let redirects = 0;
  const miniProgram = {
    async currentPage() { return current; },
    async reLaunch() {
      relaunches += 1;
      throw new Error("Uncaught [object Object]");
    },
    async redirectTo() {
      redirects += 1;
      current = authPage;
      return authPage;
    },
  };
  assert.equal(await openNeutralAcceptancePage(miniProgram), authPage);
  assert.equal(relaunches, 2);
  assert.equal(redirects, 1);
});

test("acceptance reset can rebuild a main-package stack through the map tab", async () => {
  const sourcePage = page("source", "content/settings/index", {
    ".settings-page": [{}],
  });
  const mapPage = page("map", "pages/map/index");
  const authPage = page("auth", "pages/auth/index", {
    ".permission-page": [{}],
  });
  let current = sourcePage;
  let switches = 0;
  let navigations = 0;
  const opaque = async () => { throw new Error("Uncaught [object Object]"); };
  const miniProgram = {
    async currentPage() { return current; },
    reLaunch: opaque,
    redirectTo: opaque,
    async switchTab() { switches += 1; current = mapPage; return mapPage; },
    async navigateTo() { navigations += 1; current = authPage; return authPage; },
  };
  assert.equal(await openNeutralAcceptancePage(miniProgram), authPage);
  assert.equal(switches, 1);
  assert.equal(navigations, 1);
});

test("navigation before a matching candidate tap cannot prove selection", async () => {
  const input = { async tap() {}, async input() {} };
  const source = page("source", "spot/search/index", { ".input": [input] });
  const destination = page("destination", "pages/map/index");
  let reads = 0;
  const miniProgram = {
    async currentPage() { return reads++ === 0 ? source : destination; },
  };
  await assert.rejects(
    inputAndTapMatchingElement(source, miniProgram, {
      input: ".input", candidates: ".candidate", value: "query",
      textIncludes: "formal spot", expectedPath: "pages/map/index",
    }, 1000),
    /native_atomic_selection_source_path_changed/,
  );
});

function page(id, path, selectors = {}, options = {}) {
  return {
    id,
    path,
    async $$(selector) {
      if (options.queryError && selector === options.queryError.selector)
        throw options.queryError.error;
      const result = selectors[selector];
      if (typeof result === "function") return result();
      return result ?? [];
    },
  };
}

test("current-page readiness rebinds after page churn and requires stable full selectors", async () => {
  let currentPageCalls = 0;
  const stalePage = page("old", "pages/map/index", {
    ".ready": [],
  });
  const settledPage = page("new", "pages/map/index", {
    ".ready": [{}],
  });
  const miniProgram = {
    async currentPage() {
      currentPageCalls += 1;
      return currentPageCalls === 1 ? stalePage : settledPage;
    },
  };

  const observed = await waitForCurrentPageReady(
    miniProgram,
    "pages/map/index",
    required,
    3_000,
    2,
  );

  assert.equal(observed, settledPage);
  assert.ok(currentPageCalls >= 3);
});

test("selector waits fail on non-transient query errors instead of treating them as absence", async () => {
  const queryError = new Error("backend query exploded");
  const failingPage = page(
    "page",
    "content/import/index",
    {},
    { queryError: { selector: ".required", error: queryError } },
  );

  await assert.rejects(
    waitForSelector(failingPage, ".required", 1, 500),
    (error) =>
      error instanceof Error &&
      /^native_page_observation_failed:selector-wait:/u.test(error.message),
  );
});

test("the exact miniprogram-automator stale Page xpath failure is transient", () => {
  assert.equal(
    isTransientPageObservationError(
      new TypeError("Cannot read properties of undefined (reading 'map')"),
    ),
    true,
  );
  assert.equal(
    isTransientPageObservationError(
      new TypeError("Cannot read properties of undefined (reading 'filter')"),
    ),
    false,
  );
});

test("selector waits retry a bounded protocol deadline during DevTools page startup", async () => {
  let reads = 0;
  const startingPage = page("page", "pages/auth/index", {
    ".permission-page": () => {
      reads += 1;
      if (reads === 1)
        throw new Error("wechat_protocol_request_deadline:opaque-diagnostic");
      return [{}];
    },
  });

  const elements = await waitForSelector(
    startingPage,
    ".permission-page",
    1,
    2_000,
  );
  assert.equal(elements.length, 1);
  assert.equal(reads, 2);
});

test("NightChina matching selection queries the current source page on every poll", async () => {
  let currentPageCalls = 0;
  let navigated = false;
  let stalePageCandidateQueries = 0;
  const input = {
    async tap() {},
    async input() {},
  };
  const candidate = {
    async text() {
      return "正式观星点";
    },
    async tap() {
      navigated = true;
    },
  };
  const staleSourcePage = page("source-old", "spot/search/index", {
    ".spot-search-field__input": [input],
    ".spot-search-suggestion": () => {
      stalePageCandidateQueries += 1;
      throw new Error("stale page handle");
    },
  });
  const currentSourcePage = page("source-new", "spot/search/index", {
    ".spot-search-field__input": [input],
    ".spot-search-suggestion": [candidate],
  });
  const destinationPage = page("destination", "pages/map/index", {
    ".ready": [{}],
  });
  const miniProgram = {
    async currentPage() {
      currentPageCalls += 1;
      if (navigated) return destinationPage;
      return currentPageCalls === 1 ? staleSourcePage : currentSourcePage;
    },
  };

  const selected = await inputAndTapMatchingElement(
    staleSourcePage,
    miniProgram,
    {
      input: ".spot-search-field__input",
      candidates: ".spot-search-suggestion",
      textIncludes: "正式观星点",
      expectedPath: "pages/map/index",
      routeWaitMs: 2_000,
    },
    3_000,
  );

  assert.equal(selected.page, destinationPage);
  assert.equal(stalePageCandidateQueries, 0);
  assert.ok(currentPageCalls >= 4);
});

test("a selector set is observed on consecutive reads before it is ready", async () => {
  let reads = 0;
  const churnedPage = page("page", "pages/map/index", {
    ".one": () => [{}],
    ".two": () => (reads++ === 0 ? [] : [{}]),
  });

  const ready = await waitForSelectorSet(
    churnedPage,
    [
      { selector: ".one", minimum: 1 },
      { selector: ".two", minimum: 1 },
    ],
    3_000,
    2,
  );

  assert.equal(ready, true);
  assert.ok(reads >= 2);
});
