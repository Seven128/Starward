export interface NativeBeforeUnloadBridge {
  enableAlertBeforeUnload?: (options: { message: string }) => unknown;
  disableAlertBeforeUnload?: () => unknown;
}

export function createNativeEditorLeaveGuardController(bridge: NativeBeforeUnloadBridge) {
  let enabled = false;
  let message = "";
  let suspended = false;

  return {
    configure(nextEnabled: boolean, nextMessage: string) {
      enabled = nextEnabled;
      message = nextMessage;
      suspended = false;
      if (enabled) bridge.enableAlertBeforeUnload?.({ message });
      else bridge.disableAlertBeforeUnload?.();
    },
    release() {
      enabled = false;
      suspended = false;
      bridge.disableAlertBeforeUnload?.();
    },
    suspendForProgrammaticLeave() {
      if (!enabled || suspended) return;
      suspended = true;
      bridge.disableAlertBeforeUnload?.();
    },
    restoreAfterFailedProgrammaticLeave() {
      if (!enabled || !suspended) return;
      suspended = false;
      bridge.enableAlertBeforeUnload?.({ message });
    },
  };
}
