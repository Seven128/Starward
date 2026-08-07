import Redis from "ioredis";
import type { CachePort } from "./ports.ts";

interface MemoryRecord {
  value: unknown;
  expiresAt: number;
}

export class MemoryCache implements CachePort {
  readonly kind = "memory" as const;
  #records = new Map<string, MemoryRecord>();

  async get<T>(key: string): Promise<T | null> {
    const record = this.#records.get(key);
    if (!record) return null;
    if (record.expiresAt <= Date.now()) {
      this.#records.delete(key);
      return null;
    }
    return structuredClone(record.value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    this.#records.set(key, {
      value: structuredClone(value),
      expiresAt: Date.now() + ttlSeconds * 1_000,
    });
  }

  async deleteByPrefix(prefix: string) {
    for (const key of this.#records.keys())
      if (key.startsWith(prefix)) this.#records.delete(key);
  }

  async operationsSnapshot() {
    return { cache: this.kind, entries: this.#records.size };
  }

  async close() {}
}

export class RedisCache implements CachePort {
  readonly kind = "redis" as const;
  readonly client: Redis;
  readonly prefix: string;

  constructor(redisUrl: string, prefix = "starward:miniapp:v1:") {
    this.prefix = prefix;
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectionName: "starward-miniapp-api-cache",
    });
  }

  async initialize() {
    await this.client.connect();
    if ((await this.client.ping()) !== "PONG")
      throw new Error("redis_cache_health_failed");
    return this;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(`${this.prefix}${key}`);
    return value === null ? null : (JSON.parse(value) as T);
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    await this.client.set(
      `${this.prefix}${key}`,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
    );
  }

  async deleteByPrefix(prefix: string) {
    let cursor = "0";
    do {
      const [next, keys] = await this.client.scan(
        cursor,
        "MATCH",
        `${this.prefix}${prefix}*`,
        "COUNT",
        100,
      );
      cursor = next;
      if (keys.length) await this.client.del(...keys);
    } while (cursor !== "0");
  }

  async operationsSnapshot() {
    return {
      cache: this.kind,
      ready: this.client.status === "ready",
      namespaceEntries: await this.#countNamespace(),
    };
  }

  async #countNamespace() {
    let count = 0;
    let cursor = "0";
    do {
      const [next, keys] = await this.client.scan(
        cursor,
        "MATCH",
        `${this.prefix}*`,
        "COUNT",
        100,
      );
      cursor = next;
      count += keys.length;
    } while (cursor !== "0");
    return count;
  }

  async close() {
    if (this.client.status !== "end") await this.client.quit();
  }
}
