import { performance } from "node:perf_hooks";

const base = "http://127.0.0.1:18787/v2/celestial-objects";
const inputs = Array.from({ length: 80 }, (_, index) =>
  ["张宿二", "SAO 1", "HD 48915", "SAO 12", "天狼星", "M 31", "Jupiter", "NGC 7000"][index % 8]);
const request = async query => {
  const started = performance.now();
  const response = await fetch(`${base}?q=${encodeURIComponent(query)}`);
  const payload = await response.json();
  return { query, httpStatus: response.status, dataState: payload.dataState,
    reference: payload.data?.results?.[0]?.reference ?? null,
    durationMs: performance.now() - started };
};
const cold = await request("张宿二");
if (cold.httpStatus !== 200 || cold.reference !== "HR:3994") throw new Error("cold HTTP search failed");
const started = performance.now();
const responses = await Promise.all(inputs.map(request));
const wallMs = performance.now() - started;
if (responses.some(item => item.httpStatus !== 200 || item.dataState !== "FRESH"))
  throw new Error("an HTTP search failed or returned a non-fresh catalogue");
const durations = responses.map(item => item.durationMs).sort((a, b) => a - b);
console.log(JSON.stringify({
  boundary: "80 simultaneous host HTTP fetches to one local Docker Mini API, 512MiB cgroup, local MEMORY_TEST config; no cloud, database, or device",
  cold,
  requests: responses.length,
  queries: [...new Set(inputs)],
  firstEight: responses.slice(0, 8).map(({ query, reference }) => ({ query, reference })),
  wallMs,
  requestMs: { median: durations[39], p95: durations[75], max: durations[79] },
}));
