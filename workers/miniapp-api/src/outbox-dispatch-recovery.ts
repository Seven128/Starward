import type { Pool } from "pg";

interface QueueHandleReader {
  getJob(eventId: string): Promise<unknown>;
}

type HandleState = "absent" | "failed" | "retained";

interface DispatchedEvent {
  event_id: string;
  event_type: string;
  payload: unknown;
  // Keep PostgreSQL's full timestamp precision for the dispatch-generation CAS.
  dispatched_at: string | null;
}

/** Read failures/timeouts are unknown, never proof that a job disappeared. */
export class OutboxQueueHandleProbe {
  private pending: Promise<unknown> | null = null;

  constructor(
    private readonly queues: readonly QueueHandleReader[],
    private readonly timeoutMs = 5_000,
  ) {
    if (queues.length === 0) throw new Error("outbox_queue_probe_requires_queue");
  }

  async absent(eventId: string): Promise<boolean> {
    return await this.inspect(eventId) === "absent";
  }

  async inspect(eventId: string, includeFailed = false): Promise<HandleState> {
    // A timed-out Redis read may still be queued in the client's connection.
    // Keep one in flight until it settles instead of adding reads every cycle.
    if (this.pending) throw new Error("outbox_queue_probe_pending");
    const reads = this.queues.map(queue => Promise.resolve().then(async (): Promise<HandleState> => {
      const job = await queue.getJob(eventId);
      if (job === undefined) return "absent";
      if (includeFailed && typeof job === "object" && job !== null
        && "getState" in job && typeof job.getState === "function"
        && await job.getState() === "failed") return "failed";
      return "retained";
    }));
    // One queue can fail while another read remains pending. Ownership ends
    // only after all reads settle, even though the failure is reported early.
    const pending = Promise.allSettled(reads);
    this.pending = pending;
    void pending.finally(() => {
      if (this.pending === pending) this.pending = null;
    }).catch(() => {});
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const jobs = await Promise.race([
        Promise.all(reads),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("outbox_queue_probe_timeout")), this.timeoutMs);
        }),
      ]);
      // Failed is only affirmative when every existing handle is terminal.
      // State reads share this probe's timeout and in-flight ownership, so a
      // pending/failed read never becomes absence or permission to retire.
      if (jobs.every(state => state === "absent")) return "absent";
      return jobs.every(state => state !== "retained") ? "failed" : "retained";
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}

/** Reconcile only the transactional, non-notification outbox consumers. */
export class OutboxDispatchRecovery {
  private cursor: string | null = null;

  constructor(
    private readonly pool: Pick<Pool, "connect" | "query">,
    private readonly probe: OutboxQueueHandleProbe,
    private readonly isNotification: (event: Pick<DispatchedEvent, "event_type" | "payload">) => boolean,
    private readonly canRetireFailedHandle: (event: Pick<DispatchedEvent, "event_type" | "payload">) => boolean = () => false,
  ) {}

  async recoverBatch(limit = 50): Promise<number> {
    const candidates = await this.pool.query<DispatchedEvent>(
      `SELECT event_id::text, event_type, payload, dispatched_at::text
         FROM outbox_events
        WHERE state = 'DISPATCHED' AND ($1::uuid IS NULL OR event_id > $1::uuid)
        ORDER BY event_id
        LIMIT $2`,
      [this.cursor, limit],
    );
    let recovered = 0;
    for (const event of candidates.rows) {
      if (this.isNotification(event)) continue;
      const handleState = await this.probe.inspect(event.event_id, this.canRetireFailedHandle(event));
      if (handleState === "retained") continue;
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const owned = await client.query<DispatchedEvent>(
          `SELECT event_id::text, event_type, payload, dispatched_at::text
             FROM outbox_events
            WHERE event_id = $1 AND state = 'DISPATCHED'
              AND dispatched_at IS NOT DISTINCT FROM $2::timestamptz
            FOR UPDATE SKIP LOCKED`,
          [event.event_id, event.dispatched_at],
        );
        if (owned.rows[0] && !this.isNotification(owned.rows[0])) {
          if (handleState === "failed") {
            if (this.canRetireFailedHandle(owned.rows[0]))
              await client.query(
                `UPDATE outbox_events SET state='DEAD_LETTER',last_error_code='OUTBOX_CONTINUATION_QUEUE_FAILED'
                  WHERE event_id=$1 AND state='DISPATCHED'
                    AND dispatched_at IS NOT DISTINCT FROM $2::timestamptz`,
                [event.event_id, event.dispatched_at],
              );
            // Preserve the exact failed handle and remaining media intents for
            // existing manual replay. Do not silently reset a failure budget.
            await client.query("COMMIT");
            continue;
          }
          // Every dispatcher holds this row lock while adding the Redis job
          // and renews dispatched_at. An intervening dispatch either still
          // owns the lock or changed the generation above. Thus the positive
          // absence check stays outside DB locks, including during Redis loss.
          const changed = await client.query(
            `UPDATE outbox_events
                SET state = 'PENDING', available_at = now(), dispatched_at = NULL,
                    last_error_code = 'OUTBOX_QUEUE_HANDLE_RECOVERED'
              WHERE event_id = $1 AND state = 'DISPATCHED'
                AND dispatched_at IS NOT DISTINCT FROM $2::timestamptz`,
            [event.event_id, event.dispatched_at],
          );
          recovered += changed.rowCount ?? 0;
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    // Traverse the whole dispatched set in bounded pages: a permanently
    // retained/unknown first-page handle cannot starve a later missing job.
    this.cursor = candidates.rows.length < limit ? null : candidates.rows.at(-1)!.event_id;
    return recovered;
  }
}
