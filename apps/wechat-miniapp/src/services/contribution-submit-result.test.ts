import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { ContributionSubmitStorageError } from "./contribution-submit-retry";


function load(name: string, ports: Record<string, unknown>) {
  ports.contributionSubmissionTransport = { assertOwner(owner: string | undefined, scope?: { assertCurrent(): void }) {
    scope?.assertCurrent(); const current = (ports.currentDraftUserId as () => string)(); if (!current || (owner && current !== owner)) throw new Error("账号已变化"); return current;
  } };
  const file = name === "getFormalContributionSubmitResult" ? "spot-feedback" : "contribution";
  const source = ts.createSourceFile("client.ts", readFileSync(new URL(`../content/${file}/submission-result-client.ts`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const node = source.statements.find(value => ts.isFunctionDeclaration(value) && value.name?.text === name);
  assert.ok(node);
  return vm.runInNewContext(ts.transpileModule(node.getText(source).replace(/^export /u, "") + `\n${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, ports);
}

test("submission verification keeps missing receipts unknown, reads fresh current records and never mints a key or POST", async () => {
  let receipt: unknown = null, revision = 2, clears = 0;
  const calls: Array<{ operation: string; options: any }> = [];
  const verify = load("getContributionSubmitResult", {
    Taro: {}, ContributionSubmitStorageError, currentDraftUserId: () => "account:a",
    readContributionSubmitKey: () => "original:key", clearContributionSubmitIntent: () => { clears++; }, invalidateApiCache() {},
    requestOperation: async (_name: string, operation: string, options: any, _retry: boolean, owner: string) => {
      calls.push({ operation, options }); assert.equal(owner, "account:a"); assert.equal(options.cache, false);
      return operation === "contributionSubmitResultGet" ? { data: { receipt } } : { dataState: "FRESH", data: { submissions: [{ submissionId: "contribution:one", revision, submissionState: "REJECTED" }] } };
    },
  });
  assert.equal((await verify("contribution:one",1)).receipt,null); assert.equal(calls.length,1); assert.equal(clears,0);
  receipt = { submissionId: "contribution:one", revision: 3 };
  assert.equal((await verify("contribution:one",1)).current,null,"an older list cannot resolve the submitted revision"); assert.equal(clears,0);
  revision = 5; const result = await verify("contribution:one",1);
  assert.equal(result.current.revision,5); assert.equal(result.current.submissionState,"REJECTED"); assert.equal(clears,1);
  assert.ok(calls.every(call => call.operation.endsWith("Get") && call.options.body === undefined));
  assert.ok(calls.filter(call => call.operation === "contributionSubmitResultGet").every(call => call.options.idempotencyKey === "original:key"));
});

test("account replacement between a receipt and its current read cannot clear or apply the old intent", async () => {
  let owner = "account:a", calls = 0;
  const verify = load("getContributionSubmitResult", {
    Taro: {}, ContributionSubmitStorageError, currentDraftUserId: () => owner, readContributionSubmitKey: () => "original:key",
    clearContributionSubmitIntent: () => assert.fail("B cannot clear A's original identity"),
    requestOperation: async () => { calls++; owner = "account:b"; return { data: { receipt: { revision: 3 } } }; },
  });
  await assert.rejects(verify("contribution:one",1), /账号已变化/); assert.equal(calls,1);
});

test("formal conflict verification fetches today's formal baseline separately from the historical acknowledgement", async () => {
  let baselineRevision = 4;
  const calls: string[] = [];
  const receipt = { state: "CONFLICT", currentBaseline: { revision: 3, spotId: "spot:one" } };
  const verify = load("getFormalContributionSubmitResult", {
    currentDraftUserId: () => "account:a",
    requestOperation: async (_name: string, operation: string, options: any) => {
      calls.push(operation); assert.equal(options.cache,false); assert.equal(options.body,undefined);
      return operation === "formalContributionSubmitResultGet" ? { data: { receipt } } : { dataState: "FRESH", data: { spotId: "spot:one", revision: baselineRevision } };
    },
  });
  const result = await verify("spot:one","original:key","account:a");
  assert.equal(result.receipt.currentBaseline.revision,3); assert.equal(result.baseline.revision,4);
  assert.deepEqual(calls,["formalContributionSubmitResultGet","spotContributionBaselineGet"]);
  baselineRevision = 2;
  await assert.rejects(verify("spot:one","original:key","account:a"), /最新版本尚未确认/);
});
