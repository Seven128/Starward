import assert from "node:assert/strict";
import test from "node:test";
import {
  GUIDE_AUTHOR_LABELS,
  formatDisplayDate,
  localFailureMessage,
} from "./presentation.ts";

test("presentation labels are exhaustive product copy", () => {
  assert.deepEqual(GUIDE_AUTHOR_LABELS, {
    OFFICIAL: "官方",
    WHITELIST: "已认证作者",
  });
  assert.equal(formatDisplayDate("2026-08-06T23:30:00.000Z"), "2026年8月6日");
  assert.equal(formatDisplayDate("not-a-date"), "日期未知");
});

test("local failures never expose transport or internal error codes", () => {
  assert.equal(localFailureMessage("request:fail timeout"), "请求超时");
  assert.equal(localFailureMessage("wechat_login_code_missing"), "微信登录未完成");
  assert.equal(
    localFailureMessage("night_requires_formal_spot_id"),
    "请从正式观星点进入今晚夜空",
  );
  assert.equal(
    localFailureMessage("some_private_runtime_code"),
    "操作未完成，具体技术原因已记录",
  );
});
