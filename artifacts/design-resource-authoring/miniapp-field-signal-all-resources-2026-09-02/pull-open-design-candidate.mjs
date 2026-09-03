import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = (process.env.OPEN_DESIGN_BASE_URL || "").replace(/\/$/, "");
assert(baseUrl, "OPEN_DESIGN_BASE_URL is required");

const projectId = "starward-miniapp-field-signal-all-resources";
const names = ["index.html", "assets/styles.css", "assets/app.js", "coverage.json", "README.md"];
const candidateRootUrl = new URL("candidate/", import.meta.url);
const candidateRoot = fileURLToPath(candidateRootUrl);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const encodePath = (value) => value.split("/").map(encodeURIComponent).join("/");

async function response(route, init = {}) {
  const result = await fetch(`${baseUrl}${route}`, init);
  if (!result.ok) {
    throw new Error(`${init.method || "GET"} ${route} -> ${result.status}: ${(await result.text()).slice(0, 500)}`);
  }
  return result;
}

const health = await response("/api/health").then((item) => item.json());
assert.equal(health.ok, true);
assert.equal(health.version, "0.21.1");

const directory = await response("/api/workspace/directory").then((item) => item.json());
const workspace = directory.items.find((item) => item.workspaceId === directory.activeWorkspaceId)
  || directory.items.find((item) => item.memberStatus === "active" && item.lifecycleState !== "deleted");
assert(workspace, "no active Open Design workspace membership");

const headers = {
  "x-od-workspace-id": workspace.workspaceId,
  "x-od-workspace-member-id": workspace.workspaceMemberId,
};
const listing = await response(`/api/projects/${encodeURIComponent(projectId)}/files`, { headers })
  .then((item) => item.json());
const listed = new Set(listing.files.filter((item) => item.kind !== "folder").map((item) => item.name || item.path));
assert(!listed.has("DECISION_REQUIRED.md"), "provider candidate contains DECISION_REQUIRED.md");

const manifest = {};
for (const name of names) {
  assert(listed.has(name), `missing provider candidate file ${name}`);
  const remote = await response(
    `/api/projects/${encodeURIComponent(projectId)}/files/${encodePath(name)}`,
    { headers },
  ).then(async (item) => Buffer.from(await item.arrayBuffer()));
  const localPath = path.join(candidateRoot, ...name.split("/"));
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, remote);
  manifest[name] = { bytes: remote.length, sha256: sha256(remote) };
}

console.log(JSON.stringify({
  schema: "starward-open-design-candidate-pull-v1",
  providerVersion: health.version,
  projectId,
  files: manifest,
  decisionRequired: false,
  sensitiveDataPersisted: false,
}, null, 2));
