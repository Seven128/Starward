/** Transport only. Authorization, atomic schedule claiming and approved content
 * mapping belong to the reminder owner, before calling this adapter.
 * No production worker enables this adapter until those boundaries are wired. */
export interface WechatSubscriptionSenderConfig {
  enabled: boolean;
  templateId: string;
  fieldNames: readonly string[];
  miniprogramState: "developer" | "trial" | "formal";
}

export type WechatSubscriptionSendResult =
  | { state: "NOT_ATTEMPTED"; reason: "DISABLED" | "INVALID_PAYLOAD" | "TOKEN_UNAVAILABLE" }
  | { state: "ACCEPTED" }
  | { state: "REJECTED"; errorCode: number }
  | { state: "UNKNOWN" };

export interface WechatSubscriptionPayload {
  recipient: string;
  page: string;
  data: Readonly<Record<string, { value: string }>>;
}

export class WechatSubscriptionSender {
  private readonly config: WechatSubscriptionSenderConfig;
  constructor(
    config: WechatSubscriptionSenderConfig,
    private readonly getAccessToken: (signal: AbortSignal) => Promise<string>,
    private readonly transport: typeof fetch = fetch,
    private readonly timeoutMs = 4_000,
  ) {
    this.config = { ...config, fieldNames: Array.isArray(config.fieldNames) ? [...config.fieldNames] : [] };
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("wechat_subscription_timeout_invalid");
  }

  async send(input: WechatSubscriptionPayload): Promise<WechatSubscriptionSendResult> {
    if (this.config.enabled !== true) return { state: "NOT_ATTEMPTED", reason: "DISABLED" };
    if (!input || typeof input !== "object") return { state: "NOT_ATTEMPTED", reason: "INVALID_PAYLOAD" };
    const { templateId, fieldNames, miniprogramState } = this.config;
    // Exact field membership is a configuration boundary, not permission to
    // invent a template or infer that its text has been commercially approved.
    if (typeof templateId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/u.test(templateId)
      || !["developer", "trial", "formal"].includes(miniprogramState)
      || !fieldNames.length || fieldNames.length > 20 || new Set(fieldNames).size !== fieldNames.length
      || !fieldNames.every(name => typeof name === "string" && /^[a-z]+[1-9][0-9]*$/u.test(name))
      || typeof input.recipient !== "string" || !/^[A-Za-z0-9_-]{1,128}$/u.test(input.recipient)
      || typeof input.page !== "string" || !/^(?:pages|content)\/[A-Za-z0-9/_-]+(?:\?[^\s#]*)?$/u.test(input.page)
      || input.page.length > 1024
      || !input.data || typeof input.data !== "object" || Array.isArray(input.data) || Object.keys(input.data).length !== fieldNames.length
      || !fieldNames.every(name => Object.hasOwn(input.data, name) && typeof input.data[name]?.value === "string"
        && input.data[name]!.value.length > 0 && input.data[name]!.value.length <= 512))
      return { state: "NOT_ATTEMPTED", reason: "INVALID_PAYLOAD" };
    // Snapshot before token acquisition; caller mutation must not change the send.
    const body = JSON.stringify({ touser: input.recipient, template_id: templateId,
      page: input.page, miniprogram_state: miniprogramState, lang: "zh_CN",
      data: Object.fromEntries(fieldNames.map(name => [name, { value: input.data[name]!.value }])) });
    const controller = new AbortController();
    let attempted = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const uncertain = (): WechatSubscriptionSendResult => attempted ? { state: "UNKNOWN" }
      : { state: "NOT_ATTEMPTED", reason: "TOKEN_UNAVAILABLE" };
    try {
      return await Promise.race([
        (async (): Promise<WechatSubscriptionSendResult> => {
          const token = await this.getAccessToken(controller.signal);
          if (controller.signal.aborted || typeof token !== "string" || !/^[A-Za-z0-9_-]{1,2048}$/u.test(token)) return uncertain();
          const url = new URL("https://api.weixin.qq.com/cgi-bin/message/subscribe/send");
          url.searchParams.set("access_token", token);
          attempted = true;
          const response = await this.transport(url, { method: "POST", redirect: "error",
            headers: { "content-type": "application/json" }, body, signal: controller.signal });
          if (!response.ok) return { state: "UNKNOWN" };
          const result: unknown = await response.json();
          if (!result || typeof result !== "object" || !("errcode" in result)
            || !Number.isSafeInteger(result.errcode)) return { state: "UNKNOWN" };
          if (result.errcode === 0) return { state: "ACCEPTED" };
          return { state: "REJECTED", errorCode: result.errcode as number };
        })(),
        new Promise<WechatSubscriptionSendResult>(resolve => {
          timer = setTimeout(() => { controller.abort(); resolve(uncertain()); }, this.timeoutMs);
        }),
      ]);
    } catch {
      // Never expose the token URL, recipient, template contents or raw errmsg.
      return uncertain();
    } finally {
      if (timer) clearTimeout(timer);
      controller.abort();
    }
  }
}
