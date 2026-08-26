const transientConnectionCodes = new Set([
  "57P03",
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
]);

const defaultWait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function safeErrorCode(error) {
  const code = typeof error?.code === "string" ? error.code : "UNKNOWN";
  return /^[A-Z0-9_]+$/u.test(code) ? code : "UNKNOWN";
}

export async function connectResourceWithRetry({
  label,
  create,
  connect,
  close,
  timeoutMs = 30_000,
  retryDelayMs = 250,
  now = Date.now,
  wait = defaultWait,
}) {
  if (!/^[a-z0-9_-]+$/u.test(label ?? ""))
    throw new Error("infrastructure_connection_label_invalid");
  if (![create, connect, close, now, wait].every((value) => typeof value === "function"))
    throw new Error(`${label}_connection_callbacks_invalid`);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000)
    throw new Error(`${label}_connection_timeout_invalid`);
  if (!Number.isInteger(retryDelayMs) || retryDelayMs < 10 || retryDelayMs > 5_000)
    throw new Error(`${label}_connection_retry_delay_invalid`);

  const deadline = now() + timeoutMs;
  let lastCode = "UNKNOWN";
  do {
    const resource = create();
    try {
      await connect(resource);
      return resource;
    } catch (error) {
      lastCode = safeErrorCode(error);
      await close(resource).catch(() => {});
      if (!transientConnectionCodes.has(lastCode))
        throw new Error(`${label}_connect_failed:${lastCode}`);
    }
    if (now() >= deadline) break;
    await wait(retryDelayMs);
  } while (now() < deadline);

  throw new Error(`${label}_start_timeout:${lastCode}`);
}
