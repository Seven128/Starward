/** Keep uncertain writes replayable for this runtime; never persist request bodies. */
export function createMutationRetry(makeKey: () => string) {
  const pending = new Map<string, string>();
  return async <T>(owner: string, input: unknown, operation: (key: string) => Promise<T>): Promise<T> => {
    const identity = JSON.stringify([owner, input]);
    let key = pending.get(identity);
    if (!key) {
      key = makeKey();
      pending.set(identity, key);
    }
    const result = await operation(key);
    if (pending.get(identity) === key) pending.delete(identity);
    return result;
  };
}
