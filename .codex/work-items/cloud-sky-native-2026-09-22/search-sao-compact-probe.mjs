import { writeFile } from "node:fs/promises";
import { loadSaoCatalog } from "../../../workers/miniapp-api/src/sao-catalog-provider.ts";
import { saoStarAliases } from "../../../workers/miniapp-api/src/celestial-object-aliases.ts";

const normalize = value => value.normalize("NFKC").toLowerCase().replace(/[\s:]+/gu, "");
global.gc?.();
const before = process.memoryUsage();
let start = performance.now();
const { catalog } = loadSaoCatalog();
const loadMs = performance.now() - start;
global.gc?.();
const afterLoad = process.memoryUsage();
start = performance.now();
const references = [];
const saoTokens = [];
const hdTokens = [];
const hdNumbers = new Uint32Array(catalog.rowCount);
const joint = new Uint8Array(catalog.rowCount);
let index = 0;
for (const reference of catalog.references()) {
  const row = catalog.get(reference);
  if (!row) throw Error(`missing ${reference}`);
  const aliases = saoStarAliases(row);
  references.push(reference);
  saoTokens.push(normalize(aliases[0]));
  hdTokens.push(aliases[1] ? normalize(aliases[1]) : "");
  hdNumbers[index] = row.hd ? Number(row.hd) : 0;
  joint[index] = row.hdComponent === "9" ? 1 : 0;
  index++;
}
const buildMs = performance.now() - start;
global.gc?.();
const afterBuild = process.memoryUsage();
const samples = [];
for (const query of ["SAO 3607", "HD207929", "SAO 1", "SAO", "a", "没有此对象"]) {
  const needle = normalize(query);
  const identity = /^(sao|hd)(\d+)$/u.exec(needle);
  const trials = [];
  for (let trial = 0; trial < 3; trial++) {
    let matches = 0;
    const first = [];
    start = performance.now();
    for (let i = 0; i < references.length; i++) {
      const matched = identity ? (identity[1] === "sao" ? saoTokens[i] === needle :
        hdNumbers[i] === Number(identity[2]) || (joint[i] && hdNumbers[i] + 1 === Number(identity[2]))) :
        saoTokens[i].includes(needle) || hdTokens[i].includes(needle);
      if (matched) {
        matches++;
        if (first.length < 3) first.push(references[i]);
      }
    }
    trials.push({ ms: performance.now() - start, matches, first });
  }
  samples.push({ query, trials });
}
global.gc?.();
const afterQueries = process.memoryUsage();
const evidence = { at: new Date().toISOString(), node: process.version,
  boundary: "local_node_real_sao_compact_index_not_production_load", gcRequested: typeof global.gc === "function",
  loadMs, buildMs, heapLoadDeltaBytes: afterLoad.heapUsed - before.heapUsed,
  heapIndexDeltaBytes: afterBuild.heapUsed - afterLoad.heapUsed,
  rssIndexDeltaBytes: afterBuild.rss - afterLoad.rss,
  heapQueryDeltaBytes: afterQueries.heapUsed - afterBuild.heapUsed, samples };
await writeFile(new URL("./evidence/celestial-search-sao-compact-probe.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence));
