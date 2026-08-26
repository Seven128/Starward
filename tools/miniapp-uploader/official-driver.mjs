import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function packageSummary(result) {
  const packages = Array.isArray(result?.subPackageInfo)
    ? result.subPackageInfo.map((entry) => ({
        name: typeof entry?.name === "string" ? entry.name.slice(0, 128) : "unknown",
        size: Number.isSafeInteger(entry?.size) && entry.size >= 0 ? entry.size : null,
      }))
    : [];
  return Object.freeze({ packages, pluginCount: Array.isArray(result?.pluginInfo) ? result.pluginInfo.length : 0 });
}

export async function createOfficialWechatDriver() {
  const ci = require("miniprogram-ci");
  return Object.freeze({
    async preview(input) {
      const project = new ci.Project({
        appid: input.appId,
        type: "miniProgram",
        projectPath: input.projectPath,
        privateKeyPath: input.privateKeyPath,
        ignores: ["node_modules/**/*"],
      });
      const result = await ci.preview({
        project,
        desc: input.description,
        robot: input.robot,
        setting: { useProjectConfig: true },
        qrcodeFormat: "image",
        qrcodeOutputDest: input.qrcodeOutputPath,
        onProgressUpdate() {},
      });
      return packageSummary(result);
    },
    async upload(input) {
      const project = new ci.Project({
        appid: input.appId,
        type: "miniProgram",
        projectPath: input.projectPath,
        privateKeyPath: input.privateKeyPath,
        ignores: ["node_modules/**/*"],
      });
      const result = await ci.upload({
        project,
        version: input.version,
        desc: input.description,
        robot: input.robot,
        setting: { useProjectConfig: true },
        onProgressUpdate() {},
      });
      return packageSummary(result);
    },
  });
}
