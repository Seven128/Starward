// Development observation of an explicitly selected task candidate and port.
// Official Mini Program SDK only; no phone, preview or final acceptance claim.
import sdk from "miniprogram-automator";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

// This script follows the single CLI-auto project explicitly opened by this
// task. Configuration readback fences changes; it is not a device receipt.
const project = process.argv[4];
if (!path.isAbsolute(project ?? "")) throw new Error("absolute_project_required");
const output = process.argv[2];
const expected = process.argv[3] ?? "sky/detail/index";
const expectedMarker = process.argv[5] ?? "";
const port = Number(process.argv[6]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("explicit_sdk_port_required");
if (expected === "sky/detail/index" && !/^[A-Z0-9]{6,16}$/.test(expectedMarker))
  throw new Error("sky_candidate_marker_required");
if (!path.isAbsolute(output ?? "") || !output.endsWith(".png")) throw new Error("absolute_png_required");
if (!/^[a-zA-Z0-9_/-]+$/.test(expected)) throw new Error("expected_page_required");
if (/(?:automator|\*)/i.test(process.env.DEBUG ?? "")) throw new Error("protocol_debug_not_allowed");
const config = await readFile(path.join(project, "project.config.json"));
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: `ws://127.0.0.1:${port}` }), 5000);
boundWechatProtocol(program, 5000);
try {
  await program.checkVersion();
  const before = await program.currentPage();
  if (before?.path !== expected) throw new Error("unexpected_page");
  if (expectedMarker && !(await (await before.$(".sky-zoom-status"))?.outerWxml() ?? "").includes(expectedMarker))
    throw new Error("unexpected_candidate_marker");
  const bytes = Buffer.from(await program.screenshot(), "base64");
  const after = await program.currentPage();
  if (after?.pageId !== before.pageId || after.path !== before.path ||
      (expectedMarker && !(await (await after.$(".sky-zoom-status"))?.outerWxml() ?? "").includes(expectedMarker)) ||
      !(await readFile(path.join(project, "project.config.json"))).equals(config)) throw new Error("observation_identity_changed");
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error("not_png");
  await writeFile(output, bytes, { flag: "wx" });
  console.log(JSON.stringify({ scope: "development_observation", channel: "official_miniprogram_sdk",
    path: after.path, bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20),
    candidateMarker: expectedMarker || null, port,
    sha256: createHash("sha256").update(bytes).digest("hex") }));
} finally {
  program.disconnect();
}
