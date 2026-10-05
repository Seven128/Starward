export interface NativeBeforeUnloadBridge {
  enableAlertBeforeUnload?: (options: { message: string }) => unknown;
  disableAlertBeforeUnload?: () => unknown;
}

export function createNativeEditorLeaveGuardController(bridge: NativeBeforeUnloadBridge) {
  let enabled = false;
  let message = "";
  let suspended = false;

  const requestNativePrompt = (show: boolean) => {
    try {
      const result = show ? bridge.enableAlertBeforeUnload?.({ message }) : bridge.disableAlertBeforeUnload?.();
      // Taro can return a Promise even when its API types say void.
      void Promise.resolve(result).catch(() => {});
    } catch { /* Native protection must not abort the editor's own leave handling. */ }
  };

  return {
    configure(nextEnabled: boolean, nextMessage: string) {
      enabled = nextEnabled;
      message = nextMessage;
      suspended = false;
      requestNativePrompt(enabled);
    },
    release() {
      enabled = false;
      suspended = false;
      requestNativePrompt(false);
    },
    suspendForProgrammaticLeave() {
      if (!enabled || suspended) return;
      suspended = true;
      requestNativePrompt(false);
    },
    restoreAfterFailedProgrammaticLeave() {
      if (!enabled || !suspended) return;
      suspended = false;
      requestNativePrompt(true);
    },
  };
}
