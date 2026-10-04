/** Local offline packaging only. Python and HTTP clients use the same TS hash
 * and admission owner; no publication registry/default or network is changed. */
import { readFileSync } from "node:fs";
import { assertSdssScienceOpticalPublication, assertSdssScienceOpticalManifest,
  sdssScienceOpticalPublicationHash, type SdssScienceOpticalManifest } from "../../packages/miniapp-contracts/src/sdss-science-optical-publication.ts";
import { SDSS_OPTICAL_LEVELS } from "../../packages/miniapp-contracts/src/sdss-optical-publication.ts";

const publication: unknown = JSON.parse(readFileSync(0, "utf8"));
const reference = (publication as { objectRef?: string } | null)?.objectRef;
if (typeof reference !== "string") throw new Error("sdss_science_optical_reference_missing");
assertSdssScienceOpticalPublication(publication, reference);
const publicationHash = sdssScienceOpticalPublicationHash(publication);
const manifest = { ...publication, publicationHash,
  levels: Object.fromEntries(SDSS_OPTICAL_LEVELS.map(level => [level, { ...publication.levels[level],
    downloadUrl: `/v2/sky/sdss-optical/${publicationHash}/${publication.levels[level].file}` }])) } as SdssScienceOpticalManifest;
assertSdssScienceOpticalManifest(manifest, reference, publicationHash);
process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
