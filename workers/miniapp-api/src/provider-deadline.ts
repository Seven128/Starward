export const WEATHER_DEADLINES = Object.freeze({ requestMs: 6_000, overallMs: 6_500, mapBudgetMs: 7_500 });

/** Covers both headers and body; the deadline works even if an injected
 * transport ignores AbortSignal. Always removes its timer and parent listener. */
export async function withDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parent?: AbortSignal | null,
): Promise<T> {
  parent?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(parent?.reason);
  parent?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("weather_deadline_exceeded")), timeoutMs);
  try {
    return await waitForCaller(Promise.resolve().then(() => operation(controller.signal)), controller.signal);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", abort);
  }
}

/** Cancelling one waiter must not cancel a public computation shared by others. */
export async function waitForCaller<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work;
  if (signal.aborted) {
    // Work may already have started before the waiter was attached.
    void work.catch(() => {});
    signal.throwIfAborted();
  }
  let abort: () => void = () => {};
  const cancelled = new Promise<never>((_resolve, reject) => {
    abort = () => reject(signal.reason ?? new Error("request_aborted"));
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([work, cancelled]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
