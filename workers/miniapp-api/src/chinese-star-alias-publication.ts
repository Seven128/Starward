import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import type { SourceSummary } from "@starward/miniapp-contracts";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
type Base = ReturnType<typeof loadBsc5pStarCatalog>;
export interface ChineseStarAliases {
  readonly catalogVersion: string;
  readonly catalogHash: string;
  readonly rowCount: number;
  aliasesFor(reference: string): readonly string[];
  readonly source: SourceSummary;
}

/** A fixed CC0 label publication, linked only by exact BSC HR identity. It
 * adds search names, never stellar coordinates, photometry or official names. */
export function parseChineseStarAliasPublication(bytes: Uint8Array, manifest: unknown, base: Base): ChineseStarAliases {
  const metadata = manifest as Record<string, unknown>;
  const versions = base.catalogVersion === "bsc5p-bright-stars.v2" ? ["wikidata-bsc5p-chinese-aliases.v1"] :
    base.catalogVersion === "bsc5p-bright-stars.v3" ? ["wikidata-bsc5p-chinese-aliases.v2", "wikidata-bsc5p-chinese-aliases.v3"] : [];
  if (!metadata || !versions.includes(String(metadata.catalogVersion)) ||
    typeof metadata.assetSha256 !== "string" || sha256(bytes) !== metadata.assetSha256 ||
    !Number.isInteger(metadata.rowCount) || metadata.rowCount !== 3149 ||
    typeof metadata.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(metadata.sourceSha256) ||
    typeof metadata.sourceRetrievedAt !== "string" || !Number.isFinite(Date.parse(metadata.sourceRetrievedAt)) ||
    metadata.license !== "CC0 1.0" || metadata.licenseUrl !== "https://www.wikidata.org/wiki/Wikidata:Licensing" ||
    metadata.queryUrl !== "https://query.wikidata.org/sparql")
    throw Error("chinese_star_alias_manifest_invalid");
  const pack = JSON.parse(Buffer.from(bytes).toString("utf8"));
  if (pack.schemaVersion !== "wikidata-bsc5p-chinese-aliases-v1" ||
    pack.catalogVersion !== metadata.catalogVersion || pack.baseCatalogVersion !== base.catalogVersion ||
    pack.baseCatalogHash !== base.catalogHash || pack.sourceSha256 !== metadata.sourceSha256 ||
    pack.sourceRetrievedAt !== metadata.sourceRetrievedAt || !Array.isArray(pack.rows) ||
    pack.rows.length !== metadata.rowCount) throw Error("chinese_star_alias_pack_invalid");
  if (metadata.catalogVersion === "wikidata-bsc5p-chinese-aliases.v3") {
    const provenance = pack.sourceProvenance;
    const previous = provenance?.previousPublication, entity = provenance?.entity;
    if (provenance?.schemaVersion !== "wikidata-bsc5p-chinese-aliases-source-v1" ||
        JSON.stringify(provenance) !== JSON.stringify(metadata.sourceProvenance) ||
        sha256(Buffer.from(`${JSON.stringify(provenance)}\n`)) !== pack.sourceSha256 ||
        previous?.catalogVersion !== "wikidata-bsc5p-chinese-aliases.v2" ||
        typeof previous.assetSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(previous.assetSha256) ||
        typeof previous.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(previous.sourceSha256) ||
        !Number.isFinite(Date.parse(previous.sourceRetrievedAt)) ||
        !/^Q[1-9]\d*$/u.test(entity?.wikidataItem) || !/^HR:[1-9]\d{0,3}$/u.test(entity?.reference) ||
        entity.sourceUrl !== `https://www.wikidata.org/wiki/Special:EntityData/${entity.wikidataItem}.json` ||
        typeof entity.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(entity.sourceSha256) ||
        entity.retrievedAt !== pack.sourceRetrievedAt || !Number.isSafeInteger(entity.lastRevision) ||
        entity.lastRevision < 1 || !Number.isFinite(Date.parse(entity.modifiedAt)) ||
        !pack.rows.some((row: { reference?: string; wikidataItem?: string }) =>
          row.reference === entity.reference && row.wikidataItem === entity.wikidataItem))
      throw Error("chinese_star_alias_provenance_invalid");
  }
  const validReferences = new Set(base.rows.map(row => row.sourceId));
  const aliasesByReference = new Map<string, readonly string[]>();
  let previous = 0;
  for (const row of pack.rows) {
    if (!row || typeof row.reference !== "string" || !/^HR:[1-9]\d{0,3}$/u.test(row.reference) ||
      !validReferences.has(row.reference) || Number(row.reference.slice(3)) <= previous ||
      typeof row.wikidataItem !== "string" || !/^Q[1-9]\d*$/u.test(row.wikidataItem) ||
      !Array.isArray(row.aliases) || row.aliases.length < 1 || row.aliases.length > 3 ||
      row.aliases.some((value: unknown) => typeof value !== "string" || value.length > 32 ||
        !/\p{Script=Han}/u.test(value) || /[\u0000-\u001f\u007f]/u.test(value)) ||
      new Set(row.aliases).size !== row.aliases.length)
      throw Error("chinese_star_alias_row_invalid");
    previous = Number(row.reference.slice(3));
    aliasesByReference.set(row.reference, Object.freeze([...row.aliases]));
  }
  const source: SourceSummary = Object.freeze({
    id: `catalog:wikidata-zh:${metadata.assetSha256}`, kind: "OPEN_DATA",
    provider: "Wikidata contributors", title: metadata.catalogVersion === "wikidata-bsc5p-chinese-aliases.v3" ?
      "Wikidata 中文恒星标签及别名（BSC5P HR 精确关联）" : "Wikidata 中文恒星标签（BSC5P HR 精确关联）",
    sourceUrl: "https://www.wikidata.org/", license: "CC0 1.0", licenseUrl: String(metadata.licenseUrl),
    publishedAt: null, retrievedAt: String(metadata.sourceRetrievedAt), validFrom: null, validTo: null,
    state: "FRESH", confidence: 0.8,
    precision: "仅精确 HR 编号关联；中文标签不用于坐标或分量合并",
    limitations: ["Wikidata 社区中文标签，仅作检索别名；不是 IAU 正式中文名或已审中文介绍。",
      "固定获取版本，未承诺覆盖全部 BSC5P 恒星或保持 Wikidata 实时更新。",
      "同一中文标签可能对应多颗恒星；搜索结果保留各自 HR 身份。",
      ...(metadata.catalogVersion === "wikidata-bsc5p-chinese-aliases.v3" ?
        [`原中文标签取得于 ${pack.sourceProvenance.previousPublication.sourceRetrievedAt}；仅 ${pack.sourceProvenance.entity.reference} 的别名补自 ${pack.sourceRetrievedAt} 的固定版本。`] : [])],
  });
  return Object.freeze({ catalogVersion: String(metadata.catalogVersion), catalogHash: String(metadata.assetSha256),
    rowCount: aliasesByReference.size, aliasesFor: (reference: string) => aliasesByReference.get(reference) ?? [], source });
}

const loaded = new Map<string, ChineseStarAliases>();
export function loadChineseStarAliasesForBase(baseVersion: "bsc5p-bright-stars.v2" | "bsc5p-bright-stars.v3") {
  const cached = loaded.get(baseVersion);
  if (cached) return cached;
  const revised = baseVersion === "bsc5p-bright-stars.v3";
  const location = new URL(revised ? "../assets/celestial-names-v3/" : "../assets/celestial-names/", import.meta.url);
  const bytes = readFileSync(new URL(revised ? "chinese-bright-star-aliases.v3.json" : "chinese-bright-star-aliases.v1.json", location));
  const manifest = JSON.parse(readFileSync(new URL("publication.json", location), "utf8"));
  const current = parseChineseStarAliasPublication(bytes, manifest, loadBsc5pStarCatalog(baseVersion));
  loaded.set(baseVersion, current);
  return current;
}
export function loadChineseStarAliases() { return loadChineseStarAliasesForBase("bsc5p-bright-stars.v2"); }
