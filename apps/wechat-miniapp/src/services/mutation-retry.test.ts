import assert from "node:assert/strict";
import test from "node:test";
import { createMutationRetry } from "./mutation-retry";

test("confirmed readback retires only its original runtime key, preserving a later attempt", async () => {
  let sequence = 0;
  const retry = createMutationRetry(() => `key:${++sequence}`), input = { value: "original" };
  await assert.rejects(retry("a", input, async () => { throw Error("lost response"); }));
  retry.forget("a", input, "key:1");
  await assert.rejects(retry("a", input, async key => { assert.equal(key,"key:2"); throw Error("next response lost"); }));
  retry.forget("a", input, "key:1");
  assert.equal(await retry("a",input,async key=>key),"key:2");
});

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
