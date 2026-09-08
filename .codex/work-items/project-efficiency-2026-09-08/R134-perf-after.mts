import 'reflect-metadata';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { createTestMiniappService } from '../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts';
import { InMemoryTestRepository } from '../../../workers/miniapp-api/src/test-fixtures/in-memory-repository.ts';
import { DeterministicWeatherTestAdapter } from '../../../workers/miniapp-api/src/test-fixtures/deterministic-weather-adapter.ts';
import { createGaiaDr3SkyCatalogProvider } from '../../../workers/miniapp-api/src/sky-scene-catalog.ts';
import { TEST_PUBLISHED_SPOT, buildTestSpotDetail } from '@starward/miniapp-contracts/test-fixtures';

const rows = [];
for (const count of [1, 8]) {
  const spots = Array.from({ length: count }, (_, i) => ({ ...structuredClone(TEST_PUBLISHED_SPOT), spotId: `spot:perf-${i}` }));
  const repository = new InMemoryTestRepository(spots);
  repository.getDetail = async (id) => ({ ...structuredClone(buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId)), spot: structuredClone(spots.find(s => s.spotId === id)!) });
  const weather = new DeterministicWeatherTestAdapter();
  let weatherCalls = 0;
  const getHourly = weather.getHourly.bind(weather);
  weather.getHourly = async (...args) => { weatherCalls++; return getHourly(...args); };
  const skyCatalog = createGaiaDr3SkyCatalogProvider();
  let positionCalls = 0;
  const position = skyCatalog.position.bind(skyCatalog);
  skyCatalog.position = (...args) => { positionCalls++; return position(...args); };
  const service = createTestMiniappService({ repository, weather, skyCatalog });
  const context = (await service.resolveObservationContext({ location: { kind: 'FORMAL_SPOT', spotId: spots[0].spotId }, localDate: '2026-09-08', selectedAt: '2026-09-08T13:20:00.000Z' })).data;
  const run = async (label, action) => {
    const beforeWeather = weatherCalls, beforePosition = positionCalls;
    const began = performance.now();
    const response = await action();
    const ms = performance.now() - began;
    const json = JSON.stringify(response);
    const row = { spots: count, label, ms: +ms.toFixed(2), weatherCalls: weatherCalls - beforeWeather, positionCalls: positionCalls - beforePosition, chars: json.length, bytes: Buffer.byteLength(json), gzipBytes: gzipSync(json).length };
    rows.push(row); console.log(JSON.stringify(row));
    return response;
  };
  await run('map-cold', () => service.getMapScene({ contextId: context.contextId, layer: 'NORMAL' }));
  await run('map-same-warm', () => service.getMapScene({ contextId: context.contextId, layer: 'NORMAL' }));
  await run('map-switch-cloud', () => service.getMapScene({ contextId: context.contextId, layer: 'CLOUD' }));
  const sky = await run('sky-after-map', () => service.getSky(spots[0].spotId, context.contextId));
  await run('sky-warm', () => service.getSky(spots[0].spotId, context.contextId));
  if (count === 1) {
    console.log(JSON.stringify({ skyBreakdown: Object.fromEntries(Object.entries(sky.data).map(([key, value]) => [key, Buffer.byteLength(JSON.stringify(value))])), catalogEntries: sky.data.skyScene.catalog?.entries.length, frames: sky.data.skyScene.frames.length, sceneState: sky.data.skyScene.state }));
    await run('map-4-identical-concurrent-misses', () => Promise.all(Array.from({length: 4}, () => service.getMapScene({ contextId: context.contextId, layer: 'NORMAL', query: ' ' }))));
  }
  await service.onModuleDestroy();
}
writeFileSync(new URL(process.argv[2] ?? './R134-perf-after.json', import.meta.url), JSON.stringify({ environment: { node: process.version, data: 'synthetic spots, deterministic weather, real committed Gaia catalog, in-memory repository/cache; no remote calls' }, rows }, null, 2));
