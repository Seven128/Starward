import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArguments } from "./device-feedback-command.mjs";
import { main as fixtureMain } from "./device-feedback-fixture.mjs";
import { main } from "./device-feedback.mjs";
import { runOfficialProcess } from "./device-feedback-official.mjs";
import {
  loadFeedbackRun,
  recordOfficialTaskResult,
  saveFeedbackRun,
  withFeedbackRun,
} from "./device-feedback-session.mjs";
import { startSession, withSession } from "./device-session.mjs";

function collect() {
  const values = [];
  return { values, emit: (value) => values.push(value) };
}

function assertDevelopmentOnly(value) {
  const serialized = JSON.stringify(value);
  assert.equal(value.mode, "development_feedback");
  assert.doesNotMatch(serialized, /\b(?:passed|accepted)\b/iu);
  assert.doesNotMatch(serialized, /private-device|private qr|private account/iu);
}

async function completedFeedback(t, autoPreview = async () => ({ success: true })) {
  const fixtureOutput = collect();
  await fixtureMain(["create", "--variant", "A"], {
    emit: fixtureOutput.emit,
  });
  const project = fixtureOutput.values[0].project;
  t.after(() => fixtureMain(["stop", "--project", project], { emit: () => {} }));
  const output = collect();
  await main(["start", "--project", project, "--delivery", "auto"], {
    official: { autoPreview },
    snapshotOptions: { settleMilliseconds: 0 },
    emit: output.emit,
  });
  const run = output.values[0];
  t.after(() => rm(run.feedbackRun, { recursive: true, force: true }));
  return run;
}

const bindArguments = (feedbackRun) => [
  "bind",
  "--feedback",
  feedbackRun,
  "--confirm",
  "official_update_completed",
];

test("doctor filters fixed-candidate labels and never exposes device identity", async () => {
  const output = collect();
  await main(["doctor"], {
    official: {
      doctor: async () => ({
        officialTool: "available",
        automaticUpdate: "available",
        login: "ready",
      }),
    },
    adb: {
      doctor: async () => ({
        adbVersion: "1.0.41",
        detected: 1,
        states: ["device"],
        usbReady: true,
        acceptance: "not_evaluated",
        serial: "private-device",
      }),
    },
    emit: output.emit,
  });
  assertDevelopmentOnly(output.values[0]);
  assert.equal(output.values[0].android.usbReady, true);
  assert.doesNotMatch(JSON.stringify(output.values[0]), /acceptance/u);
});

test("official subprocess failures and timeouts are bounded and redact child output", async () => {
  await assert.rejects(
    runOfficialProcess(process.execPath, [
      "-e",
      "process.stderr.write('private qr and account');process.exit(1)",
    ]),
    { message: "device_feedback_official_failed" },
  );
  await assert.rejects(
    runOfficialProcess(
      process.execPath,
      ["-e", "setInterval(()=>{},1000)"],
      { timeout: 100 },
    ),
    { message: "device_feedback_official_timeout" },
  );
});

test("argument allowlists block passthrough and require explicit manual confirmation", () => {
  assert.throws(() => parseArguments(["start", "--project", "x", "--delivery", "guess"]), /delivery_invalid/u);
  assert.throws(() => parseArguments(["exec", "--command", "private"]), /action_invalid/u);
  assert.throws(() => parseArguments(["doctor", "--serial", "private"]), /argument_invalid/u);
  assert.throws(() => parseArguments(["start"]), /argument_missing/u);
  assert.throws(
    () => parseArguments(["start", "--project", "x", "--port", "0"]),
    /port_invalid/u,
  );
  assert.deepEqual(parseArguments(["refresh", "--feedback", "x"]), {
    action: "refresh",
    options: { feedback: "x" },
  });
  assert.deepEqual(parseArguments(["preview", "--feedback", "x"]), {
    action: "preview",
    options: { feedback: "x" },
  });
});

test("isolated A/B fixture is external, visibly different and removed only by its owner", async () => {
  const created = collect();
  await fixtureMain(["create", "--variant", "A"], { emit: created.emit });
  const fixture = created.values[0];
  assert.equal(fixture.mode, "development_feedback_fixture");
  assert.equal(fixture.productBuildReferenced, false);
  assert.doesNotMatch(JSON.stringify(fixture), /\b(?:passed|accepted)\b/iu);
  const projectConfig = JSON.parse(
    await readFile(path.join(fixture.project, "project.config.json"), "utf8"),
  );
  assert.equal(projectConfig.compileType, "miniprogram");
  assert.equal(projectConfig.miniprogramRoot, "weapp/");
  assert.deepEqual(
    JSON.parse(
      await readFile(
        path.join(fixture.project, "weapp", "pages", "index", "index.json"),
        "utf8",
      ),
    ),
    { usingComponents: {} },
  );
  const page = path.join(fixture.project, "weapp", "pages", "index", "index.wxml");
  const a = await readFile(page, "utf8");
  assert.match(a, /CANDIDATE A/u);

  await fixtureMain(
    ["update", "--project", fixture.project, "--variant", "B"],
    { emit: () => {} },
  );
  const b = await readFile(page, "utf8");
  assert.match(b, /CANDIDATE B/u);
  assert.notEqual(a, b);
  await access(path.join(fixture.project, ".starward-device-feedback-fixture.json"));

  await fixtureMain(["stop", "--project", fixture.project], { emit: () => {} });
  await assert.rejects(access(fixture.project));
  await access(path.join(process.cwd(), "apps", "wechat-miniapp", "project.config.json"));
});

test("settled-candidate sessions still fail closed on the same bundle drift", async (t) => {
  const created = collect();
  await fixtureMain(["create", "--variant", "A"], { emit: created.emit });
  const source = created.values[0].project;
  t.after(() => fixtureMain(["stop", "--project", source], { emit: () => {} }));
  const state = await startSession(source);
  t.after(() => rm(state.directory, { recursive: true, force: true }));
  await writeFile(
    path.join(source, "weapp", "pages", "index", "index.js"),
    'Page({data:{label:"changed"}});\n',
  );
  await assert.rejects(
    withSession(state.directory, async () => {}),
    /bundle_changed_start_new_session/u,
  );
});

test("confirmed binding fails closed when the prepared generation drifted", async (t) => {
  const run = await completedFeedback(t);
  await writeFile(
    path.join(run.preparedProject, "weapp", "pages", "index", "index.js"),
    'Page({data:{label:"drifted"}});\n',
  );
  await assert.rejects(
    main(bindArguments(run.feedbackRun), { emit: () => {} }),
    /generation_changed_start_new_session/u,
  );
  const state = await loadFeedbackRun(run.feedbackRun);
  assert.equal(state.official.disposition, "completed");
  assert.equal(state.deviceSession, null);
});

test("failed replacement of a legacy pre-confirmation session remains retryable", async (t) => {
  const run = await completedFeedback(t);
  const state = await loadFeedbackRun(run.feedbackRun);
  const legacy = await startSession(run.preparedProject, run.feedbackRun);
  state.deviceSession = legacy.directory;
  await saveFeedbackRun(state);

  await assert.rejects(
    main(bindArguments(run.feedbackRun), {
      startDeviceSession: async () => {
        throw new Error("injected_session_start_failure");
      },
      emit: () => {},
    }),
    /injected_session_start_failure/u,
  );
  const retryable = await loadFeedbackRun(run.feedbackRun);
  assert.equal(retryable.official.disposition, "completed");
  assert.equal(retryable.deviceSession, null);
  await assert.rejects(access(legacy.directory));

  const rebound = collect();
  await main(bindArguments(run.feedbackRun), { emit: rebound.emit });
  assert.equal(rebound.values[0].officialInvocation, "operator_confirmed");
  assert.ok(rebound.values[0].deviceSession.startsWith(run.feedbackRun));
});

test("pending official preview retains its task and blocks binding or replacement", async (t) => {
  let pushes = 0;
  const autoPreview = async () => {
    pushes += 1;
    return { success: true, status: "pending", taskId: "preview-task-1", taskType: "preview",
      message: "private account", token: "private qr" };
  };
  const run = await completedFeedback(t, autoPreview);
  assert.equal(run.officialInvocation, "pending");
  assert.deepEqual(run.pendingTask, { taskId: "preview-task-1", taskType: "preview",
    tool: "auto_preview", project: run.preparedProject, lastStatus: "pending" });
  const before = await readFile(path.join(run.feedbackRun, "feedback.json"), "utf8");
  const state = await loadFeedbackRun(run.feedbackRun);
  assert.equal(state.official.result.taskId, "preview-task-1");
  assert.equal(state.official.result.taskType, "preview");
  assert.doesNotMatch(before, /private account|private qr|token/u);
  assertDevelopmentOnly(run);
  for (const args of [bindArguments(run.feedbackRun),
    ["refresh", "--feedback", run.feedbackRun, "--delivery", "auto"],
    ["preview", "--feedback", run.feedbackRun],
    ["stop", "--feedback", run.feedbackRun]]) {
    await assert.rejects(main(args, {
      official: { autoPreview, preview: async () => { throw Error("must not invoke"); } },
      emit: () => {},
    }), /official_pending_no_replay/u);
  }
  assert.equal(pushes, 1);
  assert.equal(await readFile(path.join(run.feedbackRun, "feedback.json"), "utf8"), before);
});

test("only the retained original task can resolve pending and a poll success flag is insufficient", async (t) => {
  let pushes = 0;
  const run = await completedFeedback(t, async () => {
    pushes += 1;
    return { success: true, status: "pending", taskId: "original-task", taskType: "preview" };
  });
  const record = (taskId, result) => withFeedbackRun(run.feedbackRun,
    state => recordOfficialTaskResult(state, taskId, result));
  await assert.rejects(record("another-task", { status: "success" }), /official_task_binding_required/u);
  await assert.rejects(record("original-task", { status: "success", taskId: "another-task" }),
    /official_task_mismatch/u);
  let state = await loadFeedbackRun(run.feedbackRun);
  assert.equal(state.official.disposition, "pending");
  await record("original-task", { ok: true, result: { success: true } });
  state = await loadFeedbackRun(run.feedbackRun);
  assert.equal(state.official.disposition, "unknown");
  assert.equal(state.official.result.taskId, "original-task");
  assert.equal(state.official.result.taskType, "preview");
  await assert.rejects(main(bindArguments(run.feedbackRun), { emit: () => {} }),
    /official_outcome_unknown_no_replay/u);
  await record("original-task", { ok: true, result: { status: "pending" } });
  assert.equal((await loadFeedbackRun(run.feedbackRun)).official.disposition, "pending");
  await record("original-task", { ok: true, result: { status: "success", result: { token: "private qr" } } });
  state = await loadFeedbackRun(run.feedbackRun);
  assert.equal(state.official.disposition, "completed");
  assert.equal(state.official.result.taskId, "original-task");
  assert.doesNotMatch(JSON.stringify(state), /private qr|token/u);
  const bound = collect();
  await main(bindArguments(run.feedbackRun), { emit: bound.emit });
  assert.equal(bound.values[0].officialInvocation, "operator_confirmed");
  assert.equal(pushes, 1);
  await assert.rejects(record("original-task", { status: "failed" }), /official_task_already_terminal/u);
});

test("a recovered poll result cannot invent a lost handle or outlive its generation", async (t) => {
  const unknown = await completedFeedback(t, async () => {});
  assert.equal(unknown.officialInvocation, "unknown");
  await assert.rejects(withFeedbackRun(unknown.feedbackRun,
    state => recordOfficialTaskResult(state, "invented-task", { status: "success" })),
  /official_task_binding_required/u);
  const pending = await completedFeedback(t,
    async () => ({ status: "pending", taskId: "original-task" }));
  await writeFile(path.join(pending.preparedProject, "weapp", "pages", "index", "index.js"),
    'Page({data:{label:"drifted"}});\n');
  await assert.rejects(withFeedbackRun(pending.feedbackRun,
    state => recordOfficialTaskResult(state, "original-task", { status: "success" })),
  /generation_changed_start_new_preview/u);
  assert.equal((await loadFeedbackRun(pending.feedbackRun)).official.disposition, "pending");
});

test("authorization-task success does not complete the preview or permit binding", async (t) => {
  let pushes = 0;
  const run = await completedFeedback(t, async () => {
    pushes += 1;
    return { status: "pending", taskId: "auth-prerequisite", taskType: "auth" };
  });
  await withFeedbackRun(run.feedbackRun, state =>
    recordOfficialTaskResult(state, "auth-prerequisite", { status: "success" }));
  const state = await loadFeedbackRun(run.feedbackRun);
  assert.equal(state.official.disposition, "authorization_ready");
  assert.equal(state.official.boundary, "authorization_completed_preview_not_invoked");
  assert.equal(state.official.result.taskId, "auth-prerequisite");
  assert.equal(state.official.result.tool, "auto_preview");
  await assert.rejects(main(bindArguments(run.feedbackRun), { emit: () => {} }), /manual_binding_not_available/u);
  assert.equal(pushes, 1, "recording authorization never issues the business preview");
  // Normalize the erroneous summary written by an earlier implementation too.
  state.official.disposition = "completed";
  await saveFeedbackRun(state);
  assert.equal((await loadFeedbackRun(run.feedbackRun)).official.disposition, "authorization_ready");
});

test("a preview task handle survives post-invocation semantic config drift", async (t) => {
  const fixtureOutput = collect();
  await fixtureMain(["create", "--variant", "A"], { emit: fixtureOutput.emit });
  const source = fixtureOutput.values[0].project;
  t.after(() => fixtureMain(["stop", "--project", source], { emit: () => {} }));
  let feedbackRun;
  let calls = 0;
  await assert.rejects(main(["start", "--project", source], {
    official: { preview: async (project) => {
      calls += 1;
      feedbackRun = path.dirname(path.dirname(project));
      const configPath = path.join(project, "project.config.json");
      const config = JSON.parse(await readFile(configPath, "utf8"));
      config.setting = { ...config.setting, es6: !config.setting?.es6 };
      await writeFile(configPath, JSON.stringify(config));
      return { status: "pending", taskId: "preview-before-drift", taskType: "preview" };
    } }, snapshotOptions: { settleMilliseconds: 0 }, emit: () => {},
  }), /generation_config_changed_start_new_preview/u);
  t.after(() => rm(feedbackRun, { recursive: true, force: true }));
  const saved = await loadFeedbackRun(feedbackRun);
  assert.equal(saved.official.disposition, "unknown");
  assert.equal(saved.official.result.status, "pending");
  assert.equal(saved.official.result.taskId, "preview-before-drift");
  await assert.rejects(main(bindArguments(feedbackRun), { emit: () => {} }), /official_outcome_unknown_no_replay/u);
  assert.equal(calls, 1);
});

test("discarded legacy completed results remain unknown without changing saved evidence", async (t) => {
  const run = await completedFeedback(t);
  const state = await loadFeedbackRun(run.feedbackRun);
  state.official = { disposition: "completed", boundary: null };
  await saveFeedbackRun(state);
  const before = await readFile(path.join(run.feedbackRun, "feedback.json"), "utf8");
  const loaded = await loadFeedbackRun(run.feedbackRun);
  assert.equal(loaded.official.disposition, "unknown");
  assert.equal(loaded.official.boundary, "legacy_result_unretained");
  assert.equal(loaded.official.result.status, "unknown");
  for (const args of [bindArguments(run.feedbackRun),
    ["refresh", "--feedback", run.feedbackRun, "--delivery", "auto"],
    ["preview", "--feedback", run.feedbackRun]]) {
    await assert.rejects(main(args, { emit: () => {} }), /official_outcome_unknown_no_replay/u);
  }
  assert.equal(await readFile(path.join(run.feedbackRun, "feedback.json"), "utf8"), before);
});
