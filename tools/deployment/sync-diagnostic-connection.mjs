import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Refresh only the diagnostic metadata mirror, never an SSH/private runtime key.
// GH stdout/stderr and the packet stay in memory, including on failure.
const cwd = fileURLToPath(new URL("../../", import.meta.url));
const childEnv = { ...process.env };
// gh's repository/host overrides take precedence over cwd; the metadata source
// and destination must both resolve from this checkout's remote instead.
delete childEnv.GH_REPO;
delete childEnv.GH_HOST;
const options = { cwd, env: childEnv, encoding: "utf8", timeout: 30_000, maxBuffer: 256 * 1024, windowsHide: true };
let status = "failed";
try {
  const variables = spawnSync("gh", ["api", "repos/{owner}/{repo}/environments/staging/variables?per_page=100"], options);
  if (variables.error || variables.status !== 0) throw new Error();
  const result = JSON.parse(variables.stdout);
  if (result.total_count > 100 || !Array.isArray(result.variables)) throw new Error();
  const packet = {};
  for (const name of ["SSH_HOST", "SSH_PORT", "SSH_USER", "REMOTE_INBOX", "REMOTE_RELEASE_ROOT", "REMOTE_CANDIDATE_ROOT", "REMOTE_BASE_DEPLOY_ENV"]) {
    const value = result.variables.find((entry) => entry.name === `STARWARD_${name}`)?.value;
    if (typeof value !== "string" || value.length === 0) throw new Error();
    packet[name] = value;
  }
  const stored = spawnSync("gh", ["secret", "set", "STARWARD_DIAGNOSTIC_CONNECTION", "--env", "staging"], { ...options, input: JSON.stringify(packet) });
  if (stored.error || stored.status !== 0) throw new Error();
  status = "updated";
} catch { /* Never surface gh errors: they may contain private connection values. */ }
console.log(JSON.stringify({ status, secret: "STARWARD_DIAGNOSTIC_CONNECTION", environment: "staging" }));
process.exitCode = status === "updated" ? 0 : 1;
