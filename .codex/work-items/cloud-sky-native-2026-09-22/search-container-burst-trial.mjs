import { performance } from "node:perf_hooks";
import { CelestialObjectSearchService } from "/app/workers/miniapp-api/dist/celestial-object-search.js";

const service = new CelestialObjectSearchService();
const initial = service.search("张宿二");
if (initial.data?.results?.[0]?.reference !== "HR:3994") {
  throw new Error("Chinese alias cold search did not return HR:3994");
}
global.gc();
const warm = process.memoryUsage();
const inputs = Array.from({ length: 80 }, (_, index) =>
  ["张宿二", "SAO 1", "HD 48915", "SAO 12", "天狼星", "M 31", "Jupiter", "NGC 7000"][index % 8]);
const started = performance.now();
let peakRss = warm.rss;
let peakHeapUsed = warm.heapUsed;
const durations = [];
const responses = await Promise.all(inputs.map(query => new Promise((resolve, reject) => {
  setImmediate(() => {
    try {
      const requestStart = performance.now();
      const result = service.search(query);
      durations.push(performance.now() - requestStart);
      const memory = process.memoryUsage();
      peakRss = Math.max(peakRss, memory.rss);
      peakHeapUsed = Math.max(peakHeapUsed, memory.heapUsed);
      resolve({ query, count: result.data?.results?.length, dataState: result.dataState });
    } catch (error) { reject(error); }
  });
})));
const burstWallMs = performance.now() - started;
global.gc();
const after = process.memoryUsage();
durations.sort((a, b) => a - b);
const output = {
  boundary: "Local compiled production module in one 512MiB Docker cgroup; 80 queued calls share one Node event loop; no HTTP, worker pool, cloud, or phone",
  memoryMaxBytes: Number((await import("node:fs")).readFileSync("/sys/fs/cgroup/memory.max", "utf8").trim()),
  initialResult: initial.data.results[0].reference,
  calls: responses.length,
  queries: [...new Set(inputs)],
  responseStates: [...new Set(responses.map(item => item.dataState))],
  resultCounts: Object.fromEntries(responses.slice(0, 8).map(item => [item.query, item.count])),
  burstWallMs: Math.round(burstWallMs),
  requestMs: { median: durations[39], p95: durations[75], max: durations[79] },
  memoryBytes: { warm, peakRss, peakHeapUsed, after, cgroupPeak: Number((await import("node:fs")).readFileSync("/sys/fs/cgroup/memory.peak", "utf8").trim()) },
};
console.log(JSON.stringify(output));
