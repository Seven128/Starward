import type { AdminCommandJournal, BoundAdminJournal, JournalEntry } from "./admin-command-journal";

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
  readonly check: AdminCommandCheck;
}
export type AdminCommandCheck =
  | { kind: "case-state"; caseId: string; states: string[] }
  | { kind: "media-decision"; mediaId: string; state: string }
  | { kind: "case-merged"; caseId: string }
  | { kind: "publication-assessment"; spotId: string }
  | { kind: "spot-state"; spotId: string; states: string[] }
  | { kind: "replacement"; spotId: string };
export interface AdminCommandAttempt<T extends AdminCommandInput> {
  readonly input: T;
  readonly session: AdminSession;
  readonly idempotencyKey: string;
  readonly wireBody: string;
  readonly entryId: string;
}
const committedStatus = (value: unknown) => typeof value === "string" && (value === "COMMITTED" || value === "REPLAYED");

function validateEntry(entry: JournalEntry, session: AdminSession) {
  try {
    const { input, idempotencyKey, wireBody, receipt } = entry;
    if (!input || typeof input.label !== "string" || typeof input.path !== "string" || !input.path.startsWith("/v2/admin/")
      || !input.body || typeof input.body !== "object" || Array.isArray(input.body) || !input.check || typeof idempotencyKey !== "string" || !idempotencyKey
      || typeof wireBody !== "string" || JSON.stringify({ ...input.body, idempotencyKey }) !== wireBody) throw new Error();
    const check = input.check;
    switch (check.kind) {
      case "case-state": if (typeof check.caseId !== "string" || !Array.isArray(check.states) || !check.states.length || !check.states.every(state => typeof state === "string")) throw new Error(); break;
      case "media-decision": if (typeof check.mediaId !== "string" || typeof check.state !== "string") throw new Error(); break;
      case "case-merged": if (typeof check.caseId !== "string") throw new Error(); break;
      case "publication-assessment": case "replacement": if (typeof check.spotId !== "string") throw new Error(); break;
      case "spot-state": if (typeof check.spotId !== "string" || !Array.isArray(check.states) || !check.states.length || !check.states.every(state => typeof state === "string")) throw new Error(); break;
      default: throw new Error();
    }
    if (receipt && (receipt.actorId !== session.actor || receipt.idempotencyKey !== idempotencyKey || !committedStatus(receipt.status))) throw new Error();
  } catch { throw new Error("本机原操作记录格式不可核对，请保留记录并检查服务端结果；不会自动重发。"); }
}

/** One unresolved effect per credential/actor/audience. A committed journal row
 * precedes every first HTTP dispatch; restoration itself never dispatches. */
export function createAdminCommandOwner<T extends AdminCommandInput>(
  sessionOwner: ReturnType<typeof createAdminSessionOwner>,
  newKey: () => string,
  journal: AdminCommandJournal,
) {
  let state: { session: AdminSession; binding: BoundAdminJournal; pending: AdminCommandAttempt<T> | null } | null = null;
  const running = new Set<AdminCommandAttempt<T>>();
  const preparing = new Set<AdminSession>();
  const outcomes = new WeakMap<AdminCommandAttempt<T>, { unresolved: boolean; receipt: Record<string, unknown> | null; cacheFailed: boolean }>();
  const requireState = (session: AdminSession) => {
    sessionOwner.assertCurrent(session);
    if (state?.session !== session) throw new Error("请先重新连接并读取本机操作恢复记录。");
    return state;
  };
  const install = (session: AdminSession, entry: JournalEntry, unresolved: boolean) => {
    validateEntry(entry, session);
    const previous = state?.session === session ? state.pending : null;
    const previousOutcome = previous?.entryId === entry.entryId ? outcomes.get(previous) : null;
    const attempt = Object.freeze({ input: structuredClone(entry.input) as T, session, idempotencyKey: entry.idempotencyKey, wireBody: entry.wireBody, entryId: entry.entryId });
    outcomes.set(attempt, { unresolved, receipt: entry.receipt ?? previousOutcome?.receipt ?? null, cacheFailed: entry.cacheFailureObserved || !!previousOutcome?.cacheFailed });
    return attempt;
  };
  const owner = {
    async restore(session: AdminSession) {
      sessionOwner.assertCurrent(session);
      const binding = await journal.bind(session);
      const entry = await binding.load();
      sessionOwner.assertCurrent(session);
      const pending = entry ? install(session, entry, true) : null;
      state = { session, binding, pending };
      return pending;
    },
    pending(session: AdminSession) {
      return sessionOwner.isCurrent(session) && state?.session === session ? state.pending : null;
    },
    async begin(session: AdminSession, input: T): Promise<AdminCommandAttempt<T>> {
      const active = requireState(session);
      if (active.pending || preparing.has(session)) throw new Error("请先核对或重试上一笔未确认操作；重试会保留原输入和操作标识。");
      preparing.add(session);
      try {
        const idempotencyKey = newKey();
        const wireBody = JSON.stringify({ ...input.body, idempotencyKey });
        const command = { input: { ...structuredClone(input), body: JSON.parse(wireBody) }, idempotencyKey, wireBody };
        // Validate before persisting. There are no closures to lose on restart.
        validateEntry({ ...command, entryId: "pending", receipt: null, cacheFailureObserved: false }, session);
        let entry: JournalEntry;
        try { entry = await active.binding.reserve(command); }
        catch (error) {
          const existing = await active.binding.load();
          if (sessionOwner.isCurrent(session) && state === active && existing && !active.pending) active.pending = install(session, existing, true);
          throw error;
        }
        sessionOwner.assertCurrent(session);
        const attempt = install(session, entry, false);
        active.pending = attempt;
        running.add(attempt);
        return attempt;
      } finally { preparing.delete(session); }
    },
    async retry(session: AdminSession) {
      const active = requireState(session);
      if (preparing.has(session) || active.pending && running.has(active.pending)) return null;
      preparing.add(session);
      try {
        // Re-read across windows. A retired row must never resurrect over a newer one.
        const entry = await active.binding.load();
        sessionOwner.assertCurrent(session);
        if (!entry) { active.pending = null; return null; }
        if (active.pending?.entryId !== entry.entryId) {
          active.pending = install(session, entry, true);
          throw new Error("另一窗口已推进操作记录，已重新显示当前待核对操作；请先核对，再明确重试。");
        }
        const attempt = install(session, entry, true);
        active.pending = attempt;
        running.add(attempt);
        return attempt;
      } finally { preparing.delete(session); }
    },
    hasUnresolvedOutcome(attempt: AdminCommandAttempt<T>) {
      return outcomes.get(attempt)?.unresolved ?? false;
    },
    knownReceipt(attempt: AdminCommandAttempt<T>) {
      return outcomes.get(attempt)?.receipt ?? undefined;
    },
    cacheFailureObserved(attempt: AdminCommandAttempt<T>) {
      return outcomes.get(attempt)?.cacheFailed ?? false;
    },
    async recordCommitted(attempt: AdminCommandAttempt<T>, receipt: Record<string, unknown>, cacheFailed = false) {
      const active = requireState(attempt.session);
      if (receipt.actorId !== attempt.session.actor || receipt.idempotencyKey !== attempt.idempotencyKey || !committedStatus(receipt.status)) throw new Error("回执身份或操作标识不匹配。");
      const outcome = outcomes.get(attempt)!;
      outcome.unresolved = true;
      outcome.receipt = structuredClone(receipt);
      outcome.cacheFailed ||= cacheFailed;
      // Memory keeps a known commit even if this later storage write fails. The
      // original durable attempt stays unresolved; failure cannot mean uncommitted.
      await active.binding.committed(attempt.entryId, receipt, cacheFailed);
      sessionOwner.assertCurrent(attempt.session);
    },
    async settle(attempt: AdminCommandAttempt<T>, confirmed: boolean) {
      try {
        if (!confirmed) outcomes.get(attempt)!.unresolved = true;
        if (confirmed && sessionOwner.isCurrent(attempt.session) && state?.session === attempt.session && state.pending === attempt) {
          if (!await state.binding.clear(attempt.entryId)) throw new Error("另一窗口已推进操作记录，请重新连接核对；未删除当前恢复记录。");
          sessionOwner.assertCurrent(attempt.session);
          if (state?.pending === attempt) state.pending = null;
        }
      } finally { running.delete(attempt); }
    },
    retire() { state = null; running.clear(); preparing.clear(); },
    close() { owner.retire(); journal.close(); },
  };
  return owner;
}
