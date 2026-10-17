export type SystemMotion = "unknown" | "no-preference" | "reduce";
export type MotionQuery = (receive: (rows: unknown) => void) => void;

/** Native px sentinels distinguish a supported normal result from no match. */
export function readSystemMotion(rows: unknown): SystemMotion {
  if (!Array.isArray(rows) || rows.length !== 3) return "unknown";
  const widths = rows.map(row => row && typeof row === "object" ? (row as { width?: unknown }).width : undefined);
  if (widths.some(width => typeof width !== "number" || !Number.isFinite(width))) return "unknown";
  if (widths[0] !== 29) return "unknown";
  if (widths[1] === 11 && widths[2] === 1) return "no-preference";
  if (widths[1] === 1 && widths[2] === 17) return "reduce";
  return "unknown";
}

export function effectiveReducedMotion(accountPreference: boolean, system: SystemMotion): boolean {
  // Until a valid normal read, missing/failed native input stays quiet.
  return accountPreference || system !== "no-preference";
}

/** One visible page owns bounded native reads; no account data or polling loop. */
export function createSystemMotionReader(publish: (value: SystemMotion) => void, clock = {
  later: (run: () => void, delay: number) => setTimeout(run, delay),
  cancel: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
}) {
  let generation = 0;
  let current: { owner: string; generation: number } | undefined;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const cancel = () => {
    current = undefined;
    for (const timer of timers) clock.cancel(timer);
    timers.clear();
  };
  const later = (run: () => void, delay: number) => {
    const timer = clock.later(() => { timers.delete(timer); run(); }, delay);
    timers.add(timer);
    return timer;
  };
  return {
    start(owner: string, query: MotionQuery) {
      cancel();
      const ticket = { owner, generation: ++generation };
      current = ticket;
      publish("unknown");
      let sample = 0;
      const read = () => {
        if (current !== ticket) return;
        const sequence = ++sample;
        let settled = false;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const finish = (value: SystemMotion) => {
          if (settled || current !== ticket || sample !== sequence) return;
          settled = true;
          if (timeout !== undefined) { clock.cancel(timeout); timers.delete(timeout); }
          publish(value);
        };
        timeout = later(() => finish("unknown"), 700);
        try { query(rows => finish(readSystemMotion(rows))); }
        catch { finish("unknown"); }
      };
      for (const delay of [0, 250, 1000, 2500]) later(read, delay);
      return () => {
        if (current === ticket) { cancel(); publish("unknown"); }
      };
    },
  };
}
