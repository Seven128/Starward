import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
const keyFor = (secret) => Buffer.from(hkdfSync("sha256", secret, "starward-miniapp-plan-share-v1", "public-plan-receipt", 32));
/** An opaque, authenticated capability. No plan fields or account identity appear in the URL. */
export function sealPlanShare(binding, secret) {
    if (secret.length < 32)
        throw new Error("plan_share_unavailable");
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", keyFor(secret), nonce);
    const body = Buffer.concat([cipher.update(JSON.stringify(binding), "utf8"), cipher.final()]);
    return `v1.${Buffer.concat([nonce, cipher.getAuthTag(), body]).toString("base64url")}`;
}
export function openPlanShare(token, secret, now = Date.now()) {
    if (secret.length < 32 || !/^v1\.[A-Za-z0-9_-]{40,1024}$/u.test(token))
        return null;
    try {
        const encoded = Buffer.from(token.slice(3), "base64url");
        if (encoded.toString("base64url") !== token.slice(3))
            return null;
        if (encoded.length < 29)
            return null;
        const decipher = createDecipheriv("aes-256-gcm", keyFor(secret), encoded.subarray(0, 12));
        decipher.setAuthTag(encoded.subarray(12, 28));
        const value = JSON.parse(Buffer.concat([decipher.update(encoded.subarray(28)), decipher.final()]).toString("utf8"));
        if (typeof value.userId !== "string" || !/^user:[A-Za-z0-9:_-]{1,128}$/u.test(value.userId) ||
            typeof value.planId !== "string" || !/^plan:[A-Za-z0-9:_-]{1,128}$/u.test(value.planId) ||
            !Number.isSafeInteger(value.revision) || value.revision < 1 ||
            !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + 8 * 86_400_000)
            return null;
        return value;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=plan-share-token.js.map