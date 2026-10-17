import assert from "node:assert/strict";
import test from "node:test";
import { assertPreparedOpticalDiscovery, selectedPreparedOpticalPublication, type PreparedOpticalDiscovery } from "./prepared-optical-discovery.ts";

test("current selections retain exact family/reference/edition and distinguish an empty adopted set", () => {
  const discovery: PreparedOpticalDiscovery = { schemaVersion: "prepared-optical-discovery-v1", publications: [
    { kind: "prepared-optical-v2", reference: "M:51", publicationHash: "a".repeat(64) },
    { kind: "prepared-native-optical-v1", reference: "NGC:253", publicationHash: "b".repeat(64) },
    { kind: "prepared-derived-region-optical-v1", reference: "REGION:field", publicationHash: "c".repeat(64) },
  ] };
  assertPreparedOpticalDiscovery(discovery);
  for (const selection of discovery.publications)
    assert.equal(selectedPreparedOpticalPublication(discovery, selection.reference), selection);
  assert.equal(selectedPreparedOpticalPublication(discovery, "M:82"), undefined);
  assert.equal(selectedPreparedOpticalPublication(discovery, null), undefined);
  assertPreparedOpticalDiscovery({ schemaVersion: discovery.schemaVersion, publications: [] });
  assert.equal(selectedPreparedOpticalPublication(undefined, "M:51"), undefined);
});

test("malformed or competing current declarations cannot create a discovery capability", () => {
  const item = { kind: "prepared-native-optical-v1", reference: "REGION:field", publicationHash: "a".repeat(64) };
  const wrap = (publications: unknown) => ({ schemaVersion: "prepared-optical-discovery-v1", publications });
  for (const input of [null, {}, wrap(null), wrap([null]), { ...wrap([]), schemaVersion: "unknown" },
    wrap([{ ...item, reference: "REGION:../escape" }]), wrap([{ ...item, publicationHash: "A".repeat(64) }]),
    wrap([{ ...item, kind: "sdss-legacy" }]), wrap([{ ...item, kind: "prepared-optical-v1" }]),
    wrap([{ ...item, tan: {} }]),
    wrap([item, { ...item, publicationHash: "b".repeat(64) }]), wrap([item, { ...item, reference: "M:51" }])])
    assert.throws(() => assertPreparedOpticalDiscovery(input), /discovery_invalid/u);
});
