import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { isModernEastEightTimezone } from "@starward/miniapp-contracts";

function panelTime(intl: unknown) {
  const panel = ts.createSourceFile("panel.tsx", readFileSync(new URL("./spot-panel.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = panel.statements.filter(node => ts.isFunctionDeclaration(node) && ["formatLunarEvent", "formatSourceTime"].includes(node.name?.text ?? ""));
  assert.equal(functions.length, 2);
  const zoned = ts.createSourceFile("zoned.ts", readFileSync(new URL("../../utils/zoned-date.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const source = zoned.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(zoned).replace(/^export /, "")).join("\n")
    + "\n" + functions.map(node => node.getText(panel)).join("\n") + ";({formatLunarEvent,formatSourceTime});";
  return vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { Intl: intl, isModernEastEightTimezone });
}

test("the actual lunar panel preserves a valid event's local date when the phone has no Intl", () => {
  const format = panelTime(undefined);
  assert.equal(format.formatLunarEvent("2026-10-17T04:04:22.285Z", "Asia/Shanghai", "搜索时段内无月出"), "10/17 12:04");
  assert.equal(format.formatLunarEvent("2026-10-16T13:54:27.917Z", "Asia/Shanghai", "搜索时段内无月落"), "10/16 21:54");
  assert.equal(format.formatSourceTime("2026-10-16T18:05:00Z", "Asia/Shanghai"), "10/17 02:05");
});

test("a partial phone Intl implementation uses the existing domestic timezone fallback", () => {
  const format = panelTime({ DateTimeFormat: class { format() { return "unsupported"; } } });
  assert.equal(format.formatSourceTime("2026-10-16T18:05:00Z", "Asia/Shanghai"), "10/17 02:05");
});

test("an absent lunar event remains distinct from malformed data and unsupported timezone formatting", () => {
  const format = panelTime(undefined);
  assert.equal(format.formatLunarEvent(null, "Asia/Shanghai", "搜索时段内无月出"), "搜索时段内无月出");
  assert.equal(format.formatLunarEvent("invalid", "Asia/Shanghai", "搜索时段内无月出"), "暂无数据");
  assert.equal(format.formatSourceTime(null, "Asia/Shanghai"), null);
  assert.equal(format.formatSourceTime("2026-10-16T18:05:00Z", "Europe/London"), null);
  assert.equal(panelTime(Intl).formatSourceTime("2026-10-16T18:05:00Z", "Asia/Shanghai"), "10/17 02:05");
});
