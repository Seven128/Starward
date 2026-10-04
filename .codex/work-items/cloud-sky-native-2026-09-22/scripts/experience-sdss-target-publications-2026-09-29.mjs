import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence/sdss-target-admission-0929");
const admission = JSON.parse(await readFile(path.join(evidence, "acquisition.json"), "utf8"));
const decoded = JSON.parse(await readFile(path.join(evidence, "decode-validation.json"), "utf8"));
const template = JSON.parse(await readFile(path.join(root, "workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json"), "utf8"));
const digest = value => createHash("sha256").update(value).digest("hex");
const prepared = [];
for (const target of admission.targets) {
  if (!/^M:(63|64|81|82|87)$/u.test(target.reference)) throw Error("unexpected_target");
  const slug = target.reference.replace(":", "").toLowerCase();
  const directory = path.join(root, `workers/miniapp-api/assets/deep-sky/sdss-${slug}`);
  try { await access(directory); throw Error("publication_directory_already_exists"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const levels = {}, files = [];
  for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"]) {
    const image = admission.images.find(row => row.reference === target.reference && row.level === level);
    const check = decoded.images.find(row => row.file === image?.file);
    const bytes = await readFile(path.join(evidence, image.file));
    if (!check?.decoded || check.sha256 !== image.sha256 || bytes.length !== image.bytes || digest(bytes) !== image.sha256)
      throw Error("candidate_bytes_not_validated");
    levels[level] = Object.fromEntries(["file", "scaleArcsecPerPixel", "pixels", "fieldDegrees", "bytes", "sha256", "requestUrl"]
      .map(key => [key, image[key]]));
    files.push({ file: image.file, bytes });
  }
  const publication = { schemaVersion: "sdss-dr17-target-optical-publication-v1",
    publicationId: `sdss-dr17-${slug}.v20260929`, objectRef: target.reference, center: target.center,
    orientation: template.orientation, source: template.source,
    processing: { runtimeNetwork: "forbidden", modification: template.processing.modification,
      coverage: `Only ${target.reference} at the three published scales; no whole-sky or complete scientific pixel coverage is claimed. The requested center is in the SDSS imaging footprint; per-pixel and per-band coverage were not measured. The unmodified historical display composite can contain saturation, foreground-star and mosaic artifacts; fine cutouts show a limited central field, not the entire galaxy.${target.reference === "M:63" ? " The overview includes a conspicuous red stripe away from the galaxy center." : ""}` },
    levels };
  prepared.push({ directory, publication, files, hash: digest(JSON.stringify(publication)) });
}
// Validate every input before creating the bounded local publications. No network.
for (const row of prepared) {
  await mkdir(row.directory);
  for (const file of row.files) await writeFile(path.join(row.directory, file.file), file.bytes, { flag: "wx" });
  await writeFile(path.join(row.directory, "manifest.json"), JSON.stringify(row.publication, null, 2) + "\n", { flag: "wx" });
}
const result = prepared.map(row => ({ reference: row.publication.objectRef, publicationId: row.publication.publicationId,
  publicationHash: row.hash, scales: Object.fromEntries(Object.entries(row.publication.levels).map(([level, asset]) => [level, asset.scaleArcsecPerPixel])),
  bytes: row.files.reduce((sum, file) => sum + file.bytes.length, 0) }));
await writeFile(path.join(evidence, "local-publications.json"), JSON.stringify({ scope: "Local assets only; no deployment or target acceptance", publications: result }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(result));
