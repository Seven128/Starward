import { writeFile } from "node:fs/promises";
import { CelestialObjectSearchService } from "../../../workers/miniapp-api/src/celestial-object-search.ts";
const service = new CelestialObjectSearchService();
global.gc?.();
const before = process.memoryUsage();
let start = performance.now();
const first = service.search("天狼星");
const coldMs = performance.now() - start;
global.gc?.();
const after = process.memoryUsage();
const samples = [];
for (const query of ["Sirius", "SAO 3607", "HD207929", "M31", "仙女座星系", "a", "没有此对象", "HR 424"]) {
  start = performance.now();
  const result = service.search(query);
  samples.push({ query, ms: performance.now() - start, results: result.data.results.length, truncated: result.data.truncated });
}
const evidence = { at: new Date().toISOString(), node: process.version, platform: process.platform,
  boundary: "local_node_real_catalogs_not_phone_or_production_load", coldMs,
  gcRequested: typeof global.gc === "function", heapDeltaBytes: after.heapUsed - before.heapUsed, rssDeltaBytes: after.rss - before.rss,
  catalogs: first.data.catalogs, samples };
await writeFile(new URL("./evidence/celestial-search-benchmark-wikidata-2026-09-23.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence));
