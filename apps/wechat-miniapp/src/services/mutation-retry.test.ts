import assert from "node:assert/strict";
import test from "node:test";
import { createMutationRetry } from "./mutation-retry";

test("uncertain creates reuse a key only for the same account and content until success", async () => {
  let sequence = 0;
  const run = createMutationRetry(() => `key-${++sequence}`);
  const keys: string[] = [];
  const fail = async (key: string) => { keys.push(key); throw new Error("response lost"); };
  const succeed = async (key: string) => { keys.push(key); return "saved"; };
  await assert.rejects(run("account-a", { detail: "first" }, fail));
  await assert.rejects(run("account-a", { detail: "first" }, fail));
  await assert.rejects(run("account-b", { detail: "first" }, fail));
  await assert.rejects(run("account-a", { detail: "edited" }, fail));
  assert.equal(await run("account-a", { detail: "first" }, succeed), "saved");
  await run("account-a", { detail: "first" }, succeed);
  assert.deepEqual(keys, ["key-1", "key-1", "key-2", "key-3", "key-1", "key-4"]);
});
