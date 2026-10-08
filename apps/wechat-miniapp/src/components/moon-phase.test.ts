import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { MINIAPP_DESIGN } from "../theme/design-tokens";

function renderer() {
  let mode = "DAY";
  const exported: Record<string, (props: unknown) => any> = {};
  const jsx = (type: unknown, props: any, key: unknown) => ({ type, props, key });
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./moon-phase.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: exported, require: (name: string) => {
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "@tarojs/components") return { Image: "Image", View: "View", Text: "Text" };
    if (name.endsWith("app-store")) return { useAppStore: (select: (state: unknown) => unknown) => select({ mode }) };
    throw Error(`unexpected module ${name}`);
  } });
  return (next: string, phase: string | null, decorative = false) => {
    mode = next; return exported.MoonPhaseImage!({ phase, decorative, className: "consumer-moon" });
  };
}

test("all lunar phases retire the ordinary texture and preserve identity in observation mode", () => {
  const render = renderer();
  const phases = ["NEW", "WAXING_CRESCENT", "FIRST_QUARTER", "WAXING_GIBBOUS", "FULL", "WANING_GIBBOUS", "LAST_QUARTER", "WANING_CRESCENT"];
  const labels = ["新月", "蛾眉月", "上弦月", "盈凸月", "满月", "亏凸月", "下弦月", "残月"];
  for (const [index, phase] of phases.entries()) {
    const day = render("DAY", phase), night = render("NIGHT", phase), red = render("OBSERVATION", phase);
    assert.equal(day.props.src, `/assets/moon/phase-${index}.svg`);
    assert.equal(night.props.src, day.props.src);
    assert.equal(red.props.src, `/content/assets/moon/phase-${index}.svg`, "red light must not show a yellow-gray phase image");
    assert.notEqual(red.key, day.key, "old texture owner must retire when entering red light");
    assert.equal(night.key, day.key);
    assert.equal(red.type, "Image"); assert.equal(red.props.mode, "aspectFit");
    assert.equal(red.props.ariaLabel, labels[index]); assert.equal(red.props.className, day.props.className);
    assert.equal(render("OBSERVATION", phase, true).props["aria-hidden"], "true");
    assert.equal(render("DAY", phase).key, day.key, "return uses the original ordinary asset");
  }
});

test("an unknown phase remains honest and accessible in both MoonPhaseImage consumers", () => {
  const render = renderer();
  for (const mode of ["DAY", "NIGHT", "OBSERVATION"]) {
    const main = render(mode, null), ruler = render(mode, null, true);
    assert.equal(main.type, "View"); assert.equal(main.props.children.props.children, "?");
    assert.equal(main.props.ariaLabel, "月相暂无数据"); assert.equal(main.props.src, undefined);
    assert.equal(ruler.props["aria-hidden"], "true"); assert.equal(ruler.props.ariaLabel, undefined);
  }
});

test("red lunar assets preserve every original phase contour and use only adopted red light roles", () => {
  const red = MINIAPP_DESIGN.themes.observation;
  const allowed = [red["surface-subtle"], red["text-primary"], red["text-secondary"]].sort();
  const geometry = (svg: string) => svg.replace(/#[0-9a-f]{6}/giu, "#COLOR").replace(/\r\n?/gu, "\n").trim();
  for (let phase = 0; phase < 8; phase++) {
    const original = readFileSync(new URL(`../assets/moon/phase-${phase}.svg`, import.meta.url), "utf8");
    const observation = readFileSync(new URL(`../assets/moon-observation/phase-${phase}.svg`, import.meta.url), "utf8");
    assert.equal(geometry(observation), geometry(original), `phase ${phase} geometry must not change`);
    assert.deepEqual([...new Set(observation.match(/#[0-9a-f]{6}/giu))].sort(), allowed);
    assert.doesNotMatch(observation, /#(?:727680|FFD04B|8D9098)/iu);
  }
});
