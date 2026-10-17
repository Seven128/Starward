import type pg from "pg";

/** pg retires the broken idle client before emitting this event. Query
 * rejections still belong to the caller; never retry a transaction here. */
export function handleIdlePoolErrors(pool: pg.Pool, owner: "api" | "worker") {
  let nextDiagnosticAt = 0;
  pool.on("error", (error) => {
    const now = Date.now();
    if (now < nextDiagnosticAt) return;
    nextDiagnosticAt = now + 60_000;
    // Only a SQLSTATE, never the message, client or connection configuration.
    const code = (error as { code?: unknown }).code;
    const sqlState = typeof code === "string" && /^[0-9A-Z]{5}$/u.test(code)
      ? code : "UNKNOWN";
    console.warn(`[miniapp-db] ${owner} idle_connection_error ${sqlState}`);
  });
}
