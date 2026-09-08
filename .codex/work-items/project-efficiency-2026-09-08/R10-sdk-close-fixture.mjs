import automator from "miniprogram-automator";
import path from "node:path";
import { inspectDevelopmentHost } from "../../../tools/miniapp/development-automation.mjs";
import { boundWechatProtocol, boundedWechatConnect } from "../../../tools/miniapp/wechat-protocol.mjs";
const target = {
  port: 19420, ownerPid: process.pid,
  projectPath: path.resolve("C:/Users/777/AppData/Local/Temp/starward-device-feedback-fixture-e5844U"),
  toolRoot: path.resolve("C:/Program Files (x86)/Tencent/微信web开发者工具"),
};
const before = await inspectDevelopmentHost(target);
if (!before.projectBound || !before.listener) throw new Error("owned_fixture_not_bound");
let program;
try {
  program = await boundedWechatConnect(() => automator.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:19420" }), 5000);
  boundWechatProtocol(program, 5000);
  const after = await inspectDevelopmentHost(target);
  if (!after.projectBound || after.listener?.pid !== before.listener.pid || after.listener?.startedAt !== before.listener.startedAt) throw new Error("fixture_listener_changed");
  await program.close();
  console.log(JSON.stringify({ ownedFixtureSdkClose: "completed" }));
} finally { program?.disconnect(); }
