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
}

/**
 * Owns only transport request supersession. Query data remains owned by
 * TanStack Query, while this registry guarantees that an older request cannot
 * release or cancel the newer request occupying the same transport slot.
 */
export class LatestRequestRegistry {
  readonly #active = new Map<string, ActiveRequest>();

  register(key: string, cancel: ActiveRequest["cancel"]): () => void {
    this.cancel(key, "superseded");
    const entry = { cancel };
    this.#active.set(key, entry);
    return () => {
      if (this.#active.get(key) === entry) this.#active.delete(key);
    };
  }

  cancel(
    key: string,
    reason: RequestCancellationReason = "manual",
  ): boolean {
    const entry = this.#active.get(key);
    if (!entry) return false;
    this.#active.delete(key);
    entry.cancel(reason);
    return true;
  }

  has(key: string): boolean {
    return this.#active.has(key);
  }

  cancelAll(reason: RequestCancellationReason = "manual"): number {
    const keys = [...this.#active.keys()];
    for (const key of keys) this.cancel(key, reason);
    return keys.length;
  }
}
