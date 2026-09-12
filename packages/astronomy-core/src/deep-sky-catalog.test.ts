import assert from "node:assert/strict";
import test from "node:test";
import { deepSkyRowByReference, loadDeepSkyCatalog, positionDeepSkyCatalog } from "./deep-sky-catalog.ts";

test("OpenNGC Messier pack is exact, stable and keeps galaxy and nebula identities", () => {
  const catalog = loadDeepSkyCatalog();
  assert.equal(catalog.rows.length, 51);
  assert.equal(deepSkyRowByReference("M:31")?.kind, "GALAXY");
  assert.equal(deepSkyRowByReference("M:42")?.kind, "NEBULA");
  assert.equal(new Set(catalog.rows.map((row) => row.objectRef)).size, 51);
});

test("fixed J2000 deep-sky coordinates project for the exact observer instant", () => {
  const rows = positionDeepSkyCatalog({
    at: "2026-09-12T13:00:00.000Z", latitude: 22.6, longitude: 114.5, elevationM: 30,
  });
  assert.equal(rows.length, 51);
  const m31 = rows.find((row) => row.objectRef === "M:31");
  assert.ok(m31);
  assert.ok(Number.isFinite(m31.azimuthDeg));
  assert.ok(m31.altitudeDeg >= -90 && m31.altitudeDeg <= 90);
  assert.equal(m31.visible, m31.altitudeDeg > 0);
});

