import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { markdownSection } from "../../../tools/verify-miniapp-design-support.mjs";

const root = new URL("../../../", import.meta.url);
const baseUrl = (process.env.OPEN_DESIGN_BASE_URL || "").replace(/\/$/, "");
const apply = process.argv.includes("--apply");

assert(baseUrl, "OPEN_DESIGN_BASE_URL is required");

const designSystemId = "user:starward-mini-program-sky-canvas-field-signal-revision";
const linkedProjectId = "ds-starward-mini-program-sky-canvas-field-signal-revision";
const taskProjectId = "starward-miniapp-field-signal-all-resources";
const heading = "## WeChat Mini Program — Sky Canvas Field Signal";
const expected = {
  providerBody: "53eaac22d20d7b2a3b2bd501c1199558f9601d1afc5ed611d4e5ef7518c8a99d",
  canonicalSection: "086088d3f54d4bcede978fa0d4c09002bd8660dab0294536106b8e8459f706fa",
  commission: "79266ec6a6f98bfb60c1197226a196e70748cc1391674735ccb20f835a48f4d8",
  priorProviderBody: "5af9c8b73a1fbf8f2d2a45ff903a14c4d19d8828e5df62799ab78f16a96a0715",
  priorCommission: "83c0313dd0cfd69cee90a80bfa233e0db493efea6e1d149a59ebbc1638f00bfe",
  candidate: {
    "index.html": "0346c7f738cf853dd776654257b0d8fe5f736f1423fa9bdf42ebaaddc950871b",
    "assets/styles.css": "1f1262b036220c6b33e178e1f4d49043a7cdf3244c1f45ddc44d33abd0e52002",
    "assets/app.js": "afa995905e0bc94b2e54e89c50ba8ddf5e6d494fa9c77a7112d2ccf0f610ee03",
    "coverage.json": "2670fb10c00ababb4a6a69c2abede37d48b8e36ffadf4d59e7606d3efc5616a7",
    "README.md": "3a9c3c7c2d712fde35d0c852ee93f08682c4cddbf5f104174b78ca115377b603",
  },
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const textBytes = (value) => Buffer.from(value, "utf8");
const encodePath = (value) => value.split("/").map(encodeURIComponent).join("/");

async function response(path, init = {}) {
  const result = await fetch(`${baseUrl}${path}`, init);
  if (!result.ok) {
    const detail = await result.text().catch(() => "");
    throw new Error(`${init.method || "GET"} ${path} -> ${result.status}: ${detail.slice(0, 500)}`);
  }
  return result;
}

async function json(path, init = {}) {
  return response(path, init).then((item) => item.json());
}

const health = await json("/api/health");
assert.equal(health.ok, true, "Open Design health is not ok");
assert.equal(health.version, "0.21.1", "unexpected Open Design version");

const directory = await json("/api/workspace/directory");
const active = directory.items.find(
  (item) => item.workspaceId === directory.activeWorkspaceId
) || directory.items.find(
  (item) => item.memberStatus === "active" && item.lifecycleState !== "deleted"
);
assert(active, "no active Open Design workspace membership");

const authHeaders = {
  "x-od-workspace-id": active.workspaceId,
  "x-od-workspace-member-id": active.workspaceMemberId,
};
const jsonHeaders = { ...authHeaders, "content-type": "application/json" };

async function projectFile(projectId, name) {
  const result = await response(
    `/api/projects/${encodeURIComponent(projectId)}/files/${encodePath(name)}`,
    { headers: authHeaders },
  );
  return Buffer.from(await result.arrayBuffer());
}

async function designFile(name) {
  const result = await json(
    `/api/design-systems/${encodeURIComponent(designSystemId)}/file?path=${encodeURIComponent(name)}`,
    { headers: authHeaders },
  );
  assert.equal(result.file?.bytes?.type, "Buffer", `missing bytes for design-system file ${name}`);
  return Buffer.from(result.file.bytes.data);
}

async function projectManifest(projectId, excluded = new Set()) {
  const listing = await json(`/api/projects/${encodeURIComponent(projectId)}/files`, {
    headers: authHeaders,
  });
  const files = listing.files
    .filter((item) => item.kind !== "folder" && !excluded.has(item.name || item.path))
    .map((item) => item.name || item.path)
    .sort();
  const rows = [];
  for (const name of files) {
    const bytes = await projectFile(projectId, name);
    rows.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return {
    count: rows.length,
    sha256: sha256(rows.map((row) => `${row.path}\t${row.bytes}\t${row.sha256}`).join("\n")),
  };
}

async function designSupportingManifest() {
  const listing = await json(`/api/design-systems/${encodeURIComponent(designSystemId)}/files`, {
    headers: authHeaders,
  });
  const files = listing.files
    .filter((item) => item.kind !== "folder")
    .map((item) => item.path)
    .filter((name) => name !== "DESIGN.md" && name !== "metadata.json")
    .sort();
  const rows = [];
  for (const name of files) {
    const bytes = await designFile(name);
    rows.push({ path: name, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return {
    count: rows.length,
    sha256: sha256(rows.map((row) => `${row.path}\t${row.bytes}\t${row.sha256}`).join("\n")),
  };
}

const rootDesign = await readFile(new URL("DESIGN.md", root), "utf8");
const canonicalSection = markdownSection(rootDesign, heading);
const providerBody = `${heading}\n${canonicalSection}`.trim() + "\n";
const commission = await readFile(
  new URL(
    "artifacts/design-resource-authoring/miniapp-field-signal-all-resources-2026-09-02/commission-brief.md",
    root,
  ),
  "utf8",
);

assert.equal(sha256(textBytes(canonicalSection)), expected.canonicalSection);
assert.equal(sha256(textBytes(providerBody)), expected.providerBody);
assert.equal(sha256(textBytes(commission)), expected.commission);

async function snapshot() {
  const designSystem = await json(`/api/design-systems/${encodeURIComponent(designSystemId)}`, {
    headers: authHeaders,
  });
  const metadataBytes = await designFile("metadata.json");
  const metadata = JSON.parse(metadataBytes.toString("utf8"));
  const providerRoot = await designFile("DESIGN.md");
  const linkedRoot = await projectFile(linkedProjectId, "DESIGN.md");
  const commissionBytes = await projectFile(taskProjectId, "COMMISSION.md");
  const task = (await json(`/api/projects/${encodeURIComponent(taskProjectId)}`, {
    headers: authHeaders,
  })).project;
  const candidate = {};
  for (const name of Object.keys(expected.candidate)) {
    const bytes = await projectFile(taskProjectId, name);
    candidate[name] = { bytes: bytes.length, sha256: sha256(bytes) };
  }
  const runsPayload = await json(
    `/api/runs?projectId=${encodeURIComponent(taskProjectId)}`,
    { headers: authHeaders },
  );
  const activeRuns = (runsPayload.runs || []).filter((run) =>
    ["queued", "pending", "running", "canceling"].includes(run.status)
  );
  return {
    designSystem: {
      status: designSystem.status,
      canMutate: designSystem.canMutate,
      projectId: designSystem.projectId,
      bodySha256: sha256(textBytes(designSystem.body)),
      metadataSha256: sha256(metadataBytes),
      metadataInvariantSha256: sha256(textBytes(JSON.stringify({
        id: metadata.id,
        title: metadata.title,
        category: metadata.category,
        surface: metadata.surface,
        createdAt: metadata.createdAt,
        projectId: metadata.projectId,
        workspaceId: metadata.workspaceId,
        provenance: metadata.provenance,
      }))),
      artifactMode: metadata.artifactMode,
      providerRootSha256: sha256(providerRoot),
      supporting: await designSupportingManifest(),
    },
    linkedProject: {
      rootSha256: sha256(linkedRoot),
      other: await projectManifest(linkedProjectId, new Set(["DESIGN.md"])),
    },
    taskProject: {
      id: task.id,
      name: task.name,
      skillId: task.skillId,
      designSystemId: task.designSystemId,
      kind: task.metadata?.kind ?? null,
      intent: task.metadata?.intent ?? null,
      entryFile: task.metadata?.entryFile ?? null,
      pluginSnapshotId: task.metadata?.appliedPluginSnapshotId ?? null,
      commissionSha256: sha256(commissionBytes),
      candidate,
      activeRunCount: activeRuns.length,
    },
  };
}

function assertPreconditions(state) {
  assert.equal(state.designSystem.status, "published");
  assert.equal(state.designSystem.canMutate, true);
  assert.equal(state.designSystem.projectId, linkedProjectId);
  assert.equal(state.designSystem.artifactMode, "agent-managed");
  assert(
    [expected.priorProviderBody, expected.providerBody].includes(state.designSystem.bodySha256),
    "unexpected structured design-system body",
  );
  assert(
    [expected.priorProviderBody, expected.providerBody].includes(state.designSystem.providerRootSha256),
    "unexpected provider-root design-system body",
  );
  assert(
    [expected.priorProviderBody, expected.providerBody].includes(state.linkedProject.rootSha256),
    "unexpected linked-project design-system body",
  );
  assert.equal(state.taskProject.id, taskProjectId);
  assert.equal(state.taskProject.skillId, "frontend-design");
  assert.equal(state.taskProject.designSystemId, designSystemId);
  assert.equal(state.taskProject.kind, "design-resource");
  assert.equal(state.taskProject.intent, "design-resource-authoring");
  assert.equal(state.taskProject.entryFile, "index.html");
  assert.equal(state.taskProject.pluginSnapshotId, null);
  assert(
    [expected.priorCommission, expected.commission].includes(state.taskProject.commissionSha256),
    "unexpected task Commission",
  );
  assert.equal(state.taskProject.activeRunCount, 0, "an Open Design task run is active");
  for (const [name, hash] of Object.entries(expected.candidate)) {
    assert.equal(state.taskProject.candidate[name]?.sha256, hash, `candidate drift: ${name}`);
  }
}

const before = await snapshot();
assertPreconditions(before);

if (apply) {
  if (
    before.designSystem.bodySha256 !== expected.providerBody ||
    before.designSystem.providerRootSha256 !== expected.providerBody
  ) {
    await json(`/api/design-systems/${encodeURIComponent(designSystemId)}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({
        status: "published",
        artifactMode: "agent-managed",
        body: providerBody,
      }),
    });
  }

  if (before.linkedProject.rootSha256 !== expected.providerBody) {
    await json(`/api/projects/${encodeURIComponent(linkedProjectId)}/files`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ name: "DESIGN.md", content: providerBody, overwrite: true }),
    });
  }

  if (before.taskProject.commissionSha256 !== expected.commission) {
    await json(`/api/projects/${encodeURIComponent(taskProjectId)}/files`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ name: "COMMISSION.md", content: commission, overwrite: true }),
    });
  }
}

const after = await snapshot();
if (apply) {
  assert.equal(after.designSystem.bodySha256, expected.providerBody);
  assert.equal(after.designSystem.providerRootSha256, expected.providerBody);
  assert.equal(after.linkedProject.rootSha256, expected.providerBody);
  assert.equal(after.taskProject.commissionSha256, expected.commission);
  assert.equal(after.designSystem.supporting.sha256, before.designSystem.supporting.sha256);
  assert.equal(after.linkedProject.other.sha256, before.linkedProject.other.sha256);
  assert.equal(
    after.designSystem.metadataInvariantSha256,
    before.designSystem.metadataInvariantSha256,
  );
  for (const name of Object.keys(expected.candidate)) {
    assert.equal(
      after.taskProject.candidate[name].sha256,
      before.taskProject.candidate[name].sha256,
      `candidate changed during sync: ${name}`,
    );
  }
}

console.log(JSON.stringify({
  schema: "starward-open-design-current-system-sync",
  mode: apply ? "apply" : "inspect",
  providerVersion: health.version,
  result: "verified",
  expected: {
    canonicalSectionSha256: expected.canonicalSection,
    providerBodySha256: expected.providerBody,
    providerBodyChars: providerBody.length,
    providerBodyBytes: textBytes(providerBody).length,
    commissionSha256: expected.commission,
  },
  before,
  after,
  sensitiveDataPersisted: false,
}, null, 2));
