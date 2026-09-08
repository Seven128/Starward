import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as projection from "../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts";
import * as timeFrame from "../../../apps/wechat-miniapp/src/features/sky/sky-time-frame.ts";

const path = "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx";
const baseline = execFileSync("git", ["show", "86101d32c7f31be69bb32756a593375df150f7f4:" + path], { encoding: "utf8" });
const current = readFileSync(path, "utf8");
function renderer(source: string) {
  const exports: Record<string, any> = {};
  vm.runInNewContext(ts.transpileModule(source + "\nexport { drawSkyScene };", {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: (name: string) => name === "./sky-view-projection" ? projection : name === "./sky-time-frame" ? timeFrame : {} });
  return exports.drawSkyScene;
}
const oldDraw = renderer(baseline), newDraw = renderer(current);
const data = JSON.parse(readFileSync(new URL("R2-real-sky-envelope.json", import.meta.url), "utf8")).data;
const counts: { mode: string; width: number; height: number; frameAt: string; commands: number }[] = [];
for (const mode of ["DAY", "NIGHT", "OBSERVATION"]) for (const [width, height] of [[375, 812], [812, 375]]) {
  for (const frameAt of [data.hourly[0].at, data.hourly[10].at]) for (const heading of [0, 180]) {
    function draw(render: typeof oldDraw) {
      const calls: unknown[] = [];
      const context = new Proxy({}, { get: (_target, key) => (...args: unknown[]) => {
        if (key === "draw") { calls.push([key, args[0]]); (args[1] as (() => void) | undefined)?.(); }
        else calls.push([key, ...args]);
      } });
      render(context, data, frameAt, heading, { alphaDeg: 0, betaDeg: 90, gammaDeg: 15, sampledAt: 1 }, width, height, mode);
      return calls;
    }
    const previous = draw(oldDraw), next = draw(newDraw);
    assert.deepEqual(next, previous, `${mode} ${width}x${height} ${frameAt}`);
    counts.push({ mode, width: width!, height: height!, frameAt, commands: next.length });
  }
}
const result = {
  fixture: "Exact real Gaia2048/20-frame catalog envelope with deterministic fixture weather; no device pointing evidence",
  comparedTo: "86101d32c7f31be69bb32756a593375df150f7f4",
  cases: counts.length,
  nativeCanvasCommandsUnchanged: true,
  comparison: counts,
  limitation: "Recorded API command/data equivalence only; neither pixels, actual native timing nor physical sensor correspondence",
};
writeFileSync(new URL("R5-render-comparison.json", import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ cases: result.cases, nativeCanvasCommandsUnchanged: true, commandRange: [Math.min(...counts.map(x => x.commands)), Math.max(...counts.map(x => x.commands))] }));
