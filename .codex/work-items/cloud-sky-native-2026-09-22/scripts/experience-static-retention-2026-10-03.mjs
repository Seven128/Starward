// Read-only audit of existing local evidence stores. No image extraction or publication.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectSkyStaticRetention } from "../../../../tools/deployment/sky-static-release.mjs";
import { validateSkyStaticBundle } from "../../../../tools/deployment/sky-static-bundle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const output = path.resolve(root, process.argv[2]);
if (path.dirname(output) !== path.join(root, "output") || !path.basename(output).startsWith("sky-static-retention-")) throw new Error("output_outside_scope");
await mkdir(output);
const selected = [
  { path: "output/sky-static-owner-independent-1002-r4/normal-store", meaning: "Existing controlled two-image retained-union/rollback fixture, not deployed." },
  { path: "output/sky-static-owner-independent-1002-r4/failure-store", meaning: "Existing controlled failed-preparation fixture, not deployed." },
  { path: "output/sky-static-owner-independent-1002-r4/verify-store", meaning: "Existing controlled HTTP verification fixture, not deployed." },
  { path: "output/sky-static-sealed-artifact-1002-r1", meaning: "Existing real historical default export artifact; no current export/prepared inventory/mount/rollback inference." },
];
async function bind(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return { path: path.relative(root, file).replaceAll("\\", "/"), bytes: (await lstat(file)).size, sha256: digest.digest("hex") };
}
async function tree(directory) {
  const rows = [];
  async function visit(current) {
    for (const name of (await readdir(current)).sort()) {
      const file = path.join(current, name), info = await lstat(file);
      if (info.isSymbolicLink()) throw new Error("input_link_not_admitted");
      if (info.isDirectory()) await visit(file);
      else if (info.isFile()) rows.push(await bind(file));
      else throw new Error("input_file_type_not_admitted");
    }
  }
  await visit(directory); return rows;
}
const protection = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json");
const protectedRows = JSON.parse(await readFile(protection, "utf8"));
for (const row of protectedRows) if ((await bind(path.join(root, row.path))).sha256 !== row.sha256) throw new Error("protected_input_changed");
const controlling = [fileURLToPath(import.meta.url), path.join(root, "tools/deployment/sky-static-release.mjs"),
  path.join(root, "tools/deployment/sky-static-bundle.mjs"), protection, ...protectedRows.map(row => path.join(root, row.path))];
const before = [...await Promise.all(controlling.map(bind))];
for (const item of selected) before.push(...await tree(path.join(root, item.path)));
await writeFile(path.join(output, "inputs-before.json"), JSON.stringify(before, null, 2) + "\n", { flag: "wx" });
await writeFile(path.join(output, "executed-script.mjs"), await readFile(fileURLToPath(import.meta.url)), { flag: "wx" });
await writeFile(path.join(output, "executed-owner.mjs"), await readFile(path.join(root, "tools/deployment/sky-static-release.mjs")), { flag: "wx" });
const reports = [];
for (const item of selected) {
  const directory = path.join(root, item.path);
  if ((await realpath(directory)).toLowerCase() !== directory.toLowerCase()) throw new Error("input_root_not_plain");
  const report = await inspectSkyStaticRetention({ validation: { operations: { skyStaticDirectory: directory } },
    deploy: { STARWARD_SKY_STATIC_DIRECTORY: directory } });
  reports.push({ ...item, report });
}
const artifact = await validateSkyStaticBundle(path.join(root, selected[3].path, "publication"));
const after = [...await Promise.all(controlling.map(bind))];
for (const item of selected) after.push(...await tree(path.join(root, item.path)));
if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("input_bytes_changed");
await writeFile(path.join(output, "inputs-after.json"), JSON.stringify(after, null, 2) + "\n", { flag: "wx" });
const result = { status: "LOCAL_DISK_RETENTION_DRY_RUN_NO_DELETION", inputsBeforeAfterExact: true, reports,
  historicalDefaultArtifact: { publicationHash: artifact.publicationHash, publishedFiles: artifact.files, publishedPayloadBytes: artifact.bytes },
  meaning: "Existing evidence bytes only. No new extraction, processing, download, cloud operation, deletion or live mount/receipt/backup inventory. Logical file lengths are not allocated physical bytes. All reference completeness, reclaimable bytes, external images/logs/database/backups and 180GB host headroom remain unverified. Default Prepared registry is empty." };
await writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output, result: await bind(path.join(output, "result.json")),
  logicalBytes: reports.map(row => ({ input: row.path, bytes: row.report.logicalBytes, files: row.report.files })), historicalDefaultArtifact: result.historicalDefaultArtifact }));
