/** Failed private-file cleanup survives a Settings page. It can only remove exact acquired paths. */
export function createAccountExportCleanup(remove: (filePath: string) => Promise<void>) {
  const pending = new Map<string, { ready: Promise<void>; task: Promise<boolean> | null }>();
  const removeFile = (filePath: string): Promise<boolean> => {
    const entry = pending.get(filePath) ?? { ready: Promise.resolve(), task: null };
    if (entry.task) return entry.task;
    pending.set(filePath, entry);
    entry.task = (async () => {
      try { await entry.ready; await remove(filePath); if (pending.get(filePath) === entry) pending.delete(filePath); return true; }
      catch { return false; }
      finally { entry.task = null; }
    })();
    return entry.task;
  };
  return { remove: removeFile, hasPending: () => pending.size > 0,
    hold(filePath: string, terminal: Promise<unknown>) {
      const entry = pending.get(filePath) ?? { ready: Promise.resolve(), task: null };
      entry.ready = Promise.allSettled([entry.ready, terminal]).then(() => undefined);
      pending.set(filePath, entry);
    },
    async retry() {
      await Promise.all([...pending.keys()].map(removeFile));
      return pending.size === 0;
    },
  };
}
