import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const path = new URL("./contribution-records.tsx", import.meta.url);
const source = ts.createSourceFile(path.pathname, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let declaration = "";
const visit = (node: ts.Node) => {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === "openPublishedSpot")
    declaration = `const ${node.getText(source)};`;
  ts.forEachChild(node, visit);
};
visit(source);
assert.ok(declaration, "published record action must remain attached to the rendered list");

function runAction(options: { fail?: boolean; missing?: boolean; changeOwner?: boolean } = {}) {
  const calls: string[] = [];
  const opening = { current: false };
  const openingVersion = { current: 0 };
  const openingAbort = { current: null };
  const map = {
    viewport: { zoom: 10 },
    setFinderQuery(value: string) { calls.push(`query:${value}`); },
    setViewport(value: { zoom: number }) { calls.push(`viewport:${value.zoom}`); },
    requestSpotOpen(value: string) { calls.push(`open:${value}`); },
  };
  let owner = "account-a";
  const code = ts.transpileModule(`${declaration}\nopenPublishedSpot;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  class ApiError extends Error { statusCode = 404; code = "NOT_FOUND"; }
  const action = vm.runInNewContext(code, {
    opening,
    openingVersion,
    openingAbort,
    AbortController,
    setOpeningId: (value: string | null) => calls.push(`busy:${value}`),
    setOpenError: (value: { id: string; missing: boolean } | null) => calls.push(`error:${value ? `${value.id}:${value.missing}` : "null"}`),
    MiniappApiError: ApiError,
    currentDraftUserId: () => owner,
    getSharedSpot: async () => {
      if (options.fail) throw Error("offline");
      if (options.missing) throw new ApiError("removed");
      if (options.changeOwner) owner = "account-b";
      return { data: { spotId: "spot:published", name: "当前正式名称", spotGcj02: { latitude: 22.5, longitude: 114.1 } } };
    },
    useAppStore: { getState: () => map },
    Taro: { switchTab: async ({ url }: { url: string }) => calls.push(`tab:${url}`) },
  }) as (item: { spotId: string; submissionId: string }) => Promise<void>;
  return { action, calls, opening, openingVersion };
}

test("published record opens current public spot identity in Map", async () => {
  const { action, calls, opening } = runAction();
  await action({ spotId: "spot:published", submissionId: "submission:1" });
  assert.deepEqual(calls, ["busy:submission:1", "error:null", "query:当前正式名称", "viewport:12", "open:spot:published", "tab:/pages/map/index", "busy:null"]);
  assert.equal(opening.current, false);
});

test("published record leaves the list recoverable on failed read and ignores a changed owner", async () => {
  const failed = runAction({ fail: true });
  await failed.action({ spotId: "spot:published", submissionId: "submission:1" });
  assert.deepEqual(failed.calls, ["busy:submission:1", "error:null", "error:submission:1:false", "busy:null"]);
  const changed = runAction({ changeOwner: true });
  await changed.action({ spotId: "spot:published", submissionId: "submission:1" });
  assert.deepEqual(changed.calls, ["busy:submission:1", "error:null", "busy:null"]);
  const missing = runAction({ missing: true });
  await missing.action({ spotId: "spot:published", submissionId: "submission:1" });
  assert.deepEqual(missing.calls, ["busy:submission:1", "error:null", "error:submission:1:true", "busy:null"]);
  const cancelled = runAction();
  const pending = cancelled.action({ spotId: "spot:published", submissionId: "submission:1" });
  cancelled.openingVersion.current++;
  await pending;
  assert.deepEqual(cancelled.calls, ["busy:submission:1", "error:null"]);
});
