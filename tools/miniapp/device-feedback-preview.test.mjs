import test from "node:test";
import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  OfficialWechatDevtools,
  assertOfficialOutcomeResolved,
  classifyOfficialPreviewResult,
  invokeOfficial,
  parseOfficialLoginState,
  resolveOfficialCli,
} from "./device-feedback-official.mjs";
import {
  loadFeedbackRun,
  recordOfficialTaskResult,
  stopFeedbackRun,
  withFeedbackRun,
} from "./device-feedback-session.mjs";
import { main } from "./device-feedback.mjs";

const testAppId = ["wx", "1234567890abcdef"].join("");

async function fixture(t) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "starward-feedback-preview-source-"),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, "weapp", "pages", "index"), {
    recursive: true,
  });
  await writeFile(
    path.join(directory, "project.config.json"),
    `${JSON.stringify({
      compileType: "miniprogram",
      appid: testAppId,
      miniprogramRoot: "weapp/",
    })}\n`,
  );
  await writeFile(
    path.join(directory, "weapp", "app.json"),
    '{"pages":["pages/index/index"]}\n',
  );
  await writeFile(
    path.join(directory, "weapp", "pages", "index", "index.js"),
    'Page({data:{label:"A"}});\n',
  );
  return directory;
}

function officialDriver({ automaticFailure = true } = {}) {
  const calls = [];
  return {
    calls,
    autoPreview: async () => {
      if (automaticFailure)
        return { success: false, status: "failed", message: "redacted automatic failure" };
      return { success: true };
    },
    preview: async (project, qrOutput, infoOutput, port) => {
      calls.push({ project, qrOutput, infoOutput, port });
      const header = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      await writeFile(qrOutput, Buffer.concat([header, Buffer.alloc(120)]));
      await writeFile(infoOutput, "private preview material");
      return { success: true };
    },
  };
}

test("official readiness probes automatic and ordinary preview independently", async () => {
  const calls = [];
  const driver = new OfficialWechatDevtools(
    { file: "official", prefix: [] },
    async (_file, args) => {
      calls.push(args);
      if (args[0] === "auto-preview") throw new Error("unavailable");
      if (args[0] === "islogin") return Buffer.from('{"login":true}\n');
      return Buffer.alloc(0);
    },
  );
  assert.deepEqual(await driver.doctor(), {
    officialTool: "available",
    automaticUpdate: "unavailable",
    ordinaryPreview: "available",
    login: "ready",
  });
  assert.deepEqual(
    calls.map((args) => args[0]),
    ["auto-preview", "preview", "islogin"],
  );
});

test("official login parsing tolerates current CLI progress output", () => {
  assert.equal(
    parseOfficialLoginState(Buffer.from('starting\n{"login":true}\nfinished\n')),
    "ready",
  );
  assert.equal(
    parseOfficialLoginState('progress\n{"login":false}\n'),
    "required",
  );
  assert.equal(parseOfficialLoginState("progress only"), "unknown");
});

test("current official push retains business success or task identity without a legacy replay", async () => {
  const current = { file: "current", prefix: ["skill-entry", "-c", "Codex"],
    cwd: "installation", env: { ELECTRON_RUN_AS_NODE: "1" } };
  for (const value of [
    { success: true },
    { status: "pending", taskId: "original-task", taskType: "preview" },
    { status: "unrecognized" },
  ]) {
    const calls = [], output = Buffer.from(JSON.stringify({ ok: true, result: { structuredContent: value } }));
    const driver = new OfficialWechatDevtools({ file: "legacy", prefix: [],
      autoPreviewInvocation: current }, async (file, args, options) => {
      calls.push({ file, args, options }); return output;
    });
    const result = await driver.autoPreview("prepared-project", "unused-private-info");
    assert.equal(result, output);
    assert.deepEqual(calls, [{ file: "current",
      args: ["skill-entry", "-c", "Codex", "auto_preview", "--project", "prepared-project"],
      options: { cwd: current.cwd, env: current.env } }]);
    assert.equal(classifyOfficialPreviewResult(result).disposition,
      value.success ? "completed" : value.taskId ? "pending" : "unknown");
  }
  let calls = 0;
  const driver = new OfficialWechatDevtools({ file: "legacy", prefix: [],
    autoPreviewInvocation: current }, async () => { calls++; throw Error("device_feedback_official_timeout"); });
  await assert.rejects(driver.autoPreview("prepared-project", "unused-private-info"), /official_timeout/);
  assert.equal(calls, 1);
  await assert.rejects(driver.autoPreview("prepared-project", "unused-private-info", 9420), /skill_port_not_supported/);
  assert.equal(calls, 1);
});

test("a pre-invocation current-tool port rejection remains recoverable", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "starward-feedback-port-rejection-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let calls = 0;
  const driver = new OfficialWechatDevtools({
    file: "legacy", prefix: [],
    autoPreviewInvocation: { file: "current", prefix: ["-c", "Codex"] },
  }, async () => { calls++; return { success: true }; });
  const result = await invokeOfficial({ directory, project: directory }, { port: 9420 }, driver);
  assert.equal(calls, 0);
  assert.equal(result.disposition, "manual_required");
  assert.equal(result.result.status, "not_invoked");
  assert.equal(assertOfficialOutcomeResolved(result).disposition, "manual_required");
});

test("official CLI rejects a legacy NW installation instead of starting its bundled Node", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "starward-wechat-node-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const name of ["cli.bat", "node.exe", "cli.js", "微信开发者工具.exe"])
    await writeFile(path.join(directory, name), "fixture");
  await mkdir(path.join(directory, "code", "package.nw"), { recursive: true });
  await writeFile(path.join(directory, "code", "package.nw", "package.json"), "{}");
  for (const name of ["cli.bat", "cli.js", "微信开发者工具.exe"])
    await assert.rejects(resolveOfficialCli(path.join(directory, name), {}), /official_cli_unavailable/);
  const nested = path.join(directory, "code", "package.nw", "js", "common", "cli", "index.js");
  await mkdir(path.dirname(nested), { recursive: true });
  await writeFile(nested, "fixture");
  await assert.rejects(resolveOfficialCli(nested, {}), /official_cli_unavailable/);
});

test("official CLI resolves the current Electron installation layout", async (t) => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "starward-wechat-electron-cli-"),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  const cli = path.join(directory, "cli.bat");
  const executable = path.join(directory, "微信开发者工具.exe");
  const entry = path.join(
    directory,
    "resources",
    "app.asar.unpacked",
    "js",
    "common",
    "cli",
    "index.js",
  );
  await mkdir(path.dirname(entry), { recursive: true });
  await Promise.all([
    writeFile(cli, "@echo off\r\n"),
    writeFile(executable, "fixture"),
    writeFile(entry, "fixture"),
  ]);
  const skillEntry = path.join(path.dirname(entry), "skill-index.js");
  await writeFile(skillEntry, "fixture");

  const invocation = await resolveOfficialCli(cli, {});
  assert.equal(invocation.file, await realpath(executable));
  assert.equal(invocation.prefix[0], "-e");
  assert.match(invocation.prefix[1], /--ms-enable-electron-run-as-node/u);
  assert.equal(invocation.prefix[2], await realpath(entry));
  assert.equal(invocation.cwd, await realpath(directory));
  assert.equal(invocation.env.cwd, process.cwd());
  assert.equal(invocation.env.ELECTRON_RUN_AS_NODE, "1");
  assert.equal(invocation.autoPreviewInvocation.file, await realpath(executable));
  assert.equal(invocation.autoPreviewInvocation.prefix[2], await realpath(skillEntry));
  assert.deepEqual(invocation.autoPreviewInvocation.prefix.slice(-2), ["-c", "Codex"]);
  const fallbackEnvironment = { PATH: directory };
  assert.equal((await resolveOfficialCli(undefined, fallbackEnvironment)).file, await realpath(executable));
  await assert.rejects(resolveOfficialCli(path.join(directory, "missing.bat"), fallbackEnvironment), /official_cli_unavailable/);
  await assert.rejects(resolveOfficialCli(undefined, { ...fallbackEnvironment,
    STARWARD_WECHAT_DEVTOOLS_CLI: path.join(directory, "missing.bat") }), /official_cli_unavailable/);
});

test("official driver forwards installation cwd and Electron environment", async () => {
  const calls = [];
  const invocation = {
    file: "official",
    prefix: ["-e", "bootstrap", "entry"],
    cwd: "official-directory",
    env: { cwd: "caller-workspace", ELECTRON_RUN_AS_NODE: "1" },
  };
  const driver = new OfficialWechatDevtools(
    invocation,
    async (_file, args, options) => {
      calls.push({ args, options });
      if (args[3] === "islogin") return Buffer.from('{"login":false}\n');
      return Buffer.alloc(0);
    },
  );
  assert.equal((await driver.doctor()).officialTool, "available");
  assert.deepEqual(
    calls.map(({ options }) => ({ cwd: options.cwd, env: options.env })),
    Array(3).fill({ cwd: invocation.cwd, env: invocation.env }),
  );
});

test("official result classification distinguishes acknowledgement, terminal result and failure", () => {
  const cases = [
    [undefined, "unknown", "unknown"],
    [Buffer.alloc(0), "unknown", "unknown"],
    [{ ok: true }, "unknown", "unknown"],
    [{ success: true }, "completed", "success"],
    [{ status: "success" }, "completed", "success"],
    [{ status: "success", success: false }, "unknown", "unknown"],
    [{ status: "unknown", success: true }, "unknown", "unknown"],
    [{ status: 123, success: true }, "unknown", "unknown"],
    [{ success: true, status: "pending", taskId: "original-task" }, "pending", "pending"],
    [{ success: true, status: "pending" }, "unknown", "pending"],
    [{ success: false }, "failed", "failed"],
    [{ status: "failed" }, "failed", "failed"],
    [{ status: "cancelled" }, "cancelled", "cancelled"],
    [{ status: "expired" }, "expired", "expired"],
    [{ ok: false, message: "private preview material" }, "error", "unknown"],
    [{ ok: true, result: { isError: true, content: [] } }, "error", "unknown"],
    [{ ok: true, result: { structuredContent: { status: "pending", taskId: "original-task" } } }, "pending", "pending"],
  ];
  for (const [input, disposition, status] of cases) {
    const actual = classifyOfficialPreviewResult(input);
    assert.equal(actual.disposition, disposition);
    assert.equal(actual.result.status, status);
    assert.doesNotMatch(JSON.stringify(actual), /private preview material|message|content/u);
  }
});

test("the default CLI driver returns its actual stdout and invokeOfficial preserves its result", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "starward-feedback-cli-result-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const generation = { directory, project: directory };
  const invocation = { file: "never-executed", prefix: [] };
  for (const [stdout, disposition] of [
    [Buffer.from('progress\n{\n"ok":true,"result":{"success":true,"status":"pending","taskId":"original-task","taskType":"preview","token":"private preview material"}\n}\nfinished'), "pending"],
    [Buffer.from('{"ok":true,"result":{"success":true}}'), "completed"],
    [Buffer.from('auto-preview command exited 0'), "unknown"],
  ]) {
    let calls = 0;
    const driver = new OfficialWechatDevtools(invocation, async () => {
      calls += 1;
      return stdout;
    });
    const result = await invokeOfficial(generation, {}, driver);
    assert.equal(calls, 1);
    assert.equal(result.disposition, disposition);
    if (disposition === "pending") {
      assert.equal(result.result.taskId, "original-task");
      assert.equal(result.result.taskType, "preview");
    }
    assert.doesNotMatch(JSON.stringify(result), /private preview material|token/u);
  }
});

function collect() {
  const values = [];
  return { values, emit: (value) => values.push(value) };
}

async function manualRun(t) {
  const source = await fixture(t);
  const official = officialDriver();
  const output = collect();
  await main(["start", "--project", source, "--delivery", "auto"], {
    official,
    snapshotOptions: { settleMilliseconds: 0 },
    emit: output.emit,
  });
  const run = output.values[0];
  t.after(() => rm(run.feedbackRun, { recursive: true, force: true }));
  return { source, official, run };
}

test("default start and refresh generate QR without pushing to the IDE account", async (t) => {
  const source = await fixture(t);
  const official = officialDriver({ automaticFailure: false });
  let pushes = 0;
  official.autoPreview = async () => { pushes += 1; return { success: true }; };
  const output = collect();
  const dependencies = { official, snapshotOptions: { settleMilliseconds: 0 }, emit: output.emit };
  await main(["start", "--project", source], dependencies);
  const first = output.values[0];
  t.after(() => stopFeedbackRun(first.feedbackRun));
  assert.equal(first.officialInvocation, "qr_ready");
  await access(first.qrCode);
  assert.equal(pushes, 0);
  await main(["refresh", "--feedback", first.feedbackRun, "--delivery", "auto"], dependencies);
  assert.equal(output.values[1].officialInvocation, "completed");
  assert.equal(pushes, 1);
  await main(["refresh", "--feedback", first.feedbackRun], dependencies);
  const third = output.values[2];
  assert.equal(third.officialInvocation, "qr_ready");
  assert.equal(third.candidateIdentity.generation, 3);
  assert.equal(pushes, 1, "refresh must not inherit the previous automatic delivery choice");
  assert.equal(official.calls.length, 2);
  await access(third.qrCode);
  await assert.rejects(access(first.qrCode));
  assert.ok(third.unverified.includes("phone_visible_generation"));
});

test("failed default QR delivery preserves the candidate without falling back to an account push", async (t) => {
  const source = await fixture(t);
  const output = collect();
  let pushes = 0;
  const official = {
    autoPreview: async () => { pushes += 1; },
    preview: async () => { throw new Error("device_feedback_official_timeout"); },
  };
  await main(["start", "--project", source, "--delivery", "qr"], {
    official, snapshotOptions: { settleMilliseconds: 0 }, emit: output.emit,
  });
  const run = output.values[0];
  t.after(() => rm(run.feedbackRun, { recursive: true, force: true }));
  assert.equal(run.officialInvocation, "error");
  assert.equal(run.officialBoundary, "timeout");
  assert.equal(pushes, 0);
  await access(run.preparedProject);
  assert.equal(run.qrCode, undefined);
});

test("pending QR preview retains the original task instead of permitting a second preview", async (t) => {
  const source = await fixture(t);
  const driver = officialDriver();
  const createQr = driver.preview;
  driver.preview = async (...args) => {
    await createQr(...args);
    return { status: "pending", taskId: "qr-task", taskType: "preview" };
  };
  const output = collect();
  await main(["start", "--project", source], {
    official: driver, snapshotOptions: { settleMilliseconds: 0 }, emit: output.emit,
  });
  const run = output.values[0];
  t.after(() => rm(run.feedbackRun, { recursive: true, force: true }));
  assert.equal(run.officialInvocation, "pending");
  assert.equal(run.pendingTask.tool, "create_preview_qrcode");
  assert.equal(run.pendingTask.taskId, "qr-task");
  assert.equal(run.qrCode, undefined);
  await access(driver.calls[0].qrOutput);
  await assert.rejects(main(["preview", "--feedback", run.feedbackRun], {
    official: driver, emit: () => {},
  }), /official_pending_no_replay/u);
  assert.equal(driver.calls.length, 1);
  await withFeedbackRun(run.feedbackRun,
    state => recordOfficialTaskResult(state, "qr-task", { status: "success" }));
  assert.equal((await loadFeedbackRun(run.feedbackRun)).official.disposition, "qr_ready");
  assert.equal(driver.calls.length, 1);
});

test("a terminal failure requires an actual new preview before phone binding", async (t) => {
  const { run } = await manualRun(t);
  assert.equal(run.officialInvocation, "failed");
  await assert.rejects(main(["bind", "--feedback", run.feedbackRun, "--confirm", "official_update_completed"],
    { emit: () => {} }), /manual_binding_not_available/u);
});

test("default QR start and refresh reject configuration drift instead of claiming a stable manual handoff", async (t) => {
  const source = await fixture(t);
  const official = officialDriver();
  official.preview = async (project) => {
    const configPath = path.join(project, "project.config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.setting = { urlCheck: false };
    await writeFile(configPath, JSON.stringify(config));
  };
  const output = collect();
  const dependencies = { official, snapshotOptions: { settleMilliseconds: 0 }, emit: output.emit };
  await assert.rejects(main(["start", "--project", source], dependencies), /generation_config_changed_start_new_preview/u);
  assert.equal(output.values.length, 0);
  const { run } = await manualRun(t);
  await assert.rejects(main(["refresh", "--feedback", run.feedbackRun], dependencies), /generation_config_changed_start_new_preview/u);
  assert.equal(output.values.length, 0);
  await assert.rejects(main(["bind", "--feedback", run.feedbackRun, "--confirm", "official_update_completed"], dependencies));
});

test("ordinary preview tolerates formatting-only config normalization and owns its QR", async (t) => {
  const { official, run } = await manualRun(t);
  const configPath = path.join(run.preparedProject, "project.config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

  const previewed = collect();
  await main(["preview", "--feedback", run.feedbackRun], {
    official,
    emit: previewed.emit,
  });
  const result = previewed.values[0];
  assert.equal(result.mode, "development_feedback");
  assert.equal(result.officialInvocation, "qr_ready");
  assert.equal(result.observedProductBehavior, "not_observed");
  assert.ok(result.qrCode.startsWith(run.feedbackRun));
  assert.doesNotMatch(JSON.stringify(result), /private preview material/u);
  await access(result.qrCode);
  const state = await loadFeedbackRun(run.feedbackRun);
  assert.match(state.generation.configSemanticSha256, /^[a-f0-9]{64}$/u);

  const bound = collect();
  await main(
    [
      "bind",
      "--feedback",
      run.feedbackRun,
      "--confirm",
      "official_update_completed",
    ],
    { emit: bound.emit },
  );
  assert.equal(bound.values[0].officialInvocation, "operator_confirmed");
  await assert.rejects(access(result.qrCode));
  assert.equal(official.calls.length, 1);
});

test("ordinary preview after auto-preview waits for explicit phone binding", async (t) => {
  const source = await fixture(t);
  const official = officialDriver({ automaticFailure: false });
  const started = collect();
  await main(["start", "--project", source, "--delivery", "auto"], {
    official,
    snapshotOptions: { settleMilliseconds: 0 },
    emit: started.emit,
  });
  const run = started.values[0];
  t.after(() => rm(run.feedbackRun, { recursive: true, force: true }));
  assert.equal(run.officialInvocation, "completed");
  assert.equal(run.deviceSession, null);

  const previewed = collect();
  await main(["preview", "--feedback", run.feedbackRun], {
    official,
    emit: previewed.emit,
  });
  assert.equal(previewed.values[0].officialInvocation, "qr_ready");
  assert.equal(previewed.values[0].deviceSession, null);

  const bound = collect();
  await main(
    [
      "bind",
      "--feedback",
      run.feedbackRun,
      "--confirm",
      "official_update_completed",
    ],
    { emit: bound.emit },
  );
  assert.ok(bound.values[0].deviceSession.startsWith(run.feedbackRun));
  assert.equal(bound.values[0].officialInvocation, "operator_confirmed");
  assert.ok(!bound.values[0].unverified.includes("phone_visible_generation"));
});

test("ordinary preview rejects bundle drift and removes partial QR material", async (t) => {
  const { official, run } = await manualRun(t);
  await writeFile(
    path.join(run.preparedProject, "weapp", "pages", "index", "index.js"),
    'Page({data:{label:"changed"}});\n',
  );
  await assert.rejects(
    main(["preview", "--feedback", run.feedbackRun], {
      official,
      emit: () => {},
    }),
    /generation_changed_start_new_preview/u,
  );
  assert.equal(official.calls.length, 0);
});

test("ordinary preview rejects semantic project config drift", async (t) => {
  const { official, run } = await manualRun(t);
  const configPath = path.join(run.preparedProject, "project.config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.setting = { urlCheck: false };
  await writeFile(configPath, `${JSON.stringify(config)}\n`);
  await assert.rejects(
    main(["preview", "--feedback", run.feedbackRun], {
      official,
      emit: () => {},
    }),
    /generation_config_changed_start_new_preview/u,
  );
  assert.equal(official.calls.length, 0);
});

test("refresh reports deferred stale-generation cleanup without hiding the new generation", async (t) => {
  const { official, run, source } = await manualRun(t);
  await writeFile(
    path.join(source, "weapp", "pages", "index", "index.js"),
    'Page({data:{label:"B"}});\n',
  );
  const refreshed = collect();
  await main(["refresh", "--feedback", run.feedbackRun, "--delivery", "auto"], {
    official,
    snapshotOptions: { settleMilliseconds: 0 },
    removeOwnedGeneration: async () => false,
    emit: refreshed.emit,
  });
  assert.equal(refreshed.values[0].candidateIdentity.generation, 2);
  assert.equal(refreshed.values[0].cleanup, "owned_stale_generation_pending");
  assert.equal(
    (await loadFeedbackRun(run.feedbackRun)).staleGenerationCleanupPending,
    true,
  );

  await writeFile(
    path.join(source, "weapp", "pages", "index", "index.js"),
    'Page({data:{label:"C"}});\n',
  );
  const refreshedAgain = collect();
  await main(["refresh", "--feedback", run.feedbackRun, "--delivery", "auto"], {
    official,
    snapshotOptions: { settleMilliseconds: 0 },
    removeOwnedGeneration: async () => true,
    emit: refreshedAgain.emit,
  });
  assert.equal(refreshedAgain.values[0].candidateIdentity.generation, 3);
  assert.equal(
    refreshedAgain.values[0].cleanup,
    "owned_stale_generation_pending",
  );
});

test("stop preserves retry state when a generation is temporarily locked", async (t) => {
  const { run } = await manualRun(t);
  let attempted = 0;
  await assert.rejects(
    stopFeedbackRun(run.feedbackRun, {
      removeOwnedGeneration: async () => {
        attempted += 1;
        return false;
      },
    }),
    /device_feedback_cleanup_pending/u,
  );
  assert.equal(attempted, 1);
  const retryable = await loadFeedbackRun(run.feedbackRun);
  assert.equal(retryable.staleGenerationCleanupPending, true);
  await access(path.join(run.feedbackRun, "feedback.json"));
  await access(retryable.generation.directory);

  await stopFeedbackRun(run.feedbackRun);
  await assert.rejects(access(run.feedbackRun));
});
