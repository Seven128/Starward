// Actual production point shader, with isolated symbols as unchanged controls.
// Pixel readback belongs only to this repeatable diagnostic, never the Mini runtime.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { build } from "esbuild";

const root = process.cwd(), before = process.argv.includes("--before");
const output = path.join(root, `output/playwright/cloud-sky-star-profile-0929-${before ? "before" : "after"}`);
await assert.rejects(fs.access(path.join(output, "result.json")), { code: "ENOENT" });
await fs.mkdir(output, { recursive: true });
const digest = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");
const bundle = await build({ stdin: { resolveDir: root, contents:
  `export {createSkyGpuRenderer} from './apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
   export {drawSkyScene} from './apps/wechat-miniapp/src/features/sky/sky-scene-render';
   export {selectSkyLandscapeResource} from './apps/wechat-miniapp/src/features/sky/sky-landscape-resources';
   export {skyGalacticBandAt} from './apps/wechat-miniapp/src/features/sky/sky-galactic-band';
   export {skyHorizontalGrid} from './apps/wechat-miniapp/src/features/sky/sky-horizontal-grid';
   export {skyEquatorialGrid} from './apps/wechat-miniapp/src/features/sky/sky-equatorial-grid';` },
  bundle: true, write: false, metafile: true, format: "iife", globalName: "skyQualityProduction", platform: "browser", target: "es2022",
  tsconfig: path.join(root, "apps/wechat-miniapp/tsconfig.json") });
const sourceHashes = await Promise.all(Object.keys(bundle.metafile!.inputs).filter(file => file !== "<stdin>")
  .map(async file => ({ file, sha256: digest(await fs.readFile(path.join(root, file))) })));
await fs.writeFile(path.join(output, "production.js"), bundle.outputFiles[0]!.text, { flag: "wx" });
const previous = before ? null : JSON.parse(await fs.readFile(path.join(root, "output/playwright/cloud-sky-star-profile-0929-before/result.json"), "utf8"));
const retained = before ? null : await fs.readFile(path.join(root, "output/playwright/cloud-sky-star-profile-0929-before/production.js"), "utf8");
if (previous) assert.equal(digest(retained!), previous.sourceBundleSha256);
const { chromium } = createRequire(import.meta.url)("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const rows: any[] = [];
try {
  const page = await browser.newPage({ viewport: { width: 192, height: 64 } });
  await page.setContent('<style>body{margin:0}canvas{width:192px;height:64px;display:block}</style><canvas></canvas>');
  await page.evaluate("globalThis.__name = target => target");
  if (retained) {
    await page.addScriptTag({ content: retained });
    await page.evaluate(() => { (globalThis as any).skyQualityBefore = (globalThis as any).skyQualityProduction; });
  }
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  for (const pixelRatio of [1, 2, 3]) for (const version of retained ? ["before", "after"] : ["current"]) {
    const row = await page.evaluate(({ pixelRatio, version }) => {
      const canvas = document.querySelector("canvas")!; canvas.width = 192 * pixelRatio; canvas.height = 64 * pixelRatio;
      const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
      if (!gl) throw Error("software_webgl_missing");
      const production = (globalThis as any)[version === "before" ? "skyQualityBefore" : "skyQualityProduction"];
      const renderer = production.createSkyGpuRenderer(gl, pixelRatio);
      try {
        renderer.begin(192, 64, "#000000");
        renderer.disc(32, 32, 2.3, "#FFFFFF", .9, 0, "star");
        renderer.disc(96, 32, 2.3, "#FFFFFF", .9);
        renderer.disc(160, 32, 3.2, "#FFFFFF", .9, 1);
        renderer.finish(); gl.finish();
        const bytes = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
        const samples = [32, 96, 160].map(x => {
          const profile: number[] = [];
          for (let offset = 0; offset <= 8 * pixelRatio; offset++)
            profile.push(bytes[((32 * pixelRatio) * canvas.width + x * pixelRatio + offset) * 4]!);
          let sum = 0, outside = 0;
          for (let y = 20 * pixelRatio; y < 44 * pixelRatio; y++) for (let px = (x-12)*pixelRatio; px < (x+12)*pixelRatio; px++) {
            const value = bytes[(y * canvas.width + px) * 4]!; sum += value;
            if (Math.hypot(px+.5-x*pixelRatio, y+.5-32*pixelRatio) > 2.8*pixelRatio) outside += value;
          }
          return { profile, sum, outside, haloFraction: outside / sum };
        });
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset+32768));
        return { pixelRatio, version, samples, rgbaBase64: btoa(binary), error: gl.getError(),
          maximumPointSize: Array.from(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)) };
      } finally { renderer.dispose(); }
    }, { pixelRatio, version });
    const { rgbaBase64, ...record } = row;
    await page.locator("canvas").screenshot({ path: path.join(output, `profile-${version}-dpr${pixelRatio}.png`) });
    rows.push({ ...record, rgbaSha256: digest(Buffer.from(rgbaBase64, "base64")) });
  }
} finally { await browser.close(); }
const current = rows.filter(row => row.version !== "before");
const diffuse = current.every(row => row.samples[0].haloFraction > .08 && row.samples[0].haloFraction < .3);
const result = { scope: "Actual production point shader in software WebGL at DPR1/2/3. Display profile only, no physical PSF/photometry, native composition or device-performance acceptance.",
  sourceBundleSha256: digest(bundle.outputFiles[0]!.text), sourceHashes, rows, diffuse,
  unchangedControls: retained ? current.every(row => {
    const old = rows.find(candidate => candidate.version === "before" && candidate.pixelRatio === row.pixelRatio);
    return JSON.stringify(row.samples.slice(1)) === JSON.stringify(old.samples.slice(1));
  }) : null };
await fs.writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2)+"\n", { flag: "wx" });
console.log(JSON.stringify({ diffuse, unchangedControls: result.unchangedControls, rows: rows.map(row => ({ version: row.version, pixelRatio: row.pixelRatio,
  haloFraction: row.samples[0].haloFraction, sum: row.samples[0].sum, error: row.error })) }));
assert(current.every(row => row.error === 0));
assert(diffuse, "bright point sources need a visible bounded halo instead of a uniform disc");
if (retained) {
  assert(result.unchangedControls, "solid markers and rings must retain their exact pixel samples");
  for (const row of current) {
    const old = rows.find(candidate => candidate.version === "before" && candidate.pixelRatio === row.pixelRatio);
    assert(row.samples[0].sum / old.samples[0].sum > .9 && row.samples[0].sum / old.samples[0].sum < 1.1,
      "softening redistributes the existing display light rather than adding a bright artificial disc");
  }
}
