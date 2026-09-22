import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Server-only encryption; the session signing secret must never be reused here. */
export function validateDeliveryIdentityKey(key: string): void {
  if (!/^[a-fA-F0-9]{64}$/u.test(key)) throw new Error("wechat_delivery_key_invalid");
}

function keyBytes(key: string) {
  validateDeliveryIdentityKey(key);
  return Buffer.from(key, "hex");
}

function binding(userId: string, appId: string) {
  return Buffer.from(JSON.stringify(["wechat-delivery-v1", userId, appId]), "utf8");
}

export function encryptWechatDeliveryIdentity(openId: string, userId: string, appId: string, key: string): string {
  if (!openId || openId.length > 256 || !userId || !appId) throw new Error("wechat_delivery_identity_invalid");
  const bytes = keyBytes(key);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", bytes, iv);
  cipher.setAAD(binding(userId, appId));
  const encrypted = Buffer.concat([cipher.update(openId, "utf8"), cipher.final()]);
  const keyId = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  return ["v1", keyId, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptWechatDeliveryIdentity(envelope: string, userId: string, appId: string, key: string): string {
  try {
    const bytes = keyBytes(key);
    const parts = envelope.split(".");
    if (parts.length !== 5 || parts[0] !== "v1" || parts[1] !== createHash("sha256").update(bytes).digest("hex").slice(0, 16)
      || !parts.slice(2).every(part => /^[A-Za-z0-9_-]+$/u.test(part))) throw new Error();
    const iv = Buffer.from(parts[2]!, "base64url");
    const tag = Buffer.from(parts[3]!, "base64url");
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const cipher = createDecipheriv("aes-256-gcm", bytes, iv);
    cipher.setAAD(binding(userId, appId));
    cipher.setAuthTag(tag);
    const result = Buffer.concat([cipher.update(Buffer.from(parts[4]!, "base64url")), cipher.final()]).toString("utf8");
    if (!result || result.length > 256) throw new Error();
    return result;
  } catch {
    // Do not expose ciphertext, destination, key, or provider response in errors.
    throw new Error("wechat_delivery_identity_unavailable");
  }
}
