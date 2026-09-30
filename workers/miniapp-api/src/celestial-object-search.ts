import { createHash, randomUUID } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { loadDeepSkyCatalog } from "@starward/astronomy-core/deep-sky-catalog";
import type { ApiEnvelope, CelestialObjectSearchData, SourceSummary } from "@starward/miniapp-contracts";
import { brightStarAliases, deepSkyAliases, saoStarAliases } from "./celestial-object-aliases.ts";
import { loadChineseStarAliasesForBase } from "./chinese-star-alias-publication.ts";
import { loadSaoCatalog } from "./sao-catalog-provider.ts";
import { bsc5pCatalogSources } from "./sky-scene-catalog-provider.ts";
import { deepSkyCatalogSource } from "./deep-sky-scene-provider.ts";
import { skyPlanetCatalog } from "./sky-planet-catalog.ts";
import { SKY_LUMINARY_CATALOG_VERSION } from "@starward/miniapp-contracts";
import { skyLuminaryCatalog } from "./sky-luminary-catalog.ts";

type Entry = Omit<CelestialObjectSearchData["results"][number], "matchedAlias">;
interface Publication {
  catalogVersion: string; catalogHash: string; rowCount: number;
  entries: Iterable<Entry>; sources: readonly SourceSummary[];
  relatedCatalogs?: CelestialObjectSearchData["catalogs"];
  unavailableCatalogs?: readonly string[];
  cacheable?: boolean;
}
type SaoCatalog = ReturnType<typeof loadSaoCatalog>["catalog"];
interface SaoPublication extends Omit<Publication, "entries"> { saoCatalog: SaoCatalog }
export interface CelestialSearchProvider { id: string; load(): Publication | SaoPublication }
type BaseVersion = "bsc5p-bright-stars.v2" | "bsc5p-bright-stars.v3";
const providers = (baseVersion: BaseVersion, includeLuminaries: boolean): readonly CelestialSearchProvider[] => [
  { id: "Solar-System", load() { return skyPlanetCatalog; } },
  ...(includeLuminaries ? [{ id: "Sun-Moon", load() { return skyLuminaryCatalog; } }] : []),
  { id: "BSC5P", load() {
    const catalog = loadBsc5pStarCatalog(baseVersion);
    let chinese: ReturnType<typeof loadChineseStarAliasesForBase> | null = null;
    try { chinese = loadChineseStarAliasesForBase(baseVersion); } catch { /* The base catalogue remains searchable. */ }
    return { ...catalog, rowCount: catalog.rows.length,
      sources: [...bsc5pCatalogSources(catalog), ...(chinese ? [chinese.source] : [])],
      relatedCatalogs: chinese ? [{ catalogVersion: chinese.catalogVersion, catalogHash: chinese.catalogHash,
        rowCount: chinese.rowCount }] : [],
      unavailableCatalogs: chinese ? [] : ["Wikidata-zh"], cacheable: Boolean(chinese),
      entries: catalog.rows.map(row => ({ reference: row.sourceId, displayName: row.properName ?? `HR ${row.hr}`,
        kind: "STAR" as const, aliases: brightStarAliases(row, chinese?.aliasesFor(row.sourceId)) })) };
  } },
  { id: "OpenNGC-Messier", load() {
    const catalog = loadDeepSkyCatalog();
    return { ...catalog, rowCount: catalog.rows.length, sources: [deepSkyCatalogSource()],
      entries: catalog.rows.map(row => ({ reference: row.objectRef, displayName: `M ${row.messier}`,
        kind: row.kind, aliases: deepSkyAliases(row) })) };
  } },
  { id: "SAO", load() {
    const { catalog, source } = loadSaoCatalog(baseVersion);
    return { catalogVersion: catalog.catalogVersion, catalogHash: catalog.catalogHash,
      rowCount: catalog.rowCount, sources: [source], saoCatalog: catalog };
  } },
];
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\s:]+/gu, "");
const catalogId = (value: string) => {
  const match = normalize(value).match(/^(hr|hip|hd|sao|m|ngc|ic)0*(\d+)$/u);
  return match ? `${match[1]}${Number(match[2])}` : null;
};
const identifiers = (alias: string) => [...alias.normalize("NFKC").matchAll(/\b(HR|HIP|HD|SAO|M|NGC|IC)\s*:?\s*(\d+)\b/giu)]
  .map(match => `${match[1]!.toLowerCase()}${Number(match[2])}`);
type IndexedEntry = { entry: Entry; normalizedAliases: string[]; identities: string };
type StandardIndex = Omit<Publication, "entries"> & { entries: IndexedEntry[]; saoCatalog?: never };
type SaoIndex = SaoPublication & { references: string[]; saoTokens: string[]; hdTokens: string[];
  hdNumbers: Float64Array; joint: Uint8Array };
type Index = StandardIndex | SaoIndex;

function buildSaoIndex(publication: SaoPublication): SaoIndex {
  const references: string[] = [], saoTokens: string[] = [], hdTokens: string[] = [];
  const hdNumbers = new Float64Array(publication.rowCount), joint = new Uint8Array(publication.rowCount);
  let i = 0;
  for (const reference of publication.saoCatalog.references()) {
    const row = publication.saoCatalog.get(reference);
    if (!row || i >= publication.rowCount) throw new Error("celestial_search_publication_incomplete");
    const aliases = saoStarAliases(row);
    references.push(reference);
    saoTokens.push(normalize(aliases[0]!));
    hdTokens.push(aliases[1] ? normalize(aliases[1]) : "");
    hdNumbers[i] = row.hd ? Number(row.hd) : NaN;
    joint[i] = row.hdComponent === "9" ? 1 : 0;
    i++;
  }
  if (i !== publication.rowCount) throw new Error("celestial_search_publication_incomplete");
  return { ...publication, references, saoTokens, hdTokens, hdNumbers, joint };
}

/** Static, publication-bound discovery; never joins catalogue aliases into one
 * physical star or computes a competing observing position. A failed catalogue
 * is retried on a later request without dropping independently valid results. */
export class CelestialObjectSearchService {
  private readonly indexes = new Map<string, Index>();
  constructor(private readonly catalogs?: readonly CelestialSearchProvider[]) {}

  search(input: string, limit = 20, baseVersion: BaseVersion = "bsc5p-bright-stars.v2",
    luminaryCatalogVersion?: string): ApiEnvelope<CelestialObjectSearchData> {
    // Old clients reject unknown reference kinds; opt in to this additive catalogue.
    if (luminaryCatalogVersion !== undefined && luminaryCatalogVersion !== SKY_LUMINARY_CATALOG_VERSION)
      throw new BadRequestException("luminary_catalog_version_invalid");
    const query = typeof input === "string" ? input.trim() : "";
    if (!query || query.length > 80 || /[\u0000-\u001f\u007f]/u.test(query) ||
      !Number.isInteger(limit) || limit < 1 || limit > 50) throw new BadRequestException("celestial_search_query_invalid");
    const needle = normalize(query), identity = catalogId(query);
    if (!needle) throw new BadRequestException("celestial_search_query_invalid");
    const results: { result: CelestialObjectSearchData["results"][number]; score: number }[] = [];
    let matchedCount = 0;
    const compare = (a: typeof results[number], b: typeof results[number]) =>
      a.score - b.score || a.result.reference.localeCompare(b.result.reference);
    const offer = (candidate: typeof results[number], alreadyCounted = false) => {
      if (!alreadyCounted) matchedCount++;
      if (results.length === limit && compare(candidate, results[limit - 1]!) >= 0) return;
      let low = 0, high = results.length;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (compare(candidate, results[middle]!) < 0) high = middle; else low = middle + 1;
      }
      results.splice(low, 0, candidate);
      if (results.length > limit) results.pop();
    };
    const offerSao = (index: SaoIndex, rowIndex: number, aliasIndex: number, score: number) => {
      matchedCount++;
      const reference = index.references[rowIndex]!;
      if (results.length === limit && (score > results[limit - 1]!.score ||
        (score === results[limit - 1]!.score &&
          reference.localeCompare(results[limit - 1]!.result.reference) >= 0))) return;
      const row = index.saoCatalog.get(reference);
      if (!row) throw new Error("celestial_search_publication_incomplete");
      const aliases = saoStarAliases(row);
      offer({ result: { reference, displayName: reference.replace(":", " "), kind: "STAR", aliases,
        matchedAlias: identity ? aliases.find(alias => identifiers(alias).includes(identity)) ?? reference :
          aliases[aliasIndex]! }, score }, true);
    };
    const data: CelestialObjectSearchData = { query, results: [], truncated: false, catalogs: [], unavailableCatalogs: [] };
    const sources: SourceSummary[] = [];
    for (const provider of this.catalogs ?? providers(baseVersion, Boolean(luminaryCatalogVersion))) {
      const indexKey = `${baseVersion}:${provider.id}`;
      let index = this.indexes.get(indexKey);
      try {
        if (!index) {
          const publication = provider.load();
          if ("saoCatalog" in publication) index = buildSaoIndex(publication);
          else {
            index = { ...publication, entries: Array.from(publication.entries, entry => ({ entry,
              normalizedAliases: entry.aliases.map(normalize),
              identities: "\0" + [...new Set([entry.reference, ...entry.aliases].flatMap(identifiers))].join("\0") + "\0",
            })) };
            if (index.entries.length !== publication.rowCount) throw new Error("celestial_search_publication_incomplete");
          }
          if (index.cacheable !== false) this.indexes.set(indexKey, index);
        }
      } catch { data.unavailableCatalogs.push(provider.id); continue; }
      data.catalogs.push({ catalogVersion: index.catalogVersion, catalogHash: index.catalogHash, rowCount: index.rowCount });
      data.catalogs.push(...index.relatedCatalogs ?? []);
      data.unavailableCatalogs.push(...index.unavailableCatalogs ?? []);
      sources.push(...index.sources);
      if ("saoCatalog" in index) {
        const sao = index as SaoIndex;
        const numericIdentity = identity?.match(/^(sao|hd)(\d+)$/u);
        const targetNumber = numericIdentity ? Number(numericIdentity[2]) : 0;
        for (let i = 0; i < sao.references.length; i++) {
          if (identity) {
            if (!numericIdentity || (numericIdentity[1] === "sao" ? sao.saoTokens[i] !== identity :
              sao.hdNumbers[i] !== targetNumber &&
                !(sao.joint[i] && sao.hdNumbers[i] + 1 === targetNumber))) continue;
            offerSao(sao, i, 0, 0);
            continue;
          }
          const saoToken = sao.saoTokens[i]!, hdToken = sao.hdTokens[i]!;
          const saoScore = saoToken === needle ? 0 : saoToken.startsWith(needle) ? 1 : saoToken.includes(needle) ? 2 : 3;
          const hdScore = hdToken === needle ? 0 : hdToken.startsWith(needle) ? 1 : hdToken.includes(needle) ? 2 : 3;
          const score = Math.min(saoScore, hdScore);
          if (score < 3) offerSao(sao, i, saoScore <= hdScore ? 0 : 1, score);
        }
        continue;
      }
      for (const { entry, normalizedAliases, identities } of index.entries) {
        if (identity) {
          if (identities.includes(`\0${identity}\0`)) offer({ result: { ...entry,
            matchedAlias: entry.aliases.find(alias => identifiers(alias).includes(identity)) ?? entry.reference }, score: 0 });
          continue;
        }
        let best: { label: string; score: number } | undefined;
        for (let i = 0; i < normalizedAliases.length; i++) {
          const normalized = normalizedAliases[i]!;
          const score = normalized === needle ? 0 : normalized.startsWith(needle) ? 1 : normalized.includes(needle) ? 2 : 3;
          if (score < 3 && (!best || score < best.score)) best = { label: entry.aliases[i]!, score };
        }
        if (best) offer({ result: { ...entry, matchedAlias: best.label }, score: best.score });
      }
    }
    data.results = structuredClone(results.map(item => item.result));
    data.truncated = matchedCount > limit;
    return { apiVersion: "v2", data, generatedAt: new Date().toISOString(), validAt: null,
      dataState: !data.catalogs.length ? "UNAVAILABLE" : data.unavailableCatalogs.length ? "PARTIAL" : "FRESH",
      sources: structuredClone(sources), warnings: data.unavailableCatalogs.map(id => id === "Wikidata-zh"
        ? "中文恒星别名暂不可检索；HR 编号和已有星名仍可用。" : `${id}目录暂不可检索，请稍后重试。`),
      etag: `W/"${createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 24)}"`,
      requestId: `celestial-search:${randomUUID()}` };
  }
}
