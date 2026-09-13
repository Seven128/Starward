import automator from "miniprogram-automator";

const mini = await automator.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9421" });
try {
  if (process.argv.includes("--reload")) {
    await mini.reLaunch("/pages/map/index");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const page = await mini.currentPage();
  if (process.argv.includes("--open-event")) {
    await (await page.$(".map-tool--event"))?.tap();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const containers = await page.$$("page-container");
  const values = [];
  for (const element of containers) {
    values.push({
      show: await element.attribute("show"),
      style: await element.attribute("custom-style"),
      outer: await element.outerWxml(),
    });
  }
  console.log(JSON.stringify({ path: page.path, count: containers.length, values }));
} finally {
  mini.disconnect();
}
