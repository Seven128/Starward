import assert from "node:assert/strict";
import test from "node:test";
import type { SpotSummary } from "@starward/miniapp-contracts";
import { markerGroups, markerItems } from "./map-markers.ts";

const spot = (id: string, latitude: number, longitude: number) => ({
  spotId: id, name: id, gcj02: { latitude, longitude },
}) as SpotSummary;

test("zoomed-in markers preserve formal spot identity and supplied GCJ coordinates", () => {
  const spots = [spot("a", 22.61, 114.51), spot("b", 22.62, 114.52)];
  const groups = markerGroups(spots, 9);
  assert.equal(groups.length, 2);
  assert.equal(groups[0]!.spots[0], spots[0]);
  assert.equal(groups[1]!.latitude, 22.62);
  assert.equal(groups[1]!.longitude, 114.52);
  assert.deepEqual(groups.map((group) => group.id), [1, 2]);
});

test("a clustered marker retains every spot and selects when any member is selected", () => {
  const spots = [spot("a", 22.61, 114.51), spot("b", 22.63, 114.53)];
  const groups = markerGroups(spots, 7);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0]!.spots, spots);
  assert.ok(Math.abs(groups[0]!.latitude - 22.62) < 1e-10);
  const marker = markerItems(groups, "b", "OBSERVATION")[0]!;
  assert.equal(marker.iconPath, "/assets/icons/spot-marker-selected-observation.png");
  assert.equal(marker.label.content, "2");
  assert.match(marker.callout!.content, /2 个正式观星点/);
  assert.match(marker.ariaLabel, /聚合标记/);
  assert.deepEqual(markerItems([], null, "DAY"), []);
});

test("native labels retain readable data type and respond to the shared 200% preference", () => {
  const groups = markerGroups([spot("a", 22.61, 114.51), spot("b", 22.63, 114.53)], 7);
  for (const mode of ["DAY", "NIGHT", "OBSERVATION"] as const) {
    const regular = markerItems(groups, "b", mode)[0]!;
    const large = markerItems(groups, "b", mode, true)[0]!;
    assert.equal(regular.label.fontSize, 18);
    assert.equal(large.label.fontSize, 36);
    assert.equal(large.callout!.fontSize, 24);
    assert.equal(large.id, regular.id);
    assert.equal(large.latitude, regular.latitude);
    assert.equal(large.iconPath, regular.iconPath);
  }
  const red = markerItems(groups, "b", "OBSERVATION")[0]!;
  assert.equal(red.label.color.toLowerCase(), "#ff6b58");
  assert.equal(red.label.bgColor.toLowerCase(), "#190000");
});
