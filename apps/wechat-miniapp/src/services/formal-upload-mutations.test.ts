import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createMutationRetry } from "./mutation-retry";

const operations = [
  ["createFormalUploadIntent", [{ spotId: "spot:test", baselineRevision: 1 }]],
  ["createFormalContributionUpload", ["intent:one", { kind: "site", originalName: "image.png", mimeType: "image/png", byteSize: 16, expectedRevision: 1 }]],
  ["completeFormalContributionUpload", ["intent:one", "upload:one", { dataBase64: "Zm9ybWFsLWltYWdl" }]],
  ["removeFormalContributionUpload", ["intent:one", "upload:one", 2]],
] as const;
const names = new Set<string>(operations.map(([name]) => name));

function productionFunctions(url: URL, includeOwner: boolean) {
  const source = ts.createSourceFile("mutations.ts", readFileSync(url, "utf8"), ts.ScriptTarget.Latest, true);
  const selected = source.statements.filter(node =>
    (ts.isFunctionDeclaration(node) && node.name && (names.has(node.name.text) || (includeOwner && node.name.text === "ownedFormalUpload"))) ||
    (includeOwner && ts.isVariableStatement(node) && node.declarationList.declarations.some(value => value.name.getText(source) === "retryFormalUpload")));
  assert.equal(selected.filter(node => ts.isFunctionDeclaration(node) && node.name && names.has(node.name.text)).length, 4);
  const code = selected.map(node => node.getText(source).replace(/^export /u, "")).join("\n") + "\n({ createFormalUploadIntent, createFormalContributionUpload, completeFormalContributionUpload, removeFormalContributionUpload });";
  return ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}

const clientCode = productionFunctions(new URL("../content/spot-feedback/formal-feedback-mutations.ts", import.meta.url), true);
const transportCode = productionFunctions(new URL("./api-client.ts", import.meta.url), false);

for (const [name, args] of operations) {
  test(`${name} keeps its account and key for an uncertain receipt`, async () => {
    let owner = "account:a";
    let serial = 0;
    let attempts = 0;
    const requests: { key: string; owner: string }[] = [];
    const receipt = { data: { intentId: "intent:one", revision: 2, uploads: [] } };
    const send = async (...values: unknown[]) => {
      requests.push({ key: values.at(-2) as string, owner: values.at(-1) as string });
      if (++attempts === 1) throw new Error("receipt unknown");
      return receipt;
    };
    const api = vm.runInNewContext(clientCode, {
      createMutationRetry, idempotencyKey: () => `key:${++serial}`,
      ensureContributionOwner: async () => owner, currentDraftUserId: () => owner,
      sendIntent: send, sendSession: send, sendCompleted: send, sendRemoval: send,
    }) as Record<typeof name, (...input: readonly unknown[]) => Promise<typeof receipt>>;
    await assert.rejects(api[name](...args), /receipt unknown/);
    assert.equal(await api[name](...args), receipt);
    assert.equal(requests[1]?.key, requests[0]?.key);
    assert.equal(requests[1]?.owner, "account:a");
    owner = "account:b";
    await api[name](...args);
    assert.notEqual(requests[2]?.key, requests[1]?.key);
    assert.equal(requests[2]?.owner, "account:b");
  });

  test(`${name} forwards the owner and retry key to the authenticated requester`, async () => {
    const requests: { key: string | undefined; owner: string | undefined }[] = [];
    const api = vm.runInNewContext(transportCode, {
      requestOperation: async (_key: string, _operation: string, options: { idempotencyKey?: string }, _retry: boolean, owner: string) => {
        requests.push({ key: options.idempotencyKey, owner });
        return { data: {} };
      },
    }) as Record<typeof name, (...input: readonly unknown[]) => Promise<unknown>>;
    await api[name](...args, "key:bound", "account:a");
    assert.deepEqual(requests, [{ key: "key:bound", owner: "account:a" }]);
  });
}

test("a formal media receipt cannot be applied after account switch", async () => {
  let owner = "account:a";
  const api = vm.runInNewContext(clientCode, {
    createMutationRetry, idempotencyKey: () => "key:one",
    ensureContributionOwner: async () => "account:a", currentDraftUserId: () => owner,
    sendIntent: async () => { owner = "account:b"; return { data: { intentId: "intent:one" } }; },
  }) as { createFormalUploadIntent: (input: unknown) => Promise<unknown> };
  await assert.rejects(api.createFormalUploadIntent({ spotId: "spot:test", baselineRevision: 1 }), /账号已变化/);
});
