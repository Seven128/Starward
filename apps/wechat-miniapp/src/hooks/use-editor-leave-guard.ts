import Taro, { useDidShow } from "@tarojs/taro";
import { useEffect, useRef } from "react";
import { createNativeEditorLeaveGuardController } from "./editor-leave-guard-controller";

/** Covers native navigation such as the Android system Back gesture/button. */
export function useNativeEditorLeaveGuard(enabled: boolean, message: string) {
  const controllerRef = useRef<ReturnType<typeof createNativeEditorLeaveGuardController> | null>(null);
  controllerRef.current ??= createNativeEditorLeaveGuardController(Taro);
  useDidShow(() => controllerRef.current!.configure(enabled, message));
  useEffect(() => {
    const controller = controllerRef.current!;
    controller.configure(enabled, message);
    return () => controller.release();
  }, [enabled, message]);
  return {
    suspendForProgrammaticLeave: () => controllerRef.current!.suspendForProgrammaticLeave(),
    restoreAfterFailedProgrammaticLeave: () => controllerRef.current!.restoreAfterFailedProgrammaticLeave(),
  };
}
