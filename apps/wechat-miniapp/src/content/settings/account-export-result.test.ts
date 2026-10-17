import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createAccountExportCleanup } from "./account-export-cleanup";

// Execute the actual native filesystem adapters and busy projection in the hook.
const source = ts.createSourceFile("export.ts", readFileSync(new URL("./use-account-export.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const cleanupDeclaration = source.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(source) === "exportFiles"))!.getText(source);
const hook = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "useAccountExport")!;
function harness(errMsg = "") {
  let ports: any; const writes: any[] = [], busy: boolean[] = [];
  const run = vm.runInNewContext(ts.transpileModule(cleanupDeclaration + "\n" + hook.getText(source).replace(/^export /u, "") + "\nuseAccountExport;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    useState: (value: unknown) => [value, () => {}], useRef: (value: unknown) => ({ current: value }), useEffect() {},
    createAccountExportCleanup,
    useAccountOperation: () => ({ begin() {} }), createAccountExport: (value: unknown) => { ports = value; return {}; },
    currentDraftUserId: () => "synthetic:A", exportAccountData() {}, idempotencyKey: () => "export:synthetic:1", errorMessage: () => "failure",
    Taro: { env: { USER_DATA_PATH: "/isolated" }, getFileSystemManager: () => ({
      unlink: ({ success, fail }: any) => errMsg ? fail({ errMsg }) : success(),
      writeFile: (input: any) => { writes.push(input); input.success(); },
    }) },
  });
  run((value: boolean) => busy.push(value));
  return { ports, writes, busy };
}

test("the real native remove adapter accepts only an absent file as completed cleanup", async () => {
  await assert.doesNotReject(harness("unlink:fail ENOENT: no such file").ports.files.remove("/isolated/account.json"));
  assert.equal(await harness("unlink:fail permission denied").ports.files.remove("/isolated/account.json"), false);
});

test("the native adapter writes UTF-8 JSON only to the current unique private destination", async () => {
  const h = harness(); const destination = h.ports.destination("2026-10-15T00:00:00.000Z");
  await h.ports.write(destination.filePath, '{"account":{"userId":"synthetic:A"}}');
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].filePath, destination.filePath);
  assert.equal(h.writes[0].encoding, "utf8"); assert.equal(JSON.parse(h.writes[0].data).account.userId, "synthetic:A");
});

test("an idle export hook never releases another pending account action's lock", () => {
  const h = harness(); h.ports.changed({ phase: "IDLE" }); h.ports.changed({ phase: "IDLE" });
  assert.deepEqual(h.busy, []);
  h.ports.changed({ phase: "PREPARING" }); h.ports.changed({ phase: "READY" }); h.ports.changed({ phase: "IDLE" });
  assert.deepEqual(h.busy, [true, false]);
});
