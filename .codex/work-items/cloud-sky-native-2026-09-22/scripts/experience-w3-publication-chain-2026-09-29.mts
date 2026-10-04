// Real local publication -> HTTP -> Mini request/file owner -> production scene.
// Memory context/weather and desktop GPU are explicit adapters, not WEAPP proof.
import "reflect-metadata";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { build } from "esbuild";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { MiniappController } from "../../../../workers/miniapp-api/src/controller.ts";
import { MiniappService } from "../../../../workers/miniapp-api/src/miniapp-service.ts";
import { createTestMiniappService } from "../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts";
import { createBsc5pSkyCatalogProvider } from "../../../../workers/miniapp-api/src/sky-scene-catalog.ts";
import { startDeepSkyImageRequest, type OwnedDeepSkyImageAsset } from "../../../../apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts";
import { matchingCelestialInformationResponse } from "../../../../apps/wechat-miniapp/src/services/celestial-information-response.ts";
import { projectAdoptedSkyCatalog } from "../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts";
import { attachSkyCatalog } from "../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts";

const root = process.cwd(), output = path.join(root, "output/playwright/cloud-sky-w3-publication-chain-0929");
assert(!fs.existsSync(path.join(output, "result.json")), "preserve_previous_chain_evidence");
fs.mkdirSync(output, { recursive: true });
const hash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const service = createTestMiniappService({ skyCatalog: createBsc5pSkyCatalogProvider("bsc5p-bright-stars.v3") });
class TestModule {}
Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(TestModule);
const app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
const owned: OwnedDeepSkyImageAsset[] = [], transported: any[] = [];
let browser: any;
try {
  await app.init();
  const http = app.getHttpAdapter().getInstance();
  const at = "2026-09-29T20:00:00.000Z", spotId = TEST_PUBLISHED_SPOT.spotId;
  const contextReply = await http.inject({ method: "POST", url: "/v2/observation-contexts/resolve",
    payload: { location: { kind: "FORMAL_SPOT", spotId }, localDate: "2026-09-29", selectedAt: at } });
  assert.equal(contextReply.statusCode, 201);
  const context = contextReply.json().data;
  const reportReply = await http.inject({ method: "GET", url: `/v2/spots/${encodeURIComponent(spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3` });
  assert.equal(reportReply.statusCode, 200);
  const envelope = projectAdoptedSkyCatalog(reportReply.json()), catalogRef = envelope.data.skyScene.catalog!;
  assert(catalogRef);
  const stellar = (await http.inject({ method: "GET", url: `/v2/sky/catalogs/${catalogRef.catalogVersion}/${catalogRef.catalogHash}` })).json().data;
  const report = attachSkyCatalog(envelope.data, stellar), catalog = report.skyScene.deepSky!.catalog!;
  const index = catalog.entries.findIndex(entry => entry.objectRef === "M:42");
  const point = report.skyScene.deepSky!.frames.find(frame => frame.at === at)!.points!.find(candidate => candidate[0] === index)!;
  assert(point && point[2] > 20, "actual M42 above the horizon at the chosen observer/time");
  for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"] as const) {
    const response = await http.inject({ method: "GET", url: `/v2/celestial-objects/M%3A42/image?level=${level}&imageVersion=source-finite-v3` });
    assert.equal(response.statusCode, 200);
    const asset = await new Promise<OwnedDeepSkyImageAsset>((resolve, reject) => {
      startDeepSkyImageRequest({
        asset: { reference: "M:42", level, tempFilePath: path.join(output, `deep-sky-M-42-${level}.jpg`) },
        url: `/v2/celestial-objects/M%3A42/image?level=${level}&imageVersion=source-finite-v3`,
        request(options) { options.success({ statusCode: response.statusCode, data: Uint8Array.from(response.rawPayload).buffer, header: response.headers }); return {}; },
        writeFile(options) { fs.writeFileSync(options.filePath, Buffer.from(options.data)); options.success(); },
        removeFile(file) {
          assert.equal(path.dirname(path.resolve(file)), output, "only this generated encoded file is released");
          fs.unlinkSync(file);
        }, onReady: resolve, onError: () => reject(Error("mini_request_rejected_actual_publication")),
      });
    });
    owned.push(asset);
    assert(asset.tempFilePath.endsWith(".png") && asset.publicationHash);
    const body = fs.readFileSync(asset.tempFilePath);
    assert.equal(hash(body), hash(response.rawPayload));
    const informationReply = await http.inject({ method: "GET", url: `/v2/celestial-objects/M%3A42?deepSkyImageVersion=source-finite-v3&deepSkyPublicationHash=${asset.publicationHash}` });
    const information = matchingCelestialInformationResponse(informationReply.json(), "M:42", asset.publicationHash);
    assert.equal(information.data.sources.find(source => source.id.startsWith("imagery:"))!.id, asset.sourceId);
    const { release: _release, ...metadata } = asset;
    transported.push({ ...metadata, sha256: hash(body), bytes: body.length, data: body.toString("base64") });
  }
  const bundle = await build({ stdin: { resolveDir: root, contents: `
    export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
    export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
    export {createSkyViewBasis,unprojectSkyPoint} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';
    export {registerSkySurvey} from './apps/wechat-miniapp/src/features/sky/sky-survey-registration';
    export {skyArtworkUvAtDirection} from './apps/wechat-miniapp/src/features/sky/sky-artwork-registration';` },
    bundle: true, write: false, format: "iife", globalName: "skyChain", platform: "browser", target: "es2022",
    tsconfig: path.join(root, "apps/wechat-miniapp/tsconfig.json") });
  const require = createRequire(import.meta.url);
  const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
  browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');
  await page.evaluate("globalThis.__name=target=>target"); await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  const rows: any[] = [];
  for (const asset of transported) {
    const measured = await page.evaluate(async ({ asset, report, point, at }: any) => {
      const api = (globalThis as any).skyChain, width = 390, height = 844;
      const gl = document.querySelector("canvas")!.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
      const image = new Image(); image.src = "data:image/png;base64," + asset.data; await image.decode();
      if (image.width !== asset.pixelSize || image.height !== asset.pixelSize) throw Error("transported_image_dimensions");
      const sample = document.createElement("canvas"); sample.width = sample.height = asset.pixelSize;
      const ctx = sample.getContext("2d")!; ctx.drawImage(image, 0, 0);
      const original = ctx.getImageData(0, 0, asset.pixelSize, asset.pixelSize), wrong = ctx.getImageData(0, 0, asset.pixelSize, asset.pixelSize);
      for (let i = 0; i < wrong.data.length; i += 4) if (wrong.data[i + 3] === 0) wrong.data.set([255, 255, 255, 255], i);
      ctx.putImageData(wrong, 0, 0);
      const blank = document.createElement("canvas"); blank.width = blank.height = asset.pixelSize;
      const basis = api.createSkyViewBasis(point[1], 90 + point[2], 0), fov = asset.fieldDegrees * .6;
      function paint(input: object, mode = "NIGHT") {
        const renderer = api.createSkyGpuRenderer(gl, 1), failures: string[] = []; let snapshot: any, sources: any;
        try {
          api.drawSkyScene(renderer, report, at, null, null, width, height, mode,
            (value: any, painted: any) => { snapshot = value; sources = painted; }, undefined, fov,
            { ...asset, image: input }, basis, undefined, () => failures.push("image"));
          gl.finish(); const pixels = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          if (gl.getError() || failures.length || snapshot?.frameAt !== at) throw Error("actual_scene_failed");
          return { pixels, sourceMatches: sources.deepSkyImage === input, sourceAbsent: sources.deepSkyImage === null, objects: snapshot.objects.length };
        } finally { renderer.dispose(); }
      }
      const baseline = paint(blank), mutation = paint(sample), current = paint(image);
      if (!current.sourceMatches) throw Error("actual_scene_did_not_commit_loaded_image");
      const registration = api.registerSkySurvey(point, asset.fieldDegrees, asset.pixelSize, asset.pixelSize / 2);
      let missing = 0, missingDelta = 0, wrongDelta = 0, bright = 0, brightChanged = 0;
      for (let y = 1; y < height - 1; y += 2) for (let x = 1; x < width - 1; x += 2) {
        const ray = api.unprojectSkyPoint(x + .5, y + .5, basis, width, height, fov), uv = api.skyArtworkUvAtDirection(registration, ray);
        if (!uv || uv[0] < .12 || uv[0] > .88 || uv[1] < .12 || uv[1] > .88) continue;
        const sx = Math.floor(uv[0] * asset.pixelSize - .5), sy = Math.floor(uv[1] * asset.pixelSize - .5);
        const neighbors = [0, 1].flatMap(dx => [0, 1].map(dy => ((sy + dy) * asset.pixelSize + sx + dx) * 4));
        const p = ((height - 1 - y) * width + x) * 4;
        const delta = (pixels: Uint8Array) => Math.max(...[0, 1, 2].map(c => Math.abs(pixels[p + c]! - baseline.pixels[p + c]!)));
        if (neighbors.every(i => original.data[i + 3] === 0)) { missing++; missingDelta = Math.max(missingDelta, delta(current.pixels)); wrongDelta = Math.max(wrongDelta, delta(mutation.pixels)); }
        else if (neighbors.every(i => original.data[i + 3] === 255 && original.data[i]! > 230)) { bright++; if (delta(current.pixels) > 50) brightChanged++; }
      }
      const red = paint(image, "OBSERVATION");
      if (!red.sourceAbsent) throw Error("red_mode_image_credit_leaked");
      paint(image);
      return { mode: "NIGHT", fov, frameAt: at, loadedPixels: asset.pixelSize, paintedObjects: current.objects,
        sourceCommitted: current.sourceMatches, redSourceAbsent: red.sourceAbsent, missingInteriorSamples: missing,
        maximumMissingChange: missingDelta, whiteMutationChange: wrongDelta, brightSamples: bright, brightChanged };
    }, { asset, report, point, at });
    assert(measured.missingInteriorSamples > 0 && measured.maximumMissingChange === 0 && measured.whiteMutationChange > 100);
    assert(measured.brightSamples > 0 && measured.brightChanged > measured.brightSamples * .9, "real finite bright structure must survive");
    const filename = `m42-${asset.level.toLowerCase()}-whole-scene.png`;
    await page.locator("canvas").screenshot({ path: path.join(output, filename) });
    const { data: _data, tempFilePath: _file, ...metadata } = asset;
    rows.push({ ...metadata, ...measured, filename });
  }
  for (const asset of owned) asset.release();
  assert(owned.every(asset => !fs.existsSync(asset.tempFilePath)), "no encoded image remains after its real owner releases");
  const result = { scope: "Actual local v3 publication and HTTP bytes pass through the production Mini request/file owner into the full production scene; desktop software GPU with real BSC/OpenNGC/Astronomy Engine, explicit Memory Context/weather adapters. No native Taro composition, DevTools window, deployed service, phone/performance/whole-quality acceptance", at,
    observer: report.skyScene.observer, sourcePublicationHash: owned[0]!.publicationHash, rows, encodedFilesAfterRelease: 0 };
  fs.writeFileSync(path.join(output, "result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ sourcePublicationHash: result.sourcePublicationHash, rows, encodedFilesAfterRelease: 0 }));
} finally {
  for (const asset of owned) asset.release();
  await browser?.close(); await app.close();
}
