import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChecklistItem, ShootingPlanVersion } from "@starward/domain/shooting";
const VERSION_KEY = "starward-shooting-versions-v1"; const CHECKLIST_KEY = "starward-shooting-checklist-v1";
export async function saveLocalShootingVersion(version: ShootingPlanVersion) { const all = await loadLocalShootingVersions(); await AsyncStorage.setItem(VERSION_KEY, JSON.stringify([...all.filter((item) => item.id !== version.id || item.revision !== version.revision), version])); }
export async function loadLocalShootingVersions(): Promise<ShootingPlanVersion[]> { const raw = await AsyncStorage.getItem(VERSION_KEY); return raw ? JSON.parse(raw) as ShootingPlanVersion[] : []; }
export async function saveLocalChecklist(items: ChecklistItem[], revision: number) { await AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify({ revision, updatedAt: new Date().toISOString(), items })); return revision; }
export async function loadLocalChecklist(): Promise<{ revision: number; items: ChecklistItem[] } | null> { const raw = await AsyncStorage.getItem(CHECKLIST_KEY); return raw ? JSON.parse(raw) as { revision: number; items: ChecklistItem[] } : null; }
