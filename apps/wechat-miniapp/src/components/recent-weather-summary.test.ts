import assert from "node:assert/strict";
import test from "node:test";
import { recentWeatherFacts, recentWeatherImplications } from "./recent-weather-summary";
const day = { localDate: "2026-09-13", precipitationMm: 0, temperatureMinC: 10, temperatureMaxC: 18, sampledWindMaxKph: null, sampledWindHours: 0, conditions: [] };
test("known zero and unknown fields have different factual output, with no inferred safe/dry state", () => {
  assert.ok(recentWeatherFacts(day).includes("降水 0 mm"));
  assert.ok(!recentWeatherFacts({ ...day, precipitationMm: null }).some(text => text.includes("降水")));
  assert.deepEqual(recentWeatherImplications([day]), []);
  assert.deepEqual(recentWeatherImplications([{ ...day, precipitationMm: null, temperatureMinC: null }]), []);
});
test("rainfall and freezing temperatures produce only conditional relevance, once each", () => {
  const messages = recentWeatherImplications([{ ...day, precipitationMm: 4, temperatureMinC: -1 }, { ...day, precipitationMm: 12, temperatureMinC: 0 }]);
  assert.equal(messages.length, 2);
  assert.ok(messages.every(message => message.includes("可能")));
  assert.ok(messages[0]!.includes("现场确认"));
  assert.ok(messages[1]!.includes("不代表现场已经结冰"));
});
