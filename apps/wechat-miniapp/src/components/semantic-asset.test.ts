import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { semanticIconRenderer } from "./semantic-asset-test-support";

test("main-page adopted bitmaps keep geometry and accessible names through the shared native loader", () => {
  const { render } = semanticIconRenderer("pages/my/index");
  for (const name of ["images", "plan-suv", "clock", "sun", "telescope", "share", "place-pin", "cloud", "bulb", "terrain", "moon", "meteor"] as const) {
    const icon = render({ name, decorative: false, label: "进入资料", className: "owner-size" });
    assert.equal(icon.type, "packaged-icon");
    assert.equal(icon.props.kind, name);
    assert.equal(icon.props.class, `semantic-icon semantic-icon--b semantic-icon--${name} owner-size`);
    assert.equal(icon.props["aria-role"], "img");
    assert.equal(icon.props["aria-label"], "进入资料");
    assert.equal(icon.props["aria-hidden"], undefined);
  }
});

test("subpackage consumers share main bitmaps while retaining package variants and theme paths", () => {
  for (const [mode, expected] of [
    ["DAY", "/assets/b-icons/weapp-tabbar/map--day--default.png"],
    ["NIGHT", "/assets/icons/tab-map-night.png"],
    ["OBSERVATION", "/assets/icons/tab-map-observation.png"],
  ] as const) {
    const map = semanticIconRenderer("pages/my/index", mode).render({ name: "map", decorative: false });
    assert.equal(map.type, "image");
    assert.equal(map.props.src, expected);
    assert.equal(map.props["aria-label"], "地图");
  }
  const mainAvatar = semanticIconRenderer("pages/map/index");
  assert.equal(mainAvatar.resolvePath("account-user", "default", "pages/map/index"),
    "/assets/b-icons/weapp-tabbar/account-user--day--default.png");
  assert.equal(mainAvatar.resolvePath("account-user", "selected", "pages/map/index"),
    "/assets/b-icons/weapp-tabbar/account-user--day--selected.png");
  const settings = semanticIconRenderer("pages/my/index").render({ name: "settings" });
  assert.equal(settings.type, "image");
  assert.equal(settings.props.src, "/assets/b-icons/settings--day--default.png");
  const content = semanticIconRenderer("content/settings/index").render({ name: "settings" });
  assert.equal(content.type, "image");
  assert.equal(content.props.src, "/assets/b-icons/settings--day--default.png");
  for (const route of ["content/article/detail/index", "spot/field/index", "sky/detail/index"]) {
    assert.equal(semanticIconRenderer(route).render({ name: "info" }).props.src, "/assets/b-icons/info--day--default.png");
  }
  assert.equal(semanticIconRenderer("pages/map/index").render({ name: "parking" }).props.src, "/assets/b-icons/parking--day--default.png");
  assert.equal(semanticIconRenderer("content/article/detail/index").render({ name: "parking" }).props.src, "/content/assets/b-icons/parking--day--default.png");
  assert.equal(semanticIconRenderer("spot/field/index").render({ name: "parking" }).props.src, "/spot/assets/b-icons/parking--day--default.png");
  assert.equal(semanticIconRenderer("sky/detail/index").render({ name: "horizon" }).props.src, "/sky/assets/b-icons/horizon--day--default.png");
  for (const name of ["cloud", "bulb", "terrain", "moon", "meteor"] as const) {
    assert.equal(semanticIconRenderer("spot/field/index").render({ name }).props.src, `/spot/assets/b-icons/${name}--day--default.png`);
  }
  for (const name of ["cloud", "moon", "meteor"] as const) {
    assert.equal(semanticIconRenderer("content/plan/index").render({ name }).props.src, `/content/assets/b-icons/${name}--day--default.png`);
  }
  assert.equal(semanticIconRenderer("sky/detail/index").render({ name: "terrain" }).props.src, "/sky/assets/b-icons/terrain--day--default.png");
  const selected = semanticIconRenderer("pages/map/index").render({ name: "favorite-star", state: "selected" });
  assert.equal(selected.type, "image");
  assert.equal(selected.props.src, "/assets/b-icons/favorite-star--day--selected.png");
  assert.equal(semanticIconRenderer("pages/my/index", "OBSERVATION").render({ name: "settings" }).type, "view");
  const weather = semanticIconRenderer("pages/map/index").render({ name: "conditions", presentation: "forecast" });
  assert.equal(weather.type, "packaged-icon");
  assert.equal(weather.props.kind, "low-cloud");
  assert.equal(weather.props.class.includes("semantic-icon--forecast"), false);
});

test("native bitmap input admits only packaged roles and withdraws an invalid previous image", () => {
  let definition: any;
  vm.runInNewContext(readFileSync(new URL("../spot/native/packaged-icon/index.js", import.meta.url), "utf8"), {
    Component: (value: unknown) => { definition = value; },
  });
  let src = "";
  const host = { setData: (value: { src: string }) => { src = value.src; } };
  for (const kind of ["temperature", "wind", "droplet", "warning", "low-cloud", "images", "plan-suv", "clock", "sun", "telescope", "share", "place-pin", "cloud", "bulb", "terrain", "moon", "meteor"]) {
    definition.properties.kind.observer.call(host, kind);
    assert.equal(src, `/spot/assets/b-icons/${kind}--day--default.png`);
  }
  definition.properties.kind.observer.call(host, "../unpackaged");
  assert.equal(src, "");
});
