import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = ts.createSourceFile("preferences.ts", readFileSync(new URL("./use-settings-preferences.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "useSettingsPreferences")!;
function run(revision: number, query: any, owner: string | null = "A") {
  const effects: Array<() => void> = [], applied: unknown[] = [];
  const state = { accountOwnerId: owner, preferencesRevision: revision, applyServerPreferences: (record: unknown) => applied.push(record) };
  const hook = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /u, "") + "\nuseSettingsPreferences;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    useEffect: (effect: () => void) => effects.push(effect),
    useAccountResourceQuery: () => ({ owner, query }), getPreferences() {}, currentDraftUserId: () => state.accountOwnerId,
    useAppStore: Object.assign((selector: (state: unknown) => unknown) => selector(state), { getState: () => state }),
  });
  return { presentation: hook(), effects, applied, state };
}

test("first cloud settings cannot become confirmed defaults, while failed refresh keeps known preferences editable", () => {
  const pending = run(0, { isPending: true });
  assert.equal(pending.presentation.confirmed, false); assert.equal(pending.presentation.state, "LOADING");
  const failed = run(0, { isError: true });
  assert.equal(failed.presentation.confirmed, false); assert.equal(failed.presentation.state, "ERROR");
  const stale = run(4, { refreshError: Error("offline") });
  assert.equal(stale.presentation.confirmed, true); assert.equal(stale.presentation.state, "STALE");
  const visitor = run(0, { isPending: true }, null);
  assert.equal(visitor.presentation.state, "LOCAL", "a visitor's local preferences must not wait for an implicit account");
});

test("only the still-current account may apply the readback through the existing preference merge owner", () => {
  const record = { revision: 5, preferences: { contributionStatusReminder: true } };
  const current = run(4, { data: { data: record } }); current.effects.forEach(effect => effect());
  assert.deepEqual(current.applied, [record]);
  const departed = run(4, { data: { data: record } }); departed.state.accountOwnerId = "B";
  departed.effects.forEach(effect => effect()); assert.deepEqual(departed.applied, []);
});
