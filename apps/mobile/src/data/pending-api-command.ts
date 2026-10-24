export interface PendingCommandStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export type CommandInput<C> = C extends { idempotencyKey: string } ? Omit<C, "idempotencyKey"> : never;

/** One app-instance owner for an uncertain API command. HTTP/domain/readback stay with the client. */
export function createPendingApiCommand<C extends { idempotencyKey: string }, T>(options: {
  storage: PendingCommandStorage;
  storageKey: string;
  newKey(): string;
  parse(value: unknown): C;
  /** Domain qualification runs only for a new frozen intent, before durable
   * storage and dispatch. Retry never retrofits a later authority. */
  prepare?(command: C): Promise<C>;
  error(reason: "save_in_progress" | "pending_requires_retry" | "pending_missing"): Error;
  dispatch(command: C, retry: boolean): Promise<T>;
  canDiscard(error: unknown, retry: boolean): boolean;
}) {
  let inFlight: Promise<T> | null = null, inFlightInput: string | null = null;
  const pending = async () => {
    const raw = await options.storage.getItem(options.storageKey);
    return raw === null ? null : options.parse(JSON.parse(raw));
  };
  const send = async (command: C, retry: boolean) => {
    let result: T;
    try { result = await options.dispatch(command, retry); }
    catch (error) {
      if (options.canDiscard(error, retry)) await options.storage.removeItem(options.storageKey);
      throw error;
    }
    // Dispatch only resolves after authoritative current readback. Cleanup
    // failure leaves a safe exact retry, not permission to create a new effect.
    try { await options.storage.removeItem(options.storageKey); } catch { /* A future retry reconciles it. */ }
    return result;
  };
  const execute = (identity: string, work: () => Promise<T>) => {
    if (inFlight) return identity === "retry" || identity === inFlightInput ? inFlight : Promise.reject(options.error("save_in_progress"));
    const task = work(); inFlight = task; inFlightInput = identity;
    void task.finally(() => { if (inFlight === task) { inFlight = null; inFlightInput = null; } }).catch(() => undefined);
    return task;
  };
  return {
    pending,
    command: (input: CommandInput<C>) => {
      const serialized = JSON.stringify(input);
      // Both intent and retry key are captured before the first asynchronous
      // storage read. Mutating a form or a context cannot retarget this attempt.
      const command = { ...JSON.parse(serialized), idempotencyKey: options.newKey() } as C;
      return execute(serialized, async () => {
        if (await pending()) throw options.error("pending_requires_retry");
        const prepared = options.prepare ? await options.prepare(command) : command;
        await options.storage.setItem(options.storageKey, JSON.stringify(prepared));
        return send(prepared, false);
      });
    },
    retry: () => execute("retry", async () => {
      const command = await pending();
      if (!command) throw options.error("pending_missing");
      return send(command, true);
    }),
  };
}
