// Development capability probe only. This SDK rejects mocking
// onDeviceMotionChange; no native calibration evidence was obtained.
// The original partial probe mocked getDeviceInfo and created no stream.
import sdk from "miniprogram-automator";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

const action = process.argv[2];
if (!["status", "restore"].includes(action)) throw new Error("native_motion_mock_unsupported_in_this_runtime");
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9430" }), 5000);
boundWechatProtocol(program, 5000);
async function fence() {
  const page = await program.currentPage();
  if (page?.path !== "sky/detail/index" || !(await (await page.$(".sky-zoom-status"))?.outerWxml() ?? "").includes("FLOW0928"))
    throw new Error("wrong_development_candidate");
}
try {
  await fence();
  if (action === "restore") {
    await program.restoreWxMethod("getDeviceInfo");
    await program.evaluate(function () {
      const state = globalThis.__cloudSkyPoseFixture0928;
      if (state && state.timer !== null) clearInterval(state.timer);
      delete globalThis.__cloudSkyPoseFixture0928;
    });
  }
  const installed = await program.evaluate(function () { return Boolean(globalThis.__cloudSkyPoseFixture0928); });
  await fence();
  console.log(JSON.stringify({ scope: "development_capability_probe", marker: "FLOW0928", port: 9430,
    action, installed, nativeMotionMockSupported: false, nativeCalibrationVerified: false }));
} finally { program.disconnect(); }
