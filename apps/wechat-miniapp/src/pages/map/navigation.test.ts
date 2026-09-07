import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("map navigation respects travel warning cancellation and changing selection", async () => {
  const source = ts.createSourceFile("map.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "onPanelNavigate") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  for (const scenario of ["confirm", "cancel", "changed", "hidden", "failed"] as const) {
    const epoch = { current: 0 }, calls: string[] = [];
    let selectedSpotId = "spot:a";
    const navigate = vm.runInNewContext(ts.transpileModule(declaration + "\nonPanelNavigate;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      navigationEpoch: epoch,
      selected: { spotId: "spot:a", visibilityPolicy: "PUBLIC_EXACT", gcj02: { latitude: 22, longitude: 114 } },
      spotDetail: { accessAndSafety: { openness: "CLOSED", restrictions: ["关闭"], guidance: [] } },
      useAppStore: { getState: () => ({ selectedSpotId }) },
      notify: () => calls.push("notice"), errorMessage: () => "unavailable",
      Taro: {
        showModal: async () => {
          calls.push("warning");
          if (scenario === "changed") selectedSpotId = "spot:b";
          if (scenario === "hidden") epoch.current++;
          if (scenario === "failed") throw new Error("unavailable");
          return { confirm: scenario !== "cancel" };
        },
        openLocation: async () => calls.push("open"),
      },
    }) as () => Promise<void>;
    await navigate();
    assert.deepEqual(calls, scenario === "confirm" ? ["warning", "open"] : scenario === "failed" ? ["warning", "notice"] : ["warning"]);
  }
});
