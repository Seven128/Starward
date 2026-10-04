import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { effectiveReducedMotion, type SystemMotion } from "../theme/system-motion";

test("in-scope theme combines system input while the excluded legacy entry keeps account semantics", () => {
  for (const account of [false, true]) for (const system of ["unknown", "reduce", "no-preference"] as SystemMotion[]) {
    const exports: any = {}, state = { mode: "NIGHT", preferences: { reducedMotion: account, largeText: true }, hydrate() {} };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-theme.ts", import.meta.url), "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText, { exports, require: (name: string) => name === "react" ? { useEffect() {} }
      : name === "@tarojs/taro" ? { useDidShow() {} } : name.includes("app-store") ? { useAppStore: (select: any) => select(state) }
      : name.includes("use-reduced-motion") ? { useReducedMotion: () => effectiveReducedMotion(account, system) } : {},
    });
    const base = "theme-page theme-night large-text";
    assert.equal(exports.useThemeClass(), base + (account ? " reduced-motion" : ""));
    assert.equal(exports.useMotionThemeClass(), base + (effectiveReducedMotion(account, system) ? " reduced-motion" : ""));
  }
});
