/** Server-only stable token cache. No force-refresh, token logging or send retry.
 * Stable tokens let independent workers refresh without invalidating each other. */
export class WechatAccessTokenProvider {
  private cached: { token: string; expiresAt: number } | null = null;
  constructor(private readonly appId: string, private readonly appSecret: string,
    private readonly transport: typeof fetch = fetch, private readonly clock = Date.now) {}

  invalidate(token: string): void {
    // A late rejection of an old token cannot erase a newer cached token.
    if (this.cached?.token === token) this.cached=null;
  }

  async get(signal: AbortSignal): Promise<string> {
    if (signal.aborted) throw new Error("wechat_token_unavailable");
    if (this.cached && this.cached.expiresAt > this.clock()) return this.cached.token;
    // The caller owns the deadline/abort. Credentials exist only in the HTTPS
    // body; redirects and raw response/error details must never escape.
    try {
      const response = await this.transport("https://api.weixin.qq.com/cgi-bin/stable_token", {
        method: "POST", redirect: "error", signal, headers: { "content-type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credential", appid: this.appId,
          secret: this.appSecret, force_refresh: false }),
      });
      if (!response.ok || signal.aborted) throw new Error();
      const result: unknown = await response.json();
      if (signal.aborted || !result || typeof result !== "object" || !("access_token" in result) || !("expires_in" in result)
        || typeof result.access_token !== "string" || !/^[A-Za-z0-9_-]{1,2048}$/u.test(result.access_token)
        || !Number.isSafeInteger(result.expires_in) || Number(result.expires_in) <= 60
        || Number(result.expires_in) > 7200 || ("errcode" in result && result.errcode !== 0)) throw new Error();
      this.cached = { token: result.access_token, expiresAt: this.clock() + (Number(result.expires_in) - 60) * 1000 };
      return result.access_token;
    } catch { throw new Error("wechat_token_unavailable"); }
  }
}
