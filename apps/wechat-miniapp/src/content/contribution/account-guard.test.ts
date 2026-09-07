import assert from "node:assert/strict";
import test from "node:test";
import { createContributionAccountGuard } from "./account-guard";

test("feedback editor acquires its first account but rejects logout and another account", () => {
  let account: string | null = null;
  const check = createContributionAccountGuard(() => account);
  assert.throws(check, /登录状态/);
  account = "account-a";
  assert.doesNotThrow(check);
  account = null;
  assert.throws(check, /登录状态/);
  account = "account-b";
  assert.throws(check, /账号已切换/);
  account = "account-a";
  assert.doesNotThrow(check);
});

test("an editor already opened under one account cannot adopt a replacement", () => {
  let account = "account-a";
  const check = createContributionAccountGuard(() => account);
  account = "account-b";
  assert.throws(check, /账号已切换/);
});
