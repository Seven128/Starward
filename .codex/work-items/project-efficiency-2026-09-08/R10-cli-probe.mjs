import { spawnSync } from "node:child_process";
import path from "node:path";
import { mkdirSync, writeFileSync, readFileSync, realpathSync } from "node:fs";
import { redactDevelopmentValue } from "../../../tools/miniapp/development-observer.mjs";
const root = path.resolve("tmp/wechat-devtools-agent-eval/extracted");
const executable = path.join(root, "微信开发者工具.exe");
const selected = process.argv[2] ?? "hello";
const bootstrap = "const e=process.argv[1],a=process.argv.slice(2);process.argv=[process.execPath,e,'--electron'].concat(a);require(e)";
const args = selected === "hello"
  ? ["-e", "console.log(JSON.stringify({node:process.versions.node,electron:process.versions.electron}))"]
  : ["-e", bootstrap, path.join(root, "resources/app.asar.unpacked/js/common/cli/skill-index.js"), ...process.argv.slice(3)];
const result = spawnSync(executable, args, { cwd: root,
  env: { ...process.env, cwd: process.cwd(), ELECTRON: executable, ELECTRON_RUN_AS_NODE: "1" },
  windowsHide: true, encoding: "utf8", timeout: 40_000, maxBuffer: 1024 * 1024,
});
if (selected === "hello" || process.argv.includes("--help")) {
  console.log(JSON.stringify({ code: result.status, signal: result.signal, error: result.error?.code, stdout: result.stdout, stderr: result.stderr }));
} else {
  let value;
  try { value = JSON.parse(result.stdout); } catch {}
  const wrapped = value?.result ?? value?.data ?? value;
  const safe = wrapped?.structuredContent ?? wrapped;
  // Keep only an explicitly typed PNG/JPEG login image in ignored artifacts.
  // Never persist the raw account/auth response.
  let loginImagePath;
  if (process.argv.includes("login") && process.argv.includes("image")) {
    const findImage = (entry, depth = 0) => {
      if (!entry || typeof entry !== "object" || depth > 6) return;
      if (entry.type === "image" && ["image/png", "image/jpeg"].includes(entry.mimeType) && typeof entry.data === "string" && entry.data.length < 4_000_000) {
        const bytes = Buffer.from(entry.data, "base64");
        if (entry.mimeType === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return {bytes, extension:"png"};
        if (entry.mimeType === "image/jpeg" && bytes.subarray(0, 3).equals(Buffer.from([255,216,255]))) return {bytes, extension:"jpg"};
      }
      for (const child of Object.values(entry).slice(0, 30)) { const found = findImage(child, depth + 1); if (found) return found; }
    };
    const image = findImage(value);
    if (image) {
      const directory = path.resolve("artifacts/miniapp/development-observer/login");
      mkdirSync(directory, { recursive: true });
      loginImagePath = path.join(directory, `official-login-${Date.now()}.${image.extension}`);
      writeFileSync(loginImagePath, image.bytes, { flag: "wx", mode: 0o600 });
    }
  }
  const redact = input => redactDevelopmentValue(String(input).replace(/(https?:\/\/[^\s?]+)\?[^\s]+/gu, "$1?[redacted]"));
  let observation;
  const fixtureTools = ["automation_runtime_info", "automation_page_action", "automation_element_action", "get_simulator_console", "get_simulator_network", "simulator_screenshot", "open_project_window"];
  if (fixtureTools.some(tool => process.argv.includes(tool))) {
    const at = process.argv.indexOf("--project");
    const fixture = JSON.parse(readFileSync(new URL("R10-feedback-fixture.json", import.meta.url), "utf8"));
    if (at > 0 && realpathSync(process.argv[at + 1]) === realpathSync(fixture.project) && fixture.scope === "isolated_native_agent_tools") {
      observation = redactDevelopmentValue(safe);
    }
  }
  console.log(JSON.stringify({ code: result.status, signal: result.signal, error: result.error?.code,
    success: safe?.success, observation,
    status: safe?.status, taskId: safe?.taskId, errorType: value?.errorType, reason: value?.reason, version: safe?.version, versionRelation: safe?.versionRelation,
    loginExpired: safe?.loginExpired, tokenRequired: safe?.tokenRequired, loginImagePath,
    message: value?.message ? redact(value.message) : undefined,
    suggestions: Array.isArray(value?.suggestions) ? value.suggestions.slice(0, 4).map(redact) : undefined,
    responseKeys: value && Object.keys(value), resultKeys: safe && Object.keys(safe),
    diagnostics: (result.stderr ?? "").split(/\r?\n/).filter(line => line && /error|fail|connect|auth|launch|timeout|listening/iu.test(line) && !/loginUser|BEGIN.*PRIVATE|sessionkey/iu.test(line)).map(redact).slice(0,8),
    stdoutBytes: Buffer.byteLength(result.stdout ?? ""), stderrBytes: Buffer.byteLength(result.stderr ?? ""),
  }));
}
