import test from "node:test";
import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  loadSession,
  saveSession,
} from "./device-session.mjs";
import { loadFeedbackRun } from "./device-feedback-session.mjs";
import { main } from "./device-feedback.mjs";

const testAppId = ["wx", "1234567890abcdef"].join("");

async function fixture(t, label = "A") {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "starward-feedback-source-"),
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
    path.join(directory, "project.private.config.json"),
    '{"private":"must-not-copy"}\n',
  );
  await writeFile(
    path.join(directory, "weapp", "app.json"),
    '{"pages":["pages/index/index"]}\n',
  );
  await writeFile(
    path.join(directory, "weapp", "pages", "index", "index.js"),
    `Page({data:{label:${JSON.stringify(label)}}});\n`,
  );
  return directory;
}

function officialDriver({ fail = false } = {}) {
  const calls = [];
  return {
    calls,
    doctor: async () => ({
      officialTool: "available",
      automaticUpdate: "available",
      login: "ready",
    }),
    autoPreview: async (project, infoOutput, port) => {
      calls.push({ project, infoOutput, port });
      await writeFile(infoOutput, "private-scan-material");
      if (fail) throw new Error("private official failure detail");
    },
  };
}

function collect() {
  const values = [];
  return { values, emit: (value) => values.push(value) };
}

async function bindFeedback(feedbackRun) {
  const output = collect();
  await main(
    ["bind", "--feedback", feedbackRun, "--confirm", "official_update_completed"],
    { emit: output.emit },
  );
  return output.values[0];
}

function assertDevelopmentOnly(value) {
  const serialized = JSON.stringify(value);
  assert.equal(value.mode, "development_feedback");
  assert.doesNotMatch(serialized, /\b(?:passed|accepted)\b/iu);
  assert.doesNotMatch(serialized, /private-scan-material|private official/iu);
}

test("development start waits for confirmed phone delivery before binding a session", async (t) => {
  const source = await fixture(t);
  const official = officialDriver();
  const output = collect();
  await main(["start", "--project", source], {
    official,
    snapshotOptions: { settleMilliseconds: 0 },
    emit: output.emit,
  });
  const result = output.values[0];
  t.after(() => main(["stop", "--feedback", result.feedbackRun], { emit: () => {} }));

  assertDevelopmentOnly(result);
  assert.equal(result.candidateIdentity.generation, 1);
  assert.equal(result.officialInvocation, "completed");
  assert.equal(result.observedProductBehavior, "not_observed");
  assert.equal(result.restartAndStateLossPossible, true);
  assert.equal(result.preparedProject, official.calls[0].project);
  assert.match(result.phoneHandoff, /信任并运行/u);
  assert.equal(result.deviceSession, null);
  assert.match(result.manualInstruction, /run bind/u);
  assert.ok(result.unverified.includes("phone_visible_generation"));
  assert.equal(official.calls.length, 1);
  assert.notEqual(official.calls[0].project, source);
  await assert.rejects(
    access(path.join(official.calls[0].project, "project.private.config.json")),
  );
  await assert.rejects(access(official.calls[0].infoOutput));
  await access(source);

  const bound = await bindFeedback(result.feedbackRun);
  assert.ok(bound.deviceSession.startsWith(bound.feedbackRun));
  assert.equal(bound.officialInvocation, "operator_confirmed");
  assert.ok(!bound.unverified.includes("phone_visible_generation"));
  assert.match(bound.phoneHandoff, /fresh screenshot/u);
});

test("refresh accepts a new generation, destroys the old session and stale capture authority", async (t) => {
  const source = await fixture(t, "A");
  const official = officialDriver();
  const started = collect();
  await main(["start", "--project", source], {
    official,
    snapshotOptions: { settleMilliseconds: 0 },
    emit: started.emit,
  });
  const unboundFirst = started.values[0];
  const first = await bindFeedback(unboundFirst.feedbackRun);
  t.after(() => rm(first.feedbackRun, { recursive: true, force: true }));
  const oldSession = first.deviceSession;
  const oldState = await loadSession(oldSession);
  oldState.capture = {
    at: Date.now(),
    device: "stale-device-binding",
    file: path.join(oldSession, "screen.png"),
  };
  await writeFile(oldState.capture.file, "stale screenshot");
  await saveSession(oldState);

  await writeFile(
    path.join(source, "weapp", "pages", "index", "index.js"),
    'Page({data:{label:"B"}});\n',
  );
  const refreshed = collect();
  await main(["refresh", "--feedback", first.feedbackRun], {
    official,
    snapshotOptions: { settleMilliseconds: 0 },
    emit: refreshed.emit,
  });
  const second = refreshed.values[0];

  assertDevelopmentOnly(second);
  assert.equal(second.candidateIdentity.generation, 2);
  assert.notEqual(
    second.candidateIdentity.localBundleSha256,
    first.candidateIdentity.localBundleSha256,
  );
  assert.equal(second.invalidated.priorDeviceSession, true);
  assert.equal(second.invalidated.priorScreenshotAndInputAuthority, true);
  assert.equal(second.deviceSession, null);
  await assert.rejects(access(oldSession));

  const boundSecond = await bindFeedback(first.feedbackRun);
  assert.notEqual(boundSecond.deviceSession, oldSession);
  assert.equal(
    (await loadSession(boundSecond.deviceSession)).capture,
    null,
  );

  await main(["stop", "--feedback", first.feedbackRun], { emit: () => {} });
  await assert.rejects(access(first.feedbackRun));
  await access(source);
});

test("a half-written source is retried and only the coherent generation reaches the official driver", async (t) => {
  const source = await fixture(t, "A");
  const official = officialDriver();
  const output = collect();
  let changed = false;
  await main(["start", "--project", source], {
    official,
    snapshotOptions: {
      settleMilliseconds: 0,
      afterCopy: async () => {
        if (changed) return;
        changed = true;
        await writeFile(
          path.join(source, "weapp", "pages", "index", "index.js"),
          'Page({data:{label:"B"}});\n',
        );
      },
    },
    emit: output.emit,
  });
  const result = output.values[0];
  t.after(() => main(["stop", "--feedback", result.feedbackRun], { emit: () => {} }));
  assert.equal(official.calls.length, 1);
  assert.match(
    await readFile(
      path.join(official.calls[0].project, "weapp", "pages", "index", "index.js"),
      "utf8",
    ),
    /label:"B"/u,
  );
});

test("continual source drift fails boundedly and preserves the source project", async (t) => {
  const source = await fixture(t, "A");
  let revision = 0;
  await assert.rejects(
    main(["start", "--project", source], {
      official: officialDriver(),
      snapshotOptions: {
        attempts: 2,
        settleMilliseconds: 0,
        afterCopy: async () => {
          revision += 1;
          await writeFile(
            path.join(source, "weapp", "pages", "index", "index.js"),
            `Page({data:{revision:${revision}}});\n`,
          );
        },
      },
      emit: () => {},
    }),
    /source_not_stable/u,
  );
  await access(source);
});

test("official failure stops at a redacted manual boundary and exact confirmation binds it", async (t) => {
  const source = await fixture(t);
  const official = officialDriver({ fail: true });
  const output = collect();
  await main(["start", "--project", source], {
    official,
    snapshotOptions: { settleMilliseconds: 0 },
    emit: output.emit,
  });
  const manual = output.values[0];
  t.after(() => rm(manual.feedbackRun, { recursive: true, force: true }));

  assertDevelopmentOnly(manual);
  assert.equal(manual.officialInvocation, "manual_required");
  assert.equal(manual.officialBoundary, "failed");
  assert.equal(manual.deviceSession, null);
  assert.match(manual.manualInstruction, /ordinary-preview QR/u);
  await access(manual.preparedProject);
  await assert.rejects(access(official.calls[0].infoOutput));
  await assert.rejects(
    main(
      [
        "bind",
        "--feedback",
        manual.feedbackRun,
        "--confirm",
        "anything_else",
      ],
      { emit: () => {} },
    ),
    /manual_confirmation_invalid/u,
  );

  const bound = await bindFeedback(manual.feedbackRun);
  assertDevelopmentOnly(bound);
  assert.equal(bound.officialInvocation, "operator_confirmed");
  assert.ok(bound.deviceSession.startsWith(bound.feedbackRun));
  assert.equal((await loadFeedbackRun(bound.feedbackRun)).deviceSession, bound.deviceSession);
  await main(["stop", "--feedback", bound.feedbackRun], { emit: () => {} });
  await access(source);
});
