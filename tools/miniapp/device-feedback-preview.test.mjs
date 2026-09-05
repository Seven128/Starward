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
  resolveOfficialCli,
} from "./device-feedback-official.mjs";
import {
  loadFeedbackRun,
  stopFeedbackRun,
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
        throw new Error("redacted automatic failure");
    },
    preview: async (project, qrOutput, infoOutput, port) => {
      calls.push({ project, qrOutput, infoOutput, port });
      const header = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      await writeFile(qrOutput, Buffer.concat([header, Buffer.alloc(120)]));
      await writeFile(infoOutput, "private preview material");
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

test("official CLI prefers the bundled Node entry over leftover Electron files", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "starward-wechat-node-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const name of ["cli.bat", "node.exe", "cli.js", "微信开发者工具.exe"])
    await writeFile(path.join(directory, name), "fixture");
  const invocation = await resolveOfficialCli(path.join(directory, "cli.bat"), {});
  assert.equal(invocation.file, await realpath(path.join(directory, "node.exe")));
  assert.deepEqual(invocation.prefix, [await realpath(path.join(directory, "cli.js"))]);
  assert.equal(invocation.env, undefined);
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

  const invocation = await resolveOfficialCli(cli, {});
  assert.equal(invocation.file, await realpath(executable));
  assert.equal(invocation.prefix[0], "-e");
  assert.match(invocation.prefix[1], /--ms-enable-electron-run-as-node/u);
  assert.equal(invocation.prefix[2], await realpath(entry));
  assert.equal(invocation.cwd, await realpath(directory));
  assert.equal(invocation.env.cwd, process.cwd());
  assert.equal(invocation.env.ELECTRON_RUN_AS_NODE, "1");
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

function collect() {
  const values = [];
  return { values, emit: (value) => values.push(value) };
}

async function manualRun(t) {
  const source = await fixture(t);
  const official = officialDriver();
  const output = collect();
  await main(["start", "--project", source], {
    official,
    snapshotOptions: { settleMilliseconds: 0 },
    emit: output.emit,
  });
  const run = output.values[0];
  t.after(() => rm(run.feedbackRun, { recursive: true, force: true }));
  return { source, official, run };
}

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
  await main(["start", "--project", source], {
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
  await main(["refresh", "--feedback", run.feedbackRun], {
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
  await main(["refresh", "--feedback", run.feedbackRun], {
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
