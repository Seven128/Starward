import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import automator from "miniprogram-automator";

const endpoint = process.env.STARWARD_WEAPP_AUTOMATION_ENDPOINT ?? "ws://127.0.0.1:9421";
const outputDirectory = process.argv[2];
const mini = await automator.launcher.connectTool({ wsEndpoint: endpoint });
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function screenshot(name) {
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
  await mini.navigateTo("/content/plan/edit/index?new=1&spotId=spot%3Asz-astronomical-observatory");
  await wait(1200);
  let page = await mini.currentPage();
  const eventPicker = await requireElement(page, ".plan-event-picker");
  await mini.pageScrollTo(1500);
  await wait(500);
  evidence.push({ step: "plan-editor", path: page.path, screenshot: await screenshot("01-plan-event-picker") });
  await eventPicker.tap();
  await wait(700);
  const modal = await requireElement(page, ".event-modal");
  const radios = await page.$$(".event-modal__radio");
  const confirm = await requireElement(page, ".event-modal__confirm");
  evidence.push({
    step: "plan-select-one",
    modalClass: await modal.attribute("class"),
    radioCount: radios.length,
    confirmCount: (await page.$$(".event-modal__confirm")).length,
    screenshot: await screenshot("02-plan-event-modal"),
  });
  await radios[0].tap();
  await confirm.tap();
  await wait(500);
  evidence.push({
    step: "plan-confirm-temporary",
    modalCount: (await page.$$(".event-modal")).length,
    selectedCount: (await page.$$(".plan-event-selection")).length,
    screenshot: await screenshot("03-plan-event-confirmed"),
  });

  await mini.reLaunch("/content/contribution/index");
  await wait(900);
  page = await mini.currentPage();
  const tabs = await page.$$(".selection-tabs__item");
  if (tabs.length < 2) throw new Error(`expected shared tabs, got ${tabs.length}`);
  const beforeTransform = await (await tabs[0].$(".selection-tabs__label")).style("transform");
  const transitionDuration = await (await tabs[0].$(".selection-tabs__label")).style("transition-duration");
  await tabs[1].tap();
  await wait(260);
  const activeTabs = await page.$$(".selection-tabs__item--active");
  const afterTransform = await (await tabs[1].$(".selection-tabs__label")).style("transform");
  evidence.push({
    step: "shared-tabs",
    tabCount: tabs.length,
    activeCount: activeTabs.length,
    beforeTransform,
    afterTransform,
    transitionDuration,
    screenshot: await screenshot("04-shared-tabs"),
  });
  await mini.reLaunch("/pages/map/index");
  process.stdout.write(`${JSON.stringify({ ok: true, evidence })}\n`);
} finally {
  mini.disconnect();
}
