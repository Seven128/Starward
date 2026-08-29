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
  saveFeedbackRun,
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

async function completedFeedback(t) {
  const fixtureOutput = collect();
  await fixtureMain(["create", "--variant", "A"], {
    emit: fixtureOutput.emit,
  });
  const project = fixtureOutput.values[0].project;
  t.after(() => fixtureMain(["stop", "--project", project], { emit: () => {} }));
  const output = collect();
  await main(["start", "--project", project], {
    official: { autoPreview: async () => {} },
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
