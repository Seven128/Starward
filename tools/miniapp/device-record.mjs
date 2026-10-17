import { randomBytes } from "node:crypto";
import { fail, screenGestureArguments } from "./device-adb.mjs";

const DEFAULT_RECORD_SECONDS = 6;
const BYTE_LIMIT = 16 * 1024 * 1024;

/** A single reviewed gesture, using the existing input and transport owner.
 * Keep media private; a recording is not a timing/performance verdict. */
export async function recordDeviceGesture(device, action, values, capture, options) {
  return recordMiniappClip(device, { action, values }, capture, options);
}

/** Read-only observation uses the same bounded, foreground-guarded recorder. */
export async function recordDeviceScreen(device, capture, options) {
  return recordMiniappClip(device, null, capture, options);
}

async function recordMiniappClip(device, gesture, capture, { seconds = DEFAULT_RECORD_SECONDS } = {}) {
  // At the fixed 8 Mbps bitrate this also fits the existing 16 MiB transfer
  // bound. Keep longer observations explicit; never extend a live recording.
  if (!Number.isInteger(seconds) || seconds < 6 || seconds > 15) fail("recording_duration_invalid");
  if ((capture.permissionScope ?? "none") !== "none") fail("recording_scope_invalid");
  if (gesture) screenGestureArguments(gesture.action, gesture.values, capture.size);
  const { width, height } = capture.size;
  if (![width, height].every(value => Number.isInteger(value) && value > 0 && value <= 10000 && value % 2 === 0))
    fail("recording_size_invalid");
  if (await device.foreground() !== capture.activity) fail("foreground_changed");

  const directory = `/data/local/tmp/starward-miniapp-clip-${randomBytes(12).toString("hex")}`;
  // All shell values are generated fixed literals or validated dimensions.
  // A fresh private directory and EXIT/HUP trap own the exact temporary file.
  // The native time limit also bounds recording after a host loss. Unlink
  // before transfer; never recursively delete or use shared media storage.
  const script = `umask 077
mkdir ${directory} || exit 1
recorder=
cleanup() {
  if [ -n "$recorder" ]; then kill -INT "$recorder" 2>/dev/null; wait "$recorder" 2>/dev/null; fi
  rm -f ${directory}/clip.mp4
  rmdir ${directory}
}
trap cleanup EXIT HUP INT TERM
screenrecord --size ${width}x${height} --bit-rate 8000000 --time-limit ${seconds} ${directory}/clip.mp4 >/dev/null 2>&1 &
recorder=$!
printf "%s\\n" "$recorder"
wait "$recorder"
status=$?
recorder=
[ "$status" -eq 0 ] || exit "$status"
exec 3< ${directory}/clip.mp4 || exit 1
rm -f ${directory}/clip.mp4 && rmdir ${directory} || exit 1
trap - EXIT HUP INT TERM
cat <&3`;

  let pid, prefix = Buffer.alloc(0), done = false, recordingError, scopeError;
  let readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  const earliestEnd = performance.now() + seconds * 1000;
  const gestureMs = gesture?.action === "swipe" ? gesture.values[4] : 0;
  const recording = device.command(["exec-out", "sh", "-c", script], {
    timeout: (seconds + 5) * 1000, maxBytes: BYTE_LIMIT,
    onStdout(chunk) {
      if (pid) return;
      prefix = Buffer.concat([prefix, chunk]);
      const end = prefix.indexOf(10);
      if (end < 0) { if (prefix.length > 16) fail("recording_start_invalid"); return; }
      const text = prefix.subarray(0, end).toString("ascii").trim();
      if (!/^[1-9][0-9]{0,7}$/.test(text)) fail("recording_start_invalid");
      pid = text; prefix = Buffer.alloc(0); readyResolve();
    },
  }).then(bytes => { done = true; if (!pid) readyReject(new Error("device_test_recording_start_invalid")); return bytes; }, error => {
    done = true; recordingError = error; readyReject(error); return null;
  });

  const stopOwnedRecorder = async () => {
    if (!pid || done) return;
    // PID reuse cannot authorize a different process: the unique private
    // destination must still appear as a complete argument of screenrecord.
    const command = (await device.command(["exec-out", "cat", `/proc/${pid}/cmdline`])).toString().split("\0");
    if (command[0]?.split("/").at(-1) === "screenrecord" && command.includes(`${directory}/clip.mp4`))
      await device.command(["shell", "kill", "-INT", pid]);
  };
  let monitor;
  try {
    await ready;
    monitor = (async () => {
      while (!done) {
        await device.wait(250);
        if (done) break;
        try {
          if (await device.foreground() !== capture.activity) fail("foreground_changed");
        } catch (error) {
          scopeError = error;
          await stopOwnedRecorder().catch(() => {});
          break;
        }
      }
    })();
    if (gesture) {
      // Leave a brief initial still frame for inspecting the gesture's effect.
      // Read-only capture does not add a dummy input or touch the input owner.
      await device.wait(800);
      if (scopeError) throw scopeError;
      if (done) throw recordingError ?? new Error("device_test_recording_ended_before_input");
      await device.input(gesture.action, gesture.values, capture, { beforeSend() {
        if (scopeError) throw scopeError;
        // Slow transport checks must not send an action after capture ended.
        if (done || performance.now() + gestureMs + 250 >= earliestEnd)
          throw recordingError ?? new Error("device_test_recording_ended_before_input");
      } });
    }
    const bytes = await recording;
    await monitor;
    if (scopeError) throw scopeError;
    if (recordingError) throw recordingError;
    const screenshot = await device.screenshot();
    if (screenshot.activity !== capture.activity) fail("foreground_changed");
    if (screenshot.size.width !== width || screenshot.size.height !== height) fail("display_changed");
    const offset = bytes.indexOf(10) + 1;
    const video = bytes.subarray(offset);
    if (video.length < 32 || video.toString("ascii", 4, 8) !== "ftyp") fail("recording_invalid");
    return { bytes: video, screenshot, requestedSeconds: seconds };
  } finally {
    if (!done) await stopOwnedRecorder().catch(() => {});
    await recording;
    await monitor;
  }
}
