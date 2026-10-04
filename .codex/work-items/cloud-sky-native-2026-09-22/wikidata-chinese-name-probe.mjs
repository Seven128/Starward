import { writeFile } from "node:fs/promises";

const query = `SELECT ?item ?code ?label WHERE {
  ?item p:P528 ?statement .
  ?statement ps:P528 ?code ; pq:P972 wd:Q499138 .
  FILTER(STRSTARTS(?code, "HR "))
  ?item rdfs:label ?label .
  FILTER(LANG(?label) IN ("zh", "zh-cn", "zh-hans"))
} LIMIT 10000`;
const url = new URL("https://query.wikidata.org/sparql");
url.searchParams.set("query", query);
url.searchParams.set("format", "json");
const response = await fetch(url, { headers: { "user-agent": "Starward-catalog-research/0.1 (offline data-source trial)", accept: "application/sparql-results+json" }, signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw Error(`Wikidata HTTP ${response.status}`);
const body = await response.json();
const rows = body.results.bindings.map(row => ({ item: row.item.value, code: row.code.value,
  label: row.label.value, language: row.label["xml:lang"] }));
const evidence = { source: "https://query.wikidata.org/sparql", query, retrievedAt: new Date().toISOString(), count: rows.length, rows };
await writeFile(new URL("./evidence/wikidata-chinese-name-probe.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ retrievedAt: evidence.retrievedAt, count: rows.length, first: rows.slice(0, 20) }));
