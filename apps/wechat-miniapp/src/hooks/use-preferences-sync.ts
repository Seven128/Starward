import { useCallback, useEffect, useRef, useState } from "react";
import {
  cloneUserPreferences,
  type UserPreferences,
} from "@starward/miniapp-contracts";
import {
  errorMessage,
  getPreferences,
  MiniappApiError,
  savePreferences,
} from "@/services/api-client";
import { useAppStore } from "@/state/app-store";

export function usePreferencesSync() {
  const revision = useAppStore((state) => state.preferencesRevision);
  const dirty = useAppStore((state) => state.preferencesDirty);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const rerun = useRef(false);
  const [status, setStatus] = useState("");

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) {
      rerun.current = true;
      return false;
    }
    const before = useAppStore.getState();
    if (!before.preferencesDirty) return true;
    if (before.preferencesRevision < 1) {
      setStatus("偏好已保存在本机，等待服务端初始版本后同步。");
      return false;
    }
    inFlight.current = true;
    const snapshot = cloneUserPreferences(before.preferences);
    const snapshotText = JSON.stringify(snapshot);
    setStatus("正在同步偏好…");
    try {
      const response = await savePreferences(
        snapshot,
        before.preferencesRevision,
      );
      const current = useAppStore.getState();
      if (JSON.stringify(current.preferences) === snapshotText)
        current.markPreferencesSynced(response.data);
      else current.applyServerPreferences(response.data);
      setStatus(`偏好已同步 · 修订 ${response.data.revision}`);
      return true;
    } catch (error) {
      if (error instanceof MiniappApiError && error.code === "CONFLICT") {
        const latest = await getPreferences().catch(() => null);
        if (latest) useAppStore.getState().applyServerPreferences(latest.data);
        setStatus("服务端偏好已有新修订；本机编辑保持不变，已刷新版本并等待重试。");
        rerun.current = true;
      } else {
        setStatus(`偏好仅保存在本机：${errorMessage(error)}。可重试同步。`);
      }
      return false;
    } finally {
      inFlight.current = false;
      if (rerun.current) {
        rerun.current = false;
        timer.current = setTimeout(() => void syncNow(), 500);
      }
    }
  }, []);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void syncNow(), 450);
  }, [syncNow]);

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      useAppStore.getState().setPreference(key, value);
      schedule();
    },
    [schedule],
  );

  useEffect(() => {
    if (dirty && revision > 0) schedule();
  }, [dirty, revision, schedule]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { updatePreference, syncNow, status };
}
