/** Bounded IDB API port for owner/React development checks, not browser durability
 * evidence. All connections share one serialized store and commit boundary. */
export function createAdminJournalFixture() {
  const rows = new Map();
  const transactions = [];
  let tail = Promise.resolve();
  let failNextWrite = false;
  let failNextOpen = false;
  const indexedDB = {
    open() {
      const request = {};
      setImmediate(() => {
        if (failNextOpen) { failNextOpen = false; request.onerror?.(); return; }
        request.result = {
          createObjectStore() {}, close() {},
          transaction(_store, mode, options) {
            transactions.push({ mode, durability: options?.durability });
            const tx = {};
            let work;
            let aborted = false;
            tx.abort = () => { aborted = true; };
            tx.objectStore = () => ({
              get(key) {
                const getRequest = {};
                work = () => {
                  const pending = new Map(rows);
                  tx.pending = pending;
                  getRequest.result = rows.get(key);
                  getRequest.onsuccess?.();
                  if (!aborted && failNextWrite && JSON.stringify([...pending]) !== JSON.stringify([...rows])) { failNextWrite = false; aborted = true; }
                  if (aborted) tx.onabort?.();
                  else { rows.clear(); for (const [k, v] of pending) rows.set(k, v); tx.oncomplete?.(); }
                };
                return getRequest;
              },
              put(value, key) { tx.pending.set(key, value); },
              delete(key) { tx.pending.delete(key); },
            });
            tail = tail.then(() => new Promise(resolve => setImmediate(() => { work(); resolve(); })));
            return tx;
          },
        };
        request.onupgradeneeded?.(); request.onsuccess?.();
      });
      return request;
    },
  };
  return {
    indexedDB, rows, transactions,
    failNextWrite() { failNextWrite = true; },
    failNextOpen() { failNextOpen = true; },
    async settled() { await new Promise(resolve => setImmediate(resolve)); await tail; },
  };
}
