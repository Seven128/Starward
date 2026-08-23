import { createHmac, randomBytes } from "node:crypto";
import type {
  ApiEnvelope,
  AuthSessionData,
  UserId,
  WechatLoginRequest,
} from "@starward/miniapp-contracts";
import type { MiniappRepositoryPort } from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

interface WechatCodeSessionResponse {
  openid?: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

function envelope<T>(data: T): ApiEnvelope<T> {
  const generatedAt = new Date().toISOString();
  return {
    apiVersion: "v2",
    data,
    dataState: "FRESH",
    generatedAt,
    validAt: generatedAt,
    etag: `W/"auth-${generatedAt}"`,
    sources: [],
    warnings: [],
    requestId: `auth:${randomBytes(12).toString("hex")}`,
  };
}

export class AuthService {
  constructor(
    private readonly repository: MiniappRepositoryPort,
    private readonly config: MiniappRuntimeConfig,
    private readonly transport: typeof fetch = fetch,
  ) {}

  async login(input: WechatLoginRequest): Promise<ApiEnvelope<AuthSessionData>> {
    if (!input.code || input.code.length > 512)
      throw new Error("wechat_login_code_invalid");
    const userId =
      this.config.authMode === "WECHAT"
        ? await this.#wechatUser(input.code)
        : await this.#localTestUser(input.code);
    const accessToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await this.repository.createSession({
      userId,
      tokenDigest: this.#digest(`session:${accessToken}`),
      expiresAt,
    });
    return envelope({ userId, accessToken, expiresAt });
  }

  async optionalPrincipal(authorization?: string): Promise<UserId | null> {
    if (!authorization) return null;
    const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/u.exec(authorization);
    if (!match) throw new Error("auth_header_invalid");
    return this.repository.resolveSession(
      this.#digest(`session:${match[1]}`),
    );
  }

  async requirePrincipal(authorization?: string): Promise<UserId> {
    const userId = await this.optionalPrincipal(authorization);
    if (!userId) throw new Error("auth_required");
    return userId;
  }

  async #wechatUser(code: string): Promise<UserId> {
    const { appId, appSecret } = this.config.wechat;
    if (!appId || !appSecret) throw new Error("wechat_auth_not_configured");
    const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
    url.search = new URLSearchParams({
      appid: appId,
      secret: appSecret,
      js_code: code,
      grant_type: "authorization_code",
    }).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    try {
      const response = await this.transport(url, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`wechat_auth_http_${response.status}`);
      const data = (await response.json()) as WechatCodeSessionResponse;
      if (data.errcode || !data.openid || !data.session_key)
        throw new Error(`wechat_auth_rejected:${data.errcode ?? "missing_identity"}`);
      return this.repository.findOrCreateWechatUser(
        this.#digest(`wechat-openid:${data.openid}`),
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async #localTestUser(code: string): Promise<UserId> {
    if (!code.startsWith("local:") || code.length < 22)
      throw new Error("local_test_identity_invalid");
    const userId = `user:local:${this.#digest(code).slice(0, 24)}` as UserId;
    await this.repository.ensureUser(userId);
    return userId;
  }

  #digest(value: string) {
    return createHmac("sha256", this.config.wechat.sessionSecret)
      .update(value)
      .digest("hex");
  }
}
