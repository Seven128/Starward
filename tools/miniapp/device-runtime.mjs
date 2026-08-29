import { fail } from "./device-adb.mjs";

export function automationEndpoint(value) {
  let url;
  try { url = new URL(value); } catch { fail("automation_endpoint_invalid"); }
  if (url.protocol !== "ws:" || url.hostname !== "127.0.0.1" || !url.port || url.pathname !== "/" || url.username || url.password || url.search || url.hash) fail("loopback_automation_endpoint_required");
  return url.href;
}
function dimension(value) { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 20000 ? value : null; }
function rectangle(value) { return Object.fromEntries(["top", "left", "right", "bottom", "width", "height"].map((key) => [key, dimension(value?.[key])])); }
function version(value) { return typeof value === "string" && /^[\w. ()-]{1,64}$/u.test(value) ? value : null; }

export async function inspectRuntime(mini, binding) {
  const info = await mini.systemInfo();
  if (!["android", "ios"].includes(info.platform)) fail("physical_runtime_required");
  const account = await mini.callWxMethod("getAccountInfoSync");
  if (account?.miniProgram?.appId !== binding.appId) fail("runtime_app_id_mismatch");
  const metrics = await mini.evaluate(() => {
    const window = wx.getWindowInfo();
    const menu = wx.getMenuButtonBoundingClientRect();
    return { width: window.windowWidth, height: window.windowHeight, statusBarHeight: window.statusBarHeight, safeArea: window.safeArea, menu };
  });
  const page = await mini.currentPage();
  const routes = ["pages/map/index", "pages/my/index", "spot/detail/index", "spot/sky/index", "content/settings/index", "content/plan/detail/index"];
  const route = routes.includes(page?.path) ? page.path : "other_route";
  const elements = {};
  let locationState = "unavailable";
  if (route === "pages/map/index") {
    for (const selector of [".map-finder-anchor", ".map-conditions-anchor", ".map-floating-tools", ".map-status"]) {
      const element = await page.$(selector);
      elements[selector] = element ? { ...rectangle(await element.offset()), ...Object.fromEntries(Object.entries(rectangle(await element.size())).filter(([key]) => ["width", "height"].includes(key))) } : null;
    }
    const root = await page.$(".map-page");
    const className = root ? await root.attribute("class") : "";
    locationState = String(className).match(/\blocation-(default-region|denied|granted)\b/u)?.[1] ?? "unavailable";
  }
  return {
    boundary: "official_remote_debug_diagnostic", acceptance: "not_evaluated",
    runtimeAppIdMatches: true, phoneBundleBytesVerified: false,
    platform: info.platform, system: version(info.system), wechatVersion: version(info.version), sdkVersion: version(info.SDKVersion),
    metrics: { width: dimension(metrics.width), height: dimension(metrics.height), statusBarHeight: dimension(metrics.statusBarHeight), safeArea: rectangle(metrics.safeArea), menu: rectangle(metrics.menu) },
    route, locationState, elements,
  };
}
