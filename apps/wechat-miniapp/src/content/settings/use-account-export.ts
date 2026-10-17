import Taro from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";
import { useAccountOperation } from "@/hooks/use-account-operation";
import { currentDraftUserId, errorMessage, exportAccountData, idempotencyKey } from "@/services/api-client";
import { useAppStore } from "@/state/app-store";
import { createAccountExport, type AccountExportState } from "./account-export";
import { createAccountExportCleanup } from "./account-export-cleanup";

// This exact-path cleanup owner outlives a page; no account data or share capability is retained.
const exportFiles = createAccountExportCleanup(filePath => new Promise<void>((resolve, reject) => {
  Taro.getFileSystemManager().unlink({ filePath, success: () => resolve(), fail: error => {
    if (/ENOENT|no such file|file not exist|文件不存在/iu.test(error.errMsg)) resolve(); else reject(error);
  } });
}));

export function useAccountExport(onBusy: (busy: boolean) => void) {
  const [state, setState] = useState<AccountExportState>({ phase: "IDLE" });
  const latestBusy = useRef(onBusy);
  const wasBusy = useRef(false);
  latestBusy.current = onBusy;
  const controller = useRef<ReturnType<typeof createAccountExport>>();
  const operations = useAccountOperation("settings-account-export", busy => {
    if (!busy) controller.current?.retire();
  });
  if (!controller.current) controller.current = createAccountExport({
    begin: () => operations.begin(), userId: currentDraftUserId,
    load: exportAccountData,
    destination: generatedAt => {
      const root = Taro.env.USER_DATA_PATH;
      if (!root) throw new Error("user_data_path_unavailable");
      const fileName = `starward-account-${generatedAt.replace(/[:.]/gu, "-")}-${idempotencyKey("export").replace(/:/gu, "-")}.json`;
      return { filePath: `${root}/${fileName}`, fileName };
    },
    write: (filePath, data) => new Promise<void>((resolve, reject) => {
      Taro.getFileSystemManager().writeFile({ filePath, data, encoding: "utf8", success: () => resolve(), fail: reject });
    }),
    files: exportFiles,
    share: (filePath, fileName) => Taro.shareFileMessage({ filePath, fileName }),
    changed: next => {
      const busy = next.phase === "PREPARING" || next.phase === "SHARING" || next.phase === "CLEANING";
      if (busy !== wasBusy.current) { wasBusy.current = busy; latestBusy.current(busy); }
      setState(next);
    },
    message: errorMessage,
    cleanupWarning: () => useAppStore.getState().notify({ owner: "settings", placement: "inline", tone: "warning",
      title: "本机临时文件未清除", body: "请回到导出数据，重试本机清理。",
      dismissible: true, dedupeKey: "settings-account-export-cleanup-failed" }),
  });
  useEffect(() => () => controller.current?.dispose(), []);
  return { state, ...controller.current };
}
