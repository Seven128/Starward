import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import automator from "miniprogram-automator";

const endpoint = process.env.STARWARD_WEAPP_AUTOMATION_ENDPOINT ?? "ws://127.0.0.1:9421";
const outputDirectory = process.argv[2];
const mini = await automator.launcher.connectTool({ wsEndpoint: endpoint });
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function screenshot(name) {
  if (!outputDirectory) return null;
  const destination = path.join(outputDirectory, `${name}.png`);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(destination, Buffer.from(await mini.screenshot(), "base64"));
  return destination;
}

async function requireElement(page, selector) {
  const element = await page.$(selector);
  if (!element) throw new Error(`missing selector: ${selector}`);
  return element;
}

const evidence = [];
try {
  await mini.checkVersion();
  await mini.reLaunch("/pages/map/index");
  await wait(900);
  let page = await mini.currentPage();
  evidence.push({ step: "map", path: page.path, screenshot: await screenshot("01-map") });

  await (await requireElement(page, ".map-tool--layer")).tap();
  await wait(450);
  const terrain = await requireElement(page, ".map-layer-sheet__choice--terrain");
  evidence.push({
    step: "layer-sheet",
    sheetCount: (await page.$$(".map-layer-sheet")).length,
    terrainClass: await terrain.attribute("class"),
    screenshot: await screenshot("02-layer-sheet"),
  });
  if (String(await terrain.attribute("class")).includes("map-layer-sheet__choice--active")) {
    await terrain.tap();
    await wait(350);
  }
  await terrain.tap();
  await wait(900);
  evidence.push({
    step: "terrain-toggle",
    terrainClass: await terrain.attribute("class"),
    terrainState: await (await requireElement(page, ".map-layer-sheet__terrain-state")).text(),
    screenshot: await screenshot("03-layer-terrain-toggled"),
  });
  await (await requireElement(page, ".map-tool--layer")).tap();
  await wait(450);

  const eventTrigger = await requireElement(page, ".map-tool--event");
  await eventTrigger.tap();
  await wait(900);
  const modalShell = await requireElement(page, ".event-modal__shell");
  const modalBackground = await modalShell.style("background-color");
  if (!modalBackground || modalBackground === "rgba(0, 0, 0, 0)") {
    throw new Error(`event modal shell is transparent: ${String(modalBackground)}`);
  }
  evidence.push({
    step: "event-list",
    modalCount: (await page.$$(".event-modal")).length,
    rowCount: (await page.$$(".event-modal__row-main")).length,
    modalBackground,
    screenshot: await screenshot("04-event-list"),
  });
  const firstEvent = await requireElement(page, ".event-modal__row-main");
  await firstEvent.tap();
  await wait(500);
  evidence.push({
    step: "event-detail",
    detailCount: (await page.$$(".event-modal-detail")).length,
    screenshot: await screenshot("05-event-detail"),
  });
  await (await requireElement(page, ".event-modal__icon-button")).tap();
  await wait(400);
  const closeButtons = await page.$$(".event-modal__icon-button");
  await closeButtons.at(-1).tap();
  await wait(500);
  evidence.push({ step: "event-close", modalCount: (await page.$$(".event-modal")).length });

  await mini.switchTab("/pages/my/index");
  await wait(900);
  page = await mini.currentPage();
  evidence.push({ step: "my", path: page.path, screenshot: await screenshot("06-my") });
  await mini.switchTab("/pages/map/index");
  await wait(500);
  evidence.push({ step: "map-return", path: (await mini.currentPage()).path });
  process.stdout.write(`${JSON.stringify({ ok: true, evidence })}\n`);
} finally {
  mini.disconnect();
}
