// Real public observation, local publications and production renderer/cache.
// SDK route/context IDs and the report stay in memory, never in evidence.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { build } from "esbuild";
import ts from "typescript";
import sdk from "miniprogram-automator";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
import { projectAdoptedSkyCatalog } from "../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts";
import { attachSkyCatalog, resolveSkySceneFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { resolveConstellationFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts";
import { createSkyViewBasis } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { constellationVisibility } from "../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts";
import { artworkIntersectsView, skyArtworkViewBounds } from "../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts";
import { decodeSkyLandscapeAlpha } from "../../../../packages/miniapp-contracts/src/sky-landscape-publication.ts";
import { createSkyPanoramaMask } from "../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-mask.ts";
import { selectSkyHipsTiles } from "../../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts";
import { exactSkyObservationFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts";

const root = path.resolve("."), origin = "http://127.0.0.1:8789";
const phase = process.argv[2] ?? "baseline";
assert.ok(["baseline", "tight-visibility", "adaptive"].includes(phase));
const port = Number(process.argv[3] ?? 9439); assert.ok([9439, 9440].includes(port));
const output = path.join(root, "output/playwright", `cloud-sky-landscape-coexistence-0928${phase === "baseline" ? "" : "-" + phase}`);
assert.equal(await fs.access(path.join(output, "result.json")).then(() => true, () => false), false);
await fs.mkdir(output, { recursive: true });
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function json(relative: string): Promise<any> {
  const response = await fetch(origin + relative, { signal: AbortSignal.timeout(8000) });
  assert.equal(response.status, 200, "actual local publication/report"); return response.json();
}
async function image(relative: string, expected: { sha256: string; bytes: number }) {
  const response = await fetch(origin + relative, { signal: AbortSignal.timeout(8000) });
  assert.equal(response.status, 200); const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(bytes.length, expected.bytes); assert.equal(hash(bytes), expected.sha256);
  return `data:${relative.endsWith(".png") ? "image/png" : "image/jpeg"};base64,${Buffer.from(bytes).toString("base64")}`;
}
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: `ws://127.0.0.1:${port}` }), 5000);
boundWechatProtocol(program, 5000);
let report: any, catalog: any, at: string, size: { width: number; height: number };
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  const description = await (await page.$(".sky-orientation-canvas"))!.attribute("aria-label");
  at = description!.match(/场景时刻 ([0-9T:.Z-]+)/)![1]!;
  const contextId = decodeURIComponent(String(page.query.contextId));
  const spotId = decodeURIComponent(String(page.query.spotId));
  const raw = projectAdoptedSkyCatalog(await json(`/v2/spots/${encodeURIComponent(spotId)}/sky?contextId=${encodeURIComponent(contextId)}&catalogVersion=bsc5p-bright-stars.v3`));
  const reference = raw.data.skyScene.catalog!;
  const stars = await json(`/v2/sky/catalogs/${encodeURIComponent(reference.catalogVersion)}/${reference.catalogHash}`);
  report = attachSkyCatalog(raw.data, stars.data); catalog = (await json("/v2/sky/constellations")).data;
  size = await (await page.$("#spot-night-sky-scene"))!.size();
} finally { await program.disconnect(); }
assert.equal(at!, "2026-09-28T16:00:00.000Z");
assert.ok(report.skyScene.catalog && report.skyScene.publication);
const frame = resolveConstellationFrame(catalog, report.skyScene, at!); assert.ok(frame);
const legacySource = phase === "tight-visibility" ? await fs.readFile(path.join(root,
  ".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-artwork-visibility-before-2026-09-28.ts"), "utf8") : null;
const legacyIntersects = legacySource ? new Function("skyArtworkViewBounds", "dot",
  ts.transpileModule(legacySource.slice(legacySource.indexOf("export function artworkIntersectsView"))
    .replace("export function", "function"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + "\nreturn artworkIntersectsView;")
  (skyArtworkViewBounds, (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + value * b[i]!, 0)) as typeof artworkIntersectsView : artworkIntersectsView;
const rastabanIndex = report.skyScene.catalog.entries.findIndex((entry: any) => entry.displayName?.includes("Rastaban"));
assert.ok(rastabanIndex >= 0, "actual selected catalog identity");
const rastaban = resolveSkySceneFrame(report.skyScene, at!)!.points.find(point => point[0] === rastabanIndex)!;
assert.ok(rastaban);
const scenarios: any[] = [
  { name: "rastaban-85", heading: rastaban[1], beta: 90 + rastaban[2], fov: 85 },
  { name: "north-all-sky", heading: 0, beta: 180, fov: 267.8 },
  ...[0, 60, 120, 180, 240, 300].flatMap(heading => [94, 120].flatMap(beta =>
    [5, 25, 32, 39.9, 85].map(fov => ({ name: `view-${heading}-${beta}-${fov}`, heading, beta, fov })))),
].map(scenario => {
  const view = { basis: createSkyViewBasis(scenario.heading, scenario.beta, 0)!, verticalFovDeg: scenario.fov };
  const visible = constellationVisibility(scenario.fov, true) > 0
    ? frame.images.filter(figure => artworkIntersectsView(figure.registration, view, size!.width, size!.height)).map(figure => figure.source.id) : [];
  const legacyVisible = constellationVisibility(scenario.fov, true) > 0
    ? frame.images.filter(figure => legacyIntersects(figure.registration, view, size!.width, size!.height)).map(figure => figure.source.id) : [];
  return { ...scenario, view, visible, legacyVisible };
});
const ids = new Set(scenarios.flatMap(scenario => [...scenario.visible, ...scenario.legacyVisible]));
const atlas = catalog.images.filter((asset: any) => ids.has(asset.id));
const images: Array<{ id: string; width: number; height: number; sha256: string; data: string }> = [];
// Bounded sequential local reads; never download original sources again.
for (const asset of atlas) images.push({ id: asset.id, width: asset.width, height: asset.height, sha256: asset.sha256,
  data: await image(`/v2/sky/constellations/${catalog.catalogHash}/assets/${encodeURIComponent(asset.file)}`, asset) });
const galactic = await json("/v2/sky/galactic/manifest");
images.push({ id: "galactic", ...galactic.image, data: await image(galactic.image.downloadUrl, galactic.image) });
const publication = await json("/v2/sky/landscape/manifest"), masks: any[] = [];
for (const resource of publication.resources) {
  images.push({ id: `landscape:${resource.id}`, ...resource.image, data: await image(resource.image.downloadUrl, resource.image) });
  const alpha = decodeSkyLandscapeAlpha(await json(resource.alpha.downloadUrl), resource);
  masks.push(createSkyPanoramaMask(publication, resource, alpha));
}
if (phase === "adaptive") {
  const wide = await json("/v2/sky/wide-field/manifest");
  for (const tile of wide.tiles) images.push({ id: `w3:${tile.pixel}`, width: 512, height: 512, sha256: tile.sha256,
    data: await image(tile.downloadUrl, tile) });
  for (const [name, base, retained] of [["w3-rastaban-85", scenarios[0], false], ["w3-all-sky", scenarios[1], false],
    ["w3-return-retained-85", scenarios[0], true]] as const) {
    const selection = selectSkyHipsTiles({ frame: exactSkyObservationFrame(report, at!)!, view: base.view,
      width: size!.width, height: size!.height, maxOrder: 0, minOrder: 0 });
    assert.equal(selection.state, "SELECTED");
    scenarios.push({ ...base, name, w3: retained ? wide.tiles.map((tile: any) => tile.pixel) : (selection as any).pixels });
  }
}
async function compile(legacy: boolean) {
  return build({ stdin: { resolveDir: root, contents:
    `import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';import {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';import {selectSkyLandscapeResource} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';import {skyGalacticBandAt} from './apps/wechat-miniapp/src/features/sky/sky-galactic-band';globalThis.${legacy ? "skyLegacy" : "skyCoexistence"}={createSkyGpuRenderer,drawSkyScene,selectSkyLandscapeResource,skyGalacticBandAt};` },
    plugins: legacy ? [{ name: "actual-before-visibility", setup(build) { build.onLoad({ filter: /[\\/]sky-artwork-visibility\.ts$/ }, () =>
      ({ contents: legacySource!, loader: "ts", resolveDir: path.join(root, "apps/wechat-miniapp/src/features/sky") })); } }] : [],
    bundle: true, write: false, platform: "browser", format: "iife", target: "es2022", tsconfig: path.join(root, "apps/wechat-miniapp/tsconfig.json") });
}
const bundle = await compile(false), beforeBundle = legacySource ? await compile(true) : null;
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: Math.round(size!.width), height: Math.round(size!.height) } });
  await page.setContent(`<style>body{margin:0}</style><canvas width="${Math.round(size!.width)}" height="${Math.round(size!.height)}"></canvas>`);
  await page.evaluate("globalThis.__name = target => target"); await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  if (beforeBundle) await page.addScriptTag({ content: beforeBundle.outputFiles[0]!.text });
  await page.evaluate(async inputs => {
    const decoded = new Map(), imageIds = new WeakMap();
    for (const asset of inputs.images) {
      const image = new Image(); image.src = asset.data; await image.decode();
      if (image.width !== asset.width || image.height !== asset.height) throw Error("native_dimensions");
      decoded.set(asset.id, image); imageIds.set(image, asset.id);
    }
    (globalThis as any).inputs = { ...inputs, decoded, imageIds };
  }, { images, masks, report, frame, at: at!, size: size!, publication });
  const rows: any[] = [];
  for (const resource of phase === "adaptive" ? [{ id: "adaptive" }] : publication.resources) for (const scenario of scenarios) for (const legacy of beforeBundle ? [true, false] : [false]) {
    const row = await page.evaluate(({ resourceId, scenario, legacy, compare, adaptive }) => {
      const inputs = (globalThis as any).inputs, { createSkyGpuRenderer, drawSkyScene, selectSkyLandscapeResource, skyGalacticBandAt } = (globalThis as any)[legacy ? "skyLegacy" : "skyCoexistence"];
      const gl = document.querySelector("canvas")!.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
      const originals = { create: gl.createTexture.bind(gl), remove: gl.deleteTexture.bind(gl), bind: gl.bindTexture.bind(gl), upload: gl.texImage2D.bind(gl) };
      let bound: WebGLTexture | null = null, liveBytes = 0, peakBytes = 0, creates = 0, deletes = 0;
      const allocations = new Map<WebGLTexture, number>(), uploads: string[] = [];
      gl.createTexture = () => { const texture = originals.create(); if (texture) { creates++; allocations.set(texture, 0); } return texture; };
      gl.deleteTexture = texture => { if (texture && allocations.has(texture)) { deletes++; liveBytes -= allocations.get(texture)!; allocations.delete(texture); } originals.remove(texture); };
      gl.bindTexture = (target, texture) => { if (target === gl.TEXTURE_2D) bound = texture; originals.bind(target, texture); };
      gl.texImage2D = ((...args: any[]) => {
        (originals.upload as any)(...args);
        const image = args[args.length - 1];
        if (bound && image?.width && image?.height) {
          const bytes = image.width * image.height * 4; liveBytes += bytes - (allocations.get(bound) ?? 0);
          allocations.set(bound, bytes); peakBytes = Math.max(peakBytes, liveBytes); uploads.push(inputs.imageIds.get(image));
        }
      }) as any;
      const failures: string[] = [], renderer = createSkyGpuRenderer(gl, 1, { imageFailed: (image: object) => failures.push(inputs.imageIds.get(image)) });
      const visible = legacy ? scenario.legacyVisible : scenario.visible;
      const constellationImages = new Map(visible.map((id: string) => [id, inputs.decoded.get(id)]));
      const tiles = (scenario.w3 ?? []).map((pixel: number) => ({ layer: "WIDE_FIELD_W3", order: 0, pixel, image: inputs.decoded.get(`w3:${pixel}`) }));
      const galaxy = !tiles.length && skyGalacticBandAt(inputs.report, inputs.at, scenario.fov) ? inputs.decoded.get("galactic") : null;
      const otherImages = [...constellationImages.values(), ...tiles.map((tile: any) => tile.image), ...(galaxy ? [galaxy] : [])];
      if (adaptive) resourceId = selectSkyLandscapeResource(inputs.publication, otherImages, false).id;
      const mask = inputs.masks.find((mask: any) => mask.resource.id === resourceId);
      const layer = { frame: inputs.frame, images: constellationImages, enabled: true, failed: (image: object) => failures.push(inputs.imageIds.get(image)) };
      const panorama = { image: inputs.decoded.get(`landscape:${resourceId}`), mask };
      const passes: any[] = []; let snapshot: any = null;
      for (let repeat = 0; repeat < 3; repeat++) {
        const first = uploads.length, before = performance.now();
        drawSkyScene(renderer, inputs.report, inputs.at, null, null, inputs.size.width, inputs.size.height, "DAY",
          (value: any) => { snapshot = value; }, undefined, scenario.fov, null, scenario.view.basis, undefined, undefined,
          layer, undefined, undefined, undefined, undefined, undefined, tiles, undefined, undefined,
          null, null, inputs.decoded.get("galactic"), null, null, null, null, undefined, null, null,
          { enabled: true, panorama });
        gl.finish(); passes.push({ repeat, uploads: uploads.slice(first), liveBytes, softwareFrameMs: performance.now() - before });
      }
      const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let nonBasePixels = 0; for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i] !== 8 || pixels[i + 1] !== 13 || pixels[i + 2] !== 23) nonBasePixels++;
      let changedPixels = 0, maximumChannelDifference = 0;
      if (legacy) (globalThis as any).beforeRgba = pixels;
      else if (compare) {
        const previous = (globalThis as any).beforeRgba;
        for (let i = 0; i < pixels.length; i += 4) {
          let changed = false;
          for (let channel = 0; channel < 4; channel++) {
            const difference = Math.abs(pixels[i + channel]! - previous[i + channel]!);
            maximumChannelDifference = Math.max(maximumChannelDifference, difference); changed ||= difference !== 0;
          }
          if (changed) changedPixels++;
        }
      }
      const result = { name: scenario.name, heading: scenario.heading, beta: scenario.beta, fov: scenario.fov, resourceId,
        wideTiles: tiles.length, reservedLogicalBytes: otherImages.reduce((sum: number, image: any) => sum + image.width * image.height * 4, 0),
        legacy, changedPixels, maximumChannelDifference,
        visibleAtlasCount: visible.length, visibleAtlasBytes: [...constellationImages.values()].reduce((sum: number, image: any) => sum + image.width * image.height * 4, 0),
        passes, peakLogicalTextureBytes: peakBytes, nonBasePixels, paintedObjects: snapshot?.objects.length ?? 0,
        paintedLandscape: snapshot?.view.landscape?.resource?.id, failures, error: gl.getError() };
      // Preserve the actual composite until screenshot; caller invokes disposal afterwards.
      (globalThis as any).endCoexistence = () => {
        renderer.dispose(); const disposal = { creates, deletes, liveBytes, error: gl.getError() };
        gl.createTexture = originals.create; gl.deleteTexture = originals.remove; gl.bindTexture = originals.bind; gl.texImage2D = originals.upload;
        return disposal;
      };
      return result;
    }, { resourceId: resource.id, scenario, legacy, compare: Boolean(beforeBundle), adaptive: phase === "adaptive" });
    assert.equal(row.error, 0); assert.deepEqual(row.failures, []); assert.ok(row.nonBasePixels > 1000);
    assert.equal(row.paintedLandscape, row.resourceId, "actual panorama pass and pick snapshot");
    if (phase === "adaptive") { assert.equal(row.passes[1].uploads.length, 0); assert.equal(row.passes[2].uploads.length, 0); }
    if (beforeBundle && !legacy) assert.equal(row.changedPixels, 0, "culling must preserve the actual full-scene composite");
    if (!legacy && (scenario.name === "rastaban-85" || scenario.name === "view-0-94-25"))
      await page.locator("canvas").screenshot({ path: path.join(output, `${resource.id}-${scenario.name}.png`) });
    row.disposal = await page.evaluate(() => (globalThis as any).endCoexistence());
    assert.equal(row.disposal.liveBytes, 0); assert.equal(row.disposal.creates, row.disposal.deletes); assert.equal(row.disposal.error, 0);
    rows.push(row);
  }
  const result = { scope: "Actual current public observation and exact local images in production full-scene renderer/shared GPU cache. Logical RGBA texture allocations, repeated uploads and software WebGL composites only; not native decoded heap/GPU peak, target performance, full journey or phone acceptance.",
    selectedAtUtc: at!, logicalSize: size!, glDrawingBuffer: { width: Math.round(size!.width), height: Math.round(size!.height) },
    textureBudgetBytes: 16 * 1024 * 1024, catalogHash: catalog.catalogHash, landscapePublicationHash: publication.publicationHash,
    images: images.map(({ data: _, ...asset }) => asset), rows };
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ scenarios: rows.length, images: images.length, summary: publication.resources.map((resource: any) => {
    const values = rows.filter(row => row.resourceId === resource.id && !row.legacy);
    return { resourceId: resource.id, peakLogicalTextureBytes: Math.max(...values.map(row => row.peakLogicalTextureBytes)),
      repeatedUploadScenarios: values.filter(row => row.passes[1].uploads.length > 0).length,
      worstRepeatedUploads: values.reduce((worst, row) => row.passes[1].uploads.length > worst.passes[1].uploads.length ? row : worst).name };
  }) }));
} finally { await browser.close(); }
