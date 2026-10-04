// Repeatable full-Canvas diagnostic through current production owners. This is
// not a second renderer or native Taro/WEAPP composition acceptance.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { projectAdoptedSkyCatalog } from "../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts";
import { attachSkyCatalog, resolveSkySceneFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";
import { resolveConstellationFrame } from "../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts";
import { createSkyViewBasis } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import { constellationVisibility } from "../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts";
import { artworkIntersectsView } from "../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts";
import { decodeSkyLandscapeAlpha } from "../../../../packages/miniapp-contracts/src/sky-landscape-publication.ts";
import { createSkyPanoramaMask } from "../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-mask.ts";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
import { selectSkyHipsTiles } from "../../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts";
import { createSaoCatalogClient } from "../../../../apps/wechat-miniapp/src/services/sao-catalog-client.ts";
import { selectSkyStellarTiles } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts";
import { supplementGeometry } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts";

const root = process.cwd(), item = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const starComparison = process.argv.includes("--star-profile");
const cpuOwnerOnly = process.argv.includes("--projection-cpu-owner");
const causalComparison = starComparison || cpuOwnerOnly || process.argv.includes("--projection-causal");
const combinedProfile = causalComparison || process.argv.includes("--combined-browse-profile");
const profilePhase = cpuOwnerOnly ? "cpu-owner" : causalComparison ? "paired" : process.argv.includes("--after") ? "after" : "before";
const optimizedGrids = process.argv.includes("--coordinate-grids-optimized");
const finalGrids = optimizedGrids || process.argv.includes("--coordinate-grids-final");
const gridChecks = finalGrids || process.argv.includes("--coordinate-grids");
const evidence = path.join(item, "evidence"), output = path.join(root, starComparison
  ? "output/playwright/cloud-sky-star-field-0929" : cpuOwnerOnly
  ? "output/playwright/cloud-sky-view-projection-cpu-owner-0929" : causalComparison
  ? "output/playwright/cloud-sky-view-projection-causal-0929" : combinedProfile
  ? `output/playwright/cloud-sky-combined-browse-profile-0929-${profilePhase}` : gridChecks
  ? `output/playwright/cloud-sky-coordinate-grids-${optimizedGrids ? "0929-optimized" : `0928${finalGrids ? "-final" : ""}`}` : "output/playwright/cloud-sky-environment-whole-scene-0928");
await assert.rejects(fs.access(path.join(output, "result.json")), { code: "ENOENT" });
await fs.mkdir(output, { recursive: true });
const digest = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const origin = combinedProfile ? "http://127.0.0.1:8791" : "http://127.0.0.1:8789";
async function json(relative: string, body?: unknown): Promise<any> {
  const response = await fetch(origin + relative, { signal: AbortSignal.timeout(10000),
    ...(body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) });
  assert(body === undefined ? response.status === 200 : [200, 201].includes(response.status), "public local endpoint response");
  return response.json();
}
async function image(relative: string, expected: { sha256: string; bytes: number }) {
  const response = await fetch(origin + relative, { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, "hash-bound local image");
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.length, expected.bytes); assert.equal(digest(bytes), expected.sha256);
  const mime = response.headers.get("content-type")?.split(";")[0];
  assert(mime === "image/png" || mime === "image/jpeg");
  return `data:${mime};base64,${bytes.toString("base64")}`;
}
const candidate = JSON.parse(await fs.readFile(path.join(evidence, combinedProfile
  ? `experience-combined-clean-${starComparison ? "v21" : "v18"}-candidate-2026-09-29.json` : "experience-combined-clean-v13-candidate-2026-09-28.json"), "utf8"));
assert.equal((await fingerprintBundle(path.join(root, candidate.bundle))).sha256, candidate.fingerprint.sha256);
const search = await json("/v2/places/search?q=" + encodeURIComponent("示例观星点"));
const spot = search.data.formalSpots.find((entry: any) => entry.name === "示例观星点");
assert(spot?.spotId && spot.timezone === "Asia/Shanghai");
assert.equal(spot.wgs84.latitude, 22.4826799); assert.equal(spot.wgs84.longitude, 114.5557147);
const context = (await json("/v2/observation-contexts/resolve", {
  location: { kind: "FORMAL_SPOT", spotId: spot.spotId }, localDate: "2026-09-28", selectedAt: "2026-09-28T16:00:00.000Z",
})).data;
assert.equal(context.selectedAtUtc, "2026-09-28T16:00:00.000Z");
const raw = projectAdoptedSkyCatalog(await json(`/v2/spots/${encodeURIComponent(spot.spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`));
const starReference = raw.data.skyScene.catalog!; assert(starReference);
const stars = (await json(`/v2/sky/catalogs/${starReference.catalogVersion}/${starReference.catalogHash}`)).data;
const report = attachSkyCatalog(raw.data, stars), catalog = (await json("/v2/sky/constellations")).data;
const nightAt = "2026-09-28T16:00:00.000Z", nightFrame = resolveSkySceneFrame(report.skyScene, nightAt)!;
assert(nightFrame?.points, "real exact night scene");
const vegaIndex = report.skyScene.catalog!.entries.findIndex(entry => entry.objectRef === "HR:7001");
const vega = nightFrame.points.find(point => point[0] === vegaIndex)!; assert(vega);
const basis = createSkyViewBasis(vega[1], 90 + vega[2], 0)!;
const width = 390.4, height = 844;
const times = [
  { name: "noon", at: "2026-09-28T04:00:00.000Z" },
  { name: "dusk", at: "2026-09-28T10:30:00.000Z" },
  { name: "night", at: nightAt },
];
const poleMatrix = report.observationFrames!.find(frame => frame.at === nightAt)!.equatorialToEnu;
const poleBasis = createSkyViewBasis(Math.atan2(poleMatrix[2], poleMatrix[5]) * 180 / Math.PI,
  90 + Math.asin(poleMatrix[8]) * 180 / Math.PI, 0)!;
const gridStates = [
  { name: "off", horizontal: false, equatorial: false }, { name: "horizontal", horizontal: true, equatorial: false },
  { name: "equatorial", horizontal: false, equatorial: true }, { name: "both", horizontal: true, equatorial: true },
];
const m42Index = report.skyScene.deepSky!.catalog!.entries.findIndex(entry => entry.objectRef === "M:42");
const m42At = "2026-09-28T20:00:00.000Z";
const m42Point = report.skyScene.deepSky!.frames.find(frame => frame.at === m42At)!.points!.find(point => point[0] === m42Index)!;
assert(m42Point && m42Point[2] > 0);
const m42Basis = createSkyViewBasis(m42Point[1], 90 + m42Point[2], 0)!;
const scenarios = starComparison ? [
  ...times.flatMap(time => [25, 85, 267.8].map(fov => ({ ...time, fov, mode: "NIGHT",
    basis: fov > 260 ? createSkyViewBasis(0, 180, 0)! : basis, grids: gridStates[1] }))),
  ...[25, 85, 267.8].map(fov => ({ name: "red", at: nightAt, fov, mode: "OBSERVATION",
    basis: fov > 260 ? createSkyViewBasis(0, 180, 0)! : basis, grids: gridStates[1] })),
  { name: "m42-layers", at: m42At, fov: 85, mode: "NIGHT", basis: m42Basis, grids: gridStates[3] },
  { name: "m42-detail", at: m42At, fov: .54, mode: "NIGHT", basis: m42Basis, grids: gridStates[3] },
  { name: "night-return", at: nightAt, fov: 85, mode: "NIGHT", basis, grids: gridStates[1] },
] : combinedProfile ? [
  { name: "recognition", at: m42At, fov: 25, mode: "NIGHT", basis: m42Basis, grids: gridStates[3] },
  { name: "wide", at: m42At, fov: 85, mode: "NIGHT", basis: m42Basis, grids: gridStates[3] },
  { name: "dome", at: m42At, fov: 267.8, mode: "NIGHT", basis: createSkyViewBasis(0, 180, 0)!, grids: gridStates[3] },
  { name: "detail", at: m42At, fov: .54, mode: "NIGHT", basis: m42Basis, grids: gridStates[3] },
  { name: "red-detail", at: m42At, fov: .54, mode: "OBSERVATION", basis: m42Basis, grids: gridStates[3] },
  { name: "detail-return", at: m42At, fov: .54, mode: "NIGHT", basis: m42Basis, grids: gridStates[3] },
  { name: "later", at: "2026-09-28T21:00:00.000Z", fov: 25, mode: "NIGHT", basis: m42Basis, grids: gridStates[3] },
  { name: "recognition-return", at: m42At, fov: 25, mode: "NIGHT", basis: m42Basis, grids: gridStates[3] },
] : gridChecks ? [
  ...[85, 267.8].flatMap(fov => gridStates.map(({ name, ...grids }) => ({ name: `night-${name}`, at: nightAt,
    fov, mode: "NIGHT", basis: fov > 260 ? createSkyViewBasis(0, 180, 0)! : basis, grids }))),
  { name: "red-equatorial", at: nightAt, fov: 85, mode: "OBSERVATION", basis, grids: gridStates[2] },
  { name: "later-equatorial", at: "2026-09-28T17:00:00.000Z", fov: 85, mode: "NIGHT", basis, grids: gridStates[2] },
  { name: "pole-equatorial", at: nightAt, fov: 0.05, mode: "NIGHT", basis: poleBasis, grids: gridStates[2] },
] : [...times.flatMap(time => [25, 85, 267.8].map(fov => ({ ...time, fov, mode: "NIGHT", basis: fov > 260 ? createSkyViewBasis(0, 180, 0)! : basis, grids: gridStates[1] }))),
  ...[25, 85, 267.8].map(fov => ({ name: "red", at: nightAt, fov, mode: "OBSERVATION", basis: fov > 260 ? createSkyViewBasis(0, 180, 0)! : basis, grids: gridStates[1] }))];
const prepared = scenarios.map(scenario => {
  const frame = resolveConstellationFrame(catalog, report.skyScene, scenario.at);
  const solarRow = report.hourly.find(row => row.at === scenario.at);
  assert(solarRow && frame, `actual ${scenario.name} report frame`);
  const images = constellationVisibility(scenario.fov, true) > 0
    ? frame.images.filter(figure => artworkIntersectsView(figure.registration, { basis: scenario.basis, verticalFovDeg: scenario.fov }, width, height)).map(figure => figure.source.id) : [];
  return { ...scenario, frame, images, solarAltitudeDeg: solarRow.sunAltitudeDeg, solarAzimuthDeg: solarRow.sunAzimuthDeg };
});
let saoPublication: any = null;
const saoTiles = new Map<string, any>();
if (starComparison) {
  const client = createSaoCatalogClient({ index: () => json("/v2/sky/supplements/sao/v2"),
    tile: (hash, id) => json(`/v2/sky/supplements/sao/v2/${encodeURIComponent(hash)}/tiles/${encodeURIComponent(id)}`),
    invalidateIndex() {}, invalidateTile() {} });
  saoPublication = (await client.getIndex()).data;
  for (const scenario of prepared) {
    const geometry = supplementGeometry(saoPublication, report.skyScene, scenario.at)!;
    const selected = selectSkyStellarTiles(saoPublication.index.tiles, { basis: scenario.basis, width, height,
      verticalFovDeg: scenario.fov, frame: geometry, expected: { catalog: report.skyScene.publication!, at: scenario.at, observer: report.skyScene.observer! },
      ...(scenario.mode === "OBSERVATION" ? {} : { sunAltitudeDeg: scenario.solarAltitudeDeg }) });
    (scenario as any).saoTileIds = selected.map(tile => tile.id);
    for (const tile of selected) if (!saoTiles.has(tile.id)) saoTiles.set(tile.id, (await client.getTile(saoPublication, tile.id)).data);
  }
}
const images: any[] = [], masks: any[] = [];
let widePublication: any = null, deepPublication: any = null;
if (combinedProfile) {
  widePublication = await json("/v2/sky/wide-field/manifest");
  const publication = await json("/__sky_test/publication-status");
  deepPublication = await json(`/v2/sky/deep-sky/${publication.publicationHash}/manifest`);
  const m42 = deepPublication.entries.find((entry: any) => entry.objectRef === "M:42");
  assert.equal(deepPublication.schemaVersion, "allwise-w3-deep-sky-publication-v3");
  for (const [level, asset] of Object.entries(m42.levels) as [string, any][]) images.push({
    id: `deep:${level}`, ...asset, width: asset.pixels, height: asset.pixels, publicationHash: deepPublication.publicationHash,
    data: await image(asset.downloadUrl, asset),
  });
  for (const tile of widePublication.tiles) images.push({ id: `w3:${tile.pixel}`, ...tile, width: 512, height: 512,
    data: await image(tile.downloadUrl, tile) });
}
const needed = new Set(prepared.flatMap(scenario => scenario.images));
for (const asset of catalog.images.filter((asset: any) => needed.has(asset.id))) images.push({ ...asset,
  data: await image(`/v2/sky/constellations/${catalog.catalogHash}/assets/${encodeURIComponent(asset.file)}`, asset) });
const galaxy = await json("/v2/sky/galactic/manifest");
images.push({ id: "galactic", ...galaxy.image, data: await image(galaxy.image.downloadUrl, galaxy.image) });
const landscape = await json("/v2/sky/landscape/manifest");
for (const resource of landscape.resources) {
  images.push({ id: `landscape:${resource.id}`, ...resource.image, data: await image(resource.image.downloadUrl, resource.image) });
  masks.push(createSkyPanoramaMask(landscape, resource, decodeSkyLandscapeAlpha(await json(resource.alpha.downloadUrl), resource)));
}
const bundle = await build({ stdin: { resolveDir: root, contents:
  `export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
   export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
   export {selectSkyLandscapeResource} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';
   export {skyGalacticBandAt} from './apps/wechat-miniapp/src/features/sky/sky-galactic-band';
   export {skyHorizontalGrid} from './apps/wechat-miniapp/src/features/sky/sky-horizontal-grid';
   export {skyEquatorialGrid} from './apps/wechat-miniapp/src/features/sky/sky-equatorial-grid';
   ${starComparison ? `export {resolveSkyStellarSupplement} from './apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene';
   export {pickPaintedSkyObjects} from './apps/wechat-miniapp/src/features/sky/sky-object-picking';` : ""}` },
  bundle: true, write: false, metafile: true, format: "iife", globalName: "skyQualityProduction", platform: "browser", target: "es2022",
  tsconfig: path.join(root, "apps/wechat-miniapp/tsconfig.json") });
const sourceHashes = await Promise.all(Object.keys(bundle.metafile!.inputs).filter(file => file !== "<stdin>").map(async file => ({ file, sha256: digest(await fs.readFile(path.join(root, file))) })));
let retainedBefore: string | null = null;
if (starComparison) {
  const baseline = JSON.parse(await fs.readFile(path.join(root, "output/playwright/cloud-sky-star-profile-0929-before/result.json"), "utf8"));
  retainedBefore = await fs.readFile(path.join(root, "output/playwright/cloud-sky-star-profile-0929-before/production.js"), "utf8");
  assert.equal(digest(retainedBefore), baseline.sourceBundleSha256);
  for (const input of baseline.sourceHashes) {
    if (input.file.endsWith("/sky-gpu-renderer.ts") || input.file.endsWith("/sky-scene-render.ts")) continue;
    assert.equal(digest(await fs.readFile(path.join(root, input.file))), input.sha256, "independent owner changed during star display comparison");
  }
}
else if (causalComparison) {
  const prior = JSON.parse(await fs.readFile(path.join(root, "output/playwright/cloud-sky-combined-browse-profile-0929-after/result.json"), "utf8"));
  const baseline = JSON.parse(await fs.readFile(path.join(root, "output/playwright/cloud-sky-combined-browse-profile-0929-before/result.json"), "utf8"));
  assert.equal(digest(bundle.outputFiles[0]!.text), prior.sourceBundleSha256, "retained after implementation");
  assert.deepEqual(sourceHashes, prior.sourceHashes, "no production changes during comparison");
  retainedBefore = await fs.readFile(path.join(root, "output/playwright/cloud-sky-combined-browse-profile-0929-before/production.js"), "utf8");
  assert.equal(digest(retainedBefore), baseline.sourceBundleSha256, "retained actual before implementation");
  for (const key of ["catalogHash", "constellationHash", "landscapeHash", "widePublicationHash", "deepPublicationHash"]) {
    const value = key === "catalogHash" ? stars.catalogHash : key === "constellationHash" ? catalog.catalogHash
      : key === "landscapeHash" ? landscape.publicationHash : key === "widePublicationHash" ? widePublication.publicationHash : deepPublication.publicationHash;
    assert.equal(value, baseline[key], key); assert.equal(value, prior[key], key);
  }
}
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const rows: any[] = [];
let gridGeometryMeasurements: unknown = null;
try {
  const page = await browser.newPage({ viewport: { width: 390, height }, deviceScaleFactor: 1 });
  await page.setContent(`<style>body{margin:0}canvas{display:block}</style><canvas width="390" height="844"></canvas>`);
  await page.evaluate("globalThis.__name = target => target");
  if (retainedBefore) {
    await page.addScriptTag({ content: retainedBefore });
    await page.evaluate(() => { (globalThis as any).skyQualityBefore = (globalThis as any).skyQualityProduction; });
  }
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  await page.evaluate(async ({ images, masks, report, landscape, saoPublication, saoTiles }) => {
    const decoded = new Map(), imageIds = new WeakMap();
    for (const asset of images) {
      const image = new Image(); image.src = asset.data; await image.decode();
      if (image.width !== asset.width || image.height !== asset.height) throw Error("actual_image_dimensions");
      decoded.set(asset.id, image); imageIds.set(image, asset.id);
    }
    (globalThis as any).qualityInputs = { decoded, imageIds, masks, report, landscape, saoPublication, saoTiles: new Map(saoTiles) };
  }, { images, masks, report, landscape, saoPublication, saoTiles: [...saoTiles] });
  let profileSession: any = null;
  if (combinedProfile) {
    await page.evaluate(({ causalComparison, cpuOwnerOnly }) => {
      const inputs = (globalThis as any).qualityInputs;
      if (cpuOwnerOnly) {
        inputs.productions = { before: (globalThis as any).skyQualityBefore, after: (globalThis as any).skyQualityProduction };
        return;
      }
      const gl = document.querySelector("canvas")!.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
      if (!gl) throw Error("software_webgl_missing");
      const uploads = new Map(), texImage = gl.texImage2D.bind(gl), createTexture = gl.createTexture.bind(gl), deleteTexture = gl.deleteTexture.bind(gl);
      const resources = { created: 0, deleted: 0 };
      gl.createTexture = () => { const texture = createTexture(); if (texture) resources.created++; return texture; };
      gl.deleteTexture = texture => { if (texture) resources.deleted++; deleteTexture(texture); };
      gl.texImage2D = function (...args: any[]) { const id = inputs.imageIds.get(args[5]) ?? "other"; uploads.set(id, (uploads.get(id) ?? 0) + 1); return (texImage as any)(...args); };
      inputs.gl = gl; inputs.uploads = uploads; inputs.resources = resources;
      inputs.failures = [];
      const callbacks = { imageFailed: (image: object) => inputs.failures.push(inputs.imageIds.get(image)) };
      inputs.renderer = (globalThis as any).skyQualityProduction.createSkyGpuRenderer(gl, 1, callbacks);
      if (causalComparison) {
        inputs.productions = { before: (globalThis as any).skyQualityBefore, after: (globalThis as any).skyQualityProduction };
        inputs.renderers = { before: inputs.productions.before.createSkyGpuRenderer(gl, 1, callbacks), after: inputs.renderer };
      }
    }, { causalComparison, cpuOwnerOnly });
    if (!causalComparison) {
      profileSession = await page.context().newCDPSession(page);
      await profileSession.send("Profiler.enable");
      await profileSession.send("Profiler.setSamplingInterval", { interval: 250 });
      await profileSession.send("Profiler.start");
    }
  }
  for (const scenario of prepared) {
    const observation = report.observationFrames!.find(frame => frame.at === scenario.at)!;
    const wideSelection = combinedProfile && (!starComparison || scenario.name.startsWith("m42")) && scenario.mode !== "OBSERVATION" && scenario.fov >= 60
      ? selectSkyHipsTiles({ frame: observation, view: { basis: scenario.basis, verticalFovDeg: scenario.fov }, width, height, minOrder: 0, maxOrder: 0 }) : null;
    const widePixels = wideSelection?.state === "SELECTED" ? wideSelection.pixels : [];
    const row = await page.evaluate(({ scenario, width, height, combinedProfile, causalComparison, cpuOwnerOnly, starComparison, widePixels, images }) => {
      const { createSkyGpuRenderer, drawSkyScene, selectSkyLandscapeResource, skyGalacticBandAt } = (globalThis as any).skyQualityProduction;
      const inputs = (globalThis as any).qualityInputs;
      const gl = document.querySelector("canvas")!.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
      if (!gl) throw Error("software_webgl_missing");
      const failures: string[] = [], renderer = combinedProfile ? inputs.renderer : createSkyGpuRenderer(gl, 1, { imageFailed: (image: object) => failures.push(inputs.imageIds.get(image)) });
      const atlas = new Map(scenario.images.map(id => [id, inputs.decoded.get(id)]));
      const galactic = !widePixels.length && scenario.mode !== "OBSERVATION" && skyGalacticBandAt(inputs.report, scenario.at, scenario.fov) ? inputs.decoded.get("galactic") : null;
      const hips = widePixels.map(pixel => ({ layer: "WIDE_FIELD_W3", order: 0, pixel, image: inputs.decoded.get(`w3:${pixel}`) }));
      const deepLevel = scenario.fov < 1 ? "DETAIL" : "OVERVIEW";
      const source = combinedProfile && (!starComparison || scenario.name.startsWith("m42")) ? images.find(asset => asset.id === `deep:${deepLevel}`) : null;
      const deep = source ? { reference: "M:42", level: deepLevel, fieldDegrees: source.fieldDegrees, pixelSize: source.pixels,
        publicationHash: source.publicationHash, image: inputs.decoded.get(source.id) } : null;
      const resource = selectSkyLandscapeResource(inputs.landscape, [...atlas.values(), ...hips.map(tile => tile.image),
        ...(galactic ? [galactic] : []), ...(deep && scenario.mode !== "OBSERVATION" ? [deep.image] : [])], false);
      const panorama = { image: inputs.decoded.get(`landscape:${resource.id}`), mask: inputs.masks.find((mask: any) => mask.resource.id === resource.id) };
      let snapshot: any = null, sources: any = null;
      const supplement = starComparison ? (globalThis as any).skyQualityProduction.resolveSkyStellarSupplement(inputs.saoPublication,
        (scenario as any).saoTileIds.map((id: string) => inputs.saoTiles.get(id)), inputs.report.skyScene, scenario.at) : undefined;
      try {
        const paint = (draw = drawSkyScene, surface = renderer) => draw(surface, inputs.report, scenario.at, null, null, width, height, scenario.mode,
          (value: any, painted: any) => { snapshot = value; sources = painted; }, undefined, scenario.fov, deep, scenario.basis, undefined, undefined,
          { frame: scenario.frame, images: atlas, enabled: true, failed: (image: object) => failures.push(inputs.imageIds.get(image)) },
          supplement, undefined, undefined, undefined, undefined, hips.length ? hips : undefined, undefined, undefined,
          null, null, galactic, null, null, null, null, undefined, null, null, { enabled: true, panorama }, scenario.grids);
        if (cpuOwnerOnly) {
          // A boundary fixture measures only production scene computation. It
          // does not render, certify GPU success or replace the real GPU rows.
          // Both versions use the same successful-submission fixture; command
          // recording is outside the timed loop and proves a nonempty effect.
          const methods = ["begin","solarLight","landscape","galacticBand","sun","moon","planet","saturnRings",
            "image","skyImageMesh","artwork","segments","disc","finish"];
          const commands: unknown[] = [];
          const fixture = (record: boolean) => Object.fromEntries(methods.map(method => [method,(...args: unknown[]) => {
            if (record) commands.push([method,args]); return true;
          }]));
          const generate = (version: "before" | "after", surface: unknown) => paint(inputs.productions[version].drawSkyScene,surface);
          const surface = fixture(false), samples: Record<string, number[]> = { before: [], after: [] };
          for (let warm=0; warm<12; warm++) for (const version of warm%2 ? ["after","before"] as const : ["before","after"] as const)
            generate(version,surface);
          for (let sample=0; sample<30; sample++) for (const version of sample%2 ? ["after","before"] as const : ["before","after"] as const) {
            const start = performance.now(); generate(version,surface); samples[version]!.push(performance.now()-start);
          }
          const owners: any = {};
          for (const version of ["before","after"] as const) {
            commands.length = 0; generate(version,fixture(true));
            const sorted = [...samples[version]!].sort((a,b) => a-b);
            const commandJson = JSON.stringify(commands,(_key,value) => {
              const id = value && typeof value === "object" ? inputs.imageIds.get(value) : null;
              return id ? { publishedImageId: id } : value;
            });
            owners[version] = { cpuGeneration: { samples: 30, medianMs: (sorted[14]!+sorted[15]!)/2, p95Ms: sorted[28], values: samples[version] },
              commandJson, counts: Object.fromEntries(methods.map(method=>[method,commands.filter((command: any)=>command[0]===method).length])),
              paintedObjects: snapshot?.objects ?? [], paintedDeepSource: sources?.deepSkyImage === deep?.image,
              paintedLandscape: snapshot?.view.landscape?.resource?.id, successfulSceneFrame: snapshot?.frameAt };
          }
          return { name: scenario.name, at: scenario.at, fov: scenario.fov, mode: scenario.mode, basis: scenario.basis,
            cpuFixture: owners, widePixels, visibleAtlasCount: atlas.size, paintedLandscape: snapshot?.view.landscape?.resource?.id,
            successfulSceneFrame: snapshot?.frameAt, paintedObjects: snapshot?.objects ?? [], snapshotObjects: snapshot?.objects?.length ?? 0,
            scope: "Production CPU scene generation only; successful-submission boundary fixture, no actual GPU calls/pixels or native acceptance" };
        }
        const cpu: number[] = [], drain: number[] = [];
        const stats = (values: number[]) => { const sorted = [...values].sort((a,b) => a-b), middle = Math.floor(sorted.length / 2);
          return { samples: values.length, medianMs: sorted.length ? sorted.length % 2 ? sorted[middle] : (sorted[middle-1]! + sorted[middle]!) / 2 : null,
            p95Ms: sorted[Math.ceil(sorted.length * .95)-1] ?? null, values }; };
        const versions = ["before", "after"] as const;
        const paired: any = causalComparison ? { order: "30 pairs, alternating AB/BA; 12 alternating warmup pairs; no CPU profiler",
          before: { submit: [], drain: [] }, after: { submit: [], drain: [] } } : null;
        const paintVersion = (version: "before" | "after") => paint(inputs.productions[version].drawSkyScene, inputs.renderers[version]);
        if (starComparison) inputs.paintVersion = paintVersion;
        if (causalComparison) for (let warm = 0; warm < 12; warm++) {
          for (const version of warm % 2 ? [...versions].reverse() : versions) { paintVersion(version); gl.finish(); }
        }
        else if (combinedProfile) for (let warm = 0; warm < 5; warm++) { paint(); gl.finish(); }
        const uploadsBefore = Object.fromEntries(inputs.uploads ?? []);
        if (causalComparison) for (let sample = 0; sample < 30; sample++) {
          for (const version of sample % 2 ? [...versions].reverse() : versions) {
            const start = performance.now(); paintVersion(version); const submitted = performance.now(); gl.finish();
            paired[version].submit.push(submitted-start); paired[version].drain.push(performance.now()-submitted);
          }
        }
        else if (combinedProfile) for (let sample = 0; sample < 30; sample++) {
          const start = performance.now(); paint(); const submitted = performance.now(); gl.finish();
          cpu.push(submitted - start); drain.push(performance.now() - submitted);
        } else { paint(); gl.finish(); }
        if (causalComparison) for (const version of versions) {
          const pointSubmissions: any[] = [];
          const bufferData = gl.bufferData.bind(gl), drawArrays = gl.drawArrays.bind(gl);
          let lastBuffer: Float32Array | null = null;
          if (starComparison) {
            gl.bufferData = function (...args: any[]) { lastBuffer = args[1] instanceof Float32Array ? args[1] : null; return (bufferData as any)(...args); };
            gl.drawArrays = (primitive, first, count) => {
              if (primitive === gl.POINTS && lastBuffer) {
                const stride = version === "before" ? 8 : 9;
                let rasterAreaBound = 0, luminous = 0;
                for (let offset = 0; offset < lastBuffer.length; offset += stride) {
                  const star = stride === 9 && lastBuffer[offset+4]! > .5;
                  if (star) luminous++;
                  rasterAreaBound += (2*(lastBuffer[offset+2]!*(star ? 2.5 : 1)+1))**2;
                }
                pointSubmissions.push({ count, bytes: lastBuffer.byteLength, luminous, rasterAreaBound });
              }
              drawArrays(primitive, first, count);
            };
          }
          try {
          paintVersion(version); gl.finish();
          const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
          gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
          let binary = "";
          for (let offset=0; offset<pixels.length; offset+=32768) binary += String.fromCharCode(...pixels.subarray(offset,offset+32768));
          paired[version] = { submissionWall: stats(paired[version].submit), softwareGpuDrain: stats(paired[version].drain),
            rgbaBase64: btoa(binary), paintedObjects: snapshot?.objects ?? [], paintedDeepSource: sources?.deepSkyImage === deep?.image,
            paintedLandscape: snapshot?.view.landscape?.resource?.id, successfulSceneFrame: snapshot?.frameAt,
            ...(starComparison ? { pointSubmissions, picks: ["HR:","SAO:"].flatMap(prefix => (snapshot?.objects ?? []).filter((object: any) => object.reference.startsWith(prefix)).slice(0,6))
              .map((object: any) => ({ reference: object.reference, candidates: (globalThis as any).skyQualityProduction.pickPaintedSkyObjects(snapshot,
                { x: object.x, y: object.y, frameAt: snapshot.frameAt, catalogVersion: snapshot.catalogVersion, catalogHash: snapshot.catalogHash }).map((candidate: any) => candidate.reference) })) } : {}) };
          } finally { if (starComparison) { gl.bufferData = bufferData; gl.drawArrays = drawArrays; } }
        }
        if (combinedProfile && inputs.failures.length) throw Error("combined_gpu_image_failure");
        return { name: scenario.name, at: scenario.at, fov: scenario.fov, mode: scenario.mode,
          solarAltitudeDeg: scenario.solarAltitudeDeg, solarAzimuthDeg: scenario.solarAzimuthDeg,
          basis: scenario.basis, paintedLandscape: snapshot?.view.landscape?.resource?.id,
          successfulSceneFrame: snapshot?.frameAt, snapshotObjects: snapshot?.objects?.length ?? 0,
          visibleAtlasCount: atlas.size, galacticImageSubmitted: Boolean(galactic), failures, error: gl.getError(),
          grids: scenario.grids, paintedObjects: snapshot?.objects ?? [],
          ...(starComparison ? { paintedCounts: Object.fromEntries(["HR:","SAO:","PLANET:","SOLAR:","M:"].map(prefix => [prefix,
            (snapshot?.objects ?? []).filter((object: any) => object.reference.startsWith(prefix)).length])) } : {}),
          ...(combinedProfile ? { submissionWall: stats(cpu), softwareGpuDrain: stats(drain),
            ...(causalComparison ? { paired } : {}),
            widePixels, paintedDeepSource: sources?.deepSkyImage === deep?.image, deepLevel, deepPublicationHash: source?.publicationHash,
            uploadsBefore, uploadsAfter: Object.fromEntries(inputs.uploads), resources: { ...inputs.resources } } : {}) };
      } finally { if (!combinedProfile) renderer.dispose(); }
    }, { scenario, width, height, combinedProfile, causalComparison, cpuOwnerOnly, starComparison, widePixels, images: combinedProfile ? images.filter(asset => asset.id.startsWith("deep:")) : [] });
    if (!cpuOwnerOnly) { assert.equal(row.error, 0); assert.deepEqual(row.failures, []); }
    assert.equal(row.successfulSceneFrame, scenario.at); assert(row.paintedLandscape);
    if (cpuOwnerOnly) {
      for (const version of ["before","after"] as const) {
        const state = row.cpuFixture[version];
        state.commandSha256 = digest(state.commandJson); state.paintedObjectsSha256 = digest(JSON.stringify(state.paintedObjects));
        delete state.commandJson; delete state.paintedObjects;
        assert(state.counts.disc > 0 && state.counts.segments > 0,"scene generation must produce real nonempty commands");
        if (widePixels.length) assert(state.counts.skyImageMesh > 0,"actual wide geometry must reach the fixture");
      }
      for (const key of ["commandSha256","paintedObjectsSha256","paintedDeepSource","paintedLandscape","successfulSceneFrame","counts"])
        assert.deepEqual(row.cpuFixture.before[key],row.cpuFixture.after[key],`${scenario.name} CPU ${key}`);
    }
    else if (causalComparison) {
      for (const version of ["before","after"] as const) {
        const state = row.paired[version], { rgbaBase64, paintedObjects } = state;
        state.rgbaSha256 = digest(Buffer.from(rgbaBase64,"base64"));
        state.paintedObjectsSha256 = digest(JSON.stringify(paintedObjects));
        delete state.rgbaBase64; delete state.paintedObjects;
      }
      for (const key of ["paintedObjectsSha256","paintedDeepSource","paintedLandscape","successfulSceneFrame", ...(starComparison ? ["picks"] : ["rgbaSha256"])])
        assert.deepEqual(row.paired.before[key],row.paired.after[key],`${scenario.name} ${key}`);
      assert.deepEqual(row.uploadsBefore,row.uploadsAfter,"neither steady renderer uploads again");
      if (starComparison) {
        const pointCount = (state: any) => state.pointSubmissions.reduce((sum: number, item: any) => sum+item.count,0);
        assert.equal(pointCount(row.paired.before),pointCount(row.paired.after),"same point consumers reach GPU");
        if (row.paired.after.pointSubmissions.some((item: any) => item.luminous))
          assert.notEqual(row.paired.before.rgbaSha256,row.paired.after.rgbaSha256,"a nonempty stellar field must actually change its rendered display");
        for (const version of ["before","after"] as const) {
          await page.evaluate(version => { const inputs = (globalThis as any).qualityInputs; inputs.paintVersion(version); inputs.gl.finish(); }, version);
          await page.locator("canvas").screenshot({ path: path.join(output,`${scenario.name}-${scenario.fov}-${version}.png`) });
        }
      }
    }
    const filename = cpuOwnerOnly ? null : `${scenario.name}-${scenario.fov}.png`;
    if (filename) await page.locator("canvas").screenshot({ path: path.join(output, filename) });
    const bytes = filename ? await fs.readFile(path.join(output, filename)) : null;
    const { paintedObjects, ...record } = row;
    rows.push({ ...record, paintedObjectsSha256: digest(JSON.stringify(paintedObjects)), filename, bytes: bytes?.length ?? null, sha256: bytes ? digest(bytes) : null });
  }
  if (combinedProfile && !causalComparison) {
    const profile = await profileSession.send("Profiler.stop");
    await fs.writeFile(path.join(output, "cpu-profile.json"), JSON.stringify(profile.profile), { flag: "wx" });
    await profileSession.detach();
    const allocations = await page.evaluate(() => { const inputs = (globalThis as any).qualityInputs;
      inputs.renderer.dispose(); return inputs.resources; });
    assert.equal(allocations.created, allocations.deleted, "all task GPU textures released");
    await fs.writeFile(path.join(output, "retirement.json"), JSON.stringify(allocations) + "\n", { flag: "wx" });
  }
  if (causalComparison && !cpuOwnerOnly) {
    if (!starComparison) {
    gridGeometryMeasurements = await page.evaluate(({ prepared, width, height }) => {
      const inputs = (globalThis as any).qualityInputs;
      return prepared.flatMap(scenario => ["horizontal","equatorial"].map(layer => {
        const frame = inputs.report.observationFrames.find((frame: any) => frame.at === scenario.at);
        const run = (version: "before" | "after") => layer === "horizontal"
          ? inputs.productions[version].skyHorizontalGrid(scenario.basis,width,height,scenario.fov)
          : inputs.productions[version].skyEquatorialGrid(frame,scenario.basis,width,height,scenario.fov);
        const old = run("before"), next = run("after");
        if (JSON.stringify(old) !== JSON.stringify(next)) throw Error("paired_grid_geometry_changed");
        const samples: Record<string, number[]> = { before: [], after: [] };
        for (let warm=0; warm<6; warm++) { run("before"); run("after"); }
        for (let sample=0; sample<30; sample++) for (const version of sample%2 ? ["after","before"] as const : ["before","after"] as const) {
          const start = performance.now(); run(version); samples[version]!.push(performance.now()-start);
        }
        const stats = (values: number[]) => { const sorted = [...values].sort((a,b) => a-b);
          return { samples: values.length, medianMs: (sorted[14]!+sorted[15]!)/2, p95Ms: sorted[28], values }; };
        return { name: scenario.name, layer, fov: scenario.fov, geometryIdentical: true,
          segments: Object.values(next).reduce((sum: number,lines: any) => sum+lines.length,0),
          before: stats(samples.before!), after: stats(samples.after!) };
      }));
    }, { prepared, width, height });
    }
    const allocations = await page.evaluate(() => { const inputs = (globalThis as any).qualityInputs;
      inputs.renderers.before.dispose(); inputs.renderers.after.dispose(); return { ...inputs.resources }; });
    assert.equal(allocations.created,allocations.deleted,"both comparison owners released their textures");
    await fs.writeFile(path.join(output,"retirement.json"),JSON.stringify(allocations)+"\n",{flag:"wx"});
  }
  if (finalGrids && !optimizedGrids) gridGeometryMeasurements = await page.evaluate(({ prepared, width, height }) => {
    const { skyHorizontalGrid, skyEquatorialGrid } = (globalThis as any).skyQualityProduction;
    const report = (globalThis as any).qualityInputs.report;
    return prepared.filter(scenario => scenario.name === "night-horizontal" || scenario.name === "pole-equatorial").map(scenario => {
      const frame = report.observationFrames.find((frame: any) => frame.at === scenario.at);
      return ["horizontal", "equatorial"].map(layer => {
        const run = () => layer === "horizontal" ? skyHorizontalGrid(scenario.basis, width, height, scenario.fov)
          : skyEquatorialGrid(frame, scenario.basis, width, height, scenario.fov);
        for (let index = 0; index < 5; index++) run();
        const samples: number[] = [];
        let result: any;
        for (let index = 0; index < 30; index++) { const start = performance.now(); result = run(); samples.push(performance.now() - start); }
        samples.sort((a, b) => a - b);
        return { layer, fov: scenario.fov, samples: samples.length, medianMs: samples[15], p95Ms: samples[28],
          segments: Object.values(result).reduce((sum: number, lines: any) => sum + lines.length, 0) };
      });
    }).flat();
  }, { prepared, width, height });
} finally { await browser.close(); }
assert.equal((await fingerprintBundle(path.join(root, candidate.bundle))).sha256, candidate.fingerprint.sha256);
const record = { scope: cpuOwnerOnly
  ? "Current production CPU scene generation with immutable actual local data/images and successful-submission boundary fixture; 12 alternating warmup pairs and 30 measured pairs, command recording outside timing. No actual rendering/GPU outcome, native/phone/quality/target performance acceptance. Real GPU outputs belong to separate retained before/after and causal records."
  : "Current production full-Canvas scene/GPU/resource owners, actual public local BFF data and hash-bound published images in repeatable Chromium software WebGL. No Taro UI labels/controls, sensor, current native candidate, phone, quality pass, target performance or cost acceptance.",
  unchangedUnopenedCandidateHash: candidate.fingerprint.sha256, sourceBundleSha256: digest(bundle.outputFiles[0]!.text), sourceHashes,
  observer: { name: spot.name, wgs84: spot.wgs84, timezone: spot.timezone }, logicalCanvas: { width, height }, backing: { width: 390, height },
  fixedLocalView: combinedProfile && !starComparison ? { reference: "M:42", azimuthDeg: m42Point[1], altitudeDeg: m42Point[2], at: m42At }
    : { reference: "HR:7001", azimuthDeg: vega[1], altitudeDeg: vega[2], at: nightAt },
  catalogHash: stars.catalogHash, constellationHash: catalog.catalogHash, landscapeHash: landscape.publicationHash,
  images: images.map(({ data: _, ...asset }) => asset), rows, gridGeometryMeasurements,
  ...(combinedProfile ? { profilePhase, sameGpuOwnerAcrossScenarios: !cpuOwnerOnly, widePublicationHash: widePublication.publicationHash,
    ...(causalComparison ? { retainedBeforeBundleSha256: digest(retainedBefore!), pairedComparison: true,
      comparisonScope: cpuOwnerOnly
        ? "Same Chromium page/decoded images and immutable data; both production scene functions use the same successful-submission fixture. No GPU renderer constructed, no actual GPU draw or pixels. Alternating order, profiler disabled, command recording outside timing. Real GPU output equality is retained separately."
        : "Same Chromium page/GL context/decoded images and immutable data; two separately owned production renderers, each reused through all scenes. Alternating order and explicit drain; profiler disabled. Both retired. Grid geometry timed separately without GL waits." } : {}),
    deepPublicationHash: deepPublication.publicationHash, performanceScope: cpuOwnerOnly
      ? "Production CPU scene generation only; successful-submission boundary fixture. No GL waits, rasterization/driver work, controls or target FPS. Real nonempty command stream equivalence checked separately."
      : starComparison
      ? "Same-page software JS/GL submission with 12 alternating warmup pairs and 30 alternating measured pairs. Point-upload/area instrumentation is outside timed loops. Explicit drain is separate; synchronous submission may already wait. No grid-only timings, native GPU/FPS, memory or Taro control acceptance."
      : causalComparison
      ? "Browser production JS/GL submission wall time with 12 warmup pairs and 30 alternating before/after pairs, profiler disabled; explicit SwiftShader drain separately, synchronous GL calls can already wait. Pure grid geometry timed separately. Not target FPS, native bitmap/GPU peak or Taro control latency"
      : "Browser production JS/GL submission wall time and explicit SwiftShader drain separately; synchronous GL calls can already wait for software GPU. CPU call stacks sampled separately. 5 warmups then 30 samples per scene; no per-star wrapper instrumentation. Not target FPS, native bitmap/GPU peak or Taro control latency" } : {}),
  ...(starComparison ? { starProfile: true, saoPublicationHash: saoPublication.publicationHash, saoTileCount: saoTiles.size,
    rasterAreaScope: "Sum of point-sprite square area in backing pixels, a derived upper bound from actual submitted radii, not measured shaded fragments or native GPU work" } : {}),
  referenceNightDeltaSeconds: starComparison ? 14 : combinedProfile ? null : 14, reference: starComparison ? "experience-star-field-reference-2026-09-29.png" : "experience-environment-matched-night-reference-2026-09-28.jpg",
  referenceCaptureScope: starComparison
    ? "Current Browser appearance reference with actual Canvas CSS390.4x844, same public observer/Vega and converted FOV; observed clock14s later. Reference engine revision unknown, star catalog differs. No pixel registration, native or whole-quality acceptance."
    : combinedProfile
    ? "Historical environment-only appearance reference with a different camera/time; not a matched reference for these M42 combination scenarios. No reference quality acceptance."
    : "Appearance reference only: IAB host screenshot scales/pads the verified 390.4×844 CSS canvas. No cross-image pixel geometry or target quality acceptance.",
};
await fs.writeFile(path.join(output, "result.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ scenarios: rows.length, observer: spot.name, logicalCanvas: record.logicalCanvas,
  frames: rows.map(row => ({ name: row.name, fov: row.fov, at: row.at, sunAltitude: row.solarAltitudeDeg, landscape: row.paintedLandscape, objects: row.snapshotObjects })),
  unchangedUnopenedCandidateHash: candidate.fingerprint.sha256 }));
