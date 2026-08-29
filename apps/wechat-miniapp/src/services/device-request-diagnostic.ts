export type DeviceFailureStage = "transport" | "http" | "watchdog" | "dispatch" | "contract";

type FailureCategory = "domain" | "tls" | "dns" | "timeout" | "connection" | "http" | "unknown";

function numericCode(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && Math.abs(value) <= 1_000_000_000
    ? value : null;
}

function category(message: string): FailureCategory {
  // Inspect only a bounded platform error summary, never URL/query/header suffixes.
  const summary = message.slice(0, 300).split(/https?:\/\/|[\r\n?]/iu)[0] ?? "";
  if (/url not in domain list|domain list|不在.*合法域名/iu.test(summary)) return "domain";
  if (/ssl|tls|certificate|cert_|证书/iu.test(summary)) return "tls";
  if (/name_not_resolved|name resolution|dns|resolve host/iu.test(summary)) return "dns";
  if (/time.?out|timed out|超时/iu.test(summary)) return "timeout";
  if (/connection|connect fail|network.*(?:unreachable|unavailable)|internet_disconnected/iu.test(summary)) return "connection";
  return "unknown";
}

/** Fixed diagnostic labels only. Never retain the supplied error or request data. */
export function deviceFailureSummary(stage: DeviceFailureStage, error?: unknown, status?: number): string {
  let label: FailureCategory = stage === "http" ? "http" : stage === "watchdog" ? "timeout" : "unknown";
  let errno: number | null = null;
  let errCode: number | null = null;
  try {
    if (error && typeof error === "object") {
      const value = error as { errMsg?: unknown; message?: unknown; errno?: unknown; errCode?: unknown };
      const message = typeof value.errMsg === "string" ? value.errMsg : value.message;
      if (typeof message === "string" && stage !== "http" && stage !== "watchdog") label = category(message);
      errno = numericCode(value.errno);
      errCode = numericCode(value.errCode);
    }
  } catch { /* Host objects can have throwing getters; diagnostics stay non-authoritative. */ }
  return ["DEVICE_REQUEST_DIAGNOSTIC_V1", `stage=${stage}`, `category=${label}`,
    `errno=${errno ?? "none"}`, `errCode=${errCode ?? "none"}`,
    `http=${typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599 ? status : "none"}`].join("\n");
}

/** One modal per JS runtime; never await it in the transport or queue more dialogs. */
export function createDeviceFailureReporter(present: (content: string) => unknown) {
  let reported = false;
  return (stage: DeviceFailureStage, error?: unknown, status?: number): void => {
    if (reported) return;
    reported = true;
    try {
      void Promise.resolve(present(deviceFailureSummary(stage, error, status))).catch(() => {});
    } catch { /* A diagnostic presentation failure must not affect the request. */ }
  };
}
