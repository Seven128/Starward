import { createHmac, randomBytes } from "node:crypto";
import { encryptWechatDeliveryIdentity } from "./wechat-delivery-identity.js";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
function envelope(data) {
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
    repository;
    config;
    transport;
    constructor(repository, config, transport = fetch) {
        this.repository = repository;
        this.config = config;
        this.transport = transport;
    }
    async login(input) {
        if (!input.code || input.code.length > 512)
            throw new Error("wechat_login_code_invalid");
        const userId = this.config.authMode === "WECHAT"
            ? await this.#wechatUser(input.code, true)
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
    async optionalPrincipal(authorization) {
        if (!authorization)
            return null;
        const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/u.exec(authorization);
        if (!match)
            throw new Error("auth_header_invalid");
        return this.repository.resolveSession(this.#digest(`session:${match[1]}`));
    }
    async requirePrincipal(authorization) {
        const userId = await this.optionalPrincipal(authorization);
        if (!userId)
            throw new Error("auth_required");
        return userId;
    }
    async requireReauthenticatedPrincipal(authorization, code) {
        const userId = await this.requirePrincipal(authorization);
        if (!code || code.length > 512)
            throw new Error("auth_reauthentication_required");
        const verifiedUserId = this.config.authMode === "WECHAT"
            ? await this.#wechatUser(code, false)
            : this.#localTestUserId(code);
        if (verifiedUserId !== userId)
            throw new Error("auth_reauthentication_identity_mismatch");
        // The native code proves identity for this operation; it does not replace
        // the current session or authorize an operation on a different account.
        return userId;
    }
    async #wechatUser(code, createIfMissing) {
        const { appId, appSecret } = this.config.wechat;
        if (!appId || !appSecret)
            throw new Error("wechat_auth_not_configured");
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
            if (!response.ok)
                throw new Error(`wechat_auth_http_${response.status}`);
            const data = (await response.json());
            if (data.errcode || !data.openid || !data.session_key)
                throw new Error(`wechat_auth_rejected:${data.errcode ?? "missing_identity"}`);
            const identityDigest = this.#digest(`wechat-openid:${data.openid}`);
            const userId = createIfMissing
                ? await this.repository.findOrCreateWechatUser(identityDigest)
                : await this.repository.findWechatUser(identityDigest);
            if (userId && createIfMissing && this.config.wechat.deliveryIdentityKey) {
                await this.repository.saveWechatDeliveryIdentity({
                    userId, identityDigest, appId,
                    ciphertext: encryptWechatDeliveryIdentity(data.openid, userId, appId, this.config.wechat.deliveryIdentityKey),
                });
            }
            return userId;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async #localTestUser(code) {
        const userId = this.#localTestUserId(code);
        await this.repository.ensureUser(userId);
        return userId;
    }
    #localTestUserId(code) {
        if (!code.startsWith("local:") || code.length < 22)
            throw new Error("local_test_identity_invalid");
        const userId = `user:local:${this.#digest(code).slice(0, 24)}`;
        return userId;
    }
    #digest(value) {
        return createHmac("sha256", this.config.wechat.sessionSecret)
            .update(value)
            .digest("hex");
    }
}
//# sourceMappingURL=auth-service.js.map