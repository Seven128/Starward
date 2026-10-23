import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { pagePresentationForTest } from "../../navigation/page-presentation-test-support";

async function mount(t: TestContext, kind: "SPOT" | "PLAN" | "MISSING") {
  const params: Record<string, string> = kind === "SPOT" ? { spotId: "public-spot" } : kind === "PLAN" ? { token: "public-token" } : {};
  const point = { latitude: 31, longitude: 121 };
  const map = { selectedSpotId: null as string | null, viewport: null as unknown };
  const writes: Array<{ kind: string; value: unknown }> = [];
  const h = await pagePresentationForTest({ route: "content/share/index", params, state: {
    accountOwnerId: null,
    setViewport: (value: unknown) => { map.viewport = value; writes.push({ kind: "viewport", value }); },
    requestSpotOpen: (id: string) => { map.selectedSpotId = id; writes.push({ kind: "spot", value: id }); },
  } });
  t.after(() => h.dispose());
  const data = { kind, spotId: "public-spot", spotGcj02: point, name: "Public spot", spotName: "Public plan",
    events: [], expiresAt: new Date(Date.now() + 600_000).toISOString() };
  h.modules.api = {
    getSharedSpot: async (spotId: string) => ({ data: { ...data, spotId } }),
    getSharedPlan: async () => ({ data, generatedAt: new Date().toISOString() }),
    MiniappApiError: Error,
    loginWithWechat: () => assert.fail("public receivers must stay anonymous"),
    createPlanShare: () => assert.fail("public receivers must not create private capabilities"),
  };
  for (const [path, names] of Object.entries({
    "@/components/system-motion-probe": ["SystemMotionProbe"],
    "@/components/notification": ["FloatingNotificationHost"],
    "@/components/custom-nav": ["CustomNav"],
    "@/components/status-panel": ["StatusPanel"],
    "@/components/native-back-boundary": ["NativeBackBoundary"],
    "@/components/wechat-login": ["WechatLogin"],
    "@/components/semantic-asset": ["SemanticIcon"],
    "@/components/source-attribution": ["SourceAttribution"],
    "@/components/source-entry": ["SourceEntry"],
    "@/components/share-poster": ["SharePoster"],
    "@/components/shared-button-press": ["SharedButton"],
    "./public-share-card": ["PublicShareCard"],
  })) h.modules[path] = Object.fromEntries(names.map(name => [name, h.leaf(name)]));
  h.modules["@/components/status-panel"].EMPTY_FIELD_VALUE = "—";
  h.modules["@/hooks/use-theme"] = { useMotionThemeClass: () => "theme-day" };
  h.modules["@/utils/zoned-date"] = { displayZonedShareExpiry: () => "valid until" };
  h.modules["@/components/public-share-presentation"] = { publicSharePresentation: () => ({ warnings: [] }) };
  const Page = h.load("content/share/index.tsx").default;
  await h.render(Page); await h.show();
  const panel = (title: string) => h.leaves.get("StatusPanel")?.find(props => props.title === title);
  const failure = () => panel("地图暂未打开");
  return { ...h, map, point, writes, failure,
    async open() {
      await h.update(() => {
        const button = h.leaves.get("SharedButton")?.find(props => props.ariaLabel === "在地图查看观星点");
        const missing = panel("分享不可用");
        assert.ok(button || missing); (button?.onClick ?? missing.onRecover)();
      });
    },
    async retry() { await h.update(() => failure()!.onRecover()); },
    async completeMap(index: number) {
      await h.hide(); h.calls[index]!.succeed(); await h.arriveMap(); await h.settle();
    },
  };
}

for (const kind of ["SPOT", "PLAN", "MISSING"] as const) {
  test(`${kind}: current failure explains Map navigation, retry preserves the intended destination`, async t => {
    const h = await mount(t, kind); await h.open(); await h.open(); assert.equal(h.calls.length, 1);
    h.calls[0]!.fail(); await h.settle(); assert.ok(h.failure());
    await h.retry(); assert.equal(h.calls.length, 2); assert.equal(h.failure(), undefined);
    assert.equal(h.calls[1]!.kind, "reLaunch"); assert.equal(h.calls[1]!.url, "/pages/map/index");
    assert.equal(h.map.selectedSpotId, kind === "MISSING" ? null : "public-spot");
    if (kind !== "MISSING") assert.deepEqual(JSON.parse(JSON.stringify(h.map.viewport)), { center: h.point, zoom: 11 });
    await h.completeMap(1); assert.equal(h.failure(), undefined);
  });
}

test("sync dispatch, absent page and throwing page lookup recover without duplicate navigation", async t => {
  const h = await mount(t, "SPOT"); h.emptyStack(); await h.open(); assert.equal(h.calls.length, 0); assert.ok(h.failure());
  h.throwGetter(); await h.open(); assert.equal(h.calls.length, 0); assert.ok(h.failure());
  h.restoreStack(); h.throwDispatch(); await h.open(); assert.equal(h.calls.length, 0); assert.ok(h.failure());
  h.restoreStack(); await h.open(); assert.equal(h.calls.length, 1); await h.completeMap(0);
});

test("hide retires old native failure and the returned page owns its new bounded retry", async t => {
  const h = await mount(t, "SPOT"); await h.open(); await h.hide();
  h.calls[0]!.fail(); await h.settle(); assert.equal(h.failure(), undefined);
  await h.show(); await h.open(); assert.equal(h.calls.length, 2);
  await h.open(); assert.equal(h.calls.length, 2); assert.equal(h.failure(), undefined);
  h.calls[1]!.fail(); await h.settle(); assert.ok(h.failure());
});

test("changed public identity retires old failure and releases the old lock", async t => {
  const h = await mount(t, "SPOT"); await h.open(); await h.params({ spotId: "new-public-spot" });
  h.calls[0]!.fail(); await h.settle(); assert.equal(h.failure(), undefined);
  await h.open(); assert.equal(h.calls.length, 2);
  assert.equal(h.map.selectedSpotId, "new-public-spot", "the current public identity supplies Map intent");
  assert.deepEqual(h.writes.filter(write => write.kind === "spot").map(write => write.value), ["public-spot", "new-public-spot"]);
  h.calls[1]!.fail(); await h.settle(); assert.ok(h.failure());
});

test("expiry permits safe missing-page return; old failure cannot revive the public card", async t => {
  const h = await mount(t, "PLAN"); await h.open(); await h.expire();
  h.calls[0]!.fail(); await h.settle(); assert.equal(h.failure(), undefined);
  const writesBeforeReturn = h.writes.length;
  await h.open(); assert.equal(h.calls.length, 2); assert.equal(h.map.selectedSpotId, "public-spot");
  assert.equal(h.writes.length, writesBeforeReturn, "the expired card cannot write an old destination again");
  await h.completeMap(1);
});

test("page replacement and unmount suppress late native failure and hidden dispatch", async t => {
  const h = await mount(t, "SPOT"); await h.open(); h.replacePage();
  h.calls[0]!.fail(); await h.settle(); assert.equal(h.failure(), undefined);
  await h.open(); assert.equal(h.calls.length, 1, "a retired native Page cannot start work");
  h.restoreStack(); await h.open(); assert.equal(h.calls.length, 2);
  await h.unmount(); h.calls[1]!.fail(); await h.settle(); assert.equal(h.failure(), undefined);
});

test("a current Map retry shares one in-flight native handoff and observes that actual result", async t => {
  const h = await mount(t, "SPOT"); await h.open(); await h.hide(); await h.show(); await h.open();
  assert.equal(h.calls.length, 1, "primary navigation does not replay an unresolved native command");
  h.calls[0]!.fail(); await h.settle(); assert.ok(h.failure(), "the current intent owns the shared physical failure");
  await h.retry(); assert.equal(h.calls.length, 2); await h.completeMap(1);
});
