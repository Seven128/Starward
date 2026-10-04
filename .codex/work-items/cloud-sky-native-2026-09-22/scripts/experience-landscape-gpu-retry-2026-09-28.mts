import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { SkyLandscapePublicationService } from "../../../../workers/miniapp-api/src/sky-landscape-publication.ts";
import { createSkyViewBasis } from "../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";

const root = path.resolve("."), output = path.join(root, "output/playwright/cloud-sky-landscape-gpu-retry-0928");
assert.ok(!await fs.access(path.join(output, "result.json")).then(() => true, () => false), "preserve_existing_evidence");
await fs.mkdir(output, { recursive: true });
const publicationOwner = new SkyLandscapePublicationService(), publication = publicationOwner.manifest();
const assets = [];
for (const resource of publication.resources) {
  const image = await publicationOwner.asset(publication.publicationHash, resource.image.file);
  assets.push({ resource, data: `data:image/png;base64,${image.bytes.toString("base64")}` });
}
const current = await fs.readFile(path.join(root, "apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts"), "utf8");
const repaired = "if (landscapePanoramaUnavailable) { options.imageFailed?.(panorama.image); return false; }";
assert.equal(current.split(repaired).length, 2, "one_known_repaired_branch");
async function compile(before: boolean) {
  return build({ stdin: { resolveDir: root, contents: `
    import {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
    import {createSkyArtworkLoader} from './apps/wechat-miniapp/src/features/sky/sky-artwork-loader';
    globalThis.skyGpuRecovery={createSkyGpuRenderer,createSkyArtworkLoader};` },
    plugins: before ? [{ name: "bounded-old-latch", setup(build) {
      build.onLoad({ filter: /[\\/]sky-gpu-renderer\.ts$/ }, () => ({ loader: "ts",
        contents: current.replace(repaired, "if (landscapePanoramaUnavailable) return false;"),
        resolveDir: path.join(root, "apps/wechat-miniapp/src/features/sky") }));
    } }] : [], bundle: true, write: false, format: "iife", platform: "browser", target: "es2022" });
}
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const rows = [];
try {
  for (const before of [true, false]) {
    const bundle = await compile(before), page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');
    await page.evaluate("globalThis.__name = target => target");
    await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
    const row = await page.evaluate(async ({ assets, publication, basis }) => {
      const { createSkyGpuRenderer, createSkyArtworkLoader } = (globalThis as any).skyGpuRecovery;
      const canvas = document.querySelector("canvas")!, gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
      const live: Record<string, Set<object>> = {}, created: Record<string, number> = {}, deleted: Record<string, number> = {};
      for (const kind of ["Texture", "Program", "Buffer", "Shader"]) {
        live[kind] = new Set(); created[kind] = deleted[kind] = 0;
        const make = (gl as any)[`create${kind}`].bind(gl), remove = (gl as any)[`delete${kind}`].bind(gl);
        (gl as any)[`create${kind}`] = (...args: any[]) => { const value = make(...args); if (value) { live[kind]!.add(value); created[kind]!++; } return value; };
        (gl as any)[`delete${kind}`] = (value: object) => { if (live[kind]!.delete(value)) deleted[kind]!++; remove(value); };
      }
      let injected = 0;
      const shaderSource = gl.shaderSource.bind(gl);
      gl.shaderSource = (shader, source) => {
        // Exercise a real compiler failure once; no renderer return values,
        // image state or successful GL results are fabricated.
        if (!injected && source.includes("uniform vec2 u_imageSize")) { injected++; source += "\n#error bounded_transient_gpu_failure\n"; }
        shaderSource(shader, source);
      };
      const ids = new WeakMap<object, string>(), loads: Promise<void>[] = [];
      let state: any = null, releases = 0, decodes = 0;
      const loader = createSkyArtworkLoader({ changed(value: any) { state = value; }, start(asset: any, ready: any, fail: any) {
        const input = assets.find(value => value.resource.id === asset.id)!;
        const image = new Image(); image.src = input.data; ids.set(image, asset.id); decodes++;
        let cancelled = false;
        loads.push(image.decode().then(() => {
          if (cancelled) return;
          ready({ image, release() { releases++; image.src = ""; } });
        }, fail));
        return () => { cancelled = true; image.src = ""; };
      } });
      loader.update(assets.map(value => ({ ...value.resource.image, id: value.resource.id })));
      await Promise.all(loads);
      const failures: string[] = [], options = { imageFailed(image: object) { failures.push(ids.get(image)!); loader.failed(image); } };
      let renderer = createSkyGpuRenderer(gl, 1, options);
      const view = { basis, verticalFovDeg: 85 }, sun = { direction: [0, 1, 0], altitudeDeg: -24 };
      const panorama = (id: string) => ({ image: state.images.get(id), mask: { publication, resource: assets.find(value => value.resource.id === id)!.resource } });
      const coarse = panorama("overview"), fine = panorama("detail");
      const initialImages = [coarse.image, fine.image].map(image => ({ width: image?.width, height: image?.height }));
      renderer.begin(390, 844, "#080D17");
      const first = renderer.landscape(view, sun, false, fine), followingCoarse = renderer.landscape(view, sun, false, coarse);
      const model = renderer.landscape(view, sun, false); renderer.disc(195, 50, 4, "#FFFFFF", 1); renderer.finish();
      const pixels = new Uint8Array(390 * 844 * 4); gl.readPixels(0, 0, 390, 844, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let paintedPixels = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] !== 8 || pixels[i + 1] !== 13 || pixels[i + 2] !== 23) paintedPixels++;
      const failedImageIds = [...state.images.keys()], errors = [gl.getError()], resetGpu = loader.retry();
      renderer.dispose(); await Promise.all(loads);
      renderer = createSkyGpuRenderer(gl, 1, options);
      renderer.begin(390, 844, "#080D17");
      const restored = renderer.landscape(view, sun, false, panorama("detail")); renderer.finish(); errors.push(gl.getError());
      const restoredPixels = new Uint8Array(pixels.length); gl.readPixels(0, 0, 390, 844, gl.RGBA, gl.UNSIGNED_BYTE, restoredPixels);
      let changedPixels = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] !== restoredPixels[i] || pixels[i + 1] !== restoredPixels[i + 1] || pixels[i + 2] !== restoredPixels[i + 2]) changedPixels++;
      (globalThis as any).trial = { renderer, loader, inspect: () => ({ created, deleted,
        remaining: Object.fromEntries(Object.entries(live).map(([kind, values]) => [kind, values.size])),
        decodes, releases, error: gl.getError() }) };
      return { initialImages, injected, first, followingCoarse, model, failures, failedImageIds, resetGpu, restored,
        paintedPixels, changedPixels, errors, counts: { created, deleted }, decodes, releases };
    }, { assets, publication, basis: createSkyViewBasis(0, 100, 0)! });
    if (row.injected !== 1) console.log(JSON.stringify({ before, ...row }));
    assert.equal(row.injected, 1); assert.equal(row.first, false); assert.equal(row.followingCoarse, false);
    assert.equal(row.model, true); assert.ok(row.paintedPixels > 1000, "model and independent sky output actually survive");
    assert.equal(row.resetGpu, true); assert.equal(row.restored, true); assert.ok(row.changedPixels > 1000, "retry really changes the painted result");
    assert.deepEqual(row.errors, [0, 0]);
    assert.deepEqual(row.failures, before ? ["detail"] : ["detail", "overview"]);
    assert.deepEqual(row.failedImageIds, before ? ["overview"] : []);
    await page.locator("canvas").screenshot({ path: path.join(output, before ? "bounded-old-after-retry.png" : "production-after-retry.png") });
    const disposal = await page.evaluate(() => {
      const trial = (globalThis as any).trial; trial.renderer.dispose(); trial.loader.dispose();
      return trial.inspect();
    });
    assert.equal(disposal.error, 0); assert.equal(disposal.releases, disposal.decodes);
    assert.deepEqual(disposal.created, disposal.deleted);
    assert.ok(Object.values(disposal.remaining).every(value => value === 0));
    rows.push({ before, ...row, disposal }); await page.close();
  }
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify({ scope: "Real production GPU renderer, shared image owner and original published PNGs in software WebGL. One transient fragment compilation failure, plus bounded old latch mutation. This does not establish native GPU or phone recovery.",
    publicationHash: publication.publicationHash, resources: assets.map(value => ({ id: value.resource.id, sha256: value.resource.image.sha256 })), rows }, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(rows.map(({ before, failures, restored, errors, paintedPixels, changedPixels }) => ({ before, failures, restored, errors, paintedPixels, changedPixels }))));
} finally { await browser.close(); }
