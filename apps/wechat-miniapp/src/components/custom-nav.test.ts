import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function navigation(
  stack: () => unknown[],
  back: () => Promise<void>,
  tab: (options: { url: string }) => Promise<void>,
  beforeBack?: () => boolean | Promise<boolean>,
  onBackAuthorized: () => void | Promise<void> = () => undefined,
  onBackFailure: () => void | Promise<void> = () => undefined,
) {
  const source = ts.createSourceFile("nav.tsx", readFileSync(new URL("./custom-nav.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "goBack") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  const busy = { current: false }, errors: boolean[] = [];
  const goBack = vm.runInNewContext(ts.transpileModule(declaration + "\ngoBack;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    navigationBusy: busy, setBackError: (value: boolean) => errors.push(value),
    backFallbackTab: "/pages/my/index",
    Taro: { getCurrentPages: stack, navigateBack: back, switchTab: tab }, beforeBack, onBackAuthorized, onBackFailure,
  }) as () => Promise<void>;
  return { goBack, busy, errors };
}

test("back success preserves the actual previous page rather than switching tabs", async () => {
  let backs = 0, tabs = 0;
  const nav = navigation(() => [{}, {}], async () => { backs++; }, async () => { tabs++; });
  await nav.goBack();
  assert.equal(backs, 1);
  assert.equal(tabs, 0);
  assert.deepEqual(nav.errors, [false]);
});

test("a declined editor back guard retains the route and releases the navigation lock", async () => {
  let allowed = false, backs = 0;
  const nav = navigation(() => [{}, {}], async () => { backs++; }, async () => assert.fail("unexpected fallback"), () => allowed);
  await nav.goBack();
  assert.equal(backs, 0);
  allowed = true;
  await nav.goBack();
  assert.equal(backs, 1);
});

test("missing or unreadable stack returns to the configured tab", async () => {
  for (const stack of [() => [{}], () => { throw new Error("unavailable"); }]) {
    const urls: string[] = [];
    const nav = navigation(stack, async () => { assert.fail("no proven back target"); }, async ({ url }) => { urls.push(url); });
    await nav.goBack();
    assert.deepEqual(urls, ["/pages/my/index"]);
    assert.deepEqual(nav.errors, [false]);
  }
});

test("both navigation failures are visible and permit a successful retry", async () => {
  let failed = true, authorized = 0, restored = 0;
  const nav = navigation(
    () => [{}, {}],
    async () => { throw new Error("back failed"); },
    async () => { if (failed) throw new Error("tab failed"); },
    undefined,
    () => { authorized++; },
    () => { restored++; },
  );
  await nav.goBack();
  assert.deepEqual(nav.errors, [false, true]);
  assert.equal(authorized, 1);
  assert.equal(restored, 1);
  assert.equal(nav.busy.current, false);
  failed = false;
  await nav.goBack();
  assert.deepEqual(nav.errors, [false, true, false]);
  assert.equal(authorized, 2);
  assert.equal(restored, 1);
});

test("rapid repeated activation does not pop a second page", async () => {
  let resolve!: () => void, calls = 0;
  const pending = new Promise<void>((done) => { resolve = done; });
  const nav = navigation(() => [{}, {}], () => { calls++; return pending; }, async () => { assert.fail("unexpected fallback"); });
  const first = nav.goBack();
  await nav.goBack();
  assert.equal(calls, 1);
  resolve();
  await first;
  assert.equal(nav.busy.current, false);
});
