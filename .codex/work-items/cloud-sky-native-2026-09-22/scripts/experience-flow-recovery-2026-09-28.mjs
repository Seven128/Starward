// Real public UI/navigation on the fenced combined candidate, with the
// simulator's actual unavailable pose stream. No mocked sensor data.
import sdk from "miniprogram-automator";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9430" }), 5000);
boundWechatProtocol(program, 5000);
async function until(read, accepts, label) {
  const end = Date.now() + 8000;
  while (Date.now() < end) {
    const value = await read(); if (accepts(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(label);
}
async function sky() {
  const page = await until(() => program.currentPage(), value => value?.path === "sky/detail/index", "sky_missing");
  if (!(await (await page.$(".sky-zoom-status"))?.outerWxml() ?? "").includes("FLOW0928")) throw new Error("wrong_candidate");
  return page;
}
async function state(page) {
  const description = await until(async () => await (await page.$(".sky-orientation-canvas"))?.attribute("aria-label") ?? "",
    value => value.includes("已呈现"), "frame_not_presented");
  const located = await (await page.$(".sky-located-object"))?.outerWxml() ?? "";
  return { description, locatedLabel: located.match(/aria-label="([^"]+)"/)?.[1] ?? null,
    locatedStyle: located.match(/style="([^"]+)"/)?.[1] ?? null,
    skyClass: await (await page.$(".sky-orientation-page"))?.attribute("class") ?? null };
}
async function followButton(page, label) {
  for (const button of await page.$$(".sky-view-mode__button")) {
    if ((await button.attribute("aria-label")) === label) return button;
  }
  return null;
}
try {
  // Recover the task-owned partial attempt without changing the selected mode.
  if ((await program.currentPage())?.path === "content/settings/index") await program.navigateBack();
  let page = await sky();
  const pending = await followButton(page, "取消恢复手机跟随，保留手动视角");
  if (pending) {
    await pending.tap();
    await until(() => followButton(page, "恢复手机方向跟随"), value => Boolean(value), "previous_follow_not_cancelled");
  }
  const before = await state(page);
  if (!before.description.includes("手动视角") || !before.description.includes("85.0 度") || !before.description.includes("2026-09-28T16:00:00.000Z"))
    throw new Error("expected_manual_midnight_scene");
  const start = await followButton(page, "恢复手机方向跟随");
  if (!start) throw new Error("follow_entry_missing");
  await start.tap();
  await until(() => followButton(page, "取消恢复手机跟随，保留手动视角"), value => Boolean(value), "follow_request_not_visible");
  const waiting = await state(page);
  if (!waiting.description.includes("手动视角")) throw new Error("unexpected_live_pose");
  await program.navigateTo("/content/settings/index");
  const settings = await until(() => program.currentPage(), value => value?.path === "content/settings/index", "settings_missing");
  const modeTrack = await until(() => settings.$(".settings-display-mode-track"), value => Boolean(value), "mode_missing");
  const settingsModeClass = await modeTrack.attribute("class");
  await program.navigateBack();
  page = await sky();
  const returned = await state(page);
  const cancel = await until(() => followButton(page, "取消恢复手机跟随，保留手动视角"), value => Boolean(value), "following_intent_lost");
  await cancel.tap();
  await until(() => followButton(page, "恢复手机方向跟随"), value => Boolean(value), "manual_intent_not_restored");
  const after = await state(page);
  for (const snapshot of [waiting, returned, after]) {
    if (snapshot.description !== before.description || snapshot.locatedLabel !== before.locatedLabel || snapshot.locatedStyle !== before.locatedStyle || snapshot.skyClass !== before.skyClass)
      throw new Error("manual_scene_changed_during_unavailable_follow_recovery");
  }
  await sky();
  console.log(JSON.stringify({ scope: "development_observation", marker: "FLOW0928", port: 9430,
    sequence: ["manual", "follow_requested_pose_unavailable", "settings", "sky_return", "cancel_follow_manual"], settingsModeClass, before, waiting, returned, after,
    phoneVerified: false, calibrationVerified: false }));
} finally { program.disconnect(); }
