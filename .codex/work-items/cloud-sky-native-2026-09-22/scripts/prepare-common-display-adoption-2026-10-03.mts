/** Prepare the exact shared adoption delta. This command never edits production. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createCandidates, sky } from "./pre-aid-common-display-candidate-sources-2026-10-03.mts";

const root = process.cwd();
const output = path.join(root, "output/pre-aid-common-display-adoption-1003-r1");
assert(!fs.existsSync(output));
fs.mkdirSync(output, { recursive: true });
const hash = (text: string | Uint8Array) => createHash("sha256").update(text).digest("hex");
const bind = (file: string) => {
  const absolute = fs.realpathSync(path.resolve(root, file));
  const bytes = fs.readFileSync(absolute);
  return { path: path.relative(root, absolute).replaceAll("\\", "/"), bytes: bytes.length, sha256: hash(bytes) };
};
const { originals, candidates } = createCandidates(root);
const clean = (name: string, before: string, after: string) => {
  const file = sky + name + ".ts", text = candidates.get(file)!;
  assert.equal(text.split(before).length - 1, 1, name);
  candidates.set(file, text.replace(before, after));
};
clean("sky-artwork-level-composition", `/** Task-only pixel-center facts in the frozen highp shader model. Precision is
 * unverified; this supplies no certified ICRS-domain/area/display decision. */`,
  `/** Pixel-center facts in this renderer's highp catalog-region shader model.
 * Physical ICRS accuracy and area absence are unverified. Zero stays unknown;
 * consumers may use positive components only as a model-domain display guard. */`);
clean("sky-gpu-renderer", `      // Task-only controlled counterfactual: old unflushed getter boundary.
      __taskObserveWithoutFlush: contributions.observeRegion,
`, "");
clean("sky-gpu-renderer", "export interface SkyGpuRenderer extends SkyRenderSurface, SkyArtworkLevelSurface, SkyArtworkContributionSurface { dispose(): void; __taskObserveWithoutFlush?: typeof createSkyGpuArtworkContributions extends (...a:any[])=>infer T ? T extends {observeRegion:infer O}?O:never:never }",
  "export interface SkyGpuRenderer extends SkyRenderSurface, SkyArtworkLevelSurface, SkyArtworkContributionSurface { dispose(): void }");
clean("sky-sdss-science-scene", "/** Task-only pre-aid exact expected/native join. Scientific opacity stays 1. */",
  "/** Join local model facts with the original expected, prepared and current\n * source obligations. Failed or retired expected sources are never neutral. */");
clean("sky-deep-auxiliary-visibility", `/** Task-only eligibility in the frozen renderer's catalog-region shader model.
 * This is a display guard, not physical ICRS accuracy or scientific recognition.
 * Legacy 24–96 tuning is only a candidate: no production/default adoption. */`,
  `/** Aid eligibility in the renderer's catalog-region shader model. This does
 * not certify physical ICRS accuracy, scientific quality or recognition.
 * The retained legacy scale curve is presentation tuning, not a quality limit. */`);
clean("sky-scene-render", `  // Task-only display candidate: one immutable decision input before all aids.
  const preAidScienceFacts=scienceSubmission && !scienceSubmission.allowInfrared?skyScienceOpticalDisplayFacts(scienceSubmission):null;
  if(scienceSubmission && preAidScienceFacts)
    (context as SkyRenderSurface & {__taskRecordPreAid?:(submission:unknown,result:unknown,facts:unknown)=>void}).__taskRecordPreAid?.(scienceSubmission,preAidScienceFacts.local,preAidScienceFacts);`,
  `  // One immutable model-domain input before aids. A permitted whole-source
  // W3 alternative retains its actual-painted legacy rule and needs no local probe.
  const preAidScienceFacts = scienceSubmission && !scienceSubmission.allowInfrared
    ? skyScienceOpticalDisplayFacts(scienceSubmission) : null;`);
const require = createRequire(path.join(root, "package.json"));
const tsPath = path.join(root, "apps/wechat-miniapp/node_modules/typescript/lib/typescript.js");
const ts = require(tsPath);
assert.equal(ts.version, "5.9.3");
const bindings = [fileURLToPath(import.meta.url), process.execPath, tsPath,
  ".codex/work-items/cloud-sky-native-2026-09-22/scripts/pre-aid-common-display-candidate-sources-2026-10-03.mts",
  ".codex/work-items/cloud-sky-native-2026-09-22/scripts/pre-aid-local-candidate-sources-2026-10-03.mts",
  ...originals.keys()].map(bind);
const replacements = [];
for (const [file, text] of candidates) {
  assert(!text.includes("__task"), file + " has a diagnostic tap");
  assert(!text.includes("Task-only"), file + " has a task-only declaration");
  const diagnostics = ts.transpileModule(text, { fileName: file, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).diagnostics ?? [];
  assert.equal(diagnostics.length, 0, file);
  const before = path.join(output, "original", file), after = path.join(output, "shared", file);
  fs.mkdirSync(path.dirname(before), { recursive: true }); fs.mkdirSync(path.dirname(after), { recursive: true });
  fs.writeFileSync(before, originals.get(file)!, { flag: "wx" }); fs.writeFileSync(after, text, { flag: "wx" });
  const diff = spawnSync("git", ["diff", "--no-index", "--", before, after], { cwd: root, encoding: "utf8" });
  assert(diff.status === 1 || diff.status === 0);
  const diffPath = path.join(output, path.basename(file) + ".diff");
  fs.writeFileSync(diffPath, diff.stdout, { flag: "wx" });
  replacements.push({ original: bind(file), snapshot: bind(before), shared: bind(after), diff: bind(diffPath) });
}
assert.equal(replacements.length, 6);
assert.deepEqual(bindings.map(record => bind(record.path)), bindings);
fs.writeFileSync(path.join(output, "result.json"), JSON.stringify({
  status: "SHARED_ADOPTION_DELTA_PREPARED_NOT_APPLIED", typescriptVersion: ts.version,
  before: bindings, after: bindings.map(record => bind(record.path)), replacements,
  scope: "Exact six-owner derivative of the bounded task candidate plus the independently checked two EMPTY/W3 gates. Diagnostic renderer/Scene taps and task-only claims removed. No production writes, browser/GPU, default policy/budget/source changes or native acceptance. The existing accepted Canvas/DOM record contract is reused without page changes.",
}, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output: path.relative(root, output), replacements: replacements.map(record => ({ path: record.original.path, sha256: record.shared.sha256 })), result: bind(path.join(output, "result.json")) }));
