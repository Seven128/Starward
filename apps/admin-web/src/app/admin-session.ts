export interface AdminSession {
  readonly token: string;
  readonly actor: string;
  readonly generation: number;
}

export class AdminSessionRetired extends Error {
  constructor() { super("管理员会话已变化，请在当前会话重新读取。"); }
}

/** Identity is an instance, not just a token: A -> logout -> A retires old work. */
export function createAdminSessionOwner() {
  let generation = 0;
  let current: AdminSession | null = null;
  const isCurrent = (session: AdminSession) => current === session;
  const assertCurrent = (session: AdminSession) => {
    if (!isCurrent(session)) throw new AdminSessionRetired();
  };
  return {
    begin(token: string): AdminSession {
      current = Object.freeze({ token, actor: "", generation: ++generation });
      return current;
    },
    confirm(session: AdminSession, actor: string): AdminSession {
      assertCurrent(session);
      if (!/^admin:[A-Za-z0-9._-]{1,64}$/u.test(actor)) throw new Error("服务端未返回有效管理员身份。");
      current = Object.freeze({ ...session, actor });
      return current;
    },
    isCurrent,
    assertCurrent,
    retire() { current = null; ++generation; },
    async read<T>(session: AdminSession, operation: () => Promise<T>) {
      assertCurrent(session);
      const result = await operation();
      assertCurrent(session);
      return result;
    },
  };
}

export interface AdminCommandInput {
  readonly label: string;
  readonly path: string;
  readonly body: Record<string, unknown>;
}
export interface AdminCommandAttempt<T extends AdminCommandInput> {
  readonly input: T;
  readonly session: AdminSession;
  readonly idempotencyKey: string;
  readonly wireBody: string;
}

/** One unresolved effect at a time. Readback failure keeps the exact command. */
export function createAdminCommandOwner<T extends AdminCommandInput>(
  sessionOwner: ReturnType<typeof createAdminSessionOwner>,
  newKey: () => string,
) {
  const attempts = new Map<string, AdminCommandAttempt<T>>();
  const running = new Set<AdminCommandAttempt<T>>();
  const outcomes = new WeakMap<AdminCommandAttempt<T>, { unresolved: boolean; receipt: Record<string, unknown> | null }>();
  const scope = (session: AdminSession) => JSON.stringify([session.actor, session.token]);
  return {
    pending(session: AdminSession) {
      return sessionOwner.isCurrent(session) ? attempts.get(scope(session)) ?? null : null;
    },
    begin(session: AdminSession, input: T): AdminCommandAttempt<T> {
      sessionOwner.assertCurrent(session);
      if (attempts.has(scope(session))) throw new Error("请先核对或重试上一笔未确认操作；重试会保留原输入和操作标识。");
      const idempotencyKey = newKey();
      const wireBody = JSON.stringify({ ...input.body, idempotencyKey });
      const frozen = { ...input, body: JSON.parse(wireBody) };
      const attempt = Object.freeze({ input: frozen as T, session, idempotencyKey, wireBody });
      attempts.set(scope(session), attempt);
      outcomes.set(attempt, { unresolved: false, receipt: null });
      running.add(attempt);
      return attempt;
    },
    retry(session: AdminSession) {
      sessionOwner.assertCurrent(session);
      const previous = attempts.get(scope(session));
      if (!previous || (previous.session === session && running.has(previous))) return null;
      const outcome = outcomes.get(previous)!;
      outcome.unresolved = true;
      // Explicit recovery after reauthentication to the same credential keeps the
      // command bytes, but installs a new result lifetime. Old callbacks stay retired.
      const attempt = previous.session === session ? previous : Object.freeze({ ...previous, session });
      attempts.set(scope(session), attempt);
      outcomes.set(attempt, outcome);
      running.add(attempt);
      return attempt;
    },
    hasUnresolvedOutcome(attempt: AdminCommandAttempt<T>) {
      return outcomes.get(attempt)?.unresolved ?? false;
    },
    knownReceipt(attempt: AdminCommandAttempt<T>) {
      return outcomes.get(attempt)?.receipt ?? undefined;
    },
    recordCommitted(attempt: AdminCommandAttempt<T>, receipt: Record<string, unknown>) {
      sessionOwner.assertCurrent(attempt.session);
      const outcome = outcomes.get(attempt)!;
      outcome.unresolved = true;
      outcome.receipt = structuredClone(receipt);
    },
    settle(attempt: AdminCommandAttempt<T>, confirmed: boolean) {
      running.delete(attempt);
      if (!confirmed) outcomes.get(attempt)!.unresolved = true;
      if (confirmed && sessionOwner.isCurrent(attempt.session) && attempts.get(scope(attempt.session)) === attempt)
        attempts.delete(scope(attempt.session));
    },
  };
}
