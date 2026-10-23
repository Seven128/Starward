import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChecklistItem, ShootingPlanVersion } from "@starward/domain/shooting";
const VERSION_KEY = "starward-shooting-versions-v1"; const CHECKLIST_KEY = "starward-shooting-checklist-v1";

// Serialize this native JS owner's writes, including a remounted screen. This
// does not claim a transaction across separate web tabs or native processes.
let pendingWrite: Promise<unknown> = Promise.resolve();
export function saveLocalShootingVersion(version: ShootingPlanVersion): Promise<ShootingPlanVersion[]> {
  const encoded = JSON.stringify(version);
  const snapshot = JSON.parse(encoded) as ShootingPlanVersion;
  const matches = (item: ShootingPlanVersion) => item.id === snapshot.id && item.revision === snapshot.revision;
  const write = pendingWrite.then(async () => {
    const all = await loadLocalShootingVersions();
    const existing = all.find(matches);
    if (existing) {
      if (JSON.stringify(existing) !== encoded) throw new Error("shooting_version_conflict");
      return all;
    }
    const latestRevision = Math.max(0, ...all.filter(item => item.id === snapshot.id).map(item => item.revision));
    if (snapshot.revision !== latestRevision + 1 || snapshot.previousRevision !== (latestRevision || null)) {
      throw new Error("shooting_version_conflict");
    }
    const next = [...all, snapshot];
    try {
      await AsyncStorage.setItem(VERSION_KEY, JSON.stringify(next));
      return next;
    } catch (error) {
      // A rejected acknowledgement can follow a committed write. Confirm only
      // the exact captured version; otherwise the caller must retain its intent.
      const current = await loadLocalShootingVersions().catch(() => null);
      if (current?.some(item => matches(item) && JSON.stringify(item) === encoded)) return current;
      throw new Error("shooting_version_commit_unknown", { cause: error });
    }
  });
  pendingWrite = write.catch(() => undefined);
  return write;
}
export async function loadLocalShootingVersions(): Promise<ShootingPlanVersion[]> {
  const raw = await AsyncStorage.getItem(VERSION_KEY);
  if (raw === null) return [];
  const versions: unknown = JSON.parse(raw);
  if (!Array.isArray(versions) || versions.some(item => !item || typeof item.id !== "string" || !Number.isSafeInteger(item.revision) || item.revision < 1)) {
    throw new Error("shooting_versions_invalid");
  }
  return versions as ShootingPlanVersion[];
}
export async function saveLocalChecklist(items: ChecklistItem[], revision: number) { await AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify({ revision, updatedAt: new Date().toISOString(), items })); return revision; }
export async function loadLocalChecklist(): Promise<{ revision: number; items: ChecklistItem[] } | null> { const raw = await AsyncStorage.getItem(CHECKLIST_KEY); return raw ? JSON.parse(raw) as { revision: number; items: ChecklistItem[] } : null; }
