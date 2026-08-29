import { PNG } from "pngjs";
import { fail } from "./device-adb.mjs";

// Public miniprogram-automator stdout uses qrcode-terminal's small Unicode matrix.
// Do not decode or store the URL. Translate white/black half-cells without changing it.
export function terminalQrPng(text) {
  if (typeof text !== "string" || text.length > 20000 || !/^[█▀▄ \r\n]+$/u.test(text)) fail("qr_format_unsupported");
  const lines = text.replaceAll("\r", "").replace(/\n$/u, "").split("\n");
  const count = lines[0].length - 2;
  if (count < 21 || count > 177 || (count - 21) % 4 || !/^▄+$/u.test(lines[0]) || lines.length !== 1 + Math.ceil(count / 2)) fail("qr_format_unsupported");
  if (lines.slice(1).some((line) => line.length !== count + 2 || line[0] !== "█" || line.at(-1) !== "█")) fail("qr_format_unsupported");
  const scale = 8;
  const border = 4;
  const size = (count + border * 2) * scale;
  const png = new PNG({ width: size, height: size });
  png.data.fill(255);
  for (let y = 0; y < count; y += 1) {
    for (let x = 0; x < count; x += 1) {
      const cell = lines[1 + Math.floor(y / 2)][x + 1];
      const black = cell === " " || (y % 2 === 0 ? cell === "▄" : cell === "▀");
      if (!black) continue;
      for (let dy = 0; dy < scale; dy += 1) for (let dx = 0; dx < scale; dx += 1) {
        const offset = (((y + border) * scale + dy) * size + (x + border) * scale + dx) * 4;
        png.data[offset] = png.data[offset + 1] = png.data[offset + 2] = 0;
      }
    }
  }
  return PNG.sync.write(png);
}

export const remoteStages = new Set(["sdk_connecting", "sdk_connected", "remote_requested", "remote_qr_ready", "remote_connected"]);
export function remoteDeadline(onTimeout, clock = globalThis) {
  let timer;
  return {
    enter(stage) {
      if (!remoteStages.has(stage)) fail("remote_stage_invalid");
      clock.clearTimeout(timer);
      const milliseconds = stage === "remote_qr_ready" ? 180_000 : stage === "remote_requested" ? 90_000 : 25_000;
      timer = clock.setTimeout(() => onTimeout(stage), milliseconds);
    },
    stop() { clock.clearTimeout(timer); },
  };
}
export function remoteProgressConsumer(emit) {
  let pending = "";
  return (chunk) => {
    pending += chunk.toString();
    if (pending.length > 128 * 1024) fail("remote_output_limit");
    let newline;
    while ((newline = pending.indexOf("\n")) !== -1) {
      const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
      let value;
      try { value = JSON.parse(line); } catch { continue; }
      if (remoteStages.has(value.state)) emit({ state: value.state });
    }
  };
}
