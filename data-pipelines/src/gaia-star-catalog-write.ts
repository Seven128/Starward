/** Immutable Gaia pack and manifest publication to the checked data directory. */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  buildGaiaDr3Asset,
  type BuiltGaiaDr3Asset,
} from "./gaia-star-catalog-asset.ts";
import { canonicalJson } from "../../packages/astronomy-core/src/gaia-catalog-data.ts";

export async function writeGaiaDr3Asset(
  outputDirectory: string,
  sourceBytes: Uint8Array,
  retrievedAt: string,
): Promise<BuiltGaiaDr3Asset> {
  const built = buildGaiaDr3Asset(sourceBytes, retrievedAt);
  await writeFile(
    resolve(outputDirectory, "gaia-dr3-bright-stars.v1.json"),
    built.packBytes,
  );
  await writeFile(
    resolve(outputDirectory, "gaia-dr3-bright-stars.v1.manifest.json"),
    canonicalJson(built.manifest),
    "utf8",
  );
  return built;
}
