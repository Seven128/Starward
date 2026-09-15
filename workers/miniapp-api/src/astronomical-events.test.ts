import assert from "node:assert/strict";
import test from "node:test";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("public astronomical event reads expose the reviewed catalog without inventing local visibility", async () => {
  const service = createTestMiniappService();
  try {
    const list = service.getAstronomicalEvents();
    assert.equal(list.data.coverage, "ANNUAL_METEOR_REFERENCES_AND_ECLIPSES");
    assert.ok(list.data.events.length > 0);
    assert.equal(list.data.events.filter(event => event.kind === "LUNAR_ECLIPSE").length, 2);
    assert.equal(list.data.events.filter(event => event.kind === "SOLAR_ECLIPSE").length, 2);
    const occurrence = list.data.events.find(event => event.code === "PER");
    assert.ok(occurrence);
    const detail = await service.getAstronomicalEvent(occurrence.occurrenceId);
    assert.equal(detail.data.event.occurrenceId, occurrence.occurrenceId);
    assert.equal(detail.data.localVisibility.state, "UNAVAILABLE");
    assert.match(detail.data.localVisibility.reason, /尚未选择/);
    const context = await service.resolveObservationContext({
      location: { kind: "FORMAL_SPOT", spotId: "spot:test-published" },
      localDate: occurrence.peakDate,
      targetProfile: "METEOR",
      eventInstanceId: occurrence.occurrenceId,
    });
    const projected = await service.getAstronomicalEvent(
      occurrence.occurrenceId,
      context.data.contextId,
    );
    assert.equal(projected.data.localVisibility.state, "AVAILABLE");
    assert.equal(projected.data.localVisibility.locationName, "示例观星点");
    assert.ok((projected.data.localVisibility.bestAltitudeDeg ?? 0) > 0);
    assert.equal(projected.contextRevision, context.data.revision);

    const lunar = list.data.events.find(event =>
      event.kind === "LUNAR_ECLIPSE" && event.eclipseKind === "TOTAL",
    );
    assert.ok(lunar);
    const lunarContext = await service.resolveObservationContext({
      location: { kind: "FORMAL_SPOT", spotId: "spot:test-published" },
      localDate: lunar.peakDate,
      targetProfile: "DAILY",
      eventInstanceId: lunar.occurrenceId,
    });
    const lunarDetail = await service.getAstronomicalEvent(lunar.occurrenceId, lunarContext.data.contextId);
    assert.equal(lunarDetail.data.localVisibility.state, "AVAILABLE");
    assert.ok(lunarDetail.data.localVisibility.phases?.some(phase => phase.key === "TOTAL_BEGIN"));
    assert.match(lunarDetail.data.localVisibility.reason, /几何地平线以上/);
    await assert.rejects(() => service.getAstronomicalEvent("event-occurrence:unknown:2026"), /not_found/);
  } finally {
    await service.onModuleDestroy();
  }
});
