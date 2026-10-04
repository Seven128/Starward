import assert from "node:assert/strict";
import fs from "node:fs/promises";
import sdk from "miniprogram-automator";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9445" }), 5000);
boundWechatProtocol(program, 6000);
try {
  const result = await program.evaluate(() => {
    const fs = wx.getFileSystemManager(), root = wx.env.USER_DATA_PATH, name = "starward-sky-image-cleanup-guard-20260928.tmp";
    const bytes = Array.from(new Uint8Array(fs.readFileSync(root + "/" + name)));
    if (bytes.join(",") !== "91,92,93,94") throw new Error("controlled_guard_contents_changed");
    fs.unlinkSync(root + "/" + name);
    return { controlledGuardRemoved: !fs.readdirSync(root).includes(name), generatedCaches: fs.readdirSync(root).filter(name => /^(sky-art-|deep-sky-M-)/.test(name)).length };
  });
  assert.equal(result.controlledGuardRemoved, true);
  await fs.writeFile(".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-image-files-guard-release-2026-09-28.json", JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(result));
} finally { program.disconnect(); }
