import type { PlatformKind } from "@starward/miniapp-contracts";
import { profileDraftKey } from "../../../services/local-draft-keys";

export type ProfileDraft = { schema: 1; platform: PlatformKind; displayName: string; url: string; publicLink: boolean };
export const emptyProfileDraft = (): ProfileDraft => ({ schema: 1, platform: "XIAOHONGSHU", displayName: "", url: "", publicLink: false });

export function parseProfileDraft(raw: unknown): ProfileDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.schema !== 1 || !["XIAOHONGSHU", "WEIBO", "WECHAT_CHANNELS", "OTHER"].includes(value.platform as string) ||
    typeof value.displayName !== "string" || value.displayName.length > 80 ||
    typeof value.url !== "string" || value.url.length > 2048 || typeof value.publicLink !== "boolean") return null;
  return { schema: 1, platform: value.platform as PlatformKind, displayName: value.displayName, url: value.url, publicLink: value.publicLink };
}

type Storage = { getStorageSync(key: string): unknown; setStorageSync(key: string, value: ProfileDraft): void; removeStorageSync(key: string): void };

/** Every edit is persisted synchronously, so navigation cannot outrun a debounce. */
export function createProfileDraftSession(storage: Storage, owner: string, currentOwner: () => string | null) {
  const key = profileDraftKey(owner)!;
  let value = emptyProfileDraft();
  let recovery: ProfileDraft | null = null;
  let error = false;
  let unreadable = false;
  try {
    const raw = storage.getStorageSync(key);
    if (raw !== undefined && raw !== null && raw !== "") {
      recovery = parseProfileDraft(raw);
      if (!recovery) { error = true; unreadable = true; }
    }
  } catch { error = true; unreadable = true; }
  const isOwner = () => currentOwner() === owner;
  const snapshot = () => ({ value, recovery, error, unreadable, owner });
  return {
    snapshot,
    change(next: ProfileDraft) {
      if (!isOwner() || recovery || unreadable) return snapshot();
      const parsed = parseProfileDraft(next);
      if (!parsed) return snapshot();
      value = parsed;
      try {
        if (JSON.stringify(value) === JSON.stringify(emptyProfileDraft())) storage.removeStorageSync(key);
        else storage.setStorageSync(key, value);
        error = false;
      } catch { error = true; }
      return snapshot();
    },
    restore() {
      if (isOwner() && recovery) { value = recovery; recovery = null; }
      return snapshot();
    },
    discard() {
      if (!isOwner()) return snapshot();
      try {
        storage.removeStorageSync(key);
        value = emptyProfileDraft(); recovery = null; error = false; unreadable = false;
      } catch { error = true; }
      return snapshot();
    },
    saved() {
      if (!isOwner()) return snapshot();
      // The server receipt remains successful even if local cleanup fails.
      value = emptyProfileDraft(); recovery = null;
      try { storage.removeStorageSync(key); error = false; unreadable = false; }
      catch { error = true; unreadable = true; }
      return snapshot();
    },
  };
}
