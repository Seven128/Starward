import assert from "node:assert/strict";
import test from "node:test";
import {
  boundWechatProtocol,
  boundedWechatConnect,
  classifyWechatWatchers,
  watcherProjectPath,
  inputAndTapMatchingElement,
  waitForCurrentPageReady,
  waitForSelector,
  waitForSelectorSet,
  wechatCliCommand,
} from "./run-wechat-devtools-session.mjs";

const required = [{ selector: ".ready", minimum: 1 }];

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
