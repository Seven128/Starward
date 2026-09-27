export type RequestCancellationReason =
  | "query_signal"
  | "superseded"
  | "manual"
  | "transport_abort";

export class MiniappRequestCancelled extends Error {
  readonly reason: RequestCancellationReason;

  constructor(reason: RequestCancellationReason) {
    super(`miniapp_request_cancelled:${reason}`);
    this.name = "AbortError";
    this.reason = reason;
  }
}

export function isMiniappRequestCancelled(
  error: unknown,
): error is MiniappRequestCancelled {
  return error instanceof MiniappRequestCancelled;
}

interface ActiveRequest {
  cancel: (reason: RequestCancellationReason) => void;
  readOnly: boolean;
}

/**
 * Owns only transport request supersession. Query data remains owned by
 * TanStack Query, while this registry guarantees that an older request cannot
 * release or cancel the newer request occupying the same transport slot.
 */
export class LatestRequestRegistry {
  readonly #active = new Map<string, Set<ActiveRequest>>();

  register(key: string, cancel: ActiveRequest["cancel"], readOnly = false, independent = false): () => void {
    // Immutable media has multiple simultaneous consumers (cover and gallery).
    // They share cache identity, but each owns its transport cancellation.
    if (!independent) this.cancel(key, "superseded");
    const entry = { cancel, readOnly };
    const entries = this.#active.get(key) ?? new Set<ActiveRequest>();
    entries.add(entry);
    this.#active.set(key, entries);
    return () => {
      entries.delete(entry);
      if (!entries.size && this.#active.get(key) === entries) this.#active.delete(key);
    };
  }

  cancel(
    key: string,
    reason: RequestCancellationReason = "manual",
  ): boolean {
    const entries = this.#active.get(key);
    if (!entries) return false;
    this.#active.delete(key);
    for (const entry of entries) entry.cancel(reason);
    return true;
  }

  has(key: string): boolean {
    return this.#active.has(key);
  }

  cancelAll(reason: RequestCancellationReason = "manual"): number {
    const keys = [...this.#active.keys()];
    const count = [...this.#active.values()].reduce((total, entries) => total + entries.size, 0);
    for (const key of keys) this.cancel(key, reason);
    return count;
  }

  cancelReads(matches: (key: string) => boolean): number {
    let count = 0;
    for (const [key, entries] of [...this.#active]) {
      if (!matches(key)) continue;
      for (const entry of [...entries]) {
        if (!entry.readOnly) continue;
        entries.delete(entry);
        entry.cancel("manual");
        count++;
      }
      if (!entries.size && this.#active.get(key) === entries) this.#active.delete(key);
    }
    return count;
  }
}
