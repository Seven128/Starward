import type { AccountOperation } from "@/hooks/account-operation";
import type { createAccountExportCleanup } from "./account-export-cleanup";

type PreparedFile = { fileName: string; generatedAt: string };
export type AccountExportState =
  | { phase: "IDLE" | "PREPARING" | "COMPLETE" }
  | ({ phase: "READY" | "SHARING"; outcome: "prepared" | "cancelled" | "failed" } & PreparedFile)
  | { phase: "FAILED"; detail: string }
  | { phase: "CLEANUP_REQUIRED" | "CLEANING"; handedOff: boolean };

interface ExportPorts {
  begin(): AccountOperation | undefined;
  userId(): string | null;
  load(signal: AbortSignal, operation: AccountOperation): Promise<{
    data: { generatedAt: string; account: { userId: string } };
  }>;
  destination(generatedAt: string): { filePath: string; fileName: string };
  write(filePath: string, data: string): Promise<void>;
  files: ReturnType<typeof createAccountExportCleanup>;
  share(filePath: string, fileName: string): Promise<unknown>;
  changed(state: AccountExportState): void;
  message(error: unknown): string;
  cleanupWarning(): void;
}

/** One private file, from preparation through an explicit native handoff or retirement. */
export function createAccountExport(ports: ExportPorts) {
  type Attempt = {
    operation: AccountOperation; abort: AbortController; active: boolean; working: boolean;
    file: { filePath: string; fileName: string; generatedAt: string } | null;
    cleanup: Promise<boolean> | null; handedOff: boolean;
  };
  let attempt: Attempt | undefined;
  let state: AccountExportState = { phase: "IDLE" };
  let mounted = true;
  const publish = (next: AccountExportState) => { state = next; if (mounted) ports.changed(next); };
  const current = (value: Attempt) => attempt === value && value.active && value.operation.isCurrent();
  const cleanup = (value: Attempt): Promise<boolean> => {
    if (value.cleanup) return value.cleanup;
    const file = value.file;
    if (!file) return Promise.resolve(true);
    value.cleanup = (async () => {
      try {
        const removed = await ports.files.remove(file.filePath);
        if (removed && value.file === file) value.file = null;
        return removed;
      }
      finally { value.cleanup = null; }
    })();
    return value.cleanup;
  };
  const cleanupRetired = async (value: Attempt) => {
    if (!await cleanup(value)) ports.cleanupWarning();
  };
  const detach = (value: Attempt) => {
    if (attempt === value) attempt = undefined;
    value.active = false;
    value.abort.abort();
    value.operation.release();
  };
  const retire = () => {
    const value = attempt;
    if (!value) return;
    detach(value);
    publish({ phase: "IDLE" });
    // Native write/share cannot be cancelled. Their finally owns the late file.
    if (!value.working) void cleanupRetired(value);
  };
  const prepare = async () => {
    if (!mounted || attempt) return;
    if (ports.files.hasPending()) { publish({ phase: "CLEANUP_REQUIRED", handedOff: false }); return; }
    const operation = ports.begin();
    if (!operation) return;
    const value: Attempt = { operation, abort: new AbortController(), active: true, working: true,
      file: null, cleanup: null, handedOff: false };
    attempt = value;
    publish({ phase: "PREPARING" });
    let cleanupHandled = false;
    try {
      const response = await ports.load(value.abort.signal, operation);
      if (!current(value)) return;
      operation.authenticate();
      if (!ports.userId() || response.data.account.userId !== ports.userId())
        throw new Error("账户已变化，请重新准备当前账户的数据。");
      const generatedAt = new Date(response.data.generatedAt);
      if (!Number.isFinite(generatedAt.getTime())) throw new Error("账户数据时间无效，请重试。");
      value.file = { ...ports.destination(generatedAt.toISOString()), generatedAt: generatedAt.toISOString() };
      const file = value.file;
      const writing = Promise.resolve().then(() => ports.write(file.filePath, JSON.stringify(response.data, null, 2)));
      ports.files.hold(file.filePath, writing);
      await writing;
      if (current(value)) publish({ phase: "READY", outcome: "prepared",
        fileName: value.file.fileName, generatedAt: value.file.generatedAt });
    } catch (error) {
      cleanupHandled = true;
      const removed = await cleanup(value);
      if (current(value)) {
        if (!removed) publish({ phase: "CLEANUP_REQUIRED", handedOff: false });
        else { detach(value); publish({ phase: "FAILED", detail: ports.message(error) }); }
      } else if (!removed) ports.cleanupWarning();
    } finally {
      value.working = false;
      if (!current(value) && value.file && !cleanupHandled) await cleanupRetired(value);
    }
  };
  const share = async () => {
    const value = attempt;
    if (!value || value.working || !current(value) || state.phase !== "READY" || !value.file) return;
    value.working = true;
    publish({ ...state, phase: "SHARING" });
    let cleanupHandled = false;
    try {
      const file = value.file!;
      const handoff = value.operation.native(() => ports.share(file.filePath, file.fileName));
      ports.files.hold(file.filePath, handoff);
      await handoff;
      value.handedOff = true;
      cleanupHandled = true;
      const removed = await cleanup(value);
      if (current(value)) {
        if (!removed) publish({ phase: "CLEANUP_REQUIRED", handedOff: true });
        else { detach(value); publish({ phase: "COMPLETE" }); }
      } else if (!removed) ports.cleanupWarning();
    } catch (error) {
      if (current(value) && value.file) publish({ phase: "READY", fileName: value.file.fileName, generatedAt: value.file.generatedAt,
        outcome: /cancel|取消/iu.test(String((error as { errMsg?: unknown })?.errMsg ?? error)) ? "cancelled" : "failed" });
    } finally {
      value.working = false;
      if (!current(value) && value.file && !cleanupHandled) await cleanupRetired(value);
    }
  };
  const retryCleanup = async () => {
    const value = attempt;
    if (state.phase !== "CLEANUP_REQUIRED") return;
    if (!value) {
      publish({ phase: "CLEANING", handedOff: false });
      const removed = await ports.files.retry();
      if (mounted && !attempt) publish({ phase: removed ? "IDLE" : "CLEANUP_REQUIRED", handedOff: false });
      return;
    }
    if (value.working || !current(value)) return;
    value.working = true;
    publish({ phase: "CLEANING", handedOff: value.handedOff });
    const removed = await cleanup(value) && await ports.files.retry();
    value.working = false;
    if (current(value)) {
      if (removed) { detach(value); publish({ phase: value.handedOff ? "COMPLETE" : "IDLE" }); }
      else publish({ phase: "CLEANUP_REQUIRED", handedOff: value.handedOff });
    } else if (!removed) ports.cleanupWarning();
  };
  return { prepare, share, retryCleanup, retire,
    open() { if (!attempt) publish(ports.files.hasPending() ? { phase: "CLEANUP_REQUIRED", handedOff: false } : { phase: "IDLE" }); },
    close() { retire(); publish({ phase: "IDLE" }); },
    handingOff: () => state.phase === "SHARING",
    dispose() { mounted = false; retire(); },
  };
}
