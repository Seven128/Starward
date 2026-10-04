/** Transport fixture only; the offline writer verifies real processing pixels. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { preparedDisplayOpticalPublicationHash } from "@starward/miniapp-contracts";
import { preparedDisplayOpticalFixture } from "../../../../packages/miniapp-contracts/src/test-fixtures/prepared-display-optical-publication.ts";
import { createSyntheticPreparedOpticalPublication } from "./prepared-optical-publication.ts";

export function createSyntheticPreparedDisplayOpticalPublication(directory: string) {
  const raw = createSyntheticPreparedOpticalPublication(directory);
  const value = preparedDisplayOpticalFixture(raw.value);
  const manifestUrl = pathToFileURL(join(directory, "display-manifest.json"));
  const save = () => {
    writeFileSync(manifestUrl, JSON.stringify(value));
    return preparedDisplayOpticalPublicationHash(value);
  };
  const expectedHash = save();
  return { value, manifestUrl, expectedHash, save };
}
