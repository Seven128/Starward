import type { PlatformKind } from "@starward/miniapp-contracts";

export type ImportLocalDraft = {
  schema: 1; id: string; revision: number | null; platform: PlatformKind;
  sourceUrl: string; rightsConfirmed: boolean; title: string; body: string; sourceNote: string;
  visibility: "PRIVATE" | "PUBLIC"; association: "FORMAL" | "PROPOSAL" | "NONE"; formalSpotId: string;
};
export const importLocalDraftKey = (owner: string) => "starward.import-draft.v1:" + JSON.stringify([owner]);
export const importLocalDraftBelongsTo = (key: string, owner: string) => key === importLocalDraftKey(owner);
export function parseImportLocalDraft(raw: unknown): ImportLocalDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as ImportLocalDraft;
  if (v.schema !== 1 || typeof v.id !== "string" || v.id.length > 180 ||
    !(v.revision === null || (Number.isSafeInteger(v.revision) && v.revision > 0)) ||
    (v.id ? v.revision === null : v.revision !== null) ||
    !["OTHER", "WEIBO", "WECHAT_CHANNELS", "XIAOHONGSHU"].includes(v.platform) ||
    typeof v.rightsConfirmed !== "boolean" || !["PRIVATE", "PUBLIC"].includes(v.visibility) ||
    !["NONE", "FORMAL", "PROPOSAL"].includes(v.association)) return null;
  for (const [field, max] of [["sourceUrl", 2048], ["title", 160], ["body", 6000], ["sourceNote", 500], ["formalSpotId", 180]] as const)
    if (typeof v[field] !== "string" || v[field].length > max) return null;
  return { schema: 1, id: v.id, revision: v.revision, platform: v.platform, sourceUrl: v.sourceUrl,
    rightsConfirmed: v.rightsConfirmed, title: v.title, body: v.body, sourceNote: v.sourceNote,
    visibility: v.visibility, association: v.association, formalSpotId: v.formalSpotId };
}

type Storage = { getStorageSync(key: string): unknown; setStorageSync(key: string, value: unknown): void; removeStorageSync(key: string): void };
export function createImportLocalDraftStore(storage: Storage, owner: string, currentOwner: () => string | null) {
  const assertOwner = () => { if (currentOwner() !== owner) throw new Error("账号已变化，请重新打开内容导入。"); };
  const key = importLocalDraftKey(owner);
  return {
    read() {
      assertOwner();
      const raw = storage.getStorageSync(key);
      if (raw === undefined || raw === null || raw === "") return null;
      const parsed = parseImportLocalDraft(raw);
      if (!parsed) throw new Error("本机编辑副本暂不可读。可放弃此副本后继续，服务器草稿保留。");
      return parsed;
    },
    write(value: ImportLocalDraft) {
      assertOwner();
      const parsed = parseImportLocalDraft(value);
      if (!parsed) throw new Error("当前编辑内容无法保存在本机。");
      storage.setStorageSync(key, parsed);
    },
    clear() { assertOwner(); storage.removeStorageSync(key); },
  };
}
