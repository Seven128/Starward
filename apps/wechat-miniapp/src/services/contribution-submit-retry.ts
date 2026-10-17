const PREFIX = "starward.contribution-submit.v1:";

export class ContributionSubmitStorageError extends Error {}

export function clearContributionSubmitIntent(storage: Storage, owner: string, submissionId: string, expectedRevision: number) {
  storage.removeStorageSync(PREFIX + JSON.stringify([owner, submissionId, expectedRevision]));
}

interface Storage {
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  removeStorageSync(key: string): void;
}

/** Verification reads an existing identity; it must never mint or dispatch a submission. */
export function readContributionSubmitKey(storage: Storage, owner: string, submissionId: string, expectedRevision: number): string | null {
  const value = storage.getStorageSync(PREFIX + JSON.stringify([owner, submissionId, expectedRevision]));
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 180 || !/^[a-zA-Z0-9:_-]+$/.test(value)) throw new ContributionSubmitStorageError("本机提交恢复标识无法读取。");
  return value;
}

export function readContributionSubmitIntents(storage: Storage & { getStorageInfoSync(): { keys: string[] } }, owner: string) {
  const intents: Array<{ submissionId: string; expectedRevision: number }> = [];
  for (const key of storage.getStorageInfoSync().keys) {
    if (!contributionSubmitBelongsTo(key, owner)) continue;
    const retryKey = storage.getStorageSync(key);
    if (typeof retryKey !== "string" || !retryKey || retryKey.length > 180 || !/^[a-zA-Z0-9:_-]+$/.test(retryKey)) throw new ContributionSubmitStorageError("本机提交恢复标识无法读取。");
    const [, submissionId, expectedRevision] = JSON.parse(key.slice(PREFIX.length)) as [string, string, number];
    intents.push({ submissionId, expectedRevision });
  }
  return intents;
}

export function contributionSubmitBelongsTo(key: string, owner: string): boolean {
  if (!key.startsWith(PREFIX)) return false;
  try {
    const value: unknown = JSON.parse(key.slice(PREFIX.length));
    return Array.isArray(value) && value.length === 3 && value[0] === owner &&
      typeof value[1] === "string" && value[1].startsWith("contribution:") &&
      Number.isSafeInteger(value[2]) && value[2] > 0;
  } catch { return false; }
}

/** Persist only submission identity, baseline revision and retry identity, never form or session data. */
export function createContributionSubmitRetry(storage: Storage, makeKey: () => string, isDefinitiveFailure: (error: unknown) => boolean = () => false) {
  const execute = async <T>(storageKey: string, retryKey: string, operation: (key: string) => Promise<T>, clearRejected = true) => {
    let result: T;
    try { result = await operation(retryKey); }
    catch (error) {
      if (clearRejected && isDefinitiveFailure(error)) {
        try { storage.removeStorageSync(storageKey); } catch { /* Keep a recoverable entry. */ }
      }
      throw error;
    }
    try { storage.removeStorageSync(storageKey); } catch { /* Success remains authoritative. */ }
    return result;
  };
  const retry = async <T>(owner: string, input: { submissionId: string; expectedRevision: number }, operation: (key: string) => Promise<T>): Promise<T> => {
    const storageKey = PREFIX + JSON.stringify([owner, input.submissionId, input.expectedRevision]);
    let retryKey: string;
    try {
      const previous = storage.getStorageSync(storageKey);
      if (previous !== undefined && previous !== null && previous !== "" &&
        (typeof previous !== "string" || previous.length > 180 || !/^[a-zA-Z0-9:_-]+$/.test(previous))) {
        throw new Error("Invalid stored submission identity");
      }
      retryKey = typeof previous === "string" && previous ? previous : makeKey();
      storage.setStorageSync(storageKey, retryKey);
    } catch {
      throw new ContributionSubmitStorageError("无法保留本次提交的恢复标识，尚未发出提交请求。请检查本机存储后重试。");
    }
    return execute(storageKey, retryKey, operation);
  };
  return Object.assign(retry, { existing: async <T>(owner: string, input: { submissionId: string; expectedRevision: number }, operation: (key: string) => Promise<T>) => {
    const key = readContributionSubmitKey(storage, owner, input.submissionId, input.expectedRevision);
    if (!key) throw new ContributionSubmitStorageError("原提交标识暂不可用，请核对记录。");
    return execute(PREFIX + JSON.stringify([owner, input.submissionId, input.expectedRevision]), key, operation, false);
  } });
}
