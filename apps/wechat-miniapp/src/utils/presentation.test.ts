import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { calendarDateInTimezone } from "./zoned-date";
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

test("protocol dates follow the requested IANA calendar across midnight and DST", () => {
  for (const [instant, timezone, expected] of [
    ["2026-08-28T15:59:59Z", "Asia/Shanghai", "2026-08-28"],
    ["2026-08-28T16:00:00Z", "Asia/Shanghai", "2026-08-29"],
    ["2026-08-28T16:00:00Z", "Asia/Hong_Kong", "2026-08-29"],
    ["2024-02-29T16:00:00Z", "Asia/Shanghai", "2024-03-01"],
    // IANA PRC rules include summer time in 1991; this is not a fixed UTC+8 date.
    ["1991-08-31T15:30:00Z", "Asia/Shanghai", "1991-09-01"],
    ["2026-08-28T17:00:00Z", "Europe/London", "2026-08-28"],
    ["2026-08-28T23:30:00Z", "Europe/London", "2026-08-29"],
    ["2026-12-28T23:30:00Z", "Europe/London", "2026-12-28"],
  ] as const) assert.equal(calendarDateInTimezone(new Date(instant), timezone), expected);
  assert.throws(() => calendarDateInTimezone(new Date(NaN), "Asia/Shanghai"), RangeError);
  assert.throws(() => calendarDateInTimezone(new Date(), "not/a-timezone"), RangeError);
});

function zonedDateWithFormatter(DateTimeFormat: unknown) {
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(ts.transpileModule(
    readFileSync(new URL("./zoned-date.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
  ).outputText, { exports, Intl: { DateTimeFormat } }, { timeout: 1000 });
  return exports.calendarDateInTimezone as typeof calendarDateInTimezone;
}

test("locale ordering cannot corrupt Map and Plan protocol dates", () => {
  const instant = "2026-08-28T17:00:00Z";
  const displayLocale = "en-US";
  assert.equal(/^\d{4}-\d{2}-\d{2}$/u.test(new Intl.DateTimeFormat(displayLocale).format(new Date(instant))), false);
  const serialize = zonedDateWithFormatter(function (_locale: string, options: Intl.DateTimeFormatOptions) {
    assert.equal(options.calendar, "gregory");
    assert.equal(options.numberingSystem, "latn");
    return new Intl.DateTimeFormat(displayLocale, options);
  });
  for (const [path, name] of [
    ["../pages/map/index.tsx", "localDateForNow"],
    ["../content/plan/detail/index.tsx", "today"],
  ]) {
    const source = ts.createSourceFile(path!, readFileSync(new URL(path!, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const fn = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(fn, `${name} production entry must exist`);
    const invoke = vm.runInNewContext(ts.transpileModule(fn.getText(source) + `\n${name};`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText, { calendarDateInTimezone: serialize, Date: class extends Date { constructor() { super(instant); } } }, { timeout: 1000 });
    assert.equal(invoke("Asia/Shanghai"), "2026-08-29");
    assert.equal(invoke("Europe/London"), "2026-08-28");
  }
});

test("missing or nonnumeric date parts fail instead of submitting an invalid calendar date", () => {
  for (const parts of [[], [{ type: "year", value: "٢٠٢٦" }],
    [{ type: "year", value: "2026" }, { type: "month", value: "13" }, { type: "day", value: "1" }]]) {
    const serialize = zonedDateWithFormatter(function () { return { formatToParts: () => parts }; });
    assert.throws(() => serialize(new Date(), "Asia/Shanghai"), /calendar_date_parts_unavailable/u);
  }
});
