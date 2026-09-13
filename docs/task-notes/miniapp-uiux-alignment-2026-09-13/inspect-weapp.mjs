import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import automator from "miniprogram-automator";

const endpoint = process.env.STARWARD_WEAPP_AUTOMATION_ENDPOINT ?? "ws://127.0.0.1:9420";
const output = process.argv[2];
const mini = await automator.launcher.connectTool({ wsEndpoint: endpoint });
try {
  await mini.checkVersion();
  const page = await mini.currentPage();
  const system = await mini.systemInfo();
  const selectors = [".map-page", ".map-search-shell", "#map-tool-event", "#map-tool-layers", ".spot-panel", ".event-modal"];
  const elements = [];
  for (const selector of selectors) {
    const matches = await page.$$(selector);
    elements.push({ selector, count: matches.length, sizes: await Promise.all(matches.slice(0, 4).map(item => item.size())) });
  }
  if (output) {
    const bytes = Buffer.from(await mini.screenshot(), "base64");
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, bytes, { flag: "w" });
  }
  process.stdout.write(JSON.stringify({ path: page.path, query: page.query, system: { brand: system.brand, model: system.model, platform: system.platform, screenWidth: system.screenWidth, screenHeight: system.screenHeight, windowWidth: system.windowWidth, windowHeight: system.windowHeight, pixelRatio: system.pixelRatio, SDKVersion: system.SDKVersion }, elements, screenshot: output ?? null }) + "\n");
} finally {
  mini.disconnect();
}
