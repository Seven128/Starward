/** Offline content packaging. No source registry, HTTP route or default changes. */
import { readFileSync } from "node:fs";
import { OPTICAL_IMAGE_LEVELS } from "../../packages/miniapp-contracts/src/optical-publication-content.ts";
import { assertPreparedOpticalPublication, assertPreparedOpticalManifest,
  preparedOpticalPublicationHash, type PreparedOpticalManifest } from "../../packages/miniapp-contracts/src/prepared-optical-publication.ts";

const publication: unknown = JSON.parse(readFileSync(0, "utf8"));
const reference = (publication as { objectRef?: string } | null)?.objectRef;
if (typeof reference !== "string") throw new Error("prepared_optical_reference_missing");
assertPreparedOpticalPublication(publication, reference);
const publicationHash = preparedOpticalPublicationHash(publication);
const manifest: PreparedOpticalManifest = { ...publication, publicationHash,
  levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level, { ...publication.levels[level],
    downloadUrl: `/v2/sky/prepared-optical/${publicationHash}/${publication.levels[level].file}` }])) as PreparedOpticalManifest["levels"] };
assertPreparedOpticalManifest(manifest, reference, publicationHash);
process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
