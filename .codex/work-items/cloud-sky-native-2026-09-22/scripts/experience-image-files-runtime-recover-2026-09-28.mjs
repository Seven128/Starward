import sdk from "miniprogram-automator";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9445" }), 5000);
boundWechatProtocol(program, 6000);
try { await program.close(); console.log(JSON.stringify({ ownedDevToolsClosedByOfficialSDK: true })); }
finally { program.disconnect(); }
