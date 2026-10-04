// Probe whether a search row from the prior query can activate during the
// native input-to-React commit interval. Task-local DevTools development only.
import sdk from "miniprogram-automator";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

const project = process.argv[2];
const expectedMarker = process.argv[3];
const port = Number(process.argv[4]);
if (!path.isAbsolute(project ?? "")) throw new Error("absolute_project_required");
if (!/^[A-Z0-9]{6,16}$/.test(expectedMarker ?? "") || !Number.isInteger(port) || port<1024 || port>65535)
  throw new Error("candidate_marker_and_port_required");
const config = await readFile(path.join(project, "project.config.json"));
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: `ws://127.0.0.1:${port}` }), 5000);
boundWechatProtocol(program, 5000);
try {
  const page = await program.currentPage();
  if (page?.path !== "sky/detail/index") throw new Error("unexpected_page");
  if (!(await (await page.$(".sky-zoom-status"))?.outerWxml() ?? "").includes(expectedMarker))
    throw new Error("unexpected_candidate_marker");
  const input = await page.$(".sky-object-search__input");
  if (!input) throw new Error("object_search_not_open");
  await input.input("织女星");
  await new Promise(resolve => setTimeout(resolve, 700));
  const oldResult = await page.$(".sky-object-search__result");
  if (!(await oldResult?.outerWxml() ?? "").includes("Vega")) throw new Error("vega_result_not_ready");
  await input.input("木星");
  const changedAt = performance.now();
  const visibleResult = await page.$(".sky-object-search__result");
  const visibleOldVega = (await visibleResult?.outerWxml() ?? "").includes("Vega");
  let tapError = "";
  if (visibleOldVega) {
    try { await visibleResult.tap(); } catch (error) { tapError = String(error).slice(0, 100); }
  }
  const elapsedMs = Math.round(performance.now() - changedAt);
  await new Promise(resolve => setTimeout(resolve, 200));
  const inputAfter = await page.$(".sky-object-search__input");
  const inputWxml = await inputAfter?.outerWxml() ?? "";
  const modal = await page.$(".sky-object-modal__title");
  const modalTitle = await modal?.text() ?? "";
  const after = await program.currentPage();
  if (after?.pageId !== page.pageId || after.path !== page.path ||
      !(await (await after.$(".sky-zoom-status"))?.outerWxml() ?? "").includes(expectedMarker) ||
      !(await readFile(path.join(project, "project.config.json"))).equals(config))
    throw new Error("observation_identity_changed");
  console.log(JSON.stringify({ scope: "development_observation", channel: "official_miniprogram_sdk",
    candidateMarker: expectedMarker, port,
    tapElapsedMs: elapsedMs, visibleOldVega, tapError: Boolean(tapError),
    newQueryVisible: inputWxml.includes('value="木星"'), oldVegaModal: modalTitle === "Vega",
    modalTitle: ["Vega", "木星"].includes(modalTitle) ? modalTitle : modalTitle ? "OTHER" : "NONE" }));
} finally {
  program.disconnect();
}
