import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main as fixtureMain } from "./device-feedback-fixture.mjs";
import { main } from "./device-feedback.mjs";
import {
  OfficialWechatDevtools,
  assertOfficialOutcomeResolved,
  classifyOfficialPreviewResult,
  invokeOfficial,
  officialPreviewError,
  runOfficialProcess,
} from "./device-feedback-official.mjs";
import { loadFeedbackRun, recordOfficialTaskResult, withFeedbackRun } from "./device-feedback-session.mjs";

async function directory(t) {
  const value = await mkdtemp(path.join(os.tmpdir(), "starward-official-diagnostic-"));
  t.after(() => rm(value, { recursive: true, force: true }));
  return value;
}

function driver(script, run = runOfficialProcess) {
  return new OfficialWechatDevtools({ file: process.execPath, prefix: ["-e", script, "--"] }, run);
}

async function sourceFixture(t) {
  let project;
  await fixtureMain(["create", "--variant", "A"], { emit: value => { project = value.project; } });
  t.after(() => fixtureMain(["stop", "--project", project], { emit: () => {} }));
  return project;
}

async function receipt(diagnostic) {
  assert.equal(diagnostic.retained, true);
  const value = JSON.parse(await readFile(diagnostic.path, "utf8"));
  assert.equal(value.encoding, "base64");
  return { ...value, stdout: Buffer.from(value.stdout, "base64"), stderr: Buffer.from(value.stderr, "base64") };
}

test("failed auto and QR calls retain both streams privately without resolving the remote outcome", async (t) => {
  const project = await sourceFixture(t);
  const stdout = JSON.stringify({ success: false, status: "failed", errorCode: 10,
    message: "private account and project detail" });
  const stderr = "private token and QR; main package exceeded limit";
  for (const delivery of ["auto", "qr"]) {
    let calls = 0, output;
    const official = driver(`process.stdout.write(${JSON.stringify(stdout)});process.stderr.write(${JSON.stringify(stderr)});process.exitCode=1`,
      (...args) => { calls++; return runOfficialProcess(...args); });
    await main(["start", "--project", project, "--delivery", delivery], {
      official, snapshotOptions: { settleMilliseconds: 0 }, emit: value => { output = value; },
    });
    t.after(() => rm(output.feedbackRun, { recursive: true, force: true }));
    assert.equal(output.officialInvocation, "error");
    assert.equal(output.officialResult.status, "unknown");
    assert.equal(output.officialDiagnostic.exitCode, 1);
    assert.equal(output.officialDiagnostic.errorCode, "device_feedback_official_failed");
    assert.doesNotMatch(JSON.stringify(output), /private account|private token|exceeded limit/u);
    const saved = await loadFeedbackRun(output.feedbackRun);
    assert.equal(path.dirname(output.officialDiagnostic.path), saved.generation.directory);
    assert.deepEqual(saved.official.diagnostic, output.officialDiagnostic);
    const diagnostic = await receipt(output.officialDiagnostic);
    assert.equal(diagnostic.stdout.toString(), stdout);
    assert.equal(diagnostic.stderr.toString(), stderr);
    assert.equal(diagnostic.truncated, false);
    assert.equal(diagnostic.retainedBytes, Buffer.byteLength(stdout + stderr));
    assert.throws(() => assertOfficialOutcomeResolved(saved.official), /official_outcome_unknown_no_replay/u);
    for (const args of [
      ["bind", "--feedback", output.feedbackRun, "--confirm", "official_update_completed"],
      ["refresh", "--feedback", output.feedbackRun, "--delivery", delivery],
      ["preview", "--feedback", output.feedbackRun],
    ]) await assert.rejects(main(args, { official, emit: () => {} }), /official_outcome_unknown_no_replay/u);
    assert.equal(calls, 1);
  }
});

test("successful pending output retains its private receipt through the original task's result", async (t) => {
  const project = await sourceFixture(t);
  let output;
  await main(["start", "--project", project, "--delivery", "auto"], {
    official: driver('process.stdout.write(JSON.stringify({status:"pending",taskId:"original-task",taskType:"preview",token:"private token"}));process.stderr.write("private stderr")'),
    snapshotOptions: { settleMilliseconds: 0 }, emit: value => { output = value; },
  });
  t.after(() => rm(output.feedbackRun, { recursive: true, force: true }));
  assert.equal(output.officialInvocation, "pending");
  assert.equal(output.officialDiagnostic.exitCode, 0);
  assert.equal(output.officialDiagnostic.errorCode, null);
  assert.doesNotMatch(JSON.stringify(output), /private token|private stderr/u);
  const diagnostic = await receipt(output.officialDiagnostic);
  assert.match(diagnostic.stdout.toString(), /private token/u);
  assert.equal(diagnostic.stderr.toString(), "private stderr");
  await withFeedbackRun(output.feedbackRun,
    run => recordOfficialTaskResult(run, "original-task", { status: "success" }));
  const saved = await loadFeedbackRun(output.feedbackRun);
  assert.equal(saved.official.disposition, "completed");
  assert.deepEqual(saved.official.diagnostic, output.officialDiagnostic);
});

test("ordinary legacy QR validation keeps its process receipt and does not expose stderr", async (t) => {
  const project = await sourceFixture(t);
  let output;
  await main(["start", "--project", project], {
    official: driver(`
      const fs=require("node:fs");
      const qr=process.argv[process.argv.indexOf("--qr-output")+1];
      fs.writeFileSync(qr,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(120)]));
      process.stdout.write("ordinary preview complete");
      process.stderr.write("private QR detail");
    `),
    snapshotOptions: { settleMilliseconds: 0 }, emit: value => { output = value; },
  });
  t.after(() => rm(output.feedbackRun, { recursive: true, force: true }));
  assert.equal(output.officialInvocation, "qr_ready");
  await access(output.qrCode);
  assert.doesNotMatch(JSON.stringify(output), /private QR detail/u);
  assert.equal((await receipt(output.officialDiagnostic)).stderr.toString(), "private QR detail");
  assert.deepEqual((await loadFeedbackRun(output.feedbackRun)).official.diagnostic, output.officialDiagnostic);
});

test("runner preserves Buffer stdout compatibility and unique receipts for repeated explicit calls", async (t) => {
  const target = await directory(t);
  const official = driver('process.stdout.write(JSON.stringify({success:true}));process.stderr.write("private stderr")');
  const first = await official.autoPreview(target, path.join(target, "info"), undefined, target);
  assert.ok(Buffer.isBuffer(first));
  assert.deepEqual(JSON.parse(first), { success: true });
  const initial = classifyOfficialPreviewResult(first);
  const next = await invokeOfficial({ directory: target, project: target }, {}, official);
  assert.notEqual(initial.diagnostic.path, next.diagnostic.path);
  assert.equal(initial.disposition, "completed");
  assert.equal(next.disposition, "completed");
  assert.equal((await receipt(initial.diagnostic)).stderr.toString(), "private stderr");
  assert.equal((await receipt(next.diagnostic)).stderr.toString(), "private stderr");
});

test("combined output limits retain the exact bounded prefix and timeout retains prior output", async (t) => {
  const target = await directory(t);
  for (const [name, script, options, expectedError] of [
    ["limit", 'process.stdout.write("a".repeat(512));process.stderr.write("b".repeat(512))', { maxBytes: 128 }, "official_output_limit"],
    ["timeout", 'process.stderr.write("private timeout detail");setInterval(()=>{},1000)', { timeout: 1000 }, "official_timeout"],
  ]) {
    let failure;
    try {
      await runOfficialProcess(process.execPath, ["-e", script], {
        ...options, diagnosticPath: path.join(target, `${name}.json`),
      });
    } catch (error) { failure = error; }
    assert.equal(failure.message, `device_feedback_${expectedError}`);
    const official = officialPreviewError(failure);
    assert.equal(official.disposition, "error");
    assert.equal(official.result.status, "unknown");
    assert.doesNotMatch(JSON.stringify(official), /private timeout detail/u);
    const diagnostic = await receipt(official.diagnostic);
    assert.equal(diagnostic.stdout.length + diagnostic.stderr.length, diagnostic.retainedBytes);
    assert.ok(diagnostic.retainedBytes <= diagnostic.maxBytes);
    if (name === "limit") {
      assert.equal(diagnostic.retainedBytes, 128);
      assert.equal(diagnostic.truncated, true);
      assert.ok(diagnostic.observedBytes > diagnostic.retainedBytes);
    } else assert.equal(diagnostic.stderr.toString(), "private timeout detail");
  }
});

test("a diagnostic file failure occurs before invocation and cannot replay a remote effect", async (t) => {
  const target = await directory(t);
  const marker = path.join(target, "must-not-exist");
  const official = driver(`require("node:fs").writeFileSync(${JSON.stringify(marker)},"invoked")`);
  const result = await invokeOfficial({ directory: path.join(target, "missing"), project: target }, {}, official);
  assert.equal(result.disposition, "manual_required");
  assert.equal(result.result.status, "not_invoked");
  await assert.rejects(access(marker));
});
