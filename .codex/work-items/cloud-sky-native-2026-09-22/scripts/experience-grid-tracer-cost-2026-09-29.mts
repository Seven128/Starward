// Causal CPU diagnostic, using exact production bundles in one Chromium runtime.
// This does not measure native/phone frame time, GPU resources or final acceptance.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { build } from "esbuild";

const root = process.cwd();
const dir = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence/grid-tracer-cost-2026-09-29");
const baseline = process.argv.includes("--baseline");
const sha256 = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const contents = `export {createSkyGridTracer} from './apps/wechat-miniapp/src/features/sky/sky-grid-projection';
  export {skyHorizontalGrid} from './apps/wechat-miniapp/src/features/sky/sky-horizontal-grid';
  export {skyEquatorialGrid} from './apps/wechat-miniapp/src/features/sky/sky-equatorial-grid';
  export {skyEquatorialDirectionToEnu} from './apps/wechat-miniapp/src/features/sky/sky-observation-frame';
  export {createSkyViewBasis,skyHorizontalDirection} from './apps/wechat-miniapp/src/features/sky/sky-view-projection';`;
const bundled = await build({ stdin: { contents, resolveDir: root }, bundle: true, write: false, metafile: true,
  format: "iife", globalName: baseline ? "gridBefore" : "gridAfter", platform: "browser", target: "es2022",
  tsconfig: path.join(root, "apps/wechat-miniapp/tsconfig.json") });
const sourceHashes = await Promise.all(Object.keys(bundled.metafile!.inputs).filter(file => file !== "<stdin>")
  .map(async file => ({ file, sha256: sha256(await fs.readFile(path.join(root, file))) })));
const sources = { sourceHashes, bundleSha256: sha256(bundled.outputFiles[0]!.text) };
if (baseline) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "before.js"), bundled.outputFiles[0]!.text, { flag: "wx" });
  await fs.writeFile(path.join(dir, "before-sources.json"), JSON.stringify(sources, null, 2) + "\n", { flag: "wx" });
  // Keep the public astronomy frame only. The disposable context identifier is
  // never written to the diagnostic, log, bundle or durable project Context.
  async function json(url: string, body?: unknown): Promise<any> {
    const response = await fetch("http://127.0.0.1:8789" + url, { signal: AbortSignal.timeout(10000),
      ...(body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) });
    assert([200, 201].includes(response.status), "public_local_endpoint_response"); return response.json();
  }
  const places = await json("/v2/places/search?q=" + encodeURIComponent("示例观星点"));
  const spot = places.data.formalSpots.find((value: any) => value.name === "示例观星点");
  const at = "2026-09-28T16:00:00.000Z";
  const context = (await json("/v2/observation-contexts/resolve", {
    location: { kind: "FORMAL_SPOT", spotId: spot.spotId }, localDate: "2026-09-28", selectedAt: at,
  })).data;
  const report = (await json(`/v2/spots/${encodeURIComponent(spot.spotId)}/sky?contextId=${encodeURIComponent(context.contextId)}&catalogVersion=bsc5p-bright-stars.v3`)).data;
  const frame = report.observationFrames.find((value: any) => value.at === at);
  assert(frame && frame.observer.latitude === 22.4826799 && frame.observer.longitude === 114.5557147);
  const prior = JSON.parse(await fs.readFile(path.join(root, "output/playwright/cloud-sky-coordinate-grids-0928-final/result.json"), "utf8"));
  const local = prior.rows.find((value: any) => value.name === "night-equatorial" && value.fov === 85);
  await fs.writeFile(path.join(dir, "inputs.json"), JSON.stringify({ frame, localBasis: local.basis, width: 390.4, height: 844 }, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ saved: "exact_pre_change_bundle_and_public_frame", ...sources }));
} else {
  await assert.rejects(fs.access(path.join(dir, "comparison.json")), { code: "ENOENT" });
  const beforeCode = await fs.readFile(path.join(dir, "before.js"), "utf8");
  const beforeSources = JSON.parse(await fs.readFile(path.join(dir, "before-sources.json"), "utf8"));
  assert.equal(sha256(beforeCode), beforeSources.bundleSha256);
  const inputs = JSON.parse(await fs.readFile(path.join(dir, "inputs.json"), "utf8"));
  const require = createRequire(import.meta.url);
  const { chromium } = require("C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.evaluate("globalThis.__name = target => target");
    await page.addScriptTag({ content: beforeCode });
    await page.addScriptTag({ content: bundled.outputFiles[0]!.text });
    const result = await page.evaluate(async ({ frame, localBasis, width, height }) => {
      const before = (globalThis as any).gridBefore, after = (globalThis as any).gridAfter;
      const observer = (latitude: number, degrees: number) => {
        const phi = latitude * Math.PI / 180, theta = degrees * Math.PI / 180;
        return { ...frame, observer: { latitude, longitude: 0, elevationM: 0 }, equatorialToEnu:
          [-Math.sin(theta), Math.cos(theta), 0, -Math.sin(phi) * Math.cos(theta), -Math.sin(phi) * Math.sin(theta), Math.cos(phi),
            Math.cos(phi) * Math.cos(theta), Math.cos(phi) * Math.sin(theta), Math.sin(phi)] };
      };
      const m = frame.equatorialToEnu;
      const cases = [
        { name: "actual-local", frame, basis: localBasis, fov: 85 },
        { name: "actual-local-protected", frame, basis: localBasis, fov: 85, center: { x: 195.2, y: 478 } },
        { name: "actual-identification", frame, basis: localBasis, fov: 25 },
        { name: "actual-dome-protected", frame, basis: after.createSkyViewBasis(0, 180, 0), fov: 267.8, center: { x: 195.2, y: 450 } },
        { name: "actual-celestial-pole", frame, basis: after.createSkyViewBasis(Math.atan2(m[2], m[5]) * 180 / Math.PI,
          90 + Math.asin(m[8]) * 180 / Math.PI, 0), fov: 0.05 },
        ...[0.2, 0.5, 0.8].map(sidereal => ({ name: `grazing-${sidereal}`, frame: observer(29.9999, sidereal),
          basis: after.createSkyViewBasis(180, 90.0001, 0), fov: 0.05 })),
        ...[90, -90].map(latitude => ({ name: `observer-pole-${latitude}`, frame: observer(latitude, 0),
          basis: after.createSkyViewBasis(27, 180, 0), fov: 267.8, center: { x: 194, y: 450 } })),
        { name: "rolled-view", frame, basis: after.createSkyViewBasis(279, 130, 43), fov: 85 },
      ];
      const measure = (api: any, scenario: any, layer: string, counted: boolean) => {
        const { basis, fov, center, frame } = scenario;
        if (!counted) return layer === "horizontal" ? api.skyHorizontalGrid(basis, width, height, fov, center)
          : api.skyEquatorialGrid(frame, basis, width, height, fov, center);
        let calls = 0;
        const trace = api.createSkyGridTracer(basis, width, height, fov, center, (lon: number, lat: number) => {
          calls++;
          if (layer === "horizontal") return api.skyHorizontalDirection(lon, lat);
          const longitude = lon * Math.PI / 180, latitude = lat * Math.PI / 180;
          return api.skyEquatorialDirectionToEnu(frame.equatorialToEnu,
            [Math.cos(latitude) * Math.cos(longitude), Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude)]);
        });
        const step = fov >= 90 ? 2 : 1;
        const grid = layer === "horizontal" ? { horizon: trace(360 / step, (i: number) => [i * step, 0]),
          altitude: [30, 60].flatMap(lat => trace(360 / step, (i: number) => [i * step, lat])),
          meridians: Array.from({ length: 12 }, (_, i) => i * 30).flatMap(lon => trace(90 / step, (i: number) => [lon, i * step])) }
          : { equator: trace(360 / step, (i: number) => [i * step, 0]),
            parallels: [-60, -30, 30, 60].flatMap(lat => trace(360 / step, (i: number) => [i * step, lat])),
            meridians: Array.from({ length: 12 }, (_, i) => i * 30).flatMap(lon => trace(180 / step, (i: number) => [lon, -90 + i * step])) };
        return { calls, grid };
      };
      const rows = [];
      for (const scenario of cases) for (const layer of ["horizontal", "equatorial"]) {
        const oldGrid = measure(before, scenario, layer, false), newGrid = measure(after, scenario, layer, false);
        const geometry = JSON.stringify(oldGrid);
        if (geometry !== JSON.stringify(newGrid)) throw Error(`geometry_changed:${scenario.name}:${layer}`);
        const oldCount = measure(before, scenario, layer, true), newCount = measure(after, scenario, layer, true);
        if (geometry !== JSON.stringify(oldCount.grid) || geometry !== JSON.stringify(newCount.grid)) throw Error("counting_changed_geometry");
        for (let i = 0; i < 12; i++) { measure(before, scenario, layer, false); measure(after, scenario, layer, false); }
        const samples: number[][] = [[], []];
        for (let i = 0; i < 60; i++) for (const index of i % 2 ? [1, 0] : [0, 1]) {
          const start = performance.now(); measure(index ? after : before, scenario, layer, false);
          samples[index]!.push(performance.now() - start);
        }
        const stats = samples.map(values => { values.sort((a, b) => a - b);
          return { medianMs: (values[29]! + values[30]!) / 2, p95Ms: values[56], samples: values.length }; });
        rows.push({ name: scenario.name, layer, fov: scenario.fov, center: scenario.center ?? null,
          exactOrderedGeometryEqual: true, geometry,
          segments: Object.values(newGrid).reduce((sum: number, lines: any) => sum + lines.length, 0),
          before: { ...stats[0], directionCalls: oldCount.calls }, after: { ...stats[1], directionCalls: newCount.calls } });
      }
      return { rows, userAgent: navigator.userAgent, execution: "one Chromium page, alternating before/after order, 12 warmups each + 60 single-call samples each per case" };
    }, inputs);
    const rows = result.rows.map(({ geometry, ...row }) => ({ ...row, geometrySha256: sha256(geometry) }));
    const record = { scope: "Production CPU coordinate-grid geometry only in a causal desktop Chromium comparison; no build co-run, native/phone frame time, complete-scene performance, GPU/native memory, cost or final quality acceptance.",
      at: new Date().toISOString(), beforeSources, afterSources: sources, inputsSha256: sha256(await fs.readFile(path.join(dir, "inputs.json"))), ...result, rows };
    await fs.writeFile(path.join(dir, "after.js"), bundled.outputFiles[0]!.text, { flag: "wx" });
    await fs.writeFile(path.join(dir, "comparison.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
    console.log(JSON.stringify({ rows: rows.map(row => ({ name: row.name, layer: row.layer, fov: row.fov, segments: row.segments,
      before: row.before, after: row.after, exactOrderedGeometryEqual: row.exactOrderedGeometryEqual })) }));
  } finally { await browser.close(); }
}
