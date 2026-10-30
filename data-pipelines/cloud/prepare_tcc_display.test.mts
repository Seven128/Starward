import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { spawn, type ChildProcess } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { displayRasterWindowForBounds } from "@starward/coordinate-system";
import { createCloudPublicationFixture } from "../../workers/miniapp-api/src/test-fixtures/cloud-publication-fixture.ts";
import { cloudDisplayProcessorHashes, prepareCloudDisplayWindows } from "./prepare_tcc_display.mts";
import { CloudDisplayDeadline, CloudDisplayExecution, type CloudDisplayProcessLauncher } from "./cloud-display-execution.mts";
import { CloudDisplayOutput } from "./cloud-display-output.mts";

const window = displayRasterWindowForBounds({ west: 113.01, east: 113.08, south: 22.92, north: 22.99 });
const at = "2026-10-27T01:17:23.456Z";
const execution = (milliseconds = 30_000) => ({
  deadlineAt: new Date(Date.now() + milliseconds).toISOString(),
  maximumConcurrent: 1, maximumQueued: 2, maximumOutputBytes: 4 * 1024 * 1024,
});
async function temporary() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "starward-cloud-execution-test-"));
  return { directory, async dispose() {
    const target = path.resolve(directory);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert(path.basename(target).startsWith("starward-cloud-execution-test-"));
    await rm(target, { recursive: true, force: true });
  } };
}

test("an expired batch stops before producing files or a complete inventory", async () => {
  const source = await createCloudPublicationFixture(), output = await temporary();
  try {
    const directory = path.join(output.directory, "expired");
    await assert.rejects(prepareCloudDisplayWindows({ ...source, output: directory, windows: [window], selectedTimes: [at],
      execution: execution(-1) }), /cloud_display_deadline_exceeded/u);
    await assert.rejects(access(directory), /ENOENT/u);
  } finally { await source.dispose(); await output.dispose(); }
});

async function waitForFile(file: string) {
  const end = Date.now() + 5_000;
  while (Date.now() < end) {
    if (await access(file).then(() => true, () => false)) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw Error("controlled worker did not enter its CPU operation");
}

function firstBusyProcess(marker: string) {
  const children: ChildProcess[] = [];
  let firstClosed = false, replacementAfterClose = false;
  const launch: CloudDisplayProcessLauncher = (file, args, options) => {
    assert.equal(options.windowsHide, true);
    if (children.length > 0) replacementAfterClose = firstClosed;
    const code = "const fs=require('node:fs'); process.on('message',m=>{"
      + "if(m.type==='init')process.send({type:'ready'});"
      + "if(m.type==='render'){fs.writeFileSync(" + JSON.stringify(marker) + ",'entered');while(true){Math.sqrt(2);}}"
      + "});";
    const child = children.length === 0 ? spawn(file, ["--eval", code], options) : spawn(file, args, options);
    children.push(child);
    if (children.length === 1) child.once("close", () => { firstClosed = true; });
    return child;
  };
  return { launch, children, get firstClosed() { return firstClosed; },
    get replacementAfterClose() { return replacementAfterClose; } };
}

test("same-key readers share, one can cancel, and replacement waits for actual process close", { timeout: 15_000 }, async () => {
  const source = await createCloudPublicationFixture(), temp = await temporary();
  const marker = path.join(temp.directory, "entered"), controlled = firstBusyProcess(marker);
  const owner = new CloudDisplayExecution({ directory: source.directory, manifestSha256: source.manifestSha256,
    codeHashes: await cloudDisplayProcessorHashes() }, { ...execution(), maximumQueued: 1 }, controlled.launch);
  try {
    const a = new AbortController(), b = new AbortController();
    const first = owner.run(window, at, a.signal); void first.catch(() => undefined);
    const shared = owner.run(window, "2026-10-27T09:17:23.456+08:00", b.signal); void shared.catch(() => undefined);
    await waitForFile(marker);
    a.abort(Error("first_reader_cancelled"));
    await assert.rejects(first, /first_reader_cancelled/u);
    assert.equal(controlled.firstClosed, false, "the remaining reader still owns the busy process");
    assert.equal(controlled.children.length, 1);
    const queued = owner.run(window, "2026-10-27T01:30:00Z"); void queued.catch(() => undefined);
    await assert.rejects(owner.run(window, "2026-10-27T01:45:00Z"), /render_queue_full/u);
    b.abort(Error("last_reader_cancelled"));
    await assert.rejects(shared, /last_reader_cancelled/u);
    const replacement = owner.run(window, at);
    const [otherTime, sameTime] = await Promise.all([queued, replacement]);
    assert.equal(controlled.replacementAfterClose, true, "no replacement child starts before the previous close");
    assert.equal(otherTime.proof.selectedAt, "2026-10-27T01:30:00Z");
    assert.equal(sameTime.proof.selectedAt, at);
    assert(sameTime.png.length > 0 && sameTime.proof.validPixels > 0);
    await owner.close();
    const observed = owner.observation();
    assert.equal(observed.processStarts, 2); assert.equal(observed.processExits, 2);
    assert.equal(observed.peakProcesses, 1); assert.equal(observed.liveProcesses, 0);
    assert.equal(observed.completed, 2); assert.equal(observed.geometryReuses, 1);
    assert.equal(observed.cpuMeasurementComplete, false, "a killed child has no complete final CPU report");
  } finally { await owner.close(); await source.dispose(); await temp.dispose(); }
});

test("the absolute deadline stops synchronous CPU work and close waits for physical exit", { timeout: 10_000 }, async () => {
  const source = await createCloudPublicationFixture(), temp = await temporary();
  const marker = path.join(temp.directory, "entered"), controlled = firstBusyProcess(marker);
  const owner = new CloudDisplayExecution({ directory: source.directory, manifestSha256: source.manifestSha256,
    codeHashes: await cloudDisplayProcessorHashes() }, execution(1_500), controlled.launch);
  try {
    const result = owner.run(window, at); void result.catch(() => undefined);
    await waitForFile(marker);
    await assert.rejects(result, /cloud_display_deadline_exceeded/u);
    await owner.close();
    assert.equal(controlled.firstClosed, true);
    assert.equal(owner.observation().liveProcesses, 0);
    assert.equal(owner.observation().processExits, 1);
    assert.equal(owner.observation().completed, 0);
  } finally { await owner.close(); await source.dispose(); await temp.dispose(); }
});

test("a returned image cannot certify a process that exits before its normal drain", { timeout: 10_000 }, async () => {
  const source = await createCloudPublicationFixture();
  let imageReturned = false;
  const launch: CloudDisplayProcessLauncher = (file, args, options) => {
    const child = spawn(file, args, options);
    child.on("message", (message: { type?: string }) => {
      if (message.type === "rendered") { imageReturned = true; child.kill("SIGKILL"); }
    });
    return child;
  };
  const owner = new CloudDisplayExecution({ directory: source.directory, manifestSha256: source.manifestSha256,
    codeHashes: await cloudDisplayProcessorHashes() }, execution(), launch);
  try {
    const result = await owner.run(window, at);
    assert(imageReturned && result.png.length > 0 && result.proof.validPixels > 0);
    await owner.close();
    const observed = owner.observation();
    assert.equal(observed.processExits, 1); assert.equal(observed.liveProcesses, 0);
    assert.equal(observed.cpuMeasurementComplete, false);
    assert.equal(observed.measuredExits, 0, "an abnormal physical exit cannot certify successful drain coverage");
  } finally { await owner.close(); await source.dispose(); }
});

test("real sequential preparation reuses geometry and charges retained residue before a retry", { timeout: 15_000 }, async () => {
  const source = await createCloudPublicationFixture(), temp = await temporary();
  try {
    const directory = path.join(temp.directory, "complete"), budget = execution();
    const result = await prepareCloudDisplayWindows({ directory: source.directory, manifestSha256: source.manifestSha256,
      output: directory, windows: [window], selectedTimes: [at, "2026-10-27T01:30:00Z"], execution: budget });
    assert.equal(result.results.length, 2); assert.equal(result.execution.processStarts, 1);
    assert.equal(result.execution.processExits, 1); assert.equal(result.execution.liveProcesses, 0);
    assert.equal(result.execution.geometryReuses, 1); assert.equal(result.cleanup.lockReleased, true);
    assert.equal(result.execution.cpuMeasurementComplete, true); assert(result.cpuSeconds! > 0);
    assert(result.execution.cpuSeconds > 0 && result.parentCpuSeconds > 0);
    const first = result.results[0]!;
    const proofBytes = (await stat(path.join(directory, first.file + ".json"))).size;
    const partial = path.join(temp.directory, "partial"), maximumOutputBytes = first.bytes + proofBytes + 64;
    await assert.rejects(prepareCloudDisplayWindows({ directory: source.directory, manifestSha256: source.manifestSha256,
      output: partial, windows: [window], selectedTimes: [at], execution: { ...execution(), maximumOutputBytes } }), /output_budget_exceeded/u);
    await assert.rejects(access(path.join(partial, "inventory.json")), /ENOENT/u);
    const names = await readdir(partial);
    assert.deepEqual(names.sort(), [first.file, first.file + ".json"].sort(), "successful partial files are preserved, no complete inventory");
    const before = await Promise.all(names.map(name => readFile(path.join(partial, name))));
    const bytes = before.reduce((total, value) => total + value.length, 0);
    await assert.rejects(prepareCloudDisplayWindows({ directory: source.directory, manifestSha256: source.manifestSha256,
      output: partial, windows: [window], selectedTimes: [at], execution: { ...execution(), maximumOutputBytes: bytes - 1 } }), /output_budget_exceeded/u);
    assert.deepEqual(await readdir(partial), names);
    assert.deepEqual(await Promise.all(names.map(name => readFile(path.join(partial, name)))), before);
    const retained = await Promise.all((await readdir(directory)).map(name => stat(path.join(directory, name))));
    assert.equal(result.retainedOutput.bytes, retained.reduce((sum, file) => sum + file.size, 0));
  } finally { await source.dispose(); await temp.dispose(); }
});

test("an output lock stays exclusive and a changed lock never becomes a successful cleanup", async () => {
  const temp = await temporary();
  const owner = await CloudDisplayOutput.open(temp.directory, 4 * 1024 * 1024, new CloudDisplayDeadline(execution().deadlineAt));
  try {
    await assert.rejects(CloudDisplayOutput.open(temp.directory, 4 * 1024 * 1024, new CloudDisplayDeadline(execution().deadlineAt)), /output_busy/u);
    const lock = path.join(temp.directory, ".cloud-display-output.lock");
    await writeFile(lock, "another owner");
    assert.deepEqual(await owner.release(), { lockReleased: false });
    assert.deepEqual(await owner.release(), { lockReleased: false });
    assert.equal(await readFile(lock, "utf8"), "another owner");
  } finally { await owner.release(); await temp.dispose(); }
});

test("failed source reads retire the process and cannot seal a batch", { timeout: 10_000 }, async () => {
  const source = await createCloudPublicationFixture(), temp = await temporary();
  try {
    // Corrupt the nonzero upper frame without weakening its pinned digest.
    await writeFile(path.join(source.directory, source.manifest.frames[1]!.values.file), Buffer.alloc(16));
    const output = path.join(temp.directory, "failed");
    await assert.rejects(prepareCloudDisplayWindows({ directory: source.directory, manifestSha256: source.manifestSha256,
      output, windows: [window], selectedTimes: [at], execution: execution() }), /cloud_publication_file_integrity_invalid/u);
    await assert.rejects(access(path.join(output, "inventory.json")), /ENOENT/u);
    assert.deepEqual(await readdir(output), []);
  } finally { await source.dispose(); await temp.dispose(); }
});
