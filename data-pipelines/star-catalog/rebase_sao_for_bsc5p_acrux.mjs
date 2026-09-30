/** Rebind the immutable SAO rows to BSC v3 after the sole Acrux name fix.
 * This is an offline candidate publisher. It does not replace live assets.
 */
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Buffer.from(JSON.stringify(value));

export async function rebaseSao(sourceDirectory, oldBasePath, newBasePath, outputDirectory) {
  const [sourceBytes, sourceManifestBytes, oldBaseBytes, newBaseBytes, newBaseManifestBytes] = await Promise.all([
    readFile(path.join(sourceDirectory, 'sao-visual-supplement.v1.json')),
    readFile(path.join(sourceDirectory, 'sao-visual-supplement.v1.manifest.json')),
    readFile(oldBasePath), readFile(newBasePath),
    readFile(newBasePath.replace(/\.json$/u, '.manifest.json')),
  ]);
  const source = JSON.parse(sourceBytes), manifest = JSON.parse(sourceManifestBytes);
  const oldBase = JSON.parse(oldBaseBytes), newBase = JSON.parse(newBaseBytes);
  const newBaseManifest = JSON.parse(newBaseManifestBytes);
  if (source.catalogVersion !== 'sao-visual-supplement.v1' ||
      manifest.catalogVersion !== source.catalogVersion ||
      source.schemaVersion !== 'sao-visual-supplement-v1' ||
      !sourceBytes.equals(canonical(source)) ||
      sourceBytes.length !== manifest.derivedAssetBytes ||
      sha256(sourceBytes) !== manifest.derivedAssetSha256 ||
      source.baseCatalogVersion !== 'bsc5p-bright-stars.v2' ||
      source.baseAssetSha256 !== sha256(oldBaseBytes) ||
      !Array.isArray(source.rows) || source.rows.length !== 246280 ||
      manifest.rowCount !== source.rows.length)
    throw Error('sao_rebase_source_invalid');
  if (oldBase.catalogVersion !== 'bsc5p-bright-stars.v2' ||
      newBase.catalogVersion !== 'bsc5p-bright-stars.v3' ||
      !newBaseBytes.equals(canonical(newBase)) ||
      newBaseManifest.catalogVersion !== newBase.catalogVersion ||
      newBaseManifest.derivedAssetSha256 !== sha256(newBaseBytes) ||
      newBaseManifest.derivedAssetBytes !== newBaseBytes.length ||
      newBaseManifest.derivation?.basePublication?.assetSha256 !== sha256(oldBaseBytes) ||
      oldBase.schemaVersion !== newBase.schemaVersion ||
      !Array.isArray(oldBase.rows) || oldBase.rows.length !== 8404 ||
      !Array.isArray(newBase.rows) || newBase.rows.length !== oldBase.rows.length ||
      oldBase.rows.some((row, i) => {
        const next = newBase.rows[i];
        return row.sourceId !== next?.sourceId ||
          (row.sourceId === 'HR:4730'
            ? row.properName !== null || next.properName !== 'Acrux' ||
              Object.keys(row).some(key => key !== 'properName' && row[key] !== next[key])
            : Object.keys(row).some(key => row[key] !== next[key]));
      })) throw Error('sao_rebase_base_change_exceeds_acrux_name');
  const normalized = structuredClone(newBase);
  normalized.catalogVersion = oldBase.catalogVersion;
  normalized.rows.find(row => row.sourceId === 'HR:4730').properName = null;
  if (!isDeepStrictEqual(normalized, oldBase)) throw Error('sao_rebase_base_metadata_changed');
  const newVersion = 'sao-visual-supplement.v2';
  source.catalogVersion = newVersion;
  source.baseCatalogVersion = newBase.catalogVersion;
  source.baseAssetSha256 = sha256(newBaseBytes);
  const outputBytes = canonical(source);
  manifest.catalogVersion = newVersion;
  manifest.derivedAssetSha256 = sha256(outputBytes);
  manifest.derivedAssetBytes = outputBytes.length;
  manifest.derivation = {
    ...manifest.derivation,
    baseRebinding: {
      previousCatalogVersion: 'sao-visual-supplement.v1',
      previousAssetSha256: sha256(sourceBytes),
      previousBaseCatalogVersion: oldBase.catalogVersion,
      previousBaseAssetSha256: sha256(oldBaseBytes),
      reason: 'BSC v3 changes only HR:4730 properName to IAU Acrux; all BSC identities and SAO rows remain unchanged',
    },
  };
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDirectory, `${newVersion}.json`), outputBytes),
    writeFile(path.join(outputDirectory, `${newVersion}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`),
  ]);
  return { catalogVersion: newVersion, rowCount: source.rows.length,
    derivedAssetSha256: manifest.derivedAssetSha256, derivedAssetBytes: outputBytes.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [, , source, oldBase, newBase, output] = process.argv;
  if (!source || !oldBase || !newBase || !output || process.argv.length !== 6)
    throw Error('usage: rebase_sao_for_bsc5p_acrux.mjs <source-dir> <bsc-v2.json> <bsc-v3.json> <output-dir>');
  console.log(JSON.stringify(await rebaseSao(source, oldBase, newBase, output)));
}
