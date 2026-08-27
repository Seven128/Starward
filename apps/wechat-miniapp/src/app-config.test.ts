import assert from "node:assert/strict";
import test from "node:test";

test("location permission copy fits WeChat's limit and preserves optional one-shot use", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "defineAppConfig");
  Object.defineProperty(globalThis, "defineAppConfig", {
    configurable: true,
    value: (config: unknown) => config,
  });
  try {
    const { default: config } = await import("./app.config");
    const description = config.permission?.["scope.userLocation"]?.desc;
    assert.equal(typeof description, "string");
    assert.ok(description);
    assert.ok([...description].length <= 30, "WeChat permission descriptions allow at most 30 characters");
    assert.match(description, /主动/u);
    assert.match(description, /一次/u);
    assert.match(description, /拒绝.*仍可.*默认/u);
    assert.deepEqual(config.requiredPrivateInfos, ["getLocation"]);
  } finally {
    if (previous) Object.defineProperty(globalThis, "defineAppConfig", previous);
    else Reflect.deleteProperty(globalThis, "defineAppConfig");
  }
});
