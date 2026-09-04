/** Command-line orchestration for refreshing the checked Gaia asset. */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchGaiaDr3Csv } from "./gaia-star-catalog-fetch.ts";
import { sha256 } from "./gaia-star-catalog-asset.ts";
import { writeGaiaDr3Asset } from "./gaia-star-catalog-write.ts";

export function isGaiaStarCatalogEntry(
  argvPath: string | undefined,
  moduleUrl: string,
): boolean {
  return Boolean(argvPath && resolve(argvPath) === resolve(fileURLToPath(moduleUrl)));
}

export async function runGaiaStarCatalogCli(): Promise<void> {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const outputDirectory = resolve(projectRoot, "packages/astronomy-core/data");
  const result = await fetchGaiaDr3Csv();
  const built = await writeGaiaDr3Asset(
    outputDirectory,
    result.bytes,
    result.retrievedAt,
  );
  console.log(
    JSON.stringify({
      catalogVersion: built.pack.catalogVersion,
      rowCount: built.pack.rows.length,
      derivedAssetBytes: built.packBytes.byteLength,
      derivedAssetSha256: sha256(built.packBytes),
      sourceResponseBytes: built.sourceResponseBytes,
      sourceResponseSha256: built.sourceResponseSha256,
      retrievedAt: built.manifest.retrievedAt,
    }),
  );
}
