/** Share one lock across commands, including native picker/modal wait time. */
export function createContributionCommandLock(onBusyChange: (busy: boolean) => void = () => {}) {
  let busy = false;
  return function exclusive<Args extends unknown[], Result>(command: (...args: Args) => Promise<Result>) {
    return async (...args: Args): Promise<Result | undefined> => {
      if (busy) return undefined;
      busy = true;
      onBusyChange(true);
      try { return await command(...args); }
      finally { busy = false; onBusyChange(false); }
    };
  };
}
