import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { assertPreparedOpticalManifest, type PreparedOpticalManifest } from "@starward/miniapp-contracts";
import { createSyntheticPreparedOpticalPublication } from "../../../../../workers/miniapp-api/src/test-fixtures/prepared-optical-publication.ts";

/** Portable transport structure by default. The bounded execution supplies the
 * existing real writer; neither mode certifies rendered/native image quality. */
export function preparedOpticalTestPublication(purpose: string) {
  assert.match(purpose, /^[a-z-]+$/u);
  const supplied = process.env.CLOUD_SKY_PREPARED_PUBLICATION_PATH;
  const prefix = `starward-prepared-${purpose}-`;
  const generated = supplied ? undefined : mkdtempSync(join(tmpdir(), prefix));
  const structural = generated ? createSyntheticPreparedOpticalPublication(generated) : undefined;
  const raw = JSON.parse(readFileSync(join(supplied ?? generated!, "manifest.json"), "utf8"));
  const publication: PreparedOpticalManifest = supplied ? raw : { ...raw, publicationHash: structural!.expectedHash,
    levels: Object.fromEntries(Object.entries(raw.levels).map(([level, asset]) => [level, { ...(asset as object),
      downloadUrl: `/v2/sky/prepared-optical/${structural!.expectedHash}/${(asset as any).file}` }])) };
  assertPreparedOpticalManifest(publication, "M:51", publication.publicationHash);
  const freeze = (value: unknown): void => {
    if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  };
  freeze(publication);
  return { publication, cleanup() {
    if (!generated) return;
    assert.equal(dirname(realpathSync(generated)), realpathSync(tmpdir()));
    assert(basename(generated).startsWith(prefix));
    rmSync(generated, { recursive: true }); // Verified owned, regeneratable fixture only.
  } };
}
