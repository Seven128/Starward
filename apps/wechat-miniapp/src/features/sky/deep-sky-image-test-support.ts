import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { assertDeepSkyImageDiscovery, type DeepSkyImageDiscoveryData, type DeepSkyImageLevel } from "@starward/miniapp-contracts";
import assert from "node:assert/strict";

const root = new URL("../../../../../workers/miniapp-api/assets/deep-sky/", import.meta.url);
const publication = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8"));
const publicationHash = createHash("sha256").update(JSON.stringify(publication)).digest("hex");
assert.equal(publicationHash, "8b970f207d1b99b3b92e74eb68f0aa6a7ca1f7b5ac51ad86e9d0c6e239540054");

/** Real existing publication/bytes; simplified source prose is a test fixture. */
export function publishedDeepSkyDiscovery(reference = "M:42"): DeepSkyImageDiscoveryData {
  const entry = publication.entries.find((value: { objectRef: string }) => value.objectRef === reference);
  assert(entry);
  const sourceId = `imagery:${publication.publicationId}:${publicationHash}`;
  const data = { schemaVersion: "allwise-w3-selected-image-discovery-v1", imageVersion: "source-finite-v3",
    publicationHash, publicationId: publication.publicationId, sourceId, objectRef: reference,
    center: entry.center, orientation: entry.orientation,
    source: { id: sourceId, kind: "OPEN_DATA", provider: publication.source.provider,
      title: "AllWISE W3 12 µm", sourceUrl: publication.source.landingUrl,
      license: "ODbL-1.0", licenseUrl: publication.source.hipsLicenseUrl,
      publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
      state: "FRESH", confidence: null, precision: "test fixture", limitations: [publication.source.acknowledgment] },
    levels: Object.fromEntries(Object.entries(entry.levels).map(([level, value]) => {
      const asset = value as any;
      return [level, { ...asset, downloadUrl: `/v2/sky/deep-sky/${publicationHash}/${asset.file}`,
        format: asset.imageFormat === "png" ? "png" : "jpeg", width: asset.pixels, height: asset.pixels,
        validFraction: null, coverageState: "NOT_MEASURED" }];
    })),
  };
  assertDeepSkyImageDiscovery(data, reference);
  return structuredClone(data);
}
export function publishedDeepSkyBytes(data: DeepSkyImageDiscoveryData, level: DeepSkyImageLevel): ArrayBuffer {
  const asset = data.levels[level], bytes = readFileSync(new URL(asset.file, root));
  assert.equal(bytes.length, asset.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  return Uint8Array.from(bytes).buffer;
}
