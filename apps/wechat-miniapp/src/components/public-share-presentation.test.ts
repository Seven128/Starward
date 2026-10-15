import assert from "node:assert/strict";
import test from "node:test";
import type { PlanPublicShareData, SourceSummary, SpotPublicShareData } from "@starward/miniapp-contracts";
import { publicShareCredits, publicSharePresentation } from "./public-share-presentation";
import { adoptedSharePosterLayout } from "./adopted-share-poster";
const source: SourceSummary = { id: "source:public", kind: "OFFICIAL_REFERENCE", provider: "资料方", title: "正式资料", sourceUrl: "https://example.com/source", license: "原许可", licenseUrl: "https://example.com/license", attribution: { name: "原作者", url: "https://example.com/author", statements: ["完整署名声明"] }, publishedAt: null, retrievedAt: null, validFrom: null, validTo: null, state: "FRESH", confidence: null, precision: "", limitations: [] };

test("plan page and poster keep departure, the complete cross-year interval, timezone and independent source records", () => {
  const input = { kind: "PLAN", spotName: "实际地点", spotRegion: "实际区域", spotStatus: "TEMPORARILY_CLOSED", spotSource: source,
    departureLocalDate: "2026-12-31", departureLocalTime: "20:30", localDate: "2026-12-31", localTime: "23:00", endLocalDate: "2027-01-01", endLocalTime: "02:15", timezone: "Asia/Tokyo",
    events: [{ displayName: "未提供完整资料的天象", kind: "SOLAR_ECLIPSE", source: null }, { displayName: "有来源的天象", source: { ...source, title: "另一份独立资料" } }], expiresAt: "2027-01-02T00:00:00Z",
    notes: "私人备注", travel: { origin: "私人住址" }, accessToken: "私人凭证" } as unknown as PlanPublicShareData;
  const model = publicSharePresentation(input), serialized = JSON.stringify(model);
  assert.equal(model.date, "2026-12-31 — 2027-01-01");
  for (const value of ["2026-12-31 20:30", "2026-12-31 23:00", "2027-01-01 02:15", "Asia/Tokyo", "资料暂不可用", "暂时关闭"]) assert.ok(serialized.includes(value));
  assert.equal(model.sources.length, 2);
  assert.ok(model.warnings.some(value => value.includes("不可裸眼或使用普通太阳镜看太阳")), "known solar risk survives a missing source");
  assert.ok(!/私人备注|私人住址|私人凭证/.test(serialized));
  const poster = adoptedSharePosterLayout(input);
  assert.ok(poster.runs.every(run => run.y < poster.height));
  const posterText = poster.runs.map(run => run.text).join("");
  for (const value of ["2027-01-01", "Asia/Tokyo", "暂时关闭", "完整署名声明", "https://example.com/license"]) assert.ok(posterText.includes(value));
  assert.ok(poster.runs.some(run => run.text.includes("（Asia/Tokyo）")), "the timezone remains a complete parenthesized token");
});

test("spot keeps separate entrance/safety, explicit missing values and original credits, without fixture disclosure", () => {
  const input = { kind: "SPOT", name: "地点", region: "区域", address: "公开地址", status: "PUBLISHED", opening: null, parking: "可用", horizon: null, access: "需预约", safety: "夜间台阶", source } as SpotPublicShareData;
  const model = publicSharePresentation(input);
  assert.deepEqual(model.warnings, ["进入：需预约", "安全：夜间台阶"]);
  assert.equal(model.facts.filter(fact => fact.value === "暂无数据").length, 2);
  assert.ok(publicShareCredits(model.sources).includes("完整署名声明"));
  assert.deepEqual(publicSharePresentation({ ...input, source: { ...source, kind: "TEST_FIXTURE" } }).sources, []);
});
