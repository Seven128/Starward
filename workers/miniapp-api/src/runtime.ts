import { randomUUID } from "node:crypto";
import type { SourceSummary } from "@starward/miniapp-contracts";

export const COST_ENVELOPE = Object.freeze({
  currency: "CNY",
  normalMonthlyMin: 0,
  normalMonthlyMax: 100,
  hardMonthlyMax: 300,
  optionalDegradeOrder: Object.freeze([
    "SATELLITE_LAYER",
    "LIGHT_LAYER",
    "AUTO_IMPORT",
    "EXTENDED_CATALOG",
  ]),
  protectedCore: Object.freeze([
    "MAP",
    "WEATHER_SUMMARY",
    "SPOT_DETAIL",
    "EXTERNAL_NAVIGATION",
  ]),
});

export class BudgetGuard {
  #projectedMonthly = 0;
  #byCapability = new Map<string, number>();

  charge(
    capability: string,
    projectedMonthlyCny: number,
    optional: boolean,
  ): { allowed: boolean; reason: string } {
    if (!Number.isFinite(projectedMonthlyCny) || projectedMonthlyCny < 0)
      return { allowed: false, reason: "invalid_cost_projection" };
    const next = this.#projectedMonthly + projectedMonthlyCny;
    if (next > COST_ENVELOPE.hardMonthlyMax && optional)
      return { allowed: false, reason: "optional_capability_budget_exceeded" };
    if (next > COST_ENVELOPE.hardMonthlyMax)
      return {
        allowed: false,
        reason: "core_capability_requires_operator_review",
      };
    this.#projectedMonthly = next;
    this.#byCapability.set(
      capability,
      (this.#byCapability.get(capability) ?? 0) + projectedMonthlyCny,
    );
    return { allowed: true, reason: "within_budget" };
  }

  snapshot() {
    return {
      projectedMonthlyCny: this.#projectedMonthly,
      byCapability: Object.fromEntries(this.#byCapability),
      envelope: COST_ENVELOPE,
    };
  }
}

interface CircuitState {
  failures: number;
  openedAt: number | null;
  probeInFlight: boolean;
}

export class ProviderRuntime {
  readonly budget = new BudgetGuard();
  #circuits = new Map<string, CircuitState>();

  async execute<T>(input: {
    provider: string;
    optional: boolean;
    projectedMonthlyCny: number;
    timeoutMs: number;
    retries: number;
    operation: (signal: AbortSignal) => Promise<T>;
  }): Promise<T> {
    const budget = this.budget.charge(
      input.provider,
      input.projectedMonthlyCny,
      input.optional,
    );
    if (!budget.allowed) throw new Error(`BUDGET_EXCEEDED:${budget.reason}`);
    const state = this.#circuits.get(input.provider) ?? {
      failures: 0,
      openedAt: null,
      probeInFlight: false,
    };
    if (state.openedAt && Date.now() - state.openedAt < 30_000)
      throw new Error("PROVIDER_UNAVAILABLE:circuit_open");
    for (let attempt = 0; attempt <= input.retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort("provider_timeout"),
        input.timeoutMs,
      );
      try {
        const value = await input.operation(controller.signal);
        clearTimeout(timeout);
        this.#circuits.set(input.provider, {
          failures: 0,
          openedAt: null,
          probeInFlight: false,
        });
        return value;
      } catch (error) {
        clearTimeout(timeout);
        state.failures += 1;
        if (state.failures >= 3) state.openedAt = Date.now();
        this.#circuits.set(input.provider, state);
        if (attempt === input.retries) throw error;
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.min(80 * 2 ** attempt + Math.floor(Math.random() * 30), 300),
          ),
        );
      }
    }
    throw new Error("PROVIDER_UNAVAILABLE:exhausted");
  }
}

export type OutboxJobKind =
  | "WEATHER"
  | "ASTRONOMY"
  | "DECISION"
  | "LIGHT"
  | "MEDIA"
  | "FRESHNESS"
  | "PROVIDER_HEALTH"
  | "COST"
  | "NOTIFICATION"
  | "BACKUP";
export interface OutboxRecord {
  id: string;
  kind: OutboxJobKind;
  idempotencyKey: string;
  payload: unknown;
  attempts: number;
  state: "PENDING" | "COMPLETE" | "DEAD_LETTER";
  createdAt: string;
  completedAt: string | null;
}

export class DemoOutbox {
  #records = new Map<string, OutboxRecord>();

  enqueue(
    kind: OutboxJobKind,
    idempotencyKey: string,
    payload: unknown,
  ): OutboxRecord {
    const existing = [...this.#records.values()].find(
      (record) => record.idempotencyKey === idempotencyKey,
    );
    if (existing) return existing;
    const record: OutboxRecord = {
      id: randomUUID(),
      kind,
      idempotencyKey,
      payload,
      attempts: 0,
      state: "PENDING",
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this.#records.set(record.id, record);
    return record;
  }

  async consume(
    id: string,
    handler: (record: OutboxRecord) => Promise<void>,
  ): Promise<OutboxRecord> {
    const record = this.#records.get(id);
    if (!record) throw new Error("outbox_record_not_found");
    if (record.state === "COMPLETE") return record;
    record.attempts += 1;
    try {
      await handler(record);
      record.state = "COMPLETE";
      record.completedAt = new Date().toISOString();
    } catch (error) {
      if (record.attempts >= 3) record.state = "DEAD_LETTER";
      throw error;
    }
    return record;
  }

  snapshot(): readonly OutboxRecord[] {
    return [...this.#records.values()].map((record) => ({ ...record }));
  }

  resetForAcceptance() {
    this.#records.clear();
  }
}

export class MemoryTelemetry {
  #events: Readonly<Record<string, unknown>>[] = [];

  event(name: string, fields: Readonly<Record<string, unknown>>): void {
    this.#events.push(
      this.#sanitize({
        type: "event",
        name,
        at: new Date().toISOString(),
        ...fields,
      }),
    );
  }
  error(error: unknown, fields: Readonly<Record<string, unknown>>): void {
    this.#events.push(
      this.#sanitize({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString(),
        ...fields,
      }),
    );
  }
  snapshot(): readonly Readonly<Record<string, unknown>>[] {
    return [...this.#events];
  }

  resetForAcceptance() {
    this.#events = [];
  }

  #sanitize(
    fields: Readonly<Record<string, unknown>>,
  ): Readonly<Record<string, unknown>> {
    const redacted = { ...fields };
    for (const key of Object.keys(redacted)) {
      if (
        /secret|token|cookie|password|latitude|longitude|exactLocation/iu.test(
          key,
        )
      )
        redacted[key] = "[REDACTED]";
    }
    return Object.freeze(redacted);
  }
}

export function unavailableSource(id: string, title: string): SourceSummary {
  const now = new Date().toISOString();
  return {
    id,
    kind: "DEMO_FIXTURE",
    provider: "Capability gate",
    title,
    sourceUrl: "",
    license: "Not connected",
    licenseUrl: "",
    publishedAt: null,
    retrievedAt: now,
    validFrom: null,
    validTo: null,
    state: "UNAVAILABLE",
    confidence: null,
    precision: "No runtime provider fact",
    limitations: [
      "Capability is disabled or no licensed provider is configured; manual/stable fallback remains available",
    ],
  };
}
