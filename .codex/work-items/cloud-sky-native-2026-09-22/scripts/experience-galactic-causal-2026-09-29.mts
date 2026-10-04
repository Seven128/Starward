// Bounded same-frame full-production GPU comparison, reusing the existing
// environment whole-scene probe. Study controls never enter product code.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { projectAdoptedSkyCatalog } from "../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts";
import { attachSkyCatalog, resolveSkySceneFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { resolveConstellationFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts";
import { createSkyViewBasis } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { createSkyBrowsingCamera } from "../../../../apps/wechat-miniapp/src/features/sky/sky-browsing-camera.ts";
import { skyDomeProgress, skyDomeFieldOfView } from "../../../../apps/wechat-miniapp/src/features/sky/sky-zoom.ts";
import { constellationVisibility } from "../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts";
import { artworkIntersectsView } from "../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts";
import { decodeSkyLandscapeAlpha } from "../../../../packages/miniapp-contracts/src/sky-landscape-publication.ts";
import { createSkyPanoramaMask } from "../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-mask.ts";
import { createSaoCatalogClient } from "../../../../apps/wechat-miniapp/src/services/sao-catalog-client.ts";
import { selectSkyStellarTiles } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts";
import { supplementGeometry } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts";

const root = process.cwd(), task = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const phase = process.argv.includes("--after") ? "after" : "before";
const output = path.join(root, `output/playwright/cloud-sky-galactic-causal-0929-${phase}`);
const before = path.join(root, "output/playwright/cloud-sky-galactic-causal-0929-before");
await assert.rejects(fs.access(path.join(output, "result.json")), { code: "ENOENT" });
await fs.mkdir(output, { recursive: true });
const digest = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const origin = "http://127.0.0.1:8791", width = 390.4, height = 844, at = "2026-09-29T21:00:00.000Z";
async function json(relative: string, body?: unknown): Promise<any> {
  const response = await fetch(origin + relative, { signal: AbortSignal.timeout(15000),
    headers: { "x-starward-measurement-probe": "1", ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) });
  assert(body === undefined ? response.status === 200 : [200, 201].includes(response.status), "local publication/report response");
  return response.json();
}
async function localImage(id: string, relative: string, asset: any) {
  const bytes = await fs.readFile(path.join(root, "workers/miniapp-api/assets", relative));
  assert.equal(bytes.length, asset.bytes); assert.equal(digest(bytes), asset.sha256);
  return { id, sha256: asset.sha256, bytes: asset.bytes, width: asset.width, height: asset.height,
    data: `data:${relative.endsWith(".png") ? "image/png" : "image/jpeg"};base64,${bytes.toString("base64")}` };
}
let inputs: any;
if (phase === "after") inputs = JSON.parse(await fs.readFile(path.join(before, "inputs.json"), "utf8"));
else {
  const search = await json("/v2/places/search?q=" + encodeURIComponent("示例观星点"));
  const spot = search.data.formalSpots.find((entry: any) => entry.name === "示例观星点");
  assert.equal(spot.wgs84.latitude, 22.4826799); assert.equal(spot.wgs84.longitude, 114.5557147);
  // Read the currently committed native Context in memory. Resolve creates a
  // different session and is not a substitute for this revision-2 input.
  const project = path.join(root, "apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v26-0929").replaceAll("\\", "/");
  const context = JSON.parse(execFileSync("pwsh", ["-NoProfile", "-Command", `
    $r=(& 'E:/微信web开发者工具/wechatide.cmd' -c codex automation_evaluate --project '${project}' --fn-source "function(){var s=wx.getStorageSync('starward.wechat-miniapp.state.current');return s&&s.observationContext;}")|ConvertFrom-Json;
    if(-not $r.ok){throw 'Native Context read failed'};
    $v=$r.result;while($v -is [pscustomobject] -and $v.PSObject.Properties.Name -contains 'result'){$v=$v.result};
    $v|ConvertTo-Json -Compress -Depth 8;
  `], { encoding: "utf8", windowsHide: true }));
  assert.equal(Date.parse(context.selectedAtUtc), Date.parse(at)); assert.equal(context.revision, 2);
  assert.equal(context.location.kind, "FORMAL_SPOT"); assert.equal(context.location.spotId, spot.spotId);
  const raw = projectAdoptedSkyCatalog(await json(`/v2/spots/${encodeURIComponent(spot.spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`));
  const reference = raw.data.skyScene.catalog!;
  const stars = (await json(`/v2/sky/catalogs/${reference.catalogVersion}/${reference.catalogHash}`)).data;
  const resolved = attachSkyCatalog(raw.data, stars), catalog = (await json("/v2/sky/constellations")).data;
  // Only inputs consumed by the render owner are retained. No opaque Context
  // IDs, request headers, credentials or unrelated report payload are written.
  const report = { hourly: resolved.hourly, skyScene: resolved.skyScene,
    observationFrames: resolved.observationFrames, targetFrames: resolved.targetFrames };
  assert(!JSON.stringify(report).includes(context.contextId));
  const frame = resolveSkySceneFrame(report.skyScene, at)!; assert(frame?.points?.length);
  const pointFor = (reference: string) => {
    const index = report.skyScene.catalog!.entries.findIndex(entry => entry.objectRef === reference);
    const point = frame.points!.find(point => point[0] === index); assert(point && point[2] > 0, reference);
    return point;
  };
  const polaris = pointFor("HR:424"), capella = pointFor("HR:1708");
  const local = createSkyViewBasis(polaris[1], 90 + polaris[2], 0)!;
  const wideView = (fov: number) => {
    const camera = createSkyBrowsingCamera();
    camera.update({ localView: local, intent: "manual", progress: 0, at: 0 });
    return camera.update({ localView: local, intent: "manual", progress: skyDomeProgress(fov, width, height), at: 16 }).view!;
  };
  const domeFov = skyDomeFieldOfView(width, height);
  const scenarios = [
    { name: "polaris-local", fov: 45, basis: local, mode: "DAY" },
    { name: "polaris-recognition", fov: 25, basis: local, mode: "DAY" },
    { name: "polaris-overview", fov: 85, basis: wideView(85), mode: "DAY" },
    { name: "dome", fov: domeFov, basis: wideView(domeFov), mode: "DAY" },
    { name: "capella-plane", fov: 45, basis: createSkyViewBasis(capella[1], 90 + capella[2], 0)!, mode: "DAY" },
    { name: "polaris-red", fov: 45, basis: local, mode: "OBSERVATION" },
  ];
  const sao = createSaoCatalogClient({ index: () => json("/v2/sky/supplements/sao/v2"),
    tile: (hash, id) => json(`/v2/sky/supplements/sao/v2/${encodeURIComponent(hash)}/tiles/${encodeURIComponent(id)}`),
    invalidateIndex() {}, invalidateTile() {} });
  const saoPublication = (await sao.getIndex()).data, saoTiles = new Map<string, any>();
  for (const scenario of scenarios) {
    const solarRow = report.hourly.find(row => row.at === at)!; assert(solarRow);
    (scenario as any).frame = resolveConstellationFrame(catalog, report.skyScene, at);
    (scenario as any).images = constellationVisibility(scenario.fov, true) > 0
      ? (scenario as any).frame.images.filter((figure: any) => artworkIntersectsView(figure.registration,
        { basis: scenario.basis, verticalFovDeg: scenario.fov }, width, height)).map((figure: any) => figure.source.id) : [];
    const selected = selectSkyStellarTiles(saoPublication.index.tiles, { basis: scenario.basis, width, height,
      verticalFovDeg: scenario.fov, frame: supplementGeometry(saoPublication, report.skyScene, at)!,
      expected: { catalog: report.skyScene.publication!, at, observer: report.skyScene.observer! },
      ...(scenario.mode === "OBSERVATION" ? {} : { sunAltitudeDeg: solarRow.sunAltitudeDeg }) });
    (scenario as any).saoTileIds = selected.map(tile => tile.id);
    for (const tile of selected) if (!saoTiles.has(tile.id)) saoTiles.set(tile.id, (await sao.getTile(saoPublication, tile.id)).data);
  }
  const galaxy = await json("/v2/sky/galactic/manifest"), landscape = await json("/v2/sky/landscape/manifest");
  const images = [await localImage("galactic", "deep-sky/galactic-2mass/" + galaxy.image.file, galaxy.image)];
  const needed = new Set(scenarios.flatMap((scenario: any) => scenario.images));
  for (const asset of catalog.images.filter((asset: any) => needed.has(asset.id)))
    images.push(await localImage(asset.id, "constellations/" + asset.file, asset));
  const masks = [];
  for (const resource of landscape.resources) {
    images.push(await localImage(`landscape:${resource.id}`, "landscape/" + resource.image.file, resource.image));
    const alpha = JSON.parse(await fs.readFile(path.join(root, "workers/miniapp-api/assets/landscape", resource.alpha.file), "utf8"));
    masks.push(createSkyPanoramaMask(landscape, resource, decodeSkyLandscapeAlpha(alpha, resource)));
  }
  inputs = { report, catalogHash: stars.catalogHash, constellationHash: catalog.catalogHash, landscape,
    galaxyPublicationHash: galaxy.publicationHash, images, masks, saoPublication, saoTiles: [...saoTiles], scenarios,
    contextRevision: context.revision, observer: { wgs84: spot.wgs84, timezone: spot.timezone },
    directions: { polaris: { azimuth: polaris[1], altitude: polaris[2] }, capella: { azimuth: capella[1], altitude: capella[2] } } };
  await fs.writeFile(path.join(output, "inputs.json"), JSON.stringify(inputs), { flag: "wx" });
}
const bundle = await build({ stdin: { resolveDir: root, contents:
  `export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
   export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
   export {selectSkyLandscapeResource} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';
   export {resolveSkyStellarSupplement} from './apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene';
   export {pickPaintedSkyObjects} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';` },
  bundle: true, write: false, metafile: true, format: "iife", globalName: "skyQualityProduction", platform: "browser", target: "es2022",
  tsconfig: path.join(root, "apps/wechat-miniapp/tsconfig.json") });
const sourceHashes = await Promise.all(Object.keys(bundle.metafile!.inputs).filter(file => file !== "<stdin>")
  .map(async file => ({ file, sha256: digest(await fs.readFile(path.join(root, file))) })));
await fs.writeFile(path.join(output, "production.js"), bundle.outputFiles[0]!.text, { flag: "wx" });
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const rows: any[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height }, deviceScaleFactor: 1 });
  await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate("globalThis.__name = target => target");
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  await page.evaluate(async inputs => {
    const decoded = new Map(), imageIds = new WeakMap();
    for (const asset of inputs.images) {
      const image = new Image(); image.src = asset.data; await image.decode();
      if (image.width !== asset.width || image.height !== asset.height) throw Error("actual_image_dimensions");
      decoded.set(asset.id, image); imageIds.set(image, asset.id);
    }
    const gl = document.querySelector("canvas")!.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
    if (!gl) throw Error("software_webgl_missing");
    const allocations = { created: 0, deleted: 0 }, uploads: string[] = [], failures: string[] = [];
    const create = gl.createTexture.bind(gl), retire = gl.deleteTexture.bind(gl), upload = gl.texImage2D.bind(gl);
    gl.createTexture = () => { const texture = create(); if (texture) allocations.created++; return texture; };
    gl.deleteTexture = texture => { if (texture) allocations.deleted++; retire(texture); };
    gl.texImage2D = function (...args: any[]) { uploads.push(imageIds.get(args[5]) ?? "other"); return (upload as any)(...args); };
    const renderer = (globalThis as any).skyQualityProduction.createSkyGpuRenderer(gl, 1,
      { imageFailed: (image: object) => failures.push(imageIds.get(image)) });
    (globalThis as any).qualityInputs = { ...inputs, decoded, imageIds, gl, renderer, allocations, uploads, failures };
  }, inputs);
  for (const scenario of inputs.scenarios) for (const control of ["published", "schematic", "disabled-study-only"]) {
    const row = await page.evaluate(({ scenario, control, width, height, at }) => {
      const production = (globalThis as any).skyQualityProduction, inputs = (globalThis as any).qualityInputs;
      const atlas = new Map(scenario.images.map((id: string) => [id, inputs.decoded.get(id)]));
      const galaxy = control === "published" ? inputs.decoded.get("galactic") : null;
      const resource = production.selectSkyLandscapeResource(inputs.landscape, [...atlas.values(), ...(galaxy ? [galaxy] : [])], false);
      const panorama = { image: inputs.decoded.get(`landscape:${resource.id}`), mask: inputs.masks.find((mask: any) => mask.resource.id === resource.id) };
      const supplement = production.resolveSkyStellarSupplement(inputs.saoPublication,
        scenario.saoTileIds.map((id: string) => new Map(inputs.saoTiles).get(id)), inputs.report.skyScene, at);
      let snapshot: any = null;
      const args: any[] = [inputs.renderer, inputs.report, at, null, null, width, height, scenario.mode,
        (value: any) => { snapshot = value; }, undefined, scenario.fov, null, scenario.basis];
      args[15] = { frame: scenario.frame, images: atlas, enabled: true }; args[16] = supplement;
      args[26] = galaxy; args[34] = { enabled: true, panorama }; args[35] = { horizontal: true, equatorial: false };
      const actualBand = inputs.renderer.galacticBand;
      if (control === "disabled-study-only") inputs.renderer.galacticBand = () => true;
      const priorUploads = inputs.uploads.length;
      try { production.drawSkyScene(...args); inputs.gl.finish(); } finally { inputs.renderer.galacticBand = actualBand; }
      if (!snapshot?.objects?.length || snapshot.frameAt !== at) throw Error("nonempty_exact_scene_required");
      const pixels = new Uint8Array(390 * height * 4);
      inputs.gl.readPixels(0, 0, 390, height, inputs.gl.RGBA, inputs.gl.UNSIGNED_BYTE, pixels);
      let binary = "";
      for (let offset = 0; offset < pixels.length; offset += 32768) binary += String.fromCharCode(...pixels.subarray(offset, offset + 32768));
      return { name: scenario.name, control, fov: scenario.fov, basis: scenario.basis, mode: scenario.mode,
        at, objects: snapshot.objects, rgbaBase64: btoa(binary), error: inputs.gl.getError(),
        failures: [...inputs.failures], uploads: inputs.uploads.slice(priorUploads), landscape: snapshot.view?.landscape?.resource?.id,
        picks: snapshot.objects.filter((object: any) => object.reference.startsWith("HR:")).slice(0, 8)
          .map((object: any) => ({ reference: object.reference, result: production.pickPaintedSkyObjects(snapshot,
            { x: object.x, y: object.y, frameAt: at, catalogVersion: snapshot.catalogVersion, catalogHash: snapshot.catalogHash }).map((candidate: any) => candidate.reference) })) };
    }, { scenario, control, width, height, at });
    assert.equal(row.error, 0); assert.deepEqual(row.failures, []); assert(row.landscape);
    const rgba = Buffer.from(row.rgbaBase64, "base64"); delete row.rgbaBase64;
    const filename = `${scenario.name}-${control}.png`;
    await fs.writeFile(path.join(output, filename.replace(".png", ".rgba")), rgba, { flag: "wx" });
    await page.locator("canvas").screenshot({ path: path.join(output, filename) });
    rows.push({ ...row, rgbaSha256: digest(rgba), objectsSha256: digest(JSON.stringify(row.objects)), filename,
      sha256: digest(await fs.readFile(path.join(output, filename))) });
  }
  const allocations = await page.evaluate(() => { const inputs = (globalThis as any).qualityInputs; inputs.renderer.dispose(); return inputs.allocations; });
  assert.equal(allocations.created, allocations.deleted, "actual GPU texture owners retire completely");
  await fs.writeFile(path.join(output, "retirement.json"), JSON.stringify(allocations), { flag: "wx" });
} finally { await browser.close(); }
for (const scenario of inputs.scenarios) {
  const controls = rows.filter(row => row.name === scenario.name);
  assert(controls[0].objects.length > 0);
  for (const row of controls.slice(1)) {
    assert.equal(row.objectsSha256, controls[0].objectsSha256, "catalog geometry/identity unchanged by background study");
    assert.deepEqual(row.picks, controls[0].picks, "real pick consumer unchanged");
  }
  if (scenario.mode === "OBSERVATION") for (const row of controls.slice(1)) assert.equal(row.rgbaSha256, controls[0].rgbaSha256);
  else assert.notEqual(controls[0].rgbaSha256, controls[2].rgbaSha256, "the actual panorama has a nonempty scene effect");
}
const record = { scope: "Full production draw/GPU owners, same immutable actual BFF report/catalogs, local hash-bound published images, shared browsing camera and SAO consumers. Chromium software WebGL only. Schematic/disabled controls are study-only and never product changes. No native controls, physical-device quality/performance or final acceptance.",
  phase, at, logicalCanvas: { width, height }, backing: { width: 390, height }, contextRevision: inputs.contextRevision,
  observer: inputs.observer, directions: inputs.directions, inputsSha256: digest(JSON.stringify(inputs)),
  sourceBundleSha256: digest(bundle.outputFiles[0]!.text), sourceHashes,
  publications: { stars: inputs.catalogHash, constellations: inputs.constellationHash,
    galaxy: inputs.galaxyPublicationHash, landscape: inputs.landscape.publicationHash, sao: inputs.saoPublication.publicationHash },
  images: inputs.images.map(({ data: _, ...asset }: any) => asset), rows };
await fs.writeFile(path.join(output, "result.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output: path.relative(root, output), phase, scenes: inputs.scenarios.length, renders: rows.length,
  inputsSha256: record.inputsSha256, sourceBundleSha256: record.sourceBundleSha256,
  counts: rows.filter(row => row.control === "published").map(row => ({ name: row.name, objects: row.objects.length, uploads: row.uploads })) }));
