import { performance } from "node:perf_hooks";

const base = process.argv[2];
if (!/^http:\/\/127\.0\.0\.1:\d+$/u.test(base ?? "")) throw Error("local_base_required");
const queries = ["张宿二", "SAO 1", "HD 48915", "SAO 12", "天狼星", "M 31", "Jupiter", "NGC 7000"];
const request = async (query, revised) => {
  const started = performance.now();
  const url = `${base}/v2/celestial-objects?q=${encodeURIComponent(query)}` +
    (revised ? "&catalogVersion=bsc5p-bright-stars.v3" : "");
  const response = await fetch(url);
  const payload = await response.json();
  const sao = payload.data?.catalogs?.find(catalog => catalog.catalogVersion.startsWith("sao-"));
  if (response.status !== 200 || payload.dataState !== "FRESH" ||
    sao?.catalogVersion !== `sao-visual-supplement.${revised ? "v2" : "v1"}`)
    throw Error(`dual_catalog_search_failed:${query}:${revised}`);
  return { query, revised, reference: payload.data.results[0]?.reference ?? null,
    durationMs: performance.now() - started };
};

await request("SAO 1", false);
await request("SAO 1", true);
const started = performance.now();
const responses = await Promise.all(Array.from({ length: 80 }, (_, index) =>
  request(queries[index % queries.length], index % 2 === 1)));
const durations = responses.map(row => row.durationMs).sort((a, b) => a - b);
console.log(JSON.stringify({ requests: responses.length, old: responses.filter(row => !row.revised).length,
  revised: responses.filter(row => row.revised).length, firstEight: responses.slice(0, 8),
  wallMs: performance.now() - started, medianMs: durations[39], p95Ms: durations[75], maxMs: durations[79] }));
