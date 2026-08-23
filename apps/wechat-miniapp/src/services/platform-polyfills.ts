interface AbortRuntime {
  AbortController?: typeof globalThis.AbortController;
  AbortSignal?: typeof globalThis.AbortSignal;
}

type MiniappAbortEvent = {
  readonly type: "abort";
  readonly target: MiniappAbortSignal;
  readonly currentTarget: MiniappAbortSignal;
};

type MiniappAbortListener =
  | ((event: MiniappAbortEvent) => void)
  | { handleEvent(event: MiniappAbortEvent): void };

type ListenerEntry = {
  listener: MiniappAbortListener;
  once: boolean;
};

function abortError() {
  const error = new Error("This operation was aborted");
  error.name = "AbortError";
  return error;
}

class MiniappAbortSignal {
  aborted = false;
  reason: unknown = undefined;
  onabort: ((event: MiniappAbortEvent) => void) | null = null;
  readonly listeners = new Set<ListenerEntry>();

  addEventListener(
    type: string,
    listener: MiniappAbortListener | null,
    options?: boolean | { once?: boolean },
  ) {
    if (type !== "abort" || !listener) return;
    const existing = [...this.listeners].find(
      (entry) => entry.listener === listener,
    );
    if (existing) return;
    this.listeners.add({
      listener,
      once: typeof options === "object" && options.once === true,
    });
  }

  removeEventListener(type: string, listener: MiniappAbortListener | null) {
    if (type !== "abort" || !listener) return;
    for (const entry of this.listeners)
      if (entry.listener === listener) this.listeners.delete(entry);
  }

  dispatchEvent(event: MiniappAbortEvent) {
    this.onabort?.(event);
    for (const entry of [...this.listeners]) {
      if (typeof entry.listener === "function") entry.listener(event);
      else entry.listener.handleEvent(event);
      if (entry.once) this.listeners.delete(entry);
    }
    return true;
  }

  throwIfAborted() {
    if (this.aborted) throw this.reason;
  }

  abort(reason: unknown = abortError()) {
    if (this.aborted) return;
    this.aborted = true;
    this.reason = reason;
    const event: MiniappAbortEvent = {
      type: "abort",
      target: this,
      currentTarget: this,
    };
    this.dispatchEvent(event);
  }
}

class MiniappAbortController {
  readonly signal = new MiniappAbortSignal();

  abort(reason?: unknown) {
    this.signal.abort(reason);
  }
}

/** Install only standard cancellation primitives required by Query Core and absent in WEAPP. */
export function installAbortControllerPolyfill(
  runtime: AbortRuntime = globalThis,
): boolean {
  if (
    typeof runtime.AbortController === "function" &&
    typeof runtime.AbortSignal === "function"
  )
    return false;
  runtime.AbortController =
    MiniappAbortController as unknown as typeof globalThis.AbortController;
  runtime.AbortSignal =
    MiniappAbortSignal as unknown as typeof globalThis.AbortSignal;
  return true;
}
