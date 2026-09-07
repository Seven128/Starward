import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("spot drilldowns never display another spot receipt or start its dependent queries", () => {
  const source = ts.createSourceFile("spot.tsx", readFileSync(new URL("./spot-detail-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ["contextComplete", "validRoute", "overview", "guides", "site", "detail"];
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, names.length);
  const script = ts.transpileModule(declarations.join("\n") + "\n({validRoute, detail});", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  for (const segment of ["GUIDES", "SITE"]) {
    for (const scenario of ["matching", "other-spot", "expired-context", "missing"] as const) {
      const queries: { queryKey: string[]; enabled: boolean }[] = [];
      const receipt = { spot: { spotId: scenario === "other-spot" ? "spot:b" : "spot:a" } };
      const result = vm.runInNewContext(script, {
        spotId: "spot:a", routeContextId: "ctx:current", segment,
        observationContext: { contextId: scenario === "expired-context" ? "ctx:old" : "ctx:current", location: { kind: "FORMAL_SPOT", spotId: "spot:a" } },
        useResourceQuery: (options: { queryKey: string[]; enabled: boolean }) => {
          queries.push(options);
          return options.queryKey[0] === "spot-overview" && scenario !== "missing" ? { data: { data: receipt } } : {};
        },
      }) as { validRoute: boolean; detail?: unknown };
      const [overviewQuery, guidesQuery, siteQuery] = queries;
      assert.ok(overviewQuery && guidesQuery && siteQuery);
      if (scenario === "matching") {
        assert.equal(result.detail, receipt);
        assert.equal((segment === "GUIDES" ? guidesQuery : siteQuery).enabled, true);
        assert.equal((segment === "GUIDES" ? siteQuery : guidesQuery).enabled, false);
      } else {
        assert.equal(result.detail, undefined);
        assert.ok(queries.slice(1).every(query => !query.enabled));
      }
      if (scenario === "expired-context") assert.equal(overviewQuery.enabled, false);
    }
  }
});
