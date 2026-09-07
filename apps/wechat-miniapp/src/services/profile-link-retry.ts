import type { PlatformKind } from "@starward/miniapp-contracts";

export type ProfileLinkInput = { platform: PlatformKind; displayName: string; url: string; visibility: "PRIVATE" | "PUBLIC"; sortOrder: number };
type Entry = { input: ProfileLinkInput; key: string };
type Storage = { getStorageSync(key: string): unknown; setStorageSync(key: string, value: unknown): void; removeStorageSync(key: string): void };
const PREFIX = "starward.profile-save.v1:";
const storageKey = (owner: string) => PREFIX + JSON.stringify([owner]);
export const profileSaveBelongsTo = (key: string, owner: string) => key === storageKey(owner);
export function clearProfileSaveRecovery(storage: Storage, owner: string) {
  storage.removeStorageSync(storageKey(owner));
}
export class ProfileLinkRecoveryError extends Error {}

function inputCopy(value: unknown): ProfileLinkInput {
  if (!value || typeof value !== "object") throw new Error("invalid input");
  const input = value as ProfileLinkInput;
  if (!["OTHER", "XIAOHONGSHU", "WEIBO", "WECHAT_CHANNELS"].includes(input.platform) ||
    typeof input.displayName !== "string" || input.displayName.length > 80 ||
    typeof input.url !== "string" || input.url.length > 2048 ||
    !["PRIVATE", "PUBLIC"].includes(input.visibility) || !Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0) throw new Error("invalid input");
  return { platform: input.platform, displayName: input.displayName, url: input.url, visibility: input.visibility, sortOrder: input.sortOrder };
}
function read(storage: Storage, key: string): Entry[] {
  const raw = storage.getStorageSync(key);
  if (raw === undefined || raw === null || raw === "") return [];
  const record = raw as Record<string, unknown>;
  if (typeof raw !== "object" || record.schema !== 1 || !Array.isArray(record.entries) || record.entries.length > 32) throw new Error("invalid recovery data");
  return record.entries.map((entry: Entry) => {
    if (!entry || typeof entry.key !== "string" || !/^[a-zA-Z0-9:_-]{1,180}$/.test(entry.key)) throw new Error("invalid retry identity");
    return { input: inputCopy(entry.input), key: entry.key };
  });
}
const identity = (input: ProfileLinkInput) => JSON.stringify([input.platform, input.displayName, input.url, input.visibility]);

/** Retain only whitelisted user-entered link fields and retry identity, never session/API responses. */
export function createProfileLinkRetry(storage: Storage, makeKey: () => string, isDefinitiveFailure: (error: unknown) => boolean = () => false) {
  return async <T>(owner: string, input: ProfileLinkInput, operation: (key: string, original: ProfileLinkInput) => Promise<T>): Promise<T> => {
    const key = storageKey(owner);
    let entry: Entry;
    try {
      const entries = read(storage, key);
      const clean = inputCopy(input);
      const previous = entries.find(item => identity(item.input) === identity(clean));
      if (!previous && entries.length >= 32) throw new Error("too many uncertain saves");
      entry = previous ?? { input: clean, key: makeKey() };
      if (!previous) entries.push(entry);
      storage.setStorageSync(key, { schema: 1, entries });
    } catch {
      throw new ProfileLinkRecoveryError("无法保留主页保存的恢复信息，尚未发出保存请求。请检查本机存储后重试。");
    }
    const release = () => {
      try {
        const remaining = read(storage, key).filter(item => item.key !== entry.key);
        if (remaining.length) storage.setStorageSync(key, { schema: 1, entries: remaining });
        else storage.removeStorageSync(key);
      } catch { /* Retaining the identity is safer than replacing an authoritative receipt with a cleanup error. */ }
    };
    let result: T;
    try { result = await operation(entry.key, entry.input); }
    catch (error) {
      if (isDefinitiveFailure(error)) release();
      throw error;
    }
    release();
    return result;
  };
}
