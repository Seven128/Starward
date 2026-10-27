import assert from "node:assert/strict";
import test from "node:test";
import type { SpotSummary } from "@starward/miniapp-contracts";
import { createMapMarkerPresentation, markerGroups, markerItems } from "./map-markers.ts";

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
  const marker = markerItems(groups, "a", "DAY")[0]!;
  assert.equal("label" in marker, false);
});

test("a clustered marker retains every spot and selects when any member is selected", () => {
  const spots = [spot("a", 22.61, 114.51), spot("b", 22.63, 114.53)];
  const groups = markerGroups(spots, 7);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0]!.spots, spots);
  assert.ok(Math.abs(groups[0]!.latitude - 22.62) < 1e-10);
  const marker = markerItems(groups, "b", "OBSERVATION")[0]!;
  assert.equal(marker.iconPath, "/assets/icons/formal-spot-marker-selected-observation.png");
  assert.ok(marker.label);
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
    assert.ok(regular.label);
    assert.ok(large.label);
    assert.equal(regular.label.fontSize, 18);
    assert.equal(large.label.fontSize, 36);
    assert.equal(large.callout!.fontSize, 24);
    assert.equal(large.id, regular.id);
    assert.equal(large.latitude, regular.latitude);
    assert.equal(large.iconPath, regular.iconPath);
  }
  const red = markerItems(groups, "b", "OBSERVATION")[0]!;
  assert.ok(red.label);
  assert.equal(red.label.color.toLowerCase(), "#ff6b58");
  assert.equal(red.label.bgColor.toLowerCase(), "#190000");
});

test("viewport refresh keeps confirmed native markers without adopting old Scene evaluations", () => {
  const owner = createMapMarkerPresentation();
  const input = { scope: "account:filters:time", denied: false, zoom: 12, selectedSpotId: null, mode: "DAY" as const, largeText: false };
  const initial = owner.present({ ...input, spots: [spot("a", 22.61, 114.51), spot("b", 22.62, 114.52)] });
  const pending = owner.present(input);
  assert.equal(pending.hasConfirmed, true);
  assert.equal(pending.retained, true);
  assert.equal(pending.markers, initial.markers, "the native Map does not receive an empty replacement during refresh");
  assert.deepEqual(Object.keys(pending).sort(), ["groups", "hasConfirmed", "markers", "retained"], "retention supplies no old time/evaluation envelope");
  const reordered = owner.present({ ...input, zoom: 12.25, spots: [spot("b", 22.62, 114.52), spot("a", 22.61, 114.51)] });
  assert.equal(reordered.markers, initial.markers, "server ordering/fractional zoom cannot replace unchanged native images");
  assert.equal(reordered.retained, false);
  const added = owner.present({ ...input, spots: [spot("c", 22.63, 114.53), spot("b", 22.62, 114.52)] });
  assert.equal(added.groups.find(group => group.spots[0]!.spotId === "b")!.id, initial.groups[1]!.id);
  assert.equal(new Set(added.markers.map(marker => marker.id)).size, added.markers.length);
  const empty = owner.present({ ...input, spots: [] });
  assert.equal(empty.hasConfirmed, true);
  assert.equal(empty.markers.length, 0, "a genuinely empty new result retires old markers");
});

test("marker retention retires on account/filter/time/reset scope or denied access", () => {
  const owner = createMapMarkerPresentation();
  const input = { scope: "one", denied: false, zoom: 12, selectedSpotId: null, mode: "DAY" as const, largeText: false };
  for (const scope of ["account:two", "filters:two", "time:two", "reset:two"]) {
    owner.present({ ...input, spots: [spot("a", 22.61, 114.51)] });
    const retired = owner.present({ ...input, scope });
    assert.equal(retired.markers.length, 0); assert.equal(retired.hasConfirmed, false);
  }
  const confirmed = [spot("a", 22.61, 114.51)];
  owner.present({ ...input, spots: confirmed });
  const denied = owner.present({ ...input, denied: true, spots: confirmed });
  assert.equal(denied.markers.length, 0); assert.equal(denied.hasConfirmed, false);
  assert.equal(owner.present(input).markers.length, 0, "old summaries cannot return merely because the error clears");
  const current = owner.present({ ...input, spots: [spot("a", 23, 115)] });
  assert.equal(current.markers[0]!.latitude, 23); assert.equal(current.markers[0]!.longitude, 115);
});
