import type { ReminderSubscriptionPrepareData, ReminderSubscriptionReportRequest } from "@starward/miniapp-contracts";

type Choice = ReminderSubscriptionReportRequest["choice"];
type Challenge = Extract<ReminderSubscriptionPrepareData, { state: "READY" }>;
export type PlanSubscriptionState =
  | { phase: "preparing" | "prompting" | "reporting"; detail: string }
  | { phase: "ready"; detail: string }
  | { phase: "unavailable" | "complete"; detail: string }
  | { phase: "failed"; detail: string; retry: "prepare" | "report" };

/** One open reminder dialog owns the challenge and native choice. No persisted authorization claims. */
export function createPlanSubscriptionFlow(deps: {
  owner: string;
  planId: string;
  reminderId: string;
  scheduleVersion: string;
  currentUser(): string | null;
  now(): number;
  prepare(owner: string, planId: string, reminderId: string): Promise<{ data: ReminderSubscriptionPrepareData }>;
  report(owner: string, challengeId: string, choice: Choice): Promise<{ data: { recorded: boolean } }>;
  requestSubscribeMessage(options: { tmplIds: [string] }): Promise<unknown>;
  changed(state: PlanSubscriptionState): void;
}) {
  let active = true, busy = false;
  let challenge: Challenge | null = null;
  let pendingChoice: Choice | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  const clearExpiry = () => { clearTimeout(expiryTimer); expiryTimer = undefined; };
  const current = () => active && deps.currentUser() === deps.owner;
  const publish = (state: PlanSubscriptionState) => { if (current()) deps.changed(state); };
  const valid = () => challenge && Date.parse(challenge.expiresAt) > deps.now();
  const fail = (detail: string, retry: "prepare" | "report" = "prepare") => publish({ phase: "failed", detail, retry });

  async function prepare() {
    if (!current() || busy) return;
    busy = true; clearExpiry(); challenge = null; pendingChoice = null;
    publish({ phase: "preparing", detail: "正在准备本组微信授权…" });
    try {
      const { data } = await deps.prepare(deps.owner, deps.planId, deps.reminderId);
      if (!current()) return;
      if (data.state === "UNAVAILABLE") {
        publish({ phase: "unavailable", detail: data.reason === "NOT_CONFIGURED"
          ? "微信通知当前不可开通，清单仍可使用。" : "本组提醒当前不能授权，请核对出发时间与通知意向。" });
        return;
      }
      if (data.scheduleVersion !== deps.scheduleVersion || typeof data.challengeId !== "string" || !data.challengeId ||
        typeof data.templateId !== "string" || !/^[\w-]{1,256}$/u.test(data.templateId) ||
        !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= deps.now()) {
        fail("提醒或授权准备已变化，请刷新计划状态后再试。");
        return;
      }
      challenge = data;
      expiryTimer = setTimeout(() => {
        // An already dispatched native prompt/report cannot be cancelled. Its result remains server-validated.
        if (!busy && current()) { challenge = null; pendingChoice = null; fail("授权准备已过期，请重新准备后再点击授权。"); }
      }, Math.min(Date.parse(data.expiresAt) - deps.now(), 2_147_483_647));
      publish({ phase: "ready", detail: "点击下方按钮完成本组授权；授权不代表通知已发送。" });
    } catch {
      fail("暂时无法准备授权，可重试；提醒与清单保持不变。");
    } finally { busy = false; }
  }

  async function reportChoice() {
    if (!current() || !challenge || !pendingChoice) return;
    if (!valid()) { fail("授权确认已过期，请重新准备并核对计划状态。"); return; }
    publish({ phase: "reporting", detail: "正在确认本次授权选择…" });
    try {
      const { data } = await deps.report(deps.owner, challenge.challengeId, pendingChoice);
      if (!current()) return;
      if (!data.recorded) {
        fail("本次授权选择未获确认，请刷新计划状态后重新准备。");
        return;
      }
      publish({ phase: "complete", detail: pendingChoice === "accept"
        ? "已记录本次授权选择；通知状态以计划记录为准，不代表已发送或收到。"
        : "已记录本次未授权选择，清单仍可使用。" });
      challenge = null; pendingChoice = null;
      clearExpiry();
    } catch {
      fail("本次授权选择尚未确认，可重试确认；不会再次弹出授权。", "report");
    }
  }

  // Deliberately synchronous until the native call: awaiting prepare here loses the WeChat user gesture.
  function authorize() {
    if (!current() || busy || !challenge || pendingChoice) return;
    if (!valid()) { challenge = null; fail("授权准备已过期，请重新准备后再点击授权。"); return; }
    busy = true;
    let request: Promise<unknown>;
    try { request = deps.requestSubscribeMessage({ tmplIds: [challenge.templateId] }); }
    catch { busy = false; challenge = null; fail("微信授权未完成，可重新准备后再试。"); return; }
    publish({ phase: "prompting", detail: "请在微信弹窗中选择；清单内容不受影响。" });
    void (async () => {
      try {
        const response = await request;
        if (!current()) return;
        const choice = response && typeof response === "object" && !Array.isArray(response)
          ? (response as Record<string, unknown>)[challenge!.templateId] : undefined;
        if (choice !== "accept" && choice !== "reject" && choice !== "ban" && choice !== "filter") {
          challenge = null; fail("微信未返回本组授权选择，可重新准备；尚未记录授权。"); return;
        }
        pendingChoice = choice;
        await reportChoice();
      } catch { challenge = null; fail("微信授权未完成，可重新准备；尚未记录授权。"); }
      finally { busy = false; }
    })();
  }

  async function retryReport() {
    if (!current() || busy || !pendingChoice) return;
    busy = true;
    try { await reportChoice(); } finally { busy = false; }
  }
  return { prepare, authorize, retryReport, dispose() { active = false; clearExpiry(); challenge = null; pendingChoice = null; } };
}
