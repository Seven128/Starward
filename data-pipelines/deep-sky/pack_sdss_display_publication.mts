/** Offline explicit display generation only; no registry, HTTP or adoption. */
import { readFileSync } from "node:fs";
import { OPTICAL_IMAGE_LEVELS } from "../../packages/miniapp-contracts/src/optical-publication-content.ts";
import { assertSdssDisplayOpticalPublication, assertSdssDisplayOpticalManifest,
  sdssDisplayOpticalPublicationHash, type SdssDisplayOpticalManifest } from "../../packages/miniapp-contracts/src/sdss-display-optical-publication.ts";

const value: unknown = JSON.parse(readFileSync(0, "utf8"));
const reference = (value as { objectRef?: unknown } | null)?.objectRef;
if (typeof reference !== "string") throw new Error("sdss_display_reference_missing");
assertSdssDisplayOpticalPublication(value, reference);
const publicationHash = sdssDisplayOpticalPublicationHash(value);
const manifest = { ...value, publicationHash,
  levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level, { ...value.levels[level],
    downloadUrl: `/v2/sky/sdss-optical/${publicationHash}/${value.levels[level].file}` }])) } as SdssDisplayOpticalManifest;
assertSdssDisplayOpticalManifest(manifest, reference, publicationHash);
process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
