import type {
  CachePort,
  PlaceSearchPort,
  RoutePort,
  WeatherPort,
} from "../ports.ts";
import { MiniappService } from "../miniapp-service.ts";
import { MemoryMediaObjectStore } from "../media-object-store.ts";
import { DisabledPlaceSearchAdapter } from "../place-provider.ts";
import { DisabledRouteAdapter } from "../route-provider.ts";
import {
  createTestRuntimeConfig,
  type MiniappRuntimeConfig,
} from "../runtime-config.ts";
import { DeterministicWeatherTestAdapter } from "./deterministic-weather-adapter.ts";
import { InMemoryTestRepository } from "./in-memory-repository.ts";
import {
  createTestSkyCatalogProvider,
  type SkyCatalogProvider,
} from "../sky-scene-catalog.ts";

export function createTestMiniappService(
  input: {
    repository?: InMemoryTestRepository;
    config?: MiniappRuntimeConfig;
    weather?: WeatherPort;
    route?: RoutePort;
    placeSearch?: PlaceSearchPort;
    mediaStore?: MemoryMediaObjectStore;
    skyCatalog?: SkyCatalogProvider;
    cache?: CachePort;
  } = {},
) {
  const config = input.config ?? createTestRuntimeConfig();
  return new MiniappService({
    repository: input.repository ?? new InMemoryTestRepository(),
    config,
    weather: input.weather ?? new DeterministicWeatherTestAdapter(),
    route: input.route ?? new DisabledRouteAdapter(),
    placeSearch: input.placeSearch ?? new DisabledPlaceSearchAdapter(),
    mediaStore: input.mediaStore ?? new MemoryMediaObjectStore(),
    skyCatalog: input.skyCatalog ?? createTestSkyCatalogProvider(),
    ...(input.cache ? { cache: input.cache } : {}),
  });
}
