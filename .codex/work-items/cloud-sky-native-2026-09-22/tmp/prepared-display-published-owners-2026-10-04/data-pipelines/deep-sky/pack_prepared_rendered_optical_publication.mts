/** Offline Prepared wire family. The original v1 packer remains strict. */
import { readFileSync } from "node:fs";
import { OPTICAL_IMAGE_LEVELS } from "../../packages/miniapp-contracts/src/optical-publication-content.ts";
import { assertPreparedRenderedOpticalPublication, assertPreparedRenderedOpticalManifest,
  preparedRenderedOpticalPublicationHash, type PreparedRenderedOpticalManifest } from "../../packages/miniapp-contracts/src/prepared-rendered-optical-publication.ts";

const publication: unknown = JSON.parse(readFileSync(0, "utf8"));
const reference = (publication as { objectRef?: string } | null)?.objectRef;
if (typeof reference !== "string") throw new Error("prepared_optical_reference_missing");
assertPreparedRenderedOpticalPublication(publication, reference);
const publicationHash = preparedRenderedOpticalPublicationHash(publication);
const manifest = { ...publication, publicationHash,
  levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level, { ...publication.levels[level],
    downloadUrl: `/v2/sky/prepared-optical/${publicationHash}/${publication.levels[level].file}` }])) } as PreparedRenderedOpticalManifest;
assertPreparedRenderedOpticalManifest(manifest, reference, publicationHash);
process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
