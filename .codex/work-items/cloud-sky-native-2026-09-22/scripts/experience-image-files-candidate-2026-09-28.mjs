import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root = process.cwd();
const evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const generation = process.argv[2] ?? "v12"; assert(["v12", "v13", "v14", "v15", "v16", "v17", "v18", "v19", "v20", "v21"].includes(generation));
const day = ["v15", "v16", "v17", "v18", "v19", "v20", "v21"].includes(generation) ? "0929" : "0928";
const bundle = `apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-${generation}-${day}`;
const output = path.join(evidence, `experience-combined-clean-${generation}-candidate-2026-09-${day.slice(2)}.json`);
await assert.rejects(fs.access(output), { code: "ENOENT" });
const configPath = path.join(root, bundle, "project.config.json");
const config = JSON.parse(await fs.readFile(configPath, "utf8"));
const old = JSON.parse(await fs.readFile(path.join(evidence, "experience-combined-clean-v11-candidate-2026-09-28.json"), "utf8"));
const oldConfig = JSON.parse(await fs.readFile(path.join(root, old.bundle, "project.config.json"), "utf8"));
assert.ok(config.appid === oldConfig.appid, "candidate_app_identity_changed");
config.projectname = `Starward-Sky-Combined-Clean-${generation.toUpperCase()}-${day}`;
config.setting.urlCheck = false;
await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
const fingerprint = await fingerprintBundle(path.join(root, bundle));
const scripts = await Promise.all(fingerprint.files.filter(file => file.path.endsWith(".js")).map(file => fs.readFile(path.join(root, bundle, file.path), "utf8")));
const code = scripts.join("\n");
const diagnostics = {};
for (const marker of Object.keys(old.diagnostics)) {
  assert.ok(!code.includes(marker), "temporary_diagnostic_present"); diagnostics[marker] = "absent";
}
assert(!fingerprint.files.some(file => file.path.endsWith(".map")));
assert(code.includes("http://127.0.0.1:8791"));
assert(code.includes("sky_image_file_cleanup_incomplete"), "native_startup_cleanup_missing");
const app = JSON.parse(await fs.readFile(path.join(root, bundle, "app.json"), "utf8"));
assert.equal(app.debug ?? false, false);
const packages = { main: 0 };
const subpackages = app.subpackages ?? app.subPackages ?? [];
for (const file of fingerprint.files) {
  const item = subpackages.find(item => file.path.startsWith(item.root.replace(/\/$/, "") + "/"));
  const name = item?.root ?? "main";
  packages[name] = (packages[name] ?? 0) + file.bytes;
}
if (["v14", "v15", "v16", "v17", "v18", "v19", "v20", "v21"].includes(generation)) assert(code.includes("coordinateGrids"), "coordinate_grid_integration_missing");
if (["v16", "v17", "v18", "v19", "v20", "v21"].includes(generation)) assert(code.includes("bff_observation_context_update_invalid"), "context_ack_validation_missing");
if (["v18", "v19", "v20", "v21"].includes(generation)) {
  assert(code.includes("source-finite-v3") && code.includes("imagePublicationHash"), "source_bound_imagery_integration_missing");
}
let projectionInputs, opticalInputs, runningOpticalInputs, sourceRecoveryInputs, runningSourceRecovery, previousCandidate;
if (generation === "v19") {
  const comparison = JSON.parse(await fs.readFile(path.join(root, "output/playwright/cloud-sky-view-projection-causal-0929/result.json"), "utf8"));
  for (const input of comparison.sourceHashes) assert.equal(createHash("sha256").update(await fs.readFile(path.join(root,input.file))).digest("hex"),input.sha256,"checked_projection_input_changed");
  assert(code.includes("unclipped"), "prepared_projection_consumer_missing");
  projectionInputs = comparison.sourceHashes.filter(input => ["sky-view-projection.ts","sky-grid-projection.ts","sky-hips-tile-mesh.ts","sky-scene-render.ts"].some(file=>input.file.endsWith(`/${file}`)));
  assert.equal(projectionInputs.length,4);
}
if (generation === "v20" || generation === "v21") {
  const checked = JSON.parse(await fs.readFile(path.join(root,"output/playwright/cloud-sky-sdss-targets-0929-verified/result.json"),"utf8"));
  for (const input of checked.sourceHashes) {
    // v21 changes the modal text in this page. The renderer owners stay bound
    // to the earlier GPU checks; the current page has its own consumer checks.
    if (generation === "v21" && input.file.endsWith("/spot-sky-page.tsx")) continue;
    assert.equal(createHash("sha256").update(await fs.readFile(path.join(root,input.file))).digest("hex"),input.sha256,"checked_optical_gpu_input_changed");
  }
  assert(code.includes("optical-cutout") && code.includes("unclipped"),"shared_optical_or_projection_owner_missing");
  assert.equal(checked.publications.length,6);
  for (const publication of checked.publications) assert(code.includes(publication.publicationHash),"admitted_optical_publication_missing");
  const running = JSON.parse(await fs.readFile(path.join(evidence,"experience-sdss-running-adoption-2026-09-29.json"),"utf8"));
  assert(running.contextDataEqual && running.rows.length === 18 && running.contextPuts === 0);
  assert.equal(running.held,0);assert.equal(running.active,0);
  for (const publication of checked.publications) assert(running.rows.some(row=>row.reference === publication.reference && row.publicationHash === publication.publicationHash));
  runningOpticalInputs={epochStartedAt:running.epochStartedAt,contextUpstream:running.contextUpstream,publications:checked.publications};
  opticalInputs = await Promise.all([
    "packages/miniapp-contracts/src/sdss-optical-publication.ts", "apps/wechat-miniapp/src/services/sdss-optical-client.ts",
    "apps/wechat-miniapp/src/services/api-client.ts", "apps/wechat-miniapp/src/features/sky/use-sky-sdss-optical.ts",
    "apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts", "apps/wechat-miniapp/src/features/sky/sky-scene-render.ts",
    "apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts", "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx",
  ].map(async file=>({file,sha256:createHash("sha256").update(await fs.readFile(path.join(root,file))).digest("hex")})));
}
if (generation === "v21") {
  const consumers = JSON.parse(await fs.readFile(path.join(evidence,"experience-celestial-source-consumers-after-2026-09-29.json"),"utf8"));
  assert.equal(consumers.rows.length,6); assert(consumers.requestsReleased && consumers.routeIdentityPreserved && consumers.partialCreditNotSubstituted);
  const offline = consumers.rows.find(row=>row.phase === "offline-retained-partial");
  assert(offline.sourceStates.includes("STALE") && offline.sourceStates.includes("PARTIAL"));
  assert(offline.modalStates.includes("STALE") && offline.modalStates.includes("PARTIAL"));
  assert(consumers.rows.find(row=>row.phase === "optical-recovered").dataState === "FRESH");
  for (const input of consumers.sourceHashes) assert.equal(createHash("sha256").update(await fs.readFile(path.join(root,input.file))).digest("hex"),input.sha256,"checked_source_recovery_input_changed");
  const sourceNotice = "所选红外影像与光学影像的来源";
  const escapedNotice = Array.from(sourceNotice, character => "\\u" + character.charCodeAt(0).toString(16).padStart(4,"0")).join("");
  assert(code.includes("sdss_optical_publication_unavailable") && (code.includes(sourceNotice) || code.includes(escapedNotice)),"source_recovery_consumer_missing");
  const running = JSON.parse(await fs.readFile(path.join(evidence,"experience-celestial-source-running-2026-09-29.json"),"utf8"));
  assert(running.contextDataEqual && running.rows.length === 6 && running.contextPuts === 0 && running.revision === 1);
  assert.equal(running.held,0);assert.equal(running.active,0);
  assert.equal(running.informationModuleSha256,consumers.sourceHashes.find(input=>input.file.endsWith("/dist/celestial-object-information.js")).sha256);
  sourceRecoveryInputs = consumers.sourceHashes;
  runningSourceRecovery = {epochStartedAt:running.epochStartedAt,contextUpstream:running.contextUpstream,informationModuleSha256:running.informationModuleSha256};
  const previous = JSON.parse(await fs.readFile(path.join(evidence,"experience-combined-clean-v20-candidate-2026-09-29.json"),"utf8"));
  const unchanged = await fingerprintBundle(path.join(root,previous.bundle));
  assert.equal(unchanged.sha256,previous.fingerprint.sha256,"prior_v20_candidate_changed");
  previousCandidate = {bundle:previous.bundle,sha256:unchanged.sha256,rawPackageBytes:previous.rawPackageBytes};
}
const record = { scope: "Immutable native development candidate; shared encoded-cache startup, guarded route dates and optional coordinate grids. Not native open/official package/phone/quality/performance acceptance", bundle,
  apiOrigin: "http://127.0.0.1:8791", diagnostics, appDebug: false, fingerprint, rawPackageBytes: packages,
  ...(projectionInputs ? { projectionInputs, projectionScope: "Shared fixed-view projection reuse included; paired software output/geometry equality and CPU work reduction, not a uniform scene speedup or native performance acceptance" } : {}) };
if (opticalInputs) Object.assign(record,{opticalInputs,runningOpticalInputs,opticalScope:"Six admitted local target publications and one selected-spectrum shared GPU path; current 8791 reads verified while retaining the 8789 Context owner. Software checks only; no native acceptance."});
if (sourceRecoveryInputs) Object.assign(record,{sourceRecoveryInputs,runningSourceRecovery,previousCandidate,
  sourceRecoveryScope:"Current compiled source-failure/recovery and Mini transport/cache/component functions. Previous GPU owners unchanged; current modal/source text checked in Node, not native composition. v20 unchanged and v21 prepared unopened."});
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ sha256: fingerprint.sha256, fileCount: fingerprint.fileCount, rawBytes: fingerprint.totalBytes, rawPackageBytes: packages, diagnostics }));
