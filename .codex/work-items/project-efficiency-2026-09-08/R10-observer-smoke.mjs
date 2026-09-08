// Actual DevTools fixture smoke. This is neither product nor phone acceptance.
import { performance } from "node:perf_hooks";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { startDevelopmentAutomation } from "../../../tools/miniapp/development-automation.mjs";
import { connectDevelopmentObserver } from "../../../tools/miniapp/development-observer.mjs";
import { resolveOfficialCli, runOfficialProcess } from "../../../tools/miniapp/device-feedback-official.mjs";

const projectPath = "C:/Users/777/AppData/Local/Temp/starward-device-feedback-fixture-e5844U";
const port = 19420;
const result = { scope: "isolated_development_tool_fixture", projectPath, port, steps: [] };
let launch, observer;
async function measure(name, operation) {
  const start = performance.now();
  const value = await operation();
  result.steps.push({ name, durationMs: Number((performance.now() - start).toFixed(2)), value });
  console.log(JSON.stringify({ completed: name, durationMs: result.steps.at(-1).durationMs }));
  return value;
}
try {
  launch = await measure("launch_owned_auto_port", () => startDevelopmentAutomation(projectPath, port));
  // Process handles/functions are deliberately not retained in evidence.
  result.steps.at(-1).value = { ready: true };
  observer = await measure("connect", () => connectDevelopmentObserver({ projectPath, automationPort: port, timeoutMs: 8000 }));
  result.steps.at(-1).value = { connected: true };
  await measure("status", () => observer.status());
  await measure("wait_for_candidate", () => observer.waitFor({ selector: ".candidate", expectedPage: "pages/index/index", timeoutMs: 10000 }));
  for (let index = 0; index < 3; index++) await measure(`warm_batch_${index + 1}`, () => observer.snapshot([
    { selector: ".candidate", text: true, size: true }, { selector: ".page button", text: true },
  ], { expectedPage: "pages/index/index" }));
  await measure("one_bounded_tap", () => observer.tap(".page button", { expectedPage: "pages/index/index" }));
  await measure("wait_for_observed_result", () => observer.waitFor({ selector: ".observed", expectedPage: "pages/index/index", timeoutMs: 5000 }));
  await measure("native_screenshot", () => observer.screenshot(fileURLToPath(new URL("R10-native-fixture.png", import.meta.url)), { expectedPage: "pages/index/index" }));
  result.console = observer.console();
  result.status = "passed";
} catch (error) {
  result.status = "failed";
  result.error = /^development_observer_[a-z0-9_]+$/u.test(error?.message ?? "") ? error.message : "tool_smoke_failed";
  result.diagnostic = error.diagnostic;
  process.exitCode = 1;
} finally {
  observer?.disconnect();
  await launch?.cleanup?.();
  // Only this task's exact no-network project; no global quit or user project close.
  if (launch) {
    try {
      const cli = await resolveOfficialCli();
      await runOfficialProcess(cli.file, [...cli.prefix, "close", "--project", projectPath], { cwd: cli.cwd, env: cli.env, timeout: 15000 });
      result.projectClosed = true;
    } catch { result.projectClosed = false; }
  }
  await writeFile(new URL("R10-observer-smoke.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ status: result.status, error: result.error, steps: result.steps.length, projectClosed: result.projectClosed }));
}
