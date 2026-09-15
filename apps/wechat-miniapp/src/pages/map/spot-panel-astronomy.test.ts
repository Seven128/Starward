import assert from "node:assert/strict";
import test from "node:test";
import type { HourlySkyRow } from "@starward/miniapp-contracts";
import {
  exactSkyRow,
  formatMetric,
  windDirectionLabel,
} from "./spot-panel-astronomy";

const row = {
  at: "2026-09-12T13:00:00.000Z",
} as HourlySkyRow;

test("the panel uses only the exact selected SkyReport slice", () => {
  assert.equal(exactSkyRow([row], "2026-09-12T13:00:00Z"), row);
  assert.equal(exactSkyRow([row], "2026-09-12T13:01:00Z"), null);
  assert.equal(exactSkyRow([row], "invalid"), null);
});

test("astronomy formatting preserves measured zero and explicit unavailable values", () => {
  assert.equal(formatMetric(0, "%"), "0%");
  assert.equal(formatMetric(9.25, " km", 1), "9.3 km");
  assert.equal(formatMetric(null, "%"), "暂无数据");
  assert.equal(formatMetric(Number.NaN, "%"), "暂无数据");
});

test("wind direction wraps into the same eight named sectors", () => {
  assert.equal(windDirectionLabel(0), "北风");
  assert.equal(windDirectionLabel(45), "东北风");
  assert.equal(windDirectionLabel(-90), "西风");
  assert.equal(windDirectionLabel(360), "北风");
  assert.equal(windDirectionLabel(null), "风向");
});
