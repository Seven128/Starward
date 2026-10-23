import test from "node:test";
import assert from "node:assert/strict";
import { recordDeviceGesture, recordDeviceScreen } from "./device-record.mjs";
import { AdbDevice } from "./device-adb.mjs";

const capture = { activity: "com.tencent.mm/.plugin.appbrand.ui.AppBrandUI", permissionScope: "none", size: { width: 1080, height: 2400 } };
const video = Buffer.alloc(64);
video.writeUInt32BE(24, 0); video.write("ftypisom", 4, "ascii");

function recordingDriver({ drift = false, reusedPid = false, startFails = false, displayChanges = false, captureOnly = false } = {}) {
  let inputSent = false, recordingStarted = false, directory, finish;
  const inputs = [], kills = [], calls = [];
  const device = {
    wait: ms => new Promise(resolve => setTimeout(resolve, ms === 800 ? 10 : 5)),
    async foreground() { return drift && (inputSent || captureOnly && recordingStarted) ? "unrelated.activity" : capture.activity; },
    async input(action, values, observed, options) {
      options?.beforeSend?.();
      inputs.push({ action, values, observed }); inputSent = true;
      setTimeout(() => finish(Buffer.concat([Buffer.from("4712\n"), video])), 30);
    },
    async screenshot() { return { activity: capture.activity, size: { ...capture.size, ...(displayChanges ? { width: 2400, height: 1080 } : {}) }, bytes: Buffer.from("private screenshot") }; },
    async command(args, options) {
      calls.push(args);
      if (args[0] === "exec-out" && args[1] === "sh") {
        if (startFails) throw new Error("device_test_tool_failed");
        directory = args[3].match(/\/data\/local\/tmp\/starward-miniapp-clip-[a-f0-9]{24}/)?.[0];
        assert.ok(directory);
        options.onStdout(Buffer.from("4712\n"));
        return new Promise(resolve => {
          finish = resolve; recordingStarted = true;
          if (captureOnly) setTimeout(() => finish(Buffer.concat([Buffer.from("4712\n"), video])), 30);
        });
      }
      if (args[0] === "exec-out" && args[1] === "cat")
        return Buffer.from(reusedPid ? "unrelated-process\0private-file\0" : ["screenrecord", "--time-limit", "6", `${directory}/clip.mp4`, ""].join("\0"));
      if (args[0] === "shell" && args[1] === "kill") {
        kills.push(args); finish(Buffer.concat([Buffer.from("4712\n"), video])); return Buffer.alloc(0);
      }
      throw new Error("unexpected_fixture_command");
    },
  };
  return { device, inputs, kills, calls };
}

test("a recording sends the reviewed gesture through the existing input owner and returns matching private media", async () => {
  const fixture = recordingDriver();
  const values = [.3,.4,.7,.4,1000];
  const result = await recordDeviceGesture(fixture.device, "swipe", values, capture);
  assert.deepEqual(fixture.inputs, [{ action: "swipe", values, observed: capture }]);
  assert.deepEqual(result.bytes, video);
  assert.equal(result.requestedSeconds, 6);
  assert.deepEqual(result.screenshot.size, capture.size);
  assert.equal(fixture.kills.length, 0);
});

test("read-only recording returns current private media without sending any input", async () => {
  const fixture=recordingDriver({captureOnly:true});
  const result=await recordDeviceScreen(fixture.device,capture);
  assert.deepEqual(result.bytes,video);
  assert.equal(result.requestedSeconds,6);
  assert.deepEqual(fixture.inputs,[]);
  assert.deepEqual(fixture.kills,[]);
});

test("an explicit longer clip stays within the native deadline and transfer bound", async () => {
  const fixture = recordingDriver();
  const command = fixture.device.command.bind(fixture.device);
  fixture.device.command = async (args, options) => {
    if (args[0] === "exec-out" && args[1] === "sh") {
      assert.match(args[3], /--time-limit 15 /);
      assert.equal(options.timeout, 20_000);
      assert.equal(options.maxBytes, 16 * 1024 * 1024);
    }
    return command(args, options);
  };
  const result = await recordDeviceGesture(fixture.device, "tap", [.5, .5], capture, { seconds: 15 });
  assert.equal(result.requestedSeconds, 15);
  assert.equal(fixture.inputs.length, 1);
  assert.deepEqual(result.bytes, video);
  for (const seconds of [5, 16, 6.5, NaN, Infinity, "15"]) {
    const forbidden = recordingDriver({ captureOnly: true });
    await assert.rejects(recordDeviceScreen(forbidden.device, capture, { seconds }), /recording_duration_invalid/);
    assert.equal(forbidden.calls.length, 0);
    assert.equal(forbidden.inputs.length, 0);
  }
});

test("read-only recording still rejects permission scopes and discards foreground or display drift", async () => {
  const forbidden=recordingDriver({captureOnly:true});
  await assert.rejects(recordDeviceScreen(forbidden.device,{...capture,permissionScope:'settings'}),/recording_scope_invalid/);
  assert.equal(forbidden.calls.length,0);
  for(const options of [{drift:true},{displayChanges:true}]){
    const fixture=recordingDriver({captureOnly:true,...options});
    await assert.rejects(recordDeviceScreen(fixture.device,capture),options.drift?/foreground_changed/:/display_changed/);
    assert.deepEqual(fixture.inputs,[]);
  }
});

test("permission scopes and invalid gestures cannot start a recorder or send input", async () => {
  for (const [action, values, observed, error] of [
    ["tap", [.5,.5], { ...capture, permissionScope: "settings" }, /recording_scope_invalid/],
    ["tap", [-1,.5], capture, /coordinates_invalid/],
    ["swipe", [0,0,1,1,0], capture, /swipe_duration_invalid/],
  ]) {
    const fixture = recordingDriver();
    await assert.rejects(recordDeviceGesture(fixture.device, action, values, observed), error);
    assert.equal(fixture.calls.length, 0); assert.equal(fixture.inputs.length, 0);
  }
});

test("one sustained swipe requires an explicit clip long enough for the whole gesture", async () => {
  const values = [.3, .4, .7, .4, 8000];
  const complete = recordingDriver();
  const result = await recordDeviceGesture(complete.device, "swipe", values, capture, { seconds: 15 });
  assert.deepEqual(complete.inputs, [{ action: "swipe", values, observed: capture }]);
  assert.equal(result.requestedSeconds, 15);
  const tooShort = recordingDriver();
  await assert.rejects(recordDeviceGesture(tooShort.device, "swipe", values, capture), /recording_ended_before_input/);
  assert.equal(tooShort.inputs.length, 0);
  assert.equal(tooShort.kills.length, 1);
});

test("a recorder startup failure sends no gesture or media", async () => {
  const fixture = recordingDriver({ startFails: true });
  await assert.rejects(recordDeviceGesture(fixture.device, "tap", [.5,.5], capture), /device_test_tool_failed/);
  assert.equal(fixture.inputs.length, 0); assert.equal(fixture.kills.length, 0);
});

test("foreground drift discards the media and stops only the live owned recorder", async () => {
  const fixture = recordingDriver({ drift: true });
  await assert.rejects(recordDeviceGesture(fixture.device, "tap", [.5,.5], capture), /foreground_changed/);
  assert.equal(fixture.inputs.length, 1);
  assert.deepEqual(fixture.kills, [["shell", "kill", "-INT", "4712"]]);
});

test("a reused recorder PID cannot authorize killing another process, and a changed display cannot publish the recording", async () => {
  const reused = recordingDriver({ drift: true, reusedPid: true });
  await assert.rejects(recordDeviceGesture(reused.device, "tap", [.5,.5], capture), /foreground_changed/);
  assert.equal(reused.kills.length, 0);
  const changed = recordingDriver({ displayChanges: true });
  await assert.rejects(recordDeviceGesture(changed.device, "tap", [.5,.5], capture), /display_changed/);
});

test("a recorder that ends during the input owner's screenshot check cannot send a late gesture", async () => {
  let finish;
  const inputs = [];
  const device = new AdbDevice("fixture-adb", async (_file, args, options) => {
    const command = args.slice(2);
    if (command[0] === "exec-out" && command[1] === "sh") {
      options.onStdout(Buffer.from("4712\n"));
      return new Promise(resolve => { finish = () => resolve(Buffer.concat([Buffer.from("4712\n"), video])); });
    }
    if (command[0] === "shell" && command[1] === "input") { inputs.push(command); return Buffer.alloc(0); }
    throw new Error("unexpected_late_input_fixture_call");
  });
  device.selector = ["-s", "fixture-private"]; device.identity = "fixture-private";
  device.wait = ms => new Promise(resolve => setTimeout(resolve, ms === 800 ? 10 : 5));
  device.foreground = async () => capture.activity;
  device.screenshot = async () => {
    finish();
    await new Promise(resolve => setTimeout(resolve, 0));
    return { ...capture, bytes: Buffer.from("private screenshot") };
  };
  await assert.rejects(recordDeviceGesture(device, "tap", [.5,.5], capture), /recording_ended_before_input/);
  assert.equal(inputs.length, 0);
});
