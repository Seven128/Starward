import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { primaryPageNativeRuntimeForTest } from "../../navigation/primary-page-navigation-test-support";

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
  const mapPage = { route: "pages/map/index" }, recordPage = { route: "content/contribution/index" };
  const navigation = primaryPageNativeRuntimeForTest([mapPage]);
  assert.equal(navigation.showMap(mapPage), true);
  navigation.hideMap(mapPage); navigation.setStack([mapPage, recordPage]);
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
    ...navigation.dispatcher,
  }) as (item: { spotId: string; submissionId: string }) => Promise<void>;
  return { action, calls, opening, openingVersion, navigation, mapPage };
}

test("published record opens current public spot identity in Map", async () => {
  const { action, calls, opening, navigation, mapPage } = runAction();
  const pending = action({ spotId: "spot:published", submissionId: "submission:1" });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ["busy:submission:1", "error:null", "query:当前正式名称", "viewport:12", "open:spot:published"]);
  assert.equal(navigation.calls.length, 1);
  assert.equal(navigation.calls[0]?.kind, "navigateBack"); assert.equal(navigation.calls[0]?.delta, 1);
  navigation.calls[0]!.resolve(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(opening.current, true, "native acceptance alone cannot finish the published-spot handoff");
  navigation.setStack([mapPage]); assert.equal(navigation.showMap(mapPage), true);
  await pending;
  assert.deepEqual(calls, ["busy:submission:1", "error:null", "query:当前正式名称", "viewport:12", "open:spot:published", "busy:null"]);
  assert.equal(opening.current, false);
  assert.equal(navigation.dispatcher.isPagePresentationForeground(mapPage), true);
  navigation.dispose();
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
