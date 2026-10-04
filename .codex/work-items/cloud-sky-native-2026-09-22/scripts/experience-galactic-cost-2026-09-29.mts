// Same-page paired cost observation. No target FPS or native memory claim.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const output = ".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-galactic-cost-2026-09-29.json";
await assert.rejects(fs.access(output), { code: "ENOENT" });
const prefix = "output/playwright/cloud-sky-galactic-causal-0929-";
const inputs = JSON.parse(await fs.readFile(prefix + "before/inputs.json", "utf8"));
const versions = await Promise.all(["before", "after"].map(async phase => {
  const record = JSON.parse(await fs.readFile(prefix + phase + "/result.json", "utf8"));
  const script = await fs.readFile(prefix + phase + "/production.js", "utf8");
  assert.equal(createHash("sha256").update(script).digest("hex"), record.sourceBundleSha256);
  return { phase, record, script };
}));
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
let result: any;
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent('<canvas width="390" height="844"></canvas>');
  await page.evaluate("globalThis.__name = target => target");
  for (const version of versions) {
    await page.addScriptTag({ content: version.script });
    await page.evaluate(phase => { (globalThis as any)[phase] = (globalThis as any).skyQualityProduction; }, version.phase);
  }
  result = await page.evaluate(async inputs => {
    const decoded = new Map(), imageIds = new WeakMap();
    for (const asset of inputs.images) {
      const image = new Image(); image.src = asset.data; await image.decode(); decoded.set(asset.id, image); imageIds.set(image, asset.id);
    }
    const gl = document.querySelector("canvas")!.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
    const failures: string[] = [], allocations = { created: 0, deleted: 0 }, uploads: string[] = [];
    const create = gl.createTexture.bind(gl), retire = gl.deleteTexture.bind(gl), upload = gl.texImage2D.bind(gl);
    gl.createTexture = () => { const texture = create(); if (texture) allocations.created++; return texture; };
    gl.deleteTexture = texture => { if (texture) allocations.deleted++; retire(texture); };
    gl.texImage2D = function (...args: any[]) { uploads.push(imageIds.get(args[5]) ?? "other"); return (upload as any)(...args); };
    const phases = ["before", "after"] as const;
    const owners = Object.fromEntries(phases.map(phase => [phase, (globalThis as any)[phase].createSkyGpuRenderer(gl, 1,
      { imageFailed: (image: object) => failures.push(imageIds.get(image)) })]));
    const rows: any[] = [], stats = (values: number[]) => {
      const ordered = [...values].sort((a, b) => a - b);
      return { values, samples: values.length, medianMs: (ordered[5]! + ordered[6]!) / 2, p95Ms: ordered[11] };
    };
    try {
      for (const scenario of inputs.scenarios.filter((scenario: any) => ["polaris-local", "polaris-overview"].includes(scenario.name))) {
        const atlas = new Map(scenario.images.map((id: string) => [id, decoded.get(id)])), galaxy = decoded.get("galactic");
        const production = (globalThis as any).after;
        const resource = production.selectSkyLandscapeResource(inputs.landscape, [...atlas.values(), galaxy], false);
        const panorama = { image: decoded.get(`landscape:${resource.id}`), mask: inputs.masks.find((mask: any) => mask.resource.id === resource.id) };
        const supplement = production.resolveSkyStellarSupplement(inputs.saoPublication,
          scenario.saoTileIds.map((id: string) => new Map(inputs.saoTiles).get(id)), inputs.report.skyScene, "2026-09-29T21:00:00.000Z");
        const paint = (phase: "before" | "after") => {
          const args: any[] = [owners[phase], inputs.report, "2026-09-29T21:00:00.000Z", null, null, 390.4, 844, scenario.mode,
            undefined, undefined, scenario.fov, null, scenario.basis];
          args[15] = { frame: scenario.frame, images: atlas, enabled: true }; args[16] = supplement; args[26] = galaxy;
          args[34] = { enabled: true, panorama }; args[35] = { horizontal: true, equatorial: false };
          (globalThis as any)[phase].drawSkyScene(...args);
        };
        const first: any = {};
        for (const phase of phases) { const start = performance.now(); paint(phase); gl.finish(); first[phase] = performance.now() - start; }
        for (let warm = 0; warm < 4; warm++) for (const phase of warm % 2 ? [...phases].reverse() : phases) { paint(phase); gl.finish(); }
        const samples = { before: { submit: [] as number[], drain: [] as number[] }, after: { submit: [] as number[], drain: [] as number[] } };
        const priorUploads = uploads.length;
        for (let pair = 0; pair < 12; pair++) for (const phase of pair % 2 ? [...phases].reverse() : phases) {
          const start = performance.now(); paint(phase); const submitted = performance.now(); gl.finish();
          samples[phase].submit.push(submitted - start); samples[phase].drain.push(performance.now() - submitted);
        }
        if (uploads.length !== priorUploads) throw Error("steady_background_reuploaded");
        rows.push({ name: scenario.name, fov: scenario.fov, firstSubmissionAndDrainMs: first, measuredTextureUploads: 0,
          before: { submissionWall: stats(samples.before.submit), softwareGpuDrain: stats(samples.before.drain) },
          after: { submissionWall: stats(samples.after.submit), softwareGpuDrain: stats(samples.after.drain) } });
      }
    } finally { for (const owner of Object.values(owners) as any[]) owner.dispose(); }
    return { rows, allocations, imageFailures: failures, glError: gl.getError(),
      decodedImageCount: decoded.size, textureUploads: uploads.length };
  }, inputs);
} finally { await browser.close(); }
assert.equal(result.glError, 0); assert.deepEqual(result.imageFailures, []); assert.equal(result.allocations.created, result.allocations.deleted);
const record = { scope: "Two separately owned production renderers in the same Chromium/SwiftShader page, fixed actual data/images; first submission plus drain recorded, four alternating warmup pairs and twelve alternating measured pairs. Submission can contain synchronous waits. Two owners coexist only in this lab comparison. No target FPS, native memory, controls or final cost acceptance.",
  beforeBundle: versions[0]!.record.sourceBundleSha256, afterBundle: versions[1]!.record.sourceBundleSha256,
  inputsSha256: versions[0]!.record.inputsSha256, ...result };
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output, rows: result.rows.map((row: any) => ({ name: row.name,
  beforeSubmitMedian: row.before.submissionWall.medianMs, afterSubmitMedian: row.after.submissionWall.medianMs,
  beforeDrainMedian: row.before.softwareGpuDrain.medianMs, afterDrainMedian: row.after.softwareGpuDrain.medianMs })) }));
