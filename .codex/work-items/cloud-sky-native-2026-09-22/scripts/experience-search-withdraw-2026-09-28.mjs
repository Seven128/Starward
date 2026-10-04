// Read the visible search consumer in this task's local DevTools candidate.
// Uses official Mini Program automator; it does not inspect or set React state.
import sdk from "miniprogram-automator";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

const project = process.argv[2];
if (!path.isAbsolute(project ?? "")) throw new Error("absolute_project_required");
const config = await readFile(path.join(project, "project.config.json"));
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9420" }), 5000);
boundWechatProtocol(program, 5000);
try {
  const page = await program.currentPage();
  if (page?.path !== "sky/detail/index") throw new Error("unexpected_page");
  const input = await page.$(".sky-object-search__input");
  if (!input) throw new Error("object_search_not_open");
  await input.input("织女星");
  await new Promise(resolve => setTimeout(resolve, 700));
  const first = await page.$(".sky-object-search__results");
  const firstWxml = await first?.outerWxml() ?? "";
  await input.input("木星");
  const changedAt = performance.now();
  const samples = [];
  for (const waitMs of [0, 60, 180, 350]) {
    if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
    const element = await page.$(".sky-object-search");
    const wxml = await element?.outerWxml() ?? "";
    samples.push({ elapsedMs: Math.round(performance.now() - changedAt),
      newInputVisible: wxml.includes('value="木星"'), oldVegaVisible: wxml.includes("Vega"),
      finding: wxml.includes("正在查找"), jupiterVisible: wxml.includes("PLANET JUPITER") });
  }
  await new Promise(resolve => setTimeout(resolve, 700));
  const settled = await page.$(".sky-object-search__results");
  const settledWxml = await settled?.outerWxml() ?? "";
  const after = await program.currentPage();
  if (after?.pageId !== page.pageId || after.path !== page.path ||
      !(await readFile(path.join(project, "project.config.json"))).equals(config))
    throw new Error("observation_identity_changed");
  console.log(JSON.stringify({ scope: "development_observation", channel: "official_miniprogram_sdk",
    firstVega: firstWxml.includes("Vega"), samples,
    settledJupiter: settledWxml.includes("木星") && settledWxml.includes("PLANET JUPITER"),
    settledOldVega: settledWxml.includes("Vega") }));
} finally {
  program.disconnect();
}
