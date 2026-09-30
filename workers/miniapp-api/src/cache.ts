import Redis from "ioredis";
import type { CachePort } from "./ports.ts";

interface MemoryRecord {
  value: unknown;
  expiresAt: number;
}

// One key and fixed, parameterized source: concurrent API instances must use
// the storage owner's atomic check, rather than a process-local lock.
const REPLACE_IF_REVISION = `
local value = redis.call('GET', KEYS[1])
if not value then return 'missing' end
local current = cjson.decode(value)
if current.revision ~= tonumber(ARGV[1]) then return 'conflict' end
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local expiresAt = tonumber(ARGV[3])
local ttl = redis.call('PTTL', KEYS[1])
if ttl >= 0 then expiresAt = math.min(expiresAt, now + ttl) end
if expiresAt <= now then
  redis.call('DEL', KEYS[1])
  return 'missing'
end
local saved = redis.call('SET', KEYS[1], ARGV[2], 'XX', 'PXAT', expiresAt)
if not saved then return 'missing' end
return 'updated'
`;

function assertExpiryDeadline(expiresAtMs: number) {
  if (!Number.isSafeInteger(expiresAtMs)) throw new Error("cache_expiry_invalid");
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

  async readinessSnapshot() {
    return { ready: true, cache: this.kind };
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    this.#records.set(key, {
      value: structuredClone(value),
      expiresAt: Date.now() + ttlSeconds * 1_000,
    });
  }

  async replaceIfRevision<T extends { revision: number }>(
    key: string,
    expectedRevision: number,
    value: T,
    expiresAtMs: number,
  ): Promise<"updated" | "missing" | "conflict"> {
    assertExpiryDeadline(expiresAtMs);
    const record = this.#records.get(key);
    if (!record) return "missing";
    if (record.expiresAt <= Date.now()) {
      this.#records.delete(key);
      return "missing";
    }
    if ((record.value as { revision: number }).revision !== expectedRevision)
      return "conflict";
    const expiresAt = Math.min(record.expiresAt, expiresAtMs);
    if (expiresAt <= Date.now()) {
      this.#records.delete(key);
      return "missing";
    }
    // No await between check and replacement; retain the previous expiry.
    this.#records.set(key, { value: structuredClone(value), expiresAt });
    return "updated";
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

  constructor(redisUrl: string, prefix = "starward:miniapp:current:") {
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

  async readinessSnapshot() {
    const ready = this.client.status === "ready" && (await this.client.ping()) === "PONG";
    return { ready, cache: this.kind };
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    await this.client.set(
      `${this.prefix}${key}`,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
    );
  }

  async replaceIfRevision<T extends { revision: number }>(
    key: string,
    expectedRevision: number,
    value: T,
    expiresAtMs: number,
  ): Promise<"updated" | "missing" | "conflict"> {
    assertExpiryDeadline(expiresAtMs);
    const result = await this.client.eval(
      REPLACE_IF_REVISION, 1, `${this.prefix}${key}`,
      expectedRevision, JSON.stringify(value), expiresAtMs,
    );
    if (result !== "updated" && result !== "missing" && result !== "conflict")
      throw new Error("cache_revision_result_invalid");
    return result;
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
