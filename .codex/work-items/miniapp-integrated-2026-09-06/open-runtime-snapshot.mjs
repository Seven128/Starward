import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { officialDriver } from "../../../tools/miniapp/device-feedback-official.mjs";

const root = process.cwd();
const project = path.join(root, "artifacts/miniapp/integrated-runtime-snapshot");
await mkdir(project, { recursive: true });
await cp(path.join(root, "apps/wechat-miniapp/dist/weapp"), path.join(project, "miniprogram"), { recursive: true });
const config = JSON.parse(await readFile(path.join(root, "apps/wechat-miniapp/project.config.json"), "utf8"));
config.projectname = "Starward-integrated-runtime-check";
config.miniprogramRoot = "miniprogram/";
delete config.srcMiniprogramRoot;
await writeFile(path.join(project, "project.config.json"), JSON.stringify(config, null, 2));
const driver = await officialDriver({});
try {
  const output = await driver.run(driver.invocation.file,
    driver.args(["auto", "--project", project, "--auto-port", "9421", "--trust-project"]),
    driver.options({ timeout: 30_000, maxBytes: 16 * 1024 }));
  console.log(output.toString("utf8"));
} catch (error) {
  console.log(error.message);
  process.exitCode = 1;
}
