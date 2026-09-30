/** Add a pinned entity's Chinese names to its existing exact-HR publication.
 * This never joins by position, imports measurements or refreshes other rows. */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const jsonBytes = value => Buffer.from(`${JSON.stringify(value)}\n`);
const hash = value => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const chinese = value => typeof value === "string" && value.length > 0 && value.length <= 32 &&
  /\p{Script=Han}/u.test(value) && !/[\u0000-\u001f\u007f]/u.test(value);

export function enrichChineseAliasPublication(baseBytes, baseManifest, entityBytes, retrievedAt) {
  const base = JSON.parse(Buffer.from(baseBytes).toString("utf8"));
  if (base.catalogVersion !== "wikidata-bsc5p-chinese-aliases.v2" ||
      base.schemaVersion !== "wikidata-bsc5p-chinese-aliases-v1" ||
      base.baseCatalogVersion !== "bsc5p-bright-stars.v3" || !hash(base.baseCatalogHash) ||
      baseManifest.catalogVersion !== base.catalogVersion || baseManifest.assetSha256 !== sha256(baseBytes) ||
      baseManifest.sourceSha256 !== base.sourceSha256 || !hash(base.sourceSha256) ||
      baseManifest.sourceRetrievedAt !== base.sourceRetrievedAt || baseManifest.license !== "CC0 1.0" ||
      baseManifest.licenseUrl !== "https://www.wikidata.org/wiki/Wikidata:Licensing" ||
      baseManifest.rowCount !== 3149 || base.rows?.length !== 3149)
    throw Error("chinese_alias_enrichment_base_invalid");
  if (typeof retrievedAt !== "string" || !Number.isFinite(Date.parse(retrievedAt)) ||
      new Date(retrievedAt).toISOString() !== retrievedAt || retrievedAt < base.sourceRetrievedAt)
    throw Error("chinese_alias_enrichment_retrieval_invalid");
  const snapshot = JSON.parse(Buffer.from(entityBytes).toString("utf8"));
  const entities = snapshot.entities && Object.values(snapshot.entities);
  const entity = entities?.length === 1 ? entities[0] : null;
  if (!entity || entity.type !== "item" || !/^Q[1-9]\d*$/u.test(entity.id) ||
      !Number.isSafeInteger(entity.lastrevid) || entity.lastrevid < 1 ||
      !Number.isFinite(Date.parse(entity.modified)) || Date.parse(entity.modified) > Date.parse(retrievedAt))
    throw Error("chinese_alias_enrichment_entity_invalid");
  const references = new Set((entity.claims?.P528 ?? []).filter(claim => claim.rank !== "deprecated" &&
    claim.qualifiers?.P972?.some(qualifier => qualifier.datavalue?.value?.id === "Q499138"))
    .map(claim => claim.mainsnak?.datavalue?.value)
    .filter(code => typeof code === "string" && /^HR [1-9]\d{0,3}$/u.test(code))
    .map(code => code.replace(" ", ":")));
  if (references.size !== 1) throw Error("chinese_alias_enrichment_hr_invalid");
  const reference = [...references][0];
  const row = base.rows.find(candidate => candidate.reference === reference);
  if (!row || row.wikidataItem !== entity.id) throw Error("chinese_alias_enrichment_identity_mismatch");
  const languages = ["zh-hans", "zh-cn", "zh"];
  const additions = languages.flatMap(language => [entity.labels?.[language]?.value,
    ...(entity.aliases?.[language] ?? []).map(alias => alias.value)]).filter(value => value !== undefined);
  if (!additions.length || additions.some(value => !chinese(value)))
    throw Error("chinese_alias_enrichment_name_invalid");
  const aliases = [...new Set([...row.aliases, ...additions])];
  if (aliases.length > 3 || aliases.length === row.aliases.length)
    throw Error("chinese_alias_enrichment_scope_changed");
  const sourceProvenance = {
    schemaVersion: "wikidata-bsc5p-chinese-aliases-source-v1",
    previousPublication: { catalogVersion: base.catalogVersion, assetSha256: sha256(baseBytes),
      sourceSha256: base.sourceSha256, sourceRetrievedAt: base.sourceRetrievedAt },
    entity: { wikidataItem: entity.id, reference,
      sourceUrl: `https://www.wikidata.org/wiki/Special:EntityData/${entity.id}.json`,
      sourceSha256: sha256(entityBytes), retrievedAt, lastRevision: entity.lastrevid,
      modifiedAt: entity.modified, languages },
  };
  const provenanceBytes = jsonBytes(sourceProvenance);
  row.aliases = aliases;
  const pack = { ...base, catalogVersion: "wikidata-bsc5p-chinese-aliases.v3",
    sourceSha256: sha256(provenanceBytes), sourceRetrievedAt: retrievedAt, sourceProvenance };
  const assetBytes = jsonBytes(pack);
  const manifest = { ...baseManifest, catalogVersion: pack.catalogVersion,
    assetSha256: sha256(assetBytes), sourceSha256: pack.sourceSha256,
    sourceRetrievedAt: retrievedAt, sourceProvenance,
    limitations: [...baseManifest.limitations,
      `原中文标签快照保持 ${base.sourceRetrievedAt}；仅 ${reference} 的中文名称补自 ${entity.id} 的 ${retrievedAt} 固定版本。`],
  };
  return { assetBytes, manifest, provenanceBytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [baseDirectory, entityPath, retrievedAt, outputDirectory] = process.argv.slice(2);
  if (!baseDirectory || !entityPath || !retrievedAt || !outputDirectory || process.argv.length !== 6)
    throw Error("usage: enrich_wikidata_chinese_aliases.mjs <v2-directory> <entity-snapshot.json> <retrieved-at-UTC> <output-directory>");
  const [baseBytes, manifestBytes, entityBytes] = await Promise.all([
    readFile(path.join(baseDirectory, "chinese-bright-star-aliases.v2.json")),
    readFile(path.join(baseDirectory, "publication.json")), readFile(entityPath),
  ]);
  const result = enrichChineseAliasPublication(baseBytes, JSON.parse(manifestBytes), entityBytes, retrievedAt);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "chinese-bright-star-aliases.v3.json"), result.assetBytes);
  await writeFile(path.join(outputDirectory, "source-provenance.json"), result.provenanceBytes);
  await writeFile(path.join(outputDirectory, "publication.json"), `${JSON.stringify(result.manifest, null, 2)}\n`);
  console.log(JSON.stringify({ catalogVersion: result.manifest.catalogVersion,
    rowCount: result.manifest.rowCount, assetSha256: result.manifest.assetSha256,
    sourceSha256: result.manifest.sourceSha256, entity: result.manifest.sourceProvenance.entity }));
}
