import { useCallback, useEffect, useRef, useState } from "react";
import {
  cloneUserPreferences,
  type UserPreferences,
} from "@starward/miniapp-contracts";
import {
  errorMessage,
  currentDraftUserId,
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
  const alive = useRef(true);
  const [status, setStatus] = useState("");
  const setSyncStatus = useCallback((message: string) => {
    if (alive.current) setStatus(message);
  }, []);
  const enqueueSync = useCallback((callback: () => void, delay: number) => {
    if (!alive.current) return;
    if (timer.current) clearTimeout(timer.current);
    const scheduled = setTimeout(() => {
      if (!alive.current || timer.current !== scheduled) return;
      timer.current = null;
      callback();
    }, delay);
    timer.current = scheduled;
  }, []);

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!alive.current) return false;
    if (inFlight.current) {
      rerun.current = true;
      return false;
    }
    const before = useAppStore.getState();
    if (!before.preferencesDirty) return true;
    const owner = currentDraftUserId();
    if (!owner) {
      setSyncStatus("账户尚未恢复，本机偏好暂不上传。请返回“我的”恢复账户后重新打开设置。");
      return false;
    }
    if (before.preferencesRevision < 1) {
      setSyncStatus("偏好已保存在本机，连接服务后会自动同步。");
      return false;
    }
    inFlight.current = true;
    const intentPreferences = before.preferences;
    const snapshot = cloneUserPreferences(intentPreferences);
    const snapshotText = JSON.stringify(snapshot);
    setSyncStatus("");
    try {
      const response = await savePreferences(
        snapshot,
        before.preferencesRevision,
      );
      if (currentDraftUserId() !== owner) {
        setSyncStatus("账户已变化；本次偏好同步结果未应用，请在当前账户重新打开设置。");
        return false;
      }
      const current = useAppStore.getState();
      // Returning to the same value is still a new local edit. An old page's
      // acknowledgement may advance the server revision, but cannot clear that
      // intent or roll back a newer My/library readback.
      if (current.preferences === intentPreferences &&
        response.data.revision >= current.preferencesRevision &&
        JSON.stringify(current.preferences) === snapshotText)
        current.markPreferencesSynced(response.data);
      else current.applyServerPreferences(response.data);
      setSyncStatus("");
      return true;
    } catch (error) {
      if (!alive.current) return false;
      if (error instanceof MiniappApiError && error.code === "CONFLICT") {
        const latest = await getPreferences().catch(() => null);
        if (!alive.current) return false;
        if (latest?.dataState === "FRESH" && currentDraftUserId() === owner) {
          useAppStore.getState().rebasePreferencesAfterConflict(latest.data);
          setSyncStatus("云端偏好已有更新；本机编辑保持不变，正在重新同步。");
          rerun.current = true;
        } else {
          rerun.current = false;
          setSyncStatus(currentDraftUserId() !== owner
            ? "账户已变化；本次偏好同步结果未应用，请在当前账户重新打开设置。"
            : "暂时无法读取云端最新偏好；本机编辑保持不变，恢复网络后可重试同步。");
        }
      } else {
        setSyncStatus(`偏好仅保存在本机：${errorMessage(error)}。可重试同步。`);
      }
      return false;
    } finally {
      inFlight.current = false;
      if (rerun.current) {
        rerun.current = false;
        enqueueSync(() => void syncNow(), 500);
      }
    }
  }, [setSyncStatus, enqueueSync]);

  const schedule = useCallback(() => {
    enqueueSync(() => void syncNow(), 450);
  }, [syncNow, enqueueSync]);

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      if (!alive.current) return;
      useAppStore.getState().setPreference(key, value);
      schedule();
    },
    [schedule],
  );

  useEffect(
    () => {
      alive.current = true;
      return () => {
        alive.current = false;
        rerun.current = false;
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
      };
    },
    [],
  );
  useEffect(() => {
    if (dirty && revision > 0) schedule();
  }, [dirty, revision, schedule]);

  return { updatePreference, syncNow, status };
}
