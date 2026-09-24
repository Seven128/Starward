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
  const [status, setStatus] = useState("");

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) {
      rerun.current = true;
      return false;
    }
    const before = useAppStore.getState();
    if (!before.preferencesDirty) return true;
    const owner = currentDraftUserId();
    if (!owner) {
      setStatus("账户尚未恢复，本机偏好暂不上传。请返回“我的”恢复账户后重新打开设置。");
      return false;
    }
    if (before.preferencesRevision < 1) {
      setStatus("偏好已保存在本机，连接服务后会自动同步。");
      return false;
    }
    inFlight.current = true;
    const snapshot = cloneUserPreferences(before.preferences);
    const snapshotText = JSON.stringify(snapshot);
    setStatus("");
    try {
      const response = await savePreferences(
        snapshot,
        before.preferencesRevision,
      );
      if (currentDraftUserId() !== owner) {
        setStatus("账户已变化；本次偏好同步结果未应用，请在当前账户重新打开设置。");
        return false;
      }
      const current = useAppStore.getState();
      if (JSON.stringify(current.preferences) === snapshotText)
        current.markPreferencesSynced(response.data);
      else current.applyServerPreferences(response.data);
      setStatus("");
      return true;
    } catch (error) {
      if (error instanceof MiniappApiError && error.code === "CONFLICT") {
        const latest = await getPreferences().catch(() => null);
        if (latest?.dataState === "FRESH" && currentDraftUserId() === owner) {
          useAppStore.getState().rebasePreferencesAfterConflict(latest.data);
          setStatus("云端偏好已有更新；本机编辑保持不变，正在重新同步。");
          rerun.current = true;
        } else {
          rerun.current = false;
          setStatus(currentDraftUserId() !== owner
            ? "账户已变化；本次偏好同步结果未应用，请在当前账户重新打开设置。"
            : "暂时无法读取云端最新偏好；本机编辑保持不变，恢复网络后可重试同步。");
        }
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
