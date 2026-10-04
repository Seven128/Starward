import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { SkyLandscapePublicationService } from "../../../../workers/miniapp-api/src/sky-landscape-publication.ts";
import { decodeSkyLandscapeAlpha } from "../../../../packages/miniapp-contracts/src/sky-landscape-publication.ts";
import { createSkyPanoramaMask, skyPanoramaAlpha } from "../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-mask.ts";
import { createSkyViewBasis, unprojectSkyPoint } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";

const level = process.argv[2] ?? "overview"; assert.ok(["overview", "detail"].includes(level));
const root = path.resolve("."), output = path.join(root, `output/playwright/cloud-sky-landscape-production-0928${level === "overview" ? "" : "-detail"}`);
assert.equal(await fs.access(path.join(output, "result.json")).then(() => true, () => false), false);
await fs.mkdir(output, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const owner = new SkyLandscapePublicationService(), publication = owner.manifest(), resource = publication.resources.find(resource => resource.id === level)!;
const image = await owner.asset(publication.publicationHash, resource.image.file);
const input = await owner.asset(publication.publicationHash, resource.alpha.file);
const mask = createSkyPanoramaMask(publication, resource, decodeSkyLandscapeAlpha(JSON.parse(input.bytes.toString()), resource));
const bundle = await build({ entryPoints: [path.join(root, "apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts")],
  bundle: true, write: false, format: "iife", globalName: "skyProductionGpu", platform: "browser", target: "es2022" });
const scenarios = [
  ...[0, 90, 180, 270].flatMap(heading => [5, 85].map(fov => ({ heading, beta: fov === 5 ? 90 : 100, gamma: 0, fov }))),
  { heading: 0, beta: 180, gamma: 0, fov: 267.8 },
  { heading: 0, beta: 100, gamma: 27, fov: 85 },
];
const width = 390, height = 844, rows: unknown[] = [];
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(`<style>body{margin:0}</style><canvas width="${width}" height="${height}"></canvas>`);
  await page.evaluate("globalThis.__name = target => target");
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  await page.evaluate(async ({ data, publication, resource }) => {
    const image = new Image(); image.src = data; await image.decode();
    const canvas = document.querySelector("canvas")!;
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
    let created = 0, deleted = 0;
    const create = gl.createTexture.bind(gl), remove = gl.deleteTexture.bind(gl);
    gl.createTexture = () => { created++; return create(); };
    gl.deleteTexture = value => { deleted++; remove(value); };
    const renderer = (globalThis as any).skyProductionGpu.createSkyGpuRenderer(gl, 1);
    (globalThis as any).trial = { renderer, gl, counts: () => ({ created, deleted }),
      panorama: { image, mask: { publication, resource } } };
  }, { data: `data:image/png;base64,${image.bytes.toString("base64")}`, publication, resource });
  for (const [index, scenario] of scenarios.entries()) {
    const basis = createSkyViewBasis(scenario.heading, scenario.beta, scenario.gamma)!;
    const actual = await page.evaluate(({ basis, fov, width, height }) => {
      const { renderer, gl, panorama } = (globalThis as any).trial;
      // Red output has exactly zero green/blue. White underneath makes the
      // production source-over pass's green channel an actual alpha measurement.
      renderer.begin(width, height, "#FFFFFF");
      if (!renderer.landscape({ basis, verticalFovDeg: fov }, { direction: [0, 1, 0], altitudeDeg: -24 }, true, panorama))
        throw Error("production_panorama_failed");
      renderer.finish();
      const rgba = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      const samples = [];
      for (let y = 0; y < height; y += 5) for (let x = 0; x < width; x += 5)
        samples.push({ x: x + .5, y: y + .5, alpha: 255 - rgba[((height - 1 - y) * width + x) * 4 + 1] });
      return { samples, error: gl.getError(), counts: (globalThis as any).trial.counts() };
    }, { basis, fov: scenario.fov, width, height });
    const differences = actual.samples.map((sample: { x: number; y: number; alpha: number }) => {
      const expected = skyPanoramaAlpha(mask, unprojectSkyPoint(sample.x, sample.y, basis, width, height, scenario.fov)!);
      return { expected, actual: sample.alpha, difference: Math.abs(expected - sample.alpha) };
    });
    const interiorErrors = differences.filter(value => value.expected === 0 && value.actual > 1 || value.expected === 255 && value.actual < 254);
    assert.equal(actual.error, 0); assert.equal(interiorErrors.length, 0);
    assert.ok(differences.some(value => value.expected === 255), "exercise actual painted landscape");
    rows.push({ ...scenario, samples: differences.length, interiorErrors: interiorErrors.length,
      maximumAlphaDifference: Math.max(...differences.map(value => value.difference)), textureCounts: actual.counts });
    if (index === 0 || scenario.fov > 260) await page.locator("canvas").screenshot({ path: path.join(output, `alpha-${index}.png`) });
  }
  const disposal = await page.evaluate(() => {
    const trial = (globalThis as any).trial; trial.renderer.dispose();
    return { counts: trial.counts(), error: trial.gl.getError() };
  });
  assert.deepEqual(disposal.counts, { created: 1, deleted: 1 }); assert.equal(disposal.error, 0);
  const result = { scope: "Actual production renderer/shared texture owner in Chromium software WebGL; component alpha/seam/resource evidence, not native peak, full visual or phone acceptance",
    publicationHash: publication.publicationHash, imageSha256: resource.image.sha256, alphaBytes: mask.alpha.length,
    conservativeBoundsBytes: mask.opaqueFromRow.byteLength, width, height, rows, disposal };
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ rows: rows.length, imageHash: resource.image.sha256, disposal }));
} finally { await browser.close(); }
