import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const baseUrl = (process.env.OPEN_DESIGN_BASE_URL || "").replace(/\/$/, "");
assert(baseUrl, "OPEN_DESIGN_BASE_URL is required");

const projectId = "starward-miniapp-field-signal-all-resources";
const names = ["index.html", "assets/styles.css", "assets/app.js", "coverage.json", "README.md"];
const candidateRoot = new URL("candidate/", import.meta.url);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const encodePath = (value) => value.split("/").map(encodeURIComponent).join("/");

async function response(path, init = {}) {
  const result = await fetch(`${baseUrl}${path}`, init);
  if (!result.ok) {
    throw new Error(`${init.method || "GET"} ${path} -> ${result.status}: ${(await result.text()).slice(0, 500)}`);
  }
  return result;
}

const health = await response("/api/health").then((item) => item.json());
assert.equal(health.ok, true);
const directory = await response("/api/workspace/directory").then((item) => item.json());
const workspace = directory.items.find((item) => item.workspaceId === directory.activeWorkspaceId)
  || directory.items.find((item) => item.memberStatus === "active" && item.lifecycleState !== "deleted");
assert(workspace, "no active Open Design workspace membership");

const authHeaders = {
  "x-od-workspace-id": workspace.workspaceId,
  "x-od-workspace-member-id": workspace.workspaceMemberId,
};
const jsonHeaders = { ...authHeaders, "content-type": "application/json" };
const result = {};

for (const name of names) {
  const local = await readFile(new URL(name, candidateRoot));
  await response(`/api/projects/${encodeURIComponent(projectId)}/files`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ name, content: local.toString("utf8"), overwrite: true }),
  });
  const remoteResponse = await response(
    `/api/projects/${encodeURIComponent(projectId)}/files/${encodePath(name)}`,
    { headers: authHeaders },
  );
  const remote = Buffer.from(await remoteResponse.arrayBuffer());
  assert.equal(sha256(remote), sha256(local), `provider parity failed for ${name}`);
  result[name] = { bytes: local.length, sha256: sha256(local) };
}

console.log(JSON.stringify({ providerVersion: health.version, projectId, files: result }, null, 2));
