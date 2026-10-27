type RuntimeErrorKind = "request" | "query" | "mutation" | "render" | "native" | "runtime" | "image";
type RuntimeErrorContext = { stage?: string; resource?: string; status?: number };
const reported = new WeakSet<object>();

/** Console only: no persistence, telemetry, raw native text, request keys or
 * bodies. One Error can cross transport/Query/global boundaries without being
 * printed repeatedly; a new failed attempt still has its own Error identity. */
export function reportRuntimeError(kind: RuntimeErrorKind, code: string, error?: unknown,
  context: RuntimeErrorContext = {}): void {
  if (error && (typeof error === "object" || typeof error === "function")) {
    if (reported.has(error)) return;
    reported.add(error);
  }
  const detail: Record<string, string | number> = {
    code: /^[a-z][a-z0-9_]{0,159}$/.test(code) ? code : "runtime_error",
  };
  for (const field of ["stage", "resource"] as const) {
    const value = context[field];
    if (value && /^[A-Za-z0-9_:.-]{1,160}$/.test(value)) detail[field] = value;
  }
  const status = context.status;
  if (typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599)
    detail.http = status;
  if (code === 'raster_image_budget_busy') {
    // One terminal resource-admission sample, never paths, keys or a graph.
    // This distinguishes pinned/read files from failed deletion and bytes.
    for (const field of ['entries', 'readyBytes', 'activeDownloads', 'queued', 'nativePins',
      'failedRemovals', 'activeReaders', 'physicalFiles'] as const) {
      try {
        const value = (error as { budget?: Record<string, unknown> } | null)?.budget?.[field];
        if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) detail[field] = value;
      } catch { /* Untrusted native getters cannot break failure recovery. */ }
    }
  }
  const causes = [error];
  try { causes.push((error as { cause?: unknown } | null)?.cause); } catch { /* Host getter. */ }
  for (const source of causes) for (const field of ["errno", "errCode"] as const) {
    try {
      const value = (source as Record<string, unknown> | null)?.[field];
      if (typeof value === "number" && Number.isSafeInteger(value) && Math.abs(value) <= 1_000_000_000)
        detail[field] = value;
    } catch { /* Native getters are untrusted; diagnostics stay independent. */ }
  }
  try {
    const message = (error as { message?: unknown } | null)?.message;
    const gl = typeof message === "string" && /^sky_gpu_draw_failed:(\d{1,5})$/.exec(message);
    if (gl) detail.gl = Number(gl[1]);
  } catch { /* Never copy arbitrary native messages or stack traces. */ }
  try { console.error(kind === "image" ? "[sky-image]" : `[starward-${kind}]`, detail); }
  catch { /* Logging cannot break recovery, cleanup or request settlement. */ }
}
