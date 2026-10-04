import { writeFile } from "node:fs/promises";
import { loadSaoCatalog } from "../../../workers/miniapp-api/src/sao-catalog-provider.ts";
import { saoStarAliases } from "../../../workers/miniapp-api/src/celestial-object-aliases.ts";

global.gc?.();
const before = process.memoryUsage();
let start = performance.now();
const { catalog } = loadSaoCatalog();
const loadMs = performance.now() - start;
global.gc?.();
const afterLoad = process.memoryUsage();
const normalize = value => value.normalize("NFKC").toLowerCase().replace(/[\s:]+/gu, "");
const queries = ["SAO 3607", "HD207929", "SAO 1", "SAO", "a", "没有此对象"];
const samples = [];
for (const query of queries) {
  const needle = normalize(query);
  const querySamples = [];
  for (let trial = 0; trial < 2; trial++) {
    let matches = 0;
    const first = [];
    start = performance.now();
    for (const reference of catalog.references()) {
      const row = catalog.get(reference);
      if (!row) throw new Error(`missing ${reference}`);
      if (saoStarAliases(row).some(alias => normalize(alias).includes(needle))) {
        matches++;
        if (first.length < 3) first.push(reference);
      }
    }
    querySamples.push({ ms: performance.now() - start, matches, first });
  }
  samples.push({ query, trials: querySamples });
}
global.gc?.();
const afterQueries = process.memoryUsage();
const evidence = { at: new Date().toISOString(), node: process.version,
  boundary: "local_node_real_sao_catalog_stream_scan_not_production_load", gcRequested: typeof global.gc === "function",
  loadMs, heapLoadDeltaBytes: afterLoad.heapUsed - before.heapUsed, rssLoadDeltaBytes: afterLoad.rss - before.rss,
  heapQueryDeltaBytes: afterQueries.heapUsed - afterLoad.heapUsed, samples };
await writeFile(new URL("./evidence/celestial-search-sao-stream-probe.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence));
