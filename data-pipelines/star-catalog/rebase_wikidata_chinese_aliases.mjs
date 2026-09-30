/** Rebind the exact-HR CC0 labels after the BSC v2→v3 Acrux name correction.
 * Existing label rows and the pinned Wikidata snapshot remain unchanged.
 */
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export async function rebaseChineseAliases(sourceDirectory, oldBasePath, newBasePath, outputDirectory) {
  const [packBytes, manifestBytes, oldBaseBytes, newBaseBytes, newBaseManifestBytes] = await Promise.all([
    readFile(path.join(sourceDirectory, 'chinese-bright-star-aliases.v1.json')),
    readFile(path.join(sourceDirectory, 'publication.json')),
    readFile(oldBasePath), readFile(newBasePath),
    readFile(newBasePath.replace(/\.json$/u, '.manifest.json')),
  ]);
  const pack = JSON.parse(packBytes), manifest = JSON.parse(manifestBytes);
  const oldBase = JSON.parse(oldBaseBytes), newBase = JSON.parse(newBaseBytes);
  const newBaseManifest = JSON.parse(newBaseManifestBytes);
  if (pack.catalogVersion !== 'wikidata-bsc5p-chinese-aliases.v1' ||
      pack.schemaVersion !== 'wikidata-bsc5p-chinese-aliases-v1' ||
      manifest.catalogVersion !== pack.catalogVersion ||
      manifest.assetSha256 !== sha(packBytes) ||
      !packBytes.equals(Buffer.from(`${JSON.stringify(pack)}\n`)) ||
      pack.baseCatalogVersion !== oldBase.catalogVersion ||
      pack.baseCatalogHash !== sha(oldBaseBytes) ||
      pack.sourceSha256 !== manifest.sourceSha256 ||
      !Array.isArray(pack.rows) || pack.rows.length !== 3149 || manifest.rowCount !== pack.rows.length ||
      manifest.license !== 'CC0 1.0') throw Error('chinese_alias_rebase_source_invalid');
  if (oldBase.catalogVersion !== 'bsc5p-bright-stars.v2' ||
      newBase.catalogVersion !== 'bsc5p-bright-stars.v3' ||
      newBaseManifest.catalogVersion !== newBase.catalogVersion ||
      newBaseManifest.derivedAssetSha256 !== sha(newBaseBytes) ||
      newBaseManifest.derivation?.basePublication?.assetSha256 !== sha(oldBaseBytes) ||
      oldBase.rows?.length !== 8404 || newBase.rows?.length !== oldBase.rows.length ||
      !newBaseBytes.equals(Buffer.from(JSON.stringify(newBase))))
    throw Error('chinese_alias_rebase_base_invalid');
  const normalized = structuredClone(newBase);
  normalized.catalogVersion = oldBase.catalogVersion;
  const acrux = normalized.rows.find(row => row.sourceId === 'HR:4730');
  if (acrux?.properName !== 'Acrux') throw Error('chinese_alias_rebase_acrux_identity_invalid');
  acrux.properName = null;
  if (!isDeepStrictEqual(normalized, oldBase)) throw Error('chinese_alias_rebase_base_change_exceeds_name');
  const validReferences = new Set(newBase.rows.map(row => row.sourceId));
  if (pack.rows.some(row => !validReferences.has(row.reference))) throw Error('chinese_alias_rebase_reference_missing');
  pack.catalogVersion = 'wikidata-bsc5p-chinese-aliases.v2';
  pack.baseCatalogVersion = newBase.catalogVersion;
  pack.baseCatalogHash = sha(newBaseBytes);
  const outputBytes = Buffer.from(`${JSON.stringify(pack)}\n`);
  manifest.catalogVersion = pack.catalogVersion;
  manifest.assetSha256 = sha(outputBytes);
  manifest.baseRebinding = { previousCatalogVersion: 'wikidata-bsc5p-chinese-aliases.v1',
    previousAssetSha256: sha(packBytes), previousBaseCatalogVersion: oldBase.catalogVersion,
    previousBaseCatalogHash: sha(oldBaseBytes),
    reason: 'BSC v3 changes only HR:4730 properName; exact HR aliases are unchanged' };
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDirectory, 'chinese-bright-star-aliases.v2.json'), outputBytes),
    writeFile(path.join(outputDirectory, 'publication.json'), `${JSON.stringify(manifest, null, 2)}\n`),
  ]);
  return { catalogVersion: pack.catalogVersion, rowCount: pack.rows.length,
    assetSha256: manifest.assetSha256, baseCatalogHash: pack.baseCatalogHash };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [, , source, oldBase, newBase, output] = process.argv;
  if (!source || !oldBase || !newBase || !output || process.argv.length !== 6)
    throw Error('usage: rebase_wikidata_chinese_aliases.mjs <old-asset-dir> <bsc-v2.json> <bsc-v3.json> <output-dir>');
  console.log(JSON.stringify(await rebaseChineseAliases(source, oldBase, newBase, output)));
}
