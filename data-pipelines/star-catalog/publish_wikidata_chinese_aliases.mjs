import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadBsc5pBrightStarCatalog } from "../../packages/astronomy-core/src/bsc5p-catalog.ts";

const [sourcePath, outputDirectory] = process.argv.slice(2);
if (!sourcePath || !outputDirectory || process.argv.length !== 4)
  throw Error("usage: publish_wikidata_chinese_aliases.mjs <query-snapshot.json> <output-directory>");
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const sourceBytes = await readFile(sourcePath);
const source = JSON.parse(sourceBytes.toString("utf8"));
if (source.source !== "https://query.wikidata.org/sparql" ||
  typeof source.query !== "string" || !source.query.includes("pq:P972 wd:Q499138") ||
  !source.query.includes("LANG(?label) IN (\"zh\", \"zh-cn\", \"zh-hans\")") ||
  !Number.isFinite(Date.parse(source.retrievedAt)) || !Array.isArray(source.rows) ||
  source.count !== source.rows.length || source.rows.length < 4000 || source.rows.length > 10000)
  throw Error("wikidata_chinese_alias_source_invalid");

const base = loadBsc5pBrightStarCatalog();
const brightStars = new Set(base.rows.map(row => row.sourceId));
const byReference = new Map(), byItem = new Map();
let matchedChineseRows = 0;
for (const row of source.rows) {
  const match = typeof row.code === "string" ? /^HR ([1-9]\d{0,3})$/u.exec(row.code) : null;
  if (typeof row.code !== "string" || !row.code.startsWith("HR ") ||
    typeof row.item !== "string" || !/^http:\/\/www\.wikidata\.org\/entity\/Q[1-9]\d*$/u.test(row.item) ||
    typeof row.language !== "string" || !["zh", "zh-cn", "zh-hans"].includes(row.language) ||
    typeof row.label !== "string" || row.label.length > 32 || /[\u0000-\u001f\u007f]/u.test(row.label))
    throw Error(`wikidata_chinese_alias_row_invalid:${String(row.code)}`);
  if (!match) continue; // Component suffixes are not a BSC row identity.
  const reference = `HR:${Number(match[1])}`;
  if (!brightStars.has(reference) || !/\p{Script=Han}/u.test(row.label)) continue;
  matchedChineseRows++;
  const item = row.item.slice(row.item.lastIndexOf("/") + 1);
  const values = byReference.get(reference) ?? [];
  values.push({ item, label: row.label.trim(), language: row.language });
  byReference.set(reference, values);
  const itemReferences = byItem.get(item) ?? new Set();
  itemReferences.add(reference);
  byItem.set(item, itemReferences);
}
const ambiguousReferences = [], ambiguousItems = [];
const rows = [];
for (const [reference, values] of byReference) {
  const items = new Set(values.map(value => value.item));
  if (items.size !== 1) { ambiguousReferences.push(reference); continue; }
  const item = values[0].item;
  if (byItem.get(item).size !== 1) { ambiguousItems.push(item); continue; }
  const rank = { "zh-hans": 0, "zh-cn": 1, zh: 2 };
  values.sort((a, b) => rank[a.language] - rank[b.language] || a.label.localeCompare(b.label, "zh"));
  const aliases = [...new Set(values.map(value => value.label))];
  rows.push({ reference, wikidataItem: item, aliases });
}
rows.sort((a, b) => Number(a.reference.slice(3)) - Number(b.reference.slice(3)));
if (rows.length < 3000 || ambiguousReferences.length > 10 || ambiguousItems.length > 10)
  throw Error("wikidata_chinese_alias_coverage_changed");
const sourceSha256 = sha256(sourceBytes);
const pack = { schemaVersion: "wikidata-bsc5p-chinese-aliases-v1",
  catalogVersion: "wikidata-bsc5p-chinese-aliases.v1", baseCatalogVersion: base.catalogVersion,
  baseCatalogHash: base.catalogHash, sourceSha256, sourceRetrievedAt: source.retrievedAt,
  rows };
const assetBytes = Buffer.from(`${JSON.stringify(pack)}\n`, "utf8");
const manifest = { catalogVersion: pack.catalogVersion, assetSha256: sha256(assetBytes),
  rowCount: rows.length, matchedChineseRows, sourceRowCount: source.rows.length,
  excludedAmbiguousReferences: ambiguousReferences.sort(), excludedAmbiguousItems: [...new Set(ambiguousItems)].sort(),
  sourceSha256, sourceRetrievedAt: source.retrievedAt,
  sourceUrl: "https://www.wikidata.org/", queryUrl: "https://query.wikidata.org/sparql",
  license: "CC0 1.0", licenseUrl: "https://www.wikidata.org/wiki/Wikidata:Licensing",
  limitations: ["Wikidata社区中文标签，仅作检索别名，不是IAU正式中文名或已审中文介绍。",
    "仅按Wikidata带Bright Star Catalogue限定符的HR编号与现行BSC5P精确匹配；冲突身份剔除。",
    "同一个中文标签可能对应多颗恒星；结果保留独立HR身份。"] };
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "chinese-bright-star-aliases.v1.json"), assetBytes);
await writeFile(join(outputDirectory, "publication.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ catalogVersion: pack.catalogVersion, rowCount: rows.length,
  assetSha256: manifest.assetSha256, sourceSha256, ambiguousReferences, ambiguousItems: manifest.excludedAmbiguousItems }));
