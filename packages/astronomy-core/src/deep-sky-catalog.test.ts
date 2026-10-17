import assert from "node:assert/strict";
import test from "node:test";
import { deepSkyRowByReference, loadDeepSkyCatalog, positionDeepSkyCatalog } from "./deep-sky-catalog.ts";

test("the image supply batch resolves all native identities without changing retained catalog generations", () => {
  const retained = loadDeepSkyCatalog("opengc-deep-sky.v20260501-extended-v1");
  assert.equal(retained.rows.length, 52);
  assert.equal(retained.catalogHash, "d57828454c7dfd2d1e2a6fe7570aa52b1366ab79374c4b2c461de768e361c849");
  for (const reference of ["NGC:246", "NGC:300", "NGC:1232", "NGC:2359", "NGC:6744", "NGC:7293"]) {
    assert(deepSkyRowByReference(reference), reference);
    assert(!retained.rows.some(row => row.objectRef === reference));
  }
});

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

