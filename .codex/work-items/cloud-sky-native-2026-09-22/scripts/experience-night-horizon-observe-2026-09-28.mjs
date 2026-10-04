// Official DevTools SDK readback and screenshot fenced by this candidate's
// rendered generation marker. This is development evidence, not phone proof.
import sdk from "miniprogram-automator";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

const expectedMarker = process.argv[3] ?? "NIGHT0928";
const port = Number(process.argv[4] ?? 9428);
const candidates = {NIGHT0928:"sky-night-horizon-0928",SEARCH0928:"sky-search-0928",FLOW0928:"sky-flow-recovery-0928",LAND0928:"sky-landscape-0928",LAND2SEP28:"sky-landscape-final-0928",IMGSEP28:"sky-imagery-flow-0928"};
const ports = { NIGHT0928: 9428, SEARCH0928: 9429, FLOW0928: 9430, LAND0928: 9431, LAND2SEP28:9432, IMGSEP28:9433 };
if (ports[expectedMarker] !== port) throw new Error("unexpected_task_candidate");
const project = path.resolve(`apps/wechat-miniapp/dist/weapp-check-${candidates[expectedMarker]}`);
const output = process.argv[2];
if (!path.isAbsolute(output ?? "") || !output.endsWith(".png")) throw new Error("absolute_png_required");
const config = await readFile(path.join(project, "project.config.json"));
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: `ws://127.0.0.1:${port}` }), 5000);
boundWechatProtocol(program, 5000);
try {
  const before = await program.currentPage();
  if (before?.path !== "sky/detail/index") throw new Error("unexpected_page");
  const marker = await (await before.$(".sky-zoom-status"))?.outerWxml() ?? "";
  if (!marker.includes(expectedMarker)) throw new Error(`unexpected_candidate_marker:${marker.match(/验证 ([A-Z0-9]{6,16})/)?.[1] ?? "NONE"}`);
  const view = await (await before.$(".sky-orientation-canvas"))?.outerWxml() ?? "";
  const description = view.match(/aria-label="([^"]+)"/)?.[1] ?? "";
  const bytes = Buffer.from(await program.screenshot(), "base64");
  const after = await program.currentPage();
  const afterMarker = await (await after?.$(".sky-zoom-status"))?.outerWxml() ?? "";
  const afterDescription = await (await after?.$(".sky-orientation-canvas"))?.attribute("aria-label") ?? "";
  if (after?.pageId !== before.pageId || after.path !== before.path ||
      !afterMarker.includes(expectedMarker) ||
      afterDescription !== description || !description.includes("已呈现") ||
      !(await readFile(path.join(project, "project.config.json"))).equals(config))
    throw new Error("observation_identity_changed");
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error("not_png");
  await writeFile(output, bytes, { flag: "wx" });
  console.log(JSON.stringify({ scope: "development_observation", channel: "official_miniprogram_sdk",
    marker: expectedMarker, port, description, bytes: bytes.length,
    width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20),
    sha256: createHash("sha256").update(bytes).digest("hex") }));
} finally {
  program.disconnect();
}
