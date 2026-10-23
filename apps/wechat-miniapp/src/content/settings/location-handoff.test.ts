import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { pagePresentationForTest } from "../../navigation/page-presentation-test-support";

// Render the whole Settings page and real login/navigation/presentation owners.
// Only unrelated visual leaves, remote preferences and native navigation are ports.
async function mount(t: TestContext) {
  const h = await pagePresentationForTest({ route: "content/settings/index", state: { accountOwnerId: "synthetic:A" } });
  t.after(() => h.dispose());
  const commands: unknown[][] = [];
  for (const [path, names] of Object.entries({
    "@/components/system-motion-probe": ["SystemMotionProbe"],
    "@/components/notification": ["FloatingNotificationHost", "NotificationRegion"],
    "@/components/custom-nav": ["CustomNav"],
    "@/components/status-panel": ["StatusPanel"],
    "@/components/native-back-boundary": ["NativeBackBoundary"],
    "@/components/wechat-login": ["WechatLogin"],
    "./settings-sections": ["SettingsControls", "SettingsDataActions"],
    "./settings-sheet": ["SettingsSheet"],
  })) h.modules[path] = Object.fromEntries(names.map(name => [name, h.leaf(name)]));
  h.modules["@/hooks/use-reduced-motion"] = { useReducedMotion: () => false };
  h.modules["@/hooks/use-theme"] = { useMotionThemeClass: () => "theme-day" };
  h.modules["@/hooks/use-preferences-sync"] = { usePreferencesSync: () => ({ updatePreference() {}, syncNow() {}, status: "" }) };
  h.modules["./use-settings-preferences"] = { useSettingsPreferences: () => ({ confirmed: true, state: "READY" }) };
  h.modules["./use-account-export"] = { useAccountExport: () => ({ state: { phase: "IDLE" }, close() {}, handingOff: () => false }) };
  const Page = h.load("content/settings/index.tsx").default;
  await h.render(Page);
  return { ...h, commands,
    async openLocation() {
      await h.update(() => h.leaves.get("SettingsControls")!.at(-1).openSheet("LOCATION"));
      await h.update(() => h.leaves.get("SettingsSheet")!.at(-1).openLocation());
    },
    succeed() { h.calls[0]!.succeed({ eventChannel: { emit: (...args: unknown[]) => commands.push(args) } }); },
    async navigateHide() { await h.hide(); h.setStack([h.nativePage, { route: "pages/auth/index" }]); },
  };
}

test("Settings location handoff delivers its explicit intent across normal navigation hide", async t => {
  const page = await mount(t); await page.openLocation();
  assert.equal(page.calls.length, 1); assert.equal(page.calls[0]!.url, "/pages/auth/index");
  await page.navigateHide(); page.succeed(); await page.settle();
  assert.deepEqual(page.commands, [["locationIntent", "locate"]]); assert.equal(page.notices.length, 0);
});

test("Settings retires an old location handoff on account ABA, map reset, identity mismatch or unmount", async t => {
  for (const boundary of ["account-ABA", "map-reset", "identity", "unmount"] as const) {
    const page = await mount(t); await page.openLocation();
    if (boundary === "account-ABA") { await page.bind("synthetic:B"); await page.bind("synthetic:A"); }
    else if (boundary === "map-reset") await page.changeState({ mapResetVersion: 1 });
    else if (boundary === "unmount") await page.unmount();
    else page.mismatchIdentity("synthetic:B");
    await page.navigateHide(); page.succeed(); await page.settle();
    assert.equal(page.commands.length, 0, boundary); assert.equal(page.notices.length, 0, boundary);
    await page.dispose();
  }
});
