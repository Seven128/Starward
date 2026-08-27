import automator from "miniprogram-automator";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const projectPath = "E:\\dev\\Starward\\apps\\wechat-miniapp";
const cliPath = "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat";
const devtoolsExecutable =
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\微信开发者工具.exe";
const devtoolsCliEntry =
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\resources\\app.asar.unpacked\\js\\common\\cli\\index.js";
const devtoolsCliBootstrap =
  "const e=process.argv[1],a=process.argv.slice(2).filter(function(x){return x!=='--electron'});if(!process.env.cwd)process.env.cwd=process.cwd();process.argv=[process.execPath,'--ms-enable-electron-run-as-node',e,'--electron'].concat(a);require(e)";
const automationPort = 9420;
const result = { status: "started" };
let miniProgram;
let cliProcess;

try {
  cliProcess = spawn(
    devtoolsExecutable,
    [
      "-e",
      devtoolsCliBootstrap,
      devtoolsCliEntry,
      "auto",
      "--project",
      projectPath,
      "--auto-port",
      String(automationPort),
      "--trust-project",
      "--port",
      "23977",
    ],
    {
      cwd: "C:\\Program Files (x86)\\Tencent\\微信web开发者工具",
      env: {
        ...process.env,
        cwd: "E:\\dev\\Starward",
        ELECTRON: "",
        ELECTRON_RUN_AS_NODE: "1",
      },
      windowsHide: true,
      stdio: "ignore",
    },
  );
  const deadline = Date.now() + 90_000;
  while (!miniProgram && Date.now() < deadline) {
    miniProgram = await automator
      .connect({ wsEndpoint: `ws://127.0.0.1:${automationPort}` })
      .catch(() => undefined);
    if (!miniProgram) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!miniProgram) throw new Error("automation_connection_timeout");
  result.phase = "connected";
  const projectConfigPath = `${projectPath}\\project.config.json`;
  const projectConfigBytes = await readFile(projectConfigPath);
  await writeFile(projectConfigPath, projectConfigBytes);
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  result.phase = "project-config-refreshed";
  await miniProgram.reLaunch("/pages/auth/index");
  result.phase = "auth-opened";
  await miniProgram.evaluate(function () {
    return globalThis.__STARWARD_MINIAPP_ACCEPTANCE__?.reset?.() ?? null;
  });
  const myPage = await miniProgram.switchTab("/pages/my/index");
  result.phase = "my-opened";
  await myPage.waitFor(1_500);
  const controls = await myPage.getElementsByXpath(
    '//*[@data-od-id="my-settings-action"]',
  );
  const buttons = controls.length ? await controls[0].$$(".soft-button") : [];
  result.controlCount = controls.length;
  result.buttonCount = buttons.length;
  result.buttonWxml = buttons[0] ? await buttons[0].outerWxml() : null;
  result.phase = "control-observed";
  if (buttons[0]) {
    await buttons[0].tap();
    await myPage.waitFor(1_500);
    result.afterPhysicalTap = (await miniProgram.currentPage())?.path ?? null;
    if (result.afterPhysicalTap === "pages/my/index") {
      await buttons[0].trigger("tap");
      await myPage.waitFor(1_500);
      result.afterTriggeredTap = (await miniProgram.currentPage())?.path ?? null;
    }
  }
  if ((await miniProgram.currentPage())?.path === "pages/my/index") {
    const direct = await miniProgram.navigateTo("/content/settings/index");
    result.afterWxNavigateTo = direct?.path ?? null;
  }
  result.phase = "navigation-checked";
  result.status = "completed";
} catch (error) {
  result.status = "failed";
  result.error = String(error?.message ?? error);
} finally {
  await miniProgram?.close().catch(() => undefined);
  cliProcess?.kill();
}

process.stdout.write(`${JSON.stringify(result)}\n`);
